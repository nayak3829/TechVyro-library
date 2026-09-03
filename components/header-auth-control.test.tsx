import { cleanup, render, screen } from "@testing-library/react"
import { createElement } from "react"
import type { User } from "@supabase/supabase-js"
import { afterEach, describe, expect, it, vi } from "vitest"

import { HeaderAuthControl } from "./header"

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a">) =>
    createElement("a", { href: String(href), ...props }, children),
}))

afterEach(cleanup)

describe("HeaderAuthControl", () => {
  it("keeps Login recognizable and reachable while auth is loading", () => {
    render(<HeaderAuthControl user={null} loading onSignOut={vi.fn()} />)

    const link = screen.getByRole("link", { name: /login while account status is being checked/i })
    expect(link).toHaveAttribute("href", "/login")
    expect(screen.getByText("Login")).toBeInTheDocument()
  })

  it("shows the normal Login action when logged out", () => {
    render(<HeaderAuthControl user={null} loading={false} onSignOut={vi.fn()} />)
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login")
  })

  it("shows the account trigger when a session is restored", () => {
    const user = {
      id: "user-1",
      email: "student@example.com",
      user_metadata: { full_name: "Test Student" },
    } as unknown as User

    render(<HeaderAuthControl user={user} loading={false} onSignOut={vi.fn()} />)
    expect(screen.getByRole("button", { name: /test/i })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument()
  })
})