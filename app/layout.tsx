import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { WhatsAppPopup } from "@/components/whatsapp-popup"
import { MobileNav } from "@/components/mobile-nav"
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

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
  title: 'TechVyro - Free PDF Library | NDA Notes, Study Materials & Educational PDFs',
  description: 'Download free NDA PDFs, study notes, previous year papers & educational materials. 10,000+ students trust TechVyro for quality PDFs - CBSE, Engineering, Medical & Competitive Exams.',
  generator: 'v0.app',
  keywords: [
    'TechVyro', 'Free PDF Download', 'NDA Notes PDF', 'Free Study Material',
    'CBSE Notes PDF', 'Engineering Notes', 'Medical Notes PDF', 'Previous Year Papers',
    'Competitive Exam PDF', 'Free Educational PDFs', 'Study Notes Download',
    'B.Tech Notes', 'NEET PDF', 'JEE PDF', 'SSC PDF', 'UPSC PDF',
    'Free Books PDF', 'College Notes', 'School Notes PDF'
  ],
  authors: [{ name: 'TechVyro', url: 'https://www.techvyro.in/' }],
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
    description: 'Download free NDA PDFs, study notes & educational materials. Trusted by 10,000+ students for quality PDFs.',
    url: 'https://www.techvyro.in/',
    siteName: 'TechVyro PDF Library',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TechVyro - Free PDF Library | NDA Notes & Study Materials',
    description: 'Download free NDA PDFs, study notes & educational materials. Trusted by 10,000+ students.',
    creator: '@techvyro',
  },
  alternates: {
    canonical: 'https://www.techvyro.in/',
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
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-6111784142192967" />
      </head>
      <body className="font-sans antialiased">
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6111784142192967"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
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
        <Analytics />
      </body>
    </html>
  )
}
