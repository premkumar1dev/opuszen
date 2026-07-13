/**
 * Admin - Gateway Configuration Settings
 * Route: /auth/admin/gateway/settings
 */
import { useState, useCallback, useEffect } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { verifyAdminSession } from "~/utils/admin-auth";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { cn } from "~/lib/utils";
import {
 FiSave,
 FiRotateCcw,
 FiLoader,
 FiCheck,
 FiZap,
 FiRefreshCw,
 FiClock,
 FiToggleLeft,
 FiToggleRight,
 FiServer,
 FiShield,
} from "react-icons/fi";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export const meta: MetaFunction = () => [{ title: "Gateway Settings | Admin | OpusZen" }];

interface GatewaySetting {
 key: string;
 value: string;
 value_type: string;
 description: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
 const adminCheck = await verifyAdminSession(request);
 if (!adminCheck.isAdmin) throw redirect("/auth/admin");

 let settings: GatewaySetting[] = [];
 try {
 const result = await (await import("~/utils/gateway-config")).loadGatewayConfig();
 for (const [key, value] of Object.entries(result)) {
 const def = (await import("~/utils/gateway-config")).getDefaultConfig(key);
 settings.push({
 key,
 value: String(value),
 value_type: def ? (typeof def === 'number' ? 'number' : typeof def === 'boolean' ? 'boolean' : 'string') : 'string',
 description: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
 });
 }
 } catch { /* table may not exist */ }

 return { settings, adminEmail: adminCheck.adminEmail };
}

