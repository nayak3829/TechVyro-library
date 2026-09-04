export const PDF_CONTENT_TYPES = ["exams", "school", "college", "diploma"] as const
export type PdfContentType = (typeof PDF_CONTENT_TYPES)[number]

export const PDF_CONTENT_TYPE_OPTIONS = [
  { value: "exams", label: "Exams" },
  { value: "school", label: "School" },
  { value: "college", label: "College" },
  { value: "diploma", label: "Diploma" },
] as const

export const EXAM_GROUPS = ["SSC", "Banking", "Defence", "Railways", "UPSC/PCS", "Teaching", "JEE/NEET", "Agriculture"] as const
export const SCHOOL_CLASSES = Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`)
export const SCHOOL_BOARDS = ["CBSE", "ICSE", "State Board"] as const
export const COLLEGE_COURSES = ["B.Tech", "B.Sc", "B.Com", "BA", "Other"] as const
export const DIPLOMA_BRANCHES = ["Mechanical", "Civil", "Computer Science", "Electrical", "Electronics", "Other"] as const
export const SEMESTERS = Array.from({ length: 12 }, (_, index) => `Semester ${index + 1}`)

export interface PdfContentMetadata {
  content_type: PdfContentType | null
  content_category: string | null
  content_subcategory: string | null
  subject: string | null
}

export interface PdfContentFormValue {
  contentType: PdfContentType | ""
  contentCategory: string
  detail: string
  semester: string
  subject: string
}

const MAX_CATEGORY = 80
const MAX_SUBCATEGORY = 160
const MAX_SUBJECT = 120
const DETAIL_SEPARATOR = " · "

function requiredString(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || value !== value.trim() || value.length === 0 || value.length > max) {
    throw new Error(`${label} is required and must be at most ${max} characters`)
  }
  if (/[\u0000-\u001f\u007f]/.test(value)) throw new Error(`${label} contains invalid characters`)
  return value
}

function nullableString(value: unknown, label: string, max: number): string | null {
  if (value === undefined || value === null || value === "") return null
  return requiredString(value, label, max)
}

function oneOf(value: string, options: readonly string[], label: string) {
  if (!options.includes(value)) throw new Error(`${label} is invalid`)
}

export function joinDetailAndSemester(detail: string, semester: string): string {
  return `${detail}${DETAIL_SEPARATOR}${semester}`
}

export function splitDetailAndSemester(value: string | null | undefined) {
  if (!value) return { detail: "", semester: "" }
  const separatorIndex = value.lastIndexOf(DETAIL_SEPARATOR)
  if (separatorIndex < 0) return { detail: value, semester: "" }
  return {
    detail: value.slice(0, separatorIndex),
    semester: value.slice(separatorIndex + DETAIL_SEPARATOR.length),
  }
}

export function formValueToMetadata(value: PdfContentFormValue): Record<string, string | null> {
  const subcategory = value.contentType === "college"
    ? (value.detail && value.semester ? joinDetailAndSemester(value.detail, value.semester) : "")
    : value.contentType === "diploma" ? value.semester : value.detail
  return {
    contentType: value.contentType || null,
    contentCategory: value.contentCategory || null,
    contentSubcategory: subcategory || null,
    subject: value.subject || null,
  }
}

export function metadataToFormValue(metadata: Partial<PdfContentMetadata>): PdfContentFormValue {
  const type = PDF_CONTENT_TYPES.includes(metadata.content_type as PdfContentType)
    ? metadata.content_type as PdfContentType
    : ""
  const split = type === "college"
    ? splitDetailAndSemester(metadata.content_subcategory)
    : { detail: type === "diploma" ? "" : metadata.content_subcategory || "", semester: type === "diploma" ? metadata.content_subcategory || "" : "" }
  return {
    contentType: type,
    contentCategory: metadata.content_category || "",
    detail: split.detail,
    semester: split.semester,
    subject: metadata.subject || "",
  }
}

export function clearPdfContentDependents(
  value: PdfContentFormValue,
  changed: "contentType" | "contentCategory" | "detail" | "semester",
  nextValue: string,
): PdfContentFormValue {
  if (changed === "contentType") {
    return { contentType: nextValue as PdfContentType | "", contentCategory: "", detail: "", semester: "", subject: "" }
  }
  if (changed === "contentCategory") return { ...value, contentCategory: nextValue, detail: "", semester: "", subject: "" }
  if (changed === "detail") return { ...value, detail: nextValue, semester: "", subject: "" }
  return { ...value, semester: nextValue, subject: "" }
}

export function normalizePdfContentMetadata(
  input: Record<string, unknown>,
  options: { allowEmpty?: boolean } = {},
): PdfContentMetadata {
  const rawType = input.contentType ?? input.content_type
  const rawCategory = input.contentCategory ?? input.content_category
  const rawSubcategory = input.contentSubcategory ?? input.content_subcategory
  const rawSubject = input.subject
  const allEmpty = [rawType, rawCategory, rawSubcategory, rawSubject]
    .every((value) => value === undefined || value === null || value === "")
  if (allEmpty && options.allowEmpty) {
    return { content_type: null, content_category: null, content_subcategory: null, subject: null }
  }
  if (typeof rawType !== "string" || !PDF_CONTENT_TYPES.includes(rawType as PdfContentType)) {
    throw new Error("Content type must be exams, school, college, or diploma")
  }
  const contentType = rawType as PdfContentType
  const category = requiredString(rawCategory, contentType === "exams" ? "Exam group" : contentType === "school" ? "Class" : contentType === "college" ? "Course" : "Branch", MAX_CATEGORY)
  const subcategory = requiredString(rawSubcategory, contentType === "exams" ? "Specific exam" : contentType === "school" ? "Board" : "Branch and semester", MAX_SUBCATEGORY)
  const subject = nullableString(rawSubject, "Subject", MAX_SUBJECT)

  if (contentType === "exams") {
    oneOf(category, EXAM_GROUPS, "Exam group")
    if (subject !== null) throw new Error("Subject is not used for exam content")
  } else if (contentType === "school") {
    oneOf(category, SCHOOL_CLASSES, "Class")
    oneOf(subcategory, SCHOOL_BOARDS, "Board")
    if (!subject) throw new Error("Subject is required")
  } else {
    if (contentType === "college") {
      oneOf(category, COLLEGE_COURSES, "Course")
    } else {
      oneOf(category, DIPLOMA_BRANCHES, "Branch")
      oneOf(subcategory, SEMESTERS, "Semester")
    }
    const split = splitDetailAndSemester(subcategory)
    if (contentType === "college") {
      if (!split.detail) throw new Error("Branch/Stream is required")
      oneOf(split.semester, SEMESTERS, "Semester")
    }
    if (!subject) throw new Error("Subject is required")
  }

  return {
    content_type: contentType,
    content_category: category,
    content_subcategory: subcategory,
    subject,
  }
}