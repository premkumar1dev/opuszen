import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { StaggerContainer } from "../components/motion/FadeUp";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "./ui/dialog";

const featuredModels = [
	{
		name: "Claude Fable 5",
		id: "claude-fable-5",
		description: "Most intelligent, best for complex reasoning",
		tier: "pro",
		context: "1M",
		badges: ["New", "1M context"],
	},
	{
		name: "Claude Opus 5",
		id: "claude-opus-5",
		description: "Highest capability for complex tasks",
		tier: "pro",
		context: "1M",
		badges: ["New", "1M context"],
	},
	{
		name: "Claude Sonnet 5",
		id: "claude-sonnet-5",
		description: "Balanced performance and speed",
		tier: "pro",
		context: "200K",
		badges: [],
	},
	{
		name: "Claude Haiku 4.5",
		id: "claude-haiku-4-5-20251001",
		description: "Fast and affordable",
		tier: "dev",
		context: "200K",
		badges: [],
	},
];

const tierConfig = {
	pro: { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
	dev: { color: "text-chart-2", bg: "bg-chart-4/50", border: "border-chart-4/80" },
	free: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
};

const badgeConfig = {
	New: { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
	"1M context": { color: "text-chart-2", bg: "bg-chart-4/50", border: "border-chart-4/80" },
};

export interface ApiModelItem {
	id: string;
	name?: string;
	context?: string;
	type?: string;
	created?: number | string;
	launch_date?: string;
	owned_by?: string;
}

export default function ModelCards() {
	const [isOpen, setIsOpen] = useState(false);
	const [realtimeModels, setRealtimeModels] = useState<ApiModelItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedProvider, setSelectedProvider] = useState<string>("all");
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const fetchRealtimeModels = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/v1/models");
			if (!res.ok) throw new Error(`HTTP error ${res.status}`);
			const json = await res.json();
			if (json.data && Array.isArray(json.data)) {
				setRealtimeModels(json.data);
				return;
			}
		} catch (err: any) {
			console.warn("First API fetch failed, trying /v1/models fallback:", err);
			try {
				const fallbackRes = await fetch("/v1/models");
				if (fallbackRes.ok) {
					const fallbackJson = await fallbackRes.json();
					if (fallbackJson.data && Array.isArray(fallbackJson.data)) {
						setRealtimeModels(fallbackJson.data);
						return;
					}
				}
			} catch (fallbackErr) {
				console.error("Fallback fetch failed:", fallbackErr);
			}
			setError(err.message || "Failed to fetch models via API");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRealtimeModels();
	}, []);

	const handleOpenModal = () => {
		setIsOpen(true);
		fetchRealtimeModels();
	};

	const handleCopy = async (id: string) => {
		try {
			await navigator.clipboard.writeText(id);
			setCopiedId(id);
			setTimeout(() => setCopiedId(null), 2000);
		} catch (err) {
			console.error("Failed to copy text:", err);
		}
	};

	// Filter models by search and provider
	const filteredModels = realtimeModels.filter((m) => {
		const matchesSearch =
			(m.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
			(m.id || "").toLowerCase().includes(searchQuery.toLowerCase());
		
		if (!matchesSearch) return false;

		if (selectedProvider === "all") return true;
		if (selectedProvider === "anthropic") return (m.owned_by === "anthropic" || m.id.includes("claude"));
		if (selectedProvider === "openai") return (m.owned_by === "openai" || m.id.includes("gpt"));
		if (selectedProvider === "google") return (m.owned_by === "google" || m.id.includes("gemini"));
		if (selectedProvider === "other") return (m.owned_by === "groq" || m.owned_by === "mistral" || m.id.includes("llama") || m.id.includes("mistral"));
		
		return true;
	});

	return (
		<section className="relative px-4">
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-16">
					<motion.h2
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
						className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4"
					>
						<span className="text-muted-foreground text-2xl sm:text-3xl md:text-4xl font-mono">
							01 —
						</span>{" "}
						The lineup
					</motion.h2>
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.1 }}
						className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed"
					>
						The whole Claude & AI model lineup. One endpoint.
					</motion.p>
				</div>

				<StaggerContainer staggerDelay={0.08} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
					{featuredModels.map((model, i) => {
						const tier = tierConfig[model.tier as keyof typeof tierConfig];
						return (
							<motion.div
								key={model.id}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: i * 0.08 }}
								className="group relative rounded-xl border border-border bg-card hover:border-blue-300 card-lift overflow-hidden"
							>
								<div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

								<div className="p-5 sm:p-6">
									<div className="flex flex-wrap gap-2 mb-3">
										{model.badges.map((badge) => {
											const bc = badgeConfig[badge as keyof typeof badgeConfig];
											return (
												<span
													key={badge}
													className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${bc.bg} ${bc.color} ${bc.border} border`}
												>
													{badge}
												</span>
											);
										})}
									</div>

									<h3 className="text-lg font-semibold text-foreground mb-1">
										{model.name}
									</h3>

									<code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded block mb-2 truncate">
										{model.id}
									</code>

									<p className="text-sm text-muted-foreground leading-relaxed mb-4">
										{model.description}
									</p>

									<div className="flex items-center justify-between pt-3 border-t border-border">
										<span className="text-xs text-muted-foreground font-mono">
											{model.context} context
										</span>
										<span
											className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${tier.bg} ${tier.color} ${tier.border} border`}
										>
											{model.tier}
										</span>
									</div>
								</div>
							</motion.div>
						);
					})}
				</StaggerContainer>

				<div className="text-center mt-10">
					<button
						onClick={handleOpenModal}
						className="btn-ripple inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-primary/30 bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow"
					>
						<span>Fetch & View All Models via API ({realtimeModels.length > 0 ? realtimeModels.length : "Live"})</span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width={16}
							height={16}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="m6 9 6 6 6-6" />
						</svg>
					</button>
				</div>
			</div>

			{/* Real-time Claude & Models Modal */}
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl">
					{/* Modal Header */}
					<DialogHeader className="p-6 pb-4 border-b border-border text-left">
						<div className="flex items-start justify-between gap-4">
							<div>
								<div className="flex items-center gap-2 mb-1">
									<DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">
										Real-time API Models
									</DialogTitle>
									<span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
										<span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
										Live Endpoint Connected
									</span>
								</div>
								<DialogDescription className="text-sm text-muted-foreground">
									Direct fetch from <code className="text-xs font-mono text-indigo-500 bg-secondary px-1.5 py-0.5 rounded">GET /api/v1/models</code>. Works with standard Anthropic SDK.
								</DialogDescription>
							</div>

							<button
								onClick={fetchRealtimeModels}
								disabled={loading}
								className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
								title="Refresh models via API"
							>
								<svg
									className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								<span>{loading ? "Fetching..." : "Refresh API"}</span>
							</button>
						</div>

						{/* Search & Provider Filter Controls */}
						<div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
							<div className="relative flex-1 w-full">
								<svg
									className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search by model name or ID..."
									className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-muted/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 transition-all"
								/>
							</div>

							<div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
								{[
									{ id: "all", label: "All" },
									{ id: "anthropic", label: "Anthropic" },
									{ id: "openai", label: "OpenAI" },
									{ id: "google", label: "Google" },
									{ id: "other", label: "Llama / Mistral" },
								].map((tab) => (
									<button
										key={tab.id}
										onClick={() => setSelectedProvider(tab.id)}
										className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
											selectedProvider === tab.id
												? "bg-indigo-600 text-white font-semibold shadow-sm"
												: "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
										}`}
									>
										{tab.label}
									</button>
								))}
							</div>
						</div>
					</DialogHeader>

					{/* Modal Content */}
					<div className="flex-1 overflow-y-auto p-6 space-y-4">
						{loading && realtimeModels.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
								<svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
								</svg>
								<p className="text-sm font-medium">Fetching live models from API gateway...</p>
							</div>
						) : error ? (
							<div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-center text-red-600 dark:text-red-400">
								<p className="text-sm font-semibold mb-2">Error loading models from API</p>
								<p className="text-xs font-mono mb-4">{error}</p>
								<button
									onClick={fetchRealtimeModels}
									className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-all cursor-pointer"
								>
									Retry API Fetch
								</button>
							</div>
						) : filteredModels.length > 0 ? (
							<div className="border border-border/60 rounded-xl overflow-hidden shadow-sm">
								<div className="overflow-x-auto">
									<table className="w-full text-sm text-left border-collapse">
										<thead>
											<tr className="bg-muted/50 border-b border-border/60 text-xs font-mono uppercase tracking-wider text-muted-foreground">
												<th className="px-4 py-3 font-semibold">Model Name</th>
												<th className="px-4 py-3 font-semibold">Model ID</th>
												<th className="px-4 py-3 font-semibold">Context Window</th>
												<th className="px-4 py-3 font-semibold">Type</th>
												<th className="px-4 py-3 font-semibold">Released</th>
												<th className="px-4 py-3 text-right font-semibold">Action</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border/40 font-sans">
											{filteredModels.map((m) => (
												<tr key={m.id} className="hover:bg-muted/30 transition-colors">
													<td className="px-4 py-3.5 font-semibold text-foreground">
														<div className="flex items-center gap-2">
															<span className="w-2 h-2 rounded-full bg-indigo-600" />
															<span>{m.name || m.id}</span>
														</div>
													</td>
													<td className="px-4 py-3.5 font-mono text-xs">
														<code className="bg-muted px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-bold">
															{m.id}
														</code>
													</td>
													<td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">
														{m.context || "200,000"} tokens
													</td>
													<td className="px-4 py-3.5 text-xs">
														<span className="px-2 py-0.5 rounded-md font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
															{m.type || "Chat / Completion"}
														</span>
													</td>
													<td className="px-4 py-3.5 text-muted-foreground text-xs font-mono">
														{m.launch_date || (m.created ? (typeof m.created === 'number' ? new Date(m.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : m.created) : "Dec 2024")}
													</td>
													<td className="px-4 py-3.5 text-right">
														<button
															onClick={() => handleCopy(m.id)}
															className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
															title="Copy Model ID"
														>
															{copiedId === m.id ? (
																<span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
																	<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
																		<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
																	</svg>
																	Copied
																</span>
															) : (
																<>
																	<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
																		<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
																		<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
																	</svg>
																	Copy ID
																</>
															)}
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						) : (
							<div className="text-center py-12 text-muted-foreground space-y-2">
								<p className="text-sm font-semibold">No matching models found</p>
								<p className="text-xs">Try adjusting your search query or provider filter.</p>
							</div>
						)}
					</div>

					{/* Modal Footer */}
					<div className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
						<span>All models are Anthropic-compatible and work with standard Anthropic SDK requests.</span>
						<button
							onClick={() => setIsOpen(false)}
							className="px-5 py-2 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-colors cursor-pointer"
						>
							Close
						</button>
					</div>
				</DialogContent>
			</Dialog>
		</section>
	);
}


