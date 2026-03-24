"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import {
  Search, Loader2, BookOpen, ChevronRight,
  Zap, GraduationCap, FileText, Clock, X, Star,
  Shield, Train, TrendingUp, Atom, Users, CheckCircle,
  ChevronDown, SlidersHorizontal, Award, BarChart2,
  Flame, ArrowUpDown, History, RefreshCw, AlertCircle,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────
interface SearchResult {
  name: string
  api: string
  webBase: string
}

interface DisplaySeries {
  id: string
  title: string
  subtitle: string
  category: string
  examTags: string[]
  totalTests: number
  totalQuestions: number
  duration: string
  language: string
  slug: string
  sampleCategory: string
  color: string
  icon: string
  badge?: string
  difficulty?: "Easy" | "Medium" | "Hard"
}

// ── Category config ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",      label: "All Tests",   icon: "📚", color: "#8b5cf6" },
  { id: "ssc",      label: "SSC",         icon: "📋", color: "#3b82f6" },
  { id: "banking",  label: "Banking",     icon: "🏦", color: "#10b981" },
  { id: "nda",      label: "NDA/Defence", icon: "🛡️", color: "#ef4444" },
  { id: "railways", label: "Railways",    icon: "🚂", color: "#f97316" },
  { id: "upsc",     label: "UPSC",        icon: "⚖️", color: "#8b5cf6" },
  { id: "jee",      label: "JEE/NEET",   icon: "⚛️", color: "#06b6d4" },
  { id: "teaching", label: "Teaching",    icon: "📖", color: "#ec4899" },
  { id: "state",    label: "State PCS",   icon: "🗺️", color: "#f59e0b" },
  { id: "police",   label: "Police",      icon: "👮", color: "#6366f1" },
]

const CAT_COLORS: Record<string, string> = {
  ssc:      "#3b82f6",
  banking:  "#10b981",
  nda:      "#ef4444",
  railways: "#f97316",
  upsc:     "#8b5cf6",
  jee:      "#06b6d4",
  teaching: "#ec4899",
  state:    "#f59e0b",
  police:   "#6366f1",
}

