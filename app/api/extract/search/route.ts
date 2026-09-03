import { NextResponse } from "next/server"
import platforms from "@/lib/appx-platforms.json"

interface Platform {
  name: string
  api: string
}

const PLATFORM_LIST = platforms as Platform[]

function deriveWebUrl(apiUrl: string): string {
  const classxMatch = apiUrl.match(/^(https?:\/\/)(\w+?)api\.(classx|appx)\.co\.in(.*)$/)
  if (classxMatch) return `${classxMatch[1]}${classxMatch[2]}.${classxMatch[3]}.co.in${classxMatch[4]}`
  return apiUrl.replace(/^(https?:\/\/)api\./, "$1")
}

// Detect category from platform name for better search results
function detectCategory(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("ssc") || n.includes("cgl") || n.includes("chsl") || n.includes("staff")) return "SSC"
  if (n.includes("bank") || n.includes("ibps") || n.includes("sbi") || n.includes("clerk")) return "Banking"
  if (n.includes("nda") || n.includes("defence") || n.includes("army") || n.includes("navy") || n.includes("cds") || n.includes("capf")) return "Defence"
  if (n.includes("railway") || n.includes("rrb") || n.includes("ntpc") || n.includes("group d")) return "Railways"
  if (n.includes("upsc") || n.includes("ias") || n.includes("pcs") || n.includes("civil")) return "UPSC"
  if (n.includes("jee") || n.includes("neet") || n.includes("physics") || n.includes("chemistry") || n.includes("medical") || n.includes("engineering")) return "JEE/NEET"
  if (n.includes("ctet") || n.includes("teacher") || n.includes("tet") || n.includes("kvs") || n.includes("nvs")) return "Teaching"
  if (n.includes("police") || n.includes("constable") || n.includes("si ")) return "Police"
  if (n.includes("agri") || n.includes("farming") || n.includes("icar")) return "Agriculture"
  if (n.includes("gate") || n.includes("ese") || n.includes("engineering")) return "Engineering"
  if (n.includes("law") || n.includes("clat") || n.includes("judiciary")) return "Law"
  if (n.includes("commerce") || n.includes("ca") || n.includes("accountant")) return "Commerce"
  return "General"
}

// Extract display name from platform (removing academy/classes suffixes)
function getDisplayName(name: string, category: string): string {
  // Just return category-based name, not platform name
  return `${category} Mock Test`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") || "").trim().toLowerCase()
  const limit = parseInt(searchParams.get("limit") || "50")

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // Exam keywords mapping for better search
  const examKeywords: Record<string, string[]> = {
    ssc: ["ssc", "cgl", "chsl", "mts", "gd", "constable", "cpo", "steno", "staff selection", "je", "stenographer"],
    banking: ["bank", "ibps", "sbi", "rbi", "clerk", "po", "rrb clerk", "so", "nabard", "sebi"],
    defence: ["nda", "cds", "defence", "army", "navy", "airforce", "afcat", "agniveer", "capf", "crpf", "bsf", "cisf", "itbp"],
    railways: ["railway", "rrb", "ntpc", "group d", "alp", "je railway", "technician", "loco pilot"],
    upsc: ["upsc", "ias", "ips", "pcs", "civil services", "bpsc", "uppsc", "mpsc", "rpsc", "wbcs", "opsc", "jpsc"],
    jee: ["jee", "neet", "physics", "chemistry", "maths", "pcm", "pcb", "engineering", "medical", "iit", "aiims"],
    teaching: ["ctet", "tet", "teacher", "kvs", "nvs", "dsssb", "super tet", "uptet", "reet", "htet", "mptet"],
    police: ["police", "constable", "si", "sub inspector", "up police", "mp police", "bihar police", "rajasthan police"],
    agriculture: ["agri", "agriculture", "icar", "farming", "afdo", "fci"],
    law: ["law", "clat", "judiciary", "aibe", "advocate", "legal"],
    engineering: ["gate", "ese", "isro", "drdo", "barc"],
    commerce: ["commerce", "ca", "accountant", "cs", "cma", "accounts"],
  }

  // Find target categories based on search query
  const targetCategories: string[] = []
  for (const [category, keywords] of Object.entries(examKeywords)) {
    if (keywords.some(kw => q.includes(kw) || kw.includes(q))) {
      targetCategories.push(category)
    }
  }

  // Search platforms
  const matchingResults: { api: string; webBase: string; category: string; matchScore: number; displayName: string }[] = []

  for (const p of PLATFORM_LIST) {
    const nameLower = p.name.toLowerCase()
    const nameMatch = nameLower.includes(q)
    const category = detectCategory(p.name)
    const categoryMatch = targetCategories.some(tc => 
      tc.toLowerCase() === category.toLowerCase() || 
      category.toLowerCase().includes(tc) ||
      nameLower.includes(tc)
    )
    
    if (nameMatch || categoryMatch) {
      const score = nameMatch ? 3 : (categoryMatch ? 2 : 1)
      matchingResults.push({
        api: p.api,
        webBase: deriveWebUrl(p.api),
        category,
        matchScore: score,
        displayName: getDisplayName(p.name, category),
      })
    }
  }

  // Sort by match score and limit results
  const uniqueCategories = new Set<string>()
  const results = matchingResults
    .sort((a, b) => b.matchScore - a.matchScore)
    .filter(r => {
      // Limit to 5 per category to show variety
      const catCount = [...uniqueCategories].filter(c => c === r.category).length
      if (catCount < 5) {
        uniqueCategories.add(r.category)
        return true
      }
      return false
    })
    .slice(0, limit)
    .map((r, idx) => ({
      name: `Mock Test ${idx + 1}`,
      displayName: r.displayName,
      api: r.api,
      webBase: r.webBase,
      category: r.category,
    }))

  return NextResponse.json({ 
    results, 
    totalFound: matchingResults.length,
    categories: [...new Set(results.map(r => r.category))]
  })
}
