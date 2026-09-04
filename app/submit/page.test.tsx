import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import SubmitPage from "./page"

vi.mock("@/components/header", () => ({ Header: () => null }))
vi.mock("@/components/footer", () => ({ Footer: () => null }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }))
vi.mock("@/lib/signed-storage-upload", () => ({ uploadFileToSignedStorage: vi.fn() }))

const analyzePdfFile = vi.fn()
vi.mock("@/lib/pdf-smart-analysis", () => ({
  analyzePdfFile: (...args: unknown[]) => analyzePdfFile(...args),
}))

describe("public PDF submission metadata", () => {
  afterEach(() => {
    cleanup()
    analyzePdfFile.mockReset()
  })

  it("fills analyzed title, description, and hierarchy after file selection", async () => {
    analyzePdfFile.mockResolvedValue({
      title: "SSC CGL Geography Notes",
      seoDescription: "Concise SSC CGL geography revision notes.",
      summary: "",
      pageCount: 12,
      text: "Staff Selection Commission CGL geography study material",
      keywords: ["ssc", "geography"],
      metadata: {},
    })
    render(<SubmitPage />)

    fireEvent.change(screen.getByLabelText(/Choose a PDF/i), {
      target: { files: [new File(["%PDF-1.7"], "ssc-cgl-notes.pdf", { type: "application/pdf" })] },
    })

    await waitFor(() => expect(screen.getByLabelText(/Title/i)).toHaveValue("SSC CGL Geography Notes"))
    expect(screen.getByLabelText(/Description/i)).toHaveValue("Concise SSC CGL geography revision notes.")
    expect(screen.getByLabelText(/Content type/i)).toHaveValue("exams")
    expect(screen.getByLabelText(/Exam group/i)).toHaveValue("SSC")
    expect(screen.getByLabelText(/Specific exam/i)).toHaveValue("SSC CGL Geography Notes")
    expect(screen.getByText(/12 pages analyzed/i)).toBeVisible()
  })

  it("does not overwrite a title edited while analysis is running", async () => {
    let finish!: (value: Record<string, unknown>) => void
    analyzePdfFile.mockReturnValue(new Promise(resolve => { finish = resolve }))
    render(<SubmitPage />)

    fireEvent.change(screen.getByLabelText(/Choose a PDF/i), {
      target: { files: [new File(["%PDF-1.7"], "ssc-notes.pdf", { type: "application/pdf" })] },
    })
    const title = screen.getByLabelText(/Title/i)
    expect(title).toHaveValue("ssc notes")
    fireEvent.change(title, { target: { value: "My reviewed title" } })
    finish({ title: "Automatic title", seoDescription: "", summary: "", pageCount: 1, text: "", keywords: [], metadata: {} })

    await waitFor(() => expect(screen.getByText(/1 page analyzed/i)).toBeVisible())
    expect(title).toHaveValue("My reviewed title")
  })
})