// ── Full series library ─────────────────────────────────────────────────────
const SERIES_LIBRARY: DisplaySeries[] = [
  // ── SSC ──
  {
    id: "ssc-cgl-1", title: "SSC CGL Full Mock Test Series", subtitle: "Complete prep for SSC CGL Tier 1 & 2",
    category: "ssc", examTags: ["SSC CGL", "Tier 1", "Tier 2"],
    totalTests: 25, totalQuestions: 375, duration: "60 min/test", language: "Hindi + English",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#3b82f6", icon: "📋", badge: "HOT", difficulty: "Medium",
  },
  {
    id: "ssc-chsl-1", title: "SSC CHSL Complete Practice Series", subtitle: "SSC CHSL Tier 1 Previous Year Papers",
    category: "ssc", examTags: ["SSC CHSL", "LDC", "DEO"],
    totalTests: 20, totalQuestions: 300, duration: "60 min/test", language: "Hindi + English",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#3b82f6", icon: "📋", difficulty: "Easy",
  },
  {
    id: "ssc-mts-1", title: "SSC MTS & Havaldar Series", subtitle: "SSC MTS Tier 1 practice papers with solutions",
    category: "ssc", examTags: ["SSC MTS", "Havaldar"],
    totalTests: 15, totalQuestions: 225, duration: "45 min/test", language: "Hindi + English",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#3b82f6", icon: "📋", difficulty: "Easy",
  },
  {
    id: "ssc-gd-1", title: "SSC GD Constable Mock Series", subtitle: "Full mock tests for SSC GD Constable exam",
    category: "ssc", examTags: ["SSC GD", "Constable"],
    totalTests: 18, totalQuestions: 360, duration: "60 min/test", language: "Hindi + English",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#3b82f6", icon: "📋", badge: "POPULAR", difficulty: "Easy",
  },
  {
    id: "ssc-cpo-1", title: "SSC CPO Sub Inspector Series", subtitle: "Paper I & Paper II full mock tests",
    category: "ssc", examTags: ["SSC CPO", "SI", "ASI"],
    totalTests: 16, totalQuestions: 320, duration: "120 min/test", language: "Hindi + English",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#3b82f6", icon: "📋", difficulty: "Medium",
  },
  {
    id: "ssc-steno-1", title: "SSC Stenographer Grade C & D", subtitle: "Speed + Accuracy + General Awareness",
    category: "ssc", examTags: ["SSC Steno", "Grade C", "Grade D"],
    totalTests: 12, totalQuestions: 180, duration: "120 min/test", language: "Hindi + English",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#3b82f6", icon: "📋", difficulty: "Medium",
  },
  // ── Banking ──
  {
    id: "ibps-po-1", title: "IBPS PO Complete Mock Series", subtitle: "Prelims + Mains full mock tests",
    category: "banking", examTags: ["IBPS PO", "Prelims", "Mains"],
    totalTests: 30, totalQuestions: 450, duration: "60 min/test", language: "Hindi + English",
    slug: "banking-reasoning-aptitude", sampleCategory: "ssc-banking",
    color: "#10b981", icon: "🏦", badge: "POPULAR", difficulty: "Medium",
  },
  {
    id: "sbi-clerk-1", title: "SBI Clerk Prelims & Mains", subtitle: "Complete SBI Clerk preparation series",
    category: "banking", examTags: ["SBI Clerk", "Prelims", "Mains"],
    totalTests: 25, totalQuestions: 375, duration: "60 min/test", language: "Hindi + English",
    slug: "banking-reasoning-aptitude", sampleCategory: "ssc-banking",
    color: "#10b981", icon: "🏦", difficulty: "Medium",
  },
  {
    id: "ibps-rrb-1", title: "IBPS RRB Officer Scale I Series", subtitle: "RRB PO Prelims + Mains mock tests",
    category: "banking", examTags: ["IBPS RRB", "RRB PO"],
    totalTests: 20, totalQuestions: 300, duration: "45 min/test", language: "Hindi + English",
    slug: "banking-reasoning-aptitude", sampleCategory: "ssc-banking",
    color: "#10b981", icon: "🏦", difficulty: "Medium",
  },
  {
    id: "sbi-po-1", title: "SBI PO Mains Special Series", subtitle: "Data Analysis, English & Reasoning",
    category: "banking", examTags: ["SBI PO", "Mains"],
    totalTests: 15, totalQuestions: 300, duration: "180 min/test", language: "English",
    slug: "banking-reasoning-aptitude", sampleCategory: "ssc-banking",
    color: "#10b981", icon: "🏦", difficulty: "Hard",
  },
  {
    id: "ibps-clerk-1", title: "IBPS Clerk Prelims Complete Series", subtitle: "Reasoning + Numerical + English",
    category: "banking", examTags: ["IBPS Clerk", "Prelims"],
    totalTests: 22, totalQuestions: 330, duration: "60 min/test", language: "Hindi + English",
    slug: "banking-reasoning-aptitude", sampleCategory: "ssc-banking",
    color: "#10b981", icon: "🏦", difficulty: "Easy",
  },
  {
    id: "rbi-grade-b-1", title: "RBI Grade B Officer Series", subtitle: "Phase I + Phase II full mock tests",
    category: "banking", examTags: ["RBI Grade B", "Finance"],
    totalTests: 18, totalQuestions: 360, duration: "120 min/test", language: "English",
    slug: "banking-reasoning-aptitude", sampleCategory: "ssc-banking",
    color: "#10b981", icon: "🏦", badge: "HOT", difficulty: "Hard",
  },
  {
    id: "lic-aao-1", title: "LIC AAO Prelims & Mains Series", subtitle: "Life Insurance Corporation complete prep",
    category: "banking", examTags: ["LIC AAO", "Insurance"],
    totalTests: 15, totalQuestions: 300, duration: "120 min/test", language: "English",
    slug: "banking-reasoning-aptitude", sampleCategory: "ssc-banking",
    color: "#10b981", icon: "🏦", difficulty: "Medium",
  },
  // ── NDA/Defence ──
  {
    id: "nda-full-1", title: "NDA & NA Full Mock Test Series", subtitle: "Maths + GAT previous year mock tests",
    category: "nda", examTags: ["NDA", "NA", "Mathematics", "GAT"],
    totalTests: 20, totalQuestions: 600, duration: "150 min/test", language: "Hindi + English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#ef4444", icon: "🛡️", badge: "POPULAR", difficulty: "Hard",
  },
  {
    id: "cds-1", title: "CDS Combined Defence Services", subtitle: "English + GK + Maths complete series",
    category: "nda", examTags: ["CDS", "IMA", "INA", "AFA"],
    totalTests: 18, totalQuestions: 360, duration: "120 min/test", language: "English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#ef4444", icon: "🛡️", difficulty: "Medium",
  },
  {
    id: "afcat-1", title: "AFCAT Air Force Mock Series", subtitle: "AFCAT 1 & 2 complete preparation",
    category: "nda", examTags: ["AFCAT", "IAF", "Flying Branch"],
    totalTests: 15, totalQuestions: 300, duration: "120 min/test", language: "English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#ef4444", icon: "🛡️", difficulty: "Hard",
  },
  {
    id: "capf-1", title: "CAPF Assistant Commandant Series", subtitle: "Paper I & Paper II mock tests",
    category: "nda", examTags: ["CAPF", "BSF", "CRPF", "CISF"],
    totalTests: 12, totalQuestions: 240, duration: "120 min/test", language: "English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#ef4444", icon: "🛡️", difficulty: "Hard",
  },
  {
    id: "agniveer-1", title: "Agniveer Army / Navy / AF Series", subtitle: "Agnipath Scheme complete mock tests",
    category: "nda", examTags: ["Agniveer", "Army", "Navy", "Air Force"],
    totalTests: 20, totalQuestions: 400, duration: "60 min/test", language: "Hindi + English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#ef4444", icon: "🛡️", badge: "HOT", difficulty: "Easy",
  },
  // ── Railways ──
  {
    id: "rrb-ntpc-1", title: "RRB NTPC Complete Mock Series", subtitle: "CBT 1 & CBT 2 full practice tests",
    category: "railways", examTags: ["RRB NTPC", "CBT 1", "CBT 2"],
    totalTests: 25, totalQuestions: 375, duration: "90 min/test", language: "Hindi + English",
    slug: "rrb-ntpc-general-knowledge", sampleCategory: "railways",
    color: "#f97316", icon: "🚂", badge: "POPULAR", difficulty: "Medium",
  },
  {
    id: "rrb-group-d-1", title: "RRB Group D Full Mock Series", subtitle: "Complete CBT practice for Group D",
    category: "railways", examTags: ["RRB Group D", "CBT"],
    totalTests: 20, totalQuestions: 400, duration: "90 min/test", language: "Hindi + English",
    slug: "rrb-ntpc-general-knowledge", sampleCategory: "railways",
    color: "#f97316", icon: "🚂", difficulty: "Easy",
  },
  {
    id: "rrb-je-1", title: "RRB Junior Engineer Mock Tests", subtitle: "CBT 1 + CBT 2 engineering series",
    category: "railways", examTags: ["RRB JE", "Junior Engineer"],
    totalTests: 15, totalQuestions: 300, duration: "90 min/test", language: "Hindi + English",
    slug: "rrb-ntpc-general-knowledge", sampleCategory: "railways",
    color: "#f97316", icon: "🚂", difficulty: "Hard",
  },
  {
    id: "rrb-alp-1", title: "RRB ALP & Technician Series", subtitle: "Stage 1 + Stage 2 complete mock tests",
    category: "railways", examTags: ["RRB ALP", "Technician"],
    totalTests: 18, totalQuestions: 360, duration: "60 min/test", language: "Hindi + English",
    slug: "rrb-ntpc-general-knowledge", sampleCategory: "railways",
    color: "#f97316", icon: "🚂", difficulty: "Medium",
  },
  // ── UPSC ──
  {
    id: "upsc-prelims-1", title: "UPSC Prelims GS Paper I Series", subtitle: "History, Polity, Geography, Economy, Current Affairs",
    category: "upsc", examTags: ["UPSC CSE", "Prelims", "GS Paper 1"],
    totalTests: 30, totalQuestions: 600, duration: "120 min/test", language: "English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#8b5cf6", icon: "⚖️", badge: "POPULAR", difficulty: "Hard",
  },
  {
    id: "upsc-csat-1", title: "UPSC CSAT Paper II Complete Series", subtitle: "Aptitude, Comprehension & Basic Numeracy",
    category: "upsc", examTags: ["UPSC CSAT", "Paper 2", "Qualifying"],
    totalTests: 20, totalQuestions: 400, duration: "120 min/test", language: "English",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#8b5cf6", icon: "⚖️", difficulty: "Medium",
  },
  {
    id: "uppsc-1", title: "UPPSC PCS Prelims Mock Series", subtitle: "UP State PSC complete preparation",
    category: "upsc", examTags: ["UPPSC", "PCS", "UP State"],
    totalTests: 20, totalQuestions: 400, duration: "120 min/test", language: "Hindi + English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#8b5cf6", icon: "⚖️", difficulty: "Hard",
  },
  {
    id: "bpsc-1", title: "BPSC 70th Integrated Mock Series", subtitle: "Bihar PSC Prelims + Mains preparation",
    category: "upsc", examTags: ["BPSC", "Bihar PSC", "70th"],
    totalTests: 18, totalQuestions: 360, duration: "120 min/test", language: "Hindi + English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#8b5cf6", icon: "⚖️", badge: "HOT", difficulty: "Hard",
  },
  // ── JEE/NEET ──
  {
    id: "jee-main-1", title: "JEE Main Full Mock Test Series", subtitle: "Physics, Chemistry, Maths — Jan & Apr sessions",
    category: "jee", examTags: ["JEE Main", "Physics", "Chemistry", "Maths"],
    totalTests: 30, totalQuestions: 900, duration: "180 min/test", language: "English + Hindi",
    slug: "jee-physics-sample", sampleCategory: "jee-neet",
    color: "#06b6d4", icon: "⚛️", badge: "POPULAR", difficulty: "Hard",
  },
  {
    id: "neet-1", title: "NEET UG Complete Mock Series", subtitle: "Biology, Physics, Chemistry chapter-wise & full mocks",
    category: "jee", examTags: ["NEET", "Biology", "Physics", "Chemistry"],
    totalTests: 25, totalQuestions: 900, duration: "200 min/test", language: "English + Hindi",
    slug: "jee-physics-sample", sampleCategory: "jee-neet",
    color: "#06b6d4", icon: "⚛️", badge: "HOT", difficulty: "Hard",
  },
  {
    id: "jee-adv-1", title: "JEE Advanced Crash Course Series", subtitle: "Advanced level problems with video solutions",
    category: "jee", examTags: ["JEE Advanced", "IIT"],
    totalTests: 20, totalQuestions: 600, duration: "180 min/test", language: "English",
    slug: "jee-physics-sample", sampleCategory: "jee-neet",
    color: "#06b6d4", icon: "⚛️", difficulty: "Hard",
  },
  // ── Teaching ──
  {
    id: "ctet-1", title: "CTET Paper 1 Complete Mock Series", subtitle: "CDP, Maths, EVS, Language 1 & 2",
    category: "teaching", examTags: ["CTET", "Paper 1", "Primary"],
    totalTests: 20, totalQuestions: 300, duration: "150 min/test", language: "Hindi + English",
    slug: "ctet-paper-1-sample", sampleCategory: "teaching",
    color: "#ec4899", icon: "📖", badge: "POPULAR", difficulty: "Medium",
  },
  {
    id: "ctet-2-1", title: "CTET Paper 2 Mock Test Series", subtitle: "CDP + Language + Subject-specific tests",
    category: "teaching", examTags: ["CTET", "Paper 2", "Upper Primary"],
    totalTests: 18, totalQuestions: 270, duration: "150 min/test", language: "Hindi + English",
    slug: "ctet-paper-1-sample", sampleCategory: "teaching",
    color: "#ec4899", icon: "📖", difficulty: "Medium",
  },
  {
    id: "uptet-1", title: "UPTET Paper 1 & Paper 2 Series", subtitle: "Complete UP Teacher Eligibility Test prep",
    category: "teaching", examTags: ["UPTET", "UP State", "TET"],
    totalTests: 15, totalQuestions: 225, duration: "150 min/test", language: "Hindi",
    slug: "ctet-paper-1-sample", sampleCategory: "teaching",
    color: "#ec4899", icon: "📖", difficulty: "Medium",
  },
  {
    id: "super-tet-1", title: "Super TET Complete Mock Series", subtitle: "UP Primary Teacher Selection Test",
    category: "teaching", examTags: ["Super TET", "Primary Teacher", "UP"],
    totalTests: 14, totalQuestions: 210, duration: "150 min/test", language: "Hindi",
    slug: "ctet-paper-1-sample", sampleCategory: "teaching",
    color: "#ec4899", icon: "📖", difficulty: "Medium",
  },
  {
    id: "kvs-1", title: "KVS PGT / TGT / PRT Mock Series", subtitle: "Kendriya Vidyalaya Sangathan teacher exam",
    category: "teaching", examTags: ["KVS", "PGT", "TGT", "PRT"],
    totalTests: 16, totalQuestions: 240, duration: "180 min/test", language: "Hindi + English",
    slug: "ctet-paper-1-sample", sampleCategory: "teaching",
    color: "#ec4899", icon: "📖", difficulty: "Hard",
  },
  // ── State PCS ──
  {
    id: "mpsc-1", title: "MPSC Rajyaseva Prelims Series", subtitle: "Maharashtra State PSC complete prep",
    category: "state", examTags: ["MPSC", "Maharashtra", "Rajyaseva"],
    totalTests: 18, totalQuestions: 360, duration: "120 min/test", language: "Marathi + English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#f59e0b", icon: "🗺️", difficulty: "Hard",
  },
  {
    id: "rpsc-1", title: "RPSC RAS Prelims Mock Series", subtitle: "Rajasthan Administrative Services",
    category: "state", examTags: ["RPSC", "RAS", "Rajasthan"],
    totalTests: 16, totalQuestions: 320, duration: "120 min/test", language: "Hindi + English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#f59e0b", icon: "🗺️", difficulty: "Hard",
  },
  {
    id: "mppsc-1", title: "MPPSC State Service Exam Series", subtitle: "Madhya Pradesh PSC complete preparation",
    category: "state", examTags: ["MPPSC", "MP State", "MPPSC Prelims"],
    totalTests: 16, totalQuestions: 320, duration: "120 min/test", language: "Hindi",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#f59e0b", icon: "🗺️", difficulty: "Hard",
  },
  {
    id: "ukpsc-1", title: "UKPSC PCS Prelims Mock Series", subtitle: "Uttarakhand State PSC exam prep",
    category: "state", examTags: ["UKPSC", "Uttarakhand", "UK PSC"],
    totalTests: 14, totalQuestions: 280, duration: "120 min/test", language: "Hindi",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#f59e0b", icon: "🗺️", difficulty: "Hard",
  },
  // ── Police ──
  {
    id: "up-police-1", title: "UP Police Constable Mock Series", subtitle: "UP Police Bharti complete preparation",
    category: "police", examTags: ["UP Police", "Constable", "UP"],
    totalTests: 20, totalQuestions: 400, duration: "120 min/test", language: "Hindi",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#6366f1", icon: "👮", badge: "HOT", difficulty: "Easy",
  },
  {
    id: "rajasthan-police-1", title: "Rajasthan Police Constable Series", subtitle: "RAJ Police exam full mock tests",
    category: "police", examTags: ["Rajasthan Police", "Constable"],
    totalTests: 15, totalQuestions: 300, duration: "120 min/test", language: "Hindi",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#6366f1", icon: "👮", difficulty: "Easy",
  },
  {
    id: "mp-police-1", title: "MP Police Constable & SI Series", subtitle: "Madhya Pradesh Police exam prep",
    category: "police", examTags: ["MP Police", "SI", "Constable"],
    totalTests: 16, totalQuestions: 320, duration: "120 min/test", language: "Hindi",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#6366f1", icon: "👮", difficulty: "Easy",
  },
  {
    id: "bihar-police-1", title: "Bihar Police Driver & Constable", subtitle: "BPSSC Bihar Police complete mock series",
    category: "police", examTags: ["Bihar Police", "BPSSC", "Constable"],
    totalTests: 14, totalQuestions: 280, duration: "120 min/test", language: "Hindi",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#6366f1", icon: "👮", difficulty: "Easy",
  },
]

