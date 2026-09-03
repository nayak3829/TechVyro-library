import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"

export async function getRecentDownloadCount(days = 7): Promise<{ count: number; available: boolean }> {
  if (!isAdminConfigured()) return { count: 0, available: false }
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - Math.max(1, days))

  const { count, error } = await createAdminClient()
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "download")
    .gte("created_at", since.toISOString())

  if (error) {
    console.error("[analytics/events] recent download count failed:", error.message)
    return { count: 0, available: false }
  }
  return { count: count ?? 0, available: true }
}

export function isValidAnalyticsEventKey(
  value: string | null,
  eventType: "view" | "download",
  pdfId: string,
): boolean {
  if (!value) return true
  const prefix = `${eventType}:${pdfId}:`
  const suffix = value.slice(prefix.length)
  return value.length <= 100
    && value.startsWith(prefix)
    && suffix.length > 0
    && /^[A-Za-z0-9_-]+$/.test(suffix)
}