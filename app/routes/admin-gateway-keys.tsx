/**
 * Admin - Master API Keys Management
 * Route: /auth/admin/gateway/keys
 */
import { useState, useCallback, useEffect } from "react";
import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { verifyAdminSession } from "~/utils/admin-auth";
import { supabase } from "~/utils/supabase";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { cn } from "~/lib/utils";
import type { MasterApiKeyRow, MasterApiKeyStats } from "~/types/gateway";
import {
 FiKey,
 FiPlus,
 FiTrash2,
 FiEdit3,
 FiToggleLeft,
 FiToggleRight,
 FiRefreshCw,
 FiPlay,
 FiPause,
 FiActivity,
 FiAlertTriangle,
 FiCheckCircle,
 FiXCircle,
 FiClock,
 FiCopy,
 FiShield,
 FiZap,
 FiLoader,
 FiChevronDown,
 FiExternalLink,
 FiHelpCircle,
 FiEye,
} from "react-icons/fi";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
 SheetFooter,
} from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";

// For the Select component, we'll use a native select
const ProviderSelect = ({ value, onChange, providers }: { value: string; onChange: (v: string) => void; providers: string[] }) => (
 <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm">
 {providers.map((p) => <option key={p} value={p}>{p}</option>)}
 </select>
);

