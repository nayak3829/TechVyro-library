"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, BookOpen, FileText, ListChecks, Search, Timer, Layers } from "lucide-react"
import type { HeroSettings } from "@/lib/homepage-settings"

const HEADLINES = [
  "Welcome to TechVyro Library",
  "Your exam desk, already organized.",
  "Free PDFs, quizzes, and mock tests — all in one place.",
  "Prepare smarter. Score higher.",
] as const

interface HeroSectionProps {
  settings: HeroSettings
  totalPdfs: number
  totalQuizzes: number
  totalQuestions: number
  recentPdfs: { id: string; title: string; updated_at: string }[]
}

function relativeDate(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
  if (days <= 0) return "Added today"
  if (days === 1) return "Added yesterday"
  return `Added ${days} days ago`
}

export function HeroSection({ settings, totalPdfs, totalQuizzes, totalQuestions, recentPdfs }: HeroSectionProps) {
  const [headlineIndex, setHeadlineIndex] = useState(0)
  const [headlineVisible, setHeadlineVisible] = useState(true)

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (reducedMotion.matches) return

    let fadeTimer: ReturnType<typeof setTimeout> | undefined
    const rotationTimer = window.setInterval(() => {
      setHeadlineVisible(false)
      fadeTimer = setTimeout(() => {
        setHeadlineIndex(current => (current + 1) % HEADLINES.length)
        setHeadlineVisible(true)
      }, 400)
    }, 3200)

    return () => {
      window.clearInterval(rotationTimer)
      if (fadeTimer) clearTimeout(fadeTimer)
    }
  }, [])

  return (
    <section className="relative overflow-hidden border-b border-border/70 bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_80%_at_90%_0%,rgba(49,72,120,0.15),transparent_62%),radial-gradient(ellipse_45%_70%_at_4%_100%,rgba(183,129,48,0.12),transparent_65%)]" />
      <div className="absolute inset-0 opacity-[0.55] bg-[linear-gradient(rgba(43,61,103,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(43,61,103,0.04)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="container relative mx-auto px-4 py-12 sm:py-16 lg:py-22">
        <div className="grid items-center gap-10 lg:grid-cols-[1.06fr_.94fr] lg:gap-16">
          <div className="max-w-3xl desk-enter">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/85 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.13em] text-primary shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {settings.badgeText}
            </div>
            <h1 className="study-display relative max-w-2xl text-5xl font-bold leading-[.97] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl">
              <span aria-hidden="true" className="invisible block">
                {HEADLINES[2]}
              </span>
              <span
                className={`absolute inset-0 block transition-opacity duration-[400ms] ${
                  headlineVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                {HEADLINES[headlineIndex]}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{settings.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#content" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_30px_-16px_color-mix(in_srgb,var(--primary)_85%,transparent)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <BookOpen className="h-4 w-4" /> Browse PDFs <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <Link href="/quiz" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-card/80 px-6 text-sm font-bold text-foreground transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ListChecks className="h-4 w-4 text-accent" /> Start a Quiz
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Search className="h-3.5 w-3.5 text-primary" /> Search a topic or exam</span>
              <span className="inline-flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-primary" /> Browse by subject</span>
            </div>
          </div>

          <aside className="premium-surface desk-enter desk-delay rounded-[1.35rem] border border-primary/15 bg-card/95 p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <div><p className="text-sm font-extrabold tracking-tight">Today&apos;s study desk</p><p className="mt-0.5 text-xs text-muted-foreground">A clear place to begin</p></div>
              <div className="rounded-lg bg-accent/15 px-2.5 py-1 text-[11px] font-extrabold text-accent">Free library</div>
            </div>
            <div className="grid grid-cols-3 gap-2 py-4">
              {[
                { label: "PDFs", value: totalPdfs.toLocaleString(), icon: FileText },
                { label: "Quizzes", value: totalQuizzes.toLocaleString(), icon: ListChecks },
                { label: "Questions", value: totalQuestions.toLocaleString(), icon: Timer },
              ].map(item => <div key={item.label} className="rounded-xl border border-border/45 bg-muted/45 p-3">
                <item.icon className="mb-3 h-4 w-4 text-primary" /><p className="text-lg font-extrabold tabular-nums">{item.value}</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{item.label}</p>
              </div>)}
            </div>
            <div className="rounded-xl border border-border/65 bg-background/60 p-3">
              <div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold">Recent updates</p><a href="#content" className="text-[11px] font-semibold text-primary hover:underline">Open library</a></div>
              {recentPdfs.length ? <div className="space-y-2">{recentPdfs.map(pdf => <Link key={pdf.id} href={`/pdf/${pdf.id}`} className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-muted">
                <FileText className="h-3.5 w-3.5 shrink-0 text-accent" /><span className="min-w-0 flex-1 truncate text-xs font-medium">{pdf.title}</span><span className="shrink-0 text-[10px] text-muted-foreground">{relativeDate(pdf.updated_at)}</span>
              </Link>)}</div> : <p className="text-xs leading-relaxed text-muted-foreground">Newly published PDFs will appear here.</p>}
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}