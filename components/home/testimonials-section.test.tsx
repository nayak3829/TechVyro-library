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
})