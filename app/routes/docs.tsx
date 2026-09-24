import { type MetaFunction } from "react-router";
import { Layout } from "../components/Layout";
import { useState, useEffect, useMemo } from "react";
import { buildPageMetaTags } from "~/utils/meta-helper";

export const meta: MetaFunction = ({ matches }) => {
	return buildPageMetaTags(matches, "/docs");
};

// ─── Table of contents ───────────────────────────────────────────────────────

const sections = [
	{ id: "overview", label: "Overview" },
	{ id: "quick-start", label: "Quick Start" },
	{ id: "ide-configuration", label: "IDE Configuration" },
	{ id: "sdks-examples", label: "SDKs & Code Examples" },
	{ id: "api-reference", label: "API Reference" },
	{ id: "error-codes", label: "Error Codes" },
	{ id: "models", label: "Available Models" },
	{ id: "built-in-tools", label: "Built-in Tools" },
	{ id: "troubleshooting", label: "Troubleshooting & FAQ" },
];

// ─── Default Model Data ───────────────────────────────────────────────────────

const DEFAULT_MODELS = [
	{ id: "claude-fable-5-1", name: "Claude Fable 5.1", context: "1,000,000", type: "Chat / Completion", created: "Sep 2026" },
	{ id: "claude-fable-5", name: "Claude Fable 5", context: "1,000,000", type: "Chat / Completion", created: "Jun 2026" },
	{ id: "claude-opus-5", name: "Claude Opus 5", context: "1,000,000", type: "Chat / Completion", created: "Jul 2026" },
	{ id: "claude-sonnet-5", name: "Claude Sonnet 5", context: "1,000,000", type: "Chat / Completion", created: "Jun 2026" },
	{ id: "claude-opus-4-8", name: "Claude Opus 4.8", context: "1,000,000", type: "Chat / Completion", created: "May 2026" },
	{ id: "claude-opus-4-7", name: "Claude Opus 4.7", context: "1,000,000", type: "Chat / Completion", created: "Apr 2026" },
	{ id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", context: "1,000,000", type: "Chat / Completion", created: "Feb 2026" },
	{ id: "claude-opus-4-6", name: "Claude Opus 4.6", context: "1,000,000", type: "Chat / Completion", created: "Feb 2026" },
	{ id: "claude-opus-4-5", name: "Claude Opus 4.5", context: "200,000", type: "Chat / Completion", created: "Nov 2025" },
	{ id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", context: "200,000", type: "Chat / Completion", created: "Sep 2025" },
	{ id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", context: "200,000", type: "Chat / Completion", created: "Oct 2025" },
];

// ─── Code block component ───────────────────────────────────────────────────

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
		<div className="relative group rounded-xl border border-border bg-secondary/30 overflow-hidden shadow-xs">
			{lang && (
				<div className="px-4 py-2 border-b border-border text-xs font-mono text-primary bg-secondary/60 font-semibold flex items-center justify-between">
					<span>{lang}</span>
					<span className="text-[10px] text-muted-foreground uppercase font-sans font-medium">Click copy to clipboard</span>
				</div>
			)}

			{/* Copy Button */}
			<button
				onClick={handleCopy}
				className="absolute top-2.5 right-2.5 p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-primary transition-all duration-200 cursor-pointer shadow-xs z-10"
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

			<pre className="p-4 pr-12 overflow-x-auto text-xs sm:text-sm font-mono text-foreground leading-relaxed">
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
				<span className="w-1.5 h-6 rounded-full bg-primary" aria-hidden="true" />
				{title}
			</h2>
			{children}
		</section>
	);
}

// ─── Docs page ───────────────────────────────────────────────────────────────

export default function DocsRoute() {
	const [activeSection, setActiveSection] = useState("overview");
	const [activeSdkTab, setActiveSdkTab] = useState<"python" | "typescript" | "curl" | "streaming" | "openai">("python");
	const [modelSearch, setModelSearch] = useState("");
	const [modelFilter, setModelFilter] = useState("all");
	const [copiedModelId, setCopiedModelId] = useState<string | null>(null);

	const apiBaseUrl = "https://api.opuszen.shop";

	const [models, setModels] = useState<
		{ id: string; name: string; context: string; type: string; created?: string }[]
	>(DEFAULT_MODELS);

	useEffect(() => {
		const fetchModels = async () => {
			try {
				const res = await fetch(`${apiBaseUrl}/v1/models`);
				const json = await res.json();
				if (json.data && Array.isArray(json.data)) {
					const formatted = json.data.map((m: any) => ({
						id: m.id,
						name: m.display_name || m.name || m.id,
						context: m.context_window ? m.context_window.toLocaleString() : (m.context || "1,000,000"),
						type: m.type === "model" ? "Chat / Completion" : (m.type || "Chat / Completion"),
						created: m.created_at
							? new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
							: (m.launch_date || (m.created ? new Date(m.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "2026")),
					}));
					setModels(formatted);
				}
			} catch {
				// use DEFAULT_MODELS fallback
			}
		};
		fetchModels();
	}, []);

	// Scroll spy for side navigation
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActiveSection(entry.target.id);
					}
				}
			},
			{ rootMargin: "-15% 0px -65% 0px" }
		);

		sections.forEach((s) => {
			const el = document.getElementById(s.id);
			if (el) observer.observe(el);
		});

		return () => observer.disconnect();
	}, []);

	const scrollTo = (id: string) => {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
			setActiveSection(id);
		}
	};

	const copyModelId = async (id: string) => {
		try {
			await navigator.clipboard.writeText(id);
			setCopiedModelId(id);
			setTimeout(() => setCopiedModelId(null), 2000);
		} catch (e) {
			console.error(e);
		}
	};

	const filteredModels = useMemo(() => {
		return models.filter((m) => {
			const matchesSearch =
				m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
				m.name.toLowerCase().includes(modelSearch.toLowerCase());
			if (!matchesSearch) return false;
			if (modelFilter === "all") return true;
			if (modelFilter === "opus") return m.id.toLowerCase().includes("opus");
			if (modelFilter === "sonnet") return m.id.toLowerCase().includes("sonnet");
			if (modelFilter === "haiku") return m.id.toLowerCase().includes("haiku");
			if (modelFilter === "fable") return m.id.toLowerCase().includes("fable");
			return true;
		});
	}, [models, modelSearch, modelFilter]);

	return (
		<Layout>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
				{/* Page header */}
				<div className="mb-12">
					<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary text-xs font-semibold text-primary mb-4 shadow-xs">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
						</svg>
						Developer Documentation & API Gateway
					</div>
					<h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">
						<span className="text-primary">
							OpusZen Docs
						</span>
					</h1>
					<p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
						Anthropic-compatible API gateway providing Claude API access without waitlists.
						Drop-in replacement for any client — set your Base URL to{" "}
						<code className="text-xs font-mono bg-secondary text-primary px-1.5 py-0.5 rounded font-semibold border border-border">
							{apiBaseUrl}
						</code>
						.
					</p>
				</div>

				<div className="flex gap-10">
					{/* Side navigation */}
					<aside className="hidden lg:block w-56 shrink-0">
						<nav
							className="sticky top-28 space-y-1 bg-card border border-border rounded-2xl p-3 shadow-xs"
							aria-label="Documentation navigation"
						>
							<p className="text-xs font-semibold text-primary uppercase tracking-wider px-3 mb-3">
								Documentation Index
							</p>
							{sections.map((s) => (
								<button
									key={s.id}
									onClick={() => scrollTo(s.id)}
									className={`block w-full text-left text-sm px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
										activeSection === s.id
											? "bg-primary text-primary-foreground font-semibold shadow-xs"
											: "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
									}`}
								>
									{s.label}
								</button>
							))}

							<div className="pt-4 mt-4 border-t border-border px-3 space-y-2">
								<a
									href="/status"
									className="flex items-center justify-between text-xs text-muted-foreground hover:text-primary transition-colors py-1"
								>
									<span>System Status</span>
									<span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
								</a>
								<a
									href="/key-status"
									className="flex items-center justify-between text-xs text-muted-foreground hover:text-primary transition-colors py-1"
								>
									<span>Check Key Usage</span>
									<span className="text-[10px] font-mono">/key-status</span>
								</a>
							</div>
						</nav>
					</aside>

					{/* Main content */}
					<div className="flex-1 min-w-0 max-w-3xl">

						{/* ── Overview ─────────────────────────────────────────── */}
						<Section id="overview" title="Overview">
							<p className="text-muted-foreground leading-relaxed mb-6">
								OpusZen is an ultra-low latency, Anthropic-compatible API gateway providing Claude
								API access without waitlists or regional limits. It works with Claude Code, Cursor,
								Windsurf, Cline, Roo Code, and official Anthropic SDKs — simply set your Base URL to{" "}
								<code className="text-xs font-mono bg-secondary text-primary px-1.5 py-0.5 rounded font-semibold border border-border">
									{apiBaseUrl}
								</code>{" "}
								and use your API key.
							</p>
							<div className="grid sm:grid-cols-2 gap-4 mb-6">
								{[
									{ icon: "⚡", title: "Zero-Latency SSE Streaming", desc: "Pass-through streaming with first-chunk delivery in milliseconds." },
									{ icon: "🛡️", title: "Automatic Gateway Failover", desc: "Built-in upstream redundancy guarantees 99.9% request uptime." },
									{ icon: "🔑", title: "Budget & Rate Limit Control", desc: "Granular rolling 5-hour windows and per-key usage protection." },
									{ icon: "🛠️", title: "Server-Side AI Tools", desc: "Built-in real-time web search and multimodal image understanding." },
									{ icon: "💰", title: "Prompt Caching Enabled", desc: "Anthropic prompt cache read tokens are free and pass through directly." },
									{ icon: "🌐", title: "CORS & Browser Ready", desc: "Full OPTIONS preflight support for local tools, Electron, and web apps." },
								].map((item) => (
									<div
										key={item.title}
										className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-secondary/20 transition-all duration-200"
									>
										<div className="flex items-center gap-2 mb-1.5">
											<span className="text-lg" aria-hidden="true">
												{item.icon}
											</span>
											<span className="text-sm text-foreground font-semibold">
												{item.title}
											</span>
										</div>
										<p className="text-xs text-muted-foreground leading-relaxed">
											{item.desc}
										</p>
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
										</a>{" "}
										(for NPX CLI installer or Node SDK)
									</span>
								</li>
								<li className="flex items-start gap-3 text-sm text-muted-foreground">
									<span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
									<span>OpusZen API key (starts with <code className="text-xs font-mono bg-secondary px-1 py-0.5 rounded">sk_live_...</code> or reseller key)</span>
								</li>
								<li className="flex items-start gap-3 text-sm text-muted-foreground">
									<span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
									<span>Target tool: Claude Code, Cursor, Windsurf, VS Code, Cline, Python, or TypeScript</span>
								</li>
							</ul>

							<h3 className="text-lg font-semibold text-foreground mb-3">
								1. Interactive Setup (Recommended)
							</h3>
							<p className="text-sm text-muted-foreground mb-3">
								Run the official interactive CLI wizard — it configures your editor, tests connectivity, and sets models:
							</p>
							<CodeBlock
								lang="bash"
								code={`npx opuszen`}
							/>

							<h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
								2. One-Line Platform Installers
							</h3>
							<p className="text-sm text-muted-foreground mb-3">
								Fast automated setup for macOS, Linux, or Windows terminals:
							</p>
							<div className="space-y-3 mb-8">
								<div>
									<span className="text-xs font-semibold text-muted-foreground block mb-1">Windows (PowerShell):</span>
									<CodeBlock lang="powershell" code={`irm ${apiBaseUrl}/setup.ps1 | iex`} />
								</div>
								<div>
									<span className="text-xs font-semibold text-muted-foreground block mb-1">macOS / Linux (Bash):</span>
									<CodeBlock lang="bash" code={`curl -fsSL ${apiBaseUrl}/setup.sh | bash`} />
								</div>
							</div>

							<h3 className="text-lg font-semibold text-foreground mb-3">
								3. Manual Environment Configuration
							</h3>
							<p className="text-sm text-muted-foreground mb-3">
								Export these environment variables in your terminal or <code className="text-xs font-mono bg-secondary px-1 py-0.5 rounded">~/.bashrc</code> / <code className="text-xs font-mono bg-secondary px-1 py-0.5 rounded">~/.zshrc</code>:
							</p>
							<CodeBlock
								lang="bash"
								code={`export ANTHROPIC_BASE_URL="${apiBaseUrl}"\nexport ANTHROPIC_API_KEY="YOUR_API_KEY"`}
							/>
						</Section>

						{/* ── IDE Configuration ────────────────────────────────── */}
						<Section id="ide-configuration" title="IDE Configuration">

							{/* Claude Code / VS Code */}
							<div className="mb-10">
								<div className="flex items-center gap-2 mb-3">
									<span className="text-sm font-bold bg-primary text-primary-foreground px-2.5 py-1 rounded-lg">
										Claude Code
									</span>
									<span className="text-xs text-muted-foreground">Official CLI & VS Code</span>
								</div>
								<p className="text-sm text-muted-foreground mb-3">
									Add or edit your settings file located at{" "}
									<code className="text-xs font-mono bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-medium">
										~/.claude/settings.json
									</code>
									:
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
									<span className="text-sm font-bold border border-border text-primary bg-secondary/40 px-2.5 py-1 rounded-lg">
										Cursor
									</span>
									<span className="text-xs text-muted-foreground">Settings → Models → OpenAI / Anthropic</span>
								</div>
								<p className="text-sm text-muted-foreground mb-3">
									In Cursor Settings (<code className="text-xs font-mono bg-secondary px-1.5 py-0.5 rounded">Ctrl+,</code> or <code className="text-xs font-mono bg-secondary px-1.5 py-0.5 rounded">Cmd+,</code>) under <strong>Models</strong>, configure:
								</p>
								<div className="space-y-2 text-sm font-mono mb-4">
									<div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
										<span className="text-muted-foreground text-xs w-24 shrink-0">Base URL</span>
										<code className="text-primary font-semibold">{apiBaseUrl}/v1</code>
									</div>
									<div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
										<span className="text-muted-foreground text-xs w-24 shrink-0">API Key</span>
										<code className="text-muted-foreground">YOUR_API_KEY</code>
									</div>
									<div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
										<span className="text-muted-foreground text-xs w-24 shrink-0">Model Names</span>
										<code className="text-primary font-semibold">claude-opus-4-8, claude-sonnet-4-6</code>
									</div>
								</div>
								<p className="text-xs text-muted-foreground">
									Note: Cursor requires the trailing <code className="font-mono text-primary">/v1</code> path.
								</p>
							</div>

							{/* Windsurf */}
							<div className="mb-10">
								<div className="flex items-center gap-2 mb-3">
									<span className="text-sm font-bold border border-border text-primary bg-secondary/40 px-2.5 py-1 rounded-lg">
										Windsurf
									</span>
									<span className="text-xs text-muted-foreground">Codeium AI Editor</span>
								</div>
								<p className="text-sm text-muted-foreground mb-3">
									In Windsurf settings, configure the Anthropic / OpenAI compatible endpoint:
								</p>
								<CodeBlock
									lang="text"
									code={`${apiBaseUrl}/v1`}
								/>
							</div>

							{/* Cline / Roo Code */}
							<div>
								<div className="flex items-center gap-2 mb-3">
									<span className="text-sm font-bold border border-border text-primary bg-secondary/40 px-2.5 py-1 rounded-lg">
										Cline
									</span>
									<span className="text-xs text-muted-foreground">Roo Code / Roo Cline</span>
								</div>
								<p className="text-sm text-muted-foreground mb-3">
									Select API Provider <strong>Anthropic</strong> and set your base URL and key:
								</p>
								<div className="space-y-2 text-sm font-mono mb-4">
									<div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
										<span className="text-muted-foreground text-xs w-28 shrink-0">Provider</span>
										<span className="text-foreground font-semibold">Anthropic</span>
									</div>
									<div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
										<span className="text-muted-foreground text-xs w-28 shrink-0">Base URL</span>
										<code className="text-primary font-semibold">{apiBaseUrl}/v1</code>
									</div>
									<div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
										<span className="text-muted-foreground text-xs w-28 shrink-0">API Key</span>
										<code className="text-muted-foreground">YOUR_API_KEY</code>
									</div>
								</div>
								<p className="text-sm text-muted-foreground mb-2">Or add to VS Code <code className="text-xs font-mono bg-secondary px-1.5 py-0.5 rounded">settings.json</code>:</p>
								<CodeBlock
									lang="json"
									code={`{
  "cline.apiProvider": "anthropic",
  "cline.anthropicBaseUrl": "${apiBaseUrl}/v1",
  "cline.apiKey": "YOUR_API_KEY",
  "cline.anthropicModelId": "claude-opus-4-8"
}`}
								/>
							</div>
						</Section>

						{/* ── SDKs & Code Examples ─────────────────────────────────── */}
						<Section id="sdks-examples" title="SDKs & Code Examples">
							<p className="text-muted-foreground leading-relaxed mb-6">
								OpusZen is a drop-in replacement for the official Anthropic API. Switch tabs to see code examples in Python, TypeScript, raw cURL, SSE streaming, and the OpenAI SDK.
							</p>

							{/* Language Switcher Tabs */}
							<div className="flex flex-wrap gap-2 p-1.5 rounded-xl border border-border bg-card mb-6">
								{[
									{ id: "python", label: "Python (Anthropic)" },
									{ id: "typescript", label: "TypeScript / Node.js" },
									{ id: "curl", label: "cURL" },
									{ id: "streaming", label: "Streaming (SSE)" },
									{ id: "openai", label: "OpenAI SDK" },
								].map((tab) => (
									<button
										key={tab.id}
										onClick={() => setActiveSdkTab(tab.id as any)}
										className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
											activeSdkTab === tab.id
												? "bg-primary text-primary-foreground shadow-xs"
												: "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
										}`}
									>
										{tab.label}
									</button>
								))}
							</div>

							{/* Tab: Python */}
							{activeSdkTab === "python" && (
								<div className="space-y-4">
									<div className="text-xs text-muted-foreground">
										Install: <code className="font-mono text-primary bg-secondary px-1.5 py-0.5 rounded">pip install anthropic</code>
									</div>
									<CodeBlock
										lang="python"
										code={`import anthropic

# Initialize the client pointing to OpusZen
client = anthropic.Anthropic(
    api_key="YOUR_API_KEY",
    base_url="${apiBaseUrl}",
)

message = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Explain quantum computing in one paragraph."}
    ],
)

print(message.content[0].text)`}
									/>
								</div>
							)}

							{/* Tab: TypeScript */}
							{activeSdkTab === "typescript" && (
								<div className="space-y-4">
									<div className="text-xs text-muted-foreground">
										Install: <code className="font-mono text-primary bg-secondary px-1.5 py-0.5 rounded">npm install @anthropic-ai/sdk</code>
									</div>
									<CodeBlock
										lang="typescript"
										code={`import Anthropic from "@anthropic-ai/sdk";

// Initialize the client pointing to OpusZen
const client = new Anthropic({
  apiKey: "YOUR_API_KEY",
  baseURL: "${apiBaseUrl}",
});

const message = await client.messages.create({
  model: "claude-opus-4-8",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Write a high-performance TypeScript debounce function." }
  ],
});

console.log(message.content[0].text);`}
									/>
								</div>
							)}

							{/* Tab: cURL */}
							{activeSdkTab === "curl" && (
								<div className="space-y-4">
									<div className="text-xs text-muted-foreground">
										Standard REST call using cURL:
									</div>
									<CodeBlock
										lang="bash"
										code={`curl ${apiBaseUrl}/v1/messages \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "claude-opus-4-8",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Hello, Claude! How are you today?"}
    ]
  }'`}
									/>
								</div>
							)}

							{/* Tab: Streaming */}
							{activeSdkTab === "streaming" && (
								<div className="space-y-4">
									<div className="text-xs text-muted-foreground">
										Zero-latency real-time streaming with Python:
									</div>
									<CodeBlock
										lang="python"
										code={`import anthropic

client = anthropic.Anthropic(
    api_key="YOUR_API_KEY",
    base_url="${apiBaseUrl}",
)

with client.messages.stream(
    max_tokens=1024,
    messages=[{"role": "user", "content": "Write a story about an autonomous AI agent."}],
    model="claude-opus-4-8",
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)`}
									/>
								</div>
							)}

							{/* Tab: OpenAI SDK */}
							{activeSdkTab === "openai" && (
								<div className="space-y-4">
									<div className="text-xs text-muted-foreground">
										Use the official OpenAI SDK with OpusZen gateway:
									</div>
									<CodeBlock
										lang="python"
										code={`from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="${apiBaseUrl}/v1",
)

response = client.chat.completions.create(
    model="claude-opus-4-8",
    messages=[
        {"role": "user", "content": "Hello from the OpenAI Python SDK!"}
    ],
)

print(response.choices[0].message.content)`}
									/>
								</div>
							)}
						</Section>

						{/* ── API Reference ─────────────────────────────────────── */}
						<Section id="api-reference" title="API Reference">

							{/* Base URL Banner */}
							<div className="mb-8 p-5 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
								<div>
									<span className="text-xs font-semibold text-primary uppercase tracking-wider block mb-1">
										API Gateway Base URL
									</span>
									<code className="text-base font-mono font-bold text-foreground bg-secondary px-2.5 py-1 rounded border border-border">
										{apiBaseUrl}
									</code>
								</div>
								<div className="text-xs text-muted-foreground sm:text-right">
									<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-primary font-medium border border-border">
										Anthropic Compatible (v1)
									</span>
									<p className="mt-1 text-[11px] text-muted-foreground">Endpoints support both /v1/ and /api/v1/</p>
								</div>
							</div>

							{/* Authentication Headers */}
							<div className="mb-8">
								<h3 className="text-base font-semibold text-foreground mb-3">
									Authentication Headers
								</h3>
								<p className="text-sm text-muted-foreground mb-3">
									Authenticate by sending your API key in either header:
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

							{/* Endpoints List */}
							<h3 className="text-base font-semibold text-foreground mb-4">
								Gateway Endpoints
							</h3>
							<div className="space-y-6">
								{/* POST /v1/messages */}
								<div className="p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors shadow-xs">
									<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
										<div className="flex items-center gap-2">
											<span className="text-xs font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-semibold">
												POST
											</span>
											<code className="text-sm font-mono text-foreground font-semibold">
												/v1/messages
											</code>
										</div>
										<code className="text-xs font-mono text-primary bg-secondary px-2 py-0.5 rounded border border-border">
											{apiBaseUrl}/v1/messages
										</code>
									</div>
									<p className="text-sm text-muted-foreground mb-3">
										Create a message completion. Supports text generation, multi-turn chat, system prompts, streaming, and vision.
									</p>
									<div className="space-y-3">
										<div>
											<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
												Request Payload:
											</span>
											<CodeBlock
												lang="json"
												code={`{
  "model": "claude-opus-4-8",
  "max_tokens": 1024,
  "messages": [
    { "role": "user", "content": "Hello, Claude!" }
  ],
  "stream": false
}`}
											/>
										</div>
										<div>
											<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
												Response Payload:
											</span>
											<CodeBlock
												lang="json"
												code={`{
  "id": "msg_01XyZ890OpusZenLive",
  "type": "message",
  "role": "assistant",
  "model": "claude-opus-4-8",
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I assist you with your projects today?"
    }
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 12,
    "output_tokens": 14
  }
}`}
											/>
										</div>
									</div>
								</div>

								{/* GET /v1/models */}
								<div className="p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors shadow-xs">
									<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
										<div className="flex items-center gap-2">
											<span className="text-xs font-bold px-2 py-0.5 rounded-md bg-secondary text-primary font-semibold border border-border">
												GET
											</span>
											<code className="text-sm font-mono text-foreground font-semibold">
												/v1/models
											</code>
										</div>
										<code className="text-xs font-mono text-primary bg-secondary px-2 py-0.5 rounded border border-border">
											{apiBaseUrl}/v1/models
										</code>
									</div>
									<p className="text-sm text-muted-foreground mb-3">
										List all currently available models, context window specifications, and release dates.
									</p>
									<CodeBlock
										lang="json"
										code={`{
  "data": [
    {
      "id": "claude-opus-4-8",
      "display_name": "Claude Opus 4.8",
      "context_window": 1000000,
      "type": "model"
    },
    {
      "id": "claude-sonnet-4-6",
      "display_name": "Claude Sonnet 4.6",
      "context_window": 1000000,
      "type": "model"
    }
  ]
}`}
									/>
								</div>

								{/* POST /v1/messages/count_tokens */}
								<div className="p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors shadow-xs">
									<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
										<div className="flex items-center gap-2">
											<span className="text-xs font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-semibold">
												POST
											</span>
											<code className="text-sm font-mono text-foreground font-semibold">
												/v1/messages/count_tokens
											</code>
										</div>
										<code className="text-xs font-mono text-primary bg-secondary px-2 py-0.5 rounded border border-border">
											{apiBaseUrl}/v1/messages/count_tokens
										</code>
									</div>
									<p className="text-sm text-muted-foreground mb-3">
										Estimate token count for a message or prompt without invoking model generation.
									</p>
									<CodeBlock
										lang="json"
										code={`{
  "model": "claude-opus-4-8",
  "messages": [
    { "role": "user", "content": "How many tokens is this sentence?" }
  ]
}`}
									/>
								</div>

								{/* GET /api/key-status */}
								<div className="p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors shadow-xs">
									<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
										<div className="flex items-center gap-2">
											<span className="text-xs font-bold px-2 py-0.5 rounded-md bg-secondary text-primary font-semibold border border-border">
												GET
											</span>
											<code className="text-sm font-mono text-foreground font-semibold">
												/api/key-status
											</code>
										</div>
										<code className="text-xs font-mono text-primary bg-secondary px-2 py-0.5 rounded border border-border">
											{apiBaseUrl}/api/key-status?key=YOUR_API_KEY
										</code>
									</div>
									<p className="text-sm text-muted-foreground mb-3">
										Inspect the status of your API key, plan details, remaining balance, and rate limit reset timer.
									</p>
									<CodeBlock
										lang="json"
										code={`{
  "valid": true,
  "status": "active",
  "plan": "Pro Developer",
  "name": "Production Opus Key",
  "balance": 250.00,
  "usage": {
    "tokens_used": 154200,
    "limit": 5000000,
    "reset_in_seconds": 1800
  }
}`}
									/>
								</div>
							</div>
						</Section>

						{/* ── Error Codes ────────────────────────────────────────── */}
						<Section id="error-codes" title="Error Codes & Status">
							<p className="text-muted-foreground leading-relaxed mb-6">
								Standard HTTP response status codes returned by the gateway:
							</p>
							<div className="border border-border rounded-2xl overflow-hidden bg-card shadow-xs">
								<table className="w-full text-sm">
									<thead>
										<tr className="bg-secondary/60 border-b border-border">
											<th className="text-left px-5 py-3 font-semibold text-foreground w-28">Status</th>
											<th className="text-left px-5 py-3 font-semibold text-foreground w-40">Error Name</th>
											<th className="text-left px-5 py-3 font-semibold text-foreground">Meaning & Resolution</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										<tr className="hover:bg-secondary/30 transition-colors">
											<td className="px-5 py-3.5 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">200 OK</td>
											<td className="px-5 py-3.5 font-semibold text-foreground">Success</td>
											<td className="px-5 py-3.5 text-muted-foreground text-xs leading-relaxed">Request completed successfully or SSE streaming initiated.</td>
										</tr>
										<tr className="hover:bg-secondary/30 transition-colors">
											<td className="px-5 py-3.5 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">400 Bad Request</td>
											<td className="px-5 py-3.5 font-semibold text-foreground">invalid_request</td>
											<td className="px-5 py-3.5 text-muted-foreground text-xs leading-relaxed">Malformed JSON or unsupported parameters. Check messages structure.</td>
										</tr>
										<tr className="hover:bg-secondary/30 transition-colors">
											<td className="px-5 py-3.5 font-mono text-xs font-bold text-rose-600 dark:text-rose-400">401 Unauthorized</td>
											<td className="px-5 py-3.5 font-semibold text-foreground">authentication_error</td>
											<td className="px-5 py-3.5 text-muted-foreground text-xs leading-relaxed">Invalid or missing API key. Verify key in /key-status.</td>
										</tr>
										<tr className="hover:bg-secondary/30 transition-colors">
											<td className="px-5 py-3.5 font-mono text-xs font-bold text-purple-600 dark:text-purple-400">429 Rate Limit</td>
											<td className="px-5 py-3.5 font-semibold text-foreground">rate_limit_error</td>
											<td className="px-5 py-3.5 text-muted-foreground text-xs leading-relaxed">5-hour rolling token or request quota reached. Check reset time on Check Usage page.</td>
										</tr>
										<tr className="hover:bg-secondary/30 transition-colors">
											<td className="px-5 py-3.5 font-mono text-xs font-bold text-rose-600 dark:text-rose-400">502 / 503 Gateway</td>
											<td className="px-5 py-3.5 font-semibold text-foreground">api_error</td>
											<td className="px-5 py-3.5 text-muted-foreground text-xs leading-relaxed">Upstream provider error. OpusZen automatically triggers failover to fallback providers.</td>
										</tr>
									</tbody>
								</table>
							</div>
						</Section>

						{/* ── Models ─────────────────────────────────────────────── */}
						<Section id="models" title="Available Models">
							<p className="text-muted-foreground mb-6 leading-relaxed">
								All models are Anthropic-compatible and work with standard Anthropic or OpenAI SDK calls. Click any Model ID to copy it to your clipboard.
							</p>

							{/* Search & Filter Controls */}
							<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
								<div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
									{["all", "opus", "sonnet", "haiku", "fable"].map((tag) => (
										<button
											key={tag}
											onClick={() => setModelFilter(tag)}
											className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
												modelFilter === tag
													? "bg-primary text-primary-foreground"
													: "bg-secondary text-muted-foreground hover:text-foreground border border-border"
											}`}
										>
											{tag}
										</button>
									))}
								</div>
								<div className="relative">
									<input
										type="text"
										value={modelSearch}
										onChange={(e) => setModelSearch(e.target.value)}
										placeholder="Search models..."
										className="w-full sm:w-56 px-3 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
									/>
									{modelSearch && (
										<button
											onClick={() => setModelSearch("")}
											className="absolute right-2 top-1.5 text-xs text-muted-foreground hover:text-foreground"
										>
											✕
										</button>
									)}
								</div>
							</div>

							<div className="border border-border rounded-2xl overflow-hidden bg-card shadow-xs">
								<div className="overflow-x-auto">
									<table className="w-full text-sm min-w-[500px]">
										<thead>
											<tr className="bg-secondary/60 border-b border-border">
												<th className="text-left px-5 py-3 font-semibold text-foreground">Model</th>
												<th className="text-left px-5 py-3 font-semibold text-foreground">Model ID</th>
												<th className="text-left px-5 py-3 font-semibold text-foreground">Context</th>
												<th className="text-left px-5 py-3 font-semibold text-foreground">Type</th>
												<th className="text-left px-5 py-3 font-semibold text-foreground">Release</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border">
											{filteredModels.map((model) => (
												<tr key={model.id} className="hover:bg-secondary/40 transition-colors">
													<td className="px-5 py-3.5">
														<div className="flex items-center gap-2">
															<div className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
															<span className="font-semibold text-foreground">
																{model.name}
															</span>
														</div>
													</td>
													<td className="px-5 py-3.5">
														<button
															onClick={() => copyModelId(model.id)}
															className="inline-flex items-center gap-1.5 text-xs font-mono text-primary bg-secondary px-2 py-0.5 rounded font-medium hover:bg-secondary/80 border border-border cursor-pointer transition-colors"
															title="Click to copy Model ID"
														>
															<span>{model.id}</span>
															{copiedModelId === model.id ? (
																<span className="text-[10px] text-emerald-600 font-sans font-bold">✓</span>
															) : (
																<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
																	<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
																	<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
																</svg>
															)}
														</button>
													</td>
													<td className="px-5 py-3.5 text-muted-foreground text-xs">
														{model.context} tokens
													</td>
													<td className="px-5 py-3.5">
														<span className="text-xs font-semibold text-primary">
															{model.type}
														</span>
													</td>
													<td className="px-5 py-3.5 text-muted-foreground text-xs">
														{model.created || "—"}
													</td>
												</tr>
											))}
											{filteredModels.length === 0 && (
												<tr>
													<td colSpan={5} className="px-5 py-8 text-center text-xs text-muted-foreground">
														No models matching "{modelSearch}". Try clearing your search filter.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>
						</Section>

						{/* ── Built-in Tools ────────────────────────────────────── */}
						<Section id="built-in-tools" title="Built-in Tools">
							<p className="text-muted-foreground mb-6 leading-relaxed">
								Web search and image analysis are available directly on the server — no client-side MCP configuration or extra API keys required.
							</p>
							<div className="space-y-4">
								{[
									{
										icon: "🔍",
										title: "Web Search Tool",
										endpoint: `POST ${apiBaseUrl}/tools/web_search`,
										desc: "Real-time web search powered by OpusZen. Ideal for retrieval-augmented workflows.",
										example: `{ "query": "latest Anthropic Claude 4.8 release notes" }`,
									},
									{
										icon: "🖼️",
										title: "Multimodal Image Analysis",
										endpoint: `POST ${apiBaseUrl}/tools/understand_image`,
										desc: "Inspect image files via HTTP URL or base64-encoded payload (supports JPEG, PNG, WebP up to 18MB).",
										example: `{ "image": "https://example.com/screenshot.png", "prompt": "Describe this UI screenshot" }`,
									},
								].map((tool) => (
									<div
										key={tool.endpoint}
										className="p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors shadow-xs"
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
						<Section id="troubleshooting" title="Troubleshooting & FAQ">
							<div className="space-y-4">
								{[
									{
										problem: "Connection or CORS errors in Cursor / Windsurf",
										solution:
											`Make sure the Base URL ends in /v1 (e.g. ${apiBaseUrl}/v1). Restart your editor after saving the configuration.`,
									},
									{
										problem: "401 Unauthorized / Invalid API Key",
										solution:
											`Verify your key at ${apiBaseUrl}/api/key-status?key=YOUR_KEY or on the Check Usage page. Ensure there are no leading or trailing whitespace characters.`,
									},
									{
										problem: "Rate Limit Exceeded (HTTP 429)",
										solution:
											`Your 5-hour rolling token window has reached capacity. Check reset_in_seconds in /api/key-status or upgrade to a higher tier plan.`,
									},
									{
										problem: "Model Not Found",
										solution:
											"Use an exact ID from the Available Models list above (e.g. claude-opus-4-8 or claude-sonnet-4-6).",
									},
									{
										problem: "Web search or multimodal tools not responding",
										solution:
											"Server-side tools are enabled by default for all authenticated keys. Verify your API key has an active plan with tools enabled.",
									},
									{
										problem: "Local development with Claude Code",
										solution:
											`Confirm ANTHROPIC_BASE_URL is set in ~/.claude/settings.json pointing to ${apiBaseUrl}. Run 'claude doctor' to verify connection.`,
									},
								].map((item) => (
									<div
										key={item.problem}
										className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors shadow-xs"
									>
										<div className="shrink-0 mt-0.5">
											<div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center border border-border">
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

							{/* Help banner */}
							<div className="mt-8 p-6 rounded-2xl bg-secondary/60 border border-border text-center shadow-xs">
								<h3 className="text-base text-primary font-bold mb-1">
									Need assistance or custom enterprise limits?
								</h3>
								<p className="text-xs text-muted-foreground mb-4">
									Check real-time gateway status or reach out to support for reseller keys and custom quotas.
								</p>
								<div className="inline-flex items-center gap-3">
									<a
										href="/status"
										className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
									>
										View Gateway Status
									</a>
									<a
										href="/key-status"
										className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-xs font-semibold hover:bg-secondary transition-colors"
									>
										Check Key Balance
									</a>
								</div>
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
