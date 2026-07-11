import { type MetaFunction } from "react-router";
import { Layout } from "../components/Layout";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy | Opuszen" },
    {
      name: "description",
      content: "Privacy Policy for OpusZen — Anthropic-compatible API gateway.",
    },
  ];
};

export default function PrivacyRoute() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            We value your privacy and are committed to protecting your personal and API request data.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2 font-mono">
            Last updated: July 7, 2026
          </p>
        </div>

        {/* Content Sections */}
        <div className="bg-card dark:bg-card/60 p-6 sm:p-10 md:p-12 rounded-3xl border border-border/80 shadow-sm space-y-12">
          
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-violet-500 shrink-0" aria-hidden="true" />
              1. Information We Collect
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              To provide the Opuszen API gateway, we collect and process the following information:
            </p>
            <ul className="space-y-2 pl-5 text-muted-foreground text-sm sm:text-base" role="list">
              <li className="flex items-start gap-2.5">
                <span className="text-primary font-bold select-none">•</span>
                <span><strong>API Keys:</strong> Cryptographically protected keys you configure and manage inside the platform.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-primary font-bold select-none">•</span>
                <span><strong>Gateway Metrics:</strong> Quantitative details of request headers and body meta information, such as timestamps, token usage counts, response durations, and error codes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-primary font-bold select-none">•</span>
                <span><strong>Authentication & Profile Data:</strong> If applicable, your name, email address, and authentication tokens required to manage keys and budget configurations.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-violet-500 shrink-0" aria-hidden="true" />
              2. Data Processing & Zero Content Retention
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              Our proxy gateway operates with a strict <strong>Zero Content Retention</strong> policy for LLM prompt and completion text:
            </p>
            <div className="bg-muted/40 dark:bg-muted/20 p-5 rounded-2xl border border-border/40 text-sm sm:text-base text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Secure Transit Proxying
              </p>
              <p>
                All model request prompts and response contents are streamed directly to and from Anthropic servers. We do <strong>not</strong> log, write to disk, inspect, store, or share the prompts, inputs, or generated output contents.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-violet-500 shrink-0" aria-hidden="true" />
              3. Data Sharing
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              We pass API requests directly to the LLM backend provider (Anthropic, PBC) using secure transport protocol layers. Anthropic processes this data under their own developer terms and privacy policy. We do not sell, trade, or distribute your personal details or API payload information to third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-violet-500 shrink-0" aria-hidden="true" />
              4. Data Security
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              We implement industry-standard administrative, physical, and technical safeguards designed to protect your API keys and dashboard credentials against unauthorized access, destruction, loss, alteration, or disclosure. All connections are encrypted via HTTPS/TLS.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-violet-500 shrink-0" aria-hidden="true" />
              5. Cookies and Tracking
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              We use strictly necessary cookies or local storage settings to remember your authentication session, UI state choices (such as dark mode preferences), and dashboard settings. No advertising or tracking cookies are employed by this Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-violet-500 shrink-0" aria-hidden="true" />
              6. Your Rights & Contacts
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              Depending on your location, you may have rights under the GDPR, CCPA, or other data privacy laws, including the right to access, correct, or delete any personal metadata we hold about you. To request deletion of your account metadata or for any privacy-related queries, please open a support inquiry or email us directly.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
