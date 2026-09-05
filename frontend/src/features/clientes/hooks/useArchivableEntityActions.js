import { useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'

// Centraliza las acciones de "dar de baja" / "rehabilitar" que se repiten,
// casi identicas, en useSitioForm/useUnidadForm/useOcupanteForm/useActivoForm:
// confirmar con el usuario, marcar loading por fila, reconstruir el PUT
// completo del recurso (esta API no soporta PATCH parcial) y notificar a la
// pagina para que refresque el listado. Antes de este hook, cada uno de esos
// 4 hooks de formulario duplicaba ese flujo completo (~50 lineas c/u) con
// pequenas diferencias de copy y de forma del payload.
//
// Lo unico que varia entre entidades es COMO se marca un registro como dado
// de baja: sitio/unidad/ocupante lo simulan con una marca de texto en `notas`
// (ver archiveFlag.js, no hay soft-delete real para esas 3 tablas), mientras
// que activo tiene una columna real `estado` ('activo' | 'deBaja'). Por eso
// el payload completo del PUT no lo arma este hook -- lo arma el hook
// especifico de cada entidad (que conoce la forma exacta del recurso) y se
// lo pasa via `buildBajaPayload`/`buildRestorePayload`. Este hook solo se
// ocupa de la mecanica que SI es igual en las 4: loading state, confirm,
// llamada HTTP, manejo de errores y el callback de exito.
//
// Params:
// - apiPath(id): arma la URL del recurso, ej. (id) => `/sitios/${id}`.
// - entityLabel: como nombrar la entidad en los mensajes al usuario, con
//   articulo incluido ("el sitio", "la unidad", "el ocupante", "el activo").
// - getEntityName(entity): el nombre/identificador a mostrar en el dialogo
//   de confirmacion (ej. sitio.nombre, unidad.identificador).
// - buildBajaPayload(entity) / buildRestorePayload(entity): arman el body
//   completo del PUT para cada accion, con la marca de baja ya agregada o
//   quitada segun corresponda a la entidad.
// - onBaja(entity) / onRestore(entity): callback a ejecutar tras el exito de
//   cada accion. Si no se pasan, cae en `onSaved` (el caso comun: recargar
//   el listado). `onBaja` existe aparte porque useOcupanteForm necesita un
//   callback distinto ahi (limpiar la seleccion del autocomplete de activos
//   si el ocupante dado de baja era el elegido).
// - setError(message): setter del estado de error del hook que consume este
//   (se reusa el mismo `formError` que ya usa el modal de alta/edicion, en
//   vez de duplicar un estado de error aparte para las acciones de fila).
//
// La baja se confirma con un dialogo propio (ver components/ui/ConfirmDialog)
// en vez de window.confirm: `handleBaja` solo abre ese dialogo (guarda la
// entidad en `confirmTarget`), y `confirmBaja`/`cancelBaja` lo resuelven. Esto
// permite mostrar el error de la request en el dialogo mismo si la baja
// falla (con window.confirm ese error no tenia donde mostrarse, ya que se
// seteaba via `setError` sobre el modal de alta/edicion, que a esta altura
// esta cerrado) y dejarlo abierto en estado "procesando" mientras esta en
// vuelo. `handleRestore` no pasa por esta confirmacion: rehabilitar no oculta
// nada, es una accion de bajo riesgo.
export function useArchivableEntityActions({
  apiPath,
  entityLabel,
  getEntityName,
  buildBajaPayload,
  buildRestorePayload,
  onBaja,
  onRestore,
  onSaved,
  setError,
}) {
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirmError, setConfirmError] = useState('')

  const runAction = async (entity, { payload, fallbackMessage, onSuccess, onError }) => {
    setActionLoadingId(entity.id)
    setError?.('')

    try {
      await apiClient.put(apiPath(entity.id), payload)
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : fallbackMessage
      setError?.(message || fallbackMessage)
      onError?.(message || fallbackMessage)
      setActionLoadingId('')
      return
    }

    setActionLoadingId('')
    await onSuccess?.(entity)
  }

  const handleBaja = (entity) => {
    setConfirmError('')
    setConfirmTarget(entity)
  }

  const cancelBaja = () => {
    setConfirmTarget(null)
    setConfirmError('')
  }

  const confirmBaja = async () => {
    if (!confirmTarget) {
      return
    }

    await runAction(confirmTarget, {
      payload: buildBajaPayload(confirmTarget),
      fallbackMessage: `No se pudo dar de baja ${entityLabel}`,
      onSuccess: async (entity) => {
        setConfirmTarget(null)
        await (onBaja ?? onSaved)?.(entity)
      },
      onError: setConfirmError,
    })
  }

  const handleRestore = (entity) =>
    runAction(entity, {
      payload: buildRestorePayload(entity),
      fallbackMessage: `No se pudo rehabilitar ${entityLabel}`,
      onSuccess: onRestore ?? onSaved,
    })

  const bajaConfirmation = {
    open: Boolean(confirmTarget),
    entityLabel,
    entityName: confirmTarget ? getEntityName(confirmTarget) : '',
    loading: Boolean(confirmTarget) && actionLoadingId === confirmTarget.id,
    error: confirmError,
  }

  return { actionLoadingId, handleBaja, handleRestore, bajaConfirmation, confirmBaja, cancelBaja }
}