export const meta: MetaFunction = () => [{ title: "Master API Keys | Admin | OpusZen" }];

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------
export async function loader({ request }: LoaderFunctionArgs) {
 const adminCheck = await verifyAdminSession(request);
 if (!adminCheck.isAdmin) throw redirect("/auth/admin");

 let keys: MasterApiKeyRow[] = [];
 let stats: Record<string, MasterApiKeyStats> = {};
 let details: Record<string, any> = {};

 try {
  keys = await (await import("~/utils/master-key-service")).getAllMasterKeys();

  const { getKeyStatus } = await import("~/utils/gateway-service");
  for (const key of keys) {
   try {
    const s = await (await import("~/utils/master-key-service")).getMasterKeyStats(key.id);
    stats[key.id] = s;
   } catch { /* skip */ }

   try {
    const data = await getKeyStatus(key.api_key);
    if (data && data.status !== "error") {
     details[key.id] = data;
    }
   } catch { /* skip */ }
  }
 } catch (err) {
  // Table may not exist yet
 }

 return { keys, stats, details, adminEmail: adminCheck.adminEmail };
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------
export async function action({ request }: ActionFunctionArgs) {
 const adminCheck = await verifyAdminSession(request);
 if (!adminCheck.isAdmin) throw redirect("/auth/admin");

 const formData = await request.formData();
 const intent = formData.get("intent")?.toString();

 try {
  const masterKeyService = await import("~/utils/master-key-service");

  if (intent === "create") {
   const provider = formData.get("provider")?.toString() || "";
   const name = formData.get("name")?.toString() || "";
   const api_key = formData.get("api_key")?.toString() || "";
   const priority = parseInt(formData.get("priority")?.toString() || "1") || 1;
   const total_credits = parseFloat(formData.get("total_credits")?.toString() || "999999") || 999999;
   const status = formData.get("status")?.toString() as any || "active";

   await masterKeyService.createMasterKey({
    provider,
    name,
    api_key,
    priority,
    total_credits,
    status,
   });
   return { success: true, intent: "create" };
  }

  if (intent === "delete") {
   const id = formData.get("id")?.toString() || "";
   await masterKeyService.deleteMasterKey(id);
   return { success: true };
  }

  if (intent === "toggle-status") {
   const id = formData.get("id")?.toString() || "";
   const currentStatus = formData.get("currentStatus")?.toString();
   const newStatus = currentStatus === "active" ? "disabled" : "active";
   await masterKeyService.updateMasterKey(id, { status: newStatus });
   return { success: true };
  }

  if (intent === "reset-health") {
   const id = formData.get("id")?.toString() || "";
   await masterKeyService.resetMasterKeyHealth(id);
   return { success: true };
  }

  if (intent === "test-connection") {
   const id = formData.get("id")?.toString() || "";
   const key = await masterKeyService.getMasterKeyById(id);
   if (!key) throw new Error("Key not found");

   let ok = false;
   let message = "";
   try {
    const isUrl = key.provider.startsWith("http");
    const isOpus = key.provider.includes("opusmax") || key.provider.includes("opuszen") || key.provider.includes("opuslive") || key.provider === "opuslive";

    const config = key.provider === 'Anthropic'
     ? { baseUrl: 'https://api.anthropic.com/v1', authHeader: 'x-api-key' }
     : isUrl
     ? { baseUrl: key.provider, authHeader: 'Authorization' }
     : isOpus
     ? { baseUrl: 'https://api.opusmax.live/v1', authHeader: 'Authorization' }
     : { baseUrl: 'https://api.openai.com/v1', authHeader: 'Authorization' };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (key.provider === 'Anthropic') {
     headers['x-api-key'] = key.api_key;
     headers['anthropic-version'] = '2023-06-01';
    } else {
     headers['Authorization'] = `Bearer ${key.api_key}`;
    }

    const endpoint = key.provider === 'Anthropic' ? '/messages' : '/chat/completions';
    const startTime = Date.now();
    const res = await fetch(`${config.baseUrl}${endpoint}`, {
     method: 'POST',
     headers,
     body: JSON.stringify(
      key.provider === 'Anthropic'
       ? { model: 'claude-3-5-haiku-20241022', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }
       : isOpus
       ? { model: 'opuslive-chat', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }
       : { model: 'gpt-4o-mini', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }
     ),
    });

    const responseTime = Date.now() - startTime;

    if (res.ok) {
     ok = true;
     message = `Connection successful (${res.status})`;
     const { recordHealthSuccess } = await import("~/utils/health-service");
     await recordHealthSuccess(key.id, responseTime);
    } else {
     const err = await res.json().catch(() => ({}));
     message = err?.error?.message ?? `HTTP ${res.status}`;
     const { recordHealthFailure } = await import("~/utils/health-service");
     await recordHealthFailure(key.id, message, res.status);
    }
   } catch (err: any) {
    message = err.message ?? 'Connection failed';
    const { recordHealthFailure } = await import("~/utils/health-service");
    await recordHealthFailure(key.id, message, 500);
   }

   return { success: true, intent: "test-connection", keyId: id, ok, message };
  }
 } catch (err: any) {
  return { error: err.message || "An unexpected system error occurred" };
 }

 return { error: "Unknown action" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const PROVIDERS = ['opuslive'];

const HEALTH_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
 healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', dot: 'bg-emerald-500' },
 rate_limited: { bg: 'bg-amber-500/10', text: 'text-amber-600', dot: 'bg-amber-500' },
 unhealthy: { bg: 'bg-orange-500/10', text: 'text-orange-600', dot: 'bg-orange-500' },
 quota_exhausted: { bg: 'bg-red-500/10', text: 'text-red-600', dot: 'bg-red-500' },
 disabled: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', dot: 'bg-zinc-400' },
};

function formatDate(iso: string | null): string {
 if (!iso) return "Never";
 return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getDaysLeftText(isoString?: string): string {
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
}

const getPlanTokenLimit = (planName: string) => {
  const name = planName.toLowerCase();
  if (name.includes("20x")) return 20000000;
  if (name.includes("10x")) return 10000000;
  if (name.includes("5x")) return 5000000;
  if (name.includes("3x")) return 3000000;
  if (name.includes("2x")) return 2000000;
  if (name.includes("pro")) return 1000000;
  return 1000000;
};

export default function AdminMasterKeysRoute() {
 const { keys, stats, details = {}, adminEmail } = useLoaderData<typeof loader>();
 const navigate = useNavigate();
 const fetcher = useFetcher();
 const [showAddForm, setShowAddForm] = useState(false);
 const [editingKey, setEditingKey] = useState<MasterApiKeyRow | null>(null);
 const [form, setForm] = useState({
 provider: 'https://api.opusmax.live/v1',
 name: '',
 api_key: '',
 priority: 1,
 total_credits: 999999,
 status: 'active' as MasterApiKeyRow['status'],
 });
 const [testingId, setTestingId] = useState<string | null>(null);
 const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});

 const [selectedKeyForDetails, setSelectedKeyForDetails] = useState<MasterApiKeyRow | null>(null);
 const [detailsLoading, setDetailsLoading] = useState(false);
 const [keyDetails, setKeyDetails] = useState<any | null>(null);
 const [detailsError, setDetailsError] = useState<string | null>(null);

  const detailsLimit = keyDetails
    ? (() => {
        const rawLimit = Number(keyDetails.windowTokensLimit ?? keyDetails.windowTokenLimit ?? keyDetails.window_tokens_limit ?? keyDetails.window_token_limit ?? 0);
        return rawLimit > 0 ? rawLimit : getPlanTokenLimit(keyDetails.planName ?? "");
      })()
    : 0;
  const detailsUsed = keyDetails
    ? (() => {
        const rawLimit = Number(keyDetails.windowTokensLimit ?? keyDetails.windowTokenLimit ?? keyDetails.window_tokens_limit ?? keyDetails.window_token_limit ?? 0);
        const rawUsed = Number(keyDetails.windowTokensUsed ?? keyDetails.windowTokenUsed ?? keyDetails.window_tokens_used ?? keyDetails.window_token_used ?? 0);
        const usagePercent = Number(keyDetails.usagePercent ?? keyDetails.usage_percent ?? 0);
        return rawLimit > 0 ? rawUsed : Math.round(detailsLimit * (usagePercent / 100));
      })()
    : 0;
  const detailsRemaining = Math.max(0, detailsLimit - detailsUsed);

 const handleViewDetails = useCallback(async (key: MasterApiKeyRow) => {
  setSelectedKeyForDetails(key);
  setDetailsLoading(true);
  setKeyDetails(null);
  setDetailsError(null);
  try {
   const res = await fetch(`/api/key-status?key=${encodeURIComponent(key.api_key)}`);
   if (res.ok) {
    const data = await res.json();
    if (data && data.status !== "error") {
     setKeyDetails(data);
    } else {
     setDetailsError(data.error || "Failed to fetch key details");
    }
   } else {
    setDetailsError(`HTTP error: ${res.status}`);
   }
  } catch (err: any) {
   setDetailsError(err.message || "Failed to fetch key details");
  } finally {
   setDetailsLoading(false);
  }
 }, []);

 const loading = fetcher.state !== "idle";

  useEffect(() => {
   if (fetcher.state === "idle" && fetcher.data) {
    const data = fetcher.data as any;
    if (data.error) {
     alert("Action failed: " + data.error);
     setTestingId(null);
    } else if (data.success) {
     if (data.intent === "create") {
      setShowAddForm(false);
      setForm({ provider: 'https://api.opusmax.live/v1', name: '', api_key: '', priority: 1, total_credits: 999999, status: 'active' });
      navigate("/auth/admin/gateway/logs");
     } else if (data.intent === "test-connection") {
      setTestingId(null);
      setTestResults((prev) => ({ ...prev, [data.keyId]: { ok: data.ok, message: data.message } }));
      navigate(".", { replace: true });
     }
    }
   }
  }, [fetcher.state, fetcher.data, navigate]);

 const refresh = useCallback(async () => {
  window.location.reload();
 }, []);

 const handleAdd = useCallback(() => {
  if (!form.name.trim() || !form.provider.trim() || !form.api_key.trim()) return;
  fetcher.submit({
   intent: "create",
   provider: form.provider.trim(),
   name: form.name.trim(),
   api_key: form.api_key.trim(),
   priority: String(form.priority),
   total_credits: String(form.total_credits),
   status: form.status,
  }, { method: "post" });
 }, [form, fetcher]);

 const handleToggleStatus = useCallback((key: MasterApiKeyRow) => {
  fetcher.submit({
   intent: "toggle-status",
   id: key.id,
   currentStatus: key.status,
  }, { method: "post" });
 }, [fetcher]);

 const handleDelete = useCallback((id: string) => {
  if (!confirm("Delete this master key? This cannot be undone.")) return;
  fetcher.submit({
   intent: "delete",
   id,
  }, { method: "post" });
 }, [fetcher]);

 const handleResetHealth = useCallback((id: string) => {
  fetcher.submit({
   intent: "reset-health",
   id,
  }, { method: "post" });
 }, [fetcher]);

 const handleTestConnection = useCallback((key: MasterApiKeyRow) => {
  setTestingId(key.id);
  setTestResults((prev) => ({ ...prev, [key.id]: { ok: false, message: 'Testing...' } }));
  fetcher.submit({
   intent: "test-connection",
   id: key.id,
  }, { method: "post" });
 }, [fetcher]);

 const activeKeys = keys.filter((k) => k.status === 'active');
 const totalRemaining = keys.reduce((s, k) => s + (k.remaining_credits ?? 0), 0);

 return (
 <div className="min-h-screen bg-background text-foreground">
 <AdminSidebar collapsed={false} onToggle={() => {}} adminEmail={adminEmail || undefined} />
 <main className="ml-[220px] min-h-screen">
 <div className="max-w-[1400px] space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-3xl font-bold text-foreground">Master API Keys</h1>
 <p className="text-muted-foreground text-sm mt-1">Manage upstream provider keys and their health</p>
 </div>
  <div className="flex items-center gap-2">
  <Button variant="outline" size="sm" onClick={() => navigate("/auth/admin/gateway/logs")} className="gap-1.5">
  <FiActivity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
  Live Monitor
  </Button>
  <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
  <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
  Refresh
  </Button>
  <Button size="sm" className="gap-1.5" onClick={() => setShowAddForm(true)}>
  <FiPlus className="w-3.5 h-3.5" />
  Add Key
  </Button>
  </div>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 {[
 { label: "Total Keys", value: keys.length.toString(), color: "text-foreground" },
 { label: "Active Keys", value: activeKeys.length.toString(), color: "text-emerald-500" },
 { label: "Failed/Disabled", value: (keys.length - activeKeys.length).toString(), color: "text-red-500" },
 { label: "Credits Remaining", value: `$${totalRemaining.toFixed(2)}`, color: "text-amber-500" },
 ].map((s) => (
 <div key={s.label} className="p-4 rounded-xl border border-border bg-card/60">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
 <p className={`text-2xl font-bold mt-0.5 tracking-tight ${s.color}`}>{s.value}</p>
 </div>
 ))}
 </div>

  {/* Status & Health Legend */}
  <div className="p-4 rounded-xl border border-border bg-card/40 text-xs">
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
     <h3 className="font-semibold text-foreground flex items-center gap-1.5 mb-1 text-sm">
      <FiHelpCircle className="w-4 h-4 text-primary" /> Key Status & Health Guide
     </h3>
     <p className="text-muted-foreground">Understanding administrative statuses and automated gateway health indicators.</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-[11px]">
     <div className="space-y-1">
      <span className="font-semibold text-foreground block">Administrative Status:</span>
      <div className="flex flex-wrap gap-2">
       <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold text-[10px]">Active</span>
       <span className="text-muted-foreground">Enabled for routing.</span>
       <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-semibold text-[10px]">Disabled</span>
       <span className="text-muted-foreground">Manually disabled.</span>
      </div>
     </div>
     <div className="space-y-1">
      <span className="font-semibold text-foreground block">Gateway Health Indicators:</span>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
       <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> healthy</span>
       <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> rate limited</span>
       <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> unhealthy</span>
       <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> quota exhausted</span>
      </div>
     </div>
    </div>
   </div>
  </div>

 {/* Master Keys Table */}
 <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-sm text-left">
  <thead>
  <tr className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border">
  <th className="px-4 py-3 font-semibold">Provider / Name</th>
  <th className="px-4 py-3 font-semibold">Priority</th>
  <th className="px-4 py-3 font-semibold">Status</th>
  <th className="px-4 py-3 font-semibold">Health</th>
  <th className="px-4 py-3 font-semibold">Plan</th>
  <th className="px-4 py-3 font-semibold text-right">Remaining Tokens</th>
  <th className="px-4 py-3 font-semibold text-right">Requests</th>
  <th className="px-4 py-3 font-semibold text-right">Usage Progress</th>
  <th className="px-4 py-3 font-semibold">Expires</th>
  <th className="px-4 py-3 font-semibold text-right">Actions</th>
  </tr>
  </thead>
 <tbody className="divide-y divide-border/40">
 {keys.length === 0 ? (
 <tr>
 <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
 <FiKey className="w-8 h-8 mx-auto mb-2 opacity-30" />
 <p className="text-sm font-medium">No master keys configured</p>
 <p className="text-xs">Add your first provider key to get started</p>
 </td>
 </tr>
 ) : keys.map((key) => {
 const keyStats = stats[key.id];
 const health = HEALTH_COLORS[key.health_status] ?? HEALTH_COLORS.disabled;
 const isActive = key.status === 'active';
 const testResult = testResults[key.id];
 const keyDetail = details[key.id];

  const planName = keyDetail?.planName || "N/A";
  const expiresAt = keyDetail?.expiresAt || null;

  const isTokenKey = !!keyDetail && keyDetail.unlimited !== undefined;
  
  const rawLimit = keyDetail
    ? Number(keyDetail.windowTokensLimit ?? keyDetail.windowTokenLimit ?? keyDetail.window_tokens_limit ?? keyDetail.window_token_limit ?? 0)
    : 0;
  const rawUsed = keyDetail
    ? Number(keyDetail.windowTokensUsed ?? keyDetail.windowTokenUsed ?? keyDetail.window_tokens_used ?? keyDetail.window_token_used ?? 0)
    : 0;
  const usagePercent = keyDetail ? Number(keyDetail.usagePercent ?? keyDetail.usage_percent ?? 0) : 0;

  const limit = isTokenKey 
    ? (rawLimit > 0 ? rawLimit : getPlanTokenLimit(planName)) 
    : (key.total_credits ?? 0);
  const used = isTokenKey 
    ? (rawLimit > 0 ? rawUsed : Math.round(limit * (usagePercent / 100)))
    : Math.max(0, limit - (key.remaining_credits ?? 0));
  const remaining = isTokenKey 
    ? Math.max(0, limit - used) 
    : (key.remaining_credits ?? 0);
  const usagePct = isTokenKey ? usagePercent : (limit > 0 ? (used / limit) * 100 : 0);

 return (
 <tr key={key.id} className="hover:bg-muted/10 transition-colors group">
 <td className="px-4 py-3">
 <div className="flex items-center gap-3">
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
 {key.provider.slice(0, 2)}
 </div>
 <div>
 <p className="font-medium text-foreground text-xs">{key.provider}</p>
 <p className="text-[11px] text-muted-foreground">{key.name}</p>
 {testResult && (
  <p className={cn("text-[10px] mt-0.5 font-semibold", testResult.ok ? "text-emerald-500 animate-pulse" : "text-red-500 animate-pulse")}>
   {testResult.message}
  </p>
 )}
 </div>
 </div>
 </td>
 <td className="px-4 py-3">
 <span className="font-mono text-xs text-muted-foreground">P{key.priority}</span>
 </td>
 <td className="px-4 py-3">
 <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold", isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500")}>
 {isActive ? <FiCheckCircle className="w-3 h-3" /> : <FiXCircle className="w-3 h-3" />}
 {isActive ? 'Active' : 'Disabled'}
 </span>
 </td>
 <td className="px-4 py-3">
 <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold", health.bg, health.text)}>
 <span className={cn("w-1.5 h-1.5 rounded-full", health.dot)} />
 {key.health_status.replace('_', ' ')}
 </span>
 </td>
 <td className="px-4 py-3">
 <span className="text-xs font-medium text-foreground">{planName}</span>
 </td>
 <td className="px-4 py-3 text-right">
  <div>
  <p className="text-xs font-bold text-foreground">
   {isTokenKey ? (remaining ?? 0).toLocaleString() : `$${(remaining ?? 0).toFixed(2)}`}
  </p>
  <p className="text-[10px] text-muted-foreground">
   of {isTokenKey ? (limit ?? 0).toLocaleString() : `$${(key.total_credits ?? 0).toFixed(2)}`}
  </p>
  </div>
 </td>
 <td className="px-4 py-3 text-right">
 <p className="text-xs font-mono">{key.total_requests.toLocaleString()}</p>
 <p className="text-[10px] text-muted-foreground">{key.failed_requests} failed</p>
 </td>
 <td className="px-4 py-3 text-right">
 <div className="flex items-center justify-end gap-2">
 <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
 <div 
  className={cn(
   "h-full rounded-full",
   usagePct < 70 ? "bg-emerald-500" : usagePct < 90 ? "bg-amber-500" : "bg-red-500"
  )} 
  style={{ width: `${Math.min(100, usagePct)}%` }} 
 />
 </div>
 <span className="text-xs font-mono text-muted-foreground">{Math.round(usagePct)}%</span>
 </div>
 </td>
 <td className="px-4 py-3">
 <span className="text-xs text-muted-foreground">
  {expiresAt
   ? new Date(expiresAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })
   : "Never"}
 </span>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
 <button
  onClick={() => handleViewDetails(key)}
  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
  title="View detailed status"
 >
  <FiEye className="w-3.5 h-3.5" />
 </button>
 <button
  onClick={() => handleTestConnection(key)}
  disabled={testingId === key.id}
  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
  title="Test connection"
 >
  {testingId === key.id ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiPlay className="w-3.5 h-3.5" />}
 </button>
 <button
  onClick={() => handleResetHealth(key.id)}
  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
  title="Reset health"
 >
  <FiActivity className="w-3.5 h-3.5" />
 </button>
 <button
  onClick={() => handleToggleStatus(key)}
  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
  title={isActive ? 'Disable' : 'Enable'}
 >
  {isActive ? <FiPause className="w-3.5 h-3.5" /> : <FiPlay className="w-3.5 h-3.5" />}
 </button>
 <button
  onClick={() => handleDelete(key.id)}
  className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
  title="Delete"
 >
  <FiTrash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* Add Key Sheet */}
 <Sheet open={showAddForm} onOpenChange={(open) => !open && setShowAddForm(false)}>
 <SheetContent side="right" className="w-full sm:max-w-[480px]">
 <SheetHeader>
 <SheetTitle className="flex items-center gap-2">
 <FiPlus className="w-4 h-4" />
 Add Master API Key
 </SheetTitle>
 <SheetDescription>
 Import a new upstream provider API key
 </SheetDescription>
 </SheetHeader>
  <div className="mt-6 space-y-5">
  <div>
  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
  Provider Name
  </label>
  <Input
  value={form.name}
  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
  placeholder="e.g., OpusLive Production"
  />
  </div>
  <div>
  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
  Provider URL (Base URL)
  </label>
  <Input
  value={form.provider}
  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
  placeholder="https://api.opusmax.live/v1"
  />
  </div>
  <div>
  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
  API Key
  </label>
  <Input
  type="password"
  value={form.api_key}
  onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
  placeholder="sk-..."
  className="font-mono text-xs"
  />
  </div>
  </div>
 <SheetFooter className="mt-6 pt-4 border-t border-border flex flex-col gap-2">
  <Button className="w-full" onClick={handleAdd} disabled={loading || !form.name || !form.provider || !form.api_key}>
 {loading ? <><FiLoader className="w-4 h-4 mr-1.5 animate-spin" /> Adding...</> : <><FiPlus className="w-4 h-4 mr-1.5" /> Add Key</>}
 </Button>
 <Button variant="outline" className="w-full" onClick={() => setShowAddForm(false)}>Cancel</Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>

  {/* Key Details Sheet */}
  <Sheet open={!!selectedKeyForDetails} onOpenChange={(open) => !open && setSelectedKeyForDetails(null)}>
  <SheetContent side="right" className="w-full sm:max-w-[480px]">
   <SheetHeader>
    <SheetTitle className="flex items-center gap-2">
     <FiKey className="w-4 h-4" />
     Key Details
    </SheetTitle>
    <SheetDescription>
     Real-time usage and limits from provider
    </SheetDescription>
   </SheetHeader>
   
   <div className="mt-6 space-y-6">
    {detailsLoading && (
     <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
      <FiLoader className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm font-medium">Fetching details from provider...</p>
     </div>
    )}

    {detailsError && (
     <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs">
      <p className="font-semibold mb-1">Failed to Load Details</p>
      <p className="opacity-90">{detailsError}</p>
     </div>
    )}

    {keyDetails && (
      <div className="space-y-6">
       <div className="p-4 rounded-xl border border-border bg-muted/10">
       <div className="flex flex-col gap-3">
        <div>
         <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Key Identifier
         </span>
         <div className="mt-1">
          <code className="text-xs font-mono font-bold text-primary dark:text-violet-400 bg-muted/50 dark:bg-muted/10 px-2 py-1 rounded">
           {selectedKeyForDetails?.api_key && selectedKeyForDetails.api_key.length > 25
            ? `${selectedKeyForDetails.api_key.slice(0, 12)}...${selectedKeyForDetails.api_key.slice(-4)}`
            : selectedKeyForDetails?.api_key}
          </code>
         </div>
        </div>
        <div className="flex items-center justify-between border-t border-border/50 pt-3">
         <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Status
         </span>
         <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
           keyDetails.isActive
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
         >
          <span className={`w-1.5 h-1.5 rounded-full ${keyDetails.isActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
          {keyDetails.isActive ? "Key Active" : "Key Inactive"}
         </span>
        </div>
       </div>

       <div className="grid grid-cols-1 gap-3 border-t border-border/50 pt-4 text-xs mt-3">
        <div>
         <span className="text-muted-foreground block font-semibold mb-0.5">Key Name</span>
         <span className="text-foreground">{keyDetails.name || "Unnamed Key"}</span>
        </div>
        <div>
         <span className="text-muted-foreground block font-semibold mb-0.5">Plan</span>
         <span className="text-foreground">{keyDetails.planName || "Default Plan"}</span>
        </div>
        <div>
         <span className="text-muted-foreground block font-semibold mb-0.5">Expires</span>
         <span className="text-foreground">
          {keyDetails.expiresAt
           ? `${new Date(keyDetails.expiresAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })}, ${new Date(keyDetails.expiresAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })} (${getDaysLeftText(keyDetails.expiresAt)})`
           : "Never"}
         </span>
        </div>
        <div>
         <span className="text-muted-foreground block font-semibold mb-0.5">Created</span>
         <span className="text-foreground">
          {keyDetails.createdAt
           ? `${new Date(keyDetails.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })}, ${new Date(keyDetails.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}`
           : "N/A"}
         </span>
        </div>
       </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-muted/10">
       <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
         Token Rolling Quota (5h Window)
        </span>
        <span className="text-xs font-bold text-foreground">
         {keyDetails.unlimited ? "Unlimited" : `${Math.round((detailsUsed / detailsLimit) * 100 || 0)}% used`}
        </span>
       </div>

       <div className="mb-2">
        <div className="w-full bg-muted rounded-full h-2 dark:bg-muted/20 overflow-hidden">
         <div
          className={`h-full rounded-full transition-all duration-500 ${
           (detailsUsed / detailsLimit || 0) < 0.7
            ? "bg-emerald-500"
            : (detailsUsed / detailsLimit || 0) < 0.9
            ? "bg-amber-500"
            : "bg-red-500"
          }`}
          style={{
           width: `${keyDetails.unlimited ? 0 : Math.min(100, (detailsUsed / detailsLimit) * 100 || 0)}%`,
          }}
         />
        </div>
       </div>

       <div className="flex flex-col gap-2 mt-3 text-xs">
        <div className="flex justify-between">
         <span className="text-muted-foreground">Usage:</span>
         <span className="font-semibold text-foreground">
          {keyDetails.unlimited
           ? "Unlimited tokens available"
           : `${(detailsUsed ?? 0).toLocaleString()} / ${(detailsLimit ?? 0).toLocaleString()} tokens`}
         </span>
        </div>
        <div className="flex justify-between">
         <span className="text-muted-foreground">Remaining:</span>
         <span className="font-semibold text-foreground">
          {keyDetails.unlimited
           ? "Unlimited tokens"
           : `${(detailsRemaining ?? 0).toLocaleString()} tokens remaining`}
         </span>
        </div>
        <div className="flex justify-between border-t border-border/50 pt-2 mt-1">
         <span className="text-muted-foreground">Resets:</span>
         <span className="font-semibold text-foreground">
          {keyDetails.windowResetAt
           ? `${new Date(keyDetails.windowResetAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })}, ${new Date(keyDetails.windowResetAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}`
           : "N/A"}
         </span>
        </div>
       </div>
      </div>
      </div>
    )}
    </div>

   <SheetFooter className="mt-6 pt-4 border-t border-border">
    <Button className="w-full" onClick={() => setSelectedKeyForDetails(null)}>Close</Button>
   </SheetFooter>
  </SheetContent>
  </Sheet>
 </div>
 </main>
 </div>
 );
}