// ── Helper functions for categorization ─────────────────────────────────────
function detectCategory(title: string): string {
  const t = title.toLowerCase()
  if (t.includes("ssc") || t.includes("cgl") || t.includes("chsl") || t.includes("mts") || t.includes("gd") || t.includes("cpo") || t.includes("steno")) return "ssc"
  if (t.includes("bank") || t.includes("ibps") || t.includes("sbi") || t.includes("rrb po") || t.includes("rrb clerk") || t.includes("rbi") || t.includes("lic") || t.includes("niacl")) return "banking"
  if (t.includes("nda") || t.includes("cds") || t.includes("afcat") || t.includes("capf") || t.includes("agniveer") || t.includes("army") || t.includes("navy") || t.includes("air force") || t.includes("defence")) return "nda"
  if (t.includes("railway") || t.includes("rrb") || t.includes("ntpc") || t.includes("group d") || t.includes("alp") || t.includes("je")) return "railways"
  if (t.includes("upsc") || t.includes("ias") || t.includes("pcs") || t.includes("uppsc") || t.includes("bpsc") || t.includes("mpsc") || t.includes("rpsc") || t.includes("mppsc") || t.includes("ukpsc")) return "upsc"
  if (t.includes("jee") || t.includes("neet") || t.includes("physics") || t.includes("chemistry") || t.includes("biology")) return "jee"
  if (t.includes("ctet") || t.includes("tet") || t.includes("teacher") || t.includes("kvs") || t.includes("nvs") || t.includes("dsssb") || t.includes("super tet")) return "teaching"
  if (t.includes("state") || t.includes("psc")) return "state"
  if (t.includes("police") || t.includes("constable") || t.includes("si")) return "police"
  return "all"
}

