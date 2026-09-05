import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { WhatsAppPopup } from "@/components/whatsapp-popup"
import { InitialSiteLoader } from "@/components/initial-site-loader"
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
  metadataBase: new URL('https://www.techvyro.in'),
  title: 'TechVyro - Free PDF Library | NDA Notes, Study Materials & Educational PDFs',
  description: 'Download free NDA PDFs, study notes, previous year papers and educational materials for CBSE, engineering, medical and competitive exams.',
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
    description: 'Download free NDA PDFs, study notes and educational materials for academic and competitive exams.',
    url: 'https://www.techvyro.in/',
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
  verification: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE 
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE }
    : undefined,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-6111784142192967" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6111784142192967"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased">
        <InitialSiteLoader />
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
