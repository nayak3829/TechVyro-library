"use client"

import { useState, useEffect } from "react"
import { 
  Settings, Shield, Globe, Bell, Palette, Database, 
  Save, RefreshCw, ExternalLink, Check, Copy, Eye, EyeOff,
  FileText, Download, Lock, Unlock, Info, AlertTriangle,
  Instagram, Facebook, MessageCircle, Send, Layout, Plus, Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { DEFAULT_HERO_SETTINGS, isSafeHttpUrl, normalizeHeroSettings } from "@/lib/homepage-settings"

interface SettingSection {
  id: string
  title: string
  description: string
  icon: typeof Settings
  color: string
}

const sections: SettingSection[] = [
  { id: "general", title: "General", description: "Basic site configuration", icon: Settings, color: "primary" },
  { id: "social", title: "Social Links", description: "Social media & channel URLs", icon: Globe, color: "blue" },
  { id: "hero", title: "Hero Content", description: "Homepage hero section text", icon: Layout, color: "violet" },
  { id: "homepage", title: "Homepage Text", description: "Library & CTA section content", icon: Layout, color: "green" },
  { id: "watermark", title: "Watermark", description: "PDF watermark settings", icon: FileText, color: "blue" },
  { id: "notifications", title: "Notifications", description: "Alert preferences", icon: Bell, color: "amber" },
]

export function SiteSettings() {
  const [activeSection, setActiveSection] = useState("general")
  const [saving, setSaving] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState<"idle" | "loading" | "active" | "inactive">("idle")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [webhookBot, setWebhookBot] = useState<{ username?: string; first_name?: string } | null>(null)
  const [telegramConfigured, setTelegramConfigured] = useState<boolean | null>(null)

  const [settings, setSettings] = useState({
    siteName: "TechVyro",
    siteTagline: "PDF Library",
    contactEmail: "techvyro@gmail.com",
    mainWebsite: "https://www.techvyro.in/",
    instagramUrl: "https://www.instagram.com/techvyro",
    facebookUrl: "https://www.facebook.com/share/187KsWWacM/?mibextid=wwXIfr",
    whatsappChannelUrl: "https://whatsapp.com/channel/0029Vadk2XHLSmbX3oEVmX37",
    telegramUrl: "https://t.me/techvyro",
    whatsappPopupEnabled: true,
    watermarkEnabled: true,
    watermarkText: "TechVyro PDF Library",
    watermarkOpacity: 30,
    watermarkPosition: "diagonal",
    downloadRequiresView: true,
    rateLimit: 10,
    adminPasswordLength: 8,
    emailOnNewReview: true,
    emailOnLowRating: true,
    emailOnHighDownloads: true,
    downloadThreshold: 100,
    telegramChatId: "",
  })

  const [heroSettings, setHeroSettings] = useState(DEFAULT_HERO_SETTINGS)

  const [homepageSettings, setHomepageSettings] = useState({
    libraryBadge: "Full Library",
    libraryTitle: "Explore All PDFs",
    librarySubtitle: "Filter by category or search for specific materials",
    ctaBadge: "Start Today — It's Free",
    ctaTitle: "Ready to Start Learning?",
    ctaDescription: "Browse study materials, practice quizzes, and prepare for your next exam with TechVyro.",
    ctaPrimaryBtn: "Browse All PDFs",
    ctaSecondaryBtn: "Get Updates on WhatsApp",
  })

  function adminHeaders() {
    return { "Content-Type": "application/json" }
  }

  useEffect(() => {
    let cancelled = false
    async function loadSettings() {
      setLoadingSettings(true)
      try {
        const responses = await Promise.allSettled([
          fetch("/api/site-settings?key=general_settings", { headers: adminHeaders() }),
          fetch("/api/site-settings?key=hero_settings", { headers: adminHeaders() }),
          fetch("/api/site-settings?key=homepage_settings", { headers: adminHeaders() }),
        ])
        const failed: string[] = []
        const names = ["general settings", "hero settings", "homepage settings"]
        const data = await Promise.all(responses.map(async (result, index) => {
          if (result.status === "rejected") {
            failed.push(names[index])
            return null
          }
          const response = result.value
          const value = await response.json().catch(() => ({}))
          if (!response.ok) {
            failed.push(names[index])
            return null
          }
          return value
        }))
        if (cancelled) return
        if (data[0]?.value) setSettings(s => ({ ...s, ...data[0].value }))
        if (data[1]?.value) setHeroSettings(normalizeHeroSettings(data[1].value))
        if (data[2]?.value) setHomepageSettings(s => ({ ...s, ...data[2].value }))
        setLoadError(failed.length ? `Unable to load ${failed.join(", ")}` : null)
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Unable to load settings")
      } finally {
        if (!cancelled) setLoadingSettings(false)
      }
    }
    loadSettings()
    return () => { cancelled = true }
  }, [loadAttempt])

  async function checkWebhookStatus() {
    setWebhookStatus("loading")
    try {
      const res = await fetch("/api/telegram/setup", { headers: adminHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setTelegramConfigured(false)
        setWebhookStatus("inactive")
        setWebhookUrl("")
        setWebhookBot(null)
        return
      }
      setTelegramConfigured(true)
      if (data.webhook?.url) {
        setWebhookStatus("active")
        setWebhookUrl(data.webhook.url)
        setWebhookBot(data.bot || null)
      } else {
        setWebhookStatus("inactive")
        setWebhookUrl("")
        setWebhookBot(data.bot || null)
      }
    } catch {
      setTelegramConfigured(false)
      setWebhookStatus("inactive")
    }
  }

  async function activateWebhook() {
    setWebhookStatus("loading")
    try {
      const res = await fetch("/api/telegram/setup", { method: "POST", headers: adminHeaders() })
      const data = await res.json()
      if (data.ok) {
        setWebhookStatus("active")
        setWebhookUrl(data.webhookUrl || "")
        toast.success("Telegram Auto-Upload Bot activated!")
      } else {
        toast.error(data.error || "Failed to activate webhook")
        setWebhookStatus("inactive")
      }
    } catch {
      toast.error("Failed to activate webhook")
      setWebhookStatus("inactive")
    }
  }

  async function deactivateWebhook() {
    setWebhookStatus("loading")
    try {
      const res = await fetch("/api/telegram/setup", { method: "DELETE", headers: adminHeaders() })
      const data = await res.json()
      if (data.ok) {
        setWebhookStatus("inactive")
        setWebhookUrl("")
        toast.success("Telegram bot deactivated")
      } else {
        toast.error("Failed to deactivate")
        setWebhookStatus("active")
      }
    } catch {
      toast.error("Failed to deactivate")
      setWebhookStatus("active")
    }
  }

  async function handleSave() {
    if (loadingSettings || loadError) {
      toast.error("Settings must load successfully before saving.")
      return
    }
    if (
      heroSettings.taglines.some(value => !value.trim()) ||
      heroSettings.trustStats.some(value => !value.trim())
    ) {
      toast.error("Hero taglines and trust stats cannot contain empty items.")
      return
    }
    setSaving(true)
    try {
      const response = await fetch("/api/site-settings", {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({
          general_settings: settings,
          hero_settings: heroSettings,
          homepage_settings: homepageSettings,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const errMsg = data.error || "Save failed"
        if (errMsg.includes("does not exist") || errMsg.includes("42P01")) {
          toast.error("Database table missing. Run the SQL setup script in your Supabase dashboard — see the Setup tab.", { duration: 6000 })
        } else {
          toast.error(`Failed to save: ${errMsg}`)
        }
        return
      }
      if (data.cacheRefreshed === false) {
        toast.warning("Settings saved, but cached pages could not be refreshed automatically.")
      } else {
        toast.success("Settings saved successfully and site cache refreshed!")
      }
    } catch {
      toast.error("Failed to save settings — check your database connection.")
    } finally {
      setSaving(false)
    }
  }

  async function copyToClipboard(text: string) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable")
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Copied to clipboard!")
    } catch {
      setCopied(false)
      toast.error("Unable to copy to clipboard. Please copy it manually.")
    }
  }

  function updateTagline(index: number, value: string) {
    const updated = [...heroSettings.taglines]
    updated[index] = value
    setHeroSettings(s => ({ ...s, taglines: updated }))
  }

  function addTagline() {
    setHeroSettings(s => ({ ...s, taglines: [...s.taglines, ""] }))
  }

  function removeTagline(index: number) {
    const updated = heroSettings.taglines.filter((_, i) => i !== index)
    setHeroSettings(s => ({ ...s, taglines: updated }))
  }

  function updateTrustStat(index: number, value: string) {
    const updated = [...heroSettings.trustStats]
    updated[index] = value
    setHeroSettings(s => ({ ...s, trustStats: updated }))
  }

  function addTrustStat() {
    setHeroSettings(s => ({ ...s, trustStats: [...s.trustStats, ""] }))
  }

  function removeTrustStat(index: number) {
    const updated = heroSettings.trustStats.filter((_, i) => i !== index)
    setHeroSettings(s => ({ ...s, trustStats: updated }))
  }

  if (loadingSettings) {
    return (
      <Card>
        <CardContent className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Loading current settings…
        </CardContent>
      </Card>
    )
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-5">
        <p className="font-medium">Settings could not be loaded</p>
        <p className="mt-1 text-sm text-muted-foreground">{loadError}. Nothing can be saved until current values load successfully.</p>
        <Button className="mt-4" variant="outline" onClick={() => setLoadAttempt(value => value + 1)}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              aria-pressed={isActive}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {section.title}
            </button>
          )
        })}
      </div>

      {/* General Settings */}
      {activeSection === "general" && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              General Settings
            </CardTitle>
            <CardDescription>
              Configure basic site information and branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input 
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => setSettings(s => ({ ...s, siteName: e.target.value }))}
                  placeholder="TechVyro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteTagline">Tagline</Label>
                <Input 
                  id="siteTagline"
                  value={settings.siteTagline}
                  onChange={(e) => setSettings(s => ({ ...s, siteTagline: e.target.value }))}
                  placeholder="PDF Library"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input 
                id="contactEmail"
                type="email"
                value={settings.contactEmail}
                onChange={(e) => setSettings(s => ({ ...s, contactEmail: e.target.value }))}
                placeholder="contact@example.com"
              />
              <p className="text-xs text-muted-foreground">Shown in the footer contact section</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mainWebsite">Main Website URL</Label>
              <div className="flex gap-2">
                <Input 
                  id="mainWebsite"
                  value={settings.mainWebsite}
                  onChange={(e) => setSettings(s => ({ ...s, mainWebsite: e.target.value }))}
                  placeholder="https://www.example.com"
                />
                {isSafeHttpUrl(settings.mainWebsite) ? (
                  <Button variant="outline" size="icon" asChild>
                    <a
                      href={settings.mainWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open main website"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" size="icon" disabled aria-label="Enter a valid website URL to open it">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Shown in footer quick links and contact section</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                Environment Status
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                  <span className="text-sm text-muted-foreground">Supabase</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                    Connected
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                  <span className="text-sm text-muted-foreground">Storage</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                    Active
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social Links Settings */}
      {activeSection === "social" && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Social Links
            </CardTitle>
            <CardDescription>
              These URLs appear in the footer and throughout the site. Changes are reflected live.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="instagramUrl" className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-500" />
                Instagram URL
              </Label>
              <div className="flex gap-2">
                <Input 
                  id="instagramUrl"
                  value={settings.instagramUrl}
                  onChange={(e) => setSettings(s => ({ ...s, instagramUrl: e.target.value }))}
                  placeholder="https://www.instagram.com/yourpage"
                />
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={isSafeHttpUrl(settings.instagramUrl) ? settings.instagramUrl : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open Instagram page"
                    aria-disabled={!isSafeHttpUrl(settings.instagramUrl)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebookUrl" className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-blue-600" />
                Facebook URL
              </Label>
              <div className="flex gap-2">
                <Input 
                  id="facebookUrl"
                  value={settings.facebookUrl}
                  onChange={(e) => setSettings(s => ({ ...s, facebookUrl: e.target.value }))}
                  placeholder="https://www.facebook.com/yourpage"
                />
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={isSafeHttpUrl(settings.facebookUrl) ? settings.facebookUrl : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open Facebook page"
                    aria-disabled={!isSafeHttpUrl(settings.facebookUrl)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappChannelUrl" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-500" />
                WhatsApp Channel URL
              </Label>
              <div className="flex gap-2">
                <Input 
                  id="whatsappChannelUrl"
                  value={settings.whatsappChannelUrl}
                  onChange={(e) => setSettings(s => ({ ...s, whatsappChannelUrl: e.target.value }))}
                  placeholder="https://whatsapp.com/channel/..."
                />
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={isSafeHttpUrl(settings.whatsappChannelUrl) ? settings.whatsappChannelUrl : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open WhatsApp channel"
                    aria-disabled={!isSafeHttpUrl(settings.whatsappChannelUrl)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Used in the popup, hero button, footer, and bottom CTA</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegramUrl" className="flex items-center gap-2">
                <Send className="h-4 w-4 text-sky-500" />
                Telegram URL
              </Label>
              <div className="flex gap-2">
                <Input 
                  id="telegramUrl"
                  value={settings.telegramUrl}
                  onChange={(e) => setSettings(s => ({ ...s, telegramUrl: e.target.value }))}
                  placeholder="https://t.me/yourchannel"
                />
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={isSafeHttpUrl(settings.telegramUrl) ? settings.telegramUrl : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open Telegram channel"
                    aria-disabled={!isSafeHttpUrl(settings.telegramUrl)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
              <div>
                <p className="font-medium">WhatsApp Popup</p>
                <p className="text-sm text-muted-foreground">
                  Show WhatsApp channel popup to visitors on page load
                </p>
              </div>
              <Switch
                checked={settings.whatsappPopupEnabled}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, whatsappPopupEnabled: checked }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hero Content Settings */}
      {activeSection === "hero" && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-violet-500" />
              Hero Content
            </CardTitle>
            <CardDescription>
              Customize the homepage hero section — taglines, stats badges, badge text, and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="badgeText">Badge Text</Label>
              <Input 
                id="badgeText"
                value={heroSettings.badgeText}
                onChange={(e) => setHeroSettings(s => ({ ...s, badgeText: e.target.value }))}
                placeholder="Free Educational Resources"
              />
              <p className="text-xs text-muted-foreground">Shown above the main heading (e.g. "Free Educational Resources")</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="heroDescription">Hero Description</Label>
              <textarea
                id="heroDescription"
                value={heroSettings.description}
                onChange={(e) => setHeroSettings(s => ({ ...s, description: e.target.value }))}
                placeholder="Discover our comprehensive collection..."
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
              <p className="text-xs text-muted-foreground">Paragraph shown below the main heading</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Rotating Taglines</Label>
                <Button variant="outline" size="sm" onClick={addTagline} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">These rotate automatically below the main heading</p>
              <div className="space-y-2">
                {heroSettings.taglines.map((tagline, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={tagline}
                      onChange={(e) => updateTagline(i, e.target.value)}
                      placeholder={`Tagline ${i + 1}`}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeTagline(i)}
                      disabled={heroSettings.taglines.length <= 1}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Trust Stat Badges</Label>
                <Button variant="outline" size="sm" onClick={addTrustStat} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Badges shown above the main heading (e.g. "10,000+ Students")</p>
              <div className="space-y-2">
                {heroSettings.trustStats.map((stat, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={stat}
                      onChange={(e) => updateTrustStat(i, e.target.value)}
                      placeholder={`Stat ${i + 1} (e.g. 10,000+ Students)`}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeTrustStat(i)}
                      disabled={heroSettings.trustStats.length <= 1}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="heroBtnText">Primary Button Text</Label>
                <Input 
                  id="heroBtnText"
                  value={heroSettings.heroBtnText}
                  onChange={(e) => setHeroSettings(s => ({ ...s, heroBtnText: e.target.value }))}
                  placeholder="Browse Library"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsappBtnText">WhatsApp Button Text</Label>
                <Input 
                  id="whatsappBtnText"
                  value={heroSettings.whatsappBtnText}
                  onChange={(e) => setHeroSettings(s => ({ ...s, whatsappBtnText: e.target.value }))}
                  placeholder="Join Updates"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Homepage Text Settings */}
      {activeSection === "homepage" && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-emerald-500" />
              Homepage Text
            </CardTitle>
            <CardDescription>
              Control the Library section and bottom CTA section text on the homepage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Library Section */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="h-5 w-5 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 text-xs font-bold">L</span>
                Library Section
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="libraryBadge">Badge Text</Label>
                  <Input
                    id="libraryBadge"
                    value={homepageSettings.libraryBadge}
                    onChange={(e) => setHomepageSettings(s => ({ ...s, libraryBadge: e.target.value }))}
                    placeholder="Full Library"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="libraryTitle">Section Title</Label>
                  <Input
                    id="libraryTitle"
                    value={homepageSettings.libraryTitle}
                    onChange={(e) => setHomepageSettings(s => ({ ...s, libraryTitle: e.target.value }))}
                    placeholder="Explore All PDFs"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="librarySubtitle">Section Subtitle</Label>
                  <Input
                    id="librarySubtitle"
                    value={homepageSettings.librarySubtitle}
                    onChange={(e) => setHomepageSettings(s => ({ ...s, librarySubtitle: e.target.value }))}
                    placeholder="Filter by category or search for specific materials"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* CTA Section */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="h-5 w-5 rounded-md bg-violet-500/10 flex items-center justify-center text-violet-500 text-xs font-bold">C</span>
                CTA Section (Bottom of Homepage)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ctaBadge">Badge Text</Label>
                  <Input
                    id="ctaBadge"
                    value={homepageSettings.ctaBadge}
                    onChange={(e) => setHomepageSettings(s => ({ ...s, ctaBadge: e.target.value }))}
                    placeholder="Start Today — It's Free"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctaTitle">Heading</Label>
                  <Input
                    id="ctaTitle"
                    value={homepageSettings.ctaTitle}
                    onChange={(e) => setHomepageSettings(s => ({ ...s, ctaTitle: e.target.value }))}
                    placeholder="Ready to Start Learning?"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="ctaDescription">Description</Label>
                  <Input
                    id="ctaDescription"
                    value={homepageSettings.ctaDescription}
                    onChange={(e) => setHomepageSettings(s => ({ ...s, ctaDescription: e.target.value }))}
                    placeholder="Join thousands of students who trust TechVyro..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctaPrimaryBtn">Primary Button Text</Label>
                  <Input
                    id="ctaPrimaryBtn"
                    value={homepageSettings.ctaPrimaryBtn}
                    onChange={(e) => setHomepageSettings(s => ({ ...s, ctaPrimaryBtn: e.target.value }))}
                    placeholder="Browse All PDFs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctaSecondaryBtn">WhatsApp Button Text</Label>
                  <Input
                    id="ctaSecondaryBtn"
                    value={homepageSettings.ctaSecondaryBtn}
                    onChange={(e) => setHomepageSettings(s => ({ ...s, ctaSecondaryBtn: e.target.value }))}
                    placeholder="Get Updates on WhatsApp"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Watermark Settings */}
      {activeSection === "watermark" && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Watermark Settings
            </CardTitle>
            <CardDescription>
              Configure how watermarks appear on downloaded PDFs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3">
                {settings.watermarkEnabled ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                    <Lock className="h-5 w-5 text-blue-500" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                    <Unlock className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">Watermark Protection</p>
                  <p className="text-sm text-muted-foreground">
                    {settings.watermarkEnabled ? "PDFs will include a watermark" : "PDFs download without watermark"}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.watermarkEnabled}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, watermarkEnabled: checked }))}
              />
            </div>

            {settings.watermarkEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="watermarkText">Watermark Text</Label>
                  <Input 
                    id="watermarkText"
                    value={settings.watermarkText}
                    onChange={(e) => setSettings(s => ({ ...s, watermarkText: e.target.value }))}
                    placeholder="Your Watermark Text"
                  />
                  <p className="text-xs text-muted-foreground">This text will appear on every page of downloaded PDFs</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="watermarkOpacity">Opacity ({settings.watermarkOpacity}%)</Label>
                  <input
                    type="range"
                    id="watermarkOpacity"
                    min="10"
                    max="80"
                    value={settings.watermarkOpacity}
                    onChange={(e) => setSettings(s => ({ ...s, watermarkOpacity: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtle (10%)</span>
                    <span>Visible (80%)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Position</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["diagonal", "center", "footer"].map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setSettings(s => ({ ...s, watermarkPosition: pos }))}
                        className={`p-3 rounded-lg border text-sm font-medium capitalize transition-all ${
                          settings.watermarkPosition === pos
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 hover:border-primary/50"
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="relative aspect-[3/4] max-w-[200px] bg-card border border-border/50 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <div className="w-full space-y-2">
                        <div className="h-2 bg-muted rounded w-full" />
                        <div className="h-2 bg-muted rounded w-3/4" />
                        <div className="h-2 bg-muted rounded w-5/6" />
                        <div className="h-2 bg-muted rounded w-2/3" />
                      </div>
                    </div>
                    <div 
                      className={`absolute inset-0 flex items-center justify-center text-xs font-medium text-primary pointer-events-none ${
                        settings.watermarkPosition === "diagonal" ? "rotate-[-35deg]" : ""
                      } ${settings.watermarkPosition === "footer" ? "items-end pb-2" : ""}`}
                      style={{ opacity: settings.watermarkOpacity / 100 }}
                    >
                      {settings.watermarkText}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Settings */}
      {activeSection === "security" && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Configure access control and protection measures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-600">Admin Password</p>
                  <p className="text-xs text-muted-foreground">
                    The admin password is set via the ADMIN_PASSWORD environment variable. 
                    To change it, update the variable in your Replit project secrets.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
              <div>
                <p className="font-medium">Require View Before Download</p>
                <p className="text-sm text-muted-foreground">
                  Users must view a PDF before downloading
                </p>
              </div>
              <Switch
                checked={settings.downloadRequiresView}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, downloadRequiresView: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rateLimit">Download Rate Limit (per hour)</Label>
              <Input 
                id="rateLimit"
                type="number"
                min="1"
                max="100"
                value={settings.rateLimit}
                onChange={(e) => setSettings(s => ({ ...s, rateLimit: parseInt(e.target.value) || 10 }))}
              />
              <p className="text-xs text-muted-foreground">Maximum downloads per IP address per hour</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Security Resources</h4>
              <div className="grid gap-2">
                <a 
                  href="https://supabase.com/docs/guides/auth/row-level-security" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/50 transition-colors group"
                >
                  <span className="text-sm">Supabase RLS Documentation</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </a>
                <a 
                  href="https://docs.replit.com/category/deployments" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/50 transition-colors group"
                >
                  <span className="text-sm">Replit Deployment Docs</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      {activeSection === "notifications" && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Notification Settings
            </CardTitle>
            <CardDescription>
              Configure Telegram alerts for new PDF uploads and quiz results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Telegram Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold text-sm">Telegram Bot Notifications</h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Live</Badge>
              </div>

              <div className={`p-4 rounded-lg border ${telegramConfigured === true ? "bg-green-500/10 border-green-500/30" : "bg-muted/30 border-border/50"}`}>
                <div className="flex gap-3">
                  <Info className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium">
                      {telegramConfigured === true ? "Telegram bot token verified" : telegramConfigured === false ? "Telegram bot is not available" : "Telegram configuration not checked"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {telegramConfigured === true
                        ? "Add a numeric Chat ID below to receive alerts."
                        : "Use Check Status below to securely verify the bot token and webhook."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Telegram Chat ID</Label>
                <Input
                  value={settings.telegramChatId}
                  onChange={e => setSettings(s => ({ ...s, telegramChatId: e.target.value }))}
                   placeholder="-100123456789"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Add your bot to a channel/group, then use <code className="bg-muted px-1 rounded">@userinfobot</code> to get the Chat ID. For channels, it starts with <code className="bg-muted px-1 rounded">-100</code>.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                  <p className="text-xs font-medium mb-1">📄 New PDF Alert</p>
                  <p className="text-xs text-muted-foreground">Sent when admin uploads a new PDF — includes title, category, and file size.</p>
                </div>
                <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                  <p className="text-xs font-medium mb-1">🏆 Quiz Result Alert</p>
                  <p className="text-xs text-muted-foreground">Sent when a student completes a quiz — includes name, score, and percentage.</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Telegram Auto-Upload Bot */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-violet-500" />
                <h3 className="font-semibold text-sm">Telegram Auto-Upload Bot</h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-violet-500/10 text-violet-600">AI Powered</Badge>
              </div>

              <div className="p-4 rounded-lg bg-violet-500/8 border border-violet-500/20">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Send any PDF to your Telegram bot and it will <b>automatically upload</b> it to TechVyro —
                  AI will detect the <b>title</b>, <b>category</b>, <b>description</b>, and <b>tags</b> from the filename.
                  No manual data entry needed.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-2 text-xs">
                <div className="p-3 rounded-lg border border-border/40 bg-muted/20 text-center">
                  <div className="text-lg mb-1">📤</div>
                  <p className="font-medium">Send PDF to Bot</p>
                  <p className="text-muted-foreground mt-0.5">Via Telegram</p>
                </div>
                <div className="p-3 rounded-lg border border-border/40 bg-muted/20 text-center">
                  <div className="text-lg mb-1">🤖</div>
                  <p className="font-medium">AI Analyzes</p>
                  <p className="text-muted-foreground mt-0.5">Title + Category + Tags</p>
                </div>
                <div className="p-3 rounded-lg border border-border/40 bg-muted/20 text-center">
                  <div className="text-lg mb-1">✅</div>
                  <p className="font-medium">Auto Published</p>
                  <p className="text-muted-foreground mt-0.5">On TechVyro</p>
                </div>
              </div>

              {webhookStatus === "active" && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 space-y-1">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500 inline-block animate-pulse" />
                    Bot is Active
                    {webhookBot?.username && <span className="font-normal text-muted-foreground">— @{webhookBot.username}</span>}
                  </p>
                  {webhookUrl && (
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{webhookUrl}</p>
                  )}
                </div>
              )}

              {webhookStatus === "inactive" && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    ⚠️ Bot webhook is not active. Click <b>Activate Bot</b> to enable auto-upload.
                    {webhookBot?.username && <span className="ml-1">Bot: @{webhookBot.username}</span>}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                <b>Note:</b> Make sure your <code className="bg-muted px-1 rounded">TELEGRAM_BOT_TOKEN</code> and <b>Chat ID</b> above are configured before activating.
                Only messages from your Chat ID will be processed (security).
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={checkWebhookStatus}
                  disabled={webhookStatus === "loading"}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${webhookStatus === "loading" ? "animate-spin" : ""}`} />
                  Check Status
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={activateWebhook}
                  disabled={webhookStatus === "loading" || webhookStatus === "active"}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Activate Bot
                </Button>
                {webhookStatus === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={deactivateWebhook}
                  >
                    Deactivate
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-muted-foreground">Email Notifications</h3>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Coming Soon</Badge>
              </div>
              <div className="space-y-3 opacity-60 pointer-events-none">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <p className="font-medium text-sm">New Review Notifications</p>
                    <p className="text-xs text-muted-foreground">Get notified when users submit new reviews</p>
                  </div>
                  <Switch checked={settings.emailOnNewReview} disabled />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <p className="font-medium text-sm">Low Rating Alerts</p>
                    <p className="text-xs text-muted-foreground">Alert when a PDF receives 1–2 star rating</p>
                  </div>
                  <Switch checked={settings.emailOnLowRating} disabled />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <p className="font-medium text-sm">High Download Milestone</p>
                    <p className="text-xs text-muted-foreground">Celebrate when a PDF hits {settings.downloadThreshold}+ downloads</p>
                  </div>
                  <Switch checked={settings.emailOnHighDownloads} disabled />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DB Setup Section */}
      {activeSection === "setup" && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-500" />
              Database Setup
            </CardTitle>
            <CardDescription>
              Run these SQL scripts in your Supabase SQL Editor to create all required tables.
              Go to: <strong>Supabase Dashboard → SQL Editor → New Query</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-600">If settings are failing to save</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The <code className="font-mono bg-muted px-1 rounded">site_settings</code> table may not exist in your Supabase database. Run the SQL below to fix it.
                </p>
              </div>
            </div>

            {[
              {
                label: "Script 1 — Core Tables (categories, pdfs)",
                filename: "001_create_tables.sql",
                sql: `CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#8B5CF6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow public read access on categories" ON categories FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow public read access on pdfs" ON pdfs FOR SELECT USING (true);`
              },
              {
                label: "Script 2 — Site Settings (fixes save error)",
                filename: "005_create_site_settings.sql",
                sql: `CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on site_settings" ON site_settings;
DROP POLICY IF EXISTS "Allow upsert on site_settings" ON site_settings;
DROP POLICY IF EXISTS "Allow update on site_settings" ON site_settings;
REVOKE ALL ON TABLE site_settings FROM PUBLIC, anon, authenticated;`
              },
              {
                label: "Script 3 — Reviews",
                filename: "003_add_reviews.sql",
                sql: `CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id UUID NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
  user_name VARCHAR(100) NOT NULL,
  user_id TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_per_user_pdf
  ON reviews(pdf_id, user_id) WHERE user_id IS NOT NULL;

CREATE POLICY "Visible PDF reviews are publicly readable"
  ON reviews FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM pdfs
    WHERE pdfs.id = reviews.pdf_id
      AND pdfs.visibility IN ('public', 'unlisted')
      AND (pdfs.scheduled_at IS NULL OR pdfs.scheduled_at <= NOW())
  ));

CREATE POLICY "Authenticated users insert own reviews"
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::TEXT);`
              },
              {
                label: "Script 4 — Quiz Tables",
                filename: "004_create_quiz_tables.sql",
                sql: `CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  time_limit INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  time_taken INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Allow public read on quizzes" ON quizzes FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow public read on quiz_results" ON quiz_results FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Allow public insert on quiz_results" ON quiz_results FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
              },
            ].map(({ label, filename, sql }) => (
              <div key={filename} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{label}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(sql)
                      toast.success(`Copied ${filename}!`)
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    Copy SQL
                  </Button>
                </div>
                <pre className="text-[11px] bg-muted/60 rounded-lg p-3 overflow-x-auto border border-border/50 text-muted-foreground leading-relaxed max-h-40 overflow-y-auto">
                  {sql}
                </pre>
              </div>
            ))}

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 flex gap-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-blue-600">How to run</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Open your Supabase project dashboard</li>
                  <li>Go to <strong>SQL Editor</strong> in the left sidebar</li>
                  <li>Click <strong>New Query</strong></li>
                  <li>Paste the SQL above and click <strong>Run</strong></li>
                  <li>Repeat for each script in order</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
          <Button
            onClick={handleSave}
             disabled={saving || loadingSettings || !!loadError}
            className="gap-2 px-6"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
       )}
          </Button>
      </div>
    </div>
  )
}
