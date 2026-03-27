import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const SPLIT_PAGES_THRESHOLD = 100  // split if PDF has more than 100 pages
const PAGES_PER_PART = 60          // ~60 pages per part after split

async function tgPost(method: string, body: object) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return res.json()
  } catch {
    return { ok: false }
  }
}

async function sendMsg(chatId: number | string, text: string, replyTo?: number) {
  return tgPost("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyTo ? { reply_to_message_id: replyTo } : {}),
  })
}

async function editMsg(chatId: number | string, messageId: number, text: string) {
  return tgPost("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  })
}

async function getAuthorizedChatId(supabase: ReturnType<typeof createAdminClient>): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "general_settings")
      .single()
    const settings = data?.value as Record<string, string> | null
    return settings?.telegramChatId || null
  } catch {
    return null
  }
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function cleanFilename(filename: string): string {
  return filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim()
}

// Split a PDF buffer into multiple parts using pdf-lib
async function splitPdfBuffer(
  buffer: ArrayBuffer,
  baseName: string
): Promise<{ bytes: Uint8Array; filename: string; partNum: number; totalParts: number; pages: number }[]> {
  const { PDFDocument } = await import("pdf-lib")
  const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const totalPages = sourcePdf.getPageCount()

  if (totalPages === 0) throw new Error("PDF has no pages")

  // No split needed
  if (totalPages <= SPLIT_PAGES_THRESHOLD) {
    const bytes = new Uint8Array(buffer)
    return [{ bytes, filename: `${baseName}.pdf`, partNum: 1, totalParts: 1, pages: totalPages }]
  }

  const totalParts = Math.ceil(totalPages / PAGES_PER_PART)
  const parts: { bytes: Uint8Array; filename: string; partNum: number; totalParts: number; pages: number }[] = []

  for (let i = 0; i < totalPages; i += PAGES_PER_PART) {
    const endPage = Math.min(i + PAGES_PER_PART, totalPages)
    const pageIndices = Array.from({ length: endPage - i }, (_, idx) => i + idx)
    const partNum = parts.length + 1

    const partDoc = await PDFDocument.create()
    const copiedPages = await partDoc.copyPages(sourcePdf, pageIndices)
    copiedPages.forEach((page: import("pdf-lib").PDFPage) => partDoc.addPage(page))

    const partBytes = await partDoc.save()
    const filename = `${baseName} - Part ${partNum} of ${totalParts}.pdf`
    parts.push({ bytes: partBytes, filename, partNum, totalParts, pages: pageIndices.length })
  }

  return parts
}

async function analyzeFilename(
  filename: string,
  categories: string[]
): Promise<{ title: string; description: string; category: string; tags: string[] }> {
  const cleanName = cleanFilename(filename)
  const fallback = { title: cleanName, description: "", category: categories[0] ?? "General", tags: [] }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return fallback

  try {
    const prompt = `You are analyzing a PDF filename for TechVyro — an Indian educational platform for NDA, CDS, SSC, UPSC, and competitive exam preparation.

Filename: "${cleanName}"
Available categories: ${categories.length > 0 ? categories.join(", ") : "General, Mathematics, English, Science, History, Geography, Current Affairs"}

Generate metadata in JSON:
{
  "title": "Clean professional title (capitalize properly, no underscores)",
  "description": "2-3 sentence description of what this PDF likely contains based on the filename",
  "category": "Best matching category from the list above (exact match required)",
  "tags": ["3-5 short keyword tags relevant to this study material"]
}

Return only valid JSON, no other text.`

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 350,
      }),
    })

    const data = await res.json()
    const content: string = data.choices?.[0]?.message?.content?.trim() || ""
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim()
    const json = JSON.parse(cleaned)

    return {
      title: json.title || cleanName,
      description: json.description || "",
      category: json.category || (categories[0] ?? "General"),
      tags: Array.isArray(json.tags) ? json.tags.slice(0, 5) : [],
    }
  } catch {
    return fallback
  }
}

async function uploadPart(
  supabase: ReturnType<typeof createAdminClient>,
  bytes: Uint8Array,
  filename: string,
  title: string,
  description: string | null,
  categoryId: string | null,
  tags: string[]
): Promise<{ ok: boolean; pdfId?: string; error?: string }> {
  const timestamp = Date.now() + Math.floor(Math.random() * 1000)
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
  const filePath = `${timestamp}-${sanitized}`

  const { error: storageError } = await supabase.storage
    .from("pdfs")
    .upload(filePath, bytes, { contentType: "application/pdf", upsert: false })

  if (storageError) return { ok: false, error: storageError.message }

  const { data: pdf, error: dbError } = await supabase
    .from("pdfs")
    .insert({
      title,
      description: description || null,
      file_path: filePath,
      file_size: bytes.byteLength,
      category_id: categoryId,
      view_count: 0,
      ...(tags.length > 0 ? { tags } : {}),
    })
    .select("id")
    .single()

  if (dbError) {
    await supabase.storage.from("pdfs").remove([filePath]).catch(() => {})
    return { ok: false, error: dbError.message }
  }

  return { ok: true, pdfId: pdf?.id }
}

