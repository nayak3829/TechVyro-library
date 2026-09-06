"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useDialogFocus } from "@/hooks/use-dialog-focus"

type Status = "pending" | "approved" | "rejected"
type Submission = { id: string; title: string; content_type: string; content_category: string; content_subcategory: string; subject: string | null; submitter_name: string; file_size: number; page_count: number | null; status: Status; submitted_at: string; reviewed_at: string | null; approved_pdf_id: string | null }
type Detail = Submission & { description: string | null; submitter_email: string; submitter_note: string | null; rejection_reason: string | null; user_id: string | null; malware_status: "clean" | "suspicious"; review_warnings: string[] }

const PAGE_SIZE = 20
const label = (item: Submission) => [item.content_type, item.content_category, item.content_subcategory, item.subject].filter(Boolean).join(" · ")
const date = (value: string | null) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

export default function AdminSubmissionsPage() {
  const [status, setStatus] = useState<Status>("pending")
  const [items, setItems] = useState<Submission[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [detail, setDetail] = useState<Detail | null>(null)
  const [duplicate, setDuplicate] = useState<{ matches: Array<{ id: string; title: string }> } | null>(null)
  const [duplicateContentWarning, setDuplicateContentWarning] = useState<{ matches: Array<{ id: string; title: string }> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [reasonFor, setReasonFor] = useState<string[] | null>(null)
  const [reason, setReason] = useState("")
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const detailDialogRef = useRef<HTMLDivElement>(null)
  const detailCloseRef = useRef<HTMLButtonElement>(null)
  const rejectDialogRef = useRef<HTMLDivElement>(null)
  const rejectInputRef = useRef<HTMLTextAreaElement>(null)
  const listRequestRef = useRef(0)
  const listAbortRef = useRef<AbortController | null>(null)
  const detailRequestRef = useRef(0)
  const detailAbortRef = useRef<AbortController | null>(null)

  const closeDetail = useCallback(() => {
    detailRequestRef.current += 1
    detailAbortRef.current?.abort()
    setDetail(null); setDuplicate(null); setDuplicateContentWarning(null)
  }, [])
  const closeReject = useCallback(() => { if (!busy) { setReasonFor(null); setReason("") } }, [busy])
  useDialogFocus({ active: Boolean(detail) && !reasonFor, containerRef: detailDialogRef, initialFocusRef: detailCloseRef, onEscape: closeDetail })
  useDialogFocus({ active: Boolean(reasonFor), containerRef: rejectDialogRef, initialFocusRef: rejectInputRef, onEscape: closeReject })

  useEffect(() => () => {
    listAbortRef.current?.abort()
    detailAbortRef.current?.abort()
  }, [])

  const load = useCallback(async (nextOffset = 0) => {
    const request = ++listRequestRef.current
    listAbortRef.current?.abort()
    const controller = new AbortController()
    listAbortRef.current = controller
    setLoading(true); setError(""); setSelected([])
    try {
      const response = await fetch(`/api/admin/submissions?status=${status}&limit=${PAGE_SIZE}&offset=${nextOffset}`, { signal: controller.signal })
      if (controller.signal.aborted || request !== listRequestRef.current) return
      if (response.status === 401) { window.location.assign("/admin"); return }
      const json = await response.json()
      if (controller.signal.aborted || request !== listRequestRef.current) return
      if (!response.ok) throw new Error(json.error || "Could not load submissions.")
      const results = json.submissions || []
      setItems(results); setOffset(nextOffset)
      // Older API responses do not include hasMore; a complete page means Next remains available.
      setHasMore(typeof json.hasMore === "boolean" ? json.hasMore : results.length === PAGE_SIZE)
    } catch (caught) {
      if (!controller.signal.aborted && request === listRequestRef.current) setError(caught instanceof Error ? caught.message : "Could not load submissions.")
    } finally {
      if (request === listRequestRef.current) setLoading(false)
    }
  }, [status])
  useEffect(() => { load(0) }, [load])

  async function open(item: Submission) {
    const request = ++detailRequestRef.current
    detailAbortRef.current?.abort()
    const controller = new AbortController()
    detailAbortRef.current = controller
    try {
      const response = await fetch(`/api/admin/submissions/${item.id}`, { signal: controller.signal })
      if (controller.signal.aborted || request !== detailRequestRef.current) return
      if (response.status === 401) return window.location.assign("/admin")
      const json = await response.json()
      if (controller.signal.aborted || request !== detailRequestRef.current) return
      if (!response.ok) throw new Error(json.error)
      setDetail(json.submission); setDuplicate(json.duplicateWarning); setDuplicateContentWarning(json.duplicateContentWarning)
    } catch {
      if (!controller.signal.aborted && request === detailRequestRef.current) setError("Could not load submission details.")
    }
  }
  async function moderate(ids: string[], action: "approve" | "reject", rejectionReason = "") {
    if (action === "reject" && !rejectionReason.trim()) return
    setBusy(true); setError("")
    try {
      const endpoint = ids.length === 1 ? `/api/admin/submissions/${ids[0]}` : "/api/admin/submissions/bulk"
      const response = await fetch(endpoint, { method: ids.length === 1 ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ids.length === 1 ? { action, reason: rejectionReason } : { ids, action, reason: rejectionReason }) })
      const json = await response.json()
      if (response.status === 401) return window.location.assign("/admin")
      if (!response.ok) throw new Error(json.error || "Moderation failed.")
      const failed = Array.isArray(json.failed) ? json.failed.length : Number(json.failed || json.failedCount || 0)
      if (failed > 0) setError(`${ids.length - failed} submission${ids.length - failed === 1 ? "" : "s"} updated; ${failed} could not be moderated. Refresh to review the remaining items.`)
      closeDetail(); setReasonFor(null); setReason(""); await load(offset)
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Moderation failed.") } finally { setBusy(false) }
  }
  const changeStatus = (nextStatus: Status) => {
    if (nextStatus !== status) {
      listRequestRef.current += 1
      listAbortRef.current?.abort()
      setOffset(0); setSelected([]); setStatus(nextStatus)
    }
  }
  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id])
  const pending = status === "pending"

  const rows = items.map(item => <tr key={item.id} className="border-t border-border hover:bg-muted/30">{pending && <td className="p-3"><input aria-label={`Select ${item.title}`} className="h-6 w-6" type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /></td>}<td className="p-3"><button className="max-w-[180px] text-left font-semibold hover:text-primary hover:underline sm:max-w-xs" onClick={() => open(item)}>{item.title}</button><p className="mt-1 text-xs text-muted-foreground">{label(item)}</p></td><td className="hidden sm:table-cell p-3">{item.submitter_name}</td><td className="hidden md:table-cell p-3">{(item.file_size / 1024 / 1024).toFixed(1)} MB · {item.page_count ?? "—"} pages</td><td className="hidden md:table-cell p-3">{date(item.submitted_at)}</td><td className="p-3 capitalize">{item.status}</td></tr>)

  return <main className="min-h-screen bg-background p-4 sm:p-8"><div className="mx-auto max-w-6xl">
    <div className="mb-6 flex items-center justify-between gap-3"><div><Link href="/admin" className="text-sm text-primary hover:underline">← Admin</Link><h1 className="mt-1 text-2xl font-bold">Community submissions</h1><p className="text-sm text-muted-foreground">Review contributions before they are published.</p></div><Button variant="outline" onClick={() => load(offset)} disabled={loading || busy}>Refresh</Button></div>
    <div aria-label="Submission status" className="mb-4 flex gap-2">{(["pending", "approved", "rejected"] as Status[]).map(filter => <Button key={filter} aria-pressed={status === filter} variant={status === filter ? "default" : "outline"} className="capitalize" onClick={() => changeStatus(filter)}>{filter}</Button>)}</div>
    {pending && <div className="mb-4 flex flex-wrap gap-2"><Button variant="outline" disabled={!items.length || busy} onClick={() => setSelected(selected.length === items.length ? [] : items.map(x => x.id))}>{selected.length === items.length ? "Clear selection" : "Select all visible"}</Button><Button disabled={!selected.length || busy} onClick={() => moderate(selected, "approve")}>Approve selected</Button><Button variant="destructive" disabled={!selected.length || busy} onClick={() => { setReasonFor(selected); setReason("") }}>Reject selected</Button></div>}
    <p className="sr-only" role="status" aria-live="polite">{loading ? `Loading ${status} submissions` : `${items.length} ${status} submissions loaded`}</p>
    {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
    {loading ? <p role="status" className="py-10 text-center text-muted-foreground">Loading submissions…</p> : items.length === 0 ? <p className="rounded-xl border border-border p-10 text-center text-muted-foreground">No {status} submissions.</p> : <><div className="space-y-3 sm:hidden">{items.map(item => <article key={item.id} className="rounded-xl border border-border p-4"><div className="flex gap-3">{pending && <input aria-label={`Select ${item.title}`} className="mt-1 h-6 w-6 shrink-0" type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />}<div className="min-w-0 flex-1"><button className="text-left font-semibold hover:text-primary hover:underline" onClick={() => open(item)}>{item.title}</button><p className="mt-1 text-xs text-muted-foreground">{label(item)}</p><p className="mt-2 text-xs text-muted-foreground">{item.submitter_name} · {date(item.submitted_at)}</p><p className="mt-1 text-xs capitalize">{item.status} · {(item.file_size / 1024 / 1024).toFixed(1)} MB</p></div></div></article>)}</div><div className="hidden overflow-hidden rounded-xl border border-border sm:block"><table className="w-full text-left text-sm"><thead className="bg-muted/50 text-muted-foreground"><tr>{pending && <th className="p-3"><span className="sr-only">Select</span></th>}<th className="p-3">Submission</th><th className="hidden sm:table-cell p-3">Contributor</th><th className="hidden md:table-cell p-3">File</th><th className="hidden md:table-cell p-3">Date</th><th className="p-3">Status</th></tr></thead><tbody>{rows}</tbody></table></div></>}
    <div className="mt-4 flex items-center justify-between gap-3"><Button variant="outline" onClick={() => load(Math.max(0, offset - PAGE_SIZE))} disabled={loading || offset === 0}>Previous</Button><span className="text-sm text-muted-foreground">Page {Math.floor(offset / PAGE_SIZE) + 1}</span><Button variant="outline" onClick={() => load(offset + PAGE_SIZE)} disabled={loading || !hasMore}>Next</Button></div>
    {reasonFor && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) closeReject() }}><div ref={rejectDialogRef} role="dialog" aria-modal="true" aria-labelledby="reject-title" aria-describedby="reject-description" tabIndex={-1} className="w-full max-w-md rounded-xl bg-card p-5 shadow-xl"><h2 id="reject-title" className="font-bold">Rejection reason</h2><p id="reject-description" className="mt-1 text-sm text-muted-foreground">A reason is required so the contributor understands the decision.</p><textarea ref={rejectInputRef} aria-label="Rejection reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} className="mt-4 min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm" /><div className="mt-4 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={closeReject} disabled={busy}>Cancel</Button><Button variant="destructive" disabled={!reason.trim() || busy} onClick={() => moderate(reasonFor, "reject", reason)}>Reject</Button></div></div></div>}
    {detail && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) closeDetail() }}><div ref={detailDialogRef} role="dialog" aria-modal="true" aria-labelledby="detail-title" aria-describedby="detail-description" tabIndex={-1} className="mx-auto my-4 max-w-4xl rounded-xl bg-card p-5 shadow-xl"><div className="flex justify-between gap-3"><div><h2 id="detail-title" className="text-xl font-bold">{detail.title}</h2><p id="detail-description" className="text-sm text-muted-foreground">Submission details and private PDF preview.</p><p className="text-sm text-muted-foreground">{label(detail)}</p></div><Button ref={detailCloseRef} variant="ghost" aria-label="Close details" onClick={closeDetail}>×</Button></div>{(detail.malware_status === "suspicious" || detail.review_warnings?.length > 0) && <div role="alert" className="mt-4 rounded-lg border-2 border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"><p className="font-bold">{detail.malware_status === "suspicious" ? "Suspicious file detected" : "Review warnings"}</p>{detail.malware_status === "suspicious" && <p className="mt-1">This submission cannot be approved. Reject it and do not trust or download the file.</p>}{detail.review_warnings?.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{detail.review_warnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul>}</div>}{duplicateContentWarning && <div role="alert" className="mt-4 rounded-lg border-2 border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"><p className="font-bold">Exact duplicate content detected</p><p className="mt-1">This PDF has the exact same content as an existing published PDF and cannot be approved. Reject this submission.</p><p className="mt-2">Existing PDF: {duplicateContentWarning.matches.map(match => <Link className="ml-1 text-primary underline" key={match.id} href={`/pdf/${match.id}`}>{match.title}</Link>)}</p></div>}{duplicate && <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">Similar title already exists: {duplicate.matches.map(match => <Link className="ml-1 text-primary underline" key={match.id} href={`/pdf/${match.id}`}>{match.title}</Link>)}</div>}<iframe title={`Preview ${detail.title}`} className="mt-4 h-[45vh] w-full rounded border" src={`/api/admin/submissions/${detail.id}/file`} /><a className="mt-2 inline-block text-sm text-primary underline" href={`/api/admin/submissions/${detail.id}/file`} target="_blank" rel="noreferrer">View PDF</a><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Contributor</dt><dd>{detail.submitter_name}</dd></div><div><dt className="text-muted-foreground">Email</dt><dd>{detail.submitter_email}</dd></div><div><dt className="text-muted-foreground">Account</dt><dd>{detail.user_id ? "Linked account" : "No linked account"}</dd></div><div><dt className="text-muted-foreground">File</dt><dd>{(detail.file_size / 1024 / 1024).toFixed(2)} MB · {detail.page_count ?? "—"} pages</dd></div><div><dt className="text-muted-foreground">Submitted / reviewed</dt><dd>{date(detail.submitted_at)} / {date(detail.reviewed_at)}</dd></div><div><dt className="text-muted-foreground">Copyright confirmed</dt><dd>Yes</dd></div><div><dt className="text-muted-foreground">Description</dt><dd>{detail.description || "—"}</dd></div><div><dt className="text-muted-foreground">Note</dt><dd>{detail.submitter_note || "—"}</dd></div>{detail.rejection_reason && <div><dt className="text-muted-foreground">Rejection reason</dt><dd>{detail.rejection_reason}</dd></div>}</dl>{detail.status === "pending" && <div className="mt-5 flex flex-wrap gap-2">{detail.malware_status !== "suspicious" ? <Button disabled={busy || Boolean(duplicateContentWarning)} onClick={() => moderate([detail.id], "approve")}>Approve</Button> : <p className="w-full text-sm font-semibold text-destructive">Approval is disabled for suspicious submissions. Reject this submission.</p>}{duplicateContentWarning && <p className="w-full text-sm font-semibold text-destructive">Approval is disabled because this PDF exactly duplicates an existing published PDF. Reject this submission.</p>}<Button variant="destructive" disabled={busy} onClick={() => { setReasonFor([detail.id]); setReason("") }}>Reject</Button></div>}</div></div>}
  </div></main>
}