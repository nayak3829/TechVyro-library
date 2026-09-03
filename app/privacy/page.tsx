import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { FileText, Shield, Cookie, Mail, Calendar } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | TechVyro",
  description: "TechVyro Privacy Policy - Learn how we collect, use, and protect your personal information.",
}

export default function PrivacyPolicyPage() {
  const lastUpdated = "January 15, 2025"

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-6">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" />
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Introduction
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to TechVyro (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring 
                the security of your personal information. This Privacy Policy explains how we collect, use, disclose, 
                and safeguard your information when you visit our website techvyro.in and use our services.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Information We Collect</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h3 className="font-medium text-foreground mb-2">Personal Information</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Name and email address (when you create an account)</li>
                    <li>Profile information (optional)</li>
                    <li>Communication preferences</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Automatically Collected Information</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>IP address and device information</li>
                    <li>Browser type and version</li>
                    <li>Pages visited and time spent on pages</li>
                    <li>Referring website addresses</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>To provide and maintain our services</li>
                <li>To personalize your experience on our platform</li>
                <li>To send you updates about new PDFs, quizzes, and features</li>
                <li>To respond to your inquiries and support requests</li>
                <li>To analyze usage patterns and improve our services</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Cookie className="h-5 w-5 text-primary" />
                Cookies and Tracking Technologies
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use cookies and similar tracking technologies to enhance your experience on our website. These include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website</li>
                <li><strong>Advertising Cookies:</strong> Used by Google AdSense to display relevant advertisements</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                You can manage your cookie preferences through your browser settings. Note that disabling certain 
                cookies may affect the functionality of our website.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the following third-party services that may collect information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>Google AdSense:</strong> For displaying advertisements. Google may use cookies to serve ads based on your prior visits.</li>
                <li><strong>Google Analytics:</strong> For website analytics and performance monitoring.</li>
                <li><strong>Supabase:</strong> For authentication and data storage.</li>
                <li><strong>Vercel:</strong> For hosting and analytics.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                These third parties have their own privacy policies governing their use of your information.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your personal 
                information against unauthorized access, alteration, disclosure, or destruction. However, no method 
                of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Opt-out of marketing communications</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Children&apos;s Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our services are intended for users who are at least 13 years of age. We do not knowingly collect 
                personal information from children under 13. If we become aware that we have collected personal 
                information from a child under 13, we will take steps to delete such information.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. We encourage you to 
                review this Privacy Policy periodically.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Contact Us
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <p className="mt-4">
                <a href="mailto:techvyro@gmail.com" className="text-primary hover:underline">
                  techvyro@gmail.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
