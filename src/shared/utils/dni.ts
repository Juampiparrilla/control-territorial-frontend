/** Solo dígitos, máx. 8 (DNI argentino en la app). */
export function sanitizeDni(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8)
}
