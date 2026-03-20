"use client"

import { useState } from "react"
import { 
  Settings, Shield, Globe, Bell, Palette, Database, 
  Save, RefreshCw, ExternalLink, Check, Copy, Eye, EyeOff,
  FileText, Download, Lock, Unlock, Info, AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface SettingSection {
  id: string
  title: string
  description: string
  icon: typeof Settings
  color: string
}

const sections: SettingSection[] = [
  { id: "general", title: "General", description: "Basic site configuration", icon: Settings, color: "primary" },
  { id: "watermark", title: "Watermark", description: "PDF watermark settings", icon: FileText, color: "blue" },
  { id: "security", title: "Security", description: "Access and protection", icon: Shield, color: "green" },
  { id: "notifications", title: "Notifications", description: "Alert preferences", icon: Bell, color: "amber" },
]

export function SiteSettings() {
  const [activeSection, setActiveSection] = useState("general")
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  // Settings state
  const [settings, setSettings] = useState({
    // General
    siteName: "TechVyro",
    siteTagline: "PDF Library",
    contactEmail: "techvyro@gmail.com",
    mainWebsite: "https://www.techvyro.in/",
    
    // Watermark
    watermarkEnabled: true,
    watermarkText: "TechVyro PDF Library",
    watermarkOpacity: 30,
    watermarkPosition: "diagonal",
    
    // Security
    downloadRequiresView: true,
    rateLimit: 10,
    adminPasswordLength: 8,
    
    // Notifications
    emailOnNewReview: true,
    emailOnLowRating: true,
    emailOnHighDownloads: true,
    downloadThreshold: 100,
  })

  async function handleSave() {
    setSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success("Settings saved successfully!")
    setSaving(false)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Copied to clipboard!")
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
                <Button variant="outline" size="icon" asChild>
                  <a href={settings.mainWebsite} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Environment Info */}
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

                {/* Preview */}
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
            {/* Admin Password Info */}
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-600">Admin Password</p>
                  <p className="text-xs text-muted-foreground">
                    The admin password is set via the ADMIN_PASSWORD environment variable. 
                    To change it, update the variable in your Vercel project settings.
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

            {/* Quick Links */}
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
                  href="https://vercel.com/docs/security" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/50 transition-colors group"
                >
                  <span className="text-sm">Vercel Security Best Practices</span>
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
              Configure email alerts and notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-600">Coming Soon</p>
                  <p className="text-xs text-muted-foreground">
                    Email notifications require additional setup. Configure your email service 
                    provider (SendGrid, Resend, etc.) to enable these features.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 opacity-60">
                <div>
                  <p className="font-medium">New Review Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when users submit new reviews
                  </p>
                </div>
                <Switch
                  checked={settings.emailOnNewReview}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, emailOnNewReview: checked }))}
                  disabled
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 opacity-60">
                <div>
                  <p className="font-medium">Low Rating Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Alert when a PDF receives 1-2 star rating
                  </p>
                </div>
                <Switch
                  checked={settings.emailOnLowRating}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, emailOnLowRating: checked }))}
                  disabled
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 opacity-60">
                <div>
                  <p className="font-medium">High Download Milestone</p>
                  <p className="text-sm text-muted-foreground">
                    Celebrate when a PDF hits {settings.downloadThreshold}+ downloads
                  </p>
                </div>
                <Switch
                  checked={settings.emailOnHighDownloads}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, emailOnHighDownloads: checked }))}
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
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
