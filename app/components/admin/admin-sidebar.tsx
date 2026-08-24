import { type ReactNode } from "react";
import {
	Home,
	Users,
	CreditCard,
	ShoppingBag,
	Activity,
	Server,
	Settings,
	Shield,
	Key,
	RefreshCw,
	ChevronLeft,
	ChevronRight,
	Clock,
	Globe,
	Search,
	Share2,
	BarChart3,
	FileText,
} from "lucide-react";
import { IndianRupee } from "lucide-react";
import { NavLink } from "react-router";

interface SidebarItem {
	to?: string;
	label: string;
	icon?: typeof Home;
	end?: boolean;
	isHeader?: boolean;
}

const NAV_ITEMS: SidebarItem[] = [
	{ to: "/auth/admin/dashboard", label: "Dashboard", icon: Home, end: true },
	{ to: "/auth/admin/users", label: "Users", icon: Users },

	// API Management group
	{ label: "API Management", isHeader: true },
	{ to: "/auth/admin/gateway/user-keys", label: "API Keys", icon: Key },
	{ to: "/auth/admin/plans", label: "Plans", icon: CreditCard },
	{ to: "/auth/admin/assign-plans", label: "Assign Plans", icon: Globe },
	{ to: "/auth/admin/activity-logs", label: "Activity Logs", icon: Clock },

	{ to: "/auth/admin/orders", label: "Orders", icon: ShoppingBag },
	{ to: "/auth/admin/payments", label: "Payments", icon: IndianRupee },
	{ to: "/auth/admin/analytics", label: "Analytics", icon: Activity },
	{ to: "/auth/admin/gateway", label: "Gateway", icon: Server },
	{ to: "/auth/admin/gateway/keys", label: "Master Keys", icon: Key },
	{ to: "/auth/admin/gateway/logs", label: "Request Logs", icon: Clock },
	{ to: "/auth/admin/gateway/failover-logs", label: "Failover Logs", icon: Activity },
	{ to: "/auth/admin/gateway/health", label: "Health Monitor", icon: RefreshCw },

	// SEO & Marketing group
	{ label: "SEO & Marketing", isHeader: true },
	{ to: "/auth/admin/seo", label: "SEO Tools", icon: Search },
	{ to: "/auth/admin/social-links", label: "Social Links", icon: Share2 },
	{ to: "/auth/admin/seo?tab=analytics", label: "Analytics Settings", icon: BarChart3 },
	{ to: "/auth/admin/page-meta", label: "Page Meta Editor", icon: FileText },

	{ to: "/auth/admin/settings", label: "Settings", icon: Settings },
];

const SidebarContent = ({
	collapsed,
	adminEmail,
	onToggle,
}: {
	collapsed: boolean;
	adminEmail?: string;
	onToggle: () => void;
}) => (
	<>
		{/* Logo */}
		<div className="flex items-center h-16 px-4 border-b border-border/50 shrink-0">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
					<Shield className="h-4 w-4 text-white" />
				</div>
				{!collapsed && (
					<span className="text-sm font-bold tracking-tight text-foreground truncate transition-opacity duration-200">
						Admin Panel
					</span>
				)}
			</div>
		</div>

		{/* Navigation */}
		<nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5 custom-scrollbar">
			{NAV_ITEMS.map((item, idx) => {
				if (item.isHeader) {
					return (
						<div key={idx} className="px-3 pt-4 pb-1.5">
							<span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
								{item.label}
							</span>
						</div>
					);
				}

				const IconComp = item.icon!;
				return (
					<NavLink
						key={item.to}
						to={item.to!}
						end={item.end}
						className={({ isActive }) =>
							`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer
							${isActive
								? "bg-primary/10 text-primary font-semibold"
								: "text-muted-foreground hover:text-foreground hover:bg-muted/50"
							}`
						}
						title={collapsed ? item.label : undefined}
					>
						{({ isActive }: { isActive: boolean }) => (
							<>
								<span className={`shrink-0 w-[18px] h-[18px] flex items-center justify-center ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}>
									<IconComp className="w-[18px] h-[18px]" />
								</span>
								{!collapsed && (
									<span className="truncate transition-opacity duration-200">{item.label}</span>
								)}
							</>
						)}
					</NavLink>
				);
			})}
		</nav>

		{/* Bottom section */}
		<div className="border-t border-border/50 px-2.5 py-3 space-y-2 shrink-0">
			{/* Admin email */}
			{adminEmail && !collapsed && (
				<div className="px-3 py-2 rounded-lg bg-muted/40 border border-border/40">
					<div className="flex items-center gap-2">
						<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
						<span className="text-[11px] text-muted-foreground truncate">{adminEmail}</span>
					</div>
				</div>
			)}

			{/* Collapse toggle */}
			<button
				onClick={onToggle}
				className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer min-h-[44px]"
				title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
			>
				{!collapsed ? (
					<ChevronLeft className="w-4 h-4" />
				) : (
					<ChevronRight className="w-4 h-4" />
				)}
				<span className="hidden sm:inline">
					{collapsed ? "Expand" : "Collapse"}
				</span>
			</button>
		</div>
	</>
);

export function AdminSidebar({ collapsed, onToggle, adminEmail, mobileOpen, onMobileToggle }: {
	collapsed: boolean;
	onToggle: () => void;
	adminEmail?: string;
	mobileOpen?: boolean;
	onMobileToggle?: () => void;
}) {
	return (
		<>
			{/* Mobile overlay */}
			{mobileOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
					onClick={onMobileToggle}
				/>
			)}

			{/* Mobile sidebar */}
			<div className={`
				fixed top-0 left-0 z-50 h-screen md:hidden
				transition-transform duration-300 ease-in-out
				${mobileOpen ? "translate-x-0" : "-translate-x-full"}
			`}>
				<aside className="h-full w-[220px] bg-card border-r border-border flex flex-col overflow-y-auto">
					<SidebarContent collapsed={false} adminEmail={adminEmail} onToggle={onMobileToggle ?? (() => {})} />
				</aside>
			</div>

			{/* Desktop sidebar */}
			<aside
				className={`
					fixed top-0 left-0 z-40 h-screen
					bg-card border-r border-border
					transition-all duration-300 ease-in-out
					flex flex-col hidden md:flex
					${collapsed ? "w-[68px]" : "w-[220px]"}
				`}
			>
				<SidebarContent collapsed={collapsed} adminEmail={adminEmail} onToggle={onToggle} />
			</aside>
		</>
	);
}
