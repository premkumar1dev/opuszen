import { type MetaFunction } from "react-router";
import type { Route } from "./+types/docs";
import { Layout } from "../components/Layout";
import { useState, useEffect } from "react";

export const meta: MetaFunction = () => {
 return [
 { title: "Documentation | Opuszen" },
 {
 name: "description",
 content:
 "Documentation for OpusZen — Anthropic-compatible API gateway with multi-tenant key management. Quick start, API reference, models, and IDE configuration.",
 },
 ];
};

// ─── Table of contents ───────────────────────────────────────────────────────

const sections = [
 { id: "overview", label: "Overview" },
 { id: "quick-start", label: "Quick Start" },
 { id: "ide-configuration", label: "IDE Configuration" },
 { id: "api-reference", label: "API Reference" },
 { id: "models", label: "Models" },
 { id: "built-in-tools", label: "Built-in Tools" },
 { id: "troubleshooting", label: "Troubleshooting" },
];

// ─── Code block ───────────────────────────────────────────────────────────────

function CodeBlock({ code, lang = "" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="relative group rounded-xl border border-border bg-muted/30 dark:bg-muted/10 overflow-hidden">
      {lang && (
        <div className="px-4 py-2 border-b border-border/40 text-xs font-mono text-muted-foreground dark:text-muted-foreground bg-muted/40 dark:bg-muted/20">
          {lang}
        </div>
      )}

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-lg border border-border bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
        title="Copy to clipboard"
        aria-label="Copy code"
      >
        {copied ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 px-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          </span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        )}
      </button>

      <pre className="p-4 pr-12 overflow-x-auto text-sm font-mono text-foreground dark:text-violet-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
 id,
 title,
 children,
}: {
 id: string;
 title: string;
 children: React.ReactNode;
}) {
 return (
 <section id={id} className="scroll-mt-24 mb-16">
 <h2 className="text-2xl font-bold text-foreground mb-6 pb-3 border-b border-border flex items-center gap-3">
 <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-violet-500" aria-hidden="true" />
 {title}
 </h2>
 {children}
 </section>
 );
}

// ─── Docs page ───────────────────────────────────────────────────────────────

