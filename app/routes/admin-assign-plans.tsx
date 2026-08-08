import { useState, useCallback, useEffect } from "react";
import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction, redirect, useLocation, useNavigate } from "react-router";
import { useLoaderData, useFetcher, useActionData } from "react-router";
import { verifyAdminSession } from "~/utils/admin-auth";
import { supabaseServer } from "~/utils/supabase.server";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { cn } from "~/lib/utils";
import {
	Search,
	RefreshCw,
	Loader,
	Check,
	User,
	Key,
	CreditCard,
	Clock,
	Shield,
	Trash2,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
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

export const meta: MetaFunction = () => [{ title: "Assign Plans | Admin | OpusZen" }];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminPlan {
	id: string;
	name: string;
	display_name: string;
	description: string;
	badge_color: string;
	icon: string;
	features: string[];
	monthly_price: number;
	daily_token_limit: number;
	monthly_token_limit: number;
	model_access: string[];
	is_active: boolean;
	priority: number;
	sort_order: number;
	notes: string;
	is_system: boolean;
	created_at: string;
	updated_at: string;
}

interface UserApiKeyInfo {
	id: string;
	name: string;
	user_id: string;
	api_key: string;
	status: string;
	expiry_date: string | null;
	plan_name: string | null;
	username?: string;
}

interface Assignment {
	id: string;
	api_key: string;
	plan_id: string;
	expiry_date: string | null;
	is_active: boolean;
	notes: string;
	assigned_by: string | null;
	created_at: string;
	updated_at: string;
	plan: AdminPlan;
	user_api_key?: {
		id: string;
		name: string;
		user_id: string;
	};
}

interface LoaderData {
	assignments: Assignment[];
	plans: AdminPlan[];
	users: { id: string; username: string; name: string }[];
	adminEmail: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskApiKey(key: string): string {
	if (!key) return "—";
	if (key.length <= 8) return "****";
	return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

function formatCurrency(amount: number, currency = "INR"): string {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency,
		minimumFractionDigits: 0,
	}).format(amount);
}

function formatDate(iso?: string | null): string {
	if (!iso) return "Never";
	const d = new Date(iso);
	if (isNaN(d.getTime())) return iso;
	return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getDaysLeft(iso?: string | null): string {
	if (!iso) return "Never";
	const expiry = new Date(iso);
	if (isNaN(expiry.getTime())) return "";
	const now = new Date();
	const diffMs = expiry.getTime() - now.getTime();
	if (diffMs <= 0) return "Expired";
	const days = Math.ceil(diffMs / 86400000);
	return `${days}d left`;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loader({ request }: LoaderFunctionArgs) {
	const adminCheck = await verifyAdminSession(request);
	if (!adminCheck.isAdmin) throw redirect("/auth/admin");

	// Load all plans
	const { data: plans } = await supabaseServer
		.from("admin_plans")
		.select("*")
		.order("sort_order", { ascending: true });

	// Load all assignments with plan details
	const { data: rawAssignments } = await supabaseServer
		.from("api_key_plan_assignments")
		.select("*")
		.order("created_at", { ascending: false });

	// Load user API keys with user info
	const { data: userKeys } = await supabaseServer
		.from("user_api_keys")
		.select("id, name, user_id, api_key, status, expiry_date, plan_name, users(username, name)")
		.order("created_at", { ascending: false });

	// Build assignments with enriched data
	const assignments: Assignment[] = [];
	if (rawAssignments && plans) {
		const planMap = new Map(plans.map((p) => [p.id, p]));

		for (const a of rawAssignments as any[]) {
			const plan = planMap.get(a.plan_id);
			if (!plan) continue;

			const userKey = userKeys?.find((k: any) => k.api_key === a.api_key);

			assignments.push({
				id: a.id,
				api_key: a.api_key,
				plan_id: a.plan_id,
				expiry_date: a.expiry_date,
				is_active: a.is_active,
				notes: a.notes,
				assigned_by: a.assigned_by,
				created_at: a.created_at,
				updated_at: a.updated_at,
				plan: plan as AdminPlan,
				user_api_key: userKey,
			});
		}
	}

	const { data: users } = await supabaseServer
		.from("users")
		.select("id, username, name")
		.order("username", { ascending: true });

	return {
		assignments,
		plans: (plans ?? []) as AdminPlan[],
		users: users ?? [],
		adminEmail: adminCheck.adminEmail,
	};
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export async function action({ request }: ActionFunctionArgs) {
	const admin = await verifyAdminSession(request);
	if (!admin.isAdmin) {
		return { error: "Not authorized" };
	}

	const formData = await request.formData();
	const intent = formData.get("intent")?.toString();

	if (intent === "assign") {
		const apiKey = formData.get("apiKey")?.toString() || "";
		const planId = formData.get("planId")?.toString() || "";
		const expiryDate = formData.get("expiryDate")?.toString() || null;
		const notes = formData.get("notes")?.toString() || "";
		const userApiKeyId = formData.get("userApiKeyId")?.toString() || null;

		if (!apiKey || !planId) {
			return { success: false, error: "API key and plan are required" };
		}

		// Import the service
		const { assignPlanToApiKey, logActivity } = await import("~/utils/plan-service");

		const result = await assignPlanToApiKey({
			api_key: apiKey,
			plan_id: planId,
			user_api_key_id: userApiKeyId,
			expiry_date: expiryDate,
			notes,
			assigned_by: admin.adminEmail,
		});

		if (result) {
			await logActivity({
				action: "plan_assigned",
				entity_type: "assignment",
				entity_id: result.id,
				admin_email: admin.adminEmail,
				details: { api_key: apiKey, planId: planId, user_api_key_id: userApiKeyId },
			});
			return { success: true };
		}

		return { success: false, error: "Failed to assign plan" };
	}

	if (intent === "remove") {
		const assignmentId = formData.get("assignmentId")?.toString() || "";

		const { logActivity } = await import("~/utils/plan-service");

		const ok = await removeAssignment(assignmentId);
		if (ok) {
			await logActivity({
				action: "plan_removed",
				entity_type: "assignment",
				entity_id: assignmentId,
				admin_email: admin.adminEmail,
			});
			return { success: true };
		}
		return { success: false, error: "Failed to remove assignment" };
	}

	return { success: false, error: "Unknown action" };
}

async function removeAssignment(assignmentId: string): Promise<boolean> {
	const { error } = await supabaseServer
		.from("api_key_plan_assignments")
		.delete()
		.eq("id", assignmentId);
	return !error;
}

// ---------------------------------------------------------------------------
// Assign Sheet Component
// ---------------------------------------------------------------------------

interface AssignSheetProps {
	isOpen: boolean;
	apiKey: string | null;
	userApiKeyId: string | null;
	username: string | null;
	currentPlan: string | null;
	expiryDate: string | null;
	plans: AdminPlan[];
	onClose: () => void;
	actionData: any;
}

function AssignSheet({ isOpen, apiKey, userApiKeyId, username, currentPlan, expiryDate, plans, onClose, actionData }: AssignSheetProps) {
	const [selectedPlan, setSelectedPlan] = useState("");
	const [newExpiry, setNewExpiry] = useState("");
	const [notes, setNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setSelectedPlan("");
			setNewExpiry("");
			setNotes("");
			setSubmitting(false);
		}
	}, [isOpen]);

	const activePlans = plans.filter((p) => p.is_active);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!apiKey || !selectedPlan) return;
		setSubmitting(true);

		const formData = new FormData();
		formData.append("intent", "assign");
		formData.append("apiKey", apiKey);
		formData.append("planId", selectedPlan);
		if (newExpiry) formData.append("expiryDate", newExpiry);
		if (notes) formData.append("notes", notes);
		if (userApiKeyId) formData.append("userApiKeyId", userApiKeyId);

		await fetch(window.location.pathname, { method: "POST", body: formData });
		setSubmitting(false);
		onClose();
	};

	if (!apiKey) return null;

	return (
		<Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<SheetContent className="w-full max-w-lg p-6 rounded-2xl border border-border bg-background shadow-2xl">
				<SheetHeader className="pb-3 border-b border-border/80">
					<SheetTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
						<Shield className="w-5 h-5 text-orange-500" />
						Assign Plan to Key
					</SheetTitle>
					<SheetDescription className="text-xs text-muted-foreground mt-1">
						Assign an OpusZen plan to this API key. OpusLive plan names are never exposed to customers.
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="mt-6 space-y-5">
					{/* Key Info */}
					<div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
						<div className="flex items-center gap-2">
							<Key className="w-3.5 h-3.5 text-muted-foreground" />
							<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">API Key</span>
						</div>
						<p className="text-sm font-mono text-foreground">{maskApiKey(apiKey)}</p>
						{username && (
							<div className="flex items-center gap-2">
								<User className="w-3.5 h-3.5 text-muted-foreground" />
								<span className="text-xs text-muted-foreground">User: {username}</span>
							</div>
						)}
						{currentPlan && (
							<div className="flex items-center gap-2">
								<CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
								<span className="text-xs text-muted-foreground">Current plan: {currentPlan}</span>
							</div>
						)}
						{expiryDate && (
							<div className="flex items-center gap-2">
								<Clock className="w-3.5 h-3.5 text-muted-foreground" />
								<span className="text-xs text-muted-foreground">Expires: {formatDate(expiryDate)} ({getDaysLeft(expiryDate)})</span>
							</div>
						)}
					</div>

					{/* Plan Selector */}
					<div>
						<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
							Select Plan <span className="text-red-500">*</span>
						</label>
						<select
							value={selectedPlan}
							onChange={(e) => setSelectedPlan(e.target.value)}
							className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer transition-all"
							required
						>
							<option value="">Select a plan…</option>
							{activePlans.map((plan) => (
								<option key={plan.id} value={plan.id}>
									{plan.display_name} — {formatCurrency(plan.monthly_price)}
								</option>
							))}
						</select>
					</div>

					{/* Expiry Override */}
					<div>
						<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
							Expiry Override <span className="font-normal normal-case text-[10px]">(optional)</span>
						</label>
						<Input
							type="date"
							value={newExpiry}
							onChange={(e) => setNewExpiry(e.target.value)}
							className="h-10"
						/>
						<p className="text-[10px] text-muted-foreground mt-1">Leave empty to use plan default</p>
					</div>

					{/* Notes */}
					<div>
						<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
							Notes <span className="font-normal normal-case text-[10px]">(optional)</span>
						</label>
						<textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={2}
							className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all placeholder:text-muted-foreground/50"
							placeholder="Any notes about this assignment…"
						/>
					</div>

					{actionData?.error && (
						<div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-xs">
							{actionData.error}
						</div>
					)}

					<SheetFooter className="sticky bottom-0 z-20 mt-6 pt-4 pb-1 border-t border-border/80 bg-background/95 backdrop-blur-md flex flex-row justify-end gap-3">
						<Button variant="outline" onClick={onClose} disabled={submitting} className="px-5 py-2.5 h-10 rounded-xl">
							Cancel
						</Button>
						<Button
							variant="default"
							type="submit"
							disabled={submitting || !selectedPlan}
							className="px-6 py-2.5 h-10 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold gap-2"
						>
							{submitting ? (
								<>
									<Loader className="w-4 h-4 animate-spin" />
									Saving…
								</>
							) : (
								<>
									<Check className="w-4 h-4" />
									Assign Plan
								</>
							)}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 15;

export default function AdminAssignPlanRoute() {
	const { assignments, plans, users, adminEmail } = useLoaderData<LoaderData>();
	const actionData = useActionData<{ success?: boolean; error?: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const [mobileOpen, setMobileOpen] = useState(false);

	useEffect(() => { setMobileOpen(false); }, [location.pathname]);

	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [assignSheet, setAssignSheet] = useState<{
		apiKey: string;
		userApiKeyId: string | null;
		username: string | null;
		currentPlan: string | null;
		expiryDate: string | null;
	} | null>(null);

	const refresh = useCallback(async () => {
		navigate(".", { replace: true });
	}, [navigate]);

	// Filter
	const filtered = assignments.filter((a) => {
		if (!search) return true;
		const q = search.toLowerCase();
		const planName = a.plan.display_name.toLowerCase();
		const apiKeyMasked = a.api_key.toLowerCase();
		const userName = (a.user_api_key?.name || "").toLowerCase();
		const assignedBy = (a.assigned_by || "").toLowerCase();
		return planName.includes(q) || apiKeyMasked.includes(q) || userName.includes(q) || assignedBy.includes(q);
	});

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	// Stats
	const totalPlans = plans.length;
	const activePlans = plans.filter((p) => p.is_active).length;
	const totalAssignments = assignments.length;
	const activeAssignments = assignments.filter((a) => a.is_active).length;

	return (
		<div className="min-h-screen bg-background text-foreground">
			<AdminSidebar
				collapsed={false}
				onToggle={() => {}}
				adminEmail={adminEmail || undefined}
				mobileOpen={mobileOpen}
				onMobileToggle={() => setMobileOpen((v) => !v)}
			/>

			<main className="min-h-screen md:ml-[220px]">
				{/* Mobile header */}
				<div className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-border/60 bg-background/95 backdrop-blur md:hidden">
					<button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors" aria-label="Open menu">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
							<path d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
					<span className="text-sm font-semibold">Assign Plans</span>
				</div>

				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-mono font-semibold text-orange-600 uppercase tracking-wider">
								<span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
								Plan Assignment
							</div>
							<h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
								Assign Plans
							</h1>
							<p className="text-muted-foreground text-sm mt-1">
								{filtered.length} of {assignments.length} assignments
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
								<RefreshCw className="w-3.5 h-3.5" />
								Refresh
							</Button>
						</div>
					</div>

					{/* Stats */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						{[
							{ label: "Total Plans", value: totalPlans, color: "text-foreground" },
							{ label: "Active Plans", value: activePlans, color: "text-emerald-500" },
							{ label: "Assignments", value: totalAssignments, color: "text-violet-500" },
							{ label: "Active", value: activeAssignments, color: "text-orange-500" },
						].map((s) => (
							<div key={s.label} className="p-4 rounded-xl border border-border bg-card">
								<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
								<p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
							</div>
						))}
					</div>

					{/* Search */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
						<Input
							placeholder="Search by key, plan, or user…"
							value={search}
							onChange={(e) => { setSearch(e.target.value); setPage(1); }}
							className="pl-9 h-10"
						/>
					</div>

					{/* Assignments Table */}
					{filtered.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-border bg-card">
							<Shield className="w-12 h-12 text-muted-foreground/30 mb-3" />
							<p className="text-sm font-medium text-muted-foreground">
								{search ? "No assignments match your search" : "No plan assignments yet"}
							</p>
							{!search && (
								<p className="text-xs text-muted-foreground/60 mt-1">
									Go to API Keys and click "Assign Plan" to get started
								</p>
							)}
						</div>
					) : (
						<>
							<div className="rounded-2xl border border-border bg-card overflow-hidden">
								<div className="overflow-x-auto">
									<table className="w-full text-left text-sm border-collapse">
										<thead>
											<tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
												<th className="py-3 px-4 font-semibold">API Key</th>
												<th className="py-3 px-4 font-semibold">Customer</th>
												<th className="py-3 px-4 font-semibold">Assigned Plan</th>
												<th className="py-3 px-4 font-semibold">Status</th>
												<th className="py-3 px-4 font-semibold">Expiry</th>
												<th className="py-3 px-4 font-semibold">Assigned By</th>
												<th className="py-3 px-4 font-semibold text-right">Actions</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border/40">
											{paginated.map((a) => (
												<tr key={a.id} className="hover:bg-muted/10 transition-colors">
													<td className="py-3 px-4">
														<code className="text-xs font-mono text-foreground">{maskApiKey(a.api_key)}</code>
													</td>
													<td className="py-3 px-4">
														<span className="text-xs text-foreground">
															{a.user_api_key?.name || a.user_api_key?.user_id?.slice(0, 8) || "—"}
														</span>
													</td>
													<td className="py-3 px-4">
														<div className="flex items-center gap-2">
															<span
																className="inline-block w-2 h-2 rounded-full"
																style={{ background: a.plan.badge_color }}
															/>
															<span className="text-xs font-medium text-foreground">{a.plan.display_name}</span>
														</div>
													</td>
													<td className="py-3 px-4">
														<span className={cn(
															"text-[11px] font-semibold px-2 py-0.5 rounded-full",
															a.is_active
																? "bg-emerald-500/10 text-emerald-600"
																: "bg-zinc-500/10 text-zinc-500"
														)}>
															{a.is_active ? "Active" : "Inactive"}
														</span>
													</td>
													<td className="py-3 px-4">
														<div className="text-xs">
															<div className="text-foreground">{a.expiry_date ? formatDate(a.expiry_date) : "No expiry"}</div>
															{a.expiry_date && (
																<div className="text-muted-foreground text-[10px]">{getDaysLeft(a.expiry_date)}</div>
															)}
														</div>
													</td>
													<td className="py-3 px-4 text-xs text-muted-foreground">
														{a.assigned_by || "—"}
													</td>
													<td className="py-3 px-4">
														<div className="flex items-center gap-1 justify-end">
															<Button
																variant="ghost"
																size="sm"
																className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
																onClick={() => {
																	setAssignSheet({
																		apiKey: a.api_key,
																		userApiKeyId: a.user_api_key?.id || null,
																		username: a.user_api_key?.name || null,
																		currentPlan: a.plan.display_name,
																		expiryDate: a.expiry_date,
																	});
																}}
															>
																<RefreshCw className="w-3 h-3" />
																Reassign
															</Button>
															<FetcherAction intent="remove" assignmentId={a.id} actionPath={location.pathname} />
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card">
									<p className="text-xs text-muted-foreground">
										Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
									</p>
									<div className="flex items-center gap-1">
										<Button
											variant="outline"
											size="sm"
											className="w-8 h-8 p-0"
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={page === 1}
										>
											<ChevronLeft className="w-4 h-4" />
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
										<Button
											variant="outline"
											size="sm"
											className="w-8 h-8 p-0"
											onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
											disabled={page === totalPages}
										>
											<ChevronRight className="w-4 h-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</main>

			{/* Assign Sheet */}
			<AssignSheet
				isOpen={!!assignSheet}
				apiKey={assignSheet?.apiKey || null}
				userApiKeyId={assignSheet?.userApiKeyId || null}
				username={assignSheet?.username || null}
				currentPlan={assignSheet?.currentPlan || null}
				expiryDate={assignSheet?.expiryDate || null}
				plans={plans}
				onClose={() => setAssignSheet(null)}
				actionData={actionData}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Delete Button Component (uses Fetcher for optimistic update)
// ---------------------------------------------------------------------------

function FetcherAction({ intent, assignmentId, actionPath }: { intent: string; assignmentId: string; actionPath: string }) {
	const fetcher = useFetcher();
	const isSubmitting = fetcher.state === "submitting";

	const handleClick = () => {
		if (!confirm("Remove this plan assignment?")) return;
		const fd = new FormData();
		fd.append("intent", intent);
		fd.append("assignmentId", assignmentId);
		fetcher.submit(fd, { method: "POST", action: actionPath });
	};

	return (
		<Button
			variant="ghost"
			size="sm"
			className="h-7 text-[10px] gap-1 text-red-400 hover:text-red-500 hover:bg-red-500/10"
			onClick={handleClick}
			disabled={isSubmitting}
		>
			{isSubmitting ? <Loader className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
			Remove
		</Button>
	);
}
