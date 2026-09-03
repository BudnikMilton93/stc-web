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

  const runAction = async (entity, { payload, fallbackMessage, onSuccess }) => {
    setActionLoadingId(entity.id)
    setError?.('')

    try {
      await apiClient.put(apiPath(entity.id), payload)
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : fallbackMessage
      setError?.(message || fallbackMessage)
      setActionLoadingId('')
      return
    }

    setActionLoadingId('')
    await onSuccess?.(entity)
  }

  const handleBaja = async (entity) => {
    const confirmed = window.confirm(
      `Dar de baja ${entityLabel} "${getEntityName(entity)}"? Se ocultara de la vista principal.`,
    )

    if (!confirmed) {
      return
    }

    await runAction(entity, {
      payload: buildBajaPayload(entity),
      fallbackMessage: `No se pudo dar de baja ${entityLabel}`,
      onSuccess: onBaja ?? onSaved,
    })
  }

  const handleRestore = (entity) =>
    runAction(entity, {
      payload: buildRestorePayload(entity),
      fallbackMessage: `No se pudo rehabilitar ${entityLabel}`,
      onSuccess: onRestore ?? onSaved,
    })

  return { actionLoadingId, handleBaja, handleRestore }
}
