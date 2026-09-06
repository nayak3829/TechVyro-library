import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import {
  getCommunityRequestIp, isSubmissionSecurityConfigured, logSubmissionConfigurationDiagnostic, privacyHash, validateUploadRequest,
} from "@/lib/community-submissions"
import { cleanupExpiredCommunityUploads } from "@/lib/community-upload-cleanup"

const NO_STORE = { headers: { "Cache-Control": "no-store" } }

async function cleanupFailedReservation(db: ReturnType<typeof createAdminClient>, reservationId: string, filePath: string) {
  const [reservation, object] = await Promise.allSettled([
    db.from("community_submission_reservations").delete().eq("id", reservationId),
    db.storage.from("community-pdfs").remove([filePath]),
  ])
  const reservationError = reservation.status === "rejected" || Boolean(reservation.value.error)
  const objectError = object.status === "rejected" || Boolean(object.value.error)
  if (reservationError || objectError) {
    console.error("Community upload URL failure cleanup incomplete", {
      event: "community_upload_url_cleanup_incomplete", path: filePath,
      reservationError, objectError,
    })
  }
}

export async function POST(request: Request) {
  const adminConfigured = isAdminConfigured()
  if (!adminConfigured || !isSubmissionSecurityConfigured()) {
    logSubmissionConfigurationDiagnostic(adminConfigured)
    return NextResponse.json({ error: "Submission service is temporarily unavailable" }, { status: 503, ...NO_STORE })
  }
  try {
    const body = await request.json()
    const { email } = validateUploadRequest(body)
    const db = createAdminClient()
    await cleanupExpiredCommunityUploads(db)
    const { data: reservationId, error: reserveError } = await db.rpc("reserve_community_submission_slot", {
      p_email_hash: privacyHash("email", email),
      p_ip_hash: privacyHash("ip", getCommunityRequestIp(request)),
      p_ttl_seconds: 10800,
    })
    if (reserveError || typeof reservationId !== "string") {
      const limited = reserveError?.message?.includes("daily submission limit")
      return NextResponse.json({ error: limited ? "Daily submission limit reached" : "Could not reserve an upload" }, { status: limited ? 429 : 500, ...NO_STORE })
    }
    const filePath = `community/${reservationId}.pdf`
    const { data, error } = await db.storage.from("community-pdfs").createSignedUploadUrl(filePath)
    if (error || !data) {
      await cleanupFailedReservation(db, reservationId, filePath)
      return NextResponse.json({ error: "Could not create upload URL" }, { status: 500, ...NO_STORE })
    }
    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, filePath, reservationId }, NO_STORE)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400, ...NO_STORE })
  }
}