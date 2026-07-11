import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData, useNavigation } from "react-router";
import { useState, useEffect } from "react";
import { verifyAdminSession } from "../../utils/admin-auth";
import { Layout } from "../components/Layout";

export const meta: MetaFunction = () => {
	return [{ title: "Admin Dashboard | OpusZen" }];
};

interface KeyData {
	name: string;
	planName: string;
	unlimited: boolean;
	usagePercent: number;
	totalRequests: number;
	last24h: { requests: number };
	rateLimit: number;
	expiresAt: string;
	createdAt: string;
	lastUsedAt: string;
	isActive: boolean;
	windowActive: boolean;
	windowTokensLimit: number;
	windowTokensUsed: number;
	windowResetAt: string;
	recentLogs: Array<{
		model: string;
		status: number;
		time: string;
	}>;
	windowTokenLimit?: number;
	window_tokens_limit?: number;
	window_token_limit?: number;
	windowTokenUsed?: number;
	window_tokens_used?: number;
	window_token_used?: number;
}

interface LoaderData {
	keyData: KeyData | null;
	error: string | null;
}

function getMockKeyData(): KeyData {
	const resetAt = new Date();
	resetAt.setHours(resetAt.getHours() + 3);

	return {
		name: "Demo Dev Key",
		planName: "Pro Plan (5x)",
		unlimited: false,
		usagePercent: 42,
		totalRequests: 1337,
		last24h: { requests: 120 },
		rateLimit: 60,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
		createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
		lastUsedAt: new Date().toISOString(),
		isActive: true,
		windowActive: true,
		windowTokensLimit: 5000000,
		windowTokensUsed: 2100000,
		windowResetAt: resetAt.toISOString(),
		recentLogs: [
			{ model: "claude-sonnet-4-6", status: 200, time: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
			{ model: "claude-opus-4-8", status: 200, time: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
			{ model: "claude-haiku-4-5-20251001", status: 200, time: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
		],
	};
}

export async function loader({ request }: LoaderFunctionArgs) {
	const adminCheck = await verifyAdminSession();

	if (!adminCheck.isAdmin) {
		return redirect("/auth/admin");
	}

	const url = new URL(request.url);
	const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
	const defaultGateway = isLocalhost
		? "http://localhost:3000/api"
		: "https://api.opuszen.shop/api";

	const gatewayUrl =
		import.meta.env.VITE_API_URL ||
		process.env.API_URL ||
		defaultGateway;

	try {
		const apiResponse = await fetch(`${gatewayUrl}/key-status`);
		if (!apiResponse.ok) {
			if (import.meta.env.DEV) {
				return { keyData: getMockKeyData(), error: null };
			}
			return {
				keyData: null,
				error: `Failed to fetch key details (HTTP ${apiResponse.status})`,
			};
		}

		const data = await apiResponse.json();
		if (data.status === "error" || data.error) {
			return { keyData: null, error: data.error || "API key not found or invalid" };
		}

		return { keyData: data, error: null };
	} catch (err: any) {
		if (import.meta.env.DEV) {
			return { keyData: getMockKeyData(), error: null };
		}
		return { keyData: null, error: err.message || "Failed to connect to the API gateway" };
	}
}

export default function AdminDashboardRoute() {
	const { keyData, error } = useLoaderData<LoaderData>();
	const navigation = useNavigation();
	const isLoading = navigation.state === "loading";
	const [timeLeft, setTimeLeft] = useState("");

	useEffect(() => {
		if (!keyData?.windowResetAt) {
			setTimeLeft("");
			return;
		}

		const targetTime = new Date(keyData.windowResetAt).getTime();
		if (isNaN(targetTime)) {
			setTimeLeft("");
			return;
		}

		const updateTimer = () => {
			const diff = targetTime - Date.now();
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
		return () => clearInterval(interval);
	}, [keyData?.windowResetAt]);

	const getStatusColor = (pct: number) => {
		if (pct < 70) return "text-emerald-600 dark:text-emerald-400";
		if (pct < 90) return "text-amber-600 dark:text-amber-400";
		return "text-red-600 dark:text-red-400";
	};

	const formatDate = (iso: string) => {
		const d = new Date(iso);
		if (isNaN(d.getTime())) return iso;
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const year = d.getFullYear();
		const time = d.toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
		});
		return `${day}/${month}/${year}, ${time}`;
	};

	const getDaysLeft = (iso: string) => {
		const diff = new Date(iso).getTime() - Date.now();
		if (diff <= 0) return "Expired";
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const parts = [];
		if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
		if (hours > 0 || days === 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
		return parts.join(", ") + " left";
	};

	const getPlanTokenLimit = (name: string) => {
		const lower = name.toLowerCase();
		if (lower.includes("20x")) return 20000000;
		if (lower.includes("10x")) return 10000000;
		if (lower.includes("5x")) return 5000000;
		if (lower.includes("3x")) return 3000000;
		if (lower.includes("2x")) return 2000000;
		if (lower.includes("pro")) return 1000000;
		return 1000000;
	};

	const usagePct = keyData ? Number(keyData.usagePercent ?? 0) : 0;
	const isUnlimited = keyData ? Boolean(keyData.unlimited ?? false) : false;
	const planName = keyData ? String(keyData.planName ?? "Default Plan") : "";
	const totalRequests = keyData ? Number(keyData.totalRequests ?? 0) : 0;
	const last24hRequests = keyData ? Number(keyData.last24h?.requests ?? 0) : 0;
	const rateLimit = keyData ? Number(keyData.rateLimit ?? 0) : 0;
	const isActive = keyData ? keyData.isActive ?? keyData.windowActive ?? false : false;
	const apiLimit = keyData
		? Number(
				keyData.windowTokensLimit ??
					keyData.windowTokenLimit ??
					keyData.window_tokens_limit ??
					keyData.window_token_limit ??
					0
			)
		: 0;
	const apiUsed = keyData
		? Number(
				keyData.windowTokensUsed ??
					keyData.windowTokenUsed ??
					keyData.window_tokens_used ??
					keyData.window_token_used ??
					0
			)
		: 0;
	const limit = apiLimit > 0 ? apiLimit : getPlanTokenLimit(planName);
	const used = apiLimit > 0 ? apiUsed : Math.round(limit * (usagePct / 100));
	const remaining = Math.max(0, limit - used);

	return (
		<Layout>
			<div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
				{/* Header */}
				<div className="mb-8">
					<div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-semibold text-emerald-600 uppercase tracking-wider">
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
						Admin Session Active
					</div>
					<h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground text-gradient">
						Admin Dashboard
					</h1>
					<p className="text-muted-foreground text-base mt-2">
						API key usage, limits, and system status overview.
					</p>
				</div>

				{/* Error State */}
				{error && !isLoading && (
					<div className="mb-8 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-3">
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
							<circle cx={12} cy={12} r={10} />
							<line x1={12} y1={8} x2={12} y2={12} />
							<line x1={12} y1={16} x2={12.01} y2={16} />
						</svg>
						<div>
							<p className="font-semibold">Query Failed</p>
							<p className="text-xs opacity-90">{error}</p>
						</div>
					</div>
				)}

				{/* Loading Skeleton */}
				{isLoading && (
					<div className="space-y-6 animate-pulse">
						<div className="h-32 bg-muted/40 rounded-2xl border border-border/50" />
						<div className="h-48 bg-muted/40 rounded-2xl border border-border/50" />
						<div className="h-24 bg-muted/40 rounded-2xl border border-border/50" />
					</div>
				)}

				{/* Results State */}
				{!isLoading && keyData && (
					<div className="space-y-8 fade-in">
						{/* Key Info */}
						<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 opacity-60" />

							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
								<div>
									<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Key Identifier
									</span>
									<div className="flex items-center gap-2 mt-1">
										<code className="text-sm font-mono font-bold text-primary dark:text-violet-400 bg-muted/50 dark:bg-muted/10 px-2 py-1 rounded">
											{keyData.name || "Unnamed Key"}
										</code>
									</div>
								</div>
								<div>
									<span
										className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
											isActive
												? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
												: "bg-red-500/10 text-red-600 dark:text-red-400"
										}`}
									>
										<div
											className={`w-2 h-2 rounded-full ${
												isActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"
											}`}
										/>
										{isActive ? "Key Active" : "Key Inactive"}
									</span>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/50 pt-4 text-sm">
								<div>
									<span className="text-muted-foreground">Plan:</span>
									<span className="ml-2 font-semibold text-foreground">{planName}</span>
								</div>
								<div>
									<span className="text-muted-foreground">Expires:</span>
									<span className="ml-2 font-semibold text-foreground">
										{keyData.expiresAt
											? `${formatDate(keyData.expiresAt)} (${getDaysLeft(keyData.expiresAt)})`
											: "Never"}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Created:</span>
									<span className="ml-2 font-semibold text-foreground">
										{keyData.createdAt ? formatDate(keyData.createdAt) : "N/A"}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Rate Limit:</span>
									<span className="ml-2 font-semibold text-foreground">
										{rateLimit} req/min
									</span>
								</div>
							</div>
						</div>

						{/* Token Usage Window */}
						<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
								<h2 className="text-lg font-bold text-foreground">Token Rolling Quota (5h Window)</h2>
								<span className={`text-sm font-semibold ${getStatusColor(usagePct)}`}>
									{isUnlimited ? "Unlimited" : `${usagePct}% used`}
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
										className={`h-full rounded-full transition-all duration-500 ${
											usagePct < 70
												? "bg-emerald-500 dark:bg-emerald-400"
												: usagePct < 90
													? "bg-amber-500 dark:bg-amber-400"
													: "bg-red-500"
										}`}
										style={{ width: `${isUnlimited ? 0 : Math.min(100, usagePct)}%` }}
									/>
								</div>
								<div className="flex flex-col sm:flex-row justify-between text-xs mt-2.5 gap-2 text-muted-foreground">
									<span>
										{isUnlimited
											? "Unlimited tokens"
											: `${remaining.toLocaleString()} tokens remaining`}
									</span>
									<div className="flex flex-col sm:items-end gap-1">
										<span>Resets: {formatDate(keyData.windowResetAt)}</span>
										{timeLeft && (
											<span className="text-primary dark:text-violet-400 font-semibold">
												{timeLeft}
											</span>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Usage Stats */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm">
								<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Request Quota
								</span>
								<div className="mt-3 space-y-2.5 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Rate Limit:</span>
										<span className="font-semibold text-foreground">
											{rateLimit} requests/min
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Last 24h:</span>
										<span className="font-semibold text-foreground">
											{last24hRequests.toLocaleString()}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Total:</span>
										<span className="font-semibold text-foreground">
											{totalRequests.toLocaleString()}
										</span>
									</div>
								</div>
							</div>

							<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm">
								<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Last Activity
								</span>
								<p className="mt-3 text-sm text-muted-foreground">
									Last request processed:
								</p>
								<p className="text-lg font-bold text-foreground mt-1">
									{keyData.lastUsedAt ? formatDate(keyData.lastUsedAt) : "Never"}
								</p>
								<div className="text-xs text-muted-foreground border-t border-border/50 pt-2 mt-4">
									Connection:{" "}
									<span className="text-emerald-500 font-semibold">Online</span>
								</div>
							</div>
						</div>

						{/* Recent Logs */}
						{keyData.recentLogs.length > 0 && (
							<div className="rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm overflow-hidden">
								<div className="px-6 py-4 border-b border-border bg-muted/10">
									<h2 className="text-lg font-bold text-foreground">Recent Usage Logs</h2>
								</div>
								<div className="overflow-x-auto">
									<table className="w-full text-sm text-left">
										<thead className="text-xs uppercase bg-muted/30 text-muted-foreground">
											<tr>
												<th className="px-6 py-3 font-semibold">Time</th>
												<th className="px-6 py-3 font-semibold">Model</th>
												<th className="px-6 py-3 font-semibold">Status</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border/40">
											{keyData.recentLogs.map((log, idx) => (
												<tr key={idx} className="hover:bg-muted/10 transition-colors">
													<td className="px-6 py-4 font-mono text-xs">
														{formatDate(log.time)}
													</td>
													<td className="px-6 py-4 font-medium text-foreground">
														{log.model}
													</td>
									<td className="px-6 py-4">
														<span
															className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
																log.status >= 200 && log.status < 300
																	? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
																	: "bg-red-500/10 text-red-600 dark:text-red-400"
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
							</div>
						)}
					</div>
				)}

				{/* Empty state when key data is unavailable */}
				{!isLoading && !keyData && !error && (
					<div className="p-12 text-center rounded-2xl border border-border/50 bg-card/20 dark:bg-card/10">
						<p className="text-sm text-muted-foreground">
							No key data available. Check your API gateway connection.
						</p>
					</div>
				)}
			</div>
		</Layout>
	);
}
