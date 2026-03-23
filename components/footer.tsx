"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { FileText, Mail, Globe, Heart } from "lucide-react"

const DEFAULTS = {
  instagramUrl: "https://www.instagram.com/techvyro",
  facebookUrl: "https://www.facebook.com/share/187KsWWacM/?mibextid=wwXIfr",
  whatsappChannelUrl: "https://whatsapp.com/channel/0029Vadk2XHLSmbX3oEVmX37",
  telegramUrl: "https://t.me/techvyro",
  contactEmail: "techvyro@gmail.com",
  mainWebsite: "https://www.techvyro.in/",
  siteName: "TechVyro",
  siteTagline: "PDF Library",
}

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
)

export function Footer() {
  const [s, setS] = useState(DEFAULTS)

  useEffect(() => {
    fetch("/api/site-settings?key=general_settings")
      .then(r => r.json())
      .then(data => {
        if (data.value) setS(prev => ({ ...prev, ...data.value }))
      })
      .catch(() => {})
  }, [])

  const socialLinks = [
    { name: "Instagram", href: s.instagramUrl, Icon: InstagramIcon, color: "hover:bg-gradient-to-br hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888]" },
    { name: "Facebook", href: s.facebookUrl, Icon: FacebookIcon, color: "hover:bg-[#1877f2]" },
    { name: "WhatsApp", href: s.whatsappChannelUrl, Icon: WhatsAppIcon, color: "hover:bg-[#25D366]" },
    { name: "Telegram", href: s.telegramUrl, Icon: TelegramIcon, color: "hover:bg-[#0088cc]" },
  ]

  const quickLinks = [
    { name: "Home", href: "/" },
    { name: "Quiz Portal", href: "/quiz" },
    { name: "About Us", href: "/about" },
    { name: "Admin Panel", href: "/admin" },
    { name: "Main Website", href: s.mainWebsite, external: true },
  ]

  return (
    <footer className="relative border-t border-border/40 bg-gradient-to-b from-background to-muted/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(120,80,200,0.05),transparent)] pointer-events-none" />
      
      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-5">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-bold">
                  <span className="text-[#ef4444]">{s.siteName.slice(0, 4)}</span>
                  <span className="text-foreground">{s.siteName.slice(4)}</span>
                </span>
                <p className="text-[10px] text-muted-foreground">{s.siteTagline}</p>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your go-to destination for educational PDFs. Free downloads with watermark protection. Quality content curated for learners.
            </p>
            <div className="flex gap-2 pt-1">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border/50 hover:text-white hover:border-transparent transition-all duration-300 ${social.color}`}
                  aria-label={social.name}
                >
                  <social.Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Quick Links
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a 
                      href={link.href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 hover:text-primary hover:translate-x-1 transition-all duration-200"
                    >
                      <span className="h-px w-3 bg-border" />
                      {link.name}
                    </a>
                  ) : (
                    <Link 
                      href={link.href}
                      className="inline-flex items-center gap-2 hover:text-primary hover:translate-x-1 transition-all duration-200"
                    >
                      <span className="h-px w-3 bg-border" />
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Contact Us
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a 
                  href={`mailto:${s.contactEmail}`}
                  className="flex items-center gap-3 hover:text-primary transition-colors group"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border/50 group-hover:border-primary/30 transition-colors">
                    <Mail className="h-4 w-4" />
                  </span>
                  {s.contactEmail}
                </a>
              </li>
              <li>
                <a 
                  href={s.mainWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 hover:text-primary transition-colors group"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border/50 group-hover:border-primary/30 transition-colors">
                    <Globe className="h-4 w-4" />
                  </span>
                  {s.mainWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              </li>
            </ul>
          </div>

          {/* WhatsApp CTA */}
          <div className="space-y-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
              Stay Updated
            </h3>
            <p className="text-sm text-muted-foreground">
              Join our WhatsApp channel for exclusive updates, new PDF releases, and tech tips.
            </p>
            <a
              href={s.whatsappChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] text-white text-sm font-medium hover:bg-[#20bd5a] shadow-lg shadow-[#25D366]/20 hover:shadow-xl hover:shadow-[#25D366]/30 hover:-translate-y-0.5 transition-all duration-300"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Join Channel
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <p className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 text-center">
            <span>&copy; {new Date().getFullYear()}</span>
            <span className="font-semibold">
              <span className="text-[#ef4444]">{s.siteName.slice(0, 4)}</span>
              <span className="text-foreground">{s.siteName.slice(4)}</span>
            </span>
            <span className="hidden sm:inline">All rights reserved.</span>
          </p>
          <p className="flex items-center gap-2 text-[10px] sm:text-xs">
            <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#ef4444] fill-[#ef4444]" />
            Made with care for education
          </p>
        </div>
      </div>
    </footer>
  )
}
