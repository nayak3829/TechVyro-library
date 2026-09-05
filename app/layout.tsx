import type { Metadata, Viewport } from 'next'
import dynamic from 'next/dynamic'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { MobileNav } from "@/components/mobile-nav"
import { canonicalUrl, getCanonicalOrigin } from "@/lib/site-url"
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const WhatsAppPopup = dynamic(() => import("@/components/whatsapp-popup").then(module => module.WhatsAppPopup))

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(getCanonicalOrigin()),
  title: 'TechVyro - Free PDF Library | NDA Notes, Study Materials & Educational PDFs',
  description: 'Download free NDA PDFs, study notes, previous year papers and educational materials for CBSE, engineering, medical and competitive exams.',
  keywords: [
    'TechVyro', 'Free PDF Download', 'NDA Notes PDF', 'Free Study Material',
    'CBSE Notes PDF', 'Engineering Notes', 'Medical Notes PDF', 'Previous Year Papers',
    'Competitive Exam PDF', 'Free Educational PDFs', 'Study Notes Download',
    'B.Tech Notes', 'NEET PDF', 'JEE PDF', 'SSC PDF', 'UPSC PDF',
    'Free Books PDF', 'College Notes', 'School Notes PDF'
  ],
  authors: [{ name: 'TechVyro', url: canonicalUrl('/') }],
  creator: 'TechVyro',
  publisher: 'TechVyro',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'TechVyro - Free PDF Library | Download Study Materials & Notes',
    description: 'Download free NDA PDFs, study notes and educational materials for academic and competitive exams.',
    url: canonicalUrl('/'),
    siteName: 'TechVyro PDF Library',
    type: 'website',
    locale: 'en_IN',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TechVyro - Free PDF Library for Study Materials & Notes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TechVyro - Free PDF Library | NDA Notes & Study Materials',
    description: 'Download free NDA PDFs, study notes and educational materials for academic and competitive exams.',
    creator: '@techvyro',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: canonicalUrl('/'),
  },
  category: 'Education',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE 
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE }
    : undefined,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const origin = getCanonicalOrigin()
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "TechVyro",
      url: origin,
      logo: canonicalUrl("/apple-icon.png"),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "TechVyro",
      url: origin,
      potentialAction: {
        "@type": "SearchAction",
        target: `${origin}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ]
  const serializedStructuredData = JSON.stringify(structuredData).replace(/</g, "\\u003c")

  return (
    <html lang="en-IN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializedStructuredData }}
        />
        <meta name="google-adsense-account" content="ca-pub-6111784142192967" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="pb-20 md:pb-0">
            {children}
          </div>
          <MobileNav />
          <Toaster richColors position="top-right" />
          <WhatsAppPopup />
        </ThemeProvider>
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  )
}
