import { useState, useEffect } from "react";
import { type MetaFunction } from "react-router";
import { DashboardSidebar } from "../components/dashboard/dashboard-sidebar";
import {
	FiHelpCircle,
	FiMessageCircle,
	FiMail,
	FiBookOpen,
	FiSearch,
	FiSend,
	FiClock,
	FiCheckCircle,
	FiLoader,
	FiX,
} from "react-icons/fi";
import { supabase } from "~/utils/supabase";
import { useDashboardTheme } from "~/utils/theme";

interface Ticket {
	id: string;
	subject: string;
	message: string;
	status: "open" | "in_progress" | "resolved" | "closed";
	priority: "low" | "medium" | "high";
	created_at: string;
	resolved_at: string | null;
}

export const meta: MetaFunction = () => [
	{ title: "Support | Opuszen" },
	{ name: "description", content: "Get support for your OpusZen account." },
];

const STATUS: Record<string, { label: string; bg: string; text: string; border: string }> = {
	open: { label: "Open", bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
	in_progress: { label: "In Progress", bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
	resolved: { label: "Resolved", bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
	closed: { label: "Closed", bg: "bg-[var(--dashboard-nav-hover)]", text: "text-[var(--dashboard-text-muted)]", border: "border-[var(--dashboard-border)]" },
};

const PRIORITY: Record<string, { label: string; color: string }> = {
	low: { label: "Low", color: "text-[var(--dashboard-text-muted)]" },
	medium: { label: "Medium", color: "text-amber-500" },
	high: { label: "High", color: "text-red-500" },
};

export default function UserSupportRoute() {
	const { theme, toggleTheme } = useDashboardTheme();
	const [user, setUser] = useState<any>(null);
	const [tickets, setTickets] = useState<Ticket[]>([]);
	const [loading, setLoading] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [showNew, setShowNew] = useState(false);
	const [subject, setSubject] = useState("");
	const [message, setMessage] = useState("");
	const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
	const [submitting, setSubmitting] = useState(false);
	const [selected, setSelected] = useState<Ticket | null>(null);
	const [search, setSearch] = useState("");

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => setUser(data.user));
		fetchTickets();
	}, []);

	async function fetchTickets() {
		setLoading(true);
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) return;
			const { data } = await supabase.from("support_tickets").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
			if (data) setTickets(data as Ticket[]);
		} catch { }
		setLoading(false);
	}

	async function submit() {
		if (!subject.trim() || !message.trim()) return;
		setSubmitting(true);
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) return;
			const { error } = await supabase.from("support_tickets").insert({ subject, message, priority, status: "open", user_id: session.user.id });
			if (!error) { setSubject(""); setMessage(""); setPriority("medium"); setShowNew(false); fetchTickets(); }
		} catch { }
		setSubmitting(false);
	}

	const filtered = tickets.filter((t) => !search || t.subject.toLowerCase().includes(search.toLowerCase()) || t.message.toLowerCase().includes(search.toLowerCase()));
	const openCount = tickets.filter((t) => t.status === "open").length;

	return (
		<div className="dashboard flex min-h-screen">
			{sidebarOpen && <div className="fixed inset-0 z-[55] dashboard-overlay backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}
			<div className={`fixed top-0 left-0 z-[60] h-full md:hidden transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
				<DashboardSidebar collapsed={false} onToggle={() => setSidebarOpen(false)} userEmail={user?.email} theme={theme} onThemeToggle={toggleTheme} />
			</div>
			<div className="hidden md:block">
				<DashboardSidebar collapsed={false} onToggle={() => { }} userEmail={user?.email} theme={theme} onThemeToggle={toggleTheme} />
			</div>

			<main className="flex-1 min-h-screen md:ml-[240px]">
				<header className="sticky top-0 z-40 border-b border-[var(--dashboard-border)]" style={{ backgroundColor: `color-mix(in srgb, var(--dashboard-bg) 85%, transparent)`, WebkitBackdropFilter: 'saturate(180%) blur(8px)', backdropFilter: 'saturate(180%) blur(8px)' }}>
					<div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8 gap-2">
						<div className="flex items-center gap-3 min-w-0">
							<button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--dashboard-nav-hover)] text-[var(--dashboard-text-secondary)] transition-colors shrink-0" aria-label="Open menu">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
							</button>
							<div className="min-w-0">
								<h1 className="text-sm font-semibold text-[var(--dashboard-text)] truncate">Support</h1>
								<p className="text-[11px] text-[var(--dashboard-text-muted)] hidden sm:block">{openCount} open ticket{openCount !== 1 ? "s" : ""}</p>
							</div>
						</div>
						<button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-all touch-manipulation shrink-0"><FiSend className="w-3.5 h-3.5" /><span className="hidden sm:inline">New Ticket</span></button>
					</div>
				</header>

				<div className="p-4 sm:p-6 lg:p-8 max-w-[1000px] mx-auto w-full">
					{/* Quick help */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
						{[
							{ icon: FiBookOpen, title: "Documentation", desc: "Browse guides and API docs", to: "/docs" },
							{ icon: FiMessageCircle, title: "Live Chat", desc: "Chat with our support team" },
							{ icon: FiMail, title: "Email Support", desc: "support@opuszen.com", action: () => window.location.href = "mailto:support@opuszen.com" },
						].map((item, i) => (
							<div key={i} onClick={item.action} className="dashboard-card p-4 sm:p-5 rounded-2xl dashboard-card-hover transition-all cursor-pointer touch-manipulation active:scale-[0.98]">
								<div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 w-fit mb-3"><item.icon className="w-4 h-4 text-indigo-500" /></div>
								<p className="text-sm font-semibold text-[var(--dashboard-text)]">{item.title}</p>
								<p className="text-[11px] text-[var(--dashboard-text-muted)] mt-0.5">{item.desc}</p>
							</div>
						))}
					</div>

					{/* Tickets */}
					<div className="dashboard-card rounded-2xl overflow-hidden">
						<div className="px-4 sm:px-5 py-4 border-b border-[var(--dashboard-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div>
								<h3 className="text-sm font-semibold text-[var(--dashboard-text)]">Your Tickets</h3>
								<p className="text-[11px] text-[var(--dashboard-text-muted)] mt-0.5">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</p>
							</div>
							<div className="relative w-full sm:w-auto">
								<FiSearch className="w-3.5 h-3.5 text-[var(--dashboard-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
								<input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="dashboard-input pl-8 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500/50 transition-all w-full sm:w-40" />
							</div>
						</div>

						{loading ? (
							<div className="flex items-center justify-center py-12"><FiLoader className="w-6 h-6 animate-spin text-[var(--dashboard-text-muted)]" /></div>
						) : filtered.length === 0 ? (
							<div className="text-center py-12 sm:py-16 px-4">
								<FiHelpCircle className="w-10 h-10 text-[var(--dashboard-text-muted)] mx-auto mb-3" />
								<p className="text-sm text-[var(--dashboard-text-secondary)] font-medium">{search ? "No matching tickets" : "No tickets yet"}</p>
								<p className="text-xs text-[var(--dashboard-text-muted)] mt-1">{search ? "Try a different search term" : "Create a ticket and we'll help you out"}</p>
							</div>
						) : (
							<div className="divide-y divide-[var(--dashboard-border)]">
								{filtered.map((t) => {
									const cfg = STATUS[t.status] || STATUS.open;
									const prio = PRIORITY[t.priority] || PRIORITY.medium;
									return (
										<div key={t.id} onClick={() => setSelected(t)} className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-2 sm:gap-3 px-4 sm:px-5 py-4 hover:bg-[var(--dashboard-nav-hover)] transition-all cursor-pointer touch-manipulation active:bg-[var(--dashboard-nav-hover)]">
											<div className="flex items-start gap-3 min-w-0 flex-1">
												<div className={`p-1.5 rounded-lg shrink-0 ${cfg.bg}`}>
													{t.status === "resolved" || t.status === "closed" ? <FiCheckCircle className="w-4 h-4 text-emerald-500" /> : t.status === "in_progress" ? <FiClock className="w-4 h-4 text-amber-500" /> : <FiHelpCircle className="w-4 h-4 text-blue-500" />}
												</div>
												<div className="min-w-0 flex-1">
													<p className="text-sm font-medium text-[var(--dashboard-text)] truncate">{t.subject}</p>
													<p className="text-[11px] text-[var(--dashboard-text-muted)] mt-0.5 line-clamp-1">{t.message}</p>
													<p className="text-[10px] text-[var(--dashboard-text-muted)] mt-1">{new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} <span className="opacity-60">·</span> <span className={prio.color}>{prio.label}</span></p>
												</div>
											</div>
											<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>

				{/* New ticket modal */}
				{showNew && (
					<div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
						<div className="absolute inset-0 dashboard-overlay backdrop-blur-sm" onClick={() => setShowNew(false)} />
						<div className="dashboard-modal-bg dashboard-card relative w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl border border-[var(--dashboard-border)] max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
							<div className="flex items-center justify-between mb-5 sm:mb-6">
								<h2 className="text-base sm:text-lg font-bold text-[var(--dashboard-text)]">New Support Ticket</h2>
								<button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all" aria-label="Close"><FiX className="w-4 h-4" /></button>
							</div>
							<div className="space-y-4">
								<div>
									<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Subject</label>
									<input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief description..." className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-all" autoFocus />
								</div>
								<div>
									<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Priority</label>
									<div className="grid grid-cols-3 gap-2">
										{(["low", "medium", "high"] as const).map((p) => (
											<button key={p} onClick={() => setPriority(p)} className={`py-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer touch-manipulation ${priority === p ? "bg-indigo-500/15 text-indigo-500 border-indigo-500/30" : "border-[var(--dashboard-border)] text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-nav-hover)]"}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
										))}
									</div>
								</div>
								<div>
									<label className="block text-xs font-semibold text-[var(--dashboard-text-secondary)] mb-1.5">Message</label>
									<textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue..." rows={5} className="dashboard-input w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-all resize-none" />
								</div>
								<div className="flex gap-2 pt-2">
									<button onClick={() => setShowNew(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--dashboard-border)] text-sm font-medium text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all cursor-pointer touch-manipulation">Cancel</button>
									<button onClick={submit} disabled={!subject.trim() || !message.trim() || submitting} className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 touch-manipulation">
										{submitting ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiSend className="w-3.5 h-3.5" />}
										{submitting ? "Submitting..." : "Submit"}
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Detail modal */}
				{selected && (
					<div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
						<div className="absolute inset-0 dashboard-overlay backdrop-blur-sm" onClick={() => setSelected(null)} />
						<div className="dashboard-modal-bg dashboard-card relative w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl border border-[var(--dashboard-border)] max-h-[85vh] overflow-y-auto">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-base sm:text-lg font-bold text-[var(--dashboard-text)]">Ticket Details</h2>
								<button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all" aria-label="Close"><FiX className="w-4 h-4" /></button>
							</div>
							<div className="space-y-4">
								<div>
									<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider mb-1">Subject</p>
									<p className="text-sm font-medium text-[var(--dashboard-text)]">{selected.subject}</p>
								</div>
								<div className="flex flex-wrap gap-3">
									<div>
										<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider mb-1">Status</p>
										<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS[selected.status]?.bg} ${STATUS[selected.status]?.text} ${STATUS[selected.status]?.border}`}>{STATUS[selected.status]?.label}</span>
									</div>
									<div>
										<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider mb-1">Priority</p>
										<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY[selected.priority]?.color}`}>{PRIORITY[selected.priority]?.label}</span>
									</div>
								</div>
								<div>
									<p className="text-[10px] font-semibold text-[var(--dashboard-text-muted)] uppercase tracking-wider mb-1">Message</p>
									<p className="text-xs text-[var(--dashboard-text-secondary)] leading-relaxed whitespace-pre-wrap">{selected.message}</p>
								</div>
								<div className="text-[11px] text-[var(--dashboard-text-muted)]">Created {new Date(selected.created_at).toLocaleString()}</div>
							</div>
							<button onClick={() => setSelected(null)} className="w-full mt-6 py-2.5 rounded-xl border border-[var(--dashboard-border)] text-sm font-medium text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text)] hover:bg-[var(--dashboard-nav-hover)] transition-all cursor-pointer touch-manipulation">Close</button>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
