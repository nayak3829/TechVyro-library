"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { MouseEvent } from "react"
import { Home, Search, BookOpen, FileText, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function NotFound() {
  const router = useRouter()

  const goBack = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (window.history.length > 1) window.history.back()
    else router.push("/")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-lg mx-auto">
          {/* 404 Illustration */}
          <div className="relative mb-8">
            <div className="text-[150px] sm:text-[200px] font-bold text-primary/10 leading-none select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-primary/10 rounded-full p-6 sm:p-8">
                <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
              </div>
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Page Not Found
          </h1>
          <p className="text-muted-foreground mb-8 text-sm sm:text-base leading-relaxed">
            Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved. 
            Don&apos;t worry, let&apos;s get you back on track.
          </p>

          {/* Primary Action */}
          <Button asChild size="lg" className="mb-8 gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>

          {/* Quick Links */}
          <div className="border-t border-border pt-8">
            <p className="text-sm text-muted-foreground mb-4">Or try one of these:</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/browse">
                  <Search className="h-3.5 w-3.5" />
                  Browse PDFs
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/quiz">
                  <BookOpen className="h-3.5 w-3.5" />
                  Take Quiz
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/test-series">
                  <FileText className="h-3.5 w-3.5" />
                  Mock Tests
                </Link>
              </Button>
            </div>
          </div>

          {/* Go Back Link */}
          <div className="mt-8">
            <Button variant="ghost" size="sm" onClick={goBack} className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Go Back
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
