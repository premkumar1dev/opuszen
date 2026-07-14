import {
	FiHome,
	FiKey,
	FiActivity,
	FiChevronLeft,
	FiChevronRight,
	FiLogOut,
	FiZap,
	FiShoppingBag,
	FiGift,
	FiHelpCircle,
	FiUser,
} from "react-icons/fi";
import { NavLink } from "react-router";
import { useState } from "react";

interface DashboardSidebarProps {
 collapsed: boolean;
 onToggle: () => void;
 userEmail?: string;
 onLogout?: () => void;
}

const NAV_ITEMS = [
 { to: "/user/dashboard", label: "Overview", icon: FiHome, end: true },
 { to: "/user/my-keys", label: "My Keys", icon: FiKey },
 { to: "/user/orders", label: "Orders", icon: FiShoppingBag },
 { to: "/user/refer-earn", label: "Refer & Earn", icon: FiGift },
 { to: "/docs", label: "Documentation", icon: FiActivity },
 { to: "/user/support", label: "Support", icon: FiHelpCircle },
 { to: "/user/account", label: "Account", icon: FiUser },
];

export function DashboardSidebar({ collapsed, onToggle, userEmail, onLogout }: DashboardSidebarProps) {
 return (
 <aside
 className={`
 fixed top-0 left-0 z-50 h-screen
 bg-[#0c0c0f] border-r border-white/[0.06]
 transition-all duration-300 ease-in-out
 flex flex-col
 ${collapsed ? "w-[68px]" : "w-[240px]"}
 `}
 >
 {/* Logo */}
 <div className="flex items-center h-16 px-4 border-b border-white/[0.06] shrink-0">
 <div className="flex items-center gap-2.5 min-w-0">
 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
 <FiZap className="h-4 w-4 text-white" />
 </div>
 {!collapsed && (
 <div className="transition-opacity duration-200">
 <span className="text-sm font-bold tracking-tight text-white">OpusZen</span>
 <span className="text-[10px] text-zinc-500 block -mt-0.5 font-medium">Dashboard</span>
 </div>
 )}
 </div>
 </div>

 {/* Navigation */}
 <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-0.5">
 <p className={`text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 mb-2 ${collapsed ? "sr-only" : ""}`}>
 Main Menu
 </p>
 {NAV_ITEMS.map((item) => (
 <NavLink
 key={item.to}
 to={item.to}
 end={item.end}
 className={({ isActive }) =>
 `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer
 ${isActive
 ? "bg-indigo-500/10 text-indigo-400 font-semibold"
 : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
 }`
 }
 title={collapsed ? item.label : undefined}
 >
 {({ isActive }: { isActive: boolean }) => (
 <>
 <span className={`shrink-0 w-[18px] h-[18px] flex items-center justify-center ${isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"}`}>
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
 <div className="border-t border-white/[0.06] px-2.5 py-3 space-y-2 shrink-0">
 {userEmail && !collapsed && (
 <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
 <div className="flex items-center gap-2">
 <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
 <span className="text-[11px] text-zinc-400 truncate">{userEmail}</span>
 </div>
 </div>
 )}

 {onLogout && (
 <button
 onClick={onLogout}
 className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
 title={collapsed ? "Logout" : undefined}
 >
 <FiLogOut className={`shrink-0 ${collapsed ? "w-[18px] h-[18px]" : "w-4 h-4"}`} />
 {!collapsed && <span>Sign Out</span>}
 </button>
 )}

 {/* Collapse toggle */}
 <button
 onClick={onToggle}
 className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] transition-all cursor-pointer"
 title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
 >
 {collapsed ? (
 <FiChevronRight className="w-4 h-4" />
 ) : (
 <>
 <FiChevronLeft className="w-4 h-4" />
 <span className="hidden sm:inline">Collapse</span>
 </>
 )}
 </button>
 </div>
 </aside>
 );
}
