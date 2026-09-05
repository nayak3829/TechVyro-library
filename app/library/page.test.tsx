import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import LibraryPage from "./page"

vi.mock("@/components/header", () => ({ Header: () => null }))
vi.mock("@/components/footer", () => ({ Footer: () => null }))
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "user-1" }, loading: false }) }))
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.ComponentProps<"a">) => <a href={String(href)} {...props}>{children}</a> }))

const pdf = {
  id: "pdf-1",
  title: "SSC Geography Notes",
  description: "Revision notes",
  view_count: 3,
  download_count: 2,
  categories: { name: "SSC", color: "#123456" },
  savedAt: "2026-09-01T00:00:00Z",
}

describe("My Library", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      if (init?.method === "POST") return { ok: true, json: async () => ({ action: "removed" }) } as Response
      return { ok: true, json: async () => ({
        saved: [pdf],
        recent: [{ ...pdf, lastViewedAt: "2026-09-02T00:00:00Z" }],
        downloads: [{ ...pdf, lastDownloadedAt: "2026-09-03T00:00:00Z" }],
      }) } as Response
    })
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it("shows persisted sections and removes a saved item", async () => {
    render(<LibraryPage />)
    expect(await screen.findByText("SSC Geography Notes")).toBeVisible()
    expect(screen.getByRole("tab", { name: "Recently viewed, 1 items" })).toBeVisible()
    expect(screen.getByRole("tab", { name: "Downloads, 1 items" })).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: /Remove SSC Geography Notes/i }))
    await waitFor(() => expect(screen.queryByText("SSC Geography Notes")).toBeNull())
  })
})