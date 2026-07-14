/**
 * Admin - User API Keys Management
 * Route: /auth/admin/gateway/user-keys
 */
import { useState, useCallback } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { verifyAdminSession } from "~/utils/admin-auth";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { cn } from "~/lib/utils";
import type { UserApiKeyRow } from "~/types/gateway";
import {
 FiKey,
 FiPlus,
 FiTrash2,
 FiToggleLeft,
 FiToggleRight,
 FiRefreshCw,
 FiCopy,
 FiClock,
 FiLoader,
 FiCheck,
 FiUser,
} from "react-icons/fi";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
 SheetFooter,
} from "~/components/ui/sheet";

export const meta: MetaFunction = () => [{ title: "User API Keys | Admin | OpusZen" }];

export async function loader({ request }: LoaderFunctionArgs) {
 const adminCheck = await verifyAdminSession(request);
 if (!adminCheck.isAdmin) throw redirect("/auth/admin");

 let keys: UserApiKeyRow[] = [];
 let users: { id: string; username: string; name: string }[] = [];
 let plans: { id: string; name: string }[] = [];

 try {
 keys = await (await import("~/utils/user-key-service")).getAllUserApiKeys();
 } catch { /* table may not exist yet */ }

 try {
 const { supabase } = await import("~/utils/supabase");
 const { data } = await supabase
 .from("users")
 .select("id, username, name")
 .order("username", { ascending: true });
 users = data ?? [];
 } catch { /* skip */ }

 try {
 const { supabase } = await import("~/utils/supabase");
 const { data } = await supabase
 .from("plans")
 .select("id, name, price")
 .order("price", { ascending: true });
 plans = data ?? [];
 } catch { /* skip */ }

 return { keys, users, plans, adminEmail: adminCheck.adminEmail };
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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
 active: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
 disabled: { bg: "bg-red-500/10", text: "text-red-600" },
 expired: { bg: "bg-amber-500/10", text: "text-amber-600" },
 revoked: { bg: "bg-zinc-500/10", text: "text-zinc-500" },
};

