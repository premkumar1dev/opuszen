import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction, Form } from "react-router";
import { useLoaderData, useActionData, useNavigation } from "react-router";
import { useState, useEffect, useRef } from "react";
import { Layout } from "../components/Layout";
import { getKeyStatus } from "~/utils/gateway-service";
import { getPlanInfoForApiKey, inferTokenLimitFromPlan } from "~/utils/plan-service";

export const meta: MetaFunction = () => {
	return [
		{ title: "API Key Telemetry & Token Quotas | OpusZen Developer Platform" },
		{
			name: "description",
			content: "Enterprise-grade real-time token telemetry, sliding 5-hour quota enforcement, and live gateway request analytics via API.",
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

		// Also query plan assignment metadata if available
		try {
			const planInfo = await getPlanInfoForApiKey(cleanKey);
			if (planInfo) {
				(data as any).planInfo = planInfo;
				if (planInfo.monthlyTokenLimit && !data.windowTokensLimit) {
					data.windowTokensLimit = planInfo.monthlyTokenLimit;
				}
			}
		} catch {
			// ignore plan lookup error
		}

		return { keyData: data, error: null, key: cleanKey };
	} catch (err: unknown) {
		return {
			keyData: null,
			error: err instanceof Error ? err.message : "Failed to connect to the key status server",
			key: cleanKey,
		};
	}
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

	const isNavigationLoading = navigation.state === "submitting" || navigation.state === "loading";
	const initialData = actionData || loaderData || { keyData: null, error: null, key: "" };

	// Reactive Client-Side API Telemetry State
	const [keyData, setKeyData] = useState<any>(initialData.keyData);
	const [currentKey, setCurrentKey] = useState<string>(initialData.key || "");
	const [errorMessage, setErrorMessage] = useState<string | null>(initialData.error);
	const [isApiLoading, setIsApiLoading] = useState<boolean>(false);
	const [apiLatencyMs, setApiLatencyMs] = useState<number | null>(null);
	const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(initialData.keyData ? new Date() : null);

	const [timeLeft, setTimeLeft] = useState<string>("");
	const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
	const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
	const [copiedKey, setCopiedKey] = useState<boolean>(false);
	const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"api" | "cursor" | "claude" | "python" | "curl">("api");
	const inputRef = useRef<HTMLInputElement>(null);

	// Sync with server action / loader when SSR updates
	useEffect(() => {
		if (actionData) {
			setKeyData(actionData.keyData);
			setCurrentKey(actionData.key || "");
			setErrorMessage(actionData.error);
			if (actionData.keyData) setLastSyncedTime(new Date());
		} else if (loaderData) {
			setKeyData(loaderData.keyData);
			setCurrentKey(loaderData.key || "");
			setErrorMessage(loaderData.error);
			if (loaderData.keyData) setLastSyncedTime(new Date());
		}
	}, [actionData, loaderData]);

	// Fetch Real-time Telemetry Data via API
	const fetchRealtimeViaApi = async (apiKeyToFetch?: string) => {
		const target = (apiKeyToFetch ?? currentKey ?? "").trim();
		if (!target) return;

		setIsApiLoading(true);
		const start = performance.now();

		try {
			const res = await fetch(`/api/key-status?key=${encodeURIComponent(target)}`, {
				headers: {
					"Accept": "application/json",
				},
			});
			const latency = Math.round(performance.now() - start);
			setApiLatencyMs(latency);

			const json = await res.json();
			if (!res.ok || json.error || json.status === "error") {
				setErrorMessage(json.error || "API key not found or inactive");
			} else {
				setKeyData(json);
				setCurrentKey(target);
				setErrorMessage(null);
				setLastSyncedTime(new Date());

				// Update URL with query param without full page reload
				if (typeof window !== "undefined") {
					const newUrl = new URL(window.location.href);
					newUrl.searchParams.set("key", target);
					window.history.replaceState({}, "", newUrl.toString());
				}
			}
		} catch (err: unknown) {
			setErrorMessage(err instanceof Error ? err.message : "Network error fetching real-time data via API");
		} finally {
			setIsApiLoading(false);
		}
	};

	// Auto-refresh every 30s via direct API polling
	useEffect(() => {
		if (!autoRefresh || !currentKey) return;
		const interval = setInterval(() => {
			fetchRealtimeViaApi(currentKey);
		}, 30000);
		return () => clearInterval(interval);
	}, [autoRefresh, currentKey]);

	// Digital rolling countdown timer state
	const [rollingTimer, setRollingTimer] = useState<{
		hours: string;
		minutes: string;
		seconds: string;
		totalSecondsRemaining: number;
		percentRemaining: number;
		formattedText: string;
		isResetting: boolean;
	}>({
		hours: "04",
		minutes: "59",
		seconds: "59",
		totalSecondsRemaining: 18000,
		percentRemaining: 100,
		formattedText: "4h 59m 59s remaining",
		isResetting: false,
	});

	const parseTimestampToMs = (val: any): number => {
		if (!val) return NaN;
		if (typeof val === "number") {
			return val < 10_000_000_000 ? val * 1000 : val;
		}
		if (typeof val === "string") {
			const num = Number(val);
			if (!isNaN(num) && num > 0) {
				return num < 10_000_000_000 ? num * 1000 : num;
			}
			const parsed = Date.parse(val);
			if (!isNaN(parsed)) return parsed;
			const iso = val.replace(" ", "T");
			const parsedIso = Date.parse(iso);
			if (!isNaN(parsedIso)) return parsedIso;
		}
		const d = new Date(val);
		return d.getTime();
	};

	// 5-Hour rolling window countdown loop
	useEffect(() => {
		if (!keyData) {
			setTimeLeft("");
			return;
		}

		const fiveHoursMs = 5 * 60 * 60 * 1000;

		const updateTimer = () => {
			const now = Date.now();
			let targetMs = parseTimestampToMs(keyData.windowResetAt);

			// If targetMs is invalid, expired, or represents a distant expiry date (> 5.5h in future), compute rolling 5h window
			if (isNaN(targetMs) || targetMs <= now || (targetMs - now) > 5.5 * 60 * 60 * 1000) {
				const lastUsedMs = parseTimestampToMs(keyData.lastUsedAt || keyData.last_used);
				if (!isNaN(lastUsedMs) && (now - lastUsedMs) < fiveHoursMs) {
					targetMs = lastUsedMs + fiveHoursMs;
				} else {
					targetMs = now + fiveHoursMs;
				}
			}

			const diff = Math.max(0, targetMs - now);

			const h = Math.floor(diff / (1000 * 60 * 60));
			const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
			const s = Math.floor((diff % (1000 * 60)) / 1000);

			const hoursStr = String(h).padStart(2, "0");
			const minutesStr = String(m).padStart(2, "0");
			const secondsStr = String(s).padStart(2, "0");

			const totalSec = Math.floor(diff / 1000);
			const pct = Math.min(100, Math.max(1, Math.round((diff / fiveHoursMs) * 100)));

			const parts = [];
			if (h > 0) parts.push(`${h}h`);
			if (m > 0 || h > 0) parts.push(`${m}m`);
			parts.push(`${s}s`);

			const text = parts.join(" ") + " remaining";
			setTimeLeft(text);
			setRollingTimer({
				hours: hoursStr,
				minutes: minutesStr,
				seconds: secondsStr,
				totalSecondsRemaining: totalSec,
				percentRemaining: pct,
				formattedText: text,
				isResetting: diff === 0,
			});
		};

		updateTimer();
		const interval = setInterval(updateTimer, 1000);

		return () => {
			if (interval) clearInterval(interval);
		};
	}, [keyData?.windowResetAt, keyData?.lastUsedAt]);

	const copyToClipboard = async (text: string, type: "key" | "snippet") => {
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
			if (type === "key") {
				setCopiedKey(true);
				setTimeout(() => setCopiedKey(false), 2200);
			} else {
				setCopiedSnippet(text);
				setTimeout(() => setCopiedSnippet(null), 2200);
			}
		} catch {
			// fallback
		}
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

		return `${timeStr} (${dateStr})`;
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
			parts.push(`${diffDays}d`);
		}
		if (diffHours > 0 || diffDays === 0) {
			parts.push(`${diffHours}h`);
		}
		return parts.join(" ") + " left";
	};

	// ------------------------------------------------------------------------
	// ACCURATE TOKEN & USAGE METRICS RESOLUTION
	// ------------------------------------------------------------------------
	const rawLimit = Number(
		keyData?.windowTokensLimit ??
		keyData?.window_tokens_limit ??
		keyData?.windowTokenLimit ??
		keyData?.window_token_limit ??
		keyData?.tokensLimit ??
		keyData?.tokens_limit ??
		keyData?.tokenLimit ??
		keyData?.token_limit ??
		keyData?.totalTokenLimit ??
		keyData?.total_token_limit ??
		keyData?.allocatedTokens ??
		keyData?.allocated_tokens ??
		keyData?.max_tokens ??
		keyData?.maxTokens ??
		keyData?.quota ??
		keyData?.total_tokens ??
		keyData?.totalTokens ??
		0
	);

	const rawAllocatedCredits = Number(
		keyData?.allocatedCredits ??
		keyData?.allocated_credits ??
		keyData?.totalCredits ??
		keyData?.total_credits ??
		0
	);

	const planInferredLimit = inferTokenLimitFromPlan(
		keyData?.planName ||
		keyData?.originalPlanName ||
		keyData?.planInfo?.planName ||
		keyData?.planInfo?.displayName ||
		keyData?.name ||
		keyData?.label ||
		""
	);

	const limit = rawLimit > 0
		? rawLimit
		: rawAllocatedCredits > 100_000
			? rawAllocatedCredits
			: rawAllocatedCredits > 0
				? rawAllocatedCredits * 1000
				: Number(keyData?.planInfo?.monthlyTokenLimit || 0) > 0
					? Number(keyData.planInfo.monthlyTokenLimit)
					: planInferredLimit > 0
						? planInferredLimit
						: 0;

	const rawUsed = Number(
		keyData?.windowTokensUsed ??
		keyData?.window_tokens_used ??
		keyData?.windowTokenUsed ??
		keyData?.window_token_used ??
		keyData?.tokensUsed ??
		keyData?.tokens_used ??
		keyData?.usedTokens ??
		keyData?.used_tokens ??
		keyData?.tokenUsage ??
		keyData?.token_usage ??
		keyData?.used_quota ??
		keyData?.usedQuota ??
		(keyData?.totalPromptTokens || keyData?.totalCompletionTokens
			? Number(keyData?.totalPromptTokens || 0) + Number(keyData?.totalCompletionTokens || 0)
			: undefined) ??
		(keyData?.prompt_tokens || keyData?.completion_tokens
			? Number(keyData?.prompt_tokens || 0) + Number(keyData?.completion_tokens || 0)
			: undefined) ??
		0
	);

	const rawUsedCredits = Number(
		keyData?.usedCredits ??
		keyData?.used_credits ??
		keyData?.spentCredits ??
		keyData?.spent_credits ??
		0
	);

	const rawUsagePercent = Number(
		keyData?.usagePercent ??
		keyData?.usage_percent ??
		keyData?.usagePercentage ??
		keyData?.usage_percentage ??
		keyData?.usage_pct ??
		0
	);

	const rawRemaining = Number(
		keyData?.remainingTokens ??
		keyData?.remaining_tokens ??
		keyData?.windowTokensRemaining ??
		keyData?.window_tokens_remaining ??
		keyData?.tokensRemaining ??
		keyData?.tokens_remaining ??
		keyData?.remaining_quota ??
		keyData?.remainingQuota ??
		0
	);

	const rawRemainingCredits = Number(
		keyData?.remainingCredits ??
		keyData?.remaining_credits ??
		0
	);

	// Check if usage object exists
	const usageObjTokens = typeof keyData?.usage === 'object' && keyData?.usage !== null
		? Number(
			keyData.usage.total_tokens ??
			keyData.usage.totalTokens ??
			keyData.usage.tokens ??
			keyData.usage.used ??
			(keyData.usage.prompt_tokens || keyData.usage.completion_tokens
				? Number(keyData.usage.prompt_tokens || 0) + Number(keyData.usage.completion_tokens || 0)
				: 0)
		  )
		: 0;

	// Check if logs contain token usage
	const logsTokens = (Array.isArray(keyData?.recentLogs) ? keyData.recentLogs : Array.isArray(keyData?.recent_logs) ? keyData.recent_logs : Array.isArray(keyData?.logs) ? keyData.logs : [])
		.reduce((sum: number, l: any) => sum + Number(l?.tokens || l?.total_tokens || (Number(l?.prompt_tokens || 0) + Number(l?.completion_tokens || 0)) || 0), 0);

	let used = rawUsed > 0
		? rawUsed
		: usageObjTokens > 0
			? usageObjTokens
			: logsTokens > 0
				? logsTokens
				: rawAllocatedCredits > 100_000
					? Math.round(rawUsedCredits)
					: rawUsedCredits > 0
						? Math.round(rawUsedCredits * 1000)
						: 0;

	// If still 0, check if remaining tokens is less than limit (Used = Limit - Remaining)
	if (used === 0 && rawRemaining > 0 && limit > rawRemaining) {
		used = limit - rawRemaining;
	} else if (used === 0 && rawAllocatedCredits > 0 && rawRemainingCredits > 0 && rawAllocatedCredits > rawRemainingCredits) {
		const diff = rawAllocatedCredits - rawRemainingCredits;
		used = rawAllocatedCredits > 100_000 ? Math.round(diff) : Math.round(diff * 1000);
	} else if (used === 0 && rawUsagePercent > 0 && limit > 0) {
		used = Math.round(limit * (rawUsagePercent / 100));
	}

	const isUnlimited = keyData ? Boolean(keyData.unlimited ?? (limit === 0)) : false;

	const remaining = isUnlimited
		? 0
		: rawRemaining > 0
			? rawRemaining
			: rawAllocatedCredits > 100_000 && rawRemainingCredits > 0
				? Math.round(rawRemainingCredits)
				: rawRemainingCredits > 0
					? Math.round(rawRemainingCredits * 1000)
					: limit > 0
						? Math.max(0, limit - used)
						: 0;

	const calculatedUsagePercent = isUnlimited
		? 0
		: rawUsagePercent > 0
			? rawUsagePercent
			: limit > 0
				? Math.min(100, Math.round((used / limit) * 1000) / 10)
				: 0;

	const usagePercentage = Number(calculatedUsagePercent.toFixed(1));

	const keyName = keyData ? String(keyData.name ?? "API Key") : "";
	const expiresAt = keyData ? String(keyData.expiresAt ?? "") : "";
	const createdAt = keyData ? String(keyData.createdAt ?? "") : "";
	const lastUsedAt = keyData ? String(keyData.lastUsedAt ?? "") : "";
	const isActive = keyData ? keyData.isActive ?? keyData.windowActive ?? true : true;
	const connectionStatus = keyData?.connectionStatus || (isActive ? "Online" : "Offline");

	const rateLimit = keyData?.rateLimit ?? 60;
	const last24hRequests = keyData?.last24h?.requests ?? 0;
	const totalRequests = keyData?.totalRequests ?? 0;
	const allowedModels = (keyData?.allowedModels as string[]) || [];
	const recentLogs = (keyData?.recentLogs as any[]) || [];
	const displayKey = currentKey || "";
	const isActionInProgress = isApiLoading || isNavigationLoading;

	// Format helper for large numbers
	const formatNumberCompact = (num: number) => {
		if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 2)}M`;
		if (num >= 1_000) return `${(num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1)}K`;
		return num.toLocaleString();
	};

	const getProgressColor = (percent: number) => {
		if (percent >= 90) return "from-rose-500 via-red-500 to-rose-600 shadow-rose-500/30";
		if (percent >= 75) return "from-amber-500 via-orange-500 to-amber-600 shadow-amber-500/30";
		return "from-emerald-500 via-teal-400 to-cyan-500 shadow-emerald-500/30";
	};

	const getProgressBadgeColor = (percent: number) => {
		if (percent >= 90) return "text-rose-500 bg-rose-500/10 border-rose-500/25";
		if (percent >= 75) return "text-amber-500 bg-amber-500/10 border-amber-500/25";
		return "text-emerald-500 bg-emerald-500/10 border-emerald-500/25";
	};

	const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const inputKey = String(formData.get("key") || "").trim();
		if (inputKey) {
			fetchRealtimeViaApi(inputKey);
		}
	};

	const getSnippetCode = () => {
		const targetUrl = typeof window !== "undefined" ? window.location.origin : "https://opuszen.com";
		const k = displayKey || "sk_live_YOUR_API_KEY";
		switch (activeTab) {
			case "api":
				return `# Real-time API Endpoint Query
