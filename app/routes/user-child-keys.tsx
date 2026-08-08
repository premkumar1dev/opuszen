import { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router";
import { useAccessGuard } from "~/utils/use-access-guard";
import {
	Key,
	Plus,
	Trash2,
	Shield,
	Copy,
	Eye,
	EyeOff,
	RefreshCw,
	ChevronDown,
	ChevronRight,
	Clock,
	Zap,
	Link,
	GitBranch,
	Activity,
} from "lucide-react";
import { supabase } from "~/utils/supabase";
import { DashboardSidebar } from "~/components/dashboard/dashboard-sidebar";

interface KeyRow {
	id: string;
	name: string;
	api_key: string;
	status: string;
	plan_name: string;
	rate_limit: number;
	tokens_limit: number;
	tokens_used: number;
	expiry_date: string;
	created_at: string;
	parent_key_id: string | null;
	total_requests: number;
	allowed_models: string[];
	allowed_providers: string[];
}

export default function UserChildKeys() {
	const [parentKeys, setParentKeys] = useState<KeyRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [creatingFor, setCreatingFor] = useState<string | null>(null);
	const [newChildName, setNewChildName] = useState("");
	const [creating, setCreating] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [theme] = useState<"dark" | "light">("dark");
	const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
	const [revealed, setRevealed] = useState<Set<string>>(new Set());
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [expanded, setExpanded] = useState<Set<string>>(new Set());
	const [refreshTick, setRefreshTick] = useState(0);
	const access = useAccessGuard();

	if (access === null) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	useEffect(() => { loadUser(); }, []);

	async function loadUser() {
		const { data } = await supabase.auth.getUser();
		if (data.user) {
			setUser({ id: data.user.id, email: data.user.email ?? undefined });
		}
	}

	const refreshData = useCallback(async () => {
		if (!user?.id) return;
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from("user_api_keys")
				.select("*")
				.eq("user_id", user.id)
				.order("created_at", { ascending: false });

			if (!error && data) {
				const parents = (data as KeyRow[]).filter((k) => !k.parent_key_id);
				setParentKeys(parents);
			}
		} catch { }
		setLoading(false);
	}, [user?.id]);

	useEffect(() => {
		if (user?.id) refreshData();
	}, [user?.id, refreshTick]);

	async function createChild(parentId: string) {
		if (!newChildName.trim() || !user?.id) return;
		setCreating(true);

		try {
			const fd = new FormData();
			fd.set("action", "create");
			fd.set("parentKeyId", parentId);
			fd.set("userId", user.id);
			fd.set("keyName", newChildName.trim());

			const res = await fetch("/api/child-keys", { method: "POST", body: fd });
			const result = await res.json();

			if (result.success) {
				setNewChildName("");
				setCreatingFor(null);
				setRefreshTick(t => t + 1);
				setExpanded((s) => new Set([...s, parentId]));
			} else {
				alert(result.error || "Failed to create child key");
			}
		} catch {
			alert("Network error. Please try again.");
		}
		setCreating(false);
	}

	async function handleRevoke(childId: string) {
		if (!confirm("Revoke this child key? It will stop working immediately.")) return;
		if (!user?.id) return;

		const fd = new FormData();
		fd.set("action", "revoke");
		fd.set("childKeyId", childId);

		const res = await fetch("/api/child-keys", { method: "POST", body: fd });
		const result = await res.json();
		if (result.success) {
			setRefreshTick(t => t + 1);
		}
	}

	async function handleDelete(childId: string) {
		if (!confirm("Permanently delete this child key? This cannot be undone.")) return;
		if (!user?.id) return;

		const fd = new FormData();
		fd.set("action", "delete");
		fd.set("childKeyId", childId);

		const res = await fetch("/api/child-keys", { method: "POST", body: fd });
		const result = await res.json();
		if (result.success) {
			setRefreshTick(t => t + 1);
		}
	}

	function toggleExpand(parentId: string) {
		setExpanded((s) => {
			const n = new Set(s);
			n.has(parentId) ? n.delete(parentId) : n.add(parentId);
			return n;
		});
	}

	const maskKey = (key: string) => {
		if (key.length <= 6) return "****";
		const visible = Math.max(4, Math.ceil(key.length * 0.3));
		return key.slice(0, visible) + "****";
	};

	const copy = (text: string, id: string) => {
		navigator.clipboard.writeText(text);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	const formatDate = (d: string) => {
		if (!d) return "—";
		return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
	};

	const daysLeft = (expiry: string) => {
		if (!expiry) return Infinity;
		return Math.max(0, (new Date(expiry).getTime() - Date.now()) / 864e5);
	};

	return (
		<div className="dashboard flex min-h-screen">
			{sidebarOpen && (
				<div className="fixed inset-0 z-dropdown dashboard-overlay backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
			)}
			<div className={`fixed top-0 left-0 z-dropdown h-full md:hidden transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
				<DashboardSidebar collapsed={false} onToggle={() => setSidebarOpen(false)} userEmail={user?.email} theme={theme} onThemeToggle={() => { }} onLogout={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} />
			</div>
			<div className="hidden md:block">
				<DashboardSidebar collapsed={false} onToggle={() => { }} userEmail={user?.email} theme={theme} onThemeToggle={() => { }} onLogout={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} />
			</div>

			<main className="flex-1 min-h-screen md:ml-[240px]">
				<header className="sticky top-0 z-40 border-b border-[var(--dashboard-border)]" style={{ backgroundColor: `color-mix(in srgb, var(--dashboard-bg) 85%, transparent)`, WebkitBackdropFilter: 'saturate(180%) blur(8px)', backdropFilter: 'saturate(180%) blur(8px)' }}>
					<div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8 gap-2">
						<div className="flex items-center gap-3 min-w-0">
							<button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--dashboard-nav-hover)] text-[var(--dashboard-text-secondary)] transition-colors shrink-0" aria-label="Open menu">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
							</button>
							<div className="min-w-0">
								<h1 className="text-sm font-semibold text-[var(--dashboard-text)] truncate">Child Keys</h1>
								<p className="text-[11px] text-[var(--dashboard-text-muted)] hidden sm:block">Manage child keys derived from your plan keys</p>
							</div>
						</div>
						<div className="flex items-center gap-2 shrink-0">
							<button onClick={() => { setRefreshTick(t => t + 1); }} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all disabled:opacity-50">
								<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
								<span className="hidden sm:inline">Refresh</span>
							</button>
							<NavLink to="/user/my-keys" className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
								<Key className="w-3.5 h-3.5" /><span className="hidden sm:inline">All Keys</span>
							</NavLink>
						</div>
					</div>
				</header>

				<div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto w-full">
					{/* Info banner */}
					<div className="dashboard-card p-4 rounded-2xl mb-6 border border-primary/20 bg-primary/5">
						<div className="flex items-start gap-3">
							<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
								<GitBranch className="w-4 h-4 text-primary" />
							</div>
							<div>
								<h3 className="text-sm font-semibold text-[var(--dashboard-text)]">About Child Keys</h3>
								<p className="text-xs text-[var(--dashboard-text-secondary)] mt-1 leading-relaxed">
									Child keys (<code className="text-primary font-mono">za_</code>) inherit your parent key's plan — rate limits, token quotas, expiry, and models.
									Use them to distribute API access across applications or team members while keeping control under one parent key.
								</p>
							</div>
						</div>
					</div>

					{loading ? (
						<div className="text-center py-20">
							<RefreshCw className="w-8 h-8 text-[var(--dashboard-text-muted)] mx-auto animate-spin" />
						</div>
					) : parentKeys.length === 0 ? (
						<div className="text-center py-16 sm:py-20 dashboard-card rounded-2xl">
							<Key className="w-10 h-10 text-[var(--dashboard-text-muted)] mx-auto mb-3" />
							<p className="text-sm text-[var(--dashboard-text-secondary)] font-medium">No parent keys found</p>
							<p className="text-xs text-[var(--dashboard-text-muted)] mt-1">Purchase a plan to create a parent key, then spawn child keys from it.</p>
							<NavLink to="/user/my-keys" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
								<Plus className="w-3.5 h-3.5" /> Get a Plan
							</NavLink>
						</div>
					) : (
						<div className="space-y-4">
							{parentKeys.map((parent) => (
								<ParentKeyCard
									key={parent.id}
									parent={parent}
									isExpanded={expanded.has(parent.id)}
									isCreating={creatingFor === parent.id}
									newChildName={newChildName}
									setNewChildName={setNewChildName}
									creating={creating}
									revealed={revealed}
									setRevealed={setRevealed}
									copiedId={copiedId}
									setCopiedId={setCopiedId}
									userId={user?.id}
									onToggleExpand={() => toggleExpand(parent.id)}
									onCreateChild={() => createChild(parent.id)}
									onSetCreatingFor={setCreatingFor}
									onRevoke={handleRevoke}
									onDelete={handleDelete}
									maskKey={maskKey}
									copy={copy}
									formatDate={formatDate}
									onRefresh={refreshData}
								/>
							))}
						</div>
					)}
				</div>
			</main>
		</div>
	);
}

function ParentKeyCard({
	parent,
	isExpanded,
	isCreating,
	newChildName,
	setNewChildName,
	creating,
	revealed,
	setRevealed,
	copiedId,
	setCopiedId,
	userId,
	onToggleExpand,
	onCreateChild,
	onSetCreatingFor,
	onRevoke,
	onDelete,
	maskKey,
	copy,
	formatDate,
	onRefresh,
}: {
	parent: KeyRow;
	isExpanded: boolean;
	isCreating: boolean;
	newChildName: string;
	setNewChildName: (v: string) => void;
	creating: boolean;
	revealed: Set<string>;
	setRevealed: (s: Set<string>) => void;
	copiedId: string | null;
	setCopiedId: (id: string | null) => void;
	userId?: string;
	onToggleExpand: () => void;
	onCreateChild: () => void;
	onSetCreatingFor: (id: string | null) => void;
	onRevoke: (id: string) => void;
	onDelete: (id: string) => void;
	maskKey: (k: string) => string;
	copy: (text: string, id: string) => void;
	formatDate: (d: string) => string;
	onRefresh: () => void;
}) {
	const [children, setChildren] = useState<KeyRow[]>([]);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		if (isExpanded && !loaded) {
			setLoaded(true);
			fetchChildren();
		}
	}, [isExpanded]);

	async function fetchChildren() {
		if (!userId) return;
		const fd = new FormData();
		fd.set("action", "list");
		fd.set("parentKeyId", parent.id);

		try {
			const res = await fetch("/api/child-keys", { method: "POST", body: fd });
			const result = await res.json();
			if (result.success) {
				setChildren(result.children || []);
			}
		} catch { }
	}

	useEffect(() => {
		if (isExpanded) fetchChildren();
	}, [isExpanded, parent.id]);

	const parentKey = parent.api_key;
	const dl = daysLeft(parent.expiry_date);
	const expiryClass = dl <= 3 ? "text-red-400" : dl <= 14 ? "text-amber-400" : "text-[var(--dashboard-text-muted)]";

	return (
		<div className="dashboard-card rounded-2xl overflow-hidden">
			<div className="p-4 sm:p-5">
				<div className="flex items-start justify-between gap-4">
					<div className="flex items-start gap-3 min-w-0 flex-1">
						<span className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-primary" />
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="text-sm font-semibold text-[var(--dashboard-text)] truncate">{parent.name}</h3>
								<span className="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 bg-primary/10 text-primary border-primary/20">
									{parentKey.startsWith("sk_live_") ? "Parent" : "Root"}
								</span>
								<span className="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 bg-[var(--dashboard-nav-hover)] text-[var(--dashboard-text-muted)] border-[var(--dashboard-border)]">
									{parent.status}
								</span>
							</div>
							<div className="flex flex-wrap items-center gap-2 mt-1.5">
								<code className="text-[11px] font-mono text-[var(--dashboard-text-muted)] bg-[var(--dashboard-input-bg)] px-2 py-0.5 rounded">
									{revealed.has(parent.id) ? parentKey : maskKey(parentKey)}
								</code>
								<button onClick={() => {
								const r = new Set(revealed);
								r.has(parent.id) ? r.delete(parent.id) : r.add(parent.id);
								setRevealed(r);
							}} className="text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] transition-colors p-0.5" aria-label={revealed.has(parent.id) ? "Hide" : "Reveal"}>
									{revealed.has(parent.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
								</button>
								<button onClick={() => copy(parentKey, parent.id)} className="text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] transition-colors p-0.5" aria-label="Copy">
									<Copy className="w-3.5 h-3.5" />
								</button>
								{copiedId === parent.id && <span className="text-[10px] text-emerald-500 font-medium">Copied!</span>}
							</div>
							<div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-[var(--dashboard-text-secondary)]">
								<span className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary" /> {parent.plan_name}</span>
								<span className="flex items-center gap-1"><Activity className="w-3 h-3 text-[var(--dashboard-text-muted)]" /> {parent.rate_limit} req/min</span>
								<span className="flex items-center gap-1"><Clock className={`w-3 h-3 ${expiryClass}`} /> {formatDate(parent.expiry_date)} ({dl < 30 ? dl.toFixed(0) + "d" : ""})</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-1 shrink-0">
						<button onClick={onToggleExpand} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-all">
							{isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
							Children
						</button>
					</div>
				</div>
			</div>

			{isExpanded && (
				<div className="border-t border-[var(--dashboard-border)]">
					<div className="p-4 sm:p-5 space-y-3">
						{isCreating ? (
							<div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dashboard-input-bg)] border border-primary/20">
								<input
									type="text"
									value={newChildName}
									onChange={(e) => setNewChildName(e.target.value)}
									placeholder="e.g. Production API, Staging App..."
									className="flex-1 bg-transparent text-sm text-[var(--dashboard-text)] placeholder:text-[var(--dashboard-text-muted)] border-none outline-none"
									autoFocus
									onKeyDown={(e) => e.key === "Enter" && onCreateChild()}
								/>
								<button onClick={onCreateChild} disabled={creating || !newChildName.trim()} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 shrink-0">
									{creating ? "Creating..." : "Create"}
								</button>
								<button onClick={() => onSetCreatingFor(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all shrink-0">
									Cancel
								</button>
							</div>
						) : (
							<button
								onClick={() => onSetCreatingFor(parent.id)}
								className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-primary hover:bg-primary/10 transition-all border border-dashed border-primary/20 hover:border-primary/30"
							>
								<Plus className="w-3.5 h-3.5" /> Create Child Key
							</button>
						)}

						{children.length === 0 && !isCreating ? (
							<p className="text-xs text-[var(--dashboard-text-muted)] py-4 text-center">No child keys yet. Click above to create one.</p>
						) : (
							<div className="space-y-2">
								{children.map((child) => {
									const isRevealed = revealed.has(child.id);
									const isActive = child.status === "active";
									return (
										<div key={child.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--dashboard-input-bg)]/50 border border-[var(--dashboard-border)]">
											<div className="flex items-center gap-3 min-w-0 flex-1">
												<Link className="w-3.5 h-3.5 text-primary shrink-0" />
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-2 flex-wrap">
														<span className="text-xs font-medium text-[var(--dashboard-text)] truncate">{child.name}</span>
														<span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
															{child.status}
														</span>
														<span className="text-[10px] font-mono text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
															za_
														</span>
													</div>
													<div className="flex flex-wrap items-center gap-2 mt-1">
														<code className="text-[10px] font-mono text-[var(--dashboard-text-muted)]">
															{isRevealed ? child.api_key : maskKey(child.api_key)}
														</code>
														<button onClick={() => { const n = new Set(revealed); isRevealed ? n.delete(child.id) : n.add(child.id); setRevealed(n); }} className="text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] transition-colors p-0.5">
															{isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
														</button>
														<button onClick={() => copy(child.api_key, child.id)} className="text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] transition-colors p-0.5">
															<Copy className="w-3 h-3" />
														</button>
														{copiedId === child.id && <span className="text-[9px] text-emerald-500 font-medium">Copied!</span>}
													</div>
													<div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--dashboard-text-muted)]">
														<span>{child.rate_limit} req/min</span>
														<span>{formatDate(child.expiry_date)}</span>
														<span>{child.total_requests} requests</span>
													</div>
												</div>
											</div>
											<div className="flex items-center gap-0.5 shrink-0">
												<button onClick={() => onRevoke(child.id)} className="p-1.5 rounded-lg text-[var(--dashboard-text-muted)] hover:text-amber-500 hover:bg-amber-500/5 transition-all" title="Revoke">
													<Shield className="w-3.5 h-3.5" />
												</button>
												<button onClick={() => onDelete(child.id)} className="p-1.5 rounded-lg text-[var(--dashboard-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all" title="Delete">
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function daysLeft(expiry: string) {
	if (!expiry) return Infinity;
	return Math.max(0, (new Date(expiry).getTime() - Date.now()) / 864e5);
}
