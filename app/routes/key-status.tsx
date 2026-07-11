import { type MetaFunction } from "react-router";
import { useLoaderData, useNavigation, Form } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";

export const meta: MetaFunction = () => {
  return [
    { title: "API Key Status | Opuszen" },
    {
      name: "description",
      content: "Check your API key usage, limits, and status.",
    },
  ];
};

function getMockKeyData(key: string) {
  const resetAt = new Date();
  resetAt.setHours(resetAt.getHours() + 3); // 3 hours from now

  return {
    name: "Demo Dev Key",
    planName: "Pro Plan (5x)",
    unlimited: false,
    usagePercent: 42,
    totalRequests: 1337,
    last24h: {
      requests: 120
    },
    rateLimit: 60,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago
    lastUsedAt: new Date().toISOString(),
    isActive: true,
    windowActive: true,
    windowTokensLimit: 5000000,
    windowTokensUsed: 2100000,
    windowResetAt: resetAt.toISOString(),
    recentLogs: [
      { model: "claude-sonnet-4-6", status: 200, time: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { model: "claude-opus-4-8", status: 200, time: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
      { model: "claude-haiku-4-5-20251001", status: 200, time: new Date(Date.now() - 1000 * 60 * 15).toISOString() }
    ],
    mockWarning: "Could not connect to local API gateway. Showing mock data for preview purposes."
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const rawKey = url.searchParams.get("key");
  const key = rawKey ? rawKey.trim() : "";

  if (!key) {
    return { keyData: null, error: null, key: "" };
  }

  try {
    const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const defaultGateway = isLocalhost
      ? 'http://localhost:3000/api'
      : 'https://api.opuszen.shop/api';

    const gatewayUrl =
      import.meta.env.VITE_API_URL ||
      process.env.API_URL ||
      defaultGateway;
    const apiResponse = await fetch(
      `${gatewayUrl}/key-status?key=${encodeURIComponent(key)}`
    );
    if (!apiResponse.ok) {
      if (import.meta.env.DEV) {
        return {
          keyData: getMockKeyData(key),
          error: null,
          key,
        };
      }
      let errorMessage = `Failed to fetch key details (HTTP status ${apiResponse.status})`;
      if (apiResponse.status === 404 && gatewayUrl.includes('localhost:3000')) {
        errorMessage = `Failed to fetch key details (HTTP status 404). Local port 3000 might be occupied by another service (like whatsapp-bridge). Please run the gateway on a different port (e.g. 3001) and define VITE_API_URL=http://localhost:3001/api in your .env file.`;
      }
      try {
        const errorData = await apiResponse.json();
        if (errorData && (errorData.error || errorData.message)) {
          errorMessage = errorData.error || errorData.message;
        }
      } catch (e) {
        // ignore json parse error
      }
      return {
        keyData: null,
        error: errorMessage,
        key,
      };
    }
    const data = await apiResponse.json();
    console.log("=== API RESPONSE FOR KEY ===", JSON.stringify(data));
    if (data.status === "error" || data.error) {
      return {
        keyData: null,
        error: data.error || "API key not found or invalid",
        key,
      };
    }
    return { keyData: data, error: null, key };
  } catch (err: any) {
    if (import.meta.env.DEV) {
      return {
        keyData: getMockKeyData(key),
        error: null,
        key,
      };
    }
    return {
      keyData: null,
      error: err.message || "Failed to connect to the key status server",
      key,
    };
  }
}

interface LogItem {
  model: string;
  status: number;
  time: string;
}

export default function KeyStatusRoute() {
  const { keyData, error, key } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isLoading =
    navigation.state === "loading" || navigation.state === "submitting";

  const [timeLeft, setTimeLeft] = useState<string>("");

  // Live countdown timer for reset window
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

    return () => clearInterval(interval);
  }, [keyData?.windowResetAt]);

  const getStatusColor = (percentage: number) => {
    if (percentage < 70) return "text-emerald-600 dark:text-emerald-400";
    if (percentage < 90) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const formatDateToDDMMYY = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const formatResetTime = (isoString?: string) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    const dateStr = formatDateToDDMMYY(date);
    const timeStr = date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    
    return `${dateStr}, ${timeStr}`;
  };

  const formatLogTime = (isoString: string) => {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    const dateStr = formatDateToDDMMYY(date);
    const timeStr = date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    
    return `${timeStr} ${dateStr}`;
  };

  // Calculate remaining time before expiration in days/hours
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

  // Helper to determine total token capacity based on plan name
  const getPlanTokenLimit = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes("20x")) return 20000000;
    if (name.includes("10x")) return 10000000;
    if (name.includes("5x")) return 5000000;
    if (name.includes("3x")) return 3000000;
    if (name.includes("2x")) return 2000000;
    if (name.includes("pro")) return 1000000;
    return 1000000; // default Pro capacity
  };

  // Extract variables directly matching the api response schema
  const usagePercentage = keyData ? Number(keyData.usagePercent ?? 0) : 0;
  const isUnlimited = keyData ? Boolean(keyData.unlimited ?? false) : false;
  const planName = keyData ? String(keyData.planName ?? "Default Plan") : "";
  const totalRequests = keyData ? Number(keyData.totalRequests ?? 0) : 0;
  const last24hRequests = keyData ? Number(keyData.last24h?.requests ?? 0) : 0;
  const rateLimit = keyData ? Number(keyData.rateLimit ?? 0) : 0;
  const expiresAt = keyData ? String(keyData.expiresAt ?? "") : "";
  const lastUsedAt = keyData ? String(keyData.lastUsedAt ?? "") : "";
  const createdAt = keyData ? String(keyData.createdAt ?? "") : "";
  const isActive = keyData ? keyData.isActive ?? keyData.windowActive ?? false : false;
  const recentLogs: LogItem[] = keyData ? keyData.recentLogs ?? [] : [];

  // Extract or calculate exact tokens limit and tokens used
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
  const used = apiLimit > 0 ? apiUsed : Math.round(limit * (usagePercentage / 100));
  const remaining = Math.max(0, limit - used);

  const maskedKey = key
    ? key.length > 25
      ? `${key.slice(0, 12)}...${key.slice(-4)}`
      : key
    : keyData?.keyPrefix || "";

  const models = [
    "claude-opus-4-8",
    "claude-opus-4-7",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4 text-gradient">
            Check Usage
          </h1>
          <p className="text-muted-foreground text-base">
            Enter your API key to view real-time status, token usage, and active rate limit windows.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="mb-8 p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-md">
          <Form method="get" action="/key-status" className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              >
                <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"></path>
                <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle>
              </svg>
              <input
                type="text"
                name="key"
                defaultValue={key}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
                placeholder="sk-ant-api03-..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/95 transition-all px-6 h-12 disabled:opacity-50 cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </svg>
                  Check Key
                </>
              )}
            </button>
          </Form>
        </div>

        {/* Mock Data Warning */}
        {!isLoading && keyData && (keyData as any).mockWarning && (
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
              <p className="font-semibold">Local Preview Mode</p>
              <p className="text-xs opacity-90">{(keyData as any).mockWarning}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
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
                      {maskedKey}
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
                    {keyData.name || "Unnamed Key"}
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
                      ? `${formatResetTime(expiresAt)} (${getDaysLeftText(expiresAt)})`
                      : "Never"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <span className="ml-2 font-semibold text-foreground">
                    {createdAt ? formatResetTime(createdAt) : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Token Usage Window Card */}
            <div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h2 className="text-lg font-bold text-foreground">
                  Token Rolling Quota (5h Window)
                </h2>
                <span
                  className={`text-sm font-semibold ${getStatusColor(
                    usagePercentage
                  )}`}
                >
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
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercentage < 70
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
                    <span>Resets: {formatResetTime(keyData.windowResetAt)}</span>
                    {timeLeft && (
                      <span className="text-primary dark:text-violet-400 font-semibold">
                        {timeLeft}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Usage Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Request Quota & limits
                </span>
                <div className="mt-3 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate Limit:</span>
                    <span className="font-semibold text-foreground">
                      {rateLimit} requests/min
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last 24h requests:</span>
                    <span className="font-semibold text-foreground">
                      {last24hRequests.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total API Requests:</span>
                    <span className="font-semibold text-foreground">
                      {totalRequests.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Last Activity
                  </span>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Last request processed:
                  </p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {lastUsedAt ? formatResetTime(lastUsedAt) : "Never"}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground border-t border-border/50 pt-2 mt-4">
                  Connection Status: <span className="text-emerald-500 font-semibold">Online</span>
                </div>
              </div>
            </div>

            {/* Available Models */}
            <div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm">
              <h2 className="text-lg font-bold text-foreground mb-4">
                Available Claude Models
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {models.map((model) => (
                  <span
                    key={model}
                    className="px-3 py-1.5 rounded-xl text-xs bg-primary/10 dark:bg-primary/5 text-primary dark:text-violet-400 font-mono font-medium border border-primary/20 dark:border-primary/5"
                  >
                    {model}
                  </span>
                ))}
              </div>
            </div>

            {/* Recent Request History */}
            {recentLogs.length > 0 && (
              <div className="rounded-2xl border border-border bg-card dark:bg-card/60 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/10">
                  <h2 className="text-lg font-bold text-foreground">
                    Recent Usage Logs (Last 20 Requests)
                  </h2>
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
                      {recentLogs.map((log, index) => (
                        <tr
                          key={index}
                          className="hover:bg-muted/10 transition-colors"
                        >
                          <td className="px-6 py-4 font-mono text-xs">
                            {formatLogTime(log.time)}
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

        {/* Empty State */}
        {!isLoading && !keyData && !error && (
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
              Submit your OpusZen API key above to load real-time status and token usage dashboard.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