function extractExamTags(title: string): string[] {
  const tags: string[] = []
  const t = title.toLowerCase()
  
  // SSC exams
  if (t.includes("ssc cgl")) tags.push("SSC CGL")
  if (t.includes("ssc chsl")) tags.push("SSC CHSL")
  if (t.includes("ssc mts")) tags.push("SSC MTS")
  if (t.includes("ssc gd")) tags.push("SSC GD")
  if (t.includes("ssc cpo")) tags.push("SSC CPO")
  if (t.includes("ssc") && tags.length === 0) tags.push("SSC")
  
  // Banking
  if (t.includes("ibps po")) tags.push("IBPS PO")
  if (t.includes("ibps clerk")) tags.push("IBPS Clerk")
  if (t.includes("sbi po")) tags.push("SBI PO")
  if (t.includes("sbi clerk")) tags.push("SBI Clerk")
  if (t.includes("rbi")) tags.push("RBI")
  if (t.includes("bank") && tags.length === 0) tags.push("Banking")
  
  // Defence
  if (t.includes("nda")) tags.push("NDA")
  if (t.includes("cds")) tags.push("CDS")
  if (t.includes("afcat")) tags.push("AFCAT")
  if (t.includes("agniveer")) tags.push("Agniveer")
  
  // Railways
  if (t.includes("rrb ntpc")) tags.push("RRB NTPC")
  if (t.includes("rrb group d") || t.includes("group d")) tags.push("Group D")
  if (t.includes("rrb je")) tags.push("RRB JE")
  if (t.includes("rrb alp")) tags.push("RRB ALP")
  if (t.includes("railway") && tags.length === 0) tags.push("Railways")
  
  // UPSC & State
  if (t.includes("upsc")) tags.push("UPSC")
  if (t.includes("bpsc")) tags.push("BPSC")
  if (t.includes("uppsc")) tags.push("UPPSC")
  if (t.includes("mpsc")) tags.push("MPSC")
  
  // JEE/NEET
  if (t.includes("jee main")) tags.push("JEE Main")
  if (t.includes("jee adv")) tags.push("JEE Advanced")
  if (t.includes("neet")) tags.push("NEET")
  
  // Teaching
  if (t.includes("ctet")) tags.push("CTET")
  if (t.includes("uptet")) tags.push("UPTET")
  if (t.includes("super tet")) tags.push("Super TET")
  if (t.includes("kvs")) tags.push("KVS")
  
  // Police
  if (t.includes("police")) tags.push("Police")
  if (t.includes("constable")) tags.push("Constable")
  
  // Default tags based on common subjects
  if (t.includes("gk") || t.includes("general knowledge")) tags.push("GK")
  if (t.includes("reasoning")) tags.push("Reasoning")
  if (t.includes("maths") || t.includes("mathematics") || t.includes("quant")) tags.push("Maths")
  if (t.includes("english")) tags.push("English")
  if (t.includes("current affairs")) tags.push("Current Affairs")
  
  return tags.length > 0 ? tags.slice(0, 3) : ["Practice"]
}

