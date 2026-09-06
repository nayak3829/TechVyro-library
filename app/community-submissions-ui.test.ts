import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { validateCommunityHierarchy } from "@/lib/community-submission-form"

const source = (path: string) => readFileSync(path, "utf8")

describe("community submissions UI contracts", () => {
  const submit = source("app/submit/page.tsx")

  it("uses human content-type labels and server-aligned input limits", () => {
    expect(submit).toContain("options={PDF_CONTENT_TYPE_OPTIONS}")
    expect(submit).toContain("maxLength={200}")
    expect(submit).toContain("maxLength={120}")
    expect(submit).toContain("maxLength={254}")
    expect(submit).toContain("maxLength={1000}")
    expect(submit).toContain("maxLength={160}")
  })

  it("validates each community hierarchy without making optional subjects mandatory", () => {
    expect(validateCommunityHierarchy({ contentType: "exams", contentCategory: "SSC", detail: "CGL", semester: "", subject: "" })).toBeNull()
    expect(validateCommunityHierarchy({ contentType: "exams", contentCategory: "SSC", detail: "", semester: "", subject: "" })).toBeTruthy()
    expect(validateCommunityHierarchy({ contentType: "school", contentCategory: "Class 10", detail: "CBSE", semester: "", subject: "" })).toBeNull()
    expect(validateCommunityHierarchy({ contentType: "school", contentCategory: "Class 10", detail: "", semester: "", subject: "" })).toBeTruthy()
    expect(validateCommunityHierarchy({ contentType: "college", contentCategory: "B.Tech", detail: "CSE", semester: "Semester 3", subject: "" })).toBeNull()
    expect(validateCommunityHierarchy({ contentType: "college", contentCategory: "B.Tech", detail: "CSE", semester: "", subject: "" })).toBeTruthy()
    expect(validateCommunityHierarchy({ contentType: "diploma", contentCategory: "Civil", detail: "", semester: "Semester 2", subject: "" })).toBeNull()
    expect(validateCommunityHierarchy({ contentType: "diploma", contentCategory: "Civil", detail: "", semester: "", subject: "" })).toBeTruthy()
  })

  it("guards the entire upload lifecycle and resets successful submissions", () => {
    expect(submit).toContain("if (submitting.current || pendingFinalization || pendingUpload) return")
    expect(submit).toContain("submitting.current = true; setBusy(true)")
    expect(submit).toContain("<fieldset disabled={busy || Boolean(pendingFinalization) || Boolean(pendingUpload)}")
    expect(submit).toContain("Retry saving submission")
    expect(submit).toContain("Retry upload")
    expect(submit).toContain("It still counts toward today&apos;s limit and expires automatically.")
    expect(submit).toContain("setHierarchy(emptyHierarchy)")
    expect(submit).toContain("setRights(false)")
    expect(submit).toContain("Thanks! Your submission is under review. We&apos;ll notify you once it&apos;s approved.")
  })

  it("retains accessible status and PDF size/right prechecks", () => {
    expect(submit).toContain("50 * 1024 * 1024")
    expect(submit).toContain("rights")
    expect(submit).toContain('aria-live="polite"')
  })

  it("exposes Contribute in desktop and constrained mobile navigation", () => {
    expect(source("components/header.tsx")).toContain('href="/submit"')
    const mobile = source("components/mobile-nav.tsx")
    expect(mobile).toContain('label: "Contribute"')
    expect(mobile).toContain("min-h-[44px]")
    expect(mobile).toContain("flex-1")
  })

  it("keeps moderation rejection, partial results, and private detail metadata visible", () => {
    const admin = source("app/admin/submissions/page.tsx")
    expect(admin).toContain("Rejection reason")
    expect(admin).toContain("json.failed")
    expect(admin).toContain("could not be moderated")
    expect(admin).toContain("z-[60]")
    for (const field of ["Email", "Copyright confirmed", "Submitted / reviewed", "Rejection reason"]) expect(admin).toContain(field)
    expect(admin).toContain("/file")
    expect(admin).not.toContain("file_path")
  })

  it("warns about suspicious submissions and blocks their approval", () => {
    const admin = source("app/admin/submissions/page.tsx")
    expect(admin).toContain('malware_status: "clean" | "suspicious"')
    expect(admin).toContain("review_warnings: string[]")
    expect(admin).toContain("Suspicious file detected")
    expect(admin).toContain("Approval is disabled for suspicious submissions")
    expect(admin).toContain('detail.malware_status !== "suspicious"')
    expect(admin).toContain(">Reject</Button>")
  })

  it("separates exact-content duplicates from similar titles and blocks exact duplicate approval", () => {
    const admin = source("app/admin/submissions/page.tsx")
    expect(admin).toContain("setDuplicateContentWarning(json.duplicateContentWarning)")
    expect(admin).toContain("Exact duplicate content detected")
    expect(admin).toContain("Similar title already exists")
    expect(admin).toContain('disabled={busy || Boolean(duplicateContentWarning)}')
    expect(admin).toContain("exactly duplicates an existing published PDF")
  })

  it("cancels and ignores stale moderation list requests", () => {
    const admin = source("app/admin/submissions/page.tsx")
    expect(admin).toContain("const listAbortRef = useRef<AbortController | null>(null)")
    expect(admin).toContain("listAbortRef.current?.abort()")
    expect(admin).toContain("const request = ++listRequestRef.current")
    expect(admin).toContain("signal: controller.signal")
    expect(admin).toContain("request !== listRequestRef.current")
    expect(admin).toContain("listRequestRef.current += 1")
  })

  it("links moderation from the main admin panel and profile status protects private paths", () => {
    const admin = source("app/admin/page.tsx")
    expect(admin.match(/href="\/admin\/submissions"/g)).toHaveLength(2)
    const profile = source("app/profile/page.tsx")
    expect(profile).toContain("My Submissions")
    expect(profile).toContain("Reason:")
    expect(profile).toContain("View approved PDF")
    expect(profile).not.toContain("file_path")
  })

  it("uses accessible pagination, filters, modal focus management, and live updates", () => {
    const admin = source("app/admin/submissions/page.tsx")
    const profile = source("app/profile/page.tsx")
    expect(profile).toContain("/api/submissions/mine?page=${page}&limit=20")
    expect(profile).toContain("Load more submissions")
    expect(profile).toContain('role="status"')
    expect(profile).toContain('role="alert"')
    expect(admin).toContain("limit=${PAGE_SIZE}&offset=${nextOffset}")
    expect(admin).toContain("setOffset(0)")
    expect(admin).toContain('aria-pressed={status === filter}')
    expect(admin).not.toContain('role="tab"')
    expect(admin).toContain("useDialogFocus")
    expect(admin).toContain('aria-modal="true"')
    expect(admin).toContain("onMouseDown")
    expect(admin).toContain("Previous")
    expect(admin).toContain("Next")
  })
})