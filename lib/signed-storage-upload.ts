interface SignedStorageUploadOptions {
  signedUrl: string
  file: File
  onProgress?: (loaded: number, total: number) => void
  signal?: AbortSignal
}

function storageUploadError(xhr: XMLHttpRequest): string {
  let detail = ""
  try {
    const body = JSON.parse(xhr.responseText) as {
      message?: unknown
      error?: unknown
      error_description?: unknown
    }
    const candidate = body.message ?? body.error_description ?? body.error
    if (typeof candidate === "string") detail = candidate.trim()
  } catch {
    detail = xhr.responseText?.trim().slice(0, 300) || ""
  }

  const status = xhr.status > 0 ? ` (${xhr.status})` : ""
  return detail
    ? `Storage upload failed${status}: ${detail}`
    : `Storage upload failed${status}`
}

export function uploadFileToSignedStorage({
  signedUrl,
  file,
  onProgress,
  signal,
}: SignedStorageUploadOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      signal?.removeEventListener("abort", abortUpload)
      callback()
    }
    const abortUpload = () => xhr.abort()

    // Match Supabase Storage's uploadToSignedUrl wire format. The signed
    // endpoint expects multipart data rather than a raw application/pdf body.
    formData.append("cacheControl", "3600")
    formData.append("", file)

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total)
    })
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        finish(resolve)
      } else {
        finish(() => reject(new Error(storageUploadError(xhr))))
      }
    })
    xhr.addEventListener("error", () => finish(() => reject(new Error("Network error during storage upload"))))
    xhr.addEventListener("abort", () => finish(() => reject(new DOMException("Upload was cancelled", "AbortError"))))
    xhr.addEventListener("timeout", () => finish(() => reject(new Error("Storage upload timed out"))))

    xhr.open("PUT", signedUrl)
    xhr.timeout = 10 * 60 * 1000
    xhr.setRequestHeader("x-upsert", "false")
    if (signal?.aborted) {
      finish(() => reject(new DOMException("Upload was cancelled", "AbortError")))
      return
    }
    signal?.addEventListener("abort", abortUpload, { once: true })
    xhr.send(formData)
  })
}