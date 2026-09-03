import { NextResponse } from "next/server"
import { z } from "zod"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { isSafeHttpUrl } from "@/lib/homepage-settings"

const MAX_BODY_BYTES = 256 * 1024
const shortText = z.string().max(200)
const longText = z.string().max(2_000)
const nonEmptyShortText = z.string().trim().min(1).max(200)
const url = z.string().max(2_000).refine(value => isSafeHttpUrl(value), "Only HTTP(S) URLs are allowed")
const imageUrl = z.string().min(1).max(2_000).refine(value => isSafeHttpUrl(value, true), "Only HTTPS image URLs are allowed")

const generalSettingsSchema = z.object({
  siteName: shortText,
  siteTagline: shortText,
  contactEmail: z.string().email().max(320),
  mainWebsite: url,
  instagramUrl: url,
  facebookUrl: url,
  whatsappChannelUrl: url,
  telegramUrl: url,
  whatsappPopupEnabled: z.boolean(),
  watermarkEnabled: z.boolean(),
  watermarkText: shortText,
  watermarkOpacity: z.number().finite().min(0).max(100),
  watermarkPosition: z.enum(["diagonal", "center", "header", "footer"]),
  downloadRequiresView: z.boolean(),
  rateLimit: z.number().int().min(1).max(10_000),
  adminPasswordLength: z.number().int().min(1).max(1_000),
  emailOnNewReview: z.boolean(),
  emailOnLowRating: z.boolean(),
  emailOnHighDownloads: z.boolean(),
  downloadThreshold: z.number().int().min(0).max(10_000_000),
  telegramChatId: z.string().max(21).regex(/^(?:-?\d{1,20})?$/),
}).strict()

const heroSettingsSchema = z.object({
  taglines: z.array(nonEmptyShortText).min(1).max(20).optional(),
  trustStats: z.array(nonEmptyShortText).min(1).max(20).optional(),
  badgeText: shortText.optional(),
  description: longText.optional(),
  heroBtnText: shortText.optional(),
  whatsappBtnText: shortText.optional(),
  title: shortText.optional(),
  subtitle: longText.optional(),
  showStats: z.boolean().optional(),
  showSearch: z.boolean().optional(),
  backgroundStyle: z.enum(["gradient", "solid", "pattern"]).optional(),
}).strict()

const homepageSettingsSchema = z.object({
  libraryBadge: shortText,
  libraryTitle: shortText,
  librarySubtitle: longText,
  ctaBadge: shortText,
  ctaTitle: shortText,
  ctaDescription: longText,
  ctaPrimaryBtn: shortText,
  ctaSecondaryBtn: shortText,
}).strict()

const featuredPdfsSchema = z.array(z.object({
  pdfId: z.string().min(1).max(200),
  order: z.number().int().min(0).max(100),
}).strict()).max(6)

const announcementSchema = z.object({
  id: z.string().min(1).max(200),
  title: shortText,
  message: longText,
  type: z.enum(["info", "success", "warning", "error"]),
  link: url.optional(),
  linkText: shortText.optional(),
  enabled: z.boolean(),
  createdAt: z.string().max(100),
}).strict()

const testimonialSchema = z.object({
  id: z.string().min(1).max(200),
  name: shortText,
  course: shortText,
  avatar: imageUrl,
  rating: z.number().int().min(1).max(5),
  comment: longText,
  verified: z.boolean(),
  enabled: z.boolean(),
  createdAt: z.string().max(100),
}).strict()
const publicTestimonialsSchema = z.array(testimonialSchema.strip()).max(100)

const settingsUpdateSchema = z.object({
  general_settings: generalSettingsSchema.optional(),
  hero_settings: heroSettingsSchema.optional(),
  homepage_settings: homepageSettingsSchema.optional(),
  featured_pdfs: featuredPdfsSchema.optional(),
  announcements: z.array(announcementSchema).max(50).optional(),
  testimonials: z.array(testimonialSchema).max(100).optional(),
}).strict().refine(value => Object.keys(value).length > 0)

const PUBLIC_FIELDS = {
  general_settings: [
    "siteName", "siteTagline", "contactEmail", "mainWebsite", "instagramUrl",
    "facebookUrl", "whatsappChannelUrl", "telegramUrl", "whatsappPopupEnabled",
  ],
  hero_settings: [
    "taglines", "trustStats", "badgeText", "description", "heroBtnText", "whatsappBtnText",
  ],
  homepage_settings: [
    "libraryBadge", "libraryTitle", "librarySubtitle", "ctaBadge", "ctaTitle",
    "ctaDescription", "ctaPrimaryBtn", "ctaSecondaryBtn",
  ],
  testimonials: null,
} as const

