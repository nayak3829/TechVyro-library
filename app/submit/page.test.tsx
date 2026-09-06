import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import SubmitPage from "./page"

vi.mock("@/components/header", () => ({ Header: () => null }))
vi.mock("@/components/footer", () => ({ Footer: () => null }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }))
const uploadFileToSignedStorage = vi.fn()
vi.mock("@/lib/signed-storage-upload", () => ({ uploadFileToSignedStorage: (...args: unknown[]) => uploadFileToSignedStorage(...args) }))

const analyzePdfFile = vi.fn()
vi.mock("@/lib/pdf-smart-analysis", () => ({
  analyzePdfFile: (...args: unknown[]) => analyzePdfFile(...args),
}))

function fillRequiredSubmission() {
  fireEvent.change(screen.getByLabelText(/Choose a PDF/i), {
    target: { files: [new File(["%PDF-1.7"], "notes.pdf", { type: "application/pdf" })] },
  })
  fireEvent.change(screen.getByLabelText(/Content type/i), { target: { value: "exams" } })
  fireEvent.change(screen.getByLabelText(/Exam group/i), { target: { value: "SSC" } })
  fireEvent.change(screen.getByLabelText(/Specific exam/i), { target: { value: "SSC CGL" } })
  fireEvent.change(screen.getByLabelText(/^Name/i), { target: { value: "Contributor" } })
  fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: "contributor@example.test" } })
  fireEvent.click(screen.getByLabelText(/I own the rights/i))
  fireEvent.submit(screen.getByRole("button", { name: /Submit for review/i }).closest("form")!)
}

