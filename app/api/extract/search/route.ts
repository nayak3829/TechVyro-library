import { NextResponse } from "next/server"
import platforms from "@/lib/appx-platforms.json"

interface Platform {
  name: string
  api: string
}

const PLATFORM_LIST = platforms as Platform[]

function deriveWebUrl(apiUrl: string): string {
  // classx.co.in / appx.co.in: https://NAMEapi.classx.co.in → https://NAME.classx.co.in
  const classxMatch = apiUrl.match(/^(https?:\/\/)(\w+?)api\.(classx|appx)\.co\.in(.*)$/)
  if (classxMatch) return `${classxMatch[1]}${classxMatch[2]}.${classxMatch[3]}.co.in${classxMatch[4]}`
  // Generic: https://api.NAME.com → https://NAME.com
  return apiUrl.replace(/^(https?:\/\/)api\./, "$1")
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") || "").trim().toLowerCase()

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const results = PLATFORM_LIST
    .filter(p => p.name.toLowerCase().includes(q))
    .slice(0, 20)
    .map(p => ({
      name: p.name,
      api: p.api,
      webBase: deriveWebUrl(p.api),
    }))

  return NextResponse.json({ results })
}
