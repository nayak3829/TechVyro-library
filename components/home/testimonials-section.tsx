"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, GraduationCap, Quote, Star } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { Testimonial } from "@/lib/types"

type LoadState = "loading" | "ready" | "empty" | "error"

function isTestimonial(value: unknown): value is Testimonial {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return typeof item.id === "string" && typeof item.name === "string" && item.name.trim().length > 0
    && typeof item.course === "string" && typeof item.comment === "string" && item.comment.trim().length > 0
    && typeof item.enabled === "boolean" && typeof item.rating === "number" && Number.isFinite(item.rating)
}

function TestimonialCard({ testimonial, clone = false }: { testimonial: Testimonial; clone?: boolean }) {
  const initials = testimonial.name.trim().split(/\s+/).map(name => name[0]).join("").slice(0, 2).toUpperCase()
  const rating = Math.min(5, Math.max(0, Math.round(testimonial.rating)))
  return (
    <article data-testimonial-card aria-hidden={clone || undefined} className="relative mx-2.5 w-[290px] shrink-0 overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-primary/25 motion-reduce:transition-none sm:w-[330px]">
      <Quote aria-hidden="true" className="absolute right-4 top-4 h-8 w-8 text-primary/10" />
      <div className="mb-3 flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, index) => <Star aria-hidden="true" key={index} className={`h-3.5 w-3.5 ${index < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />)}
      </div>
      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-foreground/85">&ldquo;{testimonial.comment.trim()}&rdquo;</p>
      <div className="mb-4 h-px bg-border/40" />
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-primary/15">
          <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{initials || "S"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-foreground">{testimonial.name.trim()}</p>
            {testimonial.verified && <CheckCircle2 aria-label="Verified review" className="h-3.5 w-3.5 shrink-0 text-primary" />}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <GraduationCap aria-hidden="true" className="h-3 w-3 shrink-0 text-muted-foreground" />
            <p className="truncate text-xs text-muted-foreground">{testimonial.course.trim()}</p>
          </div>
        </div>
      </div>
    </article>
  )
}

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [status, setStatus] = useState<LoadState>("loading")
  const [paused, setPaused] = useState(false)
  const requestRef = useRef<AbortController | null>(null)
  const load = useCallback(async () => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setStatus("loading")
    try {
      const response = await fetch("/api/site-settings?key=testimonials", { signal: controller.signal })
      if (!response.ok) throw new Error("Testimonials request failed")
      const payload: unknown = await response.json()
      const value = payload && typeof payload === "object" ? (payload as { value?: unknown }).value : undefined
      const valid = Array.isArray(value) ? value.filter(isTestimonial).filter(item => item.enabled) : []
      setTestimonials(valid)
      setStatus(valid.length ? "ready" : "empty")
    } catch (error) {
      if ((error as Error).name !== "AbortError") setStatus("error")
    }
  }, [])
  useEffect(() => {
    void load()
    return () => {
      requestRef.current?.abort()
      requestRef.current = null
    }
  }, [load])
  if (status === "loading") return <section aria-label="Loading student reviews" role="status" aria-busy="true" className="min-h-52 bg-muted/20" />
  if (status === "empty") return null
  if (status === "error") return <section className="bg-muted/20 py-12"><div className="container mx-auto px-4 text-center"><p className="text-sm text-muted-foreground">Student reviews are unavailable right now.</p><Button type="button" variant="link" onClick={() => void load()} className="mt-1 text-primary">Try again</Button></div></section>
  const row = [...testimonials, ...testimonials]
  return <section className="relative overflow-hidden bg-muted/20 py-16 sm:py-20 lg:py-24"><div className="container relative mx-auto px-4"><div className="mb-10 text-center sm:mb-14"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-700"><Star aria-hidden="true" className="h-3 w-3 fill-current" />Student reviews</div><h2 className="study-display text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">Words from students</h2><button type="button" aria-pressed={paused} aria-label={paused ? "Resume student reviews" : "Pause student reviews"} onClick={() => setPaused(value => !value)} className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground">{paused ? "Resume" : "Pause"}</button></div></div><div aria-hidden="true" className="flex hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none" style={{ animation: paused ? "none" : "marqueeLeft 35s linear infinite" }}>{row.map((item, index) => <TestimonialCard key={`${item.id}-${index}`} testimonial={item} clone={index >= testimonials.length} />)}</div><div className="sr-only">{testimonials.map(item => <p key={item.id}>{item.name}: {item.comment}</p>)}</div></section>
}