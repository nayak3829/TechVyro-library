"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, Loader2, BookOpen, Play, Clock, FileText,
  ChevronDown, ChevronUp, AlertCircle, GraduationCap
} from "lucide-react"

interface Subject {
  id?: string | number
  name?: string
  title?: string
  tests?: Test[]
}

interface Test {
  id?: string | number
  title?: string
  name?: string
  duration?: number
  time?: number
  total_marks?: number
  total_questions?: number
  is_free?: boolean
  slug?: string
}

// Clean title to remove any platform references
function cleanTitle(title: string): string {
  const patterns = [
    /\s*by\s+\w+\s*(academy|classes|institute|coaching)?/gi,
    /\s*-\s*\w+\s*(academy|classes|institute)?$/gi,
    /^\w+\s*(academy|classes|institute)?\s*-\s*/gi,
    /\(\w+\s*(app|academy|classes)?\)/gi,
  ]
  let cleaned = title
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, "")
  }
  return cleaned.trim() || title
}

function SeriesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams.get("slug") || ""
  const apiBase = searchParams.get("apiBase") || ""
  const webBase = searchParams.get("webBase") || ""
  const rawTitle = searchParams.get("title") || "Mock Test"
  const seriesTitle = cleanTitle(rawTitle)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!slug || !apiBase) {
      router.push("/test-series")
      return
    }
    fetchData()
  }, [slug, apiBase, webBase])

  const fetchData = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({ slug, apiBase, webBase })
      const res = await fetch(`/api/extract/tests?${params}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || "Could not load test series details")
        return
      }

      const subs = data.subjects || []
      setSubjects(subs)
      setTests(data.tests || [])
      // Auto-expand first subject so tests are immediately visible
      if (subs.length > 0) {
        const firstId = String(subs[0].id || 0)
        setExpanded({ [firstId]: true })
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const startTest = (test: Test) => {
    const testId = String(test.id || test.slug || "")
    const params = new URLSearchParams({
      testId,
      apiBase,
      title: test.title || test.name || "Test",
      duration: String(test.duration || test.time || 60),
    })
    router.push(`/test-series/play?${params}`)
  }

  const toggleSubject = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const allTests = [
    ...tests,
    ...subjects.flatMap(s => s.tests || []),
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
        {/* Back + Title */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">{seriesTitle}</h1>
            <p className="text-muted-foreground mt-1">Select a test to start playing</p>
          </div>

        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Subjects with nested tests */}
            {subjects.length > 0 && (
              <div className="space-y-3 mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-violet-600" /> Subjects
                </h2>
                {subjects.map((subj, idx) => {
                  const subjId = String(subj.id || idx)
                  const subjTests = subj.tests || []
                  const rawName = subj.name || subj.title || `Subject ${idx + 1}`
                  const name = cleanTitle(rawName)

                  return (
                    <Card key={subjId} className="overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        onClick={() => toggleSubject(subjId)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-violet-600" />
                          </div>
                          <span className="font-medium">{name}</span>
                          {subjTests.length > 0 && (
                            <Badge variant="secondary" className="text-xs">{subjTests.length} tests</Badge>
                          )}
                        </div>
                        {expanded[subjId] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {expanded[subjId] && subjTests.length > 0 && (
                        <div className="border-t divide-y">
                          {(subjTests as Test[]).map((test, tidx) => (
                            <TestRow key={String(test.id || tidx)} test={test} onStart={() => startTest(test)} loading={false} />
                          ))}
                        </div>
                      )}

                      {expanded[subjId] && subjTests.length === 0 && (
                        <div className="border-t p-4 text-sm text-muted-foreground text-center">
                          No tests available in this subject
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Flat tests */}
            {tests.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-violet-600" /> All Tests
                </h2>
                <Card className="divide-y overflow-hidden">
                  {tests.map((test, idx) => (
                    <TestRow key={String(test.id || idx)} test={test} onStart={() => startTest(test)} loading={false} />
                  ))}
                </Card>
              </div>
            )}

            {allTests.length === 0 && (
              <div className="text-center py-16">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium">No tests found</p>
                <p className="text-muted-foreground text-sm">This test series is currently unavailable. Try another series.</p>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

function TestRow({ test, onStart, loading }: { test: Test; onStart: () => void; loading: boolean }) {
  const rawTitle = test.title || test.name || "Untitled Test"
  const title = cleanTitle(rawTitle)
  const duration = test.duration || test.time
  const isFree = test.is_free

  return (
    <div className="flex items-center justify-between p-4 gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{title}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {duration && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {duration} min
            </span>
          )}
          {test.total_questions && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" /> {test.total_questions} Qs
            </span>
          )}
          {isFree && <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">Free</Badge>}
        </div>
      </div>
      <Button
        size="sm"
        onClick={onStart}
        disabled={loading}
        className="bg-violet-600 hover:bg-violet-700 gap-1.5 flex-shrink-0"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Start
      </Button>
    </div>
  )
}

export default function SeriesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    }>
      <SeriesContent />
    </Suspense>
  )
}
