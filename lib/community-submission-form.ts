import type { PdfContentFormValue } from "@/lib/pdf-content-metadata"
import {
  COLLEGE_COURSES, DIPLOMA_BRANCHES, EXAM_GROUPS, SCHOOL_BOARDS, SCHOOL_CLASSES, SEMESTERS,
} from "@/lib/pdf-content-metadata"

type AnalysisSuggestionInput = {
  title?: string
  text?: string
  keywords?: readonly string[]
  metadata?: Record<string, string>
}

function includesAny(haystack: string, values: readonly string[]) {
  return values.find(value => haystack.includes(value.toLowerCase()))
}

function numberedMatch(haystack: string, prefix: string, maximum: number) {
  const match = haystack.match(new RegExp(`\\b(?:${prefix})\\s*(\\d{1,2})\\b`, "i"))
  const number = Number(match?.[1])
  return Number.isInteger(number) && number >= 1 && number <= maximum ? number : null
}

/** Conservative suggestions only; contributors remain responsible for review. */
export function inferCommunityHierarchy(input: AnalysisSuggestionInput): PdfContentFormValue | null {
  const corpus = [input.title, input.text?.slice(0, 30_000), input.metadata?.subject, ...(input.keywords || [])]
    .filter(Boolean).join(" ").toLowerCase()

  const examAliases: Array<[typeof EXAM_GROUPS[number], readonly string[]]> = [
    ["SSC", ["ssc", "staff selection commission"]],
    ["Banking", ["banking exam", "ibps", "sbi po", "sbi clerk", "rbi grade"]],
    ["Defence", ["nda", "cds", "afcat", "defence exam", "defense exam"]],
    ["Railways", ["railway exam", "railways exam", "rrb ntpc", "rrb group"]],
    ["UPSC/PCS", ["upsc", "civil services", "state pcs"]],
    ["Teaching", ["ctet", "teacher eligibility", "teaching exam"]],
    ["JEE/NEET", ["jee main", "jee advanced", "neet"]],
    ["Agriculture", ["agriculture exam", "icar", "nabard grade"]],
  ]
  for (const [group, aliases] of examAliases) {
    const matched = includesAny(corpus, aliases)
    if (matched && EXAM_GROUPS.includes(group)) {
      const detail = input.title?.trim() || matched.toUpperCase()
      return { contentType: "exams", contentCategory: group, detail: detail.slice(0, 160), semester: "", subject: "" }
    }
  }

  const classNumber = numberedMatch(corpus, "class", 12)
  const board = includesAny(corpus, SCHOOL_BOARDS.map(value => value.toLowerCase()))
  if (classNumber && board) {
    const boardValue = SCHOOL_BOARDS.find(value => value.toLowerCase() === board) || ""
    return {
      contentType: "school", contentCategory: SCHOOL_CLASSES[classNumber - 1], detail: boardValue,
      semester: "", subject: input.metadata?.subject?.trim().slice(0, 120) || "",
    }
  }

  const semesterNumber = numberedMatch(corpus, "semester|sem", 12)
  const semester = semesterNumber ? SEMESTERS[semesterNumber - 1] : ""
  const diplomaBranch = includesAny(corpus, DIPLOMA_BRANCHES.filter(value => value !== "Other").map(value => value.toLowerCase()))
  if (corpus.includes("diploma") && diplomaBranch && semester) {
    const branch = DIPLOMA_BRANCHES.find(value => value.toLowerCase() === diplomaBranch) || ""
    return { contentType: "diploma", contentCategory: branch, detail: "", semester, subject: input.metadata?.subject?.trim().slice(0, 120) || "" }
  }

  const course = includesAny(corpus, COLLEGE_COURSES.filter(value => value !== "Other").map(value => value.toLowerCase()))
  if (course && semester) {
    const courseValue = COLLEGE_COURSES.find(value => value.toLowerCase() === course) || ""
    const branchMatch = corpus.match(/\b(computer science|mechanical|civil|electrical|electronics|commerce|arts|science)\b/i)
    if (branchMatch) {
      return {
        contentType: "college", contentCategory: courseValue, detail: branchMatch[1],
        semester, subject: input.metadata?.subject?.trim().slice(0, 120) || "",
      }
    }
  }

  return null
}

/** Client guidance only; the API remains the authority for all metadata. */
export function validateCommunityHierarchy(value: PdfContentFormValue): string | null {
  if (!value.contentType || !value.contentCategory) return "Please complete the required content hierarchy."
  if (value.contentType === "exams") return value.detail.trim() ? null : "Please complete the required content hierarchy."
  if (value.contentType === "school") return value.detail ? null : "Please complete the required content hierarchy."
  if (value.contentType === "college") return value.detail.trim() && value.semester ? null : "Please complete the required content hierarchy."
  if (value.contentType === "diploma") return value.semester ? null : "Please complete the required content hierarchy."
  return "Please complete the required content hierarchy."
}