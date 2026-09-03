import { describe, expect, it } from "vitest"
import { loginHref, safeInternalPath } from "./auth-redirect"

describe("safeInternalPath", () => {
  it("keeps same-origin relative paths, including their query and hash", () => {
    expect(safeInternalPath("/test-series/play?testId=one#instructions")).toBe(
      "/test-series/play?testId=one#instructions",
    )
  })

  it.each([
    "//attacker.example",
    "/\\attacker.example",
    "/%2f%2fattacker.example",
    "/%5cattacker.example",
    "https://attacker.example",
    "javascript:alert(1)",
    "/quiz/%",
    "/quiz/\u0000bad",
  ])("rejects unsafe redirect %j", (value) => {
    expect(safeInternalPath(value)).toBe("/")
  })

  it("encodes a full destination when composing the login URL", () => {
    expect(loginHref("/test-series/play?testId=one&apiBase=sample:ssc")).toBe(
      "/login?redirect=%2Ftest-series%2Fplay%3FtestId%3Done%26apiBase%3Dsample%3Assc",
    )
  })
})