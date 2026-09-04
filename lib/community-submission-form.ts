import type { PdfContentFormValue } from "@/lib/pdf-content-metadata"

/** Client guidance only; the API remains the authority for all metadata. */
export function validateCommunityHierarchy(value: PdfContentFormValue): string | null {
  if (!value.contentType || !value.contentCategory) return "Please complete the required content hierarchy."
  if (value.contentType === "exams") return value.detail.trim() ? null : "Please complete the required content hierarchy."
  if (value.contentType === "school") return value.detail ? null : "Please complete the required content hierarchy."
  if (value.contentType === "college") return value.detail.trim() && value.semester ? null : "Please complete the required content hierarchy."
  if (value.contentType === "diploma") return value.semester ? null : "Please complete the required content hierarchy."
  return "Please complete the required content hierarchy."
}