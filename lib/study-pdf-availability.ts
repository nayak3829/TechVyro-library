export type StudyPdfAvailability = Record<string, boolean>

const CATEGORY_ALIASES: Record<string, string[]> = {
  ssc: ["ssc"],
  banking: ["banking", "bank exam"],
  defence: ["defence", "defense", "nda", "cds", "afcat"],
  railways: ["railway", "railways", "rrb"],
  upsc: ["upsc", "pcs", "civil service"],
  "jee-neet": ["jee", "neet"],
  teaching: ["ctet", "tet", "teaching"],
  agriculture: ["agriculture", "agri"],
}

function normalize(value: unknown): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

export function deriveStudyPdfAvailability(payload: unknown): StudyPdfAvailability {
  const names: string[] = []
  const folders = Array.isArray((payload as { folders?: unknown[] } | null)?.folders)
    ? (payload as { folders: Array<Record<string, unknown>> }).folders
    : []

  for (const folder of folders) {
    const categories = Array.isArray(folder.categories) ? folder.categories as Array<Record<string, unknown>> : []
    for (const category of categories) {
      if (Number(category.pdfCount || 0) > 0) names.push(normalize(category.name))
      const sections = Array.isArray(category.sections) ? category.sections as Array<Record<string, unknown>> : []
      for (const section of sections) {
        if (Number(section.pdfCount || 0) > 0) names.push(normalize(section.name))
      }
    }
  }

  return Object.fromEntries(
    Object.entries(CATEGORY_ALIASES).map(([id, aliases]) => [
      id,
      aliases.some(alias => names.some(name => name.includes(normalize(alias)))),
    ]),
  )
}