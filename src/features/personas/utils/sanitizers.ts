/** Búsqueda: letras (con tildes), números, sin espacio inicial y un solo espacio entre palabras */
export function sanitizeSearch(value: string): string {
  const allowed = value.replace(/[^a-zA-Z0-9áéíóúüÁÉÍÓÚÜñÑ\s]/g, '')
  return allowed.replace(/\s+/g, ' ').trimStart()
}

/** Letras (incl. áéíóúüñ), sin espacio al inicio, un solo espacio entre palabras, máx 50 */
export function sanitizeNombreApellido(value: string): string {
  const noSpecial = value.replace(/[^a-zA-ZáéíóúüÁÉÍÓÚÜñÑ\s]/g, '')
  const singleSpace = noSpecial.replace(/\s+/g, ' ').trimStart()
  return singleSpace.slice(0, 50)
}

export { sanitizeDni as sanitizeDNI } from '../../../shared/utils/dni'

/** Solo números y + (el + solo al inicio), máx 13 caracteres */
export function sanitizeTelefono(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, '')
  const digits = cleaned.replace(/\D/g, '')
  const hasPlus = cleaned.includes('+')
  const maxDigits = hasPlus ? 12 : 13
  return hasPlus ? '+' + digits.slice(0, maxDigits) : digits.slice(0, maxDigits)
}

/** Alfanumérico, tildes, guión -; un solo espacio entre palabras/números, sin espacio al inicio, máx 75 */
export function sanitizeEscuela(value: string): string {
  const allowed = value.replace(/[^a-zA-Z0-9áéíóúüÁÉÍÓÚÜñÑ\-\s]/g, '')
  return allowed.replace(/\s+/g, ' ').trimStart().slice(0, 75)
}

/** Solo dígitos, máx 4 */
export function sanitizeMesa(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4)
}

/** Sin espacios en ninguna posición. */
export function sanitizePassword(value: string): string {
  return value.replace(/\s/g, '')
}