export default function DocsRoute() {
  const [activeSection, setActiveSection] = useState("overview");
  const [host, setHost] = useState("opuszen.shop");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHost(window.location.host);
    }
  }, []);

  const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
  const apiBaseUrl = `${protocol}//${host}`;

  const scrollTo = (id: string) => {
 const el = document.getElementById(id);
 if (el) {
 el.scrollIntoView({ behavior: "smooth", block: "start" });
 setActiveSection(id);
 }
 };

 return (
 <Layout>
 <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
 {/* Page header */}
 <div className="mb-12">
 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/50 bg-primary/10 text-xs font-semibold text-primary mb-4">
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={12}
 height={12}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2.5}
 strokeLinecap="round"
 strokeLinejoin="round"
 aria-hidden="true"
 >
 <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
 </svg>
 Documentation
 </div>
 <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground mb-3">
 <span className="bg-gradient-to-r from-primary via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
 OpusZen Docs
 </span>
 </h1>
 <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
 Anthropic-compatible API gateway providing Claude API access without
 waitlists. Drop-in replacement — just change your base URL.
 </p>
 </div>

 <div className="flex gap-10">
 {/* Side navigation */}
 <aside className="hidden lg:block w-52 shrink-0">
 <nav
 className="sticky top-28 space-y-1 bg-card/50 border border-border/40 rounded-2xl p-3"
 aria-label="Documentation navigation"
 >
 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">On this page</p>
 {sections.map((s) => (
 <button
 key={s.id}
 onClick={() => scrollTo(s.id)}
 className={`block w-full text-left text-sm px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
 activeSection === s.id
 ? "bg-primary/10 text-primary font-semibold shadow-sm"
 : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
 }`}
 >
 {s.label}
 </button>
 ))}
 </nav>
 </aside>

 {/* Main content */}
 <div className="flex-1 min-w-0 max-w-3xl">

 {/* ── Overview ─────────────────────────────────────────── */}
 <Section id="overview" title="Overview">
 <p className="text-muted-foreground leading-relaxed mb-6">
 OpusZen is an Anthropic-compatible API gateway providing Claude
 API access without waitlists. It works with Claude Code, Cursor,
 Windsurf, Cline, Roo Code, and any Anthropic SDK — just swap
 your base URL and go.
 </p>
 <div className="grid sm:grid-cols-2 gap-4">
 {[
 { icon: "⚡", label: "Zero-latency SSE streaming pass-through" },
 { icon: "🔑", label: "Per-key budgets & rolling windows" },
 { icon: "🛠️", label: "Built-in web search & image analysis" },
 { icon: "💰", label: "Prompt caching — cache tokens are free" },
 ].map((item) => (
 <div
 key={item.label}
 className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card/80 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
 >
 <span className="text-xl" aria-hidden="true">
 {item.icon}
 </span>
 <span className="text-sm text-foreground font-medium">
 {item.label}
 </span>
 </div>
 ))}
 </div>
 </Section>

 {/* ── Quick Start ───────────────────────────────────────── */}
 <Section id="quick-start" title="Quick Start">
 <h3 className="text-lg font-semibold text-foreground mb-4">
 Prerequisites
 </h3>
  <ul className="space-y-2 mb-8">
    <li className="flex items-start gap-3 text-sm text-muted-foreground">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
      <span>
        <a
          href="https://nodejs.org/en/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-semibold"
        >
          Node.js 18+
        </a>
      </span>
    </li>
    <li className="flex items-start gap-3 text-sm text-muted-foreground">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
      <span>OpusZen API key (from your admin or reseller)</span>
    </li>
    <li className="flex items-start gap-3 text-sm text-muted-foreground">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
      <span>Supported IDE: Claude Code, VS Code, Cursor, Windsurf, Cline, or Roo Code</span>
    </li>
  </ul>

 <h3 className="text-lg font-semibold text-foreground mb-4">
 Interactive Setup
 </h3>
 <p className="text-sm text-muted-foreground mb-3">
 Run the interactive setup wizard — it handles everything:
 </p>
 <CodeBlock
 lang="bash"
 code={`npx opuszen`}
 />
 <p className="text-sm text-muted-foreground mt-3 mb-6">
 Or use the platform-specific setup scripts:
 </p>
 <div className="grid sm:grid-cols-2 gap-3 mb-8">
 <CodeBlock lang="powershell" code={`irm ${apiBaseUrl}/setup.ps1 | iex`} />
 <CodeBlock lang="bash" code={`curl -fsSL ${apiBaseUrl}/setup.sh | bash`} />
 </div>

 <h3 className="text-lg font-semibold text-foreground mb-4">
 Manual Setup
 </h3>
 <p className="text-sm text-muted-foreground mb-3">
 If you prefer to configure manually, edit your settings file and
 set the following environment variables or config values:
 </p>
 <CodeBlock
 lang="json"
 code={`{
 "env": {
 "ANTHROPIC_AUTH_TOKEN": "YOUR_API_KEY",
 "ANTHROPIC_BASE_URL": "${apiBaseUrl}"
 }
}`}
 />
 </Section>

 {/* ── IDE Configuration ────────────────────────────────── */}
 <Section id="ide-configuration" title="IDE Configuration">

 {/* Claude Code / VS Code */}
 <div className="mb-10">
 <div className="flex items-center gap-2 mb-3">
 <span className="text-sm font-bold bg-gradient-to-r from-primary to-cyan-500 text-white px-2.5 py-1 rounded-lg">
 Claude Code
 </span>
 <span className="text-xs text-muted-foreground">VS Code extension</span>
 </div>
 <p className="text-sm text-muted-foreground mb-3">
 Edit{" "}
 <code className="text-xs font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">
 ~/.claude/settings.json
 </code>
 </p>
 <CodeBlock
 lang="json"
 code={`{
 "env": {
 "ANTHROPIC_AUTH_TOKEN": "YOUR_API_KEY",
 "ANTHROPIC_BASE_URL": "${apiBaseUrl}",
 "ANTHROPIC_MODEL": "Opus 4.8",
 "ANTHROPIC_SMALL_FAST_MODEL": "Haiku 4.5",
 "ANTHROPIC_DEFAULT_SONNET_MODEL": "Sonnet 4.6",
 "ANTHROPIC_DEFAULT_OPUS_MODEL": "Opus 4.8",
 "ANTHROPIC_DEFAULT_HAIKU_MODEL": "Haiku 4.5",
 "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
 },
 "hasCompletedOnboarding": true
}`}
 />
 </div>

 {/* Cursor */}
 <div className="mb-10">
 <div className="flex items-center gap-2 mb-3">
 <span className="text-sm font-bold border border-primary/30 text-foreground px-2.5 py-1 rounded-lg">
 Cursor
 </span>
 </div>
 <p className="text-sm text-muted-foreground mb-3">
 In Cursor settings, set Base URL and model:
 </p>
 <div className="space-y-2 text-sm font-mono">
 <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/80">
 <span className="text-muted-foreground text-xs w-20 shrink-0">Base URL</span>
 <code className="text-cyan-300">{apiBaseUrl}/v1</code>
 </div>
 <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/80">
 <span className="text-muted-foreground text-xs w-20 shrink-0">Model</span>
 <code className="text-cyan-300">claude-sonnet-4-6</code>
 </div>
 </div>
 </div>

 {/* Windsurf */}
 <div className="mb-10">
 <div className="flex items-center gap-2 mb-3">
 <span className="text-sm font-bold border border-primary/30 text-foreground px-2.5 py-1 rounded-lg">
 Windsurf
 </span>
 </div>
 <p className="text-sm text-muted-foreground mb-3">
 In Windsurf settings, set the Base URL:
 </p>
 <CodeBlock
 lang="text"
 code={`${apiBaseUrl}/v1`}
 />
 </div>

 {/* Cline / Roo Code */}
 <div>
 <div className="flex items-center gap-2 mb-3">
 <span className="text-sm font-bold border border-primary/30 text-foreground px-2.5 py-1 rounded-lg">
 Cline
 </span>
 <span className="text-xs text-muted-foreground">Roo Code</span>
 </div>
 <p className="text-sm text-muted-foreground mb-3">
 Add to your VS Code{" "}
 <code className="text-xs font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">
 settings.json
 </code>{" "}
 with provider{" "}
 <code className="text-xs font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">
 "anthropic"
 </code>
 , your base URL, and API key.
 </p>
 </div>
 </Section>

 {/* ── API Reference ─────────────────────────────────────── */}
 <Section id="api-reference" title="API Reference">

 {/* Authentication */}
 <div className="mb-8">
 <h3 className="text-base font-semibold text-foreground mb-3">
 Authentication
 </h3>
 <p className="text-sm text-muted-foreground mb-3">
 Pass your API key using either header:
 </p>
 <div className="space-y-2">
 <CodeBlock
 lang="http"
 code={`x-api-key: YOUR_API_KEY`}
 />
 <CodeBlock
 lang="http"
 code={`Authorization: Bearer YOUR_API_KEY`}
 />
 </div>
 </div>

 {/* Endpoints */}
 <div className="space-y-4">
 {[
 {
 method: "POST",
 path: "/api/v1/messages",
 desc: "Create a message. Set stream: true for Server-Sent Events with message_start, content_block_delta, and message_stop events.",
 body: `{ "model": "claude-opus-4-8", "messages": [{ "role": "user", "content": "Hello" }], "max_tokens": 1024, "stream": false }`,
 },
 {
 method: "GET",
 path: "/api/v1/models",
 desc: "List all available models with context window information.",
 body: null,
 },
 {
 method: "POST",
 path: "/api/v1/messages/count_tokens",
 desc: "Count tokens without sending a message.",
 body: `{ "model": "claude-opus-4-8", "messages": [{ "role": "user", "content": "Hello" }] }`,
 },
 {
 method: "GET",
 path: "/api/key-status?key=YOUR_API_KEY",
 desc: "Check your key status, current usage, and rate limit windows.",
 body: null,
 },
 ].map((ep) => (
 <div
 key={ep.path}
 className="p-5 rounded-2xl border border-border/60 bg-card/80 hover:border-primary/20 transition-colors"
 >
 <div className="flex items-center gap-3 mb-2">
 <span
 className={`text-xs font-bold px-2 py-1 rounded-md ${
 ep.method === "GET"
 ? "bg-emerald-500/15 text-emerald-400"
 : "bg-primary/15 text-primary"
 }`}
 >
 {ep.method}
 </span>
 <code className="text-sm font-mono text-foreground">
 {ep.path}
 </code>
 </div>
 <p className="text-sm text-muted-foreground mb-3">{ep.desc}</p>
 {ep.body && <CodeBlock lang="json" code={ep.body} />}
 </div>
 ))}
 </div>
 </Section>

 {/* ── Models ─────────────────────────────────────────────── */}
 <Section id="models" title="Models">
 <p className="text-muted-foreground mb-6 leading-relaxed">
 All models are Anthropic-compatible and work with standard
 Anthropic SDK calls. Just set the model ID in your requests.
 </p>
 <div className="border border-border/60 rounded-2xl overflow-hidden">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-muted/40 border-b border-border/60">
 <th className="text-left px-5 py-3 font-semibold text-foreground">
 Model
 </th>
 <th className="text-left px-5 py-3 font-semibold text-foreground">
 Model ID
 </th>
 <th className="text-left px-5 py-3 font-semibold text-foreground">
 Context
 </th>
 <th className="text-left px-5 py-3 font-semibold text-foreground">
 Type
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {[
 {
 name: "Opus 4.8",
 id: "claude-opus-4-8",
 context: "1,000,000",
 type: "Premium",
 typeClass: "text-violet-400",
 gradient: "from-violet-500 to-purple-600",
 },
 {
 name: "Opus 4.7",
 id: "claude-opus-4-7",
 context: "1,000,000",
 type: "Premium",
 typeClass: "text-violet-400",
 gradient: "from-violet-500 to-purple-600",
 },
 {
 name: "Sonnet 4.6",
 id: "claude-sonnet-4-6",
 context: "200,000",
 type: "Popular",
 typeClass: "text-primary",
 gradient: "from-primary to-indigo-500",
 },
 {
 name: "Haiku 4.5",
 id: "claude-haiku-4-5-20251001",
 context: "200,000",
 type: "Fast",
 typeClass: "text-emerald-400",
 gradient: "from-emerald-500 to-teal-500",
 },
 ].map((model) => (
 <tr key={model.id} className="hover:bg-muted/20 transition-colors">
 <td className="px-5 py-4">
 <div className="flex items-center gap-2">
 <div
 className={`w-2 h-2 rounded-full bg-gradient-to-r ${model.gradient}`}
 aria-hidden="true"
 />
 <span className="font-semibold text-foreground">
 {model.name}
 </span>
 </div>
 </td>
 <td className="px-5 py-4">
 <code className="text-xs font-mono text-cyan-300/70 bg-secondary/40 px-1.5 py-0.5 rounded">
 {model.id}
 </code>
 </td>
 <td className="px-5 py-4 text-muted-foreground">
 {model.context} tokens
 </td>
 <td className="px-5 py-4">
 <span className={`text-xs font-semibold ${model.typeClass}`}>
 {model.type}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Section>

 {/* ── Built-in Tools ────────────────────────────────────── */}
 <Section id="built-in-tools" title="Built-in Tools">
 <p className="text-muted-foreground mb-6 leading-relaxed">
 Web search and image analysis are available server-side — no
 client-side MCP setup or additional configuration required.
 </p>
 <div className="space-y-4">
 {[
 {
 icon: "🔍",
 title: "Web Search",
 endpoint: "POST /tools/web_search",
 desc: "Real-time web search powered by OpusZen. Use 3–5 focused keywords for best results.",
 example: `{ "query": "latest Anthropic API updates 2026" }`,
 },
 {
 icon: "🖼️",
 title: "Image Analysis",
 endpoint: "POST /tools/understand_image",
 desc: "Analyze images via HTTP URLs, local file paths, or base64-encoded data. Max file size: 18MB.",
 example: `{ "image": "https://example.com/photo.jpg" }`,
 },
 ].map((tool) => (
 <div
 key={tool.endpoint}
 className="p-5 rounded-2xl border border-border/60 bg-card/80 hover:border-primary/20 transition-colors"
 >
 <div className="flex items-center gap-3 mb-2">
 <span className="text-xl" aria-hidden="true">
 {tool.icon}
 </span>
 <h3 className="text-base font-semibold text-foreground">
 {tool.title}
 </h3>
 </div>
 <p className="text-sm text-muted-foreground mb-3">{tool.desc}</p>
 <CodeBlock lang="http" code={tool.endpoint} />
 <div className="mt-3">
 <CodeBlock lang="json" code={tool.example} />
 </div>
 </div>
 ))}
 </div>
 </Section>

 {/* ── Troubleshooting ──────────────────────────────────────── */}
 <Section id="troubleshooting" title="Troubleshooting">
 <div className="space-y-4">
 {[
 {
 problem: "Connection errors",
 solution:
 "Verify you have an active, non-expired API key. Check with GET /api/key-status?key=YOUR_KEY",
 },
 {
 problem: "Tools not working",
 solution:
 "Confirm your API key is valid. Tools require a working key with sufficient permissions.",
 },
 {
 problem: "Model not found errors",
 solution:
 "Use the exact model IDs listed above (e.g. claude-opus-4-8, not \"Opus 4.8\").",
 },
 {
 problem: "Rate limited",
 solution:
 "Check your 5-hour usage window via GET /api/key-status?key=YOUR_KEY. Wait for the window to reset or contact your admin.",
 },
 {
 problem: "Changes not applying in IDE",
 solution:
 "Restart your IDE completely. Some settings are only read on startup.",
 },
 {
 problem: "Cursor / Windsurf routing issues",
 solution:
 `Ensure your base URL includes the /v1 suffix: ${apiBaseUrl}/v1`,
 },
 ].map((item) => (
 <div
 key={item.problem}
 className="flex gap-4 p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-card/80 transition-colors"
 >
 <div className="shrink-0 mt-0.5">
 <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={14}
 height={14}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2.5}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="text-primary"
 aria-hidden="true"
 >
 <circle cx="12" cy="12" r="10" />
 <path d="M12 8v4" />
 <path d="M12 16h.01" />
 </svg>
 </div>
 </div>
 <div>
 <p className="text-sm font-semibold text-foreground mb-1">
 {item.problem}
 </p>
 <p className="text-sm text-muted-foreground leading-relaxed">
 {item.solution}
 </p>
 </div>
 </div>
 ))}
 </div>

 {/* Still stuck */}
 <div className="mt-8 p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center">
 <p className="text-sm text-primary font-semibold mb-1">
 Still stuck?
 </p>
 <p className="text-xs text-muted-foreground">
 Contact your admin or reseller for key-specific support.
 </p>
 </div>
 </Section>

 {/* Bottom spacing */}
 <div className="h-8" />
 </div>
 </div>
 </div>
 </Layout>
 );
}
