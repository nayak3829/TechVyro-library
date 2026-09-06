import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TestimonialsSection } from "./testimonials-section"

describe("TestimonialsSection settings", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("renders no testimonials when the configured list is explicitly empty", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ value: [] }),
    } as Response)

    render(<TestimonialsSection />)

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "What Students Say" })).toBeNull()
    })
  })

  it("renders no fabricated content when the settings value is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ value: null }),
    } as Response)

    const { container } = render(<TestimonialsSection />)
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())

    expect(container.querySelectorAll("[data-testimonial-card]")).toHaveLength(0)
    expect(screen.queryByRole("heading", { name: "Words from students" })).toBeNull()
  })

  it("uses only valid configured reviews and exposes one accessible copy", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        value: [
          { id: "valid", name: "Mina Rao", course: "Physics student", comment: "Useful revision notes.", rating: 5, verified: false, enabled: true },
          { id: "invalid", name: "Ignored", course: "Student", comment: "", rating: 5, verified: true, enabled: true },
        ],
      }),
    } as Response)

    const { container } = render(<TestimonialsSection />)
    await waitFor(() => expect(screen.getByRole("heading", { name: "Words from students" })).toBeVisible())

    expect(container.querySelectorAll("[data-testimonial-card]")).toHaveLength(2)
    expect(screen.getAllByText(/Mina Rao: Useful revision notes\./)).toHaveLength(1)
    expect(screen.queryByText("Ignored")).toBeNull()
  })
})