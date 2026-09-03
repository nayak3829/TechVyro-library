import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PDFGrid } from "./pdf-grid"
import type { Category, PDF } from "@/lib/types"

vi.mock("@/components/pdf-card", () => ({
  PDFCard: ({ pdf }: { pdf: PDF }) => <div data-testid="pdf-card">{pdf.title}</div>,
}))

vi.mock("@/hooks/use-favorites", () => ({
  useFavorites: () => ({ favorites: [], isLoaded: true }),
}))

const categories: Category[] = [
  { id: "science", name: "Science", slug: "science", color: "#22c55e", created_at: "2026-01-01" },
  { id: "math", name: "Mathematics", slug: "mathematics", color: "#3b82f6", created_at: "2026-01-01" },
]

const basePdf: PDF = {
  id: "",
  title: "",
  description: null,
  file_path: "",
  file_size: null,
  category_id: null,
  download_count: 0,
  view_count: 0,
  average_rating: null,
  review_count: 0,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
}

const pdfs: PDF[] = [
  { ...basePdf, id: "physics", title: "Physics Notes", category_id: "science" },
  { ...basePdf, id: "algebra", title: "Algebra Notes", category_id: "math" },
]

describe("PDFGrid category filters", () => {
  afterEach(cleanup)

  it("filters PDFs in place and restores all PDFs", () => {
    render(<PDFGrid pdfs={pdfs} categories={categories} />)

    expect(screen.getAllByTestId("pdf-card")).toHaveLength(2)

    fireEvent.click(screen.getByRole("button", { name: /Science 1 files/i }))
    expect(screen.getByText("Physics Notes")).toBeVisible()
    expect(screen.queryByText("Algebra Notes")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /All PDFs 2 files/i }))
    expect(screen.getAllByTestId("pdf-card")).toHaveLength(2)
  })
})