export interface StructureMatchLocation {
  folderId: string
  categoryId: string
  sectionId: string
}

interface StructureSection {
  id?: unknown
  enabled?: unknown
}

interface StructureCategory {
  id?: unknown
  name?: unknown
  enabled?: unknown
  sections?: unknown
}

interface StructureFolder {
  id?: unknown
  enabled?: unknown
  categories?: unknown
}

export function findStructureLocationByCategoryName(
  folders: unknown,
  categoryName: unknown,
): StructureMatchLocation | null {
  if (!Array.isArray(folders) || typeof categoryName !== "string") return null
  const wantedName = categoryName.trim().toLocaleLowerCase()
  if (!wantedName) return null

  for (const rawFolder of folders) {
    if (!rawFolder || typeof rawFolder !== "object") continue
    const folder = rawFolder as StructureFolder
    if (folder.enabled === false || typeof folder.id !== "string" || !Array.isArray(folder.categories)) continue

    for (const rawCategory of folder.categories) {
      if (!rawCategory || typeof rawCategory !== "object") continue
      const category = rawCategory as StructureCategory
      if (
        category.enabled === false ||
        typeof category.id !== "string" ||
        typeof category.name !== "string" ||
        category.name.trim().toLocaleLowerCase() !== wantedName ||
        !Array.isArray(category.sections)
      ) continue

      const section = category.sections.find((rawSection) => {
        if (!rawSection || typeof rawSection !== "object") return false
        const candidate = rawSection as StructureSection
        return candidate.enabled !== false && typeof candidate.id === "string" && candidate.id.length > 0
      }) as StructureSection | undefined

      if (section && typeof section.id === "string") {
        return { folderId: folder.id, categoryId: category.id, sectionId: section.id }
      }
    }
  }

  return null
}