// ── Auto-fetch platforms (internal use only - names not displayed) ─────────
const AUTO_PLATFORMS = [
  { api: "https://careerwillapi.classx.co.in", webBase: "https://careerwill.classx.co.in" },
  { api: "https://exampurapi.classx.co.in",    webBase: "https://exampur.classx.co.in" },
  { api: "https://adda247api.classx.co.in",    webBase: "https://adda247.classx.co.in" },
  { api: "https://dronstudyapi.classx.co.in",  webBase: "https://dronstudy.classx.co.in" },
  { api: "https://mahendrasapi.classx.co.in",  webBase: "https://mahendras.classx.co.in" },
  { api: "https://studyiqapi.classx.co.in",    webBase: "https://studyiq.classx.co.in" },
  { api: "https://physicswallahapi.classx.co.in", webBase: "https://physicswallah.classx.co.in" },
  { api: "https://khangsapi.classx.co.in",     webBase: "https://khangs.classx.co.in" },
  { api: "https://testbookapi.classx.co.in",   webBase: "https://testbook.classx.co.in" },
]

// Popular exam quick-search tags for the hero section
const QUICK_SEARCH_TAGS = ["SSC CGL", "IBPS PO", "NDA", "RRB NTPC", "UPSC", "JEE Main", "NEET", "CTET"]

