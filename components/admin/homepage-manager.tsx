"use client"

import { useState, useEffect } from "react"
import { 
  Home, Star, Megaphone, Eye, EyeOff, Save, Plus, Trash2, 
  GripVertical, ArrowUp, ArrowDown, AlertCircle, CheckCircle, Info,
  FileText, X, Loader2, Image as ImageIcon, Link as LinkIcon
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
import type { PDF, Category } from "@/lib/types"

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

export function HomepageManager({ pdfs, categories }: HomepageManagerProps) {
  const [activeSection, setActiveSection] = useState<"featured" | "announcements" | "hero">("featured")
  const [saving, setSaving] = useState(false)

  // Featured PDFs state
  const [featuredPdfs, setFeaturedPdfs] = useState<FeaturedPDF[]>([])
  const [selectedPdfToAdd, setSelectedPdfToAdd] = useState<string>("")

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

  // Load featured PDFs from localStorage
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
      
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success("Homepage settings saved!")
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
      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "featured", label: "Featured PDFs", icon: Star },
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
            <div className="space-y-2">
              <Label>Main Title</Label>
              <Input
                value={heroSettings.title}
                onChange={(e) => setHeroSettings({ ...heroSettings, title: e.target.value })}
                placeholder="TechVyro PDF Library"
              />
            </div>

            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Textarea
                value={heroSettings.subtitle}
                onChange={(e) => setHeroSettings({ ...heroSettings, subtitle: e.target.value })}
                placeholder="Your one-stop destination for free PDF resources..."
                rows={2}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Display Options</h4>
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Show Statistics</p>
                  <p className="text-sm text-muted-foreground">Display total PDFs, downloads, etc.</p>
                </div>
                <Switch
                  checked={heroSettings.showStats}
                  onCheckedChange={(checked) => setHeroSettings({ ...heroSettings, showStats: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Show Search Bar</p>
                  <p className="text-sm text-muted-foreground">Enable quick search in hero section</p>
                </div>
                <Switch
                  checked={heroSettings.showSearch}
                  onCheckedChange={(checked) => setHeroSettings({ ...heroSettings, showSearch: checked })}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Background Style</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "gradient", label: "Gradient" },
                  { id: "solid", label: "Solid" },
                  { id: "pattern", label: "Pattern" },
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setHeroSettings({ ...heroSettings, backgroundStyle: style.id as typeof heroSettings.backgroundStyle })}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      heroSettings.backgroundStyle === style.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 hover:border-primary/50"
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
