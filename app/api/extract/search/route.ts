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

// Detect category from platform name for better search results
function detectCategory(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("ssc") || n.includes("cgl") || n.includes("chsl")) return "SSC"
  if (n.includes("bank") || n.includes("ibps") || n.includes("sbi")) return "Banking"
  if (n.includes("nda") || n.includes("defence") || n.includes("army") || n.includes("navy")) return "Defence"
  if (n.includes("railway") || n.includes("rrb") || n.includes("ntpc")) return "Railways"
  if (n.includes("upsc") || n.includes("ias") || n.includes("pcs")) return "UPSC"
  if (n.includes("jee") || n.includes("neet") || n.includes("physics") || n.includes("chemistry")) return "JEE/NEET"
  if (n.includes("ctet") || n.includes("teacher") || n.includes("tet") || n.includes("kvs")) return "Teaching"
  if (n.includes("police") || n.includes("constable")) return "Police"
  if (n.includes("agri") || n.includes("farming")) return "Agriculture"
  return "General"
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") || "").trim().toLowerCase()

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // Search by exam keywords, not platform names
  const examKeywords: Record<string, string[]> = {
    ssc: ["ssc", "cgl", "chsl", "mts", "gd", "constable", "cpo", "steno"],
    banking: ["bank", "ibps", "sbi", "rbi", "clerk", "po", "rrb"],
    defence: ["nda", "cds", "defence", "army", "navy", "airforce", "afcat", "agniveer", "capf"],
    railways: ["railway", "rrb", "ntpc", "group d", "alp", "je", "technician"],
    upsc: ["upsc", "ias", "ips", "pcs", "civil services", "bpsc", "uppsc", "mpsc"],
    jee: ["jee", "neet", "physics", "chemistry", "maths", "pcm", "pcb", "engineering", "medical"],
    teaching: ["ctet", "tet", "teacher", "kvs", "nvs", "dsssb", "super tet", "uptet"],
    police: ["police", "constable", "si", "sub inspector"],
    agriculture: ["agri", "agriculture", "icar", "farming"],
  }

  // Find platforms matching the search query
  const matchingResults: { api: string; webBase: string; category: string; matchScore: number }[] = []
  
  // Check if query matches any exam keywords
  let targetCategories: string[] = []
  for (const [category, keywords] of Object.entries(examKeywords)) {
    if (keywords.some(kw => q.includes(kw) || kw.includes(q))) {
      targetCategories.push(category)
    }
  }

  // Search platforms
  for (const p of PLATFORM_LIST) {
    const nameMatch = p.name.toLowerCase().includes(q)
    const category = detectCategory(p.name)
    const categoryMatch = targetCategories.some(tc => 
      tc.toLowerCase() === category.toLowerCase() || 
      category.toLowerCase().includes(tc)
    )
    
    if (nameMatch || categoryMatch) {
      const score = nameMatch ? 2 : 1
      matchingResults.push({
        api: p.api,
        webBase: deriveWebUrl(p.api),
        category,
        matchScore: score,
      })
    }
  }

  // Sort by match score and limit results
  const results = matchingResults
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 30)
    .map((r, idx) => ({
      // Don't expose platform name, just provide API access
      name: `Test Series ${idx + 1}`,
      displayName: `${r.category} Test Series`,
      api: r.api,
      webBase: r.webBase,
      category: r.category,
    }))

  return NextResponse.json({ results, totalFound: matchingResults.length })
}
