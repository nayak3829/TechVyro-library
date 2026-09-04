"use client"

import { useEffect, useState } from "react"
import { Star, Quote, GraduationCap, CheckCircle2, Sparkles } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Testimonial } from "@/lib/types"

const defaultTestimonials: Testimonial[] = [
  {
    id: "1",
    name: "Rahul Sharma",
    course: "SSC Aspirant",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    comment: "The SSC PDFs are clearly organized, so I can find the right study material without wasting time.",
    verified: false,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "2",
    name: "Priya Patel",
    course: "SSC CGL Aspirant",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    comment: "The SSC CGL documents and mock tests make it easy to revise and practice from the same website.",
    verified: false,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "3",
    name: "Amit Kumar",
    course: "SSC Aspirant",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    comment: "The available SSC study PDFs are useful for focused revision, and the viewer works well on my phone.",
    verified: false,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "4",
    name: "Sneha Reddy",
    course: "SSC CHSL Aspirant",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    comment: "I like that the SSC material is grouped by exam and subject instead of being mixed into one long list.",
    verified: false,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "5",
    name: "Vikram Singh",
    course: "SSC MTS Aspirant",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    comment: "The free SSC resources are straightforward to browse, view and download when I need quick practice.",
    verified: false,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "6",
    name: "Ananya Gupta",
    course: "SSC GD Aspirant",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
    rating: 5,
    comment: "TechVyro gives me one clean place for the SSC PDFs and practice tests that are currently available.",
    verified: false,
    enabled: true,
    createdAt: new Date().toISOString()
  }
]

function TestimonialCard({ testimonial, clone = false }: { testimonial: Testimonial; clone?: boolean }) {
  const initials = testimonial.name.split(" ").map(n => n[0]).join("").toUpperCase()

  return (
    <div data-testimonial-card data-clone={clone ? "true" : "false"} aria-hidden={clone || undefined} className="relative w-[290px] sm:w-[330px] shrink-0 mx-2.5 bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/6 hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
      {/* Subtle top gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Quote icon */}
      <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/8 group-hover:text-primary/15 transition-colors duration-300" />

      {/* Stars */}
      <div className="flex items-center gap-0.5 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-3.5 w-3.5 ${i < testimonial.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />
        ))}
      </div>

      {/* Comment */}
      <p className="text-sm text-foreground/85 leading-relaxed mb-4 line-clamp-3">
        &ldquo;{testimonial.comment}&rdquo;
      </p>

      {/* Divider */}
      <div className="h-px bg-border/40 mb-4" />

      {/* Author */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-primary/15">
          <AvatarImage src={testimonial.avatar} alt={testimonial.name} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none" }} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm text-foreground truncate">{testimonial.name}</p>
            {testimonial.verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <GraduationCap className="h-3 w-3 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground truncate">{testimonial.course}</p>
            {testimonial.verified && (
              <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Verified
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(defaultTestimonials)

  useEffect(() => {
    fetch("/api/site-settings?key=testimonials")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.value)) {
          const enabled = data.value.filter((t: Testimonial) => t.enabled)
            setTestimonials(enabled)
        }
      })
      .catch(() => {})
  }, [])

  const enabled = testimonials.filter(t => t.enabled)
  if (enabled.length === 0) return null

  const row1 = [...enabled, ...enabled]
  const row2 = [...enabled].reverse()
  const row2x = [...row2, ...row2]

  return (
    <section className="py-16 sm:py-20 lg:py-24 overflow-hidden bg-muted/20 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(120,80,200,0.04),transparent)]" />

      {/* Header */}
      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-4">
            <Star className="h-3 w-3 fill-current" />
            Student Reviews
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground mb-3 tracking-tight">
            What <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Students</span> Say
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
             Feedback about the SSC study materials and mock tests currently available on TechVyro
          </p>
        </div>
      </div>

      {/* Marquee rows */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-background/90 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-background/90 to-transparent z-10 pointer-events-none" />

        <div className="flex hover:[animation-play-state:paused] motion-reduce:[animation:none]" style={{ animation: "marqueeLeft 35s linear infinite" }}>
          {row1.map((t, i) => <TestimonialCard key={`r1-${t.id}-${i}`} testimonial={t} clone={i >= enabled.length} />)}
        </div>
        <div aria-hidden="true" className="flex mt-4 hover:[animation-play-state:paused] motion-reduce:[animation:none]" style={{ animation: "marqueeRight 40s linear infinite" }}>
          {row2x.map((t, i) => <TestimonialCard key={`r2-${t.id}-${i}`} testimonial={t} clone />)}
        </div>
      </div>

      {/* Trust strip */}
      <div className="container mx-auto px-4 relative">
        <div className="mt-12 flex items-center justify-center text-center text-sm text-muted-foreground">
          <p>Currently focused on SSC study PDFs, with free mock-test practice across more exam categories.</p>
        </div>
      </div>

    </section>
  )
}
