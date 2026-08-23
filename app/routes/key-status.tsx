import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction, Form } from "react-router";
import { useLoaderData, useActionData, useNavigation } from "react-router";
import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { getKeyStatus } from "~/utils/gateway-service";
import { getPlanInfoForApiKey } from "~/utils/plan-service";

export const meta: MetaFunction = () => {
	return [
		{ title: "API Key Status | OpusZen" },
		{
			name: "description",
			content: "Check your API key usage, limits, and real-time status.",
		},
	];
};

async function fetchKeyStatus(key: string) {
	if (!key) {
		return { keyData: null, error: null, key: "" };
	}

	const cleanKey = key.trim();

	try {
		const data = await getKeyStatus(cleanKey);
		if (data.status === "error" || data.error) {
			return {
				keyData: null,
				error: (data.error as string) || "API key not found or invalid",
				key: cleanKey,
			};
		}

		// SECURITY: Replace any OpusLive plan names with OpusZen plan data
		const sanitized = { ...data };
		if (sanitized.planName) {
			try {
				const opusZenPlan = await getPlanInfoForApiKey(cleanKey);
				if (opusZenPlan) {
					sanitized.planName = opusZenPlan.displayName;
					(sanitized as any).opusZenPlan = opusZenPlan;
				} else {
					// No OpusZen plan assigned — sanitize any OpusLive naming patterns
					sanitized.planName = sanitizeOpusLivePlanName(sanitized.planName as string);
				}
			} catch {
				sanitized.planName = sanitizeOpusLivePlanName(sanitized.planName as string);
			}
		}

		return { keyData: sanitized, error: null, key: cleanKey };
	} catch (err: unknown) {
		return {
			keyData: null,
			error: err instanceof Error ? err.message : "Failed to connect to the key status server",
			key: cleanKey,
		};
	}
}

function sanitizeOpusLivePlanName(name: string): string {
	// Strip OpusLive internal naming patterns (5X, 20X, etc.)
	const opusLivePatterns = [/\b\d+X\b/i, /\b\d+times\b/i, /opuslive/i];
	for (const pattern of opusLivePatterns) {
		if (pattern.test(name)) return "Custom Plan";
	}
	return name;
}

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const key = (url.searchParams.get("key") || "").trim();
	if (key) {
		return await fetchKeyStatus(key);
	}
	return { keyData: null, error: null, key: "" };
}

export async function action({ request }: ActionFunctionArgs) {
	let key = "";
	try {
		const formData = await request.formData();
		key = String(formData.get("key") || "").trim();
	} catch (err: unknown) {
		console.error("[key-status] Action form parse error:", err);
		key = "";
	}
	return await fetchKeyStatus(key);
}

