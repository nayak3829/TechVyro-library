"use client"

import { useEffect, useRef, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { inferCommunityHierarchy, validateCommunityHierarchy } from "@/lib/community-submission-form"
import { uploadFileToSignedStorage } from "@/lib/signed-storage-upload"
import {
  COLLEGE_COURSES, DIPLOMA_BRANCHES, EXAM_GROUPS, PDF_CONTENT_TYPE_OPTIONS,
  SCHOOL_BOARDS, SCHOOL_CLASSES, SEMESTERS, clearPdfContentDependents,
  formValueToMetadata, normalizePdfContentMetadata, type PdfContentFormValue,
} from "@/lib/pdf-content-metadata"

const MAX_BYTES = 50 * 1024 * 1024
const emptyHierarchy: PdfContentFormValue = { contentType: "", contentCategory: "", detail: "", semester: "", subject: "" }
const cleanFilename = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || "Untitled document"
const controls = /[\u0000-\u001f\u007f]/
type PendingFinalization = { payload: Record<string, unknown> }
type FinalizationOutcome =
  | { kind: "success" }
  | { kind: "upload_not_found"; message: string }
  | { kind: "retryable"; message: string }
  | { kind: "terminal"; message: string }
type PendingUpload = {
  signedUrl: string
  reservationId: string
  filePath: string
  payload: Record<string, unknown>
}

function normalizeText(value: string, label: string, maximum: number, optional = false) {
  if (controls.test(value)) throw new Error(`${label} contains invalid control characters.`)
  const normalized = value.trim().replace(/\s+/g, " ")
  if (!normalized && optional) return null
  if (!normalized || normalized.length > maximum) throw new Error(`${label} must be between 1 and ${maximum} characters.`)
  return normalized
}

function SelectField({ id, label, value, onChange, options, required = true }: {
  id: string; label: string; value: string; onChange: (value: string) => void; options: readonly { value: string; label: string }[]; required?: boolean
}) {
  const helpId = `${id}-help`
  return <div><label htmlFor={id} className="block text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}</label>
    <select id={id} aria-describedby={helpId} required={required} value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <option value="">Select {label.toLowerCase()}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <span id={helpId} className="sr-only">{required ? `${label} is required.` : `${label} is optional.`}</span>
  </div>
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
  const [pendingFinalization, setPendingFinalization] = useState<PendingFinalization | null>(null)
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null)
  const submitting = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const errorAlert = useRef<HTMLParagraphElement>(null)
  const successStatus = useRef<HTMLHeadingElement>(null)
  const analysisController = useRef<AbortController | null>(null)
  const fileSelection = useRef(0)
  const automaticTitle = useRef("")
  const automaticDescription = useRef("")
  const [analysisMessage, setAnalysisMessage] = useState("")

  useEffect(() => {
    if (!user) return
    setEmail(current => current || user.email || "")
    setName(current => current || String(user.user_metadata?.full_name || ""))
  }, [user])

  useEffect(() => () => analysisController.current?.abort(), [])
  useEffect(() => { if (error) errorAlert.current?.focus() }, [error])
  useEffect(() => { if (success) successStatus.current?.focus() }, [success])

  const chooseFile = async (candidate: File | undefined) => {
    setError("")
    const selection = ++fileSelection.current
    analysisController.current?.abort()
    if (!candidate || busy || pendingFinalization || pendingUpload) return
    if (candidate.size < 1 || candidate.size > MAX_BYTES) {
      setFile(null)
      return setError("PDF size must be between 1 byte and 50 MB.")
    }
    if (!candidate.name.toLowerCase().endsWith(".pdf") || candidate.name.includes("/") || candidate.name.includes("\\")) {
      setFile(null)
      return setError("Please choose a valid PDF filename.")
    }
    let selectedFile = candidate
    if (candidate.type === "") {
      const header = new Uint8Array(await candidate.slice(0, 5).arrayBuffer())
      if (selection !== fileSelection.current || busy || pendingFinalization) return
      if (header.length !== 5 || header[0] !== 0x25 || header[1] !== 0x50 || header[2] !== 0x44 || header[3] !== 0x46 || header[4] !== 0x2d) {
        setFile(null)
        return setError("This file does not have a valid PDF signature.")
      }
      selectedFile = new File([candidate], candidate.name, { type: "application/pdf", lastModified: candidate.lastModified })
    } else if (candidate.type !== "application/pdf") {
      setFile(null)
      return setError("Please choose a PDF with the application/pdf file type.")
    }
    if (selection !== fileSelection.current || busy || pendingFinalization) return
    setFile(selectedFile)
    const controller = new AbortController()
    analysisController.current = controller
    const fallbackTitle = cleanFilename(selectedFile.name)
    automaticTitle.current = fallbackTitle
    automaticDescription.current = ""
    setTitle(fallbackTitle)
    setDescription("")
    setHierarchy(emptyHierarchy)
    setAnalysisMessage("Reading PDF and suggesting details…")
    void import("@/lib/pdf-smart-analysis").then(({ analyzePdfFile }) => analyzePdfFile(selectedFile, {
      createThumbnail: false,
      maxBytes: MAX_BYTES,
      maxPages: 75,
      maxTextCharacters: 120_000,
      maxOcrPages: 1,
      ocrTimeoutMs: 10_000,
      signal: controller.signal,
      onProgress: ({ message }) => setAnalysisMessage(message),
    })).then(result => {
      if (controller.signal.aborted) return
      const previousAutomaticTitle = automaticTitle.current
      const suggestedTitle = (result.title || fallbackTitle).slice(0, 200)
      setTitle(current => {
        if (current !== previousAutomaticTitle) return current
        automaticTitle.current = suggestedTitle
        return suggestedTitle
      })
      const suggestedDescription = (result.seoDescription || result.summary || "").slice(0, 300)
      const previousAutomaticDescription = automaticDescription.current
      setDescription(current => {
        if (current !== previousAutomaticDescription) return current
        automaticDescription.current = suggestedDescription
        return suggestedDescription
      })
      const suggestedHierarchy = inferCommunityHierarchy(result)
      if (suggestedHierarchy) setHierarchy(current =>
        Object.values(current).some(Boolean) ? current : suggestedHierarchy
      )
      setAnalysisMessage(`${result.pageCount} page${result.pageCount === 1 ? "" : "s"} analyzed · Please review the suggested details.`)
    }).catch(error => {
      if (error instanceof Error && error.name === "AbortError") return
      setAnalysisMessage("Title added from the filename. Please complete and review the remaining details.")
    })
  }
  const changeHierarchy = (changed: "contentType" | "contentCategory" | "detail" | "semester", value: string) =>
    setHierarchy(current => clearPdfContentDependents(current, changed, value))

  const categoryLabel = hierarchy.contentType === "exams" ? "Exam group" : hierarchy.contentType === "school" ? "Class" : hierarchy.contentType === "college" ? "Course" : "Branch"
  const categoryOptions = (hierarchy.contentType === "exams" ? EXAM_GROUPS : hierarchy.contentType === "school" ? SCHOOL_CLASSES : hierarchy.contentType === "college" ? COLLEGE_COURSES : DIPLOMA_BRANCHES).map(value => ({ value, label: value }))
  const detailLabel = hierarchy.contentType === "exams" ? "Specific exam" : hierarchy.contentType === "school" ? "Board" : "Branch / stream"
  const detailOptions = (hierarchy.contentType === "school" ? SCHOOL_BOARDS : []).map(value => ({ value, label: value }))
  const hierarchyAnnouncement = !hierarchy.contentType
    ? "Choose a content type to reveal the relevant hierarchy fields."
    : !hierarchy.contentCategory
      ? `${categoryLabel} field is now available.`
      : hierarchy.contentType === "diploma" || (hierarchy.contentType === "college" && hierarchy.detail)
        ? "Semester field is now available."
        : hierarchy.contentType === "college" || hierarchy.contentType === "exams" || hierarchy.contentType === "school"
          ? `${detailLabel} field is now available.`
          : "Continue completing the document hierarchy."

  function completeFinalization() {
    setPendingUpload(null); setPendingFinalization(null)
    setSuccess(true); setFile(null); setTitle(""); setHierarchy(emptyHierarchy); setDescription(""); setNote(""); setRights(false); setProgress(null)
  }

  async function saveFinalization(pending: PendingFinalization): Promise<FinalizationOutcome> {
    try {
      const final = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.payload) })
      let body: Record<string, unknown> = {}
      try { body = await final.json() } catch { /* A malformed 5xx response is still retryable. */ }
      if (!final.ok) {
        const message = typeof body.error === "string" ? body.error : "Could not save your submission."
        if (body.code === "upload_not_found") return { kind: "upload_not_found", message }
        if (final.status >= 500) return { kind: "retryable", message }
        return { kind: "terminal", message }
      }
      return { kind: "success" }
    } catch (caught) {
      return { kind: "retryable", message: caught instanceof Error ? caught.message : "Could not save your submission. Please retry." }
    }
  }

  async function retrySaving() {
    if (!pendingFinalization || submitting.current) return
    submitting.current = true; setBusy(true); setError("")
    try {
      const outcome = await saveFinalization(pendingFinalization)
      if (outcome.kind === "success") completeFinalization()
      else if (outcome.kind === "retryable") { setProgress(null); setError(outcome.message) }
      else {
        setPendingFinalization(null); setProgress(null); setError(outcome.message)
      }
    } finally {
      submitting.current = false; setBusy(false)
    }
  }

  async function retryUpload() {
    if (!pendingUpload || !file || submitting.current) return
    submitting.current = true; setBusy(true); setError(""); setProgress(0)
    try {
      let uploadFailure: string | null = null
      try {
        await uploadFileToSignedStorage({
          signedUrl: pendingUpload.signedUrl, file,
          onProgress: (loaded, total) => setProgress(Math.round(loaded / total * 100)),
        })
      } catch (caught) {
        uploadFailure = caught instanceof Error ? caught.message : "Upload failed."
      }
      const pending = { payload: pendingUpload.payload }
      const outcome = await saveFinalization(pending)
      if (outcome.kind === "success") completeFinalization()
      else if (outcome.kind === "retryable") {
        setPendingUpload(null); setPendingFinalization(pending); setProgress(null); setError(outcome.message)
      } else if (outcome.kind === "upload_not_found") {
        setProgress(null)
        setError(`${uploadFailure || outcome.message} You can retry this upload or start over.`)
      } else {
        setPendingUpload(null); setPendingFinalization(null); setProgress(null); setError(outcome.message)
      }
    } finally {
      submitting.current = false; setBusy(false)
    }
  }

  function startOver() {
    if (!pendingUpload || submitting.current) return
    setPendingUpload(null); setFile(null); setProgress(null); setError("")
    if (fileInput.current) fileInput.current.value = ""
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current || pendingFinalization || pendingUpload) return
    submitting.current = true; setBusy(true); setError(""); setSuccess(false)
    const fail = (message: string) => { setError(message); submitting.current = false; setBusy(false) }
    if (!file) return fail("Please choose one PDF file.")
    if (file.type !== "application/pdf") return fail("Please choose a PDF with the application/pdf file type.")
    if (file.size < 1 || file.size > MAX_BYTES) return fail("PDF size must be between 1 byte and 50 MB.")
    if (!file.name.toLowerCase().endsWith(".pdf") || file.name.includes("/") || file.name.includes("\\")) return fail("Please choose a valid PDF filename.")
    if (!rights) return fail("Please confirm that you have the rights to share this document.")
    let normalizedTitle: string
    let normalizedName: string
    let normalizedEmail: string
    let normalizedDescription: string | null
    let normalizedNote: string | null
    let normalizedHierarchy: PdfContentFormValue
    try {
      normalizedTitle = normalizeText(title, "Title", 200)!
      normalizedName = normalizeText(name, "Name", 120)!
      normalizedEmail = normalizeText(email, "Email", 254)!.toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error("Email is invalid.")
      normalizedDescription = normalizeText(description, "Description", 300, true)
      normalizedNote = normalizeText(note, "Submitter note", 1000, true)
      normalizedHierarchy = {
        ...hierarchy,
        contentCategory: normalizeText(hierarchy.contentCategory, "Content category", 80)!,
        detail: hierarchy.contentType === "diploma" ? "" : normalizeText(hierarchy.detail, "Content detail", 160)!,
        subject: normalizeText(hierarchy.subject, "Subject", 120, true) || "",
      }
      const hierarchyError = validateCommunityHierarchy(normalizedHierarchy)
      if (hierarchyError) throw new Error(hierarchyError)
      normalizePdfContentMetadata(formValueToMetadata(normalizedHierarchy), { allowSubjectEmpty: true })
    } catch (validationError) {
      return fail(validationError instanceof Error ? validationError.message : "Please review the submission details.")
    }
    try {
      const reserve = await fetch("/api/submissions/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: normalizedEmail, filename: file.name, fileSize: file.size, mime: file.type }) })
      const reserved = await reserve.json()
      if (!reserve.ok) throw new Error(reserve.status === 429 ? "You have reached the maximum of 5 submissions per day. Please try again tomorrow." : reserved.error || "Could not start your upload.")
      const metadata = formValueToMetadata(normalizedHierarchy)
      const upload = {
        signedUrl: reserved.signedUrl as string, reservationId: reserved.reservationId as string, filePath: reserved.filePath as string, payload: {
        reservationId: reserved.reservationId, filePath: reserved.filePath, fileSize: file.size, title: normalizedTitle, description: normalizedDescription,
        submitterName: normalizedName, submitterEmail: normalizedEmail, submitterNote: normalizedNote, copyrightConfirmed: true, ...metadata,
      } } satisfies PendingUpload
      setProgress(0)
      let uploadFailure: string | null = null
      try {
        await uploadFileToSignedStorage({ signedUrl: upload.signedUrl, file, onProgress: (loaded, total) => setProgress(Math.round(loaded / total * 100)) })
      } catch (uploadError) {
        uploadFailure = uploadError instanceof Error ? uploadError.message : "Upload failed."
      }
      const pending = { payload: upload.payload }
      const outcome = await saveFinalization(pending)
      if (outcome.kind === "success") completeFinalization()
      else if (outcome.kind === "retryable") {
        setPendingUpload(null); setPendingFinalization(pending); setProgress(null); setError(outcome.message)
      } else if (outcome.kind === "upload_not_found") {
        setPendingUpload(upload); setPendingFinalization(null); setProgress(null)
        setError(`${uploadFailure || outcome.message} You can retry this upload or start over.`)
      } else {
        setPendingUpload(null); setPendingFinalization(null); setProgress(null); setError(outcome.message)
      }
    } catch (caught) { setProgress(null); setError(caught instanceof Error ? caught.message : "Upload failed. Please try again.") } finally { submitting.current = false; setBusy(false) }
  }

  return <><Header /><main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-8 sm:py-12">
    <div className="mx-auto max-w-3xl px-4">
      <div className="mb-6"><p className="text-sm font-semibold text-primary">Community contributions</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Share study material</h1><p className="mt-2 text-muted-foreground">Upload a PDF for review. Nothing is published until an admin approves it. Maximum 5 submissions per day.</p></div>
      {success ? <div role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6"><h2 ref={successStatus} tabIndex={-1} className="font-bold outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">Thanks! Your submission is under review. We&apos;ll notify you once it&apos;s approved.</h2><Button className="mt-4" variant="outline" onClick={() => setSuccess(false)}>Submit another PDF</Button></div> :
      <form aria-describedby={error ? "submission-error" : undefined} onSubmit={submit} className="space-y-6 rounded-2xl border border-border/60 bg-card p-5 shadow-lg sm:p-7">
        <fieldset disabled={busy || Boolean(pendingFinalization) || Boolean(pendingUpload)} className="space-y-6 disabled:opacity-70">
        <div><label htmlFor="pdf" role="button" tabIndex={busy || pendingFinalization || pendingUpload ? -1 : 0} aria-describedby="pdf-guidance" onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInput.current?.click() } }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]) }} className="block cursor-pointer rounded-xl border-2 border-dashed border-border p-7 text-center outline-none transition-colors hover:border-primary/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><strong>{file ? file.name : "Choose a PDF or drop it here"}</strong></label><p id="pdf-guidance" className="mt-2 text-center text-xs text-muted-foreground">PDF only (application/pdf) · one non-empty file · up to 50 MB</p><input ref={fileInput} id="pdf" aria-describedby="pdf-guidance" className="sr-only" type="file" accept="application/pdf" onChange={e => chooseFile(e.target.files?.[0])} />{analysisMessage && <p role="status" className="mt-2 text-xs text-muted-foreground">{analysisMessage}</p>}</div>
        <div><label htmlFor="submission-title" className="block text-sm font-medium">Title <span className="text-destructive">*</span></label><Input id="submission-title" aria-describedby="title-help" required value={title} onChange={e => { automaticTitle.current = ""; setTitle(e.target.value) }} className="mt-1.5" maxLength={200} /><p id="title-help" className="mt-1 text-xs text-muted-foreground">Required · maximum 200 characters</p></div>
        <div role="group" aria-labelledby="hierarchy-heading" aria-describedby="hierarchy-status" className="grid gap-4 sm:grid-cols-2">
          <p id="hierarchy-heading" className="sr-only">Document hierarchy</p>
          <p id="hierarchy-status" aria-live="polite" className="sr-only">{hierarchyAnnouncement}</p>
          <SelectField id="content-type" label="Content type" value={hierarchy.contentType} onChange={value => changeHierarchy("contentType", value)} options={PDF_CONTENT_TYPE_OPTIONS} />
          {hierarchy.contentType && <SelectField id="content-category" label={categoryLabel} value={hierarchy.contentCategory} onChange={value => changeHierarchy("contentCategory", value)} options={categoryOptions} />}
          {hierarchy.contentCategory && hierarchy.contentType === "exams" && <div><label htmlFor="content-detail" className="block text-sm font-medium">Specific exam <span className="text-destructive">*</span></label><Input id="content-detail" aria-describedby="content-detail-help" required value={hierarchy.detail} onChange={e => changeHierarchy("detail", e.target.value)} maxLength={160} className="mt-1.5" /><span id="content-detail-help" className="sr-only">Specific exam is required and may be up to 160 characters.</span></div>}
          {hierarchy.contentCategory && hierarchy.contentType === "school" && <SelectField id="content-detail" label={detailLabel} value={hierarchy.detail} onChange={value => changeHierarchy("detail", value)} options={detailOptions} />}
          {hierarchy.contentCategory && hierarchy.contentType === "college" && <div><label htmlFor="content-detail" className="block text-sm font-medium">Branch / stream <span className="text-destructive">*</span></label><Input id="content-detail" aria-describedby="content-detail-help" required value={hierarchy.detail} onChange={e => changeHierarchy("detail", e.target.value)} maxLength={145} className="mt-1.5" /><span id="content-detail-help" className="sr-only">Branch or stream is required.</span></div>}
          {hierarchy.contentType === "diploma" && hierarchy.contentCategory && <SelectField id="content-semester" label="Semester" value={hierarchy.semester} onChange={value => changeHierarchy("semester", value)} options={SEMESTERS.map(value => ({ value, label: value }))} />}
          {hierarchy.contentType === "college" && hierarchy.detail && <SelectField id="content-semester" label="Semester" value={hierarchy.semester} onChange={value => changeHierarchy("semester", value)} options={SEMESTERS.map(value => ({ value, label: value }))} />}
          {hierarchy.contentType === "school" && hierarchy.detail && <div><label htmlFor="content-subject" className="block text-sm font-medium">Subject <span className="font-normal text-muted-foreground">(optional)</span></label><Input id="content-subject" aria-describedby="content-subject-help" value={hierarchy.subject} onChange={e => setHierarchy(x => ({ ...x, subject: e.target.value }))} maxLength={120} className="mt-1.5" /><span id="content-subject-help" className="sr-only">Subject is optional and may be up to 120 characters.</span></div>}
          {["college", "diploma"].includes(hierarchy.contentType) && hierarchy.semester && <div><label htmlFor="content-subject" className="block text-sm font-medium">Subject <span className="font-normal text-muted-foreground">(optional)</span></label><Input id="content-subject" aria-describedby="content-subject-help" value={hierarchy.subject} onChange={e => setHierarchy(x => ({ ...x, subject: e.target.value }))} maxLength={120} className="mt-1.5" /><span id="content-subject-help" className="sr-only">Subject is optional and may be up to 120 characters.</span></div>}
        </div>
        <div><label htmlFor="submission-description" className="block text-sm font-medium">Description</label><textarea id="submission-description" aria-describedby="description-help" value={description} maxLength={300} onChange={e => { automaticDescription.current = ""; setDescription(e.target.value) }} className="mt-1.5 min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" /><p id="description-help" className="mt-1 text-xs text-muted-foreground">{description.length}/300 characters · optional</p></div>
        <div><label htmlFor="submitter-note" className="block text-sm font-medium">Submitter note <span className="font-normal text-muted-foreground">(optional)</span></label><textarea id="submitter-note" aria-describedby="note-help" value={note} maxLength={1000} onChange={e => setNote(e.target.value)} className="mt-1.5 min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" /><span id="note-help" className="sr-only">Optional note, maximum 1000 characters.</span></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="submitter-name" className="text-sm font-medium">Name <span className="text-destructive">*</span></label><Input id="submitter-name" aria-describedby="name-help" required value={name} maxLength={120} onChange={e => setName(e.target.value)} className="mt-1.5" /><span id="name-help" className="sr-only">Name is required, maximum 120 characters.</span></div><div><label htmlFor="submitter-email" className="text-sm font-medium">Email <span className="text-destructive">*</span></label><Input id="submitter-email" aria-describedby="email-help" required type="email" value={email} maxLength={254} onChange={e => setEmail(e.target.value)} className="mt-1.5" /><span id="email-help" className="sr-only">Enter a valid email address.</span></div></div>
        <div className="flex gap-3 text-sm leading-5"><input id="sharing-rights" aria-describedby="rights-help" required checked={rights} onChange={e => setRights(e.target.checked)} type="checkbox" className="mt-1 h-4 w-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" /><label htmlFor="sharing-rights">I own the rights to this document or have permission to share it</label><span id="rights-help" className="sr-only">You must confirm sharing rights before submitting.</span></div>
        </fieldset>
        <p aria-live="polite" className="sr-only">{busy ? progress !== null ? `Uploading ${progress}%` : "Preparing your submission" : ""}</p>
        {progress !== null && <p role="status" className="text-sm text-primary">Uploading… {progress}%</p>}{error && <p id="submission-error" ref={errorAlert} role="alert" tabIndex={-1} className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2">{error}</p>}
        {pendingFinalization && <Button type="button" onClick={retrySaving} aria-describedby={error ? "submission-error" : undefined} disabled={busy} className="min-h-11 w-full">Retry saving submission</Button>}
         {pendingUpload && <div><p className="mb-3 text-sm text-muted-foreground">Starting over abandons this reservation. It still counts toward today&apos;s limit and expires automatically.</p><div className="grid gap-3 sm:grid-cols-2"><Button type="button" onClick={retryUpload} disabled={busy} className="min-h-11">Retry upload</Button><Button type="button" variant="outline" onClick={startOver} disabled={busy} className="min-h-11">Start over</Button></div></div>}
         <Button type="submit" aria-describedby={error ? "submission-error" : undefined} disabled={busy || Boolean(pendingFinalization) || Boolean(pendingUpload)} className="min-h-11 w-full">{busy ? progress !== null ? "Uploading…" : "Submitting…" : "Submit for review"}</Button>
      </form>}
    </div></main><Footer /></>
}