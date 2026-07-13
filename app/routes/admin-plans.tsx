import { useState, useCallback } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { verifyAdminSession } from "../../utils/admin-auth";
import { supabase } from "../../utils/supabase";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { cn } from "@/lib/utils";
import {
 FiPlus,
 FiEdit2,
 FiTrash2,
 FiSearch,
 FiRefreshCw,
 FiCheck,
 FiChevronLeft,
 FiChevronRight,
 FiToggleLeft,
 FiToggleRight,
 FiZap,
 FiLoader,
 FiCreditCard,
 FiStar,
 FiShield,
 FiAward,
 FiTrendingUp,
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
import { motion, AnimatePresence } from "framer-motion";

export const meta: MetaFunction = () => {
 return [{ title: "Manage Plans | Admin | OpusZen" }];
};

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

interface Plan {
 id: string;
 name: string;
 description: string | null;
 duration_days: number;
 price: number;
 currency: string;
 features: string[];
 multiplier: number;
 is_active: boolean;
 sort_order: number;
 created_at: string;
 updated_at: string;
}

interface PlanForm {
 name: string;
 description: string;
 duration_days: string;
 price: string;
 currency: string;
 features: string;
 multiplier: string;
 sort_order: string;
 is_active: boolean;
}

/* ------------------------------------------------------------------ */
/* Loader */
/* ------------------------------------------------------------------ */

export async function loader({ request }: LoaderFunctionArgs) {
 const adminCheck = await verifyAdminSession(request);
 if (!adminCheck.isAdmin) {
 return redirect("/auth/admin");
 }

 const { data: plans, error } = await (supabase.from("plans") as any)
 .select("*")
 .order("sort_order", { ascending: true });

 return {
 plans: (plans ?? []) as Plan[],
 error: error ? error.message : null,
 adminEmail: adminCheck.adminEmail,
 };
}

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number, currency = "INR"): string {
 return new Intl.NumberFormat("en-IN", {
 style: "currency",
 currency,
 minimumFractionDigits: 0,
 }).format(amount);
}

function getDurationLabel(days: number): string {
 if (days === 1) return "1 Day";
 if (days < 7) return `${days} Days`;
 if (days === 7) return "1 Week";
 if (days < 30) return `${days} Days`;
 if (days === 30) return "1 Month";
 if (days < 365) return `${days} Days`;
 if (days === 365) return "1 Year";
 const years = Math.floor(days / 365);
 const rem = days % 365;
 if (rem === 0) return `${years} Year${years > 1 ? "s" : ""}`;
 return `${years}Y ${rem}D`;
}

function getPlanIcon(index: number) {
 const icons = [
 <FiStar className="w-5 h-5" />,
 <FiZap className="w-5 h-5" />,
 <FiShield className="w-5 h-5" />,
 <FiAward className="w-5 h-5" />,
 <FiTrendingUp className="w-5 h-5" />,
 ];
 return icons[index % icons.length];
}

const PLAN_COLORS = [
 "from-indigo-500 to-indigo-600",
 "from-violet-500 to-violet-600",
 "from-fuchsia-500 to-fuchsia-600",
 "from-pink-500 to-pink-600",
 "from-cyan-500 to-cyan-600",
 "from-emerald-500 to-emerald-600",
 "from-amber-500 to-amber-600",
 "from-orange-500 to-orange-600",
];

const PRESET_DURATIONS = [
 { label: "3 Days", value: 3 },
 { label: "7 Days", value: 7 },
 { label: "15 Days", value: 15 },
 { label: "30 Days", value: 30 },
 { label: "90 Days", value: 90 },
 { label: "180 Days", value: 180 },
 { label: "365 Days", value: 365 },
 { label: "Lifetime", value: 36500 },
];

/* ------------------------------------------------------------------ */
/* Plan Form Sheet */
/* ------------------------------------------------------------------ */

interface PlanSheetProps {
 isOpen: boolean;
 plan: Plan | null;
 mode: "create" | "edit";
 onClose: () => void;
 onSave: (plan: Partial<Plan>) => void;
 saving: boolean;
}