export async function POST(request: Request) {
  try {
    if (!TOKEN) return NextResponse.json({ ok: true })
    if (!isAdminConfigured()) return NextResponse.json({ ok: true })

    const body = await request.json()
    const { message } = body
    if (!message) return NextResponse.json({ ok: true })

    const chatId = message.chat?.id
    const msgId = message.message_id
    const text: string = message.text || ""
    const document = message.document

    if (!chatId) return NextResponse.json({ ok: true })

    const supabase = createAdminClient()

    const authorizedChatId = await getAuthorizedChatId(supabase)
    if (!authorizedChatId || String(chatId) !== String(authorizedChatId)) {
      await sendMsg(chatId, "❌ <b>Access Denied</b>\n\nYou are not authorized to use this bot.\n\nConfigure your Chat ID in TechVyro Admin → Notifications.", msgId)
      return NextResponse.json({ ok: true })
    }

    if (text === "/start") {
      await sendMsg(chatId, [
        "🤖 <b>TechVyro Auto-Upload Bot</b>",
        "",
        "Send me any <b>PDF file</b> (up to 20 MB) and I will automatically:",
        "  📝 Generate a clean title",
        "  📂 Detect the right category",
        "  📋 Write a description",
        "  🏷️ Add relevant tags",
        "  ✂️ Split into parts if too many pages",
        "  ✅ Upload all parts to TechVyro",
        "",
        "Just send the PDF directly in this chat!",
        "",
        "<b>Commands:</b>",
        "/start — Show this help",
        "/status — Show library stats",
      ].join("\n"))
      return NextResponse.json({ ok: true })
    }

    if (text === "/status") {
      const { count: pdfCount } = await supabase.from("pdfs").select("*", { count: "exact", head: true })
      const { count: catCount } = await supabase.from("categories").select("*", { count: "exact", head: true })
      await sendMsg(chatId, [
        "📊 <b>TechVyro Library Status</b>",
        "",
        `📄 Total PDFs: <b>${pdfCount ?? 0}</b>`,
        `📁 Categories: <b>${catCount ?? 0}</b>`,
        `🕐 ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
      ].join("\n"), msgId)
      return NextResponse.json({ ok: true })
    }

    if (!document) {
      if (text && !text.startsWith("/")) {
        await sendMsg(chatId, "📁 Send a <b>PDF file</b> to upload it automatically.\n\nUse /start for instructions.", msgId)
      }
      return NextResponse.json({ ok: true })
    }

    const isPdf = document.mime_type === "application/pdf" || document.file_name?.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      await sendMsg(chatId, "⚠️ <b>Only PDF files are supported.</b>\n\nPlease send a .pdf file.", msgId)
      return NextResponse.json({ ok: true })
    }

    const fileSize: number = document.file_size || 0

    // Send processing message immediately
    const processingRes = await sendMsg(chatId, [
      `⏳ <b>Received: ${document.file_name}</b>`,
      fileSize ? `📊 Size: ${formatSize(fileSize)}` : "",
      "",
      "🤖 Analyzing with AI...",
    ].filter(Boolean).join("\n"))
    const processingMsgId: number | undefined = processingRes?.result?.message_id

    // Fetch categories
    const { data: categoriesData } = await supabase.from("categories").select("id, name").order("name")
    const categoryNames = (categoriesData ?? []).map((c: { id: string; name: string }) => c.name)

    // AI analysis
    const metadata = await analyzeFilename(document.file_name || "document.pdf", categoryNames)

    if (processingMsgId) {
      await editMsg(chatId, processingMsgId, [
        `⬇️ <b>Downloading PDF...</b>`,
        "",
        `📄 <b>Title:</b> ${metadata.title}`,
        `📂 <b>Category:</b> ${metadata.category}`,
        `🏷️ <b>Tags:</b> ${metadata.tags.join(", ") || "—"}`,
      ].join("\n"))
    }

    // Get file info from Telegram
    const fileInfoRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${document.file_id}`)
    const fileInfo = await fileInfoRes.json()

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      const errDesc: string = fileInfo.description || ""
      const isTooBig = errDesc.toLowerCase().includes("too big") || errDesc.toLowerCase().includes("file is too large")

      if (isTooBig || (fileSize && fileSize > 20 * 1024 * 1024)) {
        if (processingMsgId) {
          await editMsg(chatId, processingMsgId, [
            `⚠️ <b>File Too Large for Bot Download</b>`,
            "",
            `📊 File size: <b>${fileSize ? formatSize(fileSize) : "unknown"}</b>`,
            `📌 Telegram bots can download max <b>20 MB</b>`,
            "",
            `To upload large files, use the <b>Admin Panel</b> directly — it supports files up to 2GB and auto-splits them into parts.`,
            "",
            `📄 <b>Title detected:</b> ${metadata.title}`,
            `📂 <b>Category:</b> ${metadata.category}`,
          ].join("\n"))
        }
        return NextResponse.json({ ok: true })
      }

      if (processingMsgId) await editMsg(chatId, processingMsgId, "❌ <b>Failed to get file from Telegram.</b>\n\nPlease try again.")
      return NextResponse.json({ ok: true })
    }

    // Download the file
    const downloadUrl = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.result.file_path}`
    const fileRes = await fetch(downloadUrl)

    if (!fileRes.ok) {
      if (processingMsgId) await editMsg(chatId, processingMsgId, "❌ <b>Failed to download file.</b>\n\nPlease try again.")
      return NextResponse.json({ ok: true })
    }

    const fileBuffer = await fileRes.arrayBuffer()
    const actualSize = fileBuffer.byteLength

    if (processingMsgId) {
      await editMsg(chatId, processingMsgId, [
        `✂️ <b>Processing PDF...</b>`,
        "",
        `📄 ${metadata.title}`,
        `📊 ${formatSize(actualSize)}`,
        `📂 ${metadata.category}`,
        "Checking page count for auto-split...",
      ].join("\n"))
    }

    // Split if needed
    let parts: { bytes: Uint8Array; filename: string; partNum: number; totalParts: number; pages: number }[]
    try {
      const baseName = cleanFilename(document.file_name || "document.pdf")
      parts = await splitPdfBuffer(fileBuffer, baseName)
    } catch {
      // If pdf-lib fails (encrypted/corrupted), upload as-is
      const sanitized = (document.file_name || "document.pdf").replace(/[^a-zA-Z0-9.-]/g, "_")
      parts = [{
        bytes: new Uint8Array(fileBuffer),
        filename: sanitized,
        partNum: 1,
        totalParts: 1,
        pages: 0,
      }]
    }

    const willSplit = parts.length > 1
    const matchedCat = (categoriesData ?? []).find(
      (c: { id: string; name: string }) => c.name.toLowerCase() === metadata.category.toLowerCase()
    )
    const categoryId = matchedCat?.id || null

    if (processingMsgId) {
      await editMsg(chatId, processingMsgId, [
        `☁️ <b>Uploading${willSplit ? ` ${parts.length} parts` : ""}...</b>`,
        "",
        `📄 ${metadata.title}`,
        `📊 ${formatSize(actualSize)}${willSplit ? ` → ${parts.length} parts` : ""}`,
        `📂 ${metadata.category}`,
        willSplit ? `✂️ Split into <b>${parts.length} parts</b> (${parts[0].pages} pages each)` : `📃 ${parts[0].pages} pages`,
      ].join("\n"))
    }

    // Upload each part
    const uploadResults: { title: string; ok: boolean; pages: number; size: number }[] = []
    for (const part of parts) {
      const partTitle = parts.length > 1
        ? `${metadata.title} - Part ${part.partNum} of ${part.totalParts}`
        : metadata.title

      const partDesc = parts.length > 1
        ? `${metadata.description ? metadata.description + " " : ""}Part ${part.partNum} of ${part.totalParts}.`
        : (metadata.description || null)

      const result = await uploadPart(
        supabase,
        part.bytes,
        part.filename,
        partTitle,
        partDesc,
        categoryId,
        metadata.tags
      )

      uploadResults.push({ title: partTitle, ok: result.ok, pages: part.pages, size: part.bytes.byteLength })

      // Small delay between parts to avoid race conditions
      if (parts.length > 1) await new Promise(r => setTimeout(r, 300))
    }

    const successCount = uploadResults.filter(r => r.ok).length
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ""

    if (successCount === 0) {
      if (processingMsgId) await editMsg(chatId, processingMsgId, "❌ <b>Upload failed.</b>\n\nAll parts failed to save. Please try again.")
      return NextResponse.json({ ok: true })
    }

    // Build success message
    const lines: string[] = [
      `✅ <b>Upload Successful!</b>`,
      "",
    ]

    if (willSplit) {
      lines.push(`📄 <b>${metadata.title}</b>`)
      lines.push(`✂️ Split into <b>${parts.length} parts</b>:`)
      for (const r of uploadResults) {
        lines.push(`  ${r.ok ? "✅" : "❌"} Part ${uploadResults.indexOf(r) + 1} — ${r.pages} pages • ${formatSize(r.size)}`)
      }
    } else {
      lines.push(`📄 <b>${metadata.title}</b>`)
      lines.push(`📃 ${parts[0].pages} pages • ${formatSize(actualSize)}`)
    }

    lines.push(`📂 Category: ${metadata.category}`)
    if (metadata.tags.length > 0) lines.push(`🏷️ Tags: ${metadata.tags.join(", ")}`)
    if (metadata.description) lines.push(`📝 ${metadata.description.slice(0, 100)}${metadata.description.length > 100 ? "…" : ""}`)
    lines.push("")
    lines.push(`🔗 <a href="${siteUrl}">View on TechVyro</a>`)

    if (processingMsgId) await editMsg(chatId, processingMsgId, lines.join("\n"))

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[telegram-webhook] Error:", error)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "TechVyro Telegram Auto-Upload Webhook" })
}
