"use client"

import { useMemo } from "react"
import { PDF_CONTENT_TYPE_OPTIONS } from "@/lib/pdf-content-metadata"
import { joinDetailAndSemester, splitDetailAndSemester } from "@/lib/pdf-content-metadata"

export interface ContentHierarchyFilterValue {
  contentType: string
  contentCategory: string
  branch: string
  contentSubcategory: string
  subject: string
}

type ContentRow = {
  content_type?: string | null
  content_category?: string | null
  content_subcategory?: string | null
  subject?: string | null
}

export function matchesContentHierarchy<T extends ContentRow>(pdf: T, filter: ContentHierarchyFilterValue) {
  const collegeDetail = filter.contentType === "college"
    ? splitDetailAndSemester(pdf.content_subcategory).detail
    : ""
  return (!filter.contentType || pdf.content_type === filter.contentType) &&
    (!filter.contentCategory || pdf.content_category === filter.contentCategory) &&
    (!filter.branch || collegeDetail === filter.branch) &&
    (!filter.contentSubcategory || pdf.content_subcategory === filter.contentSubcategory) &&
    (!filter.subject || pdf.subject === filter.subject)
}

export function PdfContentFilter<T extends ContentRow>({ pdfs, value, onChange }: {
  pdfs: T[]
  value: ContentHierarchyFilterValue
  onChange: (value: ContentHierarchyFilterValue) => void
}) {
  const options = useMemo(() => {
    const typeRows = pdfs.filter((pdf) => !value.contentType || pdf.content_type === value.contentType)
    const categoryRows = typeRows.filter((pdf) => !value.contentCategory || pdf.content_category === value.contentCategory)
    const branchRows = value.contentType === "college"
      ? categoryRows.filter((pdf) => !value.branch || splitDetailAndSemester(pdf.content_subcategory).detail === value.branch)
      : categoryRows
    const subcategoryRows = branchRows.filter((pdf) => !value.contentSubcategory || pdf.content_subcategory === value.contentSubcategory)
    const unique = (items: Array<string | null | undefined>) => [...new Set(items.filter((item): item is string => Boolean(item)))].sort()
    return {
      categories: unique(typeRows.map((pdf) => pdf.content_category)),
      branches: unique(categoryRows.map((pdf) => splitDetailAndSemester(pdf.content_subcategory).detail)),
      subcategories: unique(branchRows.map((pdf) => value.contentType === "college"
        ? splitDetailAndSemester(pdf.content_subcategory).semester
        : pdf.content_subcategory)),
      subjects: unique(subcategoryRows.map((pdf) => pdf.subject)),
    }
  }, [pdfs, value.contentType, value.contentCategory, value.branch, value.contentSubcategory])

  return <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
    <select aria-label="Filter by content type" value={value.contentType}
      onChange={(event) => onChange({ contentType: event.target.value, contentCategory: "", branch: "", contentSubcategory: "", subject: "" })}
      className="h-10 rounded-lg border border-border/70 bg-card px-3 text-sm">
      <option value="">All Content Types</option>
      {PDF_CONTENT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {value.contentType && <select aria-label="Filter by content category" value={value.contentCategory}
      onChange={(event) => onChange({ ...value, contentCategory: event.target.value, branch: "", contentSubcategory: "", subject: "" })}
      className="h-10 rounded-lg border border-border/70 bg-card px-3 text-sm">
      <option value="">All {value.contentType === "exams" ? "Exam Groups" : value.contentType === "school" ? "Classes" : value.contentType === "college" ? "Courses" : "Branches"}</option>
      {options.categories.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>}
    {value.contentCategory && value.contentType === "college" && <select aria-label="Filter by branch or stream" value={value.branch}
      onChange={(event) => onChange({ ...value, branch: event.target.value, contentSubcategory: "", subject: "" })}
      className="h-10 rounded-lg border border-border/70 bg-card px-3 text-sm">
      <option value="">All Branches/Streams</option>
      {options.branches.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>}
    {value.contentCategory && (value.contentType !== "college" || value.branch) && <select aria-label="Filter by content subcategory" value={value.contentType === "college" ? splitDetailAndSemester(value.contentSubcategory).semester : value.contentSubcategory}
      onChange={(event) => {
        const semester = event.target.value
        onChange({ ...value, contentSubcategory: value.contentType === "college" ? joinDetailAndSemester(value.branch, semester) : semester, subject: "" })
      }}
      className="h-10 rounded-lg border border-border/70 bg-card px-3 text-sm">
      <option value="">All {value.contentType === "exams" ? "Specific Exams" : value.contentType === "school" ? "Boards" : "Semesters"}</option>
      {options.subcategories.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>}
    {value.contentSubcategory && options.subjects.length > 0 && <select aria-label="Filter by subject" value={value.subject}
      onChange={(event) => onChange({ ...value, subject: event.target.value })}
      className="h-10 rounded-lg border border-border/70 bg-card px-3 text-sm">
      <option value="">All Subjects</option>
      {options.subjects.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>}
  </div>
}