function PlanSheet({ isOpen, plan, mode, onClose, onSave, saving }: PlanSheetProps) {
 const empty: PlanForm = {
 name: "",
 description: "",
 duration_days: "30",
 price: "0",
 currency: "INR",
 features: "",
 multiplier: "1",
 sort_order: "0",
 is_active: true,
 };

 const [form, setForm] = useState<PlanForm>(
 plan
 ? {
 name: plan.name,
 description: plan.description ?? "",
 duration_days: String(plan.duration_days),
 price: String(plan.price),
 currency: plan.currency,
 features: plan.features?.join("\n") ?? "",
 multiplier: String(plan.multiplier),
 sort_order: String(plan.sort_order),
 is_active: plan.is_active,
 }
 : empty
 );

 const [errors, setErrors] = useState<Partial<Record<keyof PlanForm, string>>>({});

 const validate = (): boolean => {
 const errs: Partial<Record<keyof PlanForm, string>> = {};
 if (!form.name.trim()) errs.name = "Plan name is required";
 const price = parseFloat(form.price);
 if (isNaN(price) || price < 0) errs.price = "Enter a valid price";
 const days = parseInt(form.duration_days);
 if (isNaN(days) || days < 0) errs.duration_days = "Enter a valid duration in days";
 const mult = parseFloat(form.multiplier);
 if (isNaN(mult) || mult <= 0) errs.multiplier = "Multiplier must be positive";
 const sort = parseInt(form.sort_order);
 if (isNaN(sort) || sort < 0) errs.sort_order = "Sort order must be 0 or greater";
 setErrors(errs);
 return Object.keys(errs).length === 0;
 };

 const handleSave = () => {
 if (!validate()) return;
 onSave({
 name: form.name.trim(),
 description: form.description.trim() || null,
 duration_days: parseInt(form.duration_days),
 price: parseFloat(form.price),
 currency: form.currency,
 features: form.features
 .split("\n")
 .map((f) => f.trim())
 .filter(Boolean),
 multiplier: parseFloat(form.multiplier),
 sort_order: parseInt(form.sort_order) || 0,
 is_active: form.is_active,
 });
 onClose();
 };

 const field = (key: keyof PlanForm) => ({
 value: form[key] as string,
 onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
 setForm((f) => ({ ...f, [key]: e.target.value })),
 });

 return (
 <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <SheetContent side="right" className="w-full sm:max-w-[520px] overflow-y-auto">
 <SheetHeader>
 <SheetTitle className="flex items-center gap-2">
 {mode === "create" ? <FiPlus className="w-4 h-4" /> : <FiEdit2 className="w-4 h-4" />}
 {mode === "create" ? "Create New Plan" : `Edit — ${plan?.name}`}
 </SheetTitle>
 <SheetDescription>
 {mode === "create"
 ? "Add a new subscription plan for your customers."
 : "Update plan details, pricing, and features."}
 </SheetDescription>
 </SheetHeader>

 <motion.div
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.15 }}
 className="mt-6 space-y-5"
 >
 {/* Plan Name */}
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Plan Name <span className="text-red-500">*</span>
 </label>
 <Input
 placeholder="e.g. Starter, Pro, Enterprise"
 {...field("name")}
 className={errors.name ? "border-red-500/50" : ""}
 />
 {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
 </div>

 {/* Description */}
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Description
 </label>
 <textarea
 placeholder="Short tagline for this plan..."
 rows={2}
 {...(field("description") as any)}
 className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all placeholder:text-muted-foreground/50"
 />
 </div>

 {/* Price & Currency */}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Price <span className="text-red-500">*</span>
 </label>
 <Input
 type="number"
 step="0.01"
 min="0"
 placeholder="0.00"
 {...field("price")}
 className={errors.price ? "border-red-500/50" : ""}
 />
 {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
 </div>
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Currency
 </label>
 <select
 {...(field("currency") as any)}
 className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer transition-all"
 >
 <option value="INR">INR (₹)</option>
 <option value="USD">USD ($)</option>
 <option value="EUR">EUR (€)</option>
 </select>
 </div>
 </div>

 {/* Duration (Days) */}
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Duration (Days) <span className="text-red-500">*</span>
 </label>
 <Input
 type="number"
 min="1"
 placeholder="30"
 {...field("duration_days")}
 className={errors.duration_days ? "border-red-500/50" : ""}
 />
 {errors.duration_days && <p className="text-xs text-red-500 mt-1">{errors.duration_days}</p>}
 {/* Quick presets */}
 <div className="flex flex-wrap gap-1.5 mt-2">
 {PRESET_DURATIONS.map((preset) => (
 <button
 key={preset.value}
 type="button"
 onClick={() => setForm((f) => ({ ...f, duration_days: String(preset.value) }))}
 className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
 form.duration_days === String(preset.value)
 ? "bg-primary/10 border-primary/30 text-primary"
 : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
 }`}
 >
 {preset.label}
 </button>
 ))}
 </div>
 </div>

 {/* Multiplier & Sort Order */}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 API Multiplier
 </label>
 <Input
 type="number"
 step="0.1"
 min="0"
 placeholder="1.0"
 {...field("multiplier")}
 className={errors.multiplier ? "border-red-500/50" : ""}
 />
 <p className="text-[10px] text-muted-foreground mt-1">
 e.g. 1x, 5x, 10x, 20x
 </p>
 {errors.multiplier && <p className="text-xs text-red-500 mt-1">{errors.multiplier}</p>}
 </div>
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Sort Order
 </label>
 <Input
 type="number"
 min="0"
 placeholder="0"
 {...field("sort_order")}
 className={errors.sort_order ? "border-red-500/50" : ""}
 />
 <p className="text-[10px] text-muted-foreground mt-1">
 Lower = appears first
 </p>
 {errors.sort_order && <p className="text-xs text-red-500 mt-1">{errors.sort_order}</p>}
 </div>
 </div>

 {/* Features */}
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Features <span className="font-normal">(one per line)</span>
 </label>
 <textarea
 placeholder={"50,000 requests/month&#10;Email support&#10;Basic analytics"}
 rows={5}
 {...(field("features") as any)}
 className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all placeholder:text-muted-foreground/50 font-mono"
 />
 <p className="text-[10px] text-muted-foreground mt-1">
 Enter each feature on a new line
 </p>
 </div>

 {/* Active Toggle */}
 <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
 <div>
 <p className="text-sm font-medium text-foreground">Plan Active</p>
 <p className="text-xs text-muted-foreground">
 Inactive plans are hidden from customers
 </p>
 </div>
 <button
 onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${
 form.is_active ? "bg-primary" : "bg-muted"
 }`}
 role="switch"
 aria-checked={form.is_active}
 >
 <span
 className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
 form.is_active ? "translate-x-[22px]" : "translate-x-1"
 }`}
 />
 </button>
 </div>
 </motion.div>

 <SheetFooter className="mt-6 pt-4 border-t border-border flex flex-col gap-2">
 <div className="flex gap-2">
 <Button
 variant="default"
 className="flex-1"
 onClick={handleSave}
 disabled={saving}
 >
 {saving ? (
 <>
 <FiLoader className="w-4 h-4 mr-1.5 animate-spin" />
 Saving…
 </>
 ) : (
 <>
 <FiCheck className="w-4 h-4 mr-1.5" />
 {mode === "create" ? "Create Plan" : "Save Changes"}
 </>
 )}
 </Button>
 <Button
 variant="outline"
 className="flex-1"
 onClick={onClose}
 disabled={saving}
 >
 Cancel
 </Button>
 </div>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 );
}

/* ------------------------------------------------------------------ */
/* Main Component */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 8;

export default function AdminPlansRoute() {
 const { plans: initialPlans, error: loadError, adminEmail } = useLoaderData<{
 plans: Plan[];
 error: string | null;
 adminEmail: string | null;
 }>();

 const [plans, setPlans] = useState<Plan[]>(initialPlans);
 const [loading, setLoading] = useState(false);
 const [saving, setSaving] = useState(false);
 const [search, setSearch] = useState("");
 const [page, setPage] = useState(1);
 const [showCreate, setShowCreate] = useState(false);
 const [editPlan, setEditPlan] = useState<Plan | null>(null);
 const [deleteId, setDeleteId] = useState<string | null>(null);
 const [deleting, setDeleting] = useState(false);
 const [toggleId, setToggleId] = useState<string | null>(null);
 const [showActive, setShowActive] = useState<"all" | "active" | "inactive">("all");

 const closeSheet = () => { setEditPlan(null); setShowCreate(false); };

 /* ── Refresh ── */
 const refresh = useCallback(async () => {
 setLoading(true);
 const { data, error } = await (supabase.from("plans") as any)
 .select("*")
 .order("sort_order", { ascending: true });
 if (!error && data) setPlans(data as Plan[]);
 setLoading(false);
 }, []);

 /* ── Create / Update ── */
 const handleSave = useCallback(
 async (formData: Partial<Plan>) => {
 setSaving(true);
 const payload = {
 name: formData.name!,
 description: formData.description ?? null,
 duration_days: formData.duration_days!,
 price: formData.price!,
 currency: formData.currency ?? "INR",
 features: formData.features ?? [],
 multiplier: formData.multiplier ?? 1,
 sort_order: formData.sort_order ?? 0,
 is_active: formData.is_active ?? true,
 updated_at: new Date().toISOString(),
 };

 let result: { data: any; error: any } = { data: null, error: null };

 if (editPlan) {
 result = await (supabase.from("plans") as any)
 .update(payload)
 .eq("id", editPlan.id);
 if (!result.error) {
 setPlans((prev) =>
 prev.map((p) => (p.id === editPlan.id ? { ...p, ...payload } as Plan : p))
 );
 }
 } else {
 result = await (supabase.from("plans") as any).insert(payload).select().single();
 if (!result.error && result.data) {
 setPlans((prev) => [...prev, result.data as Plan]);
 setPage(1);
 }
 }

 if (result.error) {
 alert("Failed to save: " + (result.error.message ?? "Unknown error"));
 }
 setSaving(false);
 closeSheet();
 },
 [editPlan]
 );

 /* ── Delete ── */
 const handleDelete = useCallback(async () => {
 if (!deleteId) return;
 setDeleting(true);
 const { error } = await (supabase.from("plans") as any).delete().eq("id", deleteId);
 if (!error) {
 setPlans((prev) => prev.filter((p) => p.id !== deleteId));
 setPage((p) => Math.max(1, p));
 } else {
 alert("Failed to delete: " + (error.message ?? "Unknown error"));
 }
 setDeleting(false);
 setDeleteId(null);
 }, [deleteId]);

 /* ── Toggle Active ── */
 const handleToggle = useCallback(
 async (plan: Plan) => {
 setToggleId(plan.id);
 const newActive = !plan.is_active;
 const { error } = await (supabase.from("plans") as any)
 .update({ is_active: newActive, updated_at: new Date().toISOString() })
 .eq("id", plan.id);
 if (!error) {
 setPlans((prev) =>
 prev.map((p) => (p.id === plan.id ? { ...p, is_active: newActive } : p))
 );
 }
 setToggleId(null);
 },
 []
 );

 /* ── Filter & Paginate ── */
 const filtered = plans.filter((p) => {
 if (showActive === "active" && !p.is_active) return false;
 if (showActive === "inactive" && p.is_active) return false;
 if (search) {
 const q = search.toLowerCase();
 if (
 !p.name.toLowerCase().includes(q) &&
 !p.description?.toLowerCase().includes(q) &&
 !String(p.price).includes(q)
 )
 return false;
 }
 return true;
 });

 const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
 const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

 /* ── Stats ── */
 const stats = {
 total: plans.length,
 active: plans.filter((p) => p.is_active).length,
 avgPrice: plans.length
 ? plans.reduce((s, p) => s + Number(p.price), 0) / plans.length
 : 0,
 totalRevenue: plans.reduce((s, p) => s + Number(p.price), 0),
 };

 return (
 <div className="min-h-screen bg-background text-foreground">
 <AdminSidebar collapsed={false} onToggle={() => {}} adminEmail={adminEmail || undefined} />

 <main className="ml-[220px] min-h-screen">
 {/* ── Header ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
 <div>
 <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-mono font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
 <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
 Plan Management
 </div>
 <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-gradient">
 Subscription Plans
 </h1>
 <p className="text-muted-foreground text-sm mt-1">
 {filtered.length} of {plans.length} plans
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
 <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
 Refresh
 </Button>
 <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
 <FiPlus className="w-3.5 h-3.5" />
 Add Plan
 </Button>
 </div>
 </div>

 {/* ── Error Banner ── */}
 {loadError && (
 <div className="mb-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-sm">
 Failed to load plans: {loadError}. Check your Supabase configuration.
 </div>
 )}

 {/* ── Stats Row ── */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
 {[
 { label: "Total Plans", value: stats.total, color: "text-foreground" },
 { label: "Active Plans", value: stats.active, color: "text-emerald-500" },
 { label: "Avg Price", value: formatCurrency(stats.avgPrice), color: "text-violet-500" },
 { label: "Total Value", value: formatCurrency(stats.totalRevenue), color: "text-fuchsia-500" },
 ].map((s) => (
 <div key={s.label} className="p-4 rounded-xl border border-border bg-card dark:bg-card/60">
 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
 <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
 </div>
 ))}
 </div>

 {/* ── Search & Filter Bar ── */}
 <div className="flex flex-col sm:flex-row gap-3 mb-4">
 <div className="relative flex-1">
 <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
 <Input
 placeholder="Search by name, description or price..."
 value={search}
 onChange={(e) => { setSearch(e.target.value); setPage(1); }}
 className="pl-9 h-10"
 />
 </div>
 <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border">
 {(["all", "active", "inactive"] as const).map((tab) => (
 <button
 key={tab}
 onClick={() => { setShowActive(tab); setPage(1); }}
 className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
 showActive === tab
 ? "bg-background dark:bg-card shadow-sm text-foreground font-semibold"
 : "text-muted-foreground hover:text-foreground"
 }`}
 >
 {tab.charAt(0).toUpperCase() + tab.slice(1)}
 {tab === "all" && ` (${plans.length})`}
 {tab === "active" && ` (${plans.filter((p) => p.is_active).length})`}
 {tab === "inactive" && ` (${plans.filter((p) => !p.is_active).length})`}
 </button>
 ))}
 </div>
 </div>

 {/* ── Plans Grid ── */}
 {loading && plans.length === 0 ? (
 <div className="flex items-center justify-center py-20">
 <FiLoader className="w-8 h-8 animate-spin text-muted-foreground" />
 </div>
 ) : paginated.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-border bg-card dark:bg-card/60">
 <FiCreditCard className="w-12 h-12 text-muted-foreground/30 mb-3" />
 <p className="text-sm font-medium text-muted-foreground">
 {search || showActive !== "all" ? "No plans match your filters" : "No plans yet"}
 </p>
 {!search && showActive === "all" && (
 <Button size="sm" onClick={() => setShowCreate(true)} className="mt-4 gap-1.5">
 <FiPlus className="w-3.5 h-3.5" />
 Create your first plan
 </Button>
 )}
 </div>
 ) : (
 <>
 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
 <AnimatePresence mode="popLayout">
 {paginated.map((plan, index) => (
 <motion.div
 key={plan.id}
 layout
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 className={`group relative rounded-2xl border overflow-hidden bg-card dark:bg-card/60 transition-all hover:shadow-lg hover:shadow-primary/5 ${
 plan.is_active ? "border-border hover:border-primary/30" : "border-border opacity-60"
 }`}
 >
 {/* Card Header */}
 <div className={`p-5 bg-gradient-to-br ${PLAN_COLORS[index % PLAN_COLORS.length]} relative overflow-hidden`}>
 <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full" />
 <div className="flex items-start justify-between">
 <div className={`w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white`}>
 {getPlanIcon(index)}
 </div>
 <div className="flex items-center gap-1">
 {!plan.is_active && (
 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white/80">
 INACTIVE
 </span>
 )}
 <button
 onClick={() => handleToggle(plan)}
 disabled={toggleId === plan.id}
 title={plan.is_active ? "Click to deactivate" : "Click to activate"}
 className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
 >
 {toggleId === plan.id ? (
 <FiLoader className="w-3 h-3 text-white animate-spin" />
 ) : plan.is_active ? (
 <FiToggleRight className="w-4 h-4 text-white" />
 ) : (
 <FiToggleLeft className="w-4 h-4 text-white/70" />
 )}
 </button>
 </div>
 </div>

 <div className="mt-4">
 <h3 className="text-lg font-bold text-white leading-tight">{plan.name}</h3>
 {plan.description && (
 <p className="text-white/80 text-xs mt-1 line-clamp-2">{plan.description}</p>
 )}
 </div>

 <div className="mt-4 flex items-end justify-between">
 <div>
 <span className="text-2xl font-bold text-white">
 {formatCurrency(Number(plan.price), plan.currency)}
 </span>
 <span className="text-white/60 text-xs ml-1">
 / {getDurationLabel(plan.duration_days)}
 </span>
 </div>
 {plan.multiplier !== 1 && (
 <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-white/20 text-white">
 {plan.multiplier}x
 </span>
 )}
 </div>
 </div>

 {/* Card Body */}
 <div className="p-4">
 {plan.features && plan.features.length > 0 ? (
 <ul className="space-y-1.5">
 {plan.features.slice(0, 4).map((feature, i) => (
 <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
 <FiCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
 <span className="line-clamp-1">{feature}</span>
 </li>
 ))}
 {plan.features.length > 4 && (
 <li className="text-[10px] text-muted-foreground/60 pl-5">
 +{plan.features.length - 4} more features
 </li>
 )}
 </ul>
 ) : (
 <p className="text-xs text-muted-foreground/60 italic">No features listed</p>
 )}

 {/* Card Footer */}
 <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-mono text-muted-foreground">
 Order: {plan.sort_order}
 </span>
 </div>
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => setEditPlan(plan)}
 className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
 title="Edit plan"
 type="button"
 >
 <FiEdit2 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => setDeleteId(plan.id)}
 className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
 title="Delete plan"
 type="button"
 >
 <FiTrash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 </div>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>

 {/* ── Pagination ── */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between px-4 py-3 mt-4 rounded-xl border border-border bg-card dark:bg-card/60">
 <p className="text-xs text-muted-foreground">
 Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
 {filtered.length}
 </p>
 <div className="flex items-center gap-1">
 <Button
 variant="outline"
 size="sm"
 className="w-8 h-8 p-0"
 onClick={() => setPage((p) => Math.max(1, p - 1))}
 disabled={page === 1}
 >
 <FiChevronLeft className="w-4 h-4" />
 </Button>
 {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
 const p = i + 1;
 return (
 <Button
 key={p}
 variant={page === p ? "default" : "ghost"}
 size="sm"
 className="w-8 h-8 p-0"
 onClick={() => setPage(p)}
 >
 {p}
 </Button>
 );
 })}
 {totalPages > 5 && <span className="px-1 text-xs text-muted-foreground">…</span>}
 <Button
 variant="outline"
 size="sm"
 className="w-8 h-8 p-0"
 onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
 disabled={page === totalPages}
 >
 <FiChevronRight className="w-4 h-4" />
 </Button>
 </div>
 </div>
 )}
 </>
 )}

 {/* ── Delete Confirmation ── */}
 <Sheet open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
 <SheetContent side="bottom" className="sm:max-w-[420px] mx-auto">
 <SheetHeader>
 <SheetTitle className="flex items-center gap-2 text-red-500">
 <FiTrash2 className="w-4 h-4" />
 Delete Plan
 </SheetTitle>
 <SheetDescription>
 This action cannot be undone. The plan will be permanently removed.
 </SheetDescription>
 </SheetHeader>
 <SheetFooter className="mt-6 flex gap-2">
 <Button
 variant="destructive"
 className="flex-1"
 onClick={handleDelete}
 disabled={deleting}
 >
 {deleting ? <FiLoader className="w-4 h-4 mr-1.5 animate-spin" /> : <FiTrash2 className="w-4 h-4 mr-1.5" />}
 {deleting ? "Deleting…" : "Yes, Delete"}
 </Button>
 <Button
 variant="outline"
 className="flex-1"
 onClick={() => setDeleteId(null)}
 disabled={deleting}
 >
 Cancel
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>

 {/* ── Create / Edit Sheet ── */}
 <PlanSheet
 isOpen={!!editPlan || showCreate}
 plan={editPlan}
 mode={editPlan ? "edit" : "create"}
 onClose={closeSheet}
 onSave={handleSave}
 saving={saving}
 />
 </main>
 </div>
 );
}