curl -X GET "${targetUrl}/api/key-status?key=${k}" \\
  -H "Accept: application/json"`;
			case "cursor":
				return `// Cursor / Cline / Windsurf OpenAI-Compatible Configuration
Base URL: ${targetUrl}/v1
API Key:  ${k}
Model:    claude-3-5-sonnet-20241022 (or claude-opus-4-8)`;
			case "claude":
				return `# Claude Code Environment Config
export ANTHROPIC_BASE_URL="${targetUrl}/v1"
export ANTHROPIC_API_KEY="${k}"`;
			case "python":
				return `import requests

# Query real-time key telemetry via API
response = requests.get(
    "${targetUrl}/api/key-status",
    params={"key": "${k}"},
    headers={"Accept": "application/json"}
)
print(response.json())`;
			case "curl":
				return `curl ${targetUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${k}" \\
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "Ping test"}]
  }'`;
		}
	};

	return (
		<Layout>
			{/* SaaS Atmospheric Background Glows */}
			<div className="relative min-h-screen bg-background font-sans selection:bg-primary/20 selection:text-primary">
				<div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-gradient-to-tr from-primary/10 via-emerald-500/8 to-cyan-500/10 blur-[130px] rounded-full opacity-80" />
				<div className="pointer-events-none absolute top-[400px] -left-48 w-96 h-96 bg-primary/5 blur-[120px] rounded-full" />
				<div className="pointer-events-none absolute top-[700px] -right-48 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full" />

				<div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
					
					{/* SaaS Platform Header */}
					<div className="text-center max-w-3xl mx-auto mb-10">
						<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20 mb-4 backdrop-blur-md shadow-xs">
							<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
							<span>CLUSTER TELEMETRY • REAL-TIME API SYNC</span>
						</div>
						<h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-3 text-gradient">
							Key Status & Usage
						</h1>
						<p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
							Real-time token quota telemetry, sliding 5-hour rolling windows, and multi-model gateway metrics queried live via API.
						</p>
					</div>

					{/* Search / Key Submission Command Bar */}
					<div className="max-w-3xl mx-auto mb-10">
						<div className="relative p-2 rounded-2xl border border-border/80 bg-card/85 dark:bg-card/45 backdrop-blur-xl shadow-xl shadow-black/5 hover:border-primary/50 transition-all duration-300">
							<form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2">
								<div className="relative flex-1 flex items-center">
									<div className="absolute left-3.5 text-muted-foreground/70 pointer-events-none">
										<svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
											<path d="M21 2l-2 2m-1.5 1.5L10 13l-4 4-2-2 4-4 7.5-7.5" />
											<circle cx="7.5" cy="16.5" r="3.5" />
											<path d="m15.5 4.5 4 4" />
										</svg>
									</div>
									<input
										ref={inputRef}
										type={showKeyInput ? "text" : "password"}
										name="key"
										defaultValue={currentKey}
										disabled={isActionInProgress}
										className="w-full pl-10 pr-20 py-3.5 rounded-xl bg-background/80 dark:bg-background/40 border border-input/60 text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all placeholder:text-muted-foreground/60 placeholder:font-sans disabled:opacity-60"
										placeholder="Paste your OpusZen API key (sk_live_...)"
										required
										autoComplete="off"
										spellCheck="false"
									/>
									<button
										type="button"
										onClick={() => setShowKeyInput(!showKeyInput)}
										className="absolute right-2.5 px-2.5 py-1 text-xs font-semibold rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
										aria-label="Toggle key visibility"
									>
										{showKeyInput ? "Hide" : "Show"}
									</button>
								</div>
								<button
									type="submit"
									disabled={isActionInProgress}
									className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground hover:opacity-95 active:scale-[0.99] transition-all px-6 py-3.5 shadow-md shadow-primary/25 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
								>
									{isActionInProgress ? (
										<>
											<svg className="animate-spin h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
												<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
												<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
											</svg>
											<span>Fetching via API...</span>
										</>
									) : (
										<>
											<svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
												<circle cx="11" cy="11" r="8" />
												<path d="m21 21-4.3-4.3" />
											</svg>
											<span>Fetch Live API</span>
										</>
									)}
								</button>
							</form>
						</div>
					</div>

					{/* Loading State Skeleton */}
					{isActionInProgress && (
						<div className="mb-8 p-6 rounded-3xl border border-primary/30 bg-card/85 dark:bg-card/75 backdrop-blur-xl shadow-xl relative overflow-hidden animate-pulse">
							<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-primary animate-pulse" />
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin shrink-0" />
								<div>
									<h3 className="font-heading text-base font-bold text-foreground">Querying Real-Time Key API...</h3>
									<p className="text-xs text-muted-foreground mt-0.5">Fetching live sliding 5-hour rolling tokens, quota allocations, and logs</p>
								</div>
							</div>
						</div>
					)}

					{/* Error Alert */}
					{errorMessage && (
						<div className="mb-8 p-6 rounded-3xl border border-destructive/30 bg-destructive/10 dark:bg-destructive/5 backdrop-blur-md">
							<div className="flex items-start gap-4">
								<div className="p-2.5 rounded-2xl bg-destructive/20 text-destructive shrink-0">
									<svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
										<circle cx="12" cy="12" r="10" />
										<line x1="12" y1="8" x2="12" y2="12" />
										<line x1="12" y1="16" x2="12.01" y2="16" />
									</svg>
								</div>
								<div className="space-y-2 flex-1">
									<h3 className="font-heading font-bold text-foreground text-base">Key Lookup Failed</h3>
									<p className="text-sm text-destructive/90">{errorMessage}</p>
									<div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold">
										<a href="/user/my-keys" className="inline-flex items-center gap-1.5 text-primary hover:underline">
											<span>Manage API Keys</span>
											<svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
										</a>
										<a href="/pricing" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline">
											<span>Get New Key</span>
											<svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
										</a>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Empty State */}
					{!keyData && !errorMessage && !isActionInProgress && (
						<div className="p-12 sm:p-16 text-center rounded-3xl border border-border/80 bg-card/40 dark:bg-card/20 backdrop-blur-xl shadow-lg">
							<div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary mx-auto mb-5 flex items-center justify-center shadow-inner">
								<svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
									<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
									<path d="M7 11V7a5 5 0 0 1 10 0v4" />
								</svg>
							</div>
							<h3 className="font-heading text-xl font-bold text-foreground mb-2">
								Real-Time Key Telemetry Dashboard
							</h3>
							<p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
								Submit your OpusZen API key above to load live token balance, sliding 5h quota limits, rate capacity, and request logs via API.
							</p>
							<div className="flex flex-wrap justify-center items-center gap-3 text-xs text-muted-foreground">
								<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/60 border border-border font-mono">
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
									5-Hour Rolling Window
								</div>
								<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/60 border border-border font-mono">
									<span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
									Direct API Telemetry
								</div>
								<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/60 border border-border font-mono">
									<span className="w-1.5 h-1.5 rounded-full bg-primary" />
									Live Auto-Refresh
								</div>
							</div>
						</div>
					)}

					{/* -------------------------------------------------------- */}
					{/* SAAS DASHBOARD (When keyData is loaded)                   */}
					{/* -------------------------------------------------------- */}
					{keyData && (
						<div className="space-y-8 animate-in fade-in-50 duration-500">
							
							{/* Top Bar: Key Identity & Controls */}
							<div className="p-6 rounded-3xl border border-border/80 bg-card/85 dark:bg-card/45 backdrop-blur-xl shadow-xl relative overflow-hidden">
								<div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-teal-400 to-emerald-500" />
								
								<div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6">
									<div>
										<div className="flex items-center gap-2 mb-1.5">
											<span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
												Active API Key
											</span>
											<span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
												<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
												REALTIME API SYNCED
											</span>
											{apiLatencyMs !== null && (
												<span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
													⚡ {apiLatencyMs}ms
												</span>
											)}
										</div>
										<div className="flex items-center gap-2.5 flex-wrap">
											<code className="text-sm sm:text-base font-mono font-bold text-foreground bg-muted/60 dark:bg-muted/20 px-3.5 py-1.5 rounded-xl border border-border/60 break-all select-all shadow-inner">
												{displayKey}
											</code>
											<button
												type="button"
												onClick={() => copyToClipboard(displayKey, "key")}
												className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
													copiedKey
														? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
														: "bg-background/80 hover:bg-muted border border-border text-foreground shadow-2xs"
												}`}
												title="Copy API key"
											>
												{copiedKey ? (
													<>
														<svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
														<span>Copied!</span>
													</>
												) : (
													<>
														<svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
														<span>Copy</span>
													</>
												)}
											</button>
										</div>
									</div>

									{/* Action buttons */}
									<div className="flex items-center gap-2 flex-wrap">
										<button
											type="button"
											onClick={() => fetchRealtimeViaApi(currentKey)}
											disabled={isActionInProgress}
											className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-border bg-background/80 hover:bg-muted transition-all text-foreground shadow-2xs cursor-pointer disabled:opacity-60"
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
												className={`shrink-0 ${isActionInProgress ? "animate-spin text-primary" : ""}`}
											>
												<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
												<path d="M3 3v5h5" />
												<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
												<path d="M16 16h5v5" />
											</svg>
											{isActionInProgress ? "Syncing API..." : "Sync Live API"}
										</button>

										<button
											type="button"
											onClick={() => setAutoRefresh(!autoRefresh)}
											className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
												autoRefresh
													? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs"
													: "border-border bg-background/80 hover:bg-muted text-foreground"
											}`}
											title={autoRefresh ? "Auto-refresh active (30s)" : "Enable auto-refresh"}
										>
											<span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-ping" : "bg-muted-foreground/60"}`} />
											{autoRefresh ? "Auto (30s)" : "Auto-Refresh"}
										</button>

										<span
											className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono ${
												isActive
													? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
													: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25"
											}`}
										>
											<span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
											{isActive ? "ACTIVE" : "INACTIVE"}
										</span>
									</div>
								</div>

								{/* Metadata Grid */}
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-border/60">
									<div className="p-3.5 rounded-2xl bg-background/60 dark:bg-background/25 border border-border/50">
										<span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
											Key Label
										</span>
										<span className="text-sm font-semibold text-foreground block truncate">
											{keyName}
										</span>
									</div>

									<div className="p-3.5 rounded-2xl bg-background/60 dark:bg-background/25 border border-border/50">
										<span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
											Created
										</span>
										<span className="text-sm font-mono font-semibold text-foreground block truncate">
											{createdAt ? formatDateTimeFormatted(createdAt) : "N/A"}
										</span>
									</div>

									<div className="p-3.5 rounded-2xl bg-background/60 dark:bg-background/25 border border-border/50">
										<span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
											Expiration
										</span>
										<span className="text-sm font-mono font-semibold text-foreground block truncate">
											{expiresAt ? (
												<>
													{formatDateTimeFormatted(expiresAt)}
													<span className="text-xs font-normal text-muted-foreground ml-1">
														({getDaysLeftText(expiresAt)})
													</span>
												</>
											) : (
												"Never (No Expiry)"
											)}
										</span>
									</div>

									<div className="p-3.5 rounded-2xl bg-background/60 dark:bg-background/25 border border-border/50">
										<span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
											Gateway Protocol
										</span>
										<span className="inline-flex items-center gap-1.5 text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
											<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
											{connectionStatus}
										</span>
									</div>
								</div>
							</div>

							{/* Hero Card: Accurate Token Rolling Quota & Usage */}
							<div className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/85 dark:bg-card/45 backdrop-blur-xl shadow-xl relative overflow-hidden">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
									<div>
										<h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
											<span className="p-2 rounded-xl bg-primary/10 text-primary">
												<svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
													<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
												</svg>
											</span>
											Token Quota & Sliding Allowance
										</h2>
										<p className="text-xs text-muted-foreground mt-1">
											Calculated from real-time sliding 5-hour rolling windows and lifetime prompt/completion tokens.
										</p>
									</div>

									<div className="flex items-center gap-2">
										<span className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold border ${getProgressBadgeColor(usagePercentage)} shadow-2xs`}>
											{isUnlimited ? "UNLIMITED ALLOWANCE" : `${usagePercentage}% TOKEN CAPACITY USED`}
										</span>
									</div>
								</div>

								{/* Primary Metric Numbers */}
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
									<div className="p-5 rounded-2xl bg-background/80 dark:bg-background/40 border border-border/70 shadow-2xs hover:border-primary/30 transition-colors">
										<span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
											Used Tokens
										</span>
										<div className="flex items-baseline gap-2">
											<span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tracking-tight">
												{used.toLocaleString()}
											</span>
											<span className="text-xs font-semibold text-muted-foreground font-mono">
												({formatNumberCompact(used)})
											</span>
										</div>
										<span className="text-[11px] text-muted-foreground mt-1 block">
											Tokens consumed in active window
										</span>
									</div>

									<div className="p-5 rounded-2xl bg-background/80 dark:bg-background/40 border border-border/70 shadow-2xs hover:border-emerald-500/30 transition-colors">
										<span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
											Remaining Tokens
										</span>
										<div className="flex items-baseline gap-2">
											<span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
												{isUnlimited ? "Unlimited" : remaining.toLocaleString()}
											</span>
											{!isUnlimited && (
												<span className="text-xs font-semibold text-emerald-600/80 dark:text-emerald-400/80 font-mono">
													({formatNumberCompact(remaining)})
												</span>
											)}
										</div>
										<span className="text-[11px] text-muted-foreground mt-1 block">
											{isUnlimited ? "No quota ceiling applied" : "Available for prompt & completion"}
										</span>
									</div>

									<div className="p-5 rounded-2xl bg-background/80 dark:bg-background/40 border border-border/70 shadow-2xs hover:border-primary/30 transition-colors">
										<span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
											Total Token Limit
										</span>
										<div className="flex items-baseline gap-2">
											<span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tracking-tight">
												{isUnlimited ? "Unlimited" : limit.toLocaleString()}
											</span>
											{!isUnlimited && (
												<span className="text-xs font-semibold text-muted-foreground font-mono">
													({formatNumberCompact(limit)})
												</span>
											)}
										</div>
										<span className="text-[11px] text-muted-foreground mt-1 block">
											Maximum quota ceiling
										</span>
									</div>
								</div>

								{/* Visual Progress Bar */}
								<div className="space-y-3">
									<div className="flex justify-between text-xs font-semibold">
										<span className="text-muted-foreground">Quota Utilization</span>
										<span className="font-mono text-foreground font-bold">
											{isUnlimited ? "Uncapped Capacity" : `${used.toLocaleString()} / ${limit.toLocaleString()} tokens`}
										</span>
									</div>
									
									<div className="w-full bg-muted/80 dark:bg-muted/30 rounded-full h-4 p-0.5 border border-border/50 overflow-hidden shadow-inner">
										<div
											className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${getProgressColor(usagePercentage)} shadow-sm`}
											style={{
												width: `${isUnlimited ? (used > 0 ? 100 : 0) : Math.min(100, Math.max(1, usagePercentage))}%`,
											}}
										/>
									</div>

									<div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2 pt-1 font-mono">
										<div className="flex items-center gap-1.5">
											<svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
											<span>
												Rolling Window Reset:{" "}
												<strong className="text-foreground">
													{keyData.windowResetAt ? formatDateTimeFormatted(keyData.windowResetAt) : "Continuous 5-Hour Rolling"}
												</strong>
											</span>
										</div>

										{lastSyncedTime && (
											<div className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
												<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
												<span>Synced: {lastSyncedTime.toLocaleTimeString()}</span>
											</div>
										)}
									</div>
								</div>

								{/* 5-Hour Rolling Window Dedicated Live Timer HUD */}
								<div className="mt-6 p-5 sm:p-6 rounded-2xl bg-background/90 dark:bg-background/50 border border-border/80 shadow-md">
									<div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
										<div>
											<div className="flex items-center gap-2 mb-1.5">
												<span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
													<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
												</span>
												<span className="font-heading text-sm font-bold text-foreground">
													5-Hour Rolling Quota Rollout Timer
												</span>
											</div>
											<p className="text-xs text-muted-foreground leading-relaxed">
												Tokens consumed in this sliding window continuously age out and replenish back to your quota.
											</p>
										</div>

										{/* Digital Clock Display */}
										<div className="flex items-center gap-3 self-start md:self-auto">
											<div className="flex items-center gap-1.5 font-mono">
												<div className="flex flex-col items-center">
													<span className="px-3 py-2 rounded-xl bg-card border border-border shadow-xs text-xl font-extrabold text-foreground min-w-[46px] text-center">
														{rollingTimer.hours}
													</span>
													<span className="text-[9px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">HRS</span>
												</div>
												<span className="text-xl font-extrabold text-primary animate-pulse -mt-4">:</span>
												<div className="flex flex-col items-center">
													<span className="px-3 py-2 rounded-xl bg-card border border-border shadow-xs text-xl font-extrabold text-foreground min-w-[46px] text-center">
														{rollingTimer.minutes}
													</span>
													<span className="text-[9px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">MIN</span>
												</div>
												<span className="text-xl font-extrabold text-primary animate-pulse -mt-4">:</span>
												<div className="flex flex-col items-center">
													<span className="px-3 py-2 rounded-xl bg-card border border-border shadow-xs text-xl font-extrabold text-emerald-600 dark:text-emerald-400 min-w-[46px] text-center">
														{rollingTimer.seconds}
													</span>
													<span className="text-[9px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">SEC</span>
												</div>
											</div>

											<div className="hidden sm:flex flex-col items-start pl-3 border-l border-border/60">
												<span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/25">
													<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
													TICKING LIVE
												</span>
												<span className="text-[10px] font-mono text-muted-foreground mt-1">
													{keyData.windowResetAt ? formatDateTimeFormatted(keyData.windowResetAt) : "Continuous 5h"}
												</span>
											</div>
										</div>
									</div>

									{/* Decay Progression Track */}
									<div className="mt-4 pt-4 border-t border-border/50">
										<div className="flex justify-between items-center text-[11px] font-mono text-muted-foreground mb-1.5">
											<span className="flex items-center gap-1.5">
												<span className="w-1.5 h-1.5 rounded-full bg-primary" />
												Sliding 5-Hour Window Cycle
											</span>
											<span className="text-foreground font-semibold">
												{rollingTimer.percentRemaining}% cycle remaining
											</span>
										</div>
										<div className="w-full bg-muted/70 dark:bg-muted/30 rounded-full h-2 overflow-hidden">
											<div
												className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 rounded-full transition-all duration-1000 shadow-sm"
												style={{ width: `${rollingTimer.percentRemaining}%` }}
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Secondary Metrics Grid: Limits, Requests & Activity */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Request Quotas Card */}
								<div className="p-6 rounded-3xl border border-border/80 bg-card/85 dark:bg-card/45 backdrop-blur-xl shadow-xl flex flex-col justify-between">
									<div>
										<h3 className="font-heading text-base font-bold text-foreground mb-4 flex items-center gap-2">
											<span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
												<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
											</span>
											Request Quotas & Rate Limits
										</h3>

										<div className="space-y-3.5 text-sm font-sans">
											<div className="flex justify-between items-center py-2 border-b border-border/40">
												<span className="text-muted-foreground">Rate Limit</span>
												<span className="font-bold text-foreground font-mono bg-muted/60 dark:bg-muted/20 px-2.5 py-0.5 rounded-md border border-border/40">
													{rateLimit} req / min
												</span>
											</div>

											<div className="flex justify-between items-center py-2 border-b border-border/40">
												<span className="text-muted-foreground">Last 24h Requests</span>
												<span className="font-bold text-foreground font-mono">
													{last24hRequests.toLocaleString()}
												</span>
											</div>

											<div className="flex justify-between items-center py-2">
												<span className="text-muted-foreground">Total API Requests</span>
												<span className="font-bold text-foreground font-mono">
													{totalRequests.toLocaleString()}
												</span>
											</div>
										</div>
									</div>
								</div>

								{/* Activity & Health Card */}
								<div className="p-6 rounded-3xl border border-border/80 bg-card/85 dark:bg-card/45 backdrop-blur-xl shadow-xl flex flex-col justify-between">
									<div>
										<h3 className="font-heading text-base font-bold text-foreground mb-4 flex items-center gap-2">
											<span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
												<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
											</span>
											Gateway Health & Telemetry
										</h3>

										<div className="space-y-3.5 text-sm font-sans">
											<div className="flex justify-between items-center py-2 border-b border-border/40">
												<span className="text-muted-foreground">Last Request Processed</span>
												<span className="font-mono font-semibold text-foreground">
													{lastUsedAt ? formatDateTimeFormatted(lastUsedAt) : "No requests logged yet"}
												</span>
											</div>

											<div className="flex justify-between items-center py-2 border-b border-border/40">
												<span className="text-muted-foreground">Edge Routing Protocol</span>
												<span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
													<span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
													Low-Latency HTTP/2 Proxy
												</span>
											</div>

											<div className="flex justify-between items-center py-2">
												<span className="text-muted-foreground">Connection Status</span>
												<span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
													<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
													{connectionStatus}
												</span>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Supported Models */}
							<div className="p-6 rounded-3xl border border-border/80 bg-card/85 dark:bg-card/45 backdrop-blur-xl shadow-xl">
								<h3 className="font-heading text-base font-bold text-foreground mb-3 flex items-center gap-2">
									<span className="p-1.5 rounded-lg bg-primary/10 text-primary">
										<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/></svg>
									</span>
									Supported Models on this Key
								</h3>
								<div className="flex flex-wrap gap-2 pt-1">
									{allowedModels.length > 0 ? (
										allowedModels.map((modelName) => (
											<div
												key={modelName}
												className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/80 bg-background/60 dark:bg-background/30 text-xs font-mono font-semibold text-foreground hover:border-primary/50 transition-colors shadow-2xs"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 shrink-0">
													<polyline points="20 6 9 17 4 12" />
												</svg>
												{modelName}
											</div>
										))
									) : (
										["claude-opus-4-8", "claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"].map((m) => (
											<div
												key={m}
												className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/80 bg-background/60 dark:bg-background/30 text-xs font-mono font-semibold text-foreground"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 shrink-0">
													<polyline points="20 6 9 17 4 12" />
												</svg>
												{m}
											</div>
										))
									)}
								</div>
							</div>

							{/* Recent Usage Logs */}
							<div className="p-6 rounded-3xl border border-border/80 bg-card/85 dark:bg-card/45 backdrop-blur-xl shadow-xl overflow-hidden">
								<div className="flex items-center justify-between gap-2 mb-4">
									<h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
										<span className="p-1.5 rounded-lg bg-primary/10 text-primary">
											<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
										</span>
										Recent Request Logs (Last 20)
									</h3>
									{recentLogs.length > 0 && (
										<span className="text-xs text-muted-foreground font-mono font-semibold">
											{recentLogs.length} events logged
										</span>
									)}
								</div>

								{recentLogs.length > 0 ? (
									<div className="overflow-x-auto -mx-6 px-6">
										<table className="w-full text-left text-sm border-collapse">
											<thead>
												<tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider font-mono">
													<th className="py-3 px-3 font-bold">Timestamp</th>
													<th className="py-3 px-3 font-bold">Model</th>
													<th className="py-3 px-3 font-bold text-right">Tokens</th>
													<th className="py-3 px-3 font-bold text-right">Status</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-border/40 font-mono text-xs">
												{recentLogs.map((log: any, idx: number) => {
													const isSuccess = Number(log.status) >= 200 && Number(log.status) < 300;
													return (
														<tr
															key={idx}
															className="hover:bg-muted/30 transition-colors"
														>
															<td className="py-3 px-3 text-foreground whitespace-nowrap">
																{formatLogTime(log.time)}
															</td>
															<td className="py-3 px-3 font-semibold text-primary dark:text-primary whitespace-nowrap">
																{log.model}
															</td>
															<td className="py-3 px-3 text-right text-muted-foreground whitespace-nowrap">
																{log.tokens ? Number(log.tokens).toLocaleString() : "—"}
															</td>
															<td className="py-3 px-3 text-right whitespace-nowrap">
																<span
																	className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
																		isSuccess
																			? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
																			: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25"
																	}`}
																>
																	{log.status} {isSuccess ? "OK" : "ERR"}
																</span>
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								) : (
									<div className="py-8 text-center text-muted-foreground text-sm font-sans">
										<p>No recent request logs recorded yet for this key.</p>
										<p className="text-xs opacity-75 mt-1 font-mono">Telemetry updates automatically via live API as requests are dispatched.</p>
									</div>
								)}
							</div>

							{/* Developer Integration Hub / Quick Code Snippets */}
							<div className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/85 dark:bg-card/45 backdrop-blur-xl shadow-xl">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
									<div>
										<h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
											<span className="p-1.5 rounded-lg bg-primary/10 text-primary">
												<svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
											</span>
											Quick Integration & API Access
										</h3>
										<p className="text-xs text-muted-foreground mt-0.5">
											Query key telemetry programmatically via API or connect to your IDE extensions.
										</p>
									</div>

									{/* Code Tab Switcher */}
									<div className="flex items-center p-1 rounded-xl bg-background/80 dark:bg-background/40 border border-border/70 overflow-x-auto">
										{(["api", "cursor", "claude", "python", "curl"] as const).map((tab) => (
											<button
												key={tab}
												type="button"
												onClick={() => setActiveTab(tab)}
												className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
													activeTab === tab
														? "bg-primary text-primary-foreground shadow-xs"
														: "text-muted-foreground hover:text-foreground"
												}`}
											>
												{tab === "api" ? "GET /api/key-status" : tab === "cursor" ? "Cursor / Cline" : tab === "claude" ? "Claude Code" : tab === "python" ? "Python" : "cURL"}
											</button>
										))}
									</div>
								</div>

								{/* Code Block Container */}
								<div className="relative rounded-2xl bg-zinc-950 p-4 font-mono text-xs text-zinc-200 border border-zinc-800 shadow-inner overflow-hidden">
									<button
										type="button"
										onClick={() => copyToClipboard(getSnippetCode(), "snippet")}
										className="absolute right-3 top-3 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700 shadow-sm cursor-pointer"
										title="Copy configuration snippet"
									>
										{copiedSnippet ? (
											<>
												<svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>
												<span className="text-emerald-400">Copied!</span>
											</>
										) : (
											<>
												<svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
												<span>Copy Snippet</span>
											</>
										)}
									</button>
									<pre className="overflow-x-auto pr-24 leading-relaxed select-all">
										{getSnippetCode()}
									</pre>
								</div>
							</div>

						</div>
					)}
				</div>
			</div>
		</Layout>
	);
}
