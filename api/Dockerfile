# --platform=$BUILDPLATFORM fuerza a que ESTA etapa corra en la arquitectura
# nativa de quien buildea (no la de destino) — el output de `dotnet publish`
# es IL portable, no codigo nativo, asi que no hace falta cross-compilar de
# verdad. Sin esto, `docker buildx build --platform linux/amd64` en una Mac
# ARM intenta correr el SDK de .NET bajo emulacion QEMU, que crashea
# (`qemu: uncaught target signal 6`) al ejecutar `dotnet restore`/`publish`.
#
# Build en la imagen del SDK (mas pesada, no va a produccion), copiando primero
# solo los .csproj para que `restore` quede cacheado entre builds mientras no
# cambien las dependencias, y recien despues el resto del codigo fuente.
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY src/Stc.Api/Stc.Api.csproj src/Stc.Api/
COPY src/Stc.Domain/Stc.Domain.csproj src/Stc.Domain/
COPY src/Stc.Infrastructure/Stc.Infrastructure.csproj src/Stc.Infrastructure/
RUN dotnet restore src/Stc.Api/Stc.Api.csproj

COPY src/Stc.Api/ src/Stc.Api/
COPY src/Stc.Domain/ src/Stc.Domain/
COPY src/Stc.Infrastructure/ src/Stc.Infrastructure/
RUN dotnet publish src/Stc.Api/Stc.Api.csproj -c Release -o /app --no-restore

# Imagen final: solo el runtime de ASP.NET (no el SDK completo) y el output
# publicado, para minimizar el tamano de la imagen que se sube al registry.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Puerto no privilegiado (evita correr el proceso como root para poder
# bindear el 80). Azure "Web App for Containers" necesita saber cual es via
# el Application Setting WEBSITES_PORT=8080.
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# La imagen base ya trae un usuario no-root ("app") pensado para este caso.
USER app

COPY --from=build /app .

ENTRYPOINT ["dotnet", "Stc.Api.dll"]
