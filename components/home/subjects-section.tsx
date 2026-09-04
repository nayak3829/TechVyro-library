"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, FileText, Trophy, Layers, GraduationCap, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SectionNode { id: string; name: string; pdfCount?: number; quizCount?: number; enabled: boolean }
interface CategoryNode { id: string; name: string; color: string; icon: string; sections: SectionNode[]; pdfCount?: number; quizCount?: number; enabled: boolean }
interface FolderNode { id: string; name: string; description: string; icon: string; color: string; categories: CategoryNode[]; pdfCount: number; quizCount: number; enabled: boolean }

export function SubjectsSection() {
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/content-structure")
      .then(r => r.json())
      .then(d => {
        const enriched = (d.folders || []).filter((f: FolderNode) => f.pdfCount > 0 || f.quizCount > 0)
        setFolders(enriched)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || folders.length === 0) return null

  return (
    <section className="py-14 sm:py-18 bg-muted/20 border-y border-border/40 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
        backgroundSize: "28px 28px"
      }} />
      <div className="container mx-auto px-4 relative">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
              <GraduationCap className="h-3.5 w-3.5" />
              Browse by Subject
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Explore Subjects
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              All study materials organized by subject, chapter, and topic
            </p>
          </div>
          <Button asChild variant="outline" className="hidden sm:flex gap-2">
            <Link href="/browse">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => {
            const color = folder.color || "#6366f1"
            const totalSections = folder.categories.reduce((a, c) => a + c.sections.length, 0)
            const iconIsNamedToken = /^[A-Za-z][A-Za-z0-9_-]*$/.test(folder.icon || "")
            return (
              <Link
                key={folder.id}
                href={`/subject/${folder.id}`}
                className="group relative p-5 rounded-2xl border border-border/40 hover:border-border/70 hover:shadow-md transition-all overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${color}10 0%, ${color}04 60%, transparent 100%)` }}
              >
                <div
                  className="absolute top-0 right-0 h-24 w-24 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 blur-2xl pointer-events-none"
                  style={{ background: color }}
                />
                <div className="flex items-start gap-4">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${color}28, ${color}14)`,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    {iconIsNamedToken ? (
                      <FolderOpen className="h-6 w-6" style={{ color }} aria-hidden="true" />
                    ) : (
                      <FolderOpen className="h-6 w-6" style={{ color }} aria-hidden="true" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate text-base">
                      {folder.name}
                    </h3>
                    {folder.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{folder.description}</p>
                    )}

                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {folder.pdfCount > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <FileText className="h-3 w-3" style={{ color }} />
                          <strong className="text-foreground">{folder.pdfCount}</strong> {folder.pdfCount === 1 ? "PDF" : "PDFs"}
                        </span>
                      )}
                      {folder.quizCount > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Trophy className="h-3 w-3" style={{ color }} />
                          <strong className="text-foreground">{folder.quizCount}</strong> {folder.quizCount === 1 ? "Quiz" : "Quizzes"}
                        </span>
                      )}
                      {folder.categories.length > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Layers className="h-3 w-3" style={{ color }} />
                          <strong className="text-foreground">{folder.categories.length}</strong> {folder.categories.length === 1 ? "Chapter" : "Chapters"}
                        </span>
                      )}
                    </div>

                    {folder.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {folder.categories.slice(0, 3).map(cat => (
                          <span
                            key={cat.id}
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: `${color}15`, color }}
                          >
                            {cat.name}
                          </span>
                        ))}
                        {folder.categories.length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full text-muted-foreground bg-muted/50">
                            +{folder.categories.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
              </Link>
            )
          })}
        </div>

        <div className="flex justify-center mt-6 sm:hidden">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/browse">View all content <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
