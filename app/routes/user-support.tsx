import { useState, useEffect, useRef } from "react";
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
	FiCheck,
	FiCheckCircle,
	FiLoader,
	FiX,
} from "react-icons/fi";
import { supabase } from "~/utils/supabase";

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

export default function UserSupportRoute() {
	const [user, setUser] = useState<any>(null);
	const [tickets, setTickets] = useState<Ticket[]>([]);
	const [loading, setLoading] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [showNewTicket, setShowNewTicket] = useState(false);
	const [subject, setSubject] = useState("");
	const [message, setMessage] = useState("");
	const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
	const [submitting, setSubmitting] = useState(false);
	const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => setUser(data.user));
		fetchTickets();
	}, []);

	async function fetchTickets() {
		setLoading(true);
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) return;
			const { data } = await supabase
				.from("support_tickets")
				.select("*")
				.eq("user_id", session.user.id)
				.order("created_at", { ascending: false });
			if (data) setTickets(data as Ticket[]);
		} catch {}
		setLoading(false);
	}

	async function submitTicket() {
		if (!subject.trim() || !message.trim()) return;
		setSubmitting(true);
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) return;
			const { error } = await supabase.from("support_tickets").insert({
				subject,
				message,
				priority,
				status: "open",
				user_id: session.user.id,
			});
			if (!error) {
				setSubject("");
				setMessage("");
				setPriority("medium");
				setShowNewTicket(false);
				fetchTickets();
			}
		} catch {}
		setSubmitting(false);
	}

	const filtered = tickets.filter((t) => {
		if (!searchQuery) return true;
		const q = searchQuery.toLowerCase();
		return t.subject.toLowerCase().includes(q) || t.message.toLowerCase().includes(q);
	});

	const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
		open: { label: "Open", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
		in_progress: { label: "In Progress", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
		resolved: { label: "Resolved", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
		closed: { label: "Closed", bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" },
	};

	const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
		low: { label: "Low", color: "text-zinc-400" },
		medium: { label: "Medium", color: "text-amber-400" },
		high: { label: "High", color: "text-red-400" },
	};

	return (
		<div className="min-h-screen bg-[#09090b] flex">
			{/* Mobile sidebar overlay */}
			{sidebarOpen && (
				<div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
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
								<h1 className="text-sm font-semibold text-white">Support</h1>
								<p className="text-[11px] text-zinc-500 hidden sm:block">
									{tickets.filter((t) => t.status === "open").length} open ticket{tickets.filter((t) => t.status === "open").length !== 1 ? "s" : ""}
								</p>
							</div>
						</div>
						<button
							onClick={() => setShowNewTicket(true)}
							className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-all"
						>
							<FiSend className="w-3.5 h-3.5" />
							New Ticket
						</button>
					</div>
				</header>

				<div className="p-4 sm:p-8 max-w-[1000px]">
					{/* Quick help */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
						{[
							{ icon: FiBookOpen, title: "Documentation", desc: "Browse guides and API docs", to: "/docs" },
							{ icon: FiMessageCircle, title: "Live Chat", desc: "Chat with our support team" },
							{ icon: FiMail, title: "Email Support", desc: "support@opuszen.com", action: () => window.location.href = "mailto:support@opuszen.com" },
						].map((item, i) => (
							<div
								key={i}
								onClick={item.action}
								className={`p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0f] hover:border-white/[0.12] transition-all ${item.to ? "cursor-pointer" : ""}`}
							>
								<div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 w-fit mb-3">
									<item.icon className="w-4 h-4 text-indigo-400" />
								</div>
								<p className="text-sm font-semibold text-white">{item.title}</p>
								<p className="text-[11px] text-zinc-500 mt-0.5">{item.desc}</p>
								{item.to && (
									<span className="text-[11px] text-indigo-400 font-medium mt-2 inline-block">Visit page →</span>
								)}
							</div>
						))}
					</div>

					{/* Tickets list */}
					<div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0f] overflow-hidden">
						<div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
							<div>
								<h3 className="text-sm font-semibold text-white">Your Tickets</h3>
								<p className="text-[11px] text-zinc-500 mt-0.5">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</p>
							</div>
							<div className="relative">
								<FiSearch className="w-3.5 h-3.5 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search..."
									className="pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all w-40"
								/>
							</div>
						</div>

						{loading ? (
							<div className="flex items-center justify-center py-12">
								<FiLoader className="w-6 h-6 animate-spin text-zinc-600" />
							</div>
						) : filtered.length === 0 ? (
							<div className="text-center py-16">
								<FiHelpCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
								<p className="text-sm text-zinc-400 font-medium">
									{searchQuery ? "No matching tickets" : "No tickets yet"}
								</p>
								<p className="text-xs text-zinc-600 mt-1">
									{searchQuery ? "Try a different search term" : "Create a ticket and we'll help you out"}
								</p>
							</div>
						) : (
							<div className="divide-y divide-white/[0.04]">
								{filtered.map((ticket) => {
									const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
									const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
									return (
										<div
											key={ticket.id}
											onClick={() => setSelectedTicket(ticket)}
											className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all cursor-pointer"
										>
											<div className="flex items-start gap-3 min-w-0">
												<div className={`p-1.5 rounded-lg shrink-0 ${statusCfg.bg}`}>
													{ticket.status === "resolved" || ticket.status === "closed" ? (
														<FiCheckCircle className="w-4 h-4 text-emerald-400" />
													) : ticket.status === "in_progress" ? (
														<FiClock className="w-4 h-4 text-amber-400" />
													) : (
														<FiHelpCircle className="w-4 h-4 text-blue-400" />
													)}
												</div>
												<div className="min-w-0">
													<p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
													<p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{ticket.message}</p>
													<p className="text-[10px] text-zinc-600 mt-1">
														{new Date(ticket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
														{" · "}
														<span className={priorityCfg.color}>{priorityCfg.label}</span>
													</p>
												</div>
											</div>
											<span
												className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
											>
												{statusCfg.label}
											</span>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>

				{/* New Ticket Modal */}
				{showNewTicket && (
					<div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
						<div
							className="absolute inset-0 bg-black/60 backdrop-blur-sm"
							onClick={() => setShowNewTicket(false)}
						/>
						<div className="relative w-full max-w-lg bg-[#13131a] border border-white/[0.1] rounded-2xl p-6 shadow-2xl">
							<div className="flex items-center justify-between mb-6">
								<h2 className="text-lg font-bold text-white">New Support Ticket</h2>
								<button
									onClick={() => setShowNewTicket(false)}
									className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
								>
									<FiX className="w-4 h-4" />
								</button>
							</div>

							<div className="space-y-4">
								<div>
									<label className="block text-xs font-semibold text-zinc-400 mb-1.5">Subject</label>
									<input
										type="text"
										value={subject}
										onChange={(e) => setSubject(e.target.value)}
										placeholder="Brief description of your issue..."
										className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
									/>
								</div>
								<div>
									<label className="block text-xs font-semibold text-zinc-400 mb-1.5">Priority</label>
									<div className="flex gap-2">
										{(["low", "medium", "high"] as const).map((p) => (
											<button
												key={p}
												onClick={() => setPriority(p)}
												className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
													priority === p
														? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
														: "border-white/[0.08] text-zinc-400 hover:bg-white/[0.04]"
												}`}
											>
												{p.charAt(0).toUpperCase() + p.slice(1)}
											</button>
										))}
									</div>
								</div>
								<div>
									<label className="block text-xs font-semibold text-zinc-400 mb-1.5">Message</label>
									<textarea
										value={message}
										onChange={(e) => setMessage(e.target.value)}
										placeholder="Describe your issue in detail..."
										rows={5}
										className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
									/>
								</div>
								<div className="flex gap-2 pt-2">
									<button
										onClick={() => setShowNewTicket(false)}
										className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
									>
										Cancel
									</button>
									<button
										onClick={submitTicket}
										disabled={!subject.trim() || !message.trim() || submitting}
										className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
									>
										{submitting ? (
											<FiLoader className="w-3.5 h-3.5 animate-spin" />
										) : (
											<FiSend className="w-3.5 h-3.5" />
										)}
										{submitting ? "Submitting..." : "Submit Ticket"}
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Ticket Detail Modal */}
				{selectedTicket && (
					<div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
						<div
							className="absolute inset-0 bg-black/60 backdrop-blur-sm"
							onClick={() => setSelectedTicket(null)}
						/>
						<div className="relative w-full max-w-md bg-[#13131a] border border-white/[0.1] rounded-2xl p-6 shadow-2xl">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-lg font-bold text-white">Ticket Details</h2>
								<button
									onClick={() => setSelectedTicket(null)}
									className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06]"
								>
									<FiX className="w-4 h-4" />
								</button>
							</div>
							<div className="space-y-4">
								<div>
									<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Subject</p>
									<p className="text-sm font-medium text-white">{selectedTicket.subject}</p>
								</div>
								<div className="flex gap-3">
									<div>
										<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Status</p>
										<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CONFIG[selectedTicket.status]?.bg} ${STATUS_CONFIG[selectedTicket.status]?.text} ${STATUS_CONFIG[selectedTicket.status]?.border}`}>
											{STATUS_CONFIG[selectedTicket.status]?.label}
										</span>
									</div>
									<div>
										<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Priority</p>
										<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_CONFIG[selectedTicket.priority]?.color}`}>
											{PRIORITY_CONFIG[selectedTicket.priority]?.label}
										</span>
									</div>
								</div>
								<div>
									<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Message</p>
									<p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
								</div>
								<div className="text-[11px] text-zinc-600">
									Created {new Date(selectedTicket.created_at).toLocaleString()}
								</div>
							</div>
							<button
								onClick={() => setSelectedTicket(null)}
								className="w-full mt-6 py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
							>
								Close
							</button>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
