"use client"

import { useState, useEffect } from "react"
import { 
  Home, Star, Megaphone, Eye, EyeOff, Save, Plus, Trash2, 
  GripVertical, ArrowUp, ArrowDown, AlertCircle, CheckCircle, Info,
  FileText, X, Loader2, Image as ImageIcon, Link as LinkIcon, Users,
  Quote, BadgeCheck, Edit2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import type { PDF, Category, Testimonial } from "@/lib/types"
import { DEFAULT_HERO_SETTINGS, isSafeHttpUrl, normalizeHeroSettings } from "@/lib/homepage-settings"

interface HomepageManagerProps {
  pdfs: PDF[]
  categories: Category[]
}

interface Announcement {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  link?: string
  linkText?: string
  enabled: boolean
  createdAt: Date
}

interface FeaturedPDF {
  pdfId: string
  order: number
}

const defaultTestimonials: Testimonial[] = [
  {
    id: "1",
    name: "Rahul Sharma",
    course: "NDA Aspirant",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "TechVyro took my NDA preparation to the next level. The notes are so clear that I remember everything after just one read!",
    verified: true,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "2",
    name: "Priya Patel",
    course: "B.Tech Student",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Found notes for all engineering subjects in one place. It's the perfect resource for revision before exams!",
    verified: true,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "3",
    name: "Amit Kumar",
    course: "SSC Aspirant",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Previous year papers and solutions all for free! I cleared 3 competitive exams using TechVyro's resources.",
    verified: true,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "4",
    name: "Sneha Reddy",
    course: "NEET Aspirant",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Biology and Chemistry notes are very detailed. The diagrams are so clear that concepts are easy to understand instantly!",
    verified: true,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "5",
    name: "Vikram Singh",
    course: "UPSC Aspirant",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Current affairs and static GK PDFs are regularly updated. Best resource for Prelims preparation!",
    verified: true,
    enabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "6",
    name: "Ananya Gupta",
    course: "Class 12 Student",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    rating: 5,
    comment: "Found NCERT solutions and sample papers for board exams. Scored 95% thanks to TechVyro!",
    verified: true,
    enabled: true,
    createdAt: new Date().toISOString()
  }
]

export function HomepageManager({ pdfs, categories }: HomepageManagerProps) {
  const [activeSection, setActiveSection] = useState<"featured" | "announcements" | "hero" | "testimonials">("hero")
  const [saving, setSaving] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Featured PDFs state
  const [featuredPdfs, setFeaturedPdfs] = useState<FeaturedPDF[]>([])
  const [selectedPdfToAdd, setSelectedPdfToAdd] = useState<string>("")

  // Testimonials state
  const [testimonials, setTestimonials] = useState<Testimonial[]>(defaultTestimonials)
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null)
  const [newTestimonial, setNewTestimonial] = useState<Partial<Testimonial>>({
    name: "",
    course: "",
    avatar: "",
    rating: 5,
    comment: "",
    verified: true,
  })

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: "1",
      title: "Welcome to TechVyro!",
      message: "Explore our collection of high-quality PDF resources. Download free study materials, notes, and more.",
      type: "info",
      enabled: true,
      createdAt: new Date(),
    }
  ])
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({
    title: "",
    message: "",
    type: "info",
    link: "",
    linkText: "",
  })

  // Hero section state
  const [heroSettings, setHeroSettings] = useState(DEFAULT_HERO_SETTINGS)

  function adminHeaders() {
    return { "Content-Type": "application/json" }
  }

  async function loadSettings() {
    setLoadingSettings(true)
    try {
      const response = await fetch("/api/site-settings", { headers: adminHeaders() })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to load homepage settings")
        const s = data.settings ?? {}
        if (s.featured_pdfs) setFeaturedPdfs(s.featured_pdfs)
        if (s.announcements) {
          setAnnouncements(s.announcements.map((a: Announcement) => ({
            ...a,
            createdAt: new Date(a.createdAt)
          })))
        }
        if (s.hero_settings) setHeroSettings(normalizeHeroSettings(s.hero_settings))
        if (s.testimonials) setTestimonials(s.testimonials)
      setLoadError(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load homepage settings")
    } finally {
      setLoadingSettings(false)
    }
  }

  // Load settings from database
  useEffect(() => {
    loadSettings()
  }, [])

  // Get PDF details by ID
  function getPdfById(id: string) {
    return pdfs.find(p => p.id === id)
  }

  // Add PDF to featured
  function addFeaturedPdf() {
    if (!selectedPdfToAdd) return
    if (featuredPdfs.some(f => f.pdfId === selectedPdfToAdd)) {
      toast.error("This PDF is already featured")
      return
    }
    if (featuredPdfs.length >= 6) {
      toast.error("Maximum 6 featured PDFs allowed")
      return
    }

    setFeaturedPdfs([...featuredPdfs, { pdfId: selectedPdfToAdd, order: featuredPdfs.length }])
    setSelectedPdfToAdd("")
    toast.success("PDF added to featured!")
  }

  // Remove PDF from featured
  function removeFeaturedPdf(pdfId: string) {
    setFeaturedPdfs(featuredPdfs.filter(f => f.pdfId !== pdfId))
    toast.success("PDF removed from featured")
  }

  // Move featured PDF up/down
  function moveFeaturedPdf(index: number, direction: "up" | "down") {
    const newFeatured = [...featuredPdfs]
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newFeatured.length) return
    
    ;[newFeatured[index], newFeatured[newIndex]] = [newFeatured[newIndex], newFeatured[index]]
    setFeaturedPdfs(newFeatured)
  }

  // Testimonial functions
  function addTestimonial() {
    if (!newTestimonial.name || !newTestimonial.comment) {
      toast.error("Name and comment are required")
      return
    }
    if (newTestimonial.avatar && !isSafeHttpUrl(newTestimonial.avatar, true)) {
      toast.error("Avatar must use a valid HTTPS URL")
      return
    }

    const testimonial: Testimonial = {
      id: Date.now().toString(),
      name: newTestimonial.name!,
      course: newTestimonial.course || "Student",
      avatar: newTestimonial.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newTestimonial.name!)}`,
      rating: newTestimonial.rating || 5,
      comment: newTestimonial.comment!,
      verified: newTestimonial.verified ?? true,
      enabled: true,
      createdAt: new Date().toISOString(),
    }

    setTestimonials([testimonial, ...testimonials])
    setNewTestimonial({ name: "", course: "", avatar: "", rating: 5, comment: "", verified: true })
    toast.success("Testimonial added!")
  }

  function updateTestimonial() {
    if (!editingTestimonial) return
    if (editingTestimonial.avatar && !isSafeHttpUrl(editingTestimonial.avatar, true)) {
      toast.error("Avatar must use a valid HTTPS URL")
      return
    }
    const normalizedTestimonial = {
      ...editingTestimonial,
      avatar: editingTestimonial.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(editingTestimonial.name)}`,
    }
    
    setTestimonials(testimonials.map(t => 
      t.id === editingTestimonial.id ? normalizedTestimonial : t
    ))
    setEditingTestimonial(null)
    toast.success("Testimonial updated!")
  }

  function deleteTestimonial(id: string) {
    setTestimonials(testimonials.filter(t => t.id !== id))
    toast.success("Testimonial deleted")
  }

  function toggleTestimonial(id: string) {
    setTestimonials(testimonials.map(t => 
      t.id === id ? { ...t, enabled: !t.enabled } : t
    ))
  }

  // Add announcement
  function addAnnouncement() {
    if (!newAnnouncement.title || !newAnnouncement.message) {
      toast.error("Title and message are required")
      return
    }
    if (newAnnouncement.link && !isSafeHttpUrl(newAnnouncement.link)) {
      toast.error("Announcement link must use HTTP or HTTPS")
      return
    }

    const announcement: Announcement = {
      id: Date.now().toString(),
      title: newAnnouncement.title!,
      message: newAnnouncement.message!,
      type: newAnnouncement.type as Announcement["type"],
      link: newAnnouncement.link,
      linkText: newAnnouncement.linkText,
      enabled: true,
      createdAt: new Date(),
    }

    setAnnouncements([announcement, ...announcements])
    setNewAnnouncement({ title: "", message: "", type: "info", link: "", linkText: "" })
    toast.success("Announcement created!")
  }

  // Toggle announcement
  function toggleAnnouncement(id: string) {
    setAnnouncements(announcements.map(a => 
      a.id === id ? { ...a, enabled: !a.enabled } : a
    ))
  }

  // Delete announcement
  function deleteAnnouncement(id: string) {
    setAnnouncements(announcements.filter(a => a.id !== id))
    toast.success("Announcement deleted")
  }

  // Save all settings
  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/site-settings", {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({
          hero_settings: heroSettings,
          testimonials: testimonials,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Save failed")
      toast.success("All settings saved!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const announcementIcons = {
    info: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: AlertCircle,
  }

  const announcementColors = {
    info: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    success: "bg-green-500/10 text-green-500 border-green-500/30",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    error: "bg-red-500/10 text-red-500 border-red-500/30",
  }

  return (
    <div className="space-y-6">
      {/* Save Button - Fixed at top */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div>
          <h3 className="font-semibold text-foreground">Homepage Settings</h3>
          <p className="text-sm text-muted-foreground">Manage the hero content and testimonials shown on the public homepage</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All Changes
        </Button>
      </div>
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-muted-foreground">
        Featured PDF lists are ranked automatically from live views, downloads, recency, and ratings.
        Announcement banners are not currently rendered, so those controls have been removed rather than saving invisible changes.
      </div>
      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <span>{loadError}. Existing form values were not overwritten.</span>
          <Button type="button" variant="outline" size="sm" onClick={loadSettings} disabled={loadingSettings}>
            {loadingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retry"}
          </Button>
        </div>
      )}

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "testimonials", label: "Testimonials", icon: Quote },
          { id: "hero", label: "Hero Section", icon: Home },
        ].map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as typeof activeSection)}
              aria-pressed={isActive}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {section.label}
              {section.id === "testimonials" && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {testimonials.filter(t => t.enabled).length}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Featured PDFs Section */}
      {activeSection === "featured" && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Featured PDFs
            </CardTitle>
            <CardDescription>
              Select up to 6 PDFs to feature prominently on the homepage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add Featured PDF */}
            <div className="flex gap-3">
              <Select value={selectedPdfToAdd} onValueChange={setSelectedPdfToAdd}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a PDF to feature..." />
                </SelectTrigger>
                <SelectContent>
                  {pdfs.filter(p => !featuredPdfs.some(f => f.pdfId === p.id)).map((pdf) => (
                    <SelectItem key={pdf.id} value={pdf.id}>
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {pdf.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addFeaturedPdf} disabled={!selectedPdfToAdd || featuredPdfs.length >= 6}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Featured PDFs List */}
            {featuredPdfs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto opacity-30 mb-3" />
                <p>No featured PDFs yet</p>
                <p className="text-sm">Add PDFs to feature them on the homepage</p>
              </div>
            ) : (
              <div className="space-y-2">
                {featuredPdfs.map((featured, index) => {
                  const pdf = getPdfById(featured.pdfId)
                  if (!pdf) return null

                  const category = categories.find(c => c.id === pdf.category_id)

                  return (
                    <div
                      key={featured.pdfId}
                      className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveFeaturedPdf(index, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveFeaturedPdf(index, "down")}
                          disabled={index === featuredPdfs.length - 1}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                        <span className="font-bold text-amber-600">{index + 1}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{pdf.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {category && (
                            <Badge variant="outline" className="text-[10px]" style={{ backgroundColor: category.color + "20", color: category.color }}>
                              {category.name}
                            </Badge>
                          )}
                          <span>{pdf.download_count} downloads</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => removeFeaturedPdf(featured.pdfId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {featuredPdfs.length}/6 featured PDFs selected
            </p>
          </CardContent>
        </Card>
      )}

      {/* Testimonials Section */}
      {activeSection === "testimonials" && (
        <div className="space-y-6">
          {/* Add/Edit Testimonial */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                {editingTestimonial ? "Edit Testimonial" : "Add Testimonial"}
              </CardTitle>
              <CardDescription>
                {editingTestimonial ? "Update the testimonial details" : "Add a new student testimonial to display on homepage"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Student Name *</Label>
                  <Input
                    value={editingTestimonial?.name ?? newTestimonial.name}
                    onChange={(e) => editingTestimonial 
                      ? setEditingTestimonial({...editingTestimonial, name: e.target.value})
                      : setNewTestimonial({ ...newTestimonial, name: e.target.value })
                    }
                    placeholder="e.g., Rahul Sharma"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Course / Role</Label>
                  <Input
                    value={editingTestimonial?.course ?? newTestimonial.course}
                    onChange={(e) => editingTestimonial
                      ? setEditingTestimonial({...editingTestimonial, course: e.target.value})
                      : setNewTestimonial({ ...newTestimonial, course: e.target.value })
                    }
                    placeholder="e.g., NDA Aspirant, B.Tech Student"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Avatar URL (Optional)</Label>
                  <Input
                    value={editingTestimonial?.avatar ?? newTestimonial.avatar}
                    onChange={(e) => editingTestimonial
                      ? setEditingTestimonial({...editingTestimonial, avatar: e.target.value})
                      : setNewTestimonial({ ...newTestimonial, avatar: e.target.value })
                    }
                    placeholder="https://... (leave empty for auto-generated)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <Select
                    value={String(editingTestimonial?.rating ?? newTestimonial.rating ?? 5)}
                    onValueChange={(v) => editingTestimonial
                      ? setEditingTestimonial({...editingTestimonial, rating: parseInt(v)})
                      : setNewTestimonial({ ...newTestimonial, rating: parseInt(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Stars</SelectItem>
                      <SelectItem value="4">4 Stars</SelectItem>
                      <SelectItem value="3">3 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Comment *</Label>
                <Textarea
                  value={editingTestimonial?.comment ?? newTestimonial.comment}
                  onChange={(e) => editingTestimonial
                    ? setEditingTestimonial({...editingTestimonial, comment: e.target.value})
                    : setNewTestimonial({ ...newTestimonial, comment: e.target.value })
                  }
                  placeholder="Write the student's testimonial..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={editingTestimonial?.verified ?? newTestimonial.verified ?? true}
                  onCheckedChange={(v) => editingTestimonial
                    ? setEditingTestimonial({...editingTestimonial, verified: v})
                    : setNewTestimonial({ ...newTestimonial, verified: v })
                  }
                />
                <Label className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-blue-500" />
                  Verified Student Badge
                </Label>
              </div>

              <div className="flex gap-2">
                {editingTestimonial ? (
                  <>
                    <Button onClick={updateTestimonial}>
                      <Save className="h-4 w-4 mr-2" />
                      Update Testimonial
                    </Button>
                    <Button variant="outline" onClick={() => setEditingTestimonial(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={addTestimonial}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Testimonial
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Existing Testimonials */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Student Testimonials
              </CardTitle>
              <CardDescription>
                {testimonials.filter(t => t.enabled).length} active testimonials showing on homepage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testimonials.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Quote className="h-12 w-12 mx-auto opacity-30 mb-3" />
                  <p>No testimonials yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {testimonials.map((testimonial) => (
                    <div
                      key={testimonial.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                        testimonial.enabled 
                          ? "bg-card border-border/50" 
                          : "bg-muted/30 border-border/30 opacity-60"
                      }`}
                    >
                      <img
                        src={isSafeHttpUrl(testimonial.avatar, true) ? testimonial.avatar : undefined}
                        alt={testimonial.name}
                        className="h-12 w-12 rounded-full object-cover border-2 border-primary/20"
                        onError={(e) => {
                          e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${testimonial.name}`
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{testimonial.name}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {testimonial.course}
                          </Badge>
                          {testimonial.verified && (
                            <BadgeCheck className="h-4 w-4 text-blue-500" />
                          )}
                          {!testimonial.enabled && (
                            <Badge variant="secondary" className="text-[10px]">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i < testimonial.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          "{testimonial.comment}"
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={testimonial.enabled}
                          onCheckedChange={() => toggleTestimonial(testimonial.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-primary/10 hover:text-primary"
                          onClick={() => setEditingTestimonial(testimonial)}
                          aria-label={`Edit testimonial from ${testimonial.name}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => deleteTestimonial(testimonial.id)}
                          aria-label={`Delete testimonial from ${testimonial.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Announcements Section */}
      {activeSection === "announcements" && (
        <div className="space-y-6">
          {/* Create Announcement */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Create Announcement
              </CardTitle>
              <CardDescription>
                Add a new announcement banner to display on the homepage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    placeholder="Announcement title..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newAnnouncement.type}
                    onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, type: v as Announcement["type"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info (Blue)</SelectItem>
                      <SelectItem value="success">Success (Green)</SelectItem>
                      <SelectItem value="warning">Warning (Yellow)</SelectItem>
                      <SelectItem value="error">Important (Red)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                  placeholder="Write your announcement message..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Link URL (Optional)</Label>
                  <Input
                    value={newAnnouncement.link}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link Text (Optional)</Label>
                  <Input
                    value={newAnnouncement.linkText}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, linkText: e.target.value })}
                    placeholder="Learn more"
                  />
                </div>
              </div>

              <Button onClick={addAnnouncement} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create Announcement
              </Button>
            </CardContent>
          </Card>

          {/* Existing Announcements */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-accent" />
                Active Announcements
              </CardTitle>
              <CardDescription>
                Manage your homepage announcement banners
              </CardDescription>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Megaphone className="h-12 w-12 mx-auto opacity-30 mb-3" />
                  <p>No announcements yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((announcement) => {
                    const Icon = announcementIcons[announcement.type]
                    
                    return (
                      <div
                        key={announcement.id}
                        className={`flex items-start gap-4 p-4 rounded-xl border ${announcement.enabled ? announcementColors[announcement.type] : "bg-muted/30 border-border/50 opacity-60"}`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/50">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{announcement.title}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {announcement.type}
                            </Badge>
                            {!announcement.enabled && (
                              <Badge variant="secondary" className="text-[10px]">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {announcement.message}
                          </p>
                          {announcement.link && (
                            <a href={announcement.link} className="text-xs text-primary hover:underline mt-1 inline-block">
                              {announcement.linkText || "Learn more"}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={announcement.enabled}
                            onCheckedChange={() => toggleAnnouncement(announcement.id)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => deleteAnnouncement(announcement.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hero Section Settings */}
      {activeSection === "hero" && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              Hero Section
            </CardTitle>
            <CardDescription>
              Customize the main hero section of your homepage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Badge Text</Label>
                <Input
                  value={heroSettings.badgeText}
                  onChange={(e) => setHeroSettings({ ...heroSettings, badgeText: e.target.value })}
                  placeholder="Free Educational Resources"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={heroSettings.description}
                  onChange={(e) => setHeroSettings({ ...heroSettings, description: e.target.value })}
                  placeholder="Describe the resources available..."
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Library Button</Label>
                  <Input value={heroSettings.heroBtnText} onChange={(e) => setHeroSettings({ ...heroSettings, heroBtnText: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Button</Label>
                  <Input value={heroSettings.whatsappBtnText} onChange={(e) => setHeroSettings({ ...heroSettings, whatsappBtnText: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rotating Taglines (one per line)</Label>
                <Textarea
                  value={heroSettings.taglines.join("\n")}
                  onChange={(e) => setHeroSettings({ ...heroSettings, taglines: e.target.value.split("\n") })}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Trust Labels (one per line)</Label>
                <Textarea
                  value={heroSettings.trustStats.join("\n")}
                  onChange={(e) => setHeroSettings({ ...heroSettings, trustStats: e.target.value.split("\n") })}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Use only claims you can substantiate; these labels appear publicly.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