function formatDate(iso: string | null): string {
 if (!iso) return "Never";
 return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function safeErrorMessage(err: unknown): string {
 if (err instanceof Error) return err.message;
 return String(err);
}

async function copyToClipboard(text: string): Promise<boolean> {
 try {
 await navigator.clipboard.writeText(text);
 return true;
 } catch {
 // Fallback for non-HTTPS contexts
 try {
 const textarea = document.createElement('textarea');
 textarea.value = text;
 textarea.style.position = 'fixed';
 textarea.style.opacity = '0';
 document.body.appendChild(textarea);
 textarea.select();
 const success = document.execCommand('copy');
 document.body.removeChild(textarea);
 return success;
 } catch {
 return false;
 }
 }
}

export default function AdminUserKeysRoute() {
 const { keys, users = [], plans = [], adminEmail } = useLoaderData<typeof loader>();
 const [loading, setLoading] = useState(false);
 const [showAddForm, setShowAddForm] = useState(false);
 const [allowAllModels, setAllowAllModels] = useState(true);
 const [form, setForm] = useState({
 user_id: '',
 name: 'Default Key',
 allocated_credits: 1000000,
 expiry_days: 30,
 rate_limit: 60,
 allowed_models: '',
 });
 const [copiedId, setCopiedId] = useState<string | null>(null);

 const refresh = useCallback(async () => {
 setLoading(true);
 await new Promise(r => setTimeout(r, 500));
 setLoading(false);
 }, []);

 const handleCopy = useCallback(async (key: UserApiKeyRow) => {
 const ok = await copyToClipboard(key.api_key);
 if (ok) {
 setCopiedId(key.id);
 setTimeout(() => setCopiedId(null), 2000);
 }
 }, []);

 const handleToggle = useCallback(async (key: UserApiKeyRow) => {
 setLoading(true);
 try {
 if (key.status === 'active') {
 await (await import("~/utils/user-key-service")).disableUserApiKey(key.id);
 } else {
 await (await import("~/utils/user-key-service")).enableUserApiKey(key.id);
 }
 } catch (err: unknown) { alert(safeErrorMessage(err)); }
 setLoading(false);
 }, []);

 const handleRegenerate = useCallback(async (key: UserApiKeyRow) => {
 if (!confirm("Regenerate this key? The old key will stop working immediately.")) return;
 setLoading(true);
 try {
 await (await import("~/utils/user-key-service")).regenerateUserApiKey(key.id);
 } catch (err: unknown) { alert(safeErrorMessage(err)); }
 setLoading(false);
 }, []);

 const handleDelete = useCallback(async (key: UserApiKeyRow) => {
 if (!confirm(`Delete key "${key.name}"? This cannot be undone.`)) return;
 setLoading(true);
 try {
 await (await import("~/utils/user-key-service")).deleteUserApiKey(key.id);
 } catch (err: unknown) { alert(safeErrorMessage(err)); }
 setLoading(false);
 }, []);

 const handleResetUsage = useCallback(async (key: UserApiKeyRow) => {
 if (!confirm("Reset usage for this key?")) return;
 setLoading(true);
 try {
 await (await import("~/utils/user-key-service")).resetUserKeyUsage(key.id);
 } catch (err: unknown) { alert(safeErrorMessage(err)); }
 setLoading(false);
 }, []);

 const handleAdd = useCallback(async () => {
 if (!form.user_id.trim()) { alert("User account selection is required"); return; }
 setLoading(true);
 try {
 const expiryDate = new Date();
 const days = Math.max(1, form.expiry_days);
 expiryDate.setDate(expiryDate.getDate() + days);

 await (await import("~/utils/user-key-service")).createUserApiKey({
 user_id: form.user_id.trim(),
 name: form.name,
 allocated_credits: form.allocated_credits / 1000, // Translate tokens back to credits
 expiry_date: expiryDate.toISOString(),
 rate_limit: form.rate_limit,
 allowed_models: (!allowAllModels && form.allowed_models) ? form.allowed_models.split(',').map(s => s.trim()).filter(Boolean) : [],
 });

 setShowAddForm(false);
 setForm({ user_id: '', name: 'Default Key', allocated_credits: 1000000, expiry_days: 30, rate_limit: 60, allowed_models: '' });
 setAllowAllModels(true);
 } catch (err: unknown) { alert("Failed: " + safeErrorMessage(err)); }
 setLoading(false);
 }, [form, allowAllModels]);

 const activeKeys = keys.filter((k) => k.status === 'active');
 const totalCredits = keys.reduce((s, k) => s + k.allocated_credits, 0);
 const usedCredits = keys.reduce((s, k) => s + k.used_credits, 0);

 return (
 <div className="min-h-screen bg-background text-foreground">
 <AdminSidebar collapsed={false} onToggle={() => {}} adminEmail={adminEmail || undefined} />
 <main className="ml-[220px] min-h-screen">
 <div className="max-w-[1400px] space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-3xl font-bold text-foreground">User API Keys</h1>
 <p className="text-muted-foreground text-sm mt-1">Generate and manage API keys for users</p>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
 <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 <Button size="sm" className="gap-1.5" onClick={() => setShowAddForm(true)}>
 <FiPlus className="w-3.5 h-3.5" />
 Generate Key
 </Button>
 </div>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 {[
 { label: "Total Keys", value: keys.length.toString(), color: "text-foreground" },
 { label: "Active Keys", value: activeKeys.length.toString(), color: "text-emerald-500" },
 { label: "Total Allocated Tokens", value: (totalCredits * 1000).toLocaleString(), color: "text-indigo-500" },
 { label: "Total Used Tokens", value: (usedCredits * 1000).toLocaleString(), color: "text-amber-500" },
 ].map((s) => (
 <div key={s.label} className="p-4 rounded-xl border border-border bg-card/60">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
 <p className={`text-2xl font-bold mt-0.5 tracking-tight ${s.color}`}>{s.value}</p>
 </div>
 ))}
 </div>

 {/* Table */}
 <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-sm text-left">
 <thead>
 <tr className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border">
 <th className="px-4 py-3 font-semibold">Key</th>
 <th className="px-4 py-3 font-semibold">Name</th>
 <th className="px-4 py-3 font-semibold">Status</th>
 <th className="px-4 py-3 font-semibold text-right">Token Limit</th>
 <th className="px-4 py-3 font-semibold text-right">Remaining Tokens</th>
 <th className="px-4 py-3 font-semibold text-right">Requests</th>
 <th className="px-4 py-3 font-semibold">Expires</th>
 <th className="px-4 py-3 font-semibold">Last Used</th>
 <th className="px-4 py-3 font-semibold text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {keys.length === 0 ? (
 <tr>
 <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
 <FiKey className="w-8 h-8 mx-auto mb-2 opacity-30" />
 <p className="text-sm font-medium">No user keys generated yet</p>
 <p className="text-xs">Generate a key for a user to get started</p>
 </td>
 </tr>
 ) : keys.map((key) => {
 const status = STATUS_COLORS[key.status] ?? STATUS_COLORS.disabled;
 const usagePct = key.allocated_credits > 0 ? (key.used_credits / key.allocated_credits) * 100 : 0;
 const remaining = key.remaining_credits ?? 0;

 return (
 <tr key={key.id} className="hover:bg-muted/10 transition-colors group">
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
 {key.api_key.slice(0, 6)}...
 </code>
 <button onClick={() => handleCopy(key)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground cursor-pointer">
 {copiedId === key.id ? <FiCheck className="w-3.5 h-3.5 text-emerald-500" /> : <FiCopy className="w-3.5 h-3.5" />}
 </button>
 </div>
 </td>
 <td className="px-4 py-3">
 <div>
 <p className="font-medium text-foreground text-xs">{key.name}</p>
 <p className="text-[10px] text-muted-foreground">{key.user_id.slice(0, 8)}...</p>
 </div>
 </td>
 <td className="px-4 py-3">
 <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", status.bg, status.text)}>
 {key.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
 {key.status}
 </span>
 </td>
 <td className="px-4 py-3 text-right">
 <p className="text-xs font-mono">{(key.allocated_credits * 1000).toLocaleString()}</p>
 </td>
 <td className="px-4 py-3 text-right">
 <div>
 <p className={cn("text-xs font-bold", remaining <= 0 ? "text-red-500" : "text-foreground")}>
 {(remaining * 1000).toLocaleString()}
 </p>
 <div className="w-16 h-1 bg-muted rounded-full overflow-hidden mt-1">
 <div className={cn("h-full rounded-full", usagePct < 70 ? "bg-emerald-500" : usagePct < 90 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min(100, usagePct)}%` }} />
 </div>
 </div>
 </td>
 <td className="px-4 py-3 text-right">
 <p className="text-xs font-mono">{key.total_requests.toLocaleString()}</p>
 </td>
 <td className="px-4 py-3">
 <span className="text-xs text-muted-foreground">
 {key.expiry_date ? formatDate(key.expiry_date) : "Never"}
 </span>
 </td>
 <td className="px-4 py-3">
 <span className="text-xs text-muted-foreground">{formatDate(key.last_used)}</span>
 </td>
 <td className="px-4 py-3">
 <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => handleToggle(key)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer" title={key.status === 'active' ? 'Disable' : 'Enable'}>
 {key.status === 'active' ? <FiToggleLeft className="w-4 h-4" /> : <FiToggleRight className="w-4 h-4" />}
 </button>
 <button onClick={() => handleRegenerate(key)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer" title="Regenerate">
 <FiRefreshCw className="w-3.5 h-3.5" />
 </button>
 <button onClick={() => handleResetUsage(key)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer" title="Reset usage">
 <FiClock className="w-3.5 h-3.5" />
 </button>
 <button onClick={() => handleDelete(key)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 cursor-pointer" title="Delete">
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
 <FiKey className="w-4 h-4" />
 Generate User API Key
 </SheetTitle>
 <SheetDescription>
 Create a new API key linked to a user account
 </SheetDescription>
 </SheetHeader>
 <div className="mt-6 space-y-5">
 <div>
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 User Account
 </label>
 <select
 value={form.user_id}
 onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
 className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
 >
 <option value="">-- Select Live User --</option>
 {users.map((u) => (
 <option key={u.id} value={u.id}>
 {u.username} {u.name ? `(${u.name})` : ""}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Link to Plan (Optional)
 </label>
 <select
 onChange={(e) => {
 const planId = e.target.value;
 if (!planId) return;
 const selectedPlan = plans.find(p => p.id === planId);
 if (selectedPlan) {
 const limit = getPlanTokenLimit(selectedPlan.name);
 setForm(f => ({
 ...f,
 name: `${selectedPlan.name} Key`,
 allocated_credits: limit,
 }));
 }
 }}
 className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 >
 <option value="">-- Custom (No Plan) --</option>
 {plans.map((p) => (
 <option key={p.id} value={p.id}>
 {p.name}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Key Name
 </label>
 <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g., Production Key" />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Token Limit (Tokens)
 </label>
 <Input type="number" min="1" value={form.allocated_credits} onChange={(e) => setForm((f) => ({ ...f, allocated_credits: Math.max(1, parseInt(e.target.value) || 0) }))} />
 </div>
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Rate Limit (req/min)
 </label>
 <Input type="number" min="1" value={form.rate_limit} onChange={(e) => setForm((f) => ({ ...f, rate_limit: Math.max(1, parseInt(e.target.value) || 60) }))} />
 </div>
 </div>
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Expiry (days from now)
 </label>
 <Input type="number" min="1" value={form.expiry_days} onChange={(e) => setForm((f) => ({ ...f, expiry_days: Math.max(1, parseInt(e.target.value) || 30) }))} />
 </div>
 <div>
 <div className="flex items-center justify-between mb-1.5">
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
 Allowed Models
 </label>
 <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
 <input
 type="checkbox"
 checked={allowAllModels}
 onChange={(e) => {
 setAllowAllModels(e.target.checked);
 if (e.target.checked) {
 setForm(f => ({ ...f, allowed_models: '' }));
 }
 }}
 className="rounded text-primary border-input focus:ring-primary"
 />
 Allow all models
 </label>
 </div>
 <Input
 value={form.allowed_models}
 onChange={(e) => {
 setForm((f) => ({ ...f, allowed_models: e.target.value }));
 if (e.target.value) {
 setAllowAllModels(false);
 }
 }}
 disabled={allowAllModels}
 placeholder={allowAllModels ? "All models can use this key" : "claude-3-5-sonnet, gpt-4o, ..."}
 />
 </div></div>
 </div>
 <SheetFooter className="mt-6 pt-4 border-t border-border flex flex-col gap-2">
 <Button className="w-full" onClick={handleAdd} disabled={loading || !form.user_id}>
 {loading ? <><FiLoader className="w-4 h-4 mr-1.5 animate-spin" /> Generating...</> : <><FiKey className="w-4 h-4 mr-1.5" /> Generate Key</>}
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
