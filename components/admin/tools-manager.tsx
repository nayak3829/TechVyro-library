"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Wand2, RefreshCw, Download, Globe, Lock, EyeOff, FileText,
  CheckCircle2, AlertTriangle, Zap, BarChart3, Tag, AlignLeft,
  Loader2, FolderOpen, TrendingDown, Sparkles, FileDown, Shield,
  ChevronRight, Info, Play, RotateCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { escapeCsvCell } from "@/lib/csv-export"

function adminHeaders() {
  return { "Content-Type": "application/json" }
}

interface HealthStats {
  total: number
  noDescription: number
  noCategory: number
  noTags: number
  noDownloads: number
  private: number
  unlisted: number
  noDescIds: { id: string; title: string }[]
  noCategoryIds: { id: string; title: string }[]
  noTagsIds: { id: string; title: string }[]
}

interface BatchResult {
  updated: number
  skipped: number
  total: number
  message: string
}

async function fetchAllPdfs(): Promise<Record<string, unknown>[]> {
  const pageSize = 100
  const maximumRecords = 10_000
  const all: Record<string, unknown>[] = []
  for (let offset = 0; offset < maximumRecords; offset += pageSize) {
    const res = await fetch(`/api/pdfs?limit=${pageSize}&offset=${offset}`, { headers: adminHeaders() })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error) throw new Error(data.error || "Failed to load PDFs")
    if (!Array.isArray(data.pdfs)) throw new Error("The server returned an invalid PDF list")
    all.push(...data.pdfs)
    if (data.pdfs.length < pageSize) return all
  }
  throw new Error("Export safety limit reached; narrow the catalog before retrying")
}

