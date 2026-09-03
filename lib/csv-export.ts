export function escapeCsvCell(value: unknown): string {
  let text = value == null ? "" : String(value)
  // Spreadsheet applications may execute cells beginning with these prefixes.
  if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}