type PublicKey = keyof typeof PUBLIC_FIELDS

function isPublicKey(key: string): key is PublicKey {
  return Object.prototype.hasOwnProperty.call(PUBLIC_FIELDS, key)
}

function publicValue(key: PublicKey, value: unknown): unknown {
  const fields = PUBLIC_FIELDS[key]
  if (fields === null) {
    if (!Array.isArray(value)) return null
    return value.flatMap(item => {
      const parsed = testimonialSchema.safeParse(item)
      return parsed.success ? [parsed.data] : []
    }).slice(0, 100)
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const source = value as Record<string, unknown>
  const shape = key === "general_settings"
    ? generalSettingsSchema.shape
    : key === "hero_settings"
      ? heroSettingsSchema.shape
      : homepageSettingsSchema.shape
  const validators = shape as Record<string, z.ZodTypeAny>
  return Object.fromEntries(fields.flatMap(field => {
    if (!(field in source)) return []
    const parsed = validators[field]?.safeParse(source[field])
    return parsed?.success ? [[field, parsed.data]] : []
  }))
}

function adminValue(key: string, value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const schema = key === "general_settings"
    ? generalSettingsSchema.partial()
    : key === "hero_settings"
      ? heroSettingsSchema
      : key === "homepage_settings"
        ? homepageSettingsSchema.partial()
        : null
  if (!schema) return value
  const parsed = schema.safeParse(value)
  return parsed.success ? parsed.data : null
}

async function readLimitedJson(request: Request): Promise<{ value?: unknown; error?: string; status?: number }> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return { error: "Content-Type must be application/json", status: 415 }
  }
  const declaredSize = Number(request.headers.get("content-length") || 0)
  if (declaredSize > MAX_BODY_BYTES) return { error: "Request body is too large", status: 413 }
  if (!request.body) return { error: "Invalid request", status: 400 }
  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ""
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    bytes += value.byteLength
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel()
      return { error: "Request body is too large", status: 413 }
    }
    text += decoder.decode(value, { stream: true })
  }
  text += decoder.decode()
  try {
    return { value: JSON.parse(text) }
  } catch {
    return { error: "Invalid request", status: 400 }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")
  const isAdmin = verifyAdminToken(extractToken(request))

  try {
    // Settings are private at the database layer. This server route uses the
    // service role and projects only explicitly allowlisted fields publicly.
    const supabase = createAdminClient()

    if (key) {
      if (!isAdmin && !isPublicKey(key)) {
        return NextResponse.json({ value: null })
      }

      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle()
      if (error) return NextResponse.json({ error: "Failed to load setting" }, { status: 500 })

      const value = isAdmin ? adminValue(key, data?.value) : publicValue(key as PublicKey, data?.value)
      if (isAdmin && data && value === null) {
        return NextResponse.json({ error: "Stored setting is invalid" }, { status: 500 })
      }
      return NextResponse.json({ value: value ?? null })
    }

    const { data, error } = await supabase.from("site_settings").select("key, value")
    if (error) return NextResponse.json({ error: "Failed to load settings" }, { status: 500 })

    const settings: Record<string, unknown> = {}
    for (const row of data ?? []) {
      if (isAdmin) settings[row.key] = row.value
      else if (isPublicKey(row.key)) settings[row.key] = publicValue(row.key, row.value)
    }
    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await readLimitedJson(request)
    if (body.error) return NextResponse.json({ error: body.error }, { status: body.status })
    const parsed = settingsUpdateSchema.safeParse(body.value)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const entries = Object.entries(parsed.data).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }))

    const supabase = createAdminClient()
    const { error } = await supabase.from("site_settings").upsert(entries, { onConflict: "key" })
    if (error) {
      return NextResponse.json({ error: "Unable to save settings" }, { status: 500 })
    }

    let cacheRefreshed = true
    try {
      revalidatePath("/", "layout")
    } catch (error) {
      cacheRefreshed = false
      console.error("[site-settings] homepage revalidation failed:", error)
    }
    return NextResponse.json({ success: true, cacheRefreshed })
  } catch {
    return NextResponse.json({ error: "Unable to save settings" }, { status: 500 })
  }
}