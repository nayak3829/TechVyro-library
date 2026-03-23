import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { sendTelegramMessage } from "@/lib/telegram"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown size"
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

export async function POST(request: Request) {
  try {
    if (!verifyAdminToken(extractToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdminConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

    const body = await request.json()
    const { title, description, filePath, fileSize, categoryId, replace } = body

    if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 })
    if (!filePath) return NextResponse.json({ error: "File path is required" }, { status: 400 })

    const supabase = createAdminClient()

    // Check for existing PDF with same title
    const { data: existingPdf } = await supabase
      .from("pdfs")
      .select("id, file_path")
      .ilike("title", title.trim())
      .single()

    if (existingPdf) {
      if (!replace) {
        await supabase.storage.from("pdfs").remove([filePath])
        return NextResponse.json({ error: "A PDF with this title already exists", duplicate: true }, { status: 400 })
      }

      if (existingPdf.file_path && existingPdf.file_path !== filePath) {
        await supabase.storage.from("pdfs").remove([existingPdf.file_path]).catch(() => {})
      }

      const { data: updatedPdf, error: updateError } = await supabase
        .from("pdfs")
        .update({
          description: description?.trim() || null,
          file_path: filePath,
          file_size: fileSize || null,
          category_id: categoryId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPdf.id)
        .select()
        .single()

      if (updateError) {
        console.error("[save-metadata] Replace update error:", updateError)
        await supabase.storage.from("pdfs").remove([filePath]).catch(() => {})
        return NextResponse.json({ error: "Failed to replace PDF" }, { status: 500 })
      }

      return NextResponse.json({ pdf: updatedPdf, replaced: true })
    }

    // New PDF — insert
    const { data: pdf, error: dbError } = await supabase
      .from("pdfs")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        file_path: filePath,
        file_size: fileSize || null,
        category_id: categoryId || null,
        view_count: 0,
      })
      .select()
      .single()

    if (dbError) {
      console.error("[save-metadata] Database insert error:", dbError)
      await supabase.storage.from("pdfs").remove([filePath]).catch(() => {})
      return NextResponse.json({ error: "Failed to save PDF metadata" }, { status: 500 })
    }

    // Send Telegram notification (fire and forget)
    if (pdf) {
      let categoryName = "General"
      if (categoryId) {
        const { data: cat } = await supabase
          .from("categories")
          .select("name")
          .eq("id", categoryId)
          .single()
        if (cat?.name) categoryName = cat.name
      }

      const message = [
        "📚 <b>New PDF Uploaded!</b>",
        "",
        `📄 <b>Title:</b> ${title.trim()}`,
        `📁 <b>Category:</b> ${categoryName}`,
        `📊 <b>Size:</b> ${formatFileSize(fileSize)}`,
        `🕐 <b>Uploaded:</b> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
        "",
        "#TechVyro #NewPDF",
      ].join("\n")

      sendTelegramMessage(message).catch(() => {})
    }

    return NextResponse.json({ pdf })
  } catch (error) {
    console.error("[save-metadata] Error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