// ── Component ───────────────────────────────────────────────────────────────
export default function ExtractPage() {
  const router = useRouter()
  const [selectedCat, setSelectedCat] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"default" | "tests" | "questions" | "difficulty">("default")
  const [platformQuery, setPlatformQuery] = useState("")
  const [platformResults, setPlatformResults] = useState<SearchResult[]>([])
  const [platformLoading, setPlatformLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [platformName, setPlatformName] = useState("")
  const [liveSeries, setLiveSeries] = useState<DisplaySeries[] | null>(null)
  const [autoLiveSeries, setAutoLiveSeries] = useState<(DisplaySeries & { _apiBase: string; _webBase: string; _raw: unknown })[]>([])
  const [autoFetching, setAutoFetching] = useState(true)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [showAll, setShowAll] = useState(false)
  const [recentlyViewed, setRecentlyViewed] = useState<DisplaySeries[]>([])
  const [chunkError, setChunkError] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Load recently viewed from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("techvyro_recently_viewed")
      if (stored) setRecentlyViewed(JSON.parse(stored).slice(0, 6))
    } catch { /* ignore */ }
  }, [])

  // Listen for chunk load errors globally
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.message?.includes("Loading chunk") || e.message?.includes("ChunkLoadError")) {
        setChunkError(true)
      }
    }
    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [])

  // Auto-fetch from real AppX APIs on page load
  useEffect(() => {
    let cancelled = false
    const fetchAll = async () => {
      setAutoFetching(true)
      const found: (DisplaySeries & { _apiBase: string; _webBase: string; _raw: unknown })[] = []

await Promise.allSettled(
  AUTO_PLATFORMS.map(async (platform, idx) => {
  try {
  const params = new URLSearchParams({ apiUrl: platform.api, url: platform.webBase })
            const res = await fetch(`/api/extract?${params}`)
            if (!res.ok) return
            const data = await res.json()
if (!data.success || data.source === "sample" || !data.testSeries?.length) return
  const mapped = (data.testSeries as Array<{ id?: string | number; title?: string; name?: string; slug?: string; description?: string; total_tests?: number }>)
  .slice(0, 4)
  .map((s, i) => {
  const detectedCat = detectCategory(s.title || s.name || "")
  return {
  id: `live-${idx}-${s.id || i}`,
  title: s.title || s.name || `Mock Test ${i + 1}`,
  subtitle: s.description || "Complete preparation series with practice tests",
  category: detectedCat,
  examTags: extractExamTags(s.title || s.name || ""),
  totalTests: s.total_tests || 10,
  totalQuestions: (s.total_tests || 10) * 15,
  duration: "60 min/test",
  language: "Hindi + English",
  slug: s.slug || String(s.id || i),
  sampleCategory: "ssc-banking",
  color: CAT_COLORS[detectedCat] || "#8b5cf6",
  icon: "🎓",
  badge: "LIVE" as const,
_apiBase: data.apiBase || platform.api,
  _webBase: data.webBase || platform.webBase,
  _raw: s,
  }
  })
            if (!cancelled) found.push(...mapped)
          } catch { /* blocked/timeout — ignore */ }
        })
      )

      if (!cancelled) {
        setAutoLiveSeries(found)
        setAutoFetching(false)
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const searchPlatforms = useCallback(async (q: string) => {
    if (q.length < 2) { setPlatformResults([]); setShowDropdown(false); return }
    setPlatformLoading(true)
    try {
      const res = await fetch(`/api/extract/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error("Search failed")
      const data = await res.json()
      setPlatformResults(data.results || [])
      setShowDropdown(true)
    } catch { setPlatformResults([]) }
    finally { setPlatformLoading(false) }
  }, [])

  const handlePlatformChange = (val: string) => {
    setPlatformQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchPlatforms(val), 300)
  }

const loadPlatform = async (platform: SearchResult) => {
  setShowDropdown(false)
  setPlatformQuery("")
  setPlatformName("") // Don't show platform name
  setLoading(true)
  setError("")
  setNotice("")
  setLiveSeries(null)
  setSelectedCat("all")
  
  try {
  const params = new URLSearchParams({ apiUrl: platform.api, url: platform.webBase })
  const res = await fetch(`/api/extract?${params}`)
  if (!res.ok) throw new Error("Network error")
  const data = await res.json()
  
  if (!data.success) {
  setError("Could not load mock tests. Try another search.")
  setLoading(false)
  return
  }
  
  const rawSeries = (data.testSeries || []) as Array<{ id?: string | number; title?: string; name?: string; slug?: string; description?: string; total_tests?: number }>
  if (data.source === "sample" || rawSeries.length === 0) {
  setNotice("Live extraction unavailable. Showing practice tests below.")
  setLiveSeries(null)
  } else {
  const mapped: DisplaySeries[] = rawSeries.map((s, i) => ({
  id: String(s.id || i),
  title: s.title || s.name || `Mock Test ${i + 1}`,
  subtitle: s.description || "Complete preparation with mock tests",
  category: detectCategory(s.title || s.name || ""),
  examTags: extractExamTags(s.title || s.name || ""),
  totalTests: s.total_tests || 10,
  totalQuestions: (s.total_tests || 10) * 15,
  duration: "60 min/test",
  language: "Hindi + English",
  slug: s.slug || String(s.id || i),
  sampleCategory: "ssc-banking",
  color: CAT_COLORS[detectCategory(s.title || s.name || "")] || "#8b5cf6",
  icon: "🎓",
  badge: "LIVE" as const,
  _raw: s,
  _apiBase: data.apiBase,
  _webBase: data.webBase,
  } as DisplaySeries & { _raw: typeof s; _apiBase: string; _webBase: string }))
  setPlatformName("") // Don't expose any names
  setLiveSeries(mapped)
  }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const goToSeries = (series: DisplaySeries & { _raw?: unknown; _apiBase?: string; _webBase?: string }) => {
    // Save to recently viewed
    try {
      const stored = JSON.parse(localStorage.getItem("techvyro_recently_viewed") || "[]") as DisplaySeries[]
      const updated = [series, ...stored.filter(s => s.id !== series.id)].slice(0, 6)
      localStorage.setItem("techvyro_recently_viewed", JSON.stringify(updated))
      setRecentlyViewed(updated)
    } catch { /* ignore */ }

    if (series._raw && series._apiBase) {
      const raw = series._raw as { id?: string | number; title?: string; name?: string; slug?: string }
      const slug = raw.slug || String(raw.id || "")
      const params = new URLSearchParams({
        slug,
        apiBase: series._apiBase!,
        webBase: series._webBase || "",
        title: raw.title || raw.name || series.title,
      })
      router.push(`/test-series/series?${params.toString()}`)
    } else {
      const params = new URLSearchParams({
        slug: series.slug,
        apiBase: `sample:${series.sampleCategory}`,
        webBase: "",
        title: series.title,
      })
      router.push(`/test-series/series?${params.toString()}`)
    }
  }

  const clearPlatform = () => {
    setPlatformQuery("")
    setPlatformName("")
    setPlatformResults([])
    setLiveSeries(null)
    setNotice("")
    setError("")
    setLoading(false)
  }

  // Determine which series to show
  const baseLibrary = liveSeries || [
    ...(autoLiveSeries as DisplaySeries[]),
    ...SERIES_LIBRARY,
  ]

  const filtered = baseLibrary.filter(s => {
    const catMatch = selectedCat === "all" || s.category === selectedCat
    const qMatch = !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.examTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    return catMatch && qMatch
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "tests") return b.totalTests - a.totalTests
    if (sortBy === "questions") return b.totalQuestions - a.totalQuestions
    if (sortBy === "difficulty") {
      const d: Record<string, number> = { Hard: 3, Medium: 2, Easy: 1 }
      return (d[b.difficulty || "Easy"] || 1) - (d[a.difficulty || "Easy"] || 1)
    }
    return 0
  })

  const visible = showAll ? sorted : sorted.slice(0, 12)
  const hasMore = sorted.length > 12 && !showAll

  // Stats
  const totalTests = SERIES_LIBRARY.reduce((s, x) => s + x.totalTests, 0)
  const totalSeries = SERIES_LIBRARY.length

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">

        {/* ── Chunk error banner ── */}
        {chunkError && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span className="text-amber-700">Page loading issue detected.</span>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reload page
            </button>
          </div>
        )}

        {/* ── Hero ── */}
        <section className="bg-gradient-to-br from-violet-600 via-violet-700 to-blue-800 text-white py-12 px-4 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="max-w-5xl mx-auto relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-yellow-400/20 border border-yellow-400/30 rounded-full px-3 py-1">
                <Zap className="h-3.5 w-3.5 text-yellow-300" />
                <span className="text-xs font-bold text-yellow-200 uppercase tracking-wider">Free Mock Test</span>
              </div>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold mb-3 leading-tight">
              Free Mock Tests
              <span className="text-yellow-300">.</span>
            </h1>
            <p className="text-violet-100 text-base md:text-lg mb-8 max-w-2xl">
              Practice unlimited mock tests for SSC, Banking, NDA, Railways, UPSC, JEE/NEET & more. No login needed for free tests.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { icon: BookOpen, label: "Exam Categories", value: "10+" },
                { icon: FileText, label: "Series Available", value: `${totalSeries}+` },
                { icon: BarChart2, label: "Total Tests", value: `${totalTests}+` },
                { icon: CheckCircle, label: "Free Access", value: "100%" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-yellow-300" />
                    <span className="text-xl font-bold">{value}</span>
                  </div>
                  <p className="text-xs text-violet-200">{label}</p>
                </div>
              ))}
            </div>

            {/* Platform search */}
            <div className="relative max-w-xl" ref={dropdownRef}>
              <div className="relative">
                {platformLoading
                  ? <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-violet-500" />
                  : <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                }
                <Input
                  value={platformQuery}
                  onChange={e => handlePlatformChange(e.target.value)}
                  onFocus={() => platformResults.length > 0 && setShowDropdown(true)}
                  placeholder="Search mock tests (SSC, Banking, NDA...)"
                  className="pl-11 pr-10 h-13 text-base bg-white text-gray-900 border-0 shadow-xl rounded-xl"
                  style={{ height: "52px" }}
                  disabled={loading}
                  autoComplete="off"
                  suppressHydrationWarning
                />
                {platformQuery && (
                  <button onClick={clearPlatform} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
{showDropdown && platformResults.length > 0 && !loading && (
  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
      <p className="text-xs font-medium text-gray-500">Found {platformResults.length} mock test sources</p>
    </div>
    {platformResults.map((r, i) => {
      const result = r as SearchResult & { category?: string; displayName?: string }
      return (
        <button
          key={i}
          className="w-full text-left px-4 py-3 hover:bg-violet-50 transition-colors border-b border-gray-100 last:border-0 flex items-center gap-3"
          onClick={() => loadPlatform(r)}
        >
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="h-4 w-4 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-800">{result.displayName || result.category || "Mock Test"}</p>
            <p className="text-xs text-gray-500">Click to load tests</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </button>
      )
    })}
  </div>
)}
              {showDropdown && platformQuery.length >= 2 && platformResults.length === 0 && !platformLoading && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  No platforms found for &quot;{platformQuery}&quot;
                </div>
              )}
            </div>

            {/* Exam quick-links */}
            <div className="flex flex-wrap gap-2 mt-5">
              {["SSC CGL", "IBPS PO", "NDA", "RRB NTPC", "UPSC", "JEE Main", "NEET", "CTET"].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="text-xs px-3 py-1 bg-white/15 hover:bg-white/25 border border-white/30 rounded-full font-medium transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Notice / Error / Loading ── */}
        {(notice || error || loading) && (
          <div className="max-w-6xl mx-auto px-4 mt-4">
            {loading && (
              <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl p-4">
                <Loader2 className="h-5 w-5 text-violet-600 animate-spin flex-shrink-0" />
                <div>
                  <p className="font-semibold text-violet-700">Loading Mock Tests...</p>
                  <p className="text-sm text-violet-600">Fetching available tests and questions</p>
                </div>
              </div>
            )}
            {notice && !loading && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-700">{notice}</p>
                  <p className="text-sm text-amber-600 mt-0.5">Browse our free mock tests below</p>
                </div>
              </div>
            )}
            {error && !loading && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                  <button onClick={clearPlatform} className="text-xs text-red-500 underline mt-1">Clear and try again</button>
                </div>
              </div>
            )}
          </div>
        )}

{/* Live data header - no platform name shown */}
        {liveSeries && liveSeries.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 mt-4 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-green-600" />
                Mock Tests Loaded
                <span className="text-xs font-normal text-green-600 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">LIVE DATA</span>
              </h2>
              <p className="text-sm text-muted-foreground">{liveSeries.length} mock tests ready to attempt</p>
            </div>
            <button onClick={clearPlatform} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5 bg-background">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        )}

        {/* ── Recently Viewed ── */}
        {recentlyViewed.length > 0 && !liveSeries && !searchQuery && (
          <div className="max-w-6xl mx-auto px-4 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recently Viewed</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {recentlyViewed.map(s => {
                const col = CAT_COLORS[s.category] || s.color || "#8b5cf6"
                return (
                  <button
                    key={s.id}
                    onClick={() => goToSeries(s)}
                    className="flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-card hover:shadow-md transition-all text-left group"
                    style={{ minWidth: 200, maxWidth: 220 }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm" style={{ backgroundColor: `${col}18`, color: col }}>
                      {s.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate group-hover:text-violet-600 transition-colors">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground">{s.totalTests} tests</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Main content area ── */}
        <div className="max-w-6xl mx-auto px-4 py-6">

          {/* Search + Sort bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowAll(false) }}
                placeholder="Search mock tests, exam name..."
                className="pl-9 pr-8 h-10"
                suppressHydrationWarning
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="h-10 pl-8 pr-3 text-sm border border-border rounded-lg bg-background appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="default">Default</option>
                  <option value="tests">Most Tests</option>
                  <option value="questions">Most Questions</option>
                  <option value="difficulty">By Difficulty</option>
                </select>
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground border border-border rounded-lg px-3 h-10">
                <SlidersHorizontal className="h-4 w-4" />
                <span>{sorted.length}</span>
              </div>
            </div>
          </div>

          {/* Category tabs */}
          {!liveSeries && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCat(cat.id); setShowAll(false) }}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${
                    selectedCat === cat.id
                      ? "text-white border-transparent shadow-md"
                      : "bg-background text-foreground border-border hover:border-violet-400 hover:text-violet-600"
                  }`}
                  style={selectedCat === cat.id ? { backgroundColor: cat.color, boxShadow: `0 4px 14px ${cat.color}40` } : {}}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {selectedCat === cat.id && (
                    <span className="text-[10px] bg-white/25 rounded-full px-1.5 py-0.5">
                      {SERIES_LIBRARY.filter(s => cat.id === "all" || s.category === cat.id).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Auto-fetch status */}
          {autoFetching && !liveSeries && (
            <div className="flex items-center gap-2 mb-4 px-1 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
              <span>Loading more mock tests...</span>
            </div>
          )}
          {!autoFetching && autoLiveSeries.length > 0 && !liveSeries && (
            <div className="flex items-center gap-2 mb-4 px-1 text-xs text-green-600 font-medium bg-green-50 border border-green-200 rounded-lg px-3 py-2 w-fit">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{autoLiveSeries.length} live series at the top</span>
            </div>
          )}

          {/* Series grid */}
          {!loading && sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-semibold">No mock tests found</p>
              <p className="text-muted-foreground text-sm mt-1">Try a different category or search term</p>
              <button onClick={() => { setSearchQuery(""); setSelectedCat("all") }} className="mt-4 text-sm text-violet-600 underline">Clear filters</button>
            </div>
          )}

          {!loading && visible.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((series) => (
                <SeriesCard
                  key={series.id}
                  series={series}
                  searchQuery={searchQuery}
                  onStart={() => goToSeries(series as DisplaySeries & { _raw?: unknown; _apiBase?: string; _webBase?: string })}
                />
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setShowAll(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-background hover:bg-muted/60 text-sm font-semibold transition-all hover:shadow-md"
              >
                <ChevronDown className="h-4 w-4" />
                Show all {sorted.length} series
              </button>
            </div>
          )}
        </div>

        {/* ── How it Works Section ── */}
        {!liveSeries && (
          <section className="bg-muted/30 border-t border-border py-10 px-4 mt-2">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <h2 className="text-xl font-bold">How to Practice</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-5">Start practicing with our vast collection of mock tests</p>
              
              {/* How it works */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { step: "1", icon: BookOpen, title: "Select Category", desc: "Choose from SSC, Banking, Railways, NDA, UPSC and more exam categories" },
                  { step: "2", icon: FileText, title: "Pick a Mock Test", desc: "Browse mock tests and click Attempt Now to start" },
                  { step: "3", icon: Zap, title: "Start Practicing", desc: "Questions load instantly — practice as much as you want!" },
                ].map(s => (
                  <div key={s.step} className="flex gap-3 p-4 rounded-xl bg-background border border-border">
                    <div className="w-8 h-8 rounded-full bg-violet-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {s.step}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}

// ── Series Card ────────────�����────────────────────────────────────────────────
function SeriesCard({ series, onStart, searchQuery }: {
  series: DisplaySeries
  onStart: () => void
  searchQuery?: string
}) {
  const catColor = CAT_COLORS[series.category] || series.color || "#8b5cf6"
  const catIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    ssc: FileText, banking: TrendingUp, nda: Shield, railways: Train,
    upsc: Award, jee: Atom, teaching: BookOpen, state: GraduationCap, police: Users,
  }
  const CatIcon = catIcons[series.category] || GraduationCap

  const diffColor = series.difficulty === "Hard" ? "text-red-600 bg-red-50 border-red-200"
    : series.difficulty === "Medium" ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-green-600 bg-green-50 border-green-200"

  const highlight = (text: string) => {
    if (!searchQuery) return text
    const idx = text.toLowerCase().indexOf(searchQuery.toLowerCase())
    if (idx === -1) return text
    return text.slice(0, idx) + "**" + text.slice(idx, idx + searchQuery.length) + "**" + text.slice(idx + searchQuery.length)
  }

  return (
    <div className="group relative rounded-2xl border border-border bg-card hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Colored top strip */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${catColor}, ${catColor}55)` }} />

      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${catColor}15` }}
            >
              <CatIcon className="h-5 w-5" style={{ color: catColor }} />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                FREE
              </span>
              {series.difficulty && (
                <span className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${diffColor}`}>
                  {series.difficulty}
                </span>
              )}
            </div>
          </div>
          {series.badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
              series.badge === "HOT" ? "bg-red-100 text-red-600 border-red-200"
              : series.badge === "LIVE" ? "bg-green-100 text-green-700 border-green-200 animate-pulse"
              : series.badge === "POPULAR" ? "bg-amber-100 text-amber-700 border-amber-200"
              : "bg-blue-100 text-blue-700 border-blue-200"
            }`}>
              {series.badge === "HOT" ? "🔥 HOT" : series.badge === "LIVE" ? "🔴 LIVE" : series.badge === "POPULAR" ? "⭐ POPULAR" : series.badge}
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h3 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-violet-600 transition-colors">
            {searchQuery && series.title.toLowerCase().includes(searchQuery.toLowerCase())
              ? <>{highlight(series.title).split("**").map((part, i) =>
                  i % 2 === 1 ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm">{part}</mark> : part
                )}</>
              : series.title
            }
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{series.subtitle}</p>
        </div>

        {/* Exam tags */}
        <div className="flex flex-wrap gap-1.5">
          {series.examTags.filter(t => t !== "LIVE").slice(0, 3).map(tag => (
            <span
              key={tag}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md border"
              style={{ color: catColor, backgroundColor: `${catColor}10`, borderColor: `${catColor}30` }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {series.totalTests} Tests
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {series.duration}
          </span>
          <span className="flex items-center gap-1 ml-auto text-[10px]">
            🌐 {series.language}
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] shadow-sm"
          style={{ background: `linear-gradient(135deg, ${catColor}, ${catColor}bb)` }}
        >
          Attempt Now
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
