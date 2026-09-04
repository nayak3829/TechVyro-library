import Link from "next/link"
import { ArrowRight, BookOpen, FileText, ListChecks, Search, Timer, Layers } from "lucide-react"
import type { HeroSettings } from "@/lib/homepage-settings"

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
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_85%_0%,rgba(64,82,166,0.14),transparent_64%),radial-gradient(ellipse_55%_50%_at_4%_100%,rgba(222,79,46,0.10),transparent_65%)]" />
      <div className="absolute inset-0 opacity-[0.4] bg-[linear-gradient(rgba(49,62,130,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(49,62,130,0.045)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <div className="container relative mx-auto px-4 py-9 sm:py-12 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-12">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/75 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {settings.badgeText}
            </div>
            <h1 className="max-w-2xl text-4xl font-black leading-[.98] tracking-[-0.055em] text-foreground sm:text-5xl lg:text-6xl">
              Your exam desk, <span className="text-primary">already organized.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{settings.description}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="#content" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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

          <aside className="rounded-2xl border border-primary/15 bg-card/90 p-4 shadow-xl shadow-primary/10 backdrop-blur sm:p-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <div><p className="text-sm font-bold">Study desk</p><p className="mt-0.5 text-xs text-muted-foreground">What is ready to use now</p></div>
              <div className="rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">Free library</div>
            </div>
            <div className="grid grid-cols-3 gap-2 py-4">
              {[
                { label: "PDFs", value: totalPdfs.toLocaleString(), icon: FileText },
                { label: "Quizzes", value: totalQuizzes.toLocaleString(), icon: ListChecks },
                { label: "Questions", value: totalQuestions.toLocaleString(), icon: Timer },
              ].map(item => <div key={item.label} className="rounded-xl bg-muted/60 p-3">
                <item.icon className="mb-3 h-4 w-4 text-primary" /><p className="text-lg font-black tabular-nums">{item.value}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
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