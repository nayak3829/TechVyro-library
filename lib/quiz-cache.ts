import { createAdminClient } from "@/lib/supabase/admin"

export interface QuizListItem {
  id: string
  title: string
  description: string
  category: string
  section: string
  difficulty: string
  time_limit: number
  enabled: boolean
  created_at: string
  questions: { id: string }[]
  structure_location: { folderId: string; categoryId: string; sectionId: string } | null
}

let _cache: { data: QuizListItem[]; at: number } | null = null
let _pending: Promise<QuizListItem[]> | null = null
const CACHE_TTL = 60_000

export async function getQuizList(): Promise<QuizListItem[]> {
  if (_pending) return _pending
  if (_cache && Date.now() - _cache.at < CACHE_TTL) return _cache.data

  _pending = (async () => {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("quizzes")
      .select("id, title, description, category, section, difficulty, time_limit, questions, enabled, created_at, structure_location")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[quiz-cache] DB error:", error)
      return _cache?.data ?? []
    }

    const quizzes = (data || []).map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      category: q.category || "General",
      section: q.section || "General",
      difficulty: q.difficulty || "medium",
      time_limit: q.time_limit,
      enabled: q.enabled,
      created_at: q.created_at,
      questions: Array.isArray(q.questions)
        ? q.questions.map((qs: { id?: string }) => ({ id: qs.id ?? "" }))
        : [],
      structure_location: q.structure_location ?? null,
    }))

    _cache = { data: quizzes, at: Date.now() }
    return quizzes
  })().finally(() => { _pending = null })

  return _pending
}

export function invalidateQuizCache() {
  _cache = null
}
