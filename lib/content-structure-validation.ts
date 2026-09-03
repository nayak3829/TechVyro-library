export interface StructureLocation {
  folderId: string
  categoryId: string
  sectionId: string
}

type Node = Record<string, unknown>
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/
const COLOR = /^#[0-9a-f]{6}$/i

function text(value: unknown, label: string, max = 100, required = true) {
  if (typeof value !== "string") throw new Error(`${label} must be text`)
  const result = value.trim()
  if (required && !result) throw new Error(`${label} is required`)
  if (result.length > max) throw new Error(`${label} is too long`)
  return result
}

function id(value: unknown, label: string, used: Set<string>) {
  const result = text(value, label)
  if (!ID.test(result)) throw new Error(`${label} is invalid`)
  if (used.has(result)) throw new Error(`Duplicate content structure ID: ${result}`)
  used.add(result)
  return result
}

function order(value: unknown, fallback: number) {
  const result = value === undefined ? fallback : Number(value)
  if (!Number.isInteger(result) || result < 0 || result > 10000) throw new Error("Order must be a positive integer")
  return result
}

export function validateContentStructure(value: unknown): { ok: true; folders: Node[] } | { ok: false; error: string } {
  try {
    if (!Array.isArray(value) || value.length > 50) throw new Error("Folders must be an array with at most 50 items")
    const used = new Set<string>()
    const names = new Set<string>()
    const folders = value.map((rawFolder, folderIndex) => {
      if (!rawFolder || typeof rawFolder !== "object" || Array.isArray(rawFolder)) throw new Error(`Folder ${folderIndex + 1} is invalid`)
      const folder = rawFolder as Node
      const folderName = text(folder.name, `Folder ${folderIndex + 1} name`)
      if (names.has(folderName.toLowerCase())) throw new Error(`Duplicate folder name: ${folderName}`)
      names.add(folderName.toLowerCase())
      if (!Array.isArray(folder.categories) || folder.categories.length > 100) throw new Error(`${folderName} categories are invalid`)
      const categoryNames = new Set<string>()
      const categories = folder.categories.map((rawCategory, categoryIndex) => {
        if (!rawCategory || typeof rawCategory !== "object" || Array.isArray(rawCategory)) throw new Error(`${folderName} category ${categoryIndex + 1} is invalid`)
        const category = rawCategory as Node
        const categoryName = text(category.name, `${folderName} category name`)
        if (categoryNames.has(categoryName.toLowerCase())) throw new Error(`Duplicate category in ${folderName}: ${categoryName}`)
        categoryNames.add(categoryName.toLowerCase())
        if (!Array.isArray(category.sections) || category.sections.length > 200) throw new Error(`${categoryName} sections are invalid`)
        const sectionNames = new Set<string>()
        const sections = category.sections.map((rawSection, sectionIndex) => {
          if (!rawSection || typeof rawSection !== "object" || Array.isArray(rawSection)) throw new Error(`${categoryName} section ${sectionIndex + 1} is invalid`)
          const section = rawSection as Node
          const sectionName = text(section.name, `${categoryName} section name`)
          if (sectionNames.has(sectionName.toLowerCase())) throw new Error(`Duplicate section in ${categoryName}: ${sectionName}`)
          sectionNames.add(sectionName.toLowerCase())
          return {
            id: id(section.id, `${sectionName} ID`, used),
            name: sectionName,
            order: order(section.order, sectionIndex),
            enabled: section.enabled !== false,
          }
        })
        const color = category.color === undefined ? "#6366f1" : text(category.color, `${categoryName} color`)
        if (!COLOR.test(color)) throw new Error(`${categoryName} color must be a 6-digit hex color`)
        return {
          id: id(category.id, `${categoryName} ID`, used),
          name: categoryName,
          color,
          icon: text(category.icon ?? "", `${categoryName} icon`, 50, false),
          sections,
          order: order(category.order, categoryIndex),
          enabled: category.enabled !== false,
        }
      })
      const color = folder.color === undefined ? "#6366f1" : text(folder.color, `${folderName} color`)
      if (!COLOR.test(color)) throw new Error(`${folderName} color must be a 6-digit hex color`)
      return {
        id: id(folder.id, `${folderName} ID`, used),
        name: folderName,
        description: text(folder.description ?? "", `${folderName} description`, 500, false),
        icon: text(folder.icon ?? "", `${folderName} icon`, 50, false),
        color,
        categories,
        order: order(folder.order, folderIndex),
        enabled: folder.enabled !== false,
      }
    })
    return { ok: true, folders }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid content structure" }
  }
}

export function isValidStructureLocation(value: unknown, folders: Node[]): value is StructureLocation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const location = value as Record<string, unknown>
  if (![location.folderId, location.categoryId, location.sectionId].every((part) => typeof part === "string" && part.length > 0)) return false
  const folder = folders.find((item) => item.id === location.folderId)
  const category = Array.isArray(folder?.categories)
    ? (folder.categories as Node[]).find((item) => item.id === location.categoryId)
    : undefined
  return Array.isArray(category?.sections) && (category.sections as Node[]).some((item) => item.id === location.sectionId)
}