export default function AdminGatewaySettingsRoute() {
 const { settings: initialSettings, adminEmail } = useLoaderData<typeof loader>();
 const [settings, setSettings] = useState<Record<string, GatewaySetting>>(() => {
 const map: Record<string, GatewaySetting> = {};
 for (const s of initialSettings) map[s.key] = s;
 return map;
 });
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);

 const handleSave = useCallback(async () => {
 setSaving(true);
 try {
 for (const [key, setting] of Object.entries(settings)) {
 const { updateGatewayConfig } = await import("~/utils/gateway-config");
 await updateGatewayConfig(key, setting.value, setting.value_type as any);
 }
 setSaved(true);
 setTimeout(() => setSaved(false), 3000);
 } catch (err: any) {
 alert("Failed to save: " + err.message);
 }
 setSaving(false);
 }, [settings]);

 const handleReset = useCallback(async (key: string) => {
 const def = (await import("~/utils/gateway-config")).getDefaultConfig(key);
 if (def !== undefined) {
 setSettings((prev) => ({
 ...prev,
 [key]: { ...prev[key], value: typeof def === 'boolean' ? String(def) : String(def) },
 }));
 }
 }, []);

 const handleChange = useCallback((key: string, value: string) => {
 setSettings((prev) => ({
 ...prev,
 [key]: { ...prev[key], value },
 }));
 }, []);

 const toggleKeys = [
 'failover_enabled',
 'auto_disable_failed_keys',
 'auto_recover_keys',
 ];

 const getIcon = (key: string) => {
 if (key.includes('timeout') || key.includes('delay')) return FiClock;
 if (key.includes('retry')) return FiRefreshCw;
 if (key.includes('failover')) return FiZap;
 if (key.includes('rate')) return FiServer;
 if (key.includes('disable') || key.includes('recover')) return FiShield;
 if (key.includes('key')) return FiZap;
 return FiServer;
 };

 return (
 <div className="min-h-screen bg-background text-foreground">
 <AdminSidebar collapsed={false} onToggle={() => {}} adminEmail={adminEmail || undefined} />
 <main className="ml-[220px] min-h-screen">
 <div className="max-w-[900px] space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-3xl font-bold text-foreground">Gateway Settings</h1>
 <p className="text-muted-foreground text-sm mt-1">Configure retry, failover, and timeout behavior</p>
 </div>
 <div className="flex items-center gap-2">
 {saved && (
 <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-medium">
 <FiCheck className="w-3.5 h-3.5" />
 Saved
 </div>
 )}
 <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-1.5">
 <FiRotateCcw className="w-3.5 h-3.5" />
 Reset
 </Button>
 <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
 {saving ? <><FiLoader className="w-3.5 h-3.5 animate-spin" /> Saving...</> : <><FiSave className="w-3.5 h-3.5" /> Save Changes</>}
 </Button>
 </div>
 </div>

 {/* Failover Section */}
 <div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
 <FiZap className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-bold text-foreground">Failover & Retry</h3>
 <p className="text-xs text-muted-foreground">Control how the gateway handles failures</p>
 </div>
 </div>

 <div className="space-y-4">
 {[
 { key: 'failover_enabled', label: 'Enable Automatic Failover', description: 'Automatically switch to the next available master key on failure', type: 'boolean' as const },
 { key: 'retry_count', label: 'Retry Count', description: 'Maximum number of retry attempts per request', type: 'number' as const },
 { key: 'retry_delay_ms', label: 'Retry Delay', description: 'Delay between retries in milliseconds', type: 'number' as const },
 { key: 'auto_disable_failed_keys', label: 'Auto-Disable Failed Keys', description: 'Automatically disable keys after repeated failures', type: 'boolean' as const },
 { key: 'max_consecutive_failures', label: 'Max Consecutive Failures', description: 'Number of failures before a key is auto-disabled', type: 'number' as const },
 { key: 'auto_recover_keys', label: 'Auto-Recover Keys', description: 'Automatically re-enable keys after cooldown period', type: 'boolean' as const },
 { key: 'auto_recover_after_minutes', label: 'Recovery Cooldown', description: 'Minutes before attempting to recover a failed key', type: 'number' as const },
 ].map((setting) => {
 const s = settings[setting.key];
 if (!s) return null;
 const isBoolean = setting.type === 'boolean';

 return (
 <div key={setting.key} className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-muted/30 transition-colors">
 <div className="flex-1 min-w-0 mr-4">
 <p className="text-sm font-medium text-foreground">{setting.label}</p>
 <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
 </div>
 {isBoolean ? (
 <button
 onClick={() => handleChange(setting.key, s.value === 'true' ? 'false' : 'true')}
 className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer", s.value === 'true' ? "bg-primary" : "bg-muted")}
 >
 <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform", s.value === 'true' ? "translate-x-[18px]" : "translate-x-1")} />
 </button>
 ) : (
 <div className="flex items-center gap-2">
 <Input
 type="number"
 value={s.value}
 onChange={(e) => handleChange(setting.key, e.target.value)}
 className="w-24 h-8 text-xs text-right"
 />
 <button onClick={() => handleReset(setting.key)} className="text-muted-foreground hover:text-foreground cursor-pointer p-1" title="Reset to default">
 <FiRotateCcw className="w-3 h-3" />
 </button>
 </div>
 )}
 </div>
 );
 })
 })
 </div>
 </div>

 {/* Timeout & Limits Section */}
 <div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
 <FiClock className="w-5 h-5" />
 </div>
 <div>
 <h3 className="text-base font-bold text-foreground">Timeout & Rate Limits</h3>
 <p className="text-xs text-muted-foreground">Request timeouts and rate limiting</p>
 </div>
 </div>

 <div className="space-y-4">
 {[
 { key: 'request_timeout_ms', label: 'Request Timeout', description: 'Maximum time to wait for a provider response (ms)', type: 'number' as const },
 { key: 'health_check_interval_seconds', label: 'Health Check Interval', description: 'How often to check key health (seconds)', type: 'number' as const },
 { key: 'rate_limit_window_minutes', label: 'Rate Limit Window', description: 'Rate limiting time window (minutes)', type: 'number' as const },
 { key: 'default_rate_limit', label: 'Default Rate Limit', description: 'Default requests per minute', type: 'number' as const },
 ].map((setting) => {
 const s = settings[setting.key];
 if (!s) return null;

 return (
 <div key={setting.key} className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-muted/30 transition-colors">
 <div className="flex-1 min-w-0 mr-4">
 <p className="text-sm font-medium text-foreground">{setting.label}</p>
 <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
 </div>
 <div className="flex items-center gap-2">
 <Input
 type="number"
 value={s.value}
 onChange={(e) => handleChange(setting.key, e.target.value)}
 className="w-24 h-8 text-xs text-right"
 />
 <button onClick={() => handleReset(setting.key)} className="text-muted-foreground hover:text-foreground cursor-pointer p-1" title="Reset to default">
 <FiRotateCcw className="w-3 h-3" />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </main>
 </div>
 );
}
