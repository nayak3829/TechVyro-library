import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { BookOpen, Users, Shield, Zap, Mail, Globe, MessageCircle, Star } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "About Us - TechVyro PDF Library",
  description: "Learn about TechVyro — your free educational PDF platform for students.",
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative py-20 sm:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,80,200,0.15),transparent)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(120,80,200,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(120,80,200,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
          <div className="container mx-auto px-4 relative text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Our Story
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 tracking-tight">
              About{" "}
              <span className="bg-gradient-to-r from-[#ef4444] to-primary bg-clip-text text-transparent">
                TechVyro
              </span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              We believe quality education should be free and accessible to every student. TechVyro is built with one mission — making study materials available to all, without barriers.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center max-w-5xl mx-auto">
              <div className="space-y-5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Why We Built TechVyro
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Finding reliable study materials online was always a struggle. Students wasted hours searching for quality PDFs, notes, and practice sets — and often ended up with outdated or incomplete resources.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  TechVyro solves this by curating a comprehensive collection of educational PDFs — all in one place, completely free, with easy search and download.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <Link
                    href="/#content"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                  >
                    <BookOpen className="h-4 w-4" />
                    Browse Library
                  </Link>
                  <Link
                    href="/quiz"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/60 bg-card text-foreground text-sm font-semibold hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    Take a Quiz
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: BookOpen, label: "Free PDFs", desc: "All resources completely free, always", color: "#6366f1" },
                  { icon: Shield, label: "Protected", desc: "Watermarked downloads to protect creators", color: "#22c55e" },
                  { icon: Zap, label: "Fast Search", desc: "Find any PDF in seconds", color: "#f59e0b" },
                  { icon: Users, label: "Community", desc: "10,000+ students trust us", color: "#ec4899" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/50 bg-card p-5 space-y-3 hover:shadow-md transition-shadow">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}18` }}>
                      <item.icon className="h-5 w-5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">TechVyro by Numbers</h2>
              <p className="text-muted-foreground text-sm">Growing every day, powered by student trust</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { value: "200+", label: "PDFs Available", color: "#6366f1" },
                { value: "10K+", label: "Students Served", color: "#22c55e" },
                { value: "500+", label: "Downloads", color: "#f59e0b" },
                { value: "4.9/5", label: "Average Rating", color: "#ec4899" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border/50 bg-card p-6 text-center hover:shadow-md transition-shadow">
                  <p className="text-3xl font-extrabold mb-1" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What We Offer */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">What You Get</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">Everything a student needs to succeed</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {[
                { icon: BookOpen, title: "PDF Library", desc: "Thousands of curated study materials, notes, and past papers organized by subject.", color: "#6366f1" },
                { icon: Star, title: "Practice Quizzes", desc: "Interactive quizzes with instant feedback, timer, and performance analysis.", color: "#f59e0b" },
                { icon: Zap, title: "Smart Search", desc: "Powerful search with live results, filters, and subject-based browsing.", color: "#22c55e" },
                { icon: Shield, title: "Safe Downloads", desc: "All PDFs downloadable with TechVyro watermark for content protection.", color: "#ec4899" },
                { icon: MessageCircle, title: "AI Assistant", desc: "Built-in AI chatbot to answer your questions about study materials.", color: "#0088cc" },
                { icon: Users, title: "Community", desc: "Join our WhatsApp & Telegram channels for updates and new uploads.", color: "#25D366" },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/50 bg-card p-6 space-y-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}18` }}>
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">Get in Touch</h2>
                <p className="text-muted-foreground text-sm">Have a question, suggestion, or want to contribute? We'd love to hear from you.</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: Mail,
                    label: "Email Us",
                    value: "techvyro@gmail.com",
                    href: "mailto:techvyro@gmail.com",
                    color: "#6366f1",
                    desc: "For queries & support",
                  },
                  {
                    icon: Globe,
                    label: "Website",
                    value: "techvyro.in",
                    href: "https://www.techvyro.in/",
                    color: "#22c55e",
                    desc: "Main website",
                  },
                  {
                    icon: MessageCircle,
                    label: "Telegram",
                    value: "@techvyro",
                    href: "https://t.me/techvyro",
                    color: "#0088cc",
                    desc: "Join our community",
                  },
                ].map((contact) => (
                  <a
                    key={contact.label}
                    href={contact.href}
                    target={contact.href.startsWith("mailto") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center text-center p-6 rounded-2xl border border-border/50 bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${contact.color}18` }}>
                      <contact.icon className="h-6 w-6" style={{ color: contact.color }} />
                    </div>
                    <p className="font-semibold text-foreground text-sm mb-1">{contact.label}</p>
                    <p className="text-xs text-muted-foreground mb-1">{contact.desc}</p>
                    <p className="text-xs font-medium" style={{ color: contact.color }}>{contact.value}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-4">Ready to Start Learning?</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-md mx-auto">Join thousands of students already using TechVyro for their exam preparation.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:opacity-90 transition-all shadow-2xl shadow-primary/25"
              >
                <BookOpen className="h-4 w-4" />
                Browse Library
              </Link>
              <Link
                href="/quiz"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-border/60 bg-card text-foreground text-sm font-semibold hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <Star className="h-4 w-4" />
                Take a Quiz
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
