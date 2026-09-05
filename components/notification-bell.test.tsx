import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { NotificationBell } from "./notification-bell"

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}))
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ notifications: [], unreadCount: 0 }),
    } as Response)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("exposes popup semantics and returns focus on Escape", () => {
    render(<NotificationBell />)
    const trigger = screen.getByRole("button", { name: "Notifications" })

    fireEvent.click(trigger)
    expect(screen.getByRole("dialog", { name: "Your inbox" })).toBeVisible()

    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.queryByRole("dialog", { name: "Your inbox" })).toBeNull()
    expect(trigger).toHaveFocus()
  })
})