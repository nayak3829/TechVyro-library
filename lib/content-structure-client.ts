"use client"

let contentStructureRequest: Promise<unknown> | null = null

export function getPublicContentStructure() {
  if (!contentStructureRequest) {
    contentStructureRequest = fetch("/api/content-structure")
      .then(response => {
        if (!response.ok) throw new Error("Content inventory unavailable")
        return response.json()
      })
      .catch(error => {
        contentStructureRequest = null
        throw error
      })
  }
  return contentStructureRequest
}