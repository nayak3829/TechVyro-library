export interface HeroSettings {
  taglines: string[]
  trustStats: string[]
  badgeText: string
  description: string
  heroBtnText: string
  whatsappBtnText: string
}

export const DEFAULT_HERO_SETTINGS: HeroSettings = {
  taglines: [
    "Explore Curated Knowledge",
    "Attempt Free Mock Tests",
    "Practice with Quiz Portal",
    "Learn Without Limits",
    "Download Quality PDFs",
  ],
  trustStats: ["Free Resources", "Browse by Subject", "Learn at Your Pace"],
  badgeText: "Free Educational Resources",
  description: "Free PDFs, quiz portal, and live mock tests — all under one roof. Browse study materials, test your knowledge, and prepare smarter for every exam.",
  heroBtnText: "Browse Library",
  whatsappBtnText: "Join Updates",
}

export interface HomepageTextSettings {
  libraryBadge: string
  libraryTitle: string
  librarySubtitle: string
  ctaBadge: string
  ctaTitle: string
  ctaDescription: string
  ctaPrimaryBtn: string
  ctaSecondaryBtn: string
}

export const DEFAULT_HOMEPAGE_SETTINGS: HomepageTextSettings = {
  libraryBadge: "Full Library",
  libraryTitle: "Explore All PDFs",
  librarySubtitle: "Filter by category or search for specific materials",
  ctaBadge: "Start Today — It's Free",
  ctaTitle: "Ready to Start Learning?",
  ctaDescription: "Browse study materials, practice quizzes, and prepare for your next exam with TechVyro.",
  ctaPrimaryBtn: "Browse All PDFs",
  ctaSecondaryBtn: "Get Updates on WhatsApp",
}

export function isSafeHttpUrl(value: string, httpsOnly = false): boolean {
  if (value === "") return true
  try {
    const protocol = new URL(value).protocol
    return httpsOnly ? protocol === "https:" : protocol === "https:" || protocol === "http:"
  } catch {
    return false
  }
}

export function normalizeHeroSettings(value: unknown): HeroSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_HERO_SETTINGS, taglines: [...DEFAULT_HERO_SETTINGS.taglines], trustStats: [...DEFAULT_HERO_SETTINGS.trustStats] }
  }
  const input = value as Partial<Record<keyof HeroSettings, unknown>>
  const text = (key: keyof Omit<HeroSettings, "taglines" | "trustStats">) =>
    typeof input[key] === "string" && input[key].trim()
      ? input[key].trim().slice(0, key === "description" ? 2_000 : 200)
      : DEFAULT_HERO_SETTINGS[key]
  const list = (key: "taglines" | "trustStats") =>
    Array.isArray(input[key])
      ? input[key].filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
        .map(item => item.trim().slice(0, 200)).slice(0, 20)
      : [...DEFAULT_HERO_SETTINGS[key]]

  return {
    taglines: list("taglines"),
    trustStats: list("trustStats"),
    badgeText: text("badgeText"),
    description: text("description"),
    heroBtnText: text("heroBtnText"),
    whatsappBtnText: text("whatsappBtnText"),
  }
}

export function normalizeHomepageSettings(value: unknown): HomepageTextSettings {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const text = (key: keyof HomepageTextSettings, max: number) =>
    typeof input[key] === "string" && input[key].trim()
      ? input[key].trim().slice(0, max)
      : DEFAULT_HOMEPAGE_SETTINGS[key]
  return {
    libraryBadge: text("libraryBadge", 200),
    libraryTitle: text("libraryTitle", 200),
    librarySubtitle: text("librarySubtitle", 2_000),
    ctaBadge: text("ctaBadge", 200),
    ctaTitle: text("ctaTitle", 200),
    ctaDescription: text("ctaDescription", 2_000),
    ctaPrimaryBtn: text("ctaPrimaryBtn", 200),
    ctaSecondaryBtn: text("ctaSecondaryBtn", 200),
  }
}