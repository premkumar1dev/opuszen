import { useCallback } from "react";
import { NavLink, useNavigate } from "react-router";
import { FiShield, FiLogOut, FiUsers, FiHome, FiKey, FiCreditCard, FiShoppingBag, FiSettings, FiGlobe, FiMail } from "react-icons/fi";
import { supabase } from "../../../utils/supabase";

interface AdminHeaderProps {
 adminEmail?: string;
}

export function AdminHeader({ adminEmail }: AdminHeaderProps) {
 const navigate = useNavigate();

 const handleLogout = useCallback(async () => {
 document.cookie = "admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict";
 try {
  await supabase.auth.signOut();
 } catch (e) {
 // silently ignore signOut errors
 }
 navigate("/auth/admin");
 }, [navigate]);

 return (
 <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/60 backdrop-blur-xl transition-all duration-200">
 <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
 <div className="flex items-center gap-6 sm:gap-8">
 <NavLink
 to="/auth/admin/dashboard"
 className="flex items-center gap-2.5 font-bold tracking-tight text-foreground transition-opacity hover:opacity-90"
 >
 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-600 shadow-md shadow-primary/20">
 <FiShield className="h-4.5 w-4.5 text-white" />
 </div>
 <span className="hidden sm:inline text-sm font-semibold">Admin Panel</span>
 </NavLink>

 <nav className="flex items-center gap-1.5 sm:gap-2">
 <NavLink
  to="/auth/admin/dashboard"
 end
 className={({ isActive }) => `
 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
 ${isActive
 ? "bg-primary/10 text-primary font-semibold"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}
 `}
 >
 <FiHome className="h-3.5 w-3.5" />
 <span>Dashboard</span>
 </NavLink>

 <NavLink
 to="/auth/admin/users"
 className={({ isActive }) => `
 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
 ${isActive
 ? "bg-primary/10 text-primary font-semibold"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}
 `}
 >
 <FiUsers className="h-3.5 w-3.5" />
 <span>Users</span>
 </NavLink>

 <NavLink
 to="/auth/admin/plans"
 className={({ isActive }) => `
 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
 ${isActive
 ? "bg-primary/10 text-primary font-semibold"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}
 `}
 >
 <FiCreditCard className="h-3.5 w-3.5" />
 <span>Plans</span>
 </NavLink>

 <NavLink
 to="/auth/admin/orders"
 className={({ isActive }) => `
 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
 ${isActive
 ? "bg-primary/10 text-primary font-semibold"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}
 `}
 >
 <FiShoppingBag className="h-3.5 w-3.5" />
 <span>Orders</span>
 </NavLink>

 <NavLink
 to="/auth/admin/settings/payments"
 className={({ isActive }) => `
 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
 ${isActive
 ? "bg-primary/10 text-primary font-semibold"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
 >
 <FiSettings className="h-3.5 w-3.5" />
 <span>Payments</span>
 </NavLink>

 <NavLink
 to="/auth/admin/settings/site"
 className={({ isActive }) => `
 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
 ${isActive
 ? "bg-primary/10 text-primary font-semibold"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
 >
 <FiGlobe className="h-3.5 w-3.5" />
 <span>Site</span>
 </NavLink>

 <NavLink
 to="/dashboard"
 className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
 >
 <FiKey className="h-3.5 w-3.5" />
 <span>API Keys</span>
 </NavLink>
 </nav>
 </div>

 <div className="flex items-center gap-3">
 {adminEmail && (
 <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/40 border border-border/40 text-[11px] text-muted-foreground">
 <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
 <span className="font-medium max-w-[150px] truncate">{adminEmail}</span>
  </div>
 )}

 <button
 onClick={handleLogout}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 cursor-pointer"
 title="Logout"
 >
 <FiLogOut className="h-3.5 w-3.5" />
 <span className="hidden sm:inline">Logout</span>
 </button>
 </div>
 </div>
 </header>
 );
}

export default AdminHeader;
