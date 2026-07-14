import { useState, useEffect } from "react";
import { type MetaFunction } from "react-router";
import { DashboardSidebar } from "../components/dashboard/dashboard-sidebar";
import {
	FiKey,
	FiCopy,
	FiTrash2,
	FiPlus,
	FiRefreshCw,
	FiEye,
	FiEyeOff,
	FiShield,
	FiClock,
	FiActivity,
	FiAlertTriangle,
} from "react-icons/fi";
import { supabase } from "~/utils/supabase";

interface ApiKey {
	id: string;
	name: string;
	key_prefix: string;
	plan_name: string;
	is_active: boolean;
	total_requests: number;
	tokens_used: number;
	tokens_limit: number;
	created_at: string;
	last_used_at: string;
	expires_at: string;
	rate_limit_rpm: number;
}

export const meta: MetaFunction = () => [
	{ title: "My Keys | Opuszen" },
	{ name: "description", content: "Manage your OpusZen API keys." },
];

export default function UserMyKeysRoute() {
	const [user, setUser] = useState<any>(null);
	const [keys, setKeys] = useState<ApiKey[]>([]);
	const [loading, setLoading] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [newKeyName, setNewKeyName] = useState("");
	const [newKeyPlan, setNewKeyPlan] = useState("Pro Plan (5x)");
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => setUser(data.user));
		fetchKeys();
	}, []);

	async function fetchKeys() {
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from("api_keys")
				.select("*")
				.order("created_at", { ascending: false });
			if (!error && data) setKeys(data as ApiKey[]);
		} catch {}
		setLoading(false);
	}

	async function createKey() {
		if (!newKeyName.trim()) return;
		const fullKey = `sk-ant-api03-${Math.random().toString(36).slice(2, 20)}`;
		const prefix = fullKey.slice(0, 16) + "...";
		try {
			const { error } = await supabase.from("api_keys").insert({
				name: newKeyName,
				key_prefix: prefix,
				full_key_hash: fullKey,
				plan_name: newKeyPlan,
				is_active: true,
				total_requests: 0,
				tokens_used: 0,
				tokens_limit: newKeyPlan.includes("10x") ? 10_000_000 : newKeyPlan.includes("5x") ? 5_000_000 : 1_000_000,
				rate_limit_rpm: 60,
				expires_at: new Date(Date.now() + 365 * 24 * 60 * 60_1000).toISOString(),
			});
			if (!error) {
				setCreatedKey(fullKey);
				setNewKeyName("");
				fetchKeys();
			}
		} catch {}
	}

	async function deleteKey(id: string) {
		try {
			await supabase.from("api_keys").delete().eq("id", id);
			setKeys((k) => k.filter((k) => k.id !== id));
		} catch {}
	}

	function toggleKeyActive(id: string, current: boolean) {
		setKeys((k) => k.map((k) => (k.id === id ? { ...k, is_active: !current } : k)));
		supabase.from("api_keys").update({ is_active: !current }).eq("id", id).then();
	}

	const copyToClipboard = (text: string, id: string) => {
		navigator.clipboard.writeText(text);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	const PLANS = ["Trial Plan", "Pro Plan (5x)", "Pro Plan (10x)", "Pro Plan (20x)"];

	return (
		<div className="min-h-screen bg-[#09090b] flex">
			{/* Mobile sidebar overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm md:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}
			{/* Mobile sidebar */}
			<div
				className={`fixed top-0 left-0 z-[60] h-full md:hidden transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
			>
				<DashboardSidebar
					collapsed={false}
					onToggle={() => setSidebarOpen(false)}
					userEmail={user?.email}
				/>
			</div>

			{/* Desktop sidebar */}
			<div className="hidden md:block shrink-0">
				<DashboardSidebar
					collapsed={false}
					onToggle={() => {}}
					userEmail={user?.email}
				/>
			</div>

			{/* Main content */}
			<main className="flex-1 min-h-screen">
				<header className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06]">
					<div className="flex items-center justify-between h-14 px-4 sm:px-8">
						<div className="flex items-center gap-3">
							<button
							onClick={() => setSidebarOpen(true)}
							className="md:hidden p-2 -ml-2 rounded-lg hover:bg-white/[0.06] text-zinc-400 transition-colors"
							aria-label="Open menu"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
								<path d="M4 6h16M4 12h16M4 18h16" />
							</svg>
						</button>
							<div>
								<h1 className="text-sm font-semibold text-white">My Keys</h1>
								<p className="text-[11px] text-zinc-500 hidden sm:block">
									{keys.length} key{keys.length !== 1 ? "s" : ""} configured
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={fetchKeys}
								disabled={loading}
								className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-50"
							>
								<FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
								<span className="hidden sm:inline">Refresh</span>
							</button>
							<button
								onClick={() => setShowCreateModal(true)}
								className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-all"
							>
								<FiPlus className="w-3.5 h-3.5" />
								New Key
							</button>
						</div>
					</div>
				</header>

				<div className="p-4 sm:p-8 max-w-[1200px]">
					{/* Stats */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
						<div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
							<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total Keys</p>
							<p className="text-2xl font-bold text-white mt-1">{keys.length}</p>
						</div>
						<div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
							<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Active</p>
							<p className="text-2xl font-bold text-emerald-400 mt-1">
								{keys.filter((k) => k.is_active).length}
							</p>
						</div>
						<div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
							<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total Requests</p>
							<p className="text-2xl font-bold text-indigo-400 mt-1">
								{keys.reduce((s, k) => s + (k.total_requests || 0), 0).toLocaleString()}
							</p>
						</div>
						<div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
							<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Expiring Soon</p>
							<p className="text-2xl font-bold text-amber-400 mt-1">
								{keys.filter((k) => {
									if (!k.expires_at) return false;
									const daysLeft = (new Date(k.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
									return daysLeft < 30 && daysLeft > 0;
								}).length}
							</p>
						</div>
					</div>

					{/* Keys list */}
					<div className="space-y-3">
						{keys.length === 0 && !loading && (
							<div className="text-center py-20 rounded-2xl border border-white/[0.06] bg-[#0c0c0f]">
								<FiKey className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
								<p className="text-sm text-zinc-400 font-medium">No API keys yet</p>
								<p className="text-xs text-zinc-600 mt-1">Create your first key to start using the API</p>
							</div>
						)}

						{keys.map((key) => {
							const isRevealed = revealedKeys.has(key.id);
							const usagePct = Math.min(100, ((key.tokens_used || 0) / (key.tokens_limit || 1)) * 100);
							const daysLeft = key.expires_at
								? Math.max(0, (new Date(key.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
								: Infinity;

							return (
								<div
									key={key.id}
									className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f] hover:border-white/[0.12] transition-all"
								>
									<div className="flex items-start justify-between gap-4">
										<div className="flex items-start gap-3 min-w-0">
											<div
												className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${key.is_active ? "bg-emerald-500" : "bg-zinc-600"}`}
											/>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<h3 className="text-sm font-semibold text-white truncate">{key.name}</h3>
													<span
														className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
															key.is_active
																? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
																: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
														}`}
													>
														{key.is_active ? "Active" : "Inactive"}
													</span>
												</div>
												<div className="flex items-center gap-2 mt-1.5">
													<code className="text-[11px] font-mono text-zinc-500 bg-white/[0.03] px-2 py-0.5 rounded">
														{isRevealed ? key.key_prefix.replace("...", "....") : key.key_prefix}
													</code>
													<button
														onClick={() =>
															setRevealedKeys((s) => {
																const n = new Set(s);
																n.has(key.id) ? n.delete(key.id) : n.add(key.id);
																return n;
															})
														}
														className="text-zinc-500 hover:text-zinc-300 transition-colors"
													>
														{isRevealed ? <FiEyeOff className="w-3 h-3" /> : <FiEye className="w-3 h-3" />}
													</button>
													<button
														onClick={() => copyToClipboard(key.key_prefix, key.id)}
														className="text-zinc-500 hover:text-zinc-300 transition-colors"
													>
														<FiCopy className="w-3 h-3" />
													</button>
													{copiedId === key.id && (
														<span className="text-[10px] text-emerald-400 font-medium">Copied!</span>
													)}
												</div>
											</div>
										</div>

										<div className="flex items-center gap-1 shrink-0">
											<button
												onClick={() => toggleKeyActive(key.id, key.is_active)}
												className={`p-2 rounded-lg transition-all cursor-pointer ${
													key.is_active
														? "text-zinc-400 hover:text-amber-400 hover:bg-amber-500/5"
														: "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5"
												}`}
												title={key.is_active ? "Deactivate" : "Activate"}
											>
												<FiShield className="w-4 h-4" />
											</button>
											<button
												onClick={() => deleteKey(key.id)}
												className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
												title="Delete key"
											>
												<FiTrash2 className="w-4 h-4" />
											</button>
										</div>
									</div>

									{/* Usage bar */}
									<div className="mt-4">
										<div className="flex items-center justify-between mb-1.5">
											<span className="text-[11px] text-zinc-500">Token Usage</span>
											<span className="text-[11px] font-mono text-zinc-400">
												{(key.tokens_used || 0).toLocaleString()} / {(key.tokens_limit || 0).toLocaleString()}
											</span>
										</div>
										<div className="w-full bg-zinc-800/60 rounded-full h-1.5 overflow-hidden">
											<div
												className={`h-full rounded-full transition-all ${
													usagePct > 80
														? "bg-rose-500"
														: usagePct > 50
															? "bg-amber-500"
															: "bg-indigo-500"
												}`}
												style={{ width: `${usagePct}%` }}
											/>
										</div>
									</div>

									{/* Meta row */}
									<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
										<span className="flex items-center gap-1.5">
											<FiActivity className="w-3 h-3" />
											{(key.total_requests || 0).toLocaleString()} requests
										</span>
										<span className="flex items-center gap-1.5">
											<FiClock className="w-3 h-3" />
											{daysLeft < 30 && daysLeft > 0
												? `Expires in ${Math.ceil(daysLeft)}d`
												: daysLeft <= 0
													? "Expired"
													: "No expiry"}
										</span>
										<span className="flex items-center gap-1.5">
											<FiShield className="w-3 h-3" />
											{key.rate_limit_rpm} req/min
										</span>
										<span>Plan: {key.plan_name}</span>
									</div>
								</div>
							);
						})}
					</div>

					{/* Create Key Modal */}
					{showCreateModal && (
						<div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
							<div
								className="absolute inset-0 bg-black/60 backdrop-blur-sm"
								onClick={() => {
									setShowCreateModal(false);
									setCreatedKey(null);
								}}
							/>
							<div className="relative w-full max-w-md bg-[#13131a] border border-white/[0.1] rounded-2xl p-6 shadow-2xl">
								<h2 className="text-lg font-bold text-white mb-1">Create New API Key</h2>
								<p className="text-xs text-zinc-500 mb-6">
									Generate a new key to authenticate API requests.
								</p>

								{createdKey ? (
									<div className="space-y-4">
										<div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
											<p className="text-xs font-semibold text-emerald-400 mb-2">
												Your new key (save it now!)
											</p>
											<div className="flex items-center gap-2">
												<code className="text-xs font-mono text-emerald-300 bg-black/20 px-3 py-2 rounded-lg flex-1 break-all">
													{createdKey}
												</code>
												<button
													onClick={() => copyToClipboard(createdKey, "new")}
													className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer shrink-0"
												>
													<FiCopy className="w-4 h-4" />
												</button>
											</div>
										</div>
										<p className="text-[11px] text-amber-400 flex items-center gap-1.5">
											<FiAlertTriangle className="w-3 h-3" />
											We cannot show this key again. Copy it somewhere safe.
										</p>
										<button
											onClick={() => {
												setShowCreateModal(false);
												setCreatedKey(null);
											}}
											className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all cursor-pointer"
										>
											Done
										</button>
									</div>
								) : (
									<div className="space-y-4">
										<div>
											<label className="block text-xs font-semibold text-zinc-400 mb-1.5">
												Key Name
											</label>
											<input
												type="text"
												value={newKeyName}
												onChange={(e) => setNewKeyName(e.target.value)}
												placeholder="e.g. Production, Dev, Testing..."
												className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
												onKeyDown={(e) => e.key === "Enter" && createKey()}
											/>
										</div>
										<div>
											<label className="block text-xs font-semibold text-zinc-400 mb-1.5">
												Plan
											</label>
											<select
												value={newKeyPlan}
												onChange={(e) => setNewKeyPlan(e.target.value)}
												className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
											>
												{PLANS.map((p) => (
													<option key={p} value={p}>
														{p}
													</option>
												))}
											</select>
										</div>
										<div className="flex gap-2 pt-2">
											<button
												onClick={() => {
													setShowCreateModal(false);
													setCreatedKey(null);
												}}
												className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
											>
												Cancel
											</button>
											<button
												onClick={createKey}
												disabled={!newKeyName.trim()}
												className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all disabled:opacity-40 cursor-pointer"
											>
												Create Key
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
