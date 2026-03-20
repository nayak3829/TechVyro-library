import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { WhatsAppPopup } from "@/components/whatsapp-popup"
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'TechVyro - PDF Library | Browse, Download & Share PDFs',
  description: 'TechVyro PDF Library - A modern platform where you can browse, view, download, and share PDF documents organized by categories.',
  generator: 'v0.app',
  keywords: ['TechVyro', 'PDF', 'Library', 'Download', 'Books', 'Documents', 'Free PDF'],
  authors: [{ name: 'TechVyro', url: 'https://www.techvyro.in/' }],
  creator: 'TechVyro',
  publisher: 'TechVyro',
  openGraph: {
    title: 'TechVyro - PDF Library',
    description: 'Browse, download, and share PDF documents from TechVyro curated collection',
    url: 'https://www.techvyro.in/',
    siteName: 'TechVyro',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TechVyro - PDF Library',
    description: 'Browse, download, and share PDF documents from TechVyro curated collection',
  },
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
          <WhatsAppPopup />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
