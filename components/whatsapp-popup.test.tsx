import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { WhatsAppPopup } from "./whatsapp-popup"

describe("WhatsAppPopup settings", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sessionStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("does not open when popup settings disable it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({ value: { whatsappPopupEnabled: false } }),
    } as Response)

    render(<WhatsAppPopup />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000)
    })

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(sessionStorage.getItem("wa_popup_shown")).toBeNull()
  })

  it("opens as a non-modal dialog after enabled settings resolve", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({ value: { whatsappPopupEnabled: true } }),
    } as Response)

    render(<WhatsAppPopup />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000)
    })

    const dialog = screen.getByRole("dialog", { name: /TechVyro/i })
    expect(dialog).toBeVisible()
    expect(dialog).not.toHaveAttribute("aria-modal")
  })
})