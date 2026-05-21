/** Usuario de sistema: letras, números, punto, guión y guión bajo (máx. 64). */
export function sanitizeUsername(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 64).toLowerCase()
}
