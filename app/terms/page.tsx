import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { FileText, Scale, AlertTriangle, Mail, Calendar } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service | TechVyro",
  description: "TechVyro Terms of Service - Read our terms and conditions for using our platform.",
}

export default function TermsOfServicePage() {
  const lastUpdated = "January 15, 2025"

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-6">
              <Scale className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
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
                Agreement to Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using TechVyro (&quot;the Website&quot;), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our services. These terms apply to all 
                visitors, users, and others who access or use the Website.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Description of Services</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                TechVyro provides the following services:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Free access to educational PDFs and study materials</li>
                <li>Interactive quizzes for competitive exam preparation</li>
                <li>Mock test series for various examinations (NDA, SSC, Banking, etc.)</li>
                <li>User accounts for tracking progress and bookmarking content</li>
              </ul>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">User Accounts</h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  When you create an account with us, you must provide accurate and complete information. 
                  You are responsible for:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized use</li>
                </ul>
                <p className="leading-relaxed">
                  We reserve the right to suspend or terminate accounts that violate these terms.
                </p>
              </div>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Use the Website for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to any part of the Website</li>
                <li>Interfere with or disrupt the Website or servers</li>
                <li>Scrape, copy, or redistribute content without permission</li>
                <li>Upload malicious code or attempt to compromise security</li>
                <li>Impersonate any person or entity</li>
                <li>Use automated systems to access the Website without permission</li>
              </ul>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Website and its original content, features, and functionality are owned by TechVyro and 
                are protected by international copyright, trademark, and other intellectual property laws.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Educational materials provided on this platform are for personal, non-commercial use only. 
                You may not reproduce, distribute, modify, or create derivative works without our express 
                written permission.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Content Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                While we strive to provide accurate and up-to-date educational content:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>We do not guarantee the accuracy, completeness, or reliability of any content</li>
                <li>Content is provided for educational purposes only and should not be considered official</li>
                <li>Users should verify information from official sources for examinations</li>
                <li>We are not affiliated with any government body or examination authority</li>
              </ul>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Limitation of Liability
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, TechVyro shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages, including but not limited to loss 
                of profits, data, or other intangible losses, resulting from your use of or inability to 
                use the Website.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Third-Party Links</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Website may contain links to third-party websites or services that are not owned or 
                controlled by TechVyro. We have no control over and assume no responsibility for the content, 
                privacy policies, or practices of any third-party websites or services.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Advertisements</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Website displays advertisements through Google AdSense and other advertising partners. 
                These advertisements help us provide free content to users. By using the Website, you agree 
                to the display of such advertisements. Ad blockers may affect Website functionality.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may terminate or suspend your access to the Website immediately, without prior notice or 
                liability, for any reason, including breach of these Terms. Upon termination, your right to 
                use the Website will cease immediately.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of India, without 
                regard to its conflict of law provisions. Any disputes arising from these terms shall be 
                subject to the exclusive jurisdiction of the courts in India.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, 
                we will provide at least 30 days&apos; notice prior to any new terms taking effect. What constitutes 
                a material change will be determined at our sole discretion.
              </p>
            </section>

            <section className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Contact Us
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
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
