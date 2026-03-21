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
    comment: "TechVyro ne meri NDA preparation ko next level pe le gaya. Notes itne clear hain ki ek baar padhke yaad ho jaata hai!",
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
    comment: "Engineering ke saare subjects ke notes mil gaye ek jagah. Exam se pehle revision ke liye perfect resource hai!",
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
    comment: "Previous year papers aur solutions sab free mein! Maine 3 competitive exams clear kiye TechVyro ke resources se.",
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
    comment: "Biology aur Chemistry ke notes bahut detailed hain. Diagrams itne clear hain ki concepts turant samajh aate hain!",
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
    comment: "Current affairs aur static GK ke PDFs regularly update hote hain. Prelims preparation ke liye best resource!",
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
    comment: "Board exams ke liye NCERT solutions aur sample papers mil gaye. 95% score kiya thanks to TechVyro!",
    verified: true,
    enabled: true,
    createdAt: new Date().toISOString()
  }
]

export function HomepageManager({ pdfs, categories }: HomepageManagerProps) {
  const [activeSection, setActiveSection] = useState<"featured" | "announcements" | "hero" | "testimonials">("featured")
  const [saving, setSaving] = useState(false)

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
  const [heroSettings, setHeroSettings] = useState({
    title: "TechVyro PDF Library",
    subtitle: "Your one-stop destination for free PDF resources, study materials, and educational content.",
    showStats: true,
    showSearch: true,
    backgroundStyle: "gradient" as "gradient" | "solid" | "pattern",
  })

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("techvyro_featured_pdfs")
    if (stored) {
      try {
        setFeaturedPdfs(JSON.parse(stored))
      } catch {
        // Invalid data, ignore
      }
    }

    const storedAnnouncements = localStorage.getItem("techvyro_announcements")
    if (storedAnnouncements) {
      try {
        const parsed = JSON.parse(storedAnnouncements)
        setAnnouncements(parsed.map((a: Announcement) => ({
          ...a,
          createdAt: new Date(a.createdAt)
        })))
      } catch {
        // Invalid data, ignore
      }
    }

    const storedHero = localStorage.getItem("techvyro_hero_settings")
    if (storedHero) {
      try {
        setHeroSettings(JSON.parse(storedHero))
      } catch {
        // Invalid data, ignore
      }
    }

    const storedTestimonials = localStorage.getItem("techvyro_testimonials")
    if (storedTestimonials) {
      try {
        setTestimonials(JSON.parse(storedTestimonials))
      } catch {
        // Invalid data, use defaults
      }
    }
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

    const testimonial: Testimonial = {
      id: Date.now().toString(),
      name: newTestimonial.name!,
      course: newTestimonial.course || "Student",
      avatar: newTestimonial.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newTestimonial.name}`,
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
    
    setTestimonials(testimonials.map(t => 
      t.id === editingTestimonial.id ? editingTestimonial : t
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
      localStorage.setItem("techvyro_featured_pdfs", JSON.stringify(featuredPdfs))
      localStorage.setItem("techvyro_announcements", JSON.stringify(announcements))
      localStorage.setItem("techvyro_hero_settings", JSON.stringify(heroSettings))
      localStorage.setItem("techvyro_testimonials", JSON.stringify(testimonials))
      
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success("All settings saved!")
    } catch (error) {
      toast.error("Failed to save settings")
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
          <p className="text-sm text-muted-foreground">Manage featured PDFs, testimonials, announcements & more</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All Changes
        </Button>
      </div>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "featured", label: "Featured PDFs", icon: Star },
          { id: "testimonials", label: "Testimonials", icon: Quote },
          { id: "announcements", label: "Announcements", icon: Megaphone },
          { id: "hero", label: "Hero Section", icon: Home },
        ].map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as typeof activeSection)}
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
                        src={testimonial.avatar}
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
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => deleteTestimonial(testimonial.id)}
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
                <Label>Hero Title</Label>
                <Input
                  value={heroSettings.title}
                  onChange={(e) => setHeroSettings({ ...heroSettings, title: e.target.value })}
                  placeholder="Main title..."
                />
              </div>
              <div className="space-y-2">
                <Label>Hero Subtitle</Label>
                <Textarea
                  value={heroSettings.subtitle}
                  onChange={(e) => setHeroSettings({ ...heroSettings, subtitle: e.target.value })}
                  placeholder="Subtitle text..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Display Options</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    Show Statistics
                  </Label>
                  <Switch
                    checked={heroSettings.showStats}
                    onCheckedChange={(v) => setHeroSettings({ ...heroSettings, showStats: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    Show Search Bar
                  </Label>
                  <Switch
                    checked={heroSettings.showSearch}
                    onCheckedChange={(v) => setHeroSettings({ ...heroSettings, showSearch: v })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Background Style</Label>
              <Select
                value={heroSettings.backgroundStyle}
                onValueChange={(v) => setHeroSettings({ ...heroSettings, backgroundStyle: v as typeof heroSettings.backgroundStyle })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gradient">Gradient</SelectItem>
                  <SelectItem value="solid">Solid Color</SelectItem>
                  <SelectItem value="pattern">Pattern</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
