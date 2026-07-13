import { type ReactNode } from "react";
import {
	FiHome,
	FiUsers,
	FiCreditCard,
	FiShoppingBag,
	FiActivity,
	FiServer,
	FiSettings,
	FiShield,
	FiKey,
	FiRefreshCw,
	FiChevronLeft,
	FiChevronRight,
	FiClock,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa6";
import { NavLink } from "react-router";

interface AdminSidebarProps {
	collapsed: boolean;
	onToggle: () => void;
	adminEmail?: string;
}

const NAV_ITEMS = [
	{ to: "/auth/admin/dashboard", label: "Dashboard", icon: FiHome, end: true },
	{ to: "/auth/admin/users", label: "Users", icon: FiUsers },
	{ to: "/auth/admin/plans", label: "Plans", icon: FiCreditCard },
	{ to: "/auth/admin/orders", label: "Orders", icon: FiShoppingBag },
	{ to: "/auth/admin/payments", label: "Payments", icon: FaRupeeSign },
	{ to: "/auth/admin/analytics", label: "Analytics", icon: FiActivity },
	{ to: "/auth/admin/gateway", label: "Gateway", icon: FiServer },
	{ to: "/auth/admin/gateway/keys", label: "Master Keys", icon: FiKey },
	{ to: "/auth/admin/gateway/user-keys", label: "User Keys", icon: FiShield },
	{ to: "/auth/admin/gateway/logs", label: "Request Logs", icon: FiClock },
	{ to: "/auth/admin/gateway/failover-logs", label: "Failover Logs", icon: FiActivity },
	{ to: "/auth/admin/gateway/health", label: "Health Monitor", icon: FiRefreshCw },
	{ to: "/auth/admin/settings", label: "Settings", icon: FiSettings },
];

export function AdminSidebar({ collapsed, onToggle, adminEmail }: AdminSidebarProps) {
	return (
		<aside
			className={`
				fixed top-0 left-0 z-50 h-screen
				bg-card border-r border-border
				transition-all duration-300 ease-in-out
				flex flex-col
				${collapsed ? "w-[68px]" : "w-[220px]"}
			`}
		>
			{/* Logo */}
			<div className="flex items-center h-16 px-4 border-b border-border/50 shrink-0">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
						<FiShield className="h-4 w-4 text-white" />
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
				{NAV_ITEMS.map((item) => (
					<NavLink
						key={item.to}
						to={item.to}
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
									<item.icon className="w-[18px] h-[18px]" />
								</span>
								{!collapsed && (
									<span className="truncate transition-opacity duration-200">{item.label}</span>
								)}
							</>
						)}
					</NavLink>
				))}
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
					className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer"
					title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				>
					{!collapsed ? (
						<FiChevronLeft className="w-4 h-4" />
					) : (
						<FiChevronRight className="w-4 h-4" />
					)}
					<span className="hidden sm:inline">
						{collapsed ? "Expand" : "Collapse"}
					</span>
				</button>
			</div>
		</aside>
	);
}
