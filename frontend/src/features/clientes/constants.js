// Valores en minuscula: coinciden con el enum TipoCliente serializado en
// camelCase por la API (Persona -> persona). Para mostrarlos con mayuscula
// inicial en la UI, usar capitalize().
export const TIPO_CLIENTE_OPTIONS = ['persona', 'empresa', 'consorcio']

export function capitalize(value) {
  if (!value) {
    return value
  }
  return value.charAt(0).toUpperCase() + value.slice(1)
}
