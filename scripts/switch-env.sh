#!/usr/bin/env bash
# Switchea la API (dotnet user-secrets: connection string + issuer del JWT)
# y el login del frontend (frontend/.env) entre el Docker local de Supabase
# y el proyecto remoto, en un solo paso.
#
# El issuer del JWT importa tanto como la connection string: appsettings.json
# trae "Supabase:Jwt:Issuer" commiteado apuntando al proyecto remoto (no es
# secreto, ver CLAUDE.md); sin overridearlo a local, un login contra Supabase
# Auth local emite un JWT con otro issuer y la API lo rechaza con 401 en todo
# endpoint autenticado (incluido /usuarios/me), aunque el login en si haya
# funcionado.
#
# Uso:
#   scripts/switch-env.sh local
#   scripts/switch-env.sh remote
#
# Ver docs/arquitectura/05-Ambientes.md para el detalle de qué controla cada
# variable y por qué hace falta reiniciar la API después de correr esto.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_ENV="$ROOT_DIR/frontend/.env"
API_DIR="$ROOT_DIR/api/src/Stc.Api"
REMOTE_SECRETS="$ROOT_DIR/scripts/remote.env"

usage() {
  echo "Uso: $0 local|remote" >&2
  exit 1
}

set_env_var() {
  local file="$1" key="$2" value="$3"
  touch "$file"
  if grep -q "^${key}=" "$file"; then
    perl -pi -e "s#^${key}=.*#${key}=${value}#" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

MODE="${1:-}"
[ -z "$MODE" ] && usage

case "$MODE" in
local)
  echo "==> Chequeando Docker local de Supabase..."
  if ! supabase status >/dev/null 2>&1; then
    echo "==> No está corriendo, levantando con 'supabase start' (puede tardar la primera vez)..."
    supabase start
  fi

  ANON_KEY="$(supabase status -o env 2>/dev/null | grep '^ANON_KEY=' | cut -d'"' -f2)"
  API_URL="$(supabase status -o env 2>/dev/null | grep '^API_URL=' | cut -d'"' -f2)"

  if [ -z "$ANON_KEY" ] || [ -z "$API_URL" ]; then
    echo "==> No pude leer ANON_KEY/API_URL de 'supabase status -o env'. Revisá que 'supabase start' haya terminado bien." >&2
    exit 1
  fi

  set_env_var "$FRONTEND_ENV" "VITE_SUPABASE_URL" "$API_URL"
  set_env_var "$FRONTEND_ENV" "VITE_SUPABASE_ANON_KEY" "$ANON_KEY"

  (cd "$API_DIR" && dotnet user-secrets set "ConnectionStrings:StcDatabase" "Host=127.0.0.1;Port=54322;Database=postgres;Username=postgres;Password=postgres;SSL Mode=Disable" >/dev/null)
  (cd "$API_DIR" && dotnet user-secrets set "Supabase:Jwt:Issuer" "${API_URL}/auth/v1" >/dev/null)

  echo "==> Listo: frontend/.env y la API apuntan al Docker local."
  ;;

remote)
  if [ ! -f "$REMOTE_SECRETS" ]; then
    cat >"$REMOTE_SECRETS" <<'EOF'
# Credenciales del proyecto Supabase remoto, usadas por scripts/switch-env.sh.
# Este archivo NO se commitea (ver .gitignore) - son datos sensibles.
# Completar con los valores reales del dashboard de Supabase:
#   SUPABASE_URL / SUPABASE_ANON_KEY  -> Project Settings > API
#   DB_HOST / DB_PROJECT_REF          -> Project Settings > Database > Connection string > Session pooler
#   DB_PASSWORD                       -> la password de la base (Project Settings > Database)
SUPABASE_URL=
SUPABASE_ANON_KEY=
DB_HOST=
DB_PROJECT_REF=
DB_PASSWORD=
EOF
    echo "==> Creé $REMOTE_SECRETS con placeholders vacíos (no está commiteado)."
    echo "==> Completalo con los datos del proyecto remoto y volvé a correr: $0 remote"
    exit 1
  fi

  # shellcheck disable=SC1090
  source "$REMOTE_SECRETS"

  for var in SUPABASE_URL SUPABASE_ANON_KEY DB_HOST DB_PROJECT_REF DB_PASSWORD; do
    if [ -z "${!var:-}" ]; then
      echo "==> Falta completar '$var' en $REMOTE_SECRETS" >&2
      exit 1
    fi
  done

  set_env_var "$FRONTEND_ENV" "VITE_SUPABASE_URL" "$SUPABASE_URL"
  set_env_var "$FRONTEND_ENV" "VITE_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"

  (cd "$API_DIR" && dotnet user-secrets set "ConnectionStrings:StcDatabase" "Host=${DB_HOST};Port=5432;Database=postgres;Username=postgres.${DB_PROJECT_REF};Password=${DB_PASSWORD};SSL Mode=Require;Trust Server Certificate=true" >/dev/null)
  (cd "$API_DIR" && dotnet user-secrets set "Supabase:Jwt:Issuer" "${SUPABASE_URL}/auth/v1" >/dev/null)

  echo "==> Listo: frontend/.env y la API apuntan al proyecto remoto (${DB_PROJECT_REF})."
  ;;

*)
  usage
  ;;
esac

echo "==> Reiniciá 'dotnet run' (API) y 'npm run dev' (frontend) si ya estaban corriendo."
