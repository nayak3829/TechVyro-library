import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
export { calculateQuizAnalytics, type QuizResultForAnalytics } from "@/lib/study-progression-analytics"

export async function awardQuizProgress(userId: string, resultId: string) {
  const { data, error } = await createAdminClient().rpc("award_quiz_progress", { p_user_id: userId, p_result_id: resultId })
  if (error) throw new Error(`Failed to award quiz progression: ${error.message}`)
  return data
}