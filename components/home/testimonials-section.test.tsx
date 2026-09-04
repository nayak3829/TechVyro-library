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
      json: async () => ({ value: [] }),
    } as Response)

    render(<TestimonialsSection />)

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "What Students Say" })).toBeNull()
    })
  })

  it("keeps only one semantic copy of each honest default review", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({ value: null }),
    } as Response)

    const { container } = render(<TestimonialsSection />)
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())

    expect(container.querySelectorAll("[data-testimonial-card]")).toHaveLength(24)
    expect(container.querySelectorAll('[data-testimonial-card][data-clone="false"]')).toHaveLength(6)
    expect(container.querySelectorAll('[data-testimonial-card][data-clone="true"]')).toHaveLength(18)
    expect(screen.queryByText(/10,000\+|engineering subjects|NCERT solutions|Biology and Chemistry/i)).toBeNull()
    expect(screen.getByText(/currently focused on SSC study PDFs/i)).toBeVisible()
  })
})