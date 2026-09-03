import { afterEach, describe, expect, it, vi } from "vitest"

import { trackEvent } from "./analytics"

describe("trackEvent", () => {
  afterEach(() => {
    delete window.umami
  })

  it("is a no-op when the injected tracker is unavailable", () => {
    expect(() => trackEvent("live_test_series_started")).not.toThrow()
  })

  it("contains tracker failures", () => {
    window.umami = {
      track: vi.fn(() => {
        throw new Error("tracker failed")
      }),
    }

    expect(() => trackEvent("live_test_series_started")).not.toThrow()
  })
})
