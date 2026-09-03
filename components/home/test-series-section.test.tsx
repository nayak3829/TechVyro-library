import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { TestSeriesSection } from "./test-series-section"

const push = vi.fn()

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a">) =>
    createElement("a", { href: String(href), ...props }, children),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}))

describe("TestSeriesSection", () => {
  beforeEach(() => {
    push.mockReset()
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({
        success: true,
        testSeries: [
          {
            id: "42",
            title: "SSC Series from Alpha",
            slug: "ssc-alpha",
            description: "Alpha test series",
            total_tests: 5,
            total_questions: 100,
            duration: 60,
            is_free: true,
            category: "ssc",
            _sourceApi: "https://alpha-api.example.com",
            _sourceWeb: "https://alpha.example.com",
            _platformName: "Alpha Academy",
          },
          {
            id: "42",
            title: "Banking Series from Beta",
            slug: "banking-beta",
            description: "Beta test series",
            total_tests: 8,
            total_questions: 160,
            duration: 45,
            is_free: true,
            category: "banking",
            _sourceApi: "https://beta-api.example.com",
            _platformName: "Beta Academy",
          },
        ],
      }),
    } as Response)
  })

  afterEach(() => {
    cleanup()
    delete window.umami
    vi.restoreAllMocks()
  })

  it("renders same-ID records from different sources without duplicate keys", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)

    render(createElement(TestSeriesSection))

    expect(await screen.findByText("SSC Series from Alpha")).toBeVisible()
    expect(screen.getByText("Banking Series from Beta")).toBeVisible()

    const messages = consoleError.mock.calls.map(args => args.join(" ")).join("\n")
    expect(messages).not.toMatch(/same key|unique "key" prop/i)
  })

  it("starts a live series from its real source", async () => {
    const track = vi.fn()
    window.umami = { track }
    render(createElement(TestSeriesSection))

    await screen.findByText("SSC Series from Alpha")
    fireEvent.click(screen.getAllByRole("button", { name: /start now/i })[0])

    const destination = push.mock.calls[0]?.[0] as string
    const url = new URL(destination, "https://example.com")
    expect(url.pathname).toBe("/test-series/series")
    expect(url.searchParams.get("slug")).toBe("ssc-alpha")
    expect(url.searchParams.get("apiBase")).toBe("https://alpha-api.example.com")
    expect(url.searchParams.get("webBase")).toBe("https://alpha.example.com")
    expect(url.searchParams.get("apiBase")).not.toMatch(/^sample:/)
    expect(url.searchParams.get("platform")).toBe("Alpha Academy")
    expect(url.searchParams.get("category")).toBe("ssc")
    expect(url.searchParams.get("location")).toBe("homepage")
    expect(track).not.toHaveBeenCalled()
  })
})
