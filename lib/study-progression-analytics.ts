export type QuizResultForAnalytics = {
  id: string
  quiz_id: string | null
  quiz_title: string | null
  percentage: number | string | null
  correct: number | null
  wrong: number | null
  skipped: number | null
  created_at: string
  quiz?: { id?: string; title?: string; category?: string | null } | null
}

const number = (value: number | string | null | undefined) => Number(value || 0)

export function calculateQuizAnalytics(results: QuizResultForAnalytics[]) {
  const attempts = results.length
  const totals = results.reduce((acc, result) => ({
    correct: acc.correct + number(result.correct),
    wrong: acc.wrong + number(result.wrong),
    skipped: acc.skipped + number(result.skipped),
    percentage: acc.percentage + number(result.percentage),
  }), { correct: 0, wrong: 0, skipped: 0, percentage: 0 })
  const summarize = (rows: QuizResultForAnalytics[], key: string, label: string) => {
    const answers = rows.reduce((sum, row) => sum + number(row.correct) + number(row.wrong) + number(row.skipped), 0)
    const correct = rows.reduce((sum, row) => sum + number(row.correct), 0)
    return { key, label, attempts: rows.length, averageScore: rows.length ? Math.round(rows.reduce((sum, row) => sum + number(row.percentage), 0) / rows.length) : 0, accuracy: answers ? Math.round((correct / answers) * 100) : 0 }
  }
  const groups = (value: (row: QuizResultForAnalytics) => [string, string]) => Object.values(results.reduce<Record<string, QuizResultForAnalytics[]>>((acc, row) => {
    const [key] = value(row)
    ;(acc[key] ||= []).push(row)
    return acc
  }, {})).map(rows => summarize(rows, ...value(rows[0])))
  const byQuiz = groups(row => [row.quiz_id || "unknown", row.quiz?.title || row.quiz_title || "Unknown quiz"])
  const byCategory = groups(row => [row.quiz?.category || "Uncategorized", row.quiz?.category || "Uncategorized"])
  return {
    allTime: { attempts, averageScore: attempts ? Math.round(totals.percentage / attempts) : 0, bestScore: attempts ? Math.max(...results.map(row => number(row.percentage))) : 0, correct: totals.correct, wrong: totals.wrong, skipped: totals.skipped, accuracy: totals.correct + totals.wrong + totals.skipped ? Math.round((totals.correct / (totals.correct + totals.wrong + totals.skipped)) * 100) : 0 },
    recentScoreTrend: [...results].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-10).map(row => ({ date: row.created_at, percentage: number(row.percentage), quizId: row.quiz_id, quizTitle: row.quiz?.title || row.quiz_title || "Unknown quiz" })),
    byQuiz: byQuiz.sort((a, b) => b.attempts - a.attempts),
    byCategory: byCategory.sort((a, b) => b.attempts - a.attempts),
    weakestAreas: [...byCategory].sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts).slice(0, 5),
  }
}