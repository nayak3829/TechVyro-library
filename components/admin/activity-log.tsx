"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Activity, FileText, Folder, MessageSquare, RefreshCw, Search, Settings, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AuditEvent = {
  id: number
  action: "created" | "updated" | "deleted"
  resource_type: string
  resource_id: string
  actor_type: "user" | "server" | "system"
  summary: string
  metadata: { changed_fields?: string[] } | null
  created_at: string
}

const resourceLabels: Record<string, string> = {
  pdfs: "PDF",
  categories: "Category",
  reviews: "Review",
  quizzes: "Quiz",
  folders: "Folder",
  site_settings: "Settings",
  content_folders: "Content folder",
  content_sections: "Content section",
  apx_platforms: "Test platform",
  apx_test_series: "Test series",
  apx_tests: "Test",
  apx_questions: "Question",
}

function iconFor(resource: string, action: AuditEvent["action"]) {
  if (action === "deleted") return Trash2
  if (resource === "pdfs") return FileText
  if (resource === "reviews") return MessageSquare
  if (resource.includes("folder") || resource === "categories") return Folder
  if (resource === "site_settings") return Settings
  return Activity
}

export function ActivityLog() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [action, setAction] = useState("all")
  const [resource, setResource] = useState("all")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const requestId = useRef(0)
  const activeRequest = useRef<AbortController | null>(null)

  const load = useCallback(async (cursor?: number) => {
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    const currentRequest = ++requestId.current
    if (cursor) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setHasMore(false)
      setNextCursor(null)
    }
    const params = new URLSearchParams({ limit: "50" })
    if (cursor) params.set("cursor", String(cursor))
    if (action !== "all") params.set("action", action)
    if (resource !== "all") params.set("resource", resource)
    if (search) params.set("search", search)
    try {
      const response = await fetch(`/api/admin/activity?${params}`, { cache: "no-store", signal: controller.signal })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to load activity")
      if (currentRequest !== requestId.current) return
      setEvents(previous => cursor ? [...previous, ...data.events] : data.events)
      setNextCursor(data.nextCursor)
      setHasMore(data.hasMore)
      setGeneratedAt(data.generatedAt)
      setError(null)
    } catch (caught) {
      if (currentRequest === requestId.current && !controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : "Failed to load activity")
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [action, resource, search])

  useEffect(() => {
    load()
  }, [load])

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    setSearch(searchInput.trim())
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Activity Log</h2>
          <p className="text-sm text-muted-foreground">Successful content and settings changes recorded for 365 days.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading || loadingMore}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            {generatedAt ? `Updated ${new Date(generatedAt).toLocaleString()}` : "Loading the latest successful changes…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_180px_200px]">
          <form className="flex gap-2" onSubmit={submitSearch}>
            <Input value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Search resource title or name" maxLength={100} aria-label="Search activity" />
            <Button type="submit" size="icon" aria-label="Search"><Search className="h-4 w-4" /></Button>
          </form>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger aria-label="Filter by action"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={resource} onValueChange={setResource}>
            <SelectTrigger aria-label="Filter by resource"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All resources</SelectItem>
              {Object.entries(resourceLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <span>{error}. Existing results were kept.</span>
          <Button variant="outline" size="sm" onClick={() => load()}>Retry</Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading && events.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading recorded activity…</div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">No recorded activity</p>
              <p className="mt-1 text-sm text-muted-foreground">New successful changes will appear here. Existing resources were not converted into fake history.</p>
            </div>
          ) : (
            <ul className="divide-y" aria-label="Recorded activity">
              {events.map(event => {
                const Icon = iconFor(event.resource_type, event.action)
                const changed = Array.isArray(event.metadata?.changed_fields) ? event.metadata.changed_fields : []
                return (
                  <li key={event.id} className="flex gap-4 p-4">
                    <div className="mt-0.5 rounded-lg bg-muted p-2"><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={event.action === "deleted" ? "destructive" : "secondary"}>{event.action}</Badge>
                        <span className="text-xs text-muted-foreground">{resourceLabels[event.resource_type] ?? event.resource_type}</span>
                        <span className="text-xs text-muted-foreground">by {event.actor_type === "user" ? "User" : event.actor_type === "server" ? "Server process" : "System"}</span>
                      </div>
                      <p className="mt-1 truncate font-medium" title={event.summary}>{event.summary}</p>
                      {changed.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Changed: {changed.join(", ")}</p>}
                    </div>
                    <time className="shrink-0 text-right text-xs text-muted-foreground" dateTime={event.created_at} title={new Date(event.created_at).toLocaleString()}>
                      {new Date(event.created_at).toLocaleDateString()}<br />{new Date(event.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </li>
                )
              })}
            </ul>
          )}
          {hasMore && (
            <div className="border-t p-4 text-center">
              <Button variant="outline" onClick={() => nextCursor && load(nextCursor)} disabled={loading || loadingMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}