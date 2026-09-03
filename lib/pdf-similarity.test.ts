import { describe, expect, it } from "vitest"
import { simhashSimilarity } from "./pdf-similarity"

describe("simhashSimilarity", () => {
  it("compares differing bits rather than differing hex characters", () => {
    expect(simhashSimilarity("0000000000000000", "1000000000000000")).toBeCloseTo(63 / 64)
    expect(simhashSimilarity("0000000000000000", "f000000000000000")).toBeCloseTo(60 / 64)
  })

  it("rejects malformed and differently-sized fingerprints", () => {
    expect(simhashSimilarity("0000", "000")).toBe(0)
    expect(simhashSimilarity("zzzz", "0000")).toBe(0)
  })
})