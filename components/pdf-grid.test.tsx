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
  { ...basePdf, id: "physics", title: "Physics Notes", category_id: "science", content_type: "school", content_category: "Class 10", content_subcategory: "CBSE", subject: "Physics" },
  { ...basePdf, id: "algebra", title: "Algebra Notes", category_id: "math" },
  // Mirrors the migration backfill: group is known, but a specific exam is not.
  { ...basePdf, id: "cgl", title: "SSC Notes", content_type: "exams", content_category: "SSC", content_subcategory: null },
]

describe("PDFGrid category filters", () => {
  afterEach(cleanup)

  it("filters PDFs in place and restores all PDFs", () => {
    render(<PDFGrid pdfs={pdfs} categories={categories} />)

    expect(screen.getAllByTestId("pdf-card")).toHaveLength(3)

    fireEvent.click(screen.getByRole("button", { name: /Science 1 files/i }))
    expect(screen.getByText("Physics Notes")).toBeVisible()
    expect(screen.queryByText("Algebra Notes")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /All PDFs 3 files/i }))
    expect(screen.getAllByTestId("pdf-card")).toHaveLength(3)
  })

  it("filters content type first and clears dependent filters when it changes", () => {
    render(<PDFGrid pdfs={pdfs} categories={categories} />)
    fireEvent.change(screen.getByLabelText("Filter by content type"), { target: { value: "school" } })
    fireEvent.change(screen.getByLabelText("Filter by content category"), { target: { value: "Class 10" } })
    fireEvent.change(screen.getByLabelText("Filter by content subcategory"), { target: { value: "CBSE" } })
    fireEvent.change(screen.getByLabelText("Filter by subject"), { target: { value: "Physics" } })
    expect(screen.getByText("Physics Notes")).toBeVisible()
    expect(screen.queryByText("SSC Notes")).toBeNull()

    fireEvent.change(screen.getByLabelText("Filter by content type"), { target: { value: "exams" } })
    expect(screen.queryByLabelText("Filter by subject")).toBeNull()
    fireEvent.change(screen.getByLabelText("Filter by content category"), { target: { value: "SSC" } })
    expect(screen.getByText("SSC Notes")).toBeVisible()
  })

  it("filters college content by branch before narrowing to a semester", () => {
    const collegePdfs: PDF[] = [
      { ...basePdf, id: "algo", title: "Algorithms", content_type: "college", content_category: "B.Tech", content_subcategory: "Computer Science · Semester 3", subject: "Algorithms" },
      { ...basePdf, id: "db", title: "Databases", content_type: "college", content_category: "B.Tech", content_subcategory: "Computer Science · Semester 4", subject: "Databases" },
      { ...basePdf, id: "civil", title: "Mechanics", content_type: "college", content_category: "B.Tech", content_subcategory: "Civil · Semester 3", subject: "Mechanics" },
    ]
    render(<PDFGrid pdfs={collegePdfs} categories={categories} />)

    fireEvent.change(screen.getByLabelText("Filter by content type"), { target: { value: "college" } })
    fireEvent.change(screen.getByLabelText("Filter by content category"), { target: { value: "B.Tech" } })
    fireEvent.change(screen.getByLabelText("Filter by branch or stream"), { target: { value: "Computer Science" } })
    expect(screen.getAllByTestId("pdf-card")).toHaveLength(2)

    fireEvent.change(screen.getByLabelText("Filter by content subcategory"), { target: { value: "Semester 3" } })
    expect(screen.getAllByTestId("pdf-card")).toHaveLength(1)
    expect(screen.queryByText("Databases")).toBeNull()
  })
})