/**
 * Admin - Master API Keys Management
 * Route: /auth/admin/gateway/keys
 */
import { useState, useCallback } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData } from "react-router";
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

 try {
 keys = await (await import("~/utils/master-key-service")).getAllMasterKeys();

 for (const key of keys) {
 try {
 const s = await (await import("~/utils/master-key-service")).getMasterKeyStats(key.id);
 stats[key.id] = s;
 } catch { /* skip */ }
 }
 } catch (err) {
 // Table may not exist yet
 }

 return { keys, stats, adminEmail: adminCheck.adminEmail };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const PROVIDERS = ['OpenAI', 'Anthropic', 'Google', 'Groq', 'Mistral', 'Cohere', 'AI21'];

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

export default function AdminMasterKeysRoute() {
 const { keys, stats, adminEmail } = useLoaderData<typeof loader>();
 const [loading, setLoading] = useState(false);
 const [showAddForm, setShowAddForm] = useState(false);
 const [editingKey, setEditingKey] = useState<MasterApiKeyRow | null>(null);
 const [form, setForm] = useState({
 provider: 'OpenAI',
 name: '',
 api_key: '',
 priority: 100,
 total_credits: 0,
 status: 'active' as MasterApiKeyRow['status'],
 });
 const [testingId, setTestingId] = useState<string | null>(null);
 const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});

 const refresh = useCallback(async () => {
 setLoading(true);
 await new Promise(r => setTimeout(r, 500));
 window.location.reload();
 }, []);

 const handleAdd = useCallback(async () => {
 if (!form.name.trim() || !form.api_key.trim()) return;
 setLoading(true);
 try {
 await (await import("~/utils/master-key-service")).createMasterKey({
 provider: form.provider,
 name: form.name.trim(),
 api_key: form.api_key.trim(),
 priority: form.priority,
 total_credits: form.total_credits,
 status: form.status,
 });
 setShowAddForm(false);
 setForm({ provider: 'OpenAI', name: '', api_key: '', priority: 100, total_credits: 0, status: 'active' });
 window.location.reload();
 } catch (err: any) {
 alert("Failed to add key: " + err.message);
 }
 setLoading(false);
 }, [form]);

 const handleToggleStatus = useCallback(async (key: MasterApiKeyRow) => {
 setLoading(true);
 try {
 const newStatus = key.status === 'active' ? 'disabled' : 'active';
 await (await import("~/utils/master-key-service")).updateMasterKey(key.id, { status: newStatus });
 window.location.reload();
 } catch (err: any) {
 alert("Failed: " + err.message);
 }
 setLoading(false);
 }, []);

 const handleDelete = useCallback(async (id: string) => {
 if (!confirm("Delete this master key? This cannot be undone.")) return;
 setLoading(true);
 try {
 await (await import("~/utils/master-key-service")).deleteMasterKey(id);
 window.location.reload();
 } catch (err: any) {
 alert("Failed: " + err.message);
 }
 setLoading(false);
 }, []);

 const handleResetHealth = useCallback(async (id: string) => {
 setLoading(true);
 try {
 await (await import("~/utils/master-key-service")).resetMasterKeyHealth(id);
 window.location.reload();
 } catch (err: any) {
 alert("Failed: " + err.message);
 }
 setLoading(false);
 }, []);

 const handleTestConnection = useCallback(async (key: MasterApiKeyRow) => {
 setTestingId(key.id);
 setTestResults((prev) => ({ ...prev, [key.id]: { ok: false, message: 'Testing...' } }));
 try {
 const config = key.provider === 'Anthropic'
 ? { baseUrl: 'https://api.anthropic.com/v1', authHeader: 'x-api-key' }
 : { baseUrl: 'https://api.openai.com/v1', authHeader: 'Authorization' };

 const headers: Record<string, string> = { 'Content-Type': 'application/json' };
 if (key.provider === 'Anthropic') {
 headers['x-api-key'] = key.api_key;
 headers['anthropic-version'] = '2023-06-01';
 } else {
 headers['Authorization'] = `Bearer ${key.api_key}`;
 }

 const endpoint = key.provider === 'Anthropic' ? '/messages' : '/chat/completions';
 const res = await fetch(`${config.baseUrl}${endpoint}`, {
 method: 'POST',
 headers,
 body: JSON.stringify(
  key.provider === 'Anthropic'
   ? { model: 'claude-3-5-haiku-20241022', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }
   : { model: 'gpt-4o-mini', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }
 ),
 });

 if (res.ok) {
 setTestResults((prev) => ({ ...prev, [key.id]: { ok: true, message: `Connection successful (${res.status})` } }));
 } else {
 const err = await res.json().catch(() => ({}));
 setTestResults((prev) => ({ ...prev, [key.id]: { ok: false, message: err?.error?.message ?? `HTTP ${res.status}` } }));
 }
 } catch (err: any) {
 setTestResults((prev) => ({ ...prev, [key.id]: { ok: false, message: err.message ?? 'Connection failed' } }));
 }
 setTestingId(null);
 }, []);

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
 <th className="px-4 py-3 font-semibold text-right">Credits</th>
 <th className="px-4 py-3 font-semibold text-right">Requests</th>
 <th className="px-4 py-3 font-semibold text-right">Success</th>
 <th className="px-4 py-3 font-semibold">Last Used</th>
 <th className="px-4 py-3 font-semibold text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {keys.length === 0 ? (
 <tr>
 <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
 <FiKey className="w-8 h-8 mx-auto mb-2 opacity-30" />
 <p className="text-sm font-medium">No master keys configured</p>
 <p className="text-xs">Add your first provider key to get started</p>
 </td>
 </tr>
 ) : keys.map((key) => {
 const keyStats = stats[key.id];
 const health = HEALTH_COLORS[key.health_status] ?? HEALTH_COLORS.disabled;
 const isActive = key.status === 'active';
 const successRate = keyStats ? keyStats.successRate : 0;
 const testResult = testResults[key.id];

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
 <td className="px-4 py-3 text-right">
 <div>
 <p className="text-xs font-bold text-foreground">${(key.remaining_credits ?? 0).toFixed(2)}</p>
 <p className="text-[10px] text-muted-foreground">of ${key.total_credits.toFixed(2)}</p>
 </div>
 </td>
 <td className="px-4 py-3 text-right">
 <p className="text-xs font-mono">{key.total_requests.toLocaleString()}</p>
 <p className="text-[10px] text-muted-foreground">{key.failed_requests} failed</p>
 </td>
 <td className="px-4 py-3 text-right">
 <div className="flex items-center justify-end gap-2">
 <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
 <div className="h-full rounded-full bg-emerald-500" style={{ width: `${successRate}%` }} />
 </div>
 <span className="text-xs font-mono text-muted-foreground">{successRate}%</span>
 </div>
 </td>
 <td className="px-4 py-3">
 <span className="text-xs text-muted-foreground">{formatDate(key.last_used)}</span>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
 Provider
 </label>
 <ProviderSelect
 value={form.provider}
 onChange={(v) => setForm((f) => ({ ...f, provider: v }))}
 providers={PROVIDERS}
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Key Name
 </label>
 <Input
 value={form.name}
 onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
 placeholder="e.g., OpenAI Production"
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
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Priority (lower = first)
 </label>
 <Input
 type="number"
 value={form.priority}
 onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 100 }))}
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Total Credits ($)
 </label>
 <Input
 type="number"
 step="0.01"
 value={form.total_credits}
 onChange={(e) => setForm((f) => ({ ...f, total_credits: parseFloat(e.target.value) || 0 }))}
 />
 </div>
 </div>
 </div>
 <SheetFooter className="mt-6 pt-4 border-t border-border flex flex-col gap-2">
 <Button className="w-full" onClick={handleAdd} disabled={loading || !form.name || !form.api_key}>
 {loading ? <><FiLoader className="w-4 h-4 mr-1.5 animate-spin" /> Adding...</> : <><FiPlus className="w-4 h-4 mr-1.5" /> Add Key</>}
 </Button>
 <Button variant="outline" className="w-full" onClick={() => setShowAddForm(false)}>Cancel</Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 </div>
 </main>
 </div>
 );
}
