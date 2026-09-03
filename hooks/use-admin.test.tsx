import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useAdmin } from "@/hooks/use-admin"

afterEach(() => {
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

describe("useAdmin", () => {
  it("checks the server session when no JavaScript-visible token exists", async () => {
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
      body: undefined,
    }))
  })
})