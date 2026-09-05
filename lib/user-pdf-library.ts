import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export type PdfActivityEvent = "view" | "download"

export async function recordUserPdfActivity(userId: string | null | undefined, pdfId: string, event: PdfActivityEvent) {
  if (!userId) return
  const { error } = await createAdminClient().rpc("record_user_pdf_activity", {
    p_user_id: userId,
    p_pdf_id: pdfId,
    p_event: event,
  })
  if (error) console.error(`[library] Failed to record ${event}:`, error.message)
}