import { beforeEach, describe, expect, it, vi } from "vitest"
import { uploadFileToSignedStorage } from "./signed-storage-upload"

class FakeXMLHttpRequest {
  static latest: FakeXMLHttpRequest
  upload = new EventTarget()
  listeners = new Map<string, EventListener>()
  headers = new Map<string, string>()
  method = ""
  url = ""
  body: Document | XMLHttpRequestBodyInit | null = null
  aborted = false
  status = 200
  responseText = ""
  timeout = 0

  constructor() {
    FakeXMLHttpRequest.latest = this
  }

  addEventListener(type: string, listener: EventListener) {
    this.listeners.set(type, listener)
  }

  open(method: string, url: string) {
    this.method = method
    this.url = url
  }

  setRequestHeader(name: string, value: string) {
    this.headers.set(name, value)
  }

  send(body: Document | XMLHttpRequestBodyInit | null) {
    this.body = body
    queueMicrotask(() => this.listeners.get("load")?.(new Event("load")))
  }

  abort() {
    this.aborted = true
    this.listeners.get("abort")?.(new Event("abort"))
  }
}

describe("signed Supabase storage upload", () => {
  beforeEach(() => {
    vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest)
  })

  it("uses Supabase's multipart signed-upload protocol", async () => {
    const file = new File(["%PDF-1.7"], "guide.pdf", { type: "application/pdf" })

    await uploadFileToSignedStorage({
      signedUrl: "https://storage.example/object/upload/sign/pdfs/guide.pdf?token=signed",
      file,
    })

    const xhr = FakeXMLHttpRequest.latest
    expect(xhr.method).toBe("PUT")
    expect(xhr.headers.get("x-upsert")).toBe("false")
    expect(xhr.headers.has("Content-Type")).toBe(false)
    expect(xhr.body).toBeInstanceOf(FormData)
    expect((xhr.body as FormData).get("cacheControl")).toBe("3600")
    expect((xhr.body as FormData).get("")).toBe(file)
  })

  it("returns the storage API's real error message", async () => {
    const upload = uploadFileToSignedStorage({
      signedUrl: "https://storage.example/upload",
      file: new File(["%PDF-"], "guide.pdf", { type: "application/pdf" }),
    })
    FakeXMLHttpRequest.latest.status = 403
    FakeXMLHttpRequest.latest.responseText = JSON.stringify({ message: "Invalid signed token" })

    await expect(upload).rejects.toThrow("Storage upload failed (403): Invalid signed token")
  })

  it("aborts an in-flight upload through AbortSignal", async () => {
    const controller = new AbortController()
    const upload = uploadFileToSignedStorage({
      signedUrl: "https://storage.example/upload",
      file: new File(["%PDF-"], "guide.pdf", { type: "application/pdf" }),
      signal: controller.signal,
    })

    controller.abort()

    await expect(upload).rejects.toMatchObject({ name: "AbortError" })
    expect(FakeXMLHttpRequest.latest.aborted).toBe(true)
  })
})