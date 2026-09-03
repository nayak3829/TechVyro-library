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
  visibility: "public" | "unlisted" | "private"
  created_at: string
  questions: Array<Record<string, unknown> & { id?: string }>
  tags: string[]
  hasContent: boolean
  structure_location: { folderId: string; categoryId: string; sectionId: string } | null
  negative_marking: number
  passing_percentage: number
  shuffle_questions: boolean
  shuffle_options: boolean
}

let _cache: { data: QuizListItem[]; at: number } | null = null
let _pending: Promise<QuizListItem[]> | null = null
const CACHE_TTL = 60_000

export async function getQuizList(options: { bypassCache?: boolean } = {}): Promise<QuizListItem[]> {
  const bypassCache = options.bypassCache === true
  if (!bypassCache && _pending) return _pending
  if (!bypassCache && _cache && Date.now() - _cache.at < CACHE_TTL) return _cache.data

  _pending = (async () => {
    async function queryQuizzes() {
      const supabase = createAdminClient()
      return supabase
        .from("quizzes")
        .select("id, title, description, category, section, difficulty, time_limit, questions, enabled, visibility, created_at, tags, structure_location, negative_marking, passing_percentage, shuffle_questions, shuffle_options")
        .order("created_at", { ascending: false })
    }

    let { data, error } = await queryQuizzes()
    if (error?.message?.includes("JWT issued at future")) {
      await new Promise(resolve => setTimeout(resolve, 750))
      const retry = await queryQuizzes()
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.error("[quiz-cache] DB error:", error)
      if (_cache) return _cache.data
      throw new Error("Failed to load quizzes")
    }

    const quizzes = (data || []).map(q => {
      const questionList = Array.isArray(q.questions) ? q.questions : []
      const hasContent = questionList.some(
        (qs: { question?: string }) => qs.question && qs.question.trim() !== ""
      )
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        category: q.category || "General",
        section: q.section || "General",
        difficulty: q.difficulty || "medium",
        time_limit: q.time_limit,
        enabled: q.enabled,
        visibility: q.visibility === "private" || q.visibility === "unlisted" ? q.visibility : "public",
        created_at: q.created_at,
        questions: questionList
          .filter((question): question is Record<string, unknown> => !!question && typeof question === "object" && !Array.isArray(question))
          .map(question => ({ ...question })),
        tags: Array.isArray(q.tags) ? q.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [],
        hasContent,
        structure_location: q.structure_location ?? null,
        negative_marking: Number(q.negative_marking) || 0,
        passing_percentage: Number(q.passing_percentage) || 0,
        shuffle_questions: q.shuffle_questions === true,
        shuffle_options: q.shuffle_options === true,
      }
    })

    if (!bypassCache) _cache = { data: quizzes, at: Date.now() }
    return quizzes
  })().finally(() => { if (!bypassCache) _pending = null })

  if (bypassCache) return _pending
  return _pending
}

export function invalidateQuizCache() {
  _cache = null
}