describe("public PDF submission metadata", () => {
  afterEach(() => {
    cleanup()
    analyzePdfFile.mockReset()
    uploadFileToSignedStorage.mockReset()
    vi.unstubAllGlobals()
  })

  it("rejects an explicit non-PDF MIME type even when the filename ends in .pdf", async () => {
    render(<SubmitPage />)

    fireEvent.change(screen.getByLabelText(/Choose a PDF/i), {
      target: { files: [new File(["%PDF-1.7"], "notes.pdf", { type: "text/plain" })] },
    })

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/application\/pdf file type/i)
    expect(alert).toHaveFocus()
    expect(screen.getByRole("button", { name: /Submit for review/i })).toHaveAttribute("aria-describedby", alert.id)
    expect(analyzePdfFile).not.toHaveBeenCalled()
  })

  it("rejects an empty MIME type when local bytes do not have a PDF signature", async () => {
    render(<SubmitPage />)

    fireEvent.change(screen.getByLabelText(/Choose a PDF/i), {
      target: { files: [new File(["not a PDF"], "notes.pdf", { type: "" })] },
    })

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/does not have a valid PDF signature/i)
    expect(alert).toHaveFocus()
    expect(analyzePdfFile).not.toHaveBeenCalled()
  })

  it("normalizes a signed empty-MIME PDF before analysis", async () => {
    analyzePdfFile.mockResolvedValue({
      title: "Mobile PDF", seoDescription: "", summary: "", pageCount: 1, text: "", keywords: [], metadata: {},
    })
    render(<SubmitPage />)

    fireEvent.change(screen.getByLabelText(/Choose a PDF/i), {
      target: { files: [new File(["%PDF-1.7"], "mobile.pdf", { type: "" })] },
    })

    await waitFor(() => expect(analyzePdfFile).toHaveBeenCalledTimes(1))
    expect((analyzePdfFile.mock.calls[0][0] as File).type).toBe("application/pdf")
  })

  it("validates unsafe metadata before reserving or uploading", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    analyzePdfFile.mockReturnValue(new Promise(() => {}))
    render(<SubmitPage />)

    fireEvent.change(screen.getByLabelText(/Choose a PDF/i), {
      target: { files: [new File(["%PDF-1.7"], "notes.pdf", { type: "application/pdf" })] },
    })
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "Unsafe\u0007title" } })
    fireEvent.click(screen.getByLabelText(/I own the rights/i))
    const submitButton = screen.getByRole("button", { name: /Submit for review/i })
    fireEvent.submit(submitButton.closest("form")!)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/Title contains invalid control characters/i)
    expect(alert).toHaveFocus()
    expect(submitButton).toHaveAttribute("aria-describedby", "submission-error")
    expect(submitButton.closest("form")).toHaveAttribute("aria-describedby", "submission-error")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("retries only finalization after a retryable saving failure", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedUrl: "https://storage.test/upload", reservationId: "reservation-1", filePath: "community/reservation-1.pdf" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Temporary save failure" }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    uploadFileToSignedStorage.mockResolvedValue(undefined)
    analyzePdfFile.mockReturnValue(new Promise(() => {}))
    render(<SubmitPage />)

    fireEvent.change(screen.getByLabelText(/Choose a PDF/i), {
      target: { files: [new File(["%PDF-1.7"], "notes.pdf", { type: "application/pdf" })] },
    })
    fireEvent.change(screen.getByLabelText(/Content type/i), { target: { value: "exams" } })
    fireEvent.change(screen.getByLabelText(/Exam group/i), { target: { value: "SSC" } })
    fireEvent.change(screen.getByLabelText(/Specific exam/i), { target: { value: "SSC CGL" } })
    fireEvent.change(screen.getByLabelText(/^Name/i), { target: { value: "Contributor" } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: "contributor@example.test" } })
    fireEvent.click(screen.getByLabelText(/I own the rights/i))
    fireEvent.submit(screen.getByRole("button", { name: /Submit for review/i }).closest("form")!)

    const retry = await screen.findByRole("button", { name: /Retry saving submission/i })
    expect(uploadFileToSignedStorage).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.getByLabelText(/Title/i)).toBeDisabled()

    fireEvent.click(retry)

    await waitFor(() => expect(screen.getByText(/Thanks! Your submission is under review/i)).toBeVisible())
    expect(uploadFileToSignedStorage).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][0]).toBe("/api/submissions/upload-url")
    expect(fetchMock.mock.calls[1][0]).toBe("/api/submissions")
    expect(fetchMock.mock.calls[2][0]).toBe("/api/submissions")
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[2][1].body)
  })

  it("retries a failed signed upload with its existing reservation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedUrl: "https://storage.test/upload", reservationId: "reservation-1", filePath: "community/reservation-1.pdf" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Uploaded PDF was not found", code: "upload_not_found" }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 201 }))
    vi.stubGlobal("fetch", fetchMock)
    uploadFileToSignedStorage
      .mockRejectedValueOnce(new Error("Network error during storage upload"))
      .mockRejectedValueOnce(new Error("Storage upload failed (409): resource already exists"))
    analyzePdfFile.mockReturnValue(new Promise(() => {}))
    render(<SubmitPage />)
    fireEvent.change(screen.getByLabelText(/Choose a PDF/i), {
      target: { files: [new File(["%PDF-1.7"], "notes.pdf", { type: "application/pdf" })] },
    })
    fireEvent.change(screen.getByLabelText(/Content type/i), { target: { value: "exams" } })
    fireEvent.change(screen.getByLabelText(/Exam group/i), { target: { value: "SSC" } })
    fireEvent.change(screen.getByLabelText(/Specific exam/i), { target: { value: "SSC CGL" } })
    fireEvent.change(screen.getByLabelText(/^Name/i), { target: { value: "Contributor" } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: "contributor@example.test" } })
    fireEvent.click(screen.getByLabelText(/I own the rights/i))
    fireEvent.submit(screen.getByRole("button", { name: /Submit for review/i }).closest("form")!)

    const retry = await screen.findByRole("button", { name: /Retry upload/i })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    fireEvent.click(retry)
    await waitFor(() => expect(screen.getByText(/Thanks! Your submission is under review/i)).toBeVisible())
    expect(uploadFileToSignedStorage).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][0]).toBe("/api/submissions/upload-url")
    expect(fetchMock.mock.calls[1][0]).toBe("/api/submissions")
    expect(fetchMock.mock.calls[2][0]).toBe("/api/submissions")
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[2][1].body)
  })

  it("finalizes successfully when the signed upload committed but its response was lost", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedUrl: "https://storage.test/upload", reservationId: "reservation-1", filePath: "community/reservation-1.pdf" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ submission: { id: "submission-1", status: "pending" } }), { status: 201 }))
    vi.stubGlobal("fetch", fetchMock)
    uploadFileToSignedStorage.mockRejectedValueOnce(new Error("Network error during storage upload"))
    analyzePdfFile.mockReturnValue(new Promise(() => {}))
    render(<SubmitPage />)

    fillRequiredSubmission()

    await waitFor(() => expect(screen.getByText(/Thanks! Your submission is under review/i)).toBeVisible())
    expect(uploadFileToSignedStorage).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe("/api/submissions")
    expect(screen.queryByRole("button", { name: /Retry upload/i })).not.toBeInTheDocument()
  })

  it("moves an ambiguous upload recovery 5xx to finalization retry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedUrl: "https://storage.test/upload", reservationId: "reservation-1", filePath: "community/reservation-1.pdf" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Could not save submission" }), { status: 503 }))
    vi.stubGlobal("fetch", fetchMock)
    uploadFileToSignedStorage.mockRejectedValueOnce(new Error("Network error during storage upload"))
    analyzePdfFile.mockReturnValue(new Promise(() => {}))
    render(<SubmitPage />)

    fillRequiredSubmission()

    expect(await screen.findByRole("button", { name: /Retry saving submission/i })).toBeVisible()
    expect(screen.queryByRole("button", { name: /Retry upload/i })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("starts over locally while explaining that the abandoned reservation still counts", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        signedUrl: "https://storage.test/upload", reservationId: "reservation-1", filePath: "community/reservation-1.pdf",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Uploaded PDF was not found", code: "upload_not_found" }), { status: 400 }))
    vi.stubGlobal("fetch", fetchMock)
    uploadFileToSignedStorage.mockRejectedValueOnce(new Error("Network error during storage upload"))
    analyzePdfFile.mockReturnValue(new Promise(() => {}))
    render(<SubmitPage />)
    fireEvent.change(screen.getByLabelText(/Choose a PDF/i), {
      target: { files: [new File(["%PDF-1.7"], "notes.pdf", { type: "application/pdf" })] },
    })
    fireEvent.change(screen.getByLabelText(/Content type/i), { target: { value: "exams" } })
    fireEvent.change(screen.getByLabelText(/Exam group/i), { target: { value: "SSC" } })
    fireEvent.change(screen.getByLabelText(/Specific exam/i), { target: { value: "SSC CGL" } })
    fireEvent.change(screen.getByLabelText(/^Name/i), { target: { value: "Contributor" } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: "contributor@example.test" } })
    fireEvent.click(screen.getByLabelText(/I own the rights/i))
    fireEvent.submit(screen.getByRole("button", { name: /Submit for review/i }).closest("form")!)

    expect(await screen.findByRole("alert")).toHaveTextContent(/retry this upload or start over/i)
    expect(screen.getByText(/still counts toward today's limit and expires automatically/i)).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: /Start over/i }))
    expect(screen.queryByRole("button", { name: /Retry upload/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Choose a PDF or drop it here/i)).toBeVisible()
    expect(fetchMock).toHaveBeenCalledTimes(2)
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