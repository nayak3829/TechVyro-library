import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { Session, User } from "@supabase/supabase-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AUTH_INITIALIZATION_TIMEOUT_MS, useAuth } from "./use-auth"

const getSession = vi.fn()
const getUser = vi.fn()
const signOut = vi.fn()
const unsubscribe = vi.fn()
let authListener: ((event: string, session: Session | null) => void) | undefined
let configured = true

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => configured ? {
    auth: {
      getSession,
      getUser,
      signOut,
      onAuthStateChange: (listener: typeof authListener) => {
        authListener = listener
        return { data: { subscription: { unsubscribe } } }
      },
    },
  } : null,
}))

const user = {
  id: "user-1",
  email: "student@example.com",
  user_metadata: { full_name: "Test Student" },
} as unknown as User

describe("useAuth", () => {
  beforeEach(() => {
    configured = true
    authListener = undefined
    getSession.mockReset()
    getUser.mockReset()
    signOut.mockReset()
    unsubscribe.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it("settles as logged out when no session exists", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it("restores and validates an existing session", async () => {
    getSession.mockResolvedValue({ data: { session: { user } }, error: null })
    getUser.mockResolvedValue({ data: { user }, error: null })
    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.user).toBe(user))
    expect(result.current.loading).toBe(false)
    await waitFor(() => expect(getUser).toHaveBeenCalledOnce())
  })

  it("settles safely when the client is not configured", async () => {
    configured = false
    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it("settles safely when session lookup fails", async () => {
    getSession.mockRejectedValue(new Error("network failure"))
    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it("cannot remain loading when session lookup hangs", async () => {
    vi.useFakeTimers()
    getSession.mockReturnValue(new Promise(() => undefined))
    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_INITIALIZATION_TIMEOUT_MS)
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it("responds to later authentication changes", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => authListener?.("SIGNED_IN", { user } as Session))
    expect(result.current.user).toBe(user)
  })
})