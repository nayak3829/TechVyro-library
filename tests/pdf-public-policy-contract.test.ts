import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("community PDF public policy coverage", () => {
  it("uses the centralized query policy in every catalogue outlier", () => {
    for (const path of [
      "app/api/pdfs/route.ts", "app/api/pdfs/search/route.ts",
      "app/api/subject/[id]/route.ts", "app/sitemap.ts", "app/api/chat/route.ts",
    ]) expect(read(path)).toContain("applyPublicPdfVisibility")
  })

  it("selects safety fields anywhere canViewPDF provides row-level defense", () => {
    for (const path of [
      "app/api/pdfs/[id]/view/route.ts", "app/api/pdfs/[id]/download/route.ts",
      "app/api/pdfs/[id]/download-watermarked/route.ts", "app/api/pdfs/[id]/thumbnail/route.ts",
    ]) {
      const source = read(path)
      expect(source).toContain("storage_bucket")
      expect(source).toContain("malware_status")
    }
  })

  it("blocks direct publication of unsafe community sources only", () => {
    const source = read("app/api/pdfs/[id]/publish/route.ts")
    expect(source).toContain("!communityPdfPassesSafety(pdf)")
    expect(source).toContain("Community PDF must pass safety checks before publishing")
    expect(source).toContain("status: 409")
  })
})