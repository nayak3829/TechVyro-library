import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { WhatsAppPopup } from "./whatsapp-popup"
import { invalidatePublicGeneralSettingsCache } from "@/lib/general-settings-client"

const navigation = vi.hoisted(() => ({ pathname: "/" }))
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}))

describe("WhatsAppPopup settings", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sessionStorage.clear()
    invalidatePublicGeneralSettingsCache()
    navigation.pathname = "/"
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("does not open when popup settings disable it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ value: { whatsappPopupEnabled: false } }),
    } as Response)

    render(<WhatsAppPopup />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(sessionStorage.getItem("wa_popup_shown")).toBeNull()
  })

  it("opens as a non-modal dialog after enabled settings resolve", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ value: { whatsappPopupEnabled: true } }),
    } as Response)

    render(<WhatsAppPopup />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_032)
    })

    const dialog = screen.getByRole("dialog", { name: /TechVyro/i })
    expect(dialog).toBeVisible()
    expect(dialog).not.toHaveAttribute("aria-modal")
  })

  it("does not fetch settings or interrupt admin routes", async () => {
    navigation.pathname = "/admin"
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    render(<WhatsAppPopup />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})