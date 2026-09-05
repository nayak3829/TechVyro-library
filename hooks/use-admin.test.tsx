import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useAdmin } from "@/hooks/use-admin"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useAdmin", () => {
  it("checks only the cookie-backed server session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ valid: true }), {
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const { result } = renderHook(() => useAdmin())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isAdmin).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/verify", expect.objectContaining({
      method: "POST",
      credentials: "include",
    }))
    const request = fetchMock.mock.calls[0][1]
    expect(request).not.toHaveProperty("body")
    expect(request).not.toHaveProperty("headers")
  })
})