function HealthBar({ label, value, total, color, icon: Icon }: {
  label: string; value: number; total: number; color: string; icon: React.ElementType
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const isGood = value === 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${isGood ? "text-green-500" : color}`} />
          <span className="font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isGood
            ? <Badge variant="outline" className="text-[10px] h-5 border-green-500/40 text-green-600">All good</Badge>
            : <span className="text-xs text-muted-foreground font-mono">{value} / {total}</span>
          }
        </div>
      </div>
      <Progress value={isGood ? 100 : 100 - pct} className="h-1.5" />
    </div>
  )
}

export function ToolsManager() {
  const [health, setHealth] = useState<HealthStats | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [batchMode, setBatchMode] = useState<"both" | "description" | "tags">("both")
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null)
  const [batchProgress, setBatchProgress] = useState(0)
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv")
  const [exporting, setExporting] = useState(false)
  const [visibilityTarget, setVisibilityTarget] = useState<"all" | "private" | "unlisted">("private")
  const [visibilityAction, setVisibilityAction] = useState<"public" | "private" | "unlisted">("public")
  const [visibilityRunning, setVisibilityRunning] = useState(false)

  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true)
    try {
      const res = await fetch("/api/pdfs/batch-ai", { headers: adminHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) throw new Error(data.error || "Failed to load content health")
      setHealth(data)
    } catch {
      toast.error("Failed to load content health")
    } finally {
      setLoadingHealth(false)
    }
  }, [])

  useEffect(() => { fetchHealth() }, [fetchHealth])

  async function runBatchAI(requestedMode = batchMode) {
    if (!health || health.total === 0) return
    const targetCount = requestedMode === "description"
      ? health.noDescription
      : requestedMode === "tags"
        ? health.noTags
        : Math.max(health.noDescription, health.noTags)
    if (!confirm(`Run AI ${requestedMode} enhancement for up to ${Math.min(targetCount, 30)} PDFs? This uses the configured AI service and updates saved metadata.`)) return
    setBatchMode(requestedMode)
    setBatchRunning(true)
    setBatchResult(null)
    setBatchProgress(10)

    const progressTimer = setInterval(() => {
      setBatchProgress(prev => Math.min(prev + 8, 88))
    }, 1500)

    try {
      const res = await fetch("/api/pdfs/batch-ai", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ mode: requestedMode }),
      })
      const data = await res.json().catch(() => ({}))
      clearInterval(progressTimer)
      setBatchProgress(100)

      if (!res.ok || data.error) throw new Error(data.error || "Batch AI failed")
      setBatchResult(data)
      toast.success(data.message)
      setTimeout(() => { fetchHealth(); setBatchProgress(0) }, 1000)
    } catch (err) {
      clearInterval(progressTimer)
      setBatchProgress(0)
      toast.error(err instanceof Error ? err.message : "Batch AI failed")
    } finally {
      setBatchRunning(false)
    }
  }

  async function exportData() {
    setExporting(true)
    try {
      const pdfs = await fetchAllPdfs()

      if (exportFormat === "json") {
        const blob = new Blob([JSON.stringify(pdfs, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `techvyro-pdfs-${new Date().toISOString().split("T")[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const headers = ["ID", "Title", "Description", "Category ID", "Tags", "File Size", "Downloads", "Views", "Rating", "Visibility", "Created At"]
        const rows = pdfs.map((p: Record<string, unknown>) => [
          p.id, p.title, p.description, p.category_id,
          Array.isArray(p.tags) ? (p.tags as string[]).join(", ") : "",
          p.file_size || 0, p.download_count || 0, p.view_count || 0,
          p.average_rating || "", p.visibility || "public", p.created_at || "",
        ].map(escapeCsvCell))
        const csv = [headers.join(","), ...rows.map((r: unknown[]) => r.join(","))].join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `techvyro-pdfs-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
      toast.success(`Exported ${pdfs.length} PDFs as ${exportFormat.toUpperCase()}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed")
    } finally {
      setExporting(false)
    }
  }

  async function runBulkVisibility() {
    if (!confirm(`Set all "${visibilityTarget}" PDFs to "${visibilityAction}"?`)) return
    setVisibilityRunning(true)
    try {
      const all = await fetchAllPdfs() as Record<string, string>[]
      const targets = visibilityTarget === "all"
        ? all.map(p => p.id)
        : all.filter(p => (p.visibility || "public") === visibilityTarget).map(p => p.id)

      if (targets.length === 0) {
        toast.info("No PDFs match this filter")
        return
      }

      let updated = 0
      for (let index = 0; index < targets.length; index += 100) {
        const patchRes = await fetch("/api/pdfs/batch-ai", {
          method: "PATCH",
          headers: adminHeaders(),
          body: JSON.stringify({ ids: targets.slice(index, index + 100), visibility: visibilityAction }),
        })
        const patchData = await patchRes.json().catch(() => ({}))
        if (!patchRes.ok || patchData.error) throw new Error(patchData.error || "Failed to update visibility")
        const batchUpdated = typeof patchData.updated === "number" ? patchData.updated : null
        if (batchUpdated === null) throw new Error("The server did not confirm how many PDFs were updated")
        updated += batchUpdated
      }
      toast.success(`Updated ${updated} of ${targets.length} PDFs to "${visibilityAction}"`)
      fetchHealth()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update visibility")
    } finally {
      setVisibilityRunning(false)
    }
  }

  const healthScore = health
    ? Math.round(
        ((health.total - health.noDescription) / Math.max(health.total, 1)) * 30 +
        ((health.total - health.noCategory) / Math.max(health.total, 1)) * 40 +
        ((health.total - health.noTags) / Math.max(health.total, 1)) * 30
      )
    : 0

  const scoreColor = healthScore >= 80 ? "text-green-600" : healthScore >= 50 ? "text-amber-600" : "text-red-600"
  const scoreBg = healthScore >= 80 ? "bg-green-500/10 border-green-500/20" : healthScore >= 50 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20"

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          Power Tools
        </h2>
        <p className="text-muted-foreground text-sm mt-1">AI batch tools, content health, export, and bulk operations</p>
      </div>

      {/* Content Health */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`rounded-xl border p-5 flex flex-col items-center justify-center text-center ${scoreBg}`}>
          <div className={`text-5xl font-black ${scoreColor}`}>{loadingHealth ? "—" : healthScore}</div>
          <div className="text-sm font-semibold mt-1">Content Health Score</div>
          <div className="text-xs text-muted-foreground mt-0.5">out of 100</div>
          {!loadingHealth && health && (
            <Badge
              variant="outline"
              className={`mt-3 text-[10px] ${healthScore >= 80 ? "border-green-500/40 text-green-600" : healthScore >= 50 ? "border-amber-500/40 text-amber-600" : "border-red-500/40 text-red-600"}`}
            >
              {healthScore >= 80 ? "Excellent" : healthScore >= 50 ? "Needs Attention" : "Poor — Fix Required"}
            </Badge>
          )}
        </div>

        <div className="sm:col-span-2">
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  Content Health Breakdown
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={fetchHealth} disabled={loadingHealth}>
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingHealth ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingHealth ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : health ? (
                <>
                  <HealthBar label="Has Description" value={health.noDescription} total={health.total} color="text-orange-500" icon={AlignLeft} />
                  <HealthBar label="Has Category" value={health.noCategory} total={health.total} color="text-red-500" icon={FolderOpen} />
                  <HealthBar label="Has Tags" value={health.noTags} total={health.total} color="text-violet-500" icon={Tag} />
                  <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Globe className="h-3 w-3 text-green-500" /> {health.total - health.private - health.unlisted} public</span>
                    <span className="flex items-center gap-1"><EyeOff className="h-3 w-3 text-amber-500" /> {health.unlisted} unlisted</span>
                    <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-red-500" /> {health.private} private</span>
                    {health.noDownloads > 0 && <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-gray-400" /> {health.noDownloads} not downloaded yet</span>}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Failed to load health data</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Batch Tools */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-violet-500" />
            AI Batch Enhancement
            <Badge variant="secondary" className="text-[10px] px-1.5 bg-violet-500/10 text-violet-600">GPT-4o mini</Badge>
          </CardTitle>
          <CardDescription>
            Automatically generate missing descriptions and tags for all PDFs using AI. Processes up to 30 PDFs per run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {health && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "No Description", count: health.noDescription, color: "text-orange-600", bg: "bg-orange-500/10" },
                { label: "No Tags", count: health.noTags, color: "text-violet-600", bg: "bg-violet-500/10" },
                { label: "Need Both", count: Math.max(health.noDescription, health.noTags), color: "text-red-600", bg: "bg-red-500/10" },
              ].map(({ label, count, color, bg }) => (
                <div key={label} className={`rounded-lg p-3 ${bg} text-center`}>
                  <div className={`text-2xl font-black ${color}`}>{count}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">What to generate</label>
              <Select value={batchMode} onValueChange={(v) => setBatchMode(v as typeof batchMode)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Descriptions + Tags (recommended)</SelectItem>
                  <SelectItem value="description">Descriptions only</SelectItem>
                  <SelectItem value="tags">Tags only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => runBatchAI()}
                disabled={batchRunning || !health || health.total === 0}
                className="h-9 gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {batchRunning
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Running...</>
                  : <><Play className="h-4 w-4" /> Run AI Enhancement</>
                }
              </Button>
            </div>
          </div>

          {batchRunning && batchProgress > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Processing PDFs with AI...</span>
                <span>{batchProgress}%</span>
              </div>
              <Progress value={batchProgress} className="h-1.5" />
            </div>
          )}

          {batchResult && !batchRunning && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-700 dark:text-green-400">{batchResult.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {batchResult.updated} updated · {batchResult.skipped} skipped · {batchResult.total} total processed
                </p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 text-xs" onClick={() => { setBatchResult(null); fetchHealth() }}>
                <RotateCcw className="h-3 w-3" /> Run again
              </Button>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <p>AI generates content based on the PDF title. Existing descriptions/tags are preserved unless you select all PDFs specifically. Costs ~1 OpenAI API call per PDF.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Export Data */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileDown className="h-4 w-4 text-blue-500" />
              Export PDF Catalog
            </CardTitle>
            <CardDescription>Download your complete PDF library data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Export format</label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "json")}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Excel-compatible)</SelectItem>
                  <SelectItem value="json">JSON (full data)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Exports: title, description, category, tags, file size, downloads, views, rating, visibility, and upload date.
            </p>
            <Button
              onClick={exportData}
              disabled={exporting}
              variant="outline"
              className="w-full h-9 gap-2"
            >
              {exporting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Exporting...</>
                : <><Download className="h-4 w-4" /> Export {health?.total || ""} PDFs</>
              }
            </Button>
          </CardContent>
        </Card>

        {/* Bulk Visibility */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-amber-500" />
              Bulk Visibility Control
            </CardTitle>
            <CardDescription>Change visibility for multiple PDFs at once</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Target PDFs</label>
                <Select value={visibilityTarget} onValueChange={(v) => setVisibilityTarget(v as typeof visibilityTarget)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All PDFs</SelectItem>
                    <SelectItem value="private">Private PDFs</SelectItem>
                    <SelectItem value="unlisted">Unlisted PDFs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Set to</label>
                <Select value={visibilityAction} onValueChange={(v) => setVisibilityAction(v as typeof visibilityAction)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {health && (
              <div className="text-xs text-muted-foreground">
                {visibilityTarget === "all"
                  ? `Will affect all ${health.total} PDFs`
                  : visibilityTarget === "private"
                    ? `Will affect ${health.private} private PDFs`
                    : `Will affect ${health.unlisted} unlisted PDFs`
                }
              </div>
            )}
            <Button
              onClick={runBulkVisibility}
              disabled={visibilityRunning}
              variant="outline"
              className="w-full h-9 gap-2"
            >
              {visibilityRunning
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</>
                : <><Globe className="h-4 w-4" /> Apply Bulk Visibility</>
              }
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Fix Guide */}
      {health && (health.noDescription > 0 || health.noCategory > 0 || health.noTags > 0) && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {health.noDescription > 0 && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/50">
                <AlignLeft className="h-4 w-4 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{health.noDescription} PDFs have no description</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {health.noDescIds.map(p => p.title).join(", ")}{health.noDescription > 5 ? "..." : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => runBatchAI("description")}>
                  Fix with AI
                </Button>
              </div>
            )}
            {health.noTags > 0 && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/50">
                <Tag className="h-4 w-4 text-violet-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{health.noTags} PDFs have no tags</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {health.noTagsIds.map(p => p.title).join(", ")}{health.noTags > 5 ? "..." : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => runBatchAI("tags")}>
                  Fix with AI
                </Button>
              </div>
            )}
            {health.noCategory > 0 && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/50">
                <FolderOpen className="h-4 w-4 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{health.noCategory} PDFs have no category</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {health.noCategoryIds.map(p => p.title).join(", ")}{health.noCategory > 5 ? "..." : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => window.open("/admin#pdfs", "_self")}>
                  Fix in PDF Manager <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {health && health.noDescription === 0 && health.noCategory === 0 && health.noTags === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-700 dark:text-green-400">Content is fully optimized!</p>
            <p className="text-xs text-muted-foreground mt-0.5">All {health.total} PDFs have descriptions, categories, and tags.</p>
          </div>
        </div>
      )}
    </div>
  )
}
