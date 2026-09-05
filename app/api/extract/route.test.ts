import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("dns/promises", () => {
  const lookup = async () => [{ address: "8.8.8.8", family: 4 }]
  return { default: { lookup }, lookup }
})

import { GET } from "./route"

describe("extract route normalization", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("retains live-series source metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: "live-1", title: "Live Test Series" }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }))

    const response = await GET(new Request("https://local.test/api/extract?bulk=true&category=all"))
    const data = await response.json()
    const series = data.testSeries.find((item: { id: string }) => item.id === "live-1")

    expect(series).toMatchObject({
      _sourceApi: expect.stringMatching(/^https?:\/\//),
      _sourceWeb: expect.stringMatching(/^https?:\/\//),
      _platformName: expect.any(String),
      isSample: false,
    })
  })

  it("rejects arbitrary hosts before making a server-side request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")

    const response = await GET(new Request("https://local.test/api/extract?url=http://127.0.0.1:3000/admin"))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("accepts a known APX platform host", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"))

    const response = await GET(
      new Request("https://local.test/api/extract?url=https://a4agricos.classx.co.in"),
    )

    expect(response.status).toBe(200)
    expect(globalThis.fetch).toHaveBeenCalled()
  })

  it("rejects redirects rather than following an allowlisted host to another network", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("redirect disallowed"))

    await GET(new Request("https://local.test/api/extract?url=https://a4agricos.classx.co.in"))
    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/^https:\/\/a4agricosapi\.classx\.co\.in\//)
    expect(options).toMatchObject({ redirect: "manual" })
  })
})