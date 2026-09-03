import { describe, expect, it } from "vitest"
import { findStructureLocationByCategoryName } from "@/lib/structure-matching"

const folders = [
  {
    id: "disabled-folder",
    enabled: false,
    categories: [{
      id: "wrong-category",
      name: "Business",
      sections: [{ id: "wrong-section", enabled: true }],
    }],
  },
  {
    id: "folder-1",
    enabled: true,
    categories: [
      {
        id: "category-1",
        name: "  BUSINESS ",
        enabled: true,
        sections: [
          { id: "disabled-section", enabled: false },
          { id: "section-1", enabled: true },
        ],
      },
    ],
  },
]

describe("database category to content structure matching", () => {
  it("matches category names case-insensitively and selects the first enabled section", () => {
    expect(findStructureLocationByCategoryName(folders, "business")).toEqual({
      folderId: "folder-1",
      categoryId: "category-1",
      sectionId: "section-1",
    })
  })

  it("does not select disabled folders, categories, or sections", () => {
    expect(findStructureLocationByCategoryName([{
      id: "folder",
      categories: [{
        id: "category",
        name: "Science",
        enabled: false,
        sections: [{ id: "section" }],
      }],
    }], "Science")).toBeNull()
  })

  it("returns no match when a matching category has no enabled section", () => {
    expect(findStructureLocationByCategoryName([{
      id: "folder",
      categories: [{
        id: "category",
        name: "Science",
        sections: [{ id: "section", enabled: false }],
      }],
    }], "Science")).toBeNull()
  })
})