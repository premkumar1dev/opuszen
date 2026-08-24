import { type MetaFunction } from "react-router";
import { Layout } from "../components/Layout";

import { buildPageMetaTags } from "~/utils/meta-helper";

export const meta: MetaFunction = ({ matches }) => {
	return buildPageMetaTags(matches, "/terms");
};

export default function TermsRoute() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
            Terms of Service
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Please read these terms carefully before using the OpusZen API gateway and dashboard services.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2 font-mono">
            Last updated: July 7, 2026
          </p>
        </div>

        {/* Content Sections */}
        <div className="bg-card dark:bg-card/60 p-6 sm:p-10 md:p-12 rounded-3xl border border-border/80 shadow-sm space-y-12">
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-primary shrink-0" aria-hidden="true" />
              1. Acceptance of Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              By accessing or using the OpusZen platform, API endpoints, or user dashboard, you agree to be bound by these Terms of Service. If you do not agree to all terms and conditions, you must not access or use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-primary shrink-0" aria-hidden="true" />
              2. Description of Service
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              OpusZen provides a high-performance, Anthropic-compatible API gateway and management interface for AI developers and enterprise workflows. Access to API keys and models requires active account registration and compliance with balance/quota limits.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-primary shrink-0" aria-hidden="true" />
              3. API Usage & Quota Guidelines
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              All API requests are governed by token pricing, rate limits, and credit balances:
            </p>
            <div className="bg-muted/40 dark:bg-muted/20 p-5 rounded-2xl border border-border/40 text-sm sm:text-base text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Rate Limits & Security Policy
              </p>
              <p>
                Attempting to bypass rate limits, probe infrastructure vulnerabilities, or execute automated denial-of-service attempts will result in immediate suspension of API keys without refund.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-primary shrink-0" aria-hidden="true" />
              4. Payment & Refund Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              Balances purchased in INR or foreign currencies are used on a pay-as-you-go token model. Unused token credits remain valid according to your selected plan duration. Refund requests are subject to verification and review by our support team.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-primary shrink-0" aria-hidden="true" />
              5. Limitation of Liability
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              OpusZen provides the service on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis. We disclaim all warranties of any kind, whether express or implied. Under no circumstances shall OpusZen be liable for indirect, incidental, or consequential damages resulting from service interruptions or upstream model provider downtime.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
