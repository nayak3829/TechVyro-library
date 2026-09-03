import { NextRequest, NextResponse } from "next/server"
import platformsData from "@/lib/appx-platforms.json"

interface Platform {
  name: string
  api: string
}

const PLATFORMS = platformsData as Platform[]

function deriveWebUrl(apiUrl: string): string {
  const classxMatch = apiUrl.match(/^(https?:\/\/)(\w+?)api\.(classx|appx)\.co\.in(.*)$/)
  if (classxMatch) return `${classxMatch[1]}${classxMatch[2]}.${classxMatch[3]}.co.in${classxMatch[4]}`
  return apiUrl.replace(/^(https?:\/\/)api\./, "$1")
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") || "").toLowerCase().trim()
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

  if (!q || q.length < 1) {
    const sample = PLATFORMS.slice(0, limit).map(p => ({
      name: p.name,
      api: p.api,
      web: deriveWebUrl(p.api),
    }))
    return NextResponse.json({ platforms: sample, total: PLATFORMS.length })
  }

  const filtered = PLATFORMS
    .filter(p => p.name.toLowerCase().includes(q) || p.api.toLowerCase().includes(q))
    .slice(0, limit)
    .map(p => ({
      name: p.name,
      api: p.api,
      web: deriveWebUrl(p.api),
    }))

  return NextResponse.json({
    platforms: filtered,
    total: filtered.length,
    query: q,
  })
}
