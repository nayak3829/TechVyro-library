"use client"

import { useEffect, useRef, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { validateCommunityHierarchy } from "@/lib/community-submission-form"
import { uploadFileToSignedStorage } from "@/lib/signed-storage-upload"
import {
  COLLEGE_COURSES, DIPLOMA_BRANCHES, EXAM_GROUPS, PDF_CONTENT_TYPE_OPTIONS,
  SCHOOL_BOARDS, SCHOOL_CLASSES, SEMESTERS, clearPdfContentDependents,
  formValueToMetadata, type PdfContentFormValue,
} from "@/lib/pdf-content-metadata"

const MAX_BYTES = 50 * 1024 * 1024
const emptyHierarchy: PdfContentFormValue = { contentType: "", contentCategory: "", detail: "", semester: "", subject: "" }

function SelectField({ label, value, onChange, options, required = true }: {
  label: string; value: string; onChange: (value: string) => void; options: readonly { value: string; label: string }[]; required?: boolean
}) {
  return <label className="block text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}
    <select required={required} value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
      <option value="">Select {label.toLowerCase()}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
}

export default function SubmitPage() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [hierarchy, setHierarchy] = useState<PdfContentFormValue>(emptyHierarchy)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [note, setNote] = useState("")
  const [rights, setRights] = useState(false)
  const [error, setError] = useState("")
  const [progress, setProgress] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    if (!user) return
    setEmail(current => current || user.email || "")
    setName(current => current || String(user.user_metadata?.full_name || ""))
  }, [user])

  const chooseFile = (candidate: File | undefined) => {
    setError("")
    if (!candidate || busy) return
    if (candidate.size > MAX_BYTES) return setError("PDF files must be 50 MB or smaller.")
    if (candidate.type !== "application/pdf" && !candidate.name.toLowerCase().endsWith(".pdf")) return setError("Please choose a PDF file.")
    setFile(candidate)
  }
  const changeHierarchy = (changed: "contentType" | "contentCategory" | "detail" | "semester", value: string) =>
    setHierarchy(current => clearPdfContentDependents(current, changed, value))

  const categoryLabel = hierarchy.contentType === "exams" ? "Exam group" : hierarchy.contentType === "school" ? "Class" : hierarchy.contentType === "college" ? "Course" : "Branch"
  const categoryOptions = (hierarchy.contentType === "exams" ? EXAM_GROUPS : hierarchy.contentType === "school" ? SCHOOL_CLASSES : hierarchy.contentType === "college" ? COLLEGE_COURSES : DIPLOMA_BRANCHES).map(value => ({ value, label: value }))
  const detailLabel = hierarchy.contentType === "exams" ? "Specific exam" : hierarchy.contentType === "school" ? "Board" : "Branch / stream"
  const detailOptions = (hierarchy.contentType === "school" ? SCHOOL_BOARDS : []).map(value => ({ value, label: value }))
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true; setBusy(true); setError(""); setSuccess(false)
    const fail = (message: string) => { setError(message); submitting.current = false; setBusy(false) }
    if (!file) return fail("Please choose one PDF file.")
    if (file.size > MAX_BYTES) return fail("PDF files must be 50 MB or smaller.")
    if (!rights) return fail("Please confirm that you have the rights to share this document.")
    if (!title.trim() || !name.trim() || !email.trim()) return fail("Please complete all required fields.")
    const hierarchyError = validateCommunityHierarchy(hierarchy)
    if (hierarchyError) return fail(hierarchyError)
    try {
      const reserve = await fetch("/api/submissions/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), filename: file.name, fileSize: file.size, mime: file.type || "application/pdf" }) })
      const reserved = await reserve.json()
      if (!reserve.ok) throw new Error(reserve.status === 429 ? "You have reached the maximum of 5 submissions per day. Please try again tomorrow." : reserved.error || "Could not start your upload.")
      setProgress(0)
      await uploadFileToSignedStorage({ signedUrl: reserved.signedUrl, file, onProgress: (loaded, total) => setProgress(Math.round(loaded / total * 100)) })
      const metadata = formValueToMetadata(hierarchy)
      const final = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        reservationId: reserved.reservationId, filePath: reserved.filePath, fileSize: file.size, title: title.trim(), description: description.trim() || null,
        submitterName: name.trim(), submitterEmail: email.trim(), submitterNote: note.trim() || null, copyrightConfirmed: true, ...metadata,
      }) })
      const body = await final.json()
      if (!final.ok) throw new Error(body.error || "Could not save your submission.")
      setSuccess(true); setFile(null); setTitle(""); setHierarchy(emptyHierarchy); setDescription(""); setNote(""); setRights(false); setProgress(null)
    } catch (caught) { setProgress(null); setError(caught instanceof Error ? caught.message : "Upload failed. Please try again.") } finally { submitting.current = false; setBusy(false) }
  }

  return <><Header /><main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-8 sm:py-12">
    <div className="mx-auto max-w-3xl px-4">
      <div className="mb-6"><p className="text-sm font-semibold text-primary">Community contributions</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Share study material</h1><p className="mt-2 text-muted-foreground">Upload a PDF for review. Nothing is published until an admin approves it. Maximum 5 submissions per day.</p></div>
      {success ? <div role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6"><h2 className="font-bold">Thanks! Your submission is under review. We&apos;ll notify you once it&apos;s approved.</h2><Button className="mt-4" variant="outline" onClick={() => setSuccess(false)}>Submit another PDF</Button></div> :
      <form onSubmit={submit} className="space-y-6 rounded-2xl border border-border/60 bg-card p-5 shadow-lg sm:p-7">
        <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
        <div><label htmlFor="pdf" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]) }} className="block rounded-xl border-2 border-dashed border-border p-7 text-center cursor-pointer hover:border-primary/60"><strong>{file ? file.name : "Choose a PDF or drop it here"}</strong><span className="mt-1 block text-xs text-muted-foreground">PDF only · one file · up to 50 MB</span></label><input id="pdf" className="sr-only" type="file" accept="application/pdf,.pdf" onChange={e => chooseFile(e.target.files?.[0])} /></div>
        <label className="block text-sm font-medium">Title <span className="text-destructive">*</span><Input required value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5" maxLength={200} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Content type" value={hierarchy.contentType} onChange={value => changeHierarchy("contentType", value)} options={PDF_CONTENT_TYPE_OPTIONS} />
          {hierarchy.contentType && <SelectField label={categoryLabel} value={hierarchy.contentCategory} onChange={value => changeHierarchy("contentCategory", value)} options={categoryOptions} />}
          {hierarchy.contentCategory && hierarchy.contentType === "exams" && <label className="block text-sm font-medium">Specific exam <span className="text-destructive">*</span><Input required value={hierarchy.detail} onChange={e => changeHierarchy("detail", e.target.value)} maxLength={160} className="mt-1.5" /></label>}
          {hierarchy.contentCategory && hierarchy.contentType === "school" && <SelectField label={detailLabel} value={hierarchy.detail} onChange={value => changeHierarchy("detail", value)} options={detailOptions} />}
          {hierarchy.contentCategory && hierarchy.contentType === "college" && <label className="block text-sm font-medium">Branch / stream <span className="text-destructive">*</span><Input required value={hierarchy.detail} onChange={e => changeHierarchy("detail", e.target.value)} maxLength={160} className="mt-1.5" /></label>}
          {hierarchy.contentType === "diploma" && hierarchy.contentCategory && <SelectField label="Semester" value={hierarchy.semester} onChange={value => changeHierarchy("semester", value)} options={SEMESTERS.map(value => ({ value, label: value }))} />}
          {hierarchy.contentType === "college" && hierarchy.detail && <SelectField label="Semester" value={hierarchy.semester} onChange={value => changeHierarchy("semester", value)} options={SEMESTERS.map(value => ({ value, label: value }))} />}
          {hierarchy.contentType === "school" && hierarchy.detail && <label className="block text-sm font-medium">Subject <span className="font-normal text-muted-foreground">(optional)</span><Input value={hierarchy.subject} onChange={e => setHierarchy(x => ({ ...x, subject: e.target.value }))} maxLength={120} className="mt-1.5" /></label>}
          {["college", "diploma"].includes(hierarchy.contentType) && hierarchy.semester && <label className="block text-sm font-medium">Subject <span className="font-normal text-muted-foreground">(optional)</span><Input value={hierarchy.subject} onChange={e => setHierarchy(x => ({ ...x, subject: e.target.value }))} maxLength={120} className="mt-1.5" /></label>}
        </div>
        <label className="block text-sm font-medium">Description <span className="font-normal text-muted-foreground">({description.length}/300)</span><textarea value={description} maxLength={300} onChange={e => setDescription(e.target.value)} className="mt-1.5 min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm" /></label>
        <label className="block text-sm font-medium">Submitter note <span className="font-normal text-muted-foreground">(optional)</span><textarea value={note} maxLength={1000} onChange={e => setNote(e.target.value)} className="mt-1.5 min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Name <span className="text-destructive">*</span><Input required value={name} maxLength={120} onChange={e => setName(e.target.value)} className="mt-1.5" /></label><label className="text-sm font-medium">Email <span className="text-destructive">*</span><Input required type="email" value={email} maxLength={254} onChange={e => setEmail(e.target.value)} className="mt-1.5" /></label></div>
        <label className="flex gap-3 text-sm leading-5"><input required checked={rights} onChange={e => setRights(e.target.checked)} type="checkbox" className="mt-1 h-4 w-4" />I own the rights to this document or have permission to share it</label>
        </fieldset>
        <p aria-live="polite" className="sr-only">{busy ? progress !== null ? `Uploading ${progress}%` : "Preparing your submission" : ""}</p>
        {progress !== null && <p role="status" className="text-sm text-primary">Uploading… {progress}%</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy} className="min-h-11 w-full">{busy ? progress !== null ? "Uploading…" : "Submitting…" : "Submit for review"}</Button>
      </form>}
    </div></main><Footer /></>
}