export default function KeyStatusRoute() {
	const loaderData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();

	const isLoading = navigation.state === "submitting" || navigation.state === "loading";
	const data = actionData || loaderData || { keyData: null, error: null, key: "" };
	const { keyData, error, key } = data as any;
	const [timeLeft, setTimeLeft] = useState<string>("");
	const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
	const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

	// Auto-refresh every 30s when enabled
	useEffect(() => {
		if (!autoRefresh || !key) return;
		const interval = setInterval(() => {
			const form = document.querySelector<HTMLFormElement>('form[action="/key-status"]');
			if (form) form.requestSubmit();
		}, 30000);
		return () => clearInterval(interval);
	}, [autoRefresh, key]);

	useEffect(() => {
		if (!keyData || !keyData.windowResetAt) {
			setTimeLeft("");
			return;
		}

		const targetTime = new Date(keyData.windowResetAt).getTime();
		if (isNaN(targetTime)) {
			setTimeLeft("");
			return;
		}

		const updateTimer = () => {
			const now = Date.now();
			const diff = targetTime - now;

			if (diff <= 0) {
				setTimeLeft("Resetting...");
				return;
			}

			const hours = Math.floor(diff / (1000 * 60 * 60));
			const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
			const seconds = Math.floor((diff % (1000 * 60)) / 1000);

			const parts = [];
			if (hours > 0) parts.push(`${hours}h`);
			if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
			parts.push(`${seconds}s`);

			setTimeLeft(parts.join(" ") + " remaining");
		};

		updateTimer();
		const interval = setInterval(updateTimer, 1000);

		return () => {
			if (interval) clearInterval(interval);
		};
	}, [keyData?.windowResetAt]);

	const getStatusColor = (percentage: number) => {
		if (percentage < 70) return "text-emerald-600 dark:text-emerald-400";
		if (percentage < 90) return "text-amber-600 dark:text-amber-400";
		return "text-red-600 dark:text-red-400";
	};

	const formatDateToDDMMYY = (date: Date) => {
		const day = String(date.getDate()).padStart(2, "0");
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const year = String(date.getFullYear()).slice(-2);
		return `${day}/${month}/${year}`;
	};

	const formatDateTimeFormatted = (isoString?: string) => {
		if (!isoString) return "N/A";
		const date = new Date(isoString);
		if (isNaN(date.getTime())) return isoString;

		const dateStr = formatDateToDDMMYY(date);
		const timeStr = date.toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
		});

		return `${dateStr}, ${timeStr}`;
	};

	const formatLogTime = (isoString?: string) => {
		if (!isoString) return "N/A";
		const date = new Date(isoString);
		if (isNaN(date.getTime())) return isoString;

		const dateStr = formatDateToDDMMYY(date);
		const timeStr = date.toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
		});

		return `${timeStr} ${dateStr}`;
	};

	const getDaysLeftText = (isoString?: string) => {
		if (!isoString) return "";
		const expireDate = new Date(isoString);
		if (isNaN(expireDate.getTime())) return "";
		const now = new Date();
		const diffTime = expireDate.getTime() - now.getTime();
		if (diffTime <= 0) return "Expired";

		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

		const parts = [];
		if (diffDays > 0) {
			parts.push(`${diffDays} day${diffDays > 1 ? "s" : ""}`);
		}
		if (diffHours > 0 || diffDays === 0) {
			parts.push(`${diffHours} hour${diffHours > 1 ? "s" : ""}`);
		}
		return parts.join(", ") + " left";
	};

	const usagePercentage = keyData ? Number(keyData.usagePercent ?? 0) : 0;
	const isUnlimited = keyData ? Boolean(keyData.unlimited ?? false) : false;
	const planName = keyData ? String(keyData.planName ?? keyData.name ?? "Standard Plan") : "";
	const keyName = keyData ? String(keyData.name ?? "API Key") : "";
	const expiresAt = keyData ? String(keyData.expiresAt ?? "") : "";
	const createdAt = keyData ? String(keyData.createdAt ?? "") : "";
	const lastUsedAt = keyData ? String(keyData.lastUsedAt ?? "") : "";
	const isActive = keyData ? keyData.isActive ?? keyData.windowActive ?? true : true;
	const connectionStatus = keyData?.connectionStatus || (isActive ? "Online" : "Offline");

	const limit = keyData ? Number(keyData.windowTokensLimit ?? 0) : 0;
	const used = keyData ? Number(keyData.windowTokensUsed ?? 0) : 0;
	const remaining = keyData ? Number(keyData.remainingTokens ?? Math.max(0, limit - used)) : 0;

	const rateLimit = keyData?.rateLimit ?? 0;
	const last24hRequests = keyData?.last24h?.requests ?? 0;
	const totalRequests = keyData?.totalRequests ?? 0;

	const allowedModels = (keyData?.allowedModels as string[]) || [];

	const recentLogs = (keyData?.recentLogs as any[]) || [];

	const displayKey = key || "";

	return (
		<Layout>
			<div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
				<div className="mb-8">
					<h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-3 text-gradient">
						Check Usage
					</h1>
					<p className="text-muted-foreground text-base">
						Enter your API key to view real-time status, token usage, and active rate limit windows.
					</p>
				</div>

				<div className="mb-8 p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-md" role="status" aria-live="polite" aria-atomic="true">
					<Form method="post" action="/key-status" className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width={24}
								height={24}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
								strokeLinecap="round"
								strokeLinejoin="round"
								className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
								aria-hidden="true"
							>
								<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
								<circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
							</svg>
							<input
								type={showKeyInput ? "text" : "password"}
								name="key"
								defaultValue={key}
								disabled={isLoading}
								className="w-full pl-10 pr-24 py-3 rounded-xl border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground font-mono disabled:opacity-60"
								placeholder="sk_live_************************"
								required
							/>
							<button
								type="button"
								onClick={() => setShowKeyInput(!showKeyInput)}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors font-sans"
								aria-label="Toggle key visibility"
							>
								{showKeyInput ? "Hide" : "Show"}
							</button>
						</div>
						<button
							type="submit"
							disabled={isLoading}
							className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/95 transition-all px-6 h-12 cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] disabled:opacity-75 disabled:cursor-not-allowed"
						>
							{isLoading ? (
								<>
									<svg className="animate-spin h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
									</svg>
									<span>Fetching Data...</span>
								</>
							) : (
								<>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width={24}
										height={24}
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth={2}
										strokeLinecap="round"
										strokeLinejoin="round"
										className="h-4 w-4"
										aria-hidden="true"
									>
										<circle cx="11" cy="11" r="8" />
										<path d="m21 21-4.3-4.3" />
									</svg>
									<span>Check Key</span>
								</>
							)}
						</button>
					</Form>
				</div>

				{/* Fetch Loading Overlay Card */}
				{isLoading && (
					<div className="p-6 rounded-2xl border border-primary/30 bg-card/80 dark:bg-card/70 backdrop-blur-md shadow-xl relative overflow-hidden mb-8">
						<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-primary animate-pulse" />
						<div className="flex items-center gap-3">
							<div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
							<div>
								<h3 className="text-sm font-bold text-foreground">Fetching Real-time Key Status...</h3>
								<p className="text-xs text-muted-foreground">Connecting to OpusZen API Gateway & live database</p>
							</div>
						</div>
					</div>
				)}

				{keyData && (keyData as any).warning && (
					<div className="mb-8 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium flex items-center gap-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width={20}
							height={20}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							strokeLinecap="round"
							strokeLinejoin="round"
							className="shrink-0"
						>
							<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
							<line x1="12" y1="9" x2="12" y2="13" />
							<line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
						<div>
							<p className="font-semibold">Key Status Alert</p>
							<p className="text-xs opacity-90">{(keyData as any).warning}</p>
						</div>
					</div>
				)}

				{error && (
					<div className="mb-8 p-5 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive text-sm font-medium">
						<div className="flex items-start gap-3.5">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width={22}
								height={22}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
								strokeLinecap="round"
								strokeLinejoin="round"
								className="shrink-0 mt-0.5"
							>
								<circle cx="12" cy="12" r="10" />
								<line x1="12" y1="8" x2="12" y2="12" />
								<line x1="12" y1="16" x2="12.01" y2="16" />
							</svg>
							<div className="space-y-1.5 flex-1">
								<p className="font-bold text-base">Query Failed</p>
								<p className="text-sm opacity-90">{error}</p>
								<div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
									<a
										href="/user/my-keys"
										className="inline-flex items-center gap-1 font-semibold underline hover:opacity-80 transition-opacity"
									>
										View My API Keys &rarr;
									</a>
									<a
										href="/pricing"
										className="inline-flex items-center gap-1 font-semibold underline hover:opacity-80 transition-opacity"
									>
										Get New API Key &rarr;
									</a>
								</div>
							</div>
						</div>
					</div>
				)}

				{!keyData && !error && !isLoading && (
					<div className="p-12 text-center rounded-2xl border border-border/50 bg-card/20 dark:bg-card/10">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width={48}
							height={48}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth={1.5}
							strokeLinecap="round"
							strokeLinejoin="round"
							className="mx-auto mb-4 text-muted-foreground/45"
						>
							<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
						<h3 className="text-lg font-semibold text-foreground mb-1">
							Ready to check
						</h3>
						<p className="text-sm text-muted-foreground max-w-sm mx-auto">
							Submit your OpusZen API key above to load real-time status, token usage, and rate limits dashboard.
						</p>
					</div>
				)}

				{keyData && (
					<div className="space-y-8">
						{/* 1. Header Card: Key Identifier & Details */}
						<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/80 opacity-60" />

							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
								<div>
									<div className="flex items-center gap-2">
										<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
											Key Identifier
										</span>
										<span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
											<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
											Live Realtime
										</span>
									</div>
									<div className="flex items-center gap-2 mt-1">
										<code className="text-sm font-mono font-bold text-primary dark:text-primary bg-muted/50 dark:bg-muted/10 px-2.5 py-1 rounded-md border border-primary/20 break-all">
											{displayKey}
										</code>
										<button
											type="button"
											onClick={async () => {
												try { await navigator.clipboard.writeText(displayKey); } catch {}
											}}
											className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
											title="Copy API key to clipboard"
											aria-label="Copy API key to clipboard"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
											Copy
										</button>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Form method="post" action="/key-status" className="inline">
										<input type="hidden" name="key" value={key} />
										<button
											type="submit"
											disabled={isLoading}
											title="Refresh Real-time Data"
											className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground shadow-xs cursor-pointer disabled:opacity-60"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width={14}
												height={14}
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth={2}
												strokeLinecap="round"
												strokeLinejoin="round"
												className={`shrink-0 ${isLoading ? "animate-spin text-primary" : ""}`}
											>
												<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
												<path d="M3 3v5h5" />
												<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
												<path d="M16 16h5v5" />
											</svg>
											{isLoading ? "Syncing..." : "Refresh Live Data"}
										</button>
									</Form>
									<button
										type="button"
										onClick={() => setAutoRefresh(!autoRefresh)}
										className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${autoRefresh ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-border bg-background hover:bg-muted text-foreground"}`}
										title={autoRefresh ? "Auto-refresh on (every 30s)" : "Auto-refresh off"}
										aria-label={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
									>
										<span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
										{autoRefresh ? "Live" : "Auto"}
									</button>
									<span
										className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${isActive
												? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
												: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
											}`}
									>
										<div
											className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"
												}`}
											aria-hidden="true"
										/>
										{isActive ? "Key Active" : "Key Inactive"}
									</span>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/50 pt-4 text-sm">
								<div>
									<span className="text-muted-foreground">Key Name:</span>
									<span className="ml-2 font-semibold text-foreground">
										{keyName}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Plan:</span>
									<span className="ml-2 font-semibold text-foreground">
										{planName}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Expires:</span>
									<span className="ml-2 font-semibold text-foreground">
										{expiresAt
											? `${formatDateTimeFormatted(expiresAt)} (${getDaysLeftText(expiresAt)})`
											: "Never"}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Created:</span>
									<span className="ml-2 font-semibold text-foreground">
										{createdAt ? formatDateTimeFormatted(createdAt) : "N/A"}
									</span>
								</div>
							</div>
						</div>

						{/* 2. Token Rolling Quota (5h Window) */}
						<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
								<h2 className="text-lg font-bold text-foreground">
									Token Rolling Quota (5h Window)
								</h2>
								<span className={`text-sm font-semibold ${getStatusColor(usagePercentage)}`}>
									{isUnlimited ? "Unlimited" : `${usagePercentage}% used`}
								</span>
							</div>

							<div className="mb-4">
								<div className="flex justify-between text-sm mb-2">
									<span className="text-muted-foreground">Usage</span>
									<span className="font-semibold text-foreground">
										{isUnlimited
											? "Unlimited tokens available"
											: `${used.toLocaleString()} / ${limit.toLocaleString()} tokens`}
									</span>
								</div>
								<div className="w-full bg-muted rounded-full h-3.5 dark:bg-muted/20 overflow-hidden">
									<div
										className={`h-full rounded-full transition-all duration-500 ${usagePercentage < 70
												? "bg-emerald-500 dark:bg-emerald-400"
												: usagePercentage < 90
													? "bg-amber-500 dark:bg-amber-400"
													: "bg-red-500"
											}`}
										style={{
											width: `${isUnlimited ? 0 : Math.min(100, usagePercentage)}%`,
										}}
									/>
								</div>
								<div className="flex flex-col sm:flex-row justify-between text-xs mt-2.5 gap-2 text-muted-foreground">
									<span>
										{isUnlimited
											? "Unlimited tokens"
											: `${remaining.toLocaleString()} tokens remaining`}
									</span>
									<div className="flex flex-col sm:items-end gap-1">
										<span>Resets: {formatDateTimeFormatted(keyData.windowResetAt)}</span>
										{timeLeft && (
											<span className="text-primary dark:text-primary font-semibold">
												{timeLeft}
											</span>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* 3 & 4. Grid: Request Quota & Limits AND Last Activity */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Request Quota & Limits */}
							<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm flex flex-col justify-between">
								<h3 className="text-lg font-bold text-foreground mb-4">
									Request Quota & limits
								</h3>
								<div className="space-y-3 text-sm">
									<div className="flex justify-between items-center py-1.5 border-b border-border/40">
										<span className="text-muted-foreground">Rate Limit:</span>
										<span className="font-semibold text-foreground">
											{rateLimit} requests/min
										</span>
									</div>
									<div className="flex justify-between items-center py-1.5 border-b border-border/40">
										<span className="text-muted-foreground">Last 24h requests:</span>
										<span className="font-semibold text-foreground">
											{last24hRequests.toLocaleString()}
										</span>
									</div>
									<div className="flex justify-between items-center py-1.5">
										<span className="text-muted-foreground">Total API Requests:</span>
										<span className="font-semibold text-foreground">
											{totalRequests.toLocaleString()}
										</span>
									</div>
								</div>
							</div>

							{/* Last Activity */}
							<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm flex flex-col justify-between">
								<h3 className="text-lg font-bold text-foreground mb-4">
									Last Activity
								</h3>
								<div className="space-y-4 text-sm">
									<div>
										<span className="text-muted-foreground block mb-1">
											Last request processed:
										</span>
										<span className="font-semibold text-foreground text-base">
											{lastUsedAt ? formatDateTimeFormatted(lastUsedAt) : "N/A"}
										</span>
									</div>
									<div className="pt-3 border-t border-border/40 flex items-center justify-between">
										<span className="text-muted-foreground">Connection Status:</span>
										<span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
											<div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
											{connectionStatus}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* 5. Available Claude Models */}
						<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm">
							<h3 className="text-lg font-bold text-foreground mb-4">
								Available Claude Models
							</h3>
							<div className="flex flex-wrap gap-2.5">
								{allowedModels.map((modelName) => (
									<div
										key={modelName}
										className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/30 dark:bg-muted/10 text-xs font-mono font-medium text-foreground hover:border-primary/40 transition-colors"
									>
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
											className="text-emerald-500 shrink-0"
										>
											<polyline points="20 6 9 17 4 12" />
										</svg>
										{modelName}
									</div>
								))}
							</div>
						</div>

						{/* 6. Recent Usage Logs (Last 20 Requests) Table */}
						<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm overflow-hidden">
							<h3 className="text-lg font-bold text-foreground mb-4">
								Recent Usage Logs (Last 20 Requests)
							</h3>
							{recentLogs.length > 0 ? (
								<div className="overflow-x-auto -mx-6 px-6">
									<table className="w-full text-left text-sm border-collapse">
										<thead>
											<tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
												<th className="py-3 px-3 font-semibold">Time</th>
												<th className="py-3 px-3 font-semibold">Model</th>
												<th className="py-3 px-3 font-semibold text-right">Status</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border/40">
											{recentLogs.map((log: any, idx: number) => (
												<tr
													key={idx}
													className="hover:bg-muted/20 transition-colors font-mono text-xs"
												>
													<td className="py-2.5 px-3 text-foreground whitespace-nowrap">
														{formatLogTime(log.time)}
													</td>
													<td className="py-2.5 px-3 font-semibold text-primary dark:text-primary whitespace-nowrap">
														{log.model}
													</td>
													<td className="py-2.5 px-3 text-right whitespace-nowrap font-sans">
														<span
															className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${Number(log.status) >= 200 && Number(log.status) < 300
																	? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
																	: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
																}`}
														>
															{log.status}
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<p className="text-sm text-muted-foreground py-4 text-center">
									No recent request logs recorded yet.
								</p>
							)}
						</div>
					</div>
				)}
			</div>
		</Layout>
	);
}
