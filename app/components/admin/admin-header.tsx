import { useCallback } from "react";
import { NavLink, useNavigate } from "react-router";
import { Shield, LogOut, Users, Home, Key, CreditCard, ShoppingBag, Settings, Globe } from "lucide-react";
import { supabase } from "~/utils/supabase";

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
 console.error("[admin-header] Logout error:", e)
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
 <Shield className="h-4 w-4 text-white" />
 </div>
 <span className="hidden sm:inline text-sm font-semibold">Admin Panel</span>
 </NavLink>

 <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]">
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
 <Home className="h-3.5 w-3.5" />
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
 <Users className="h-3.5 w-3.5" />
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
 <CreditCard className="h-3.5 w-3.5" />
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
 <ShoppingBag className="h-3.5 w-3.5" />
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
 <Settings className="h-3.5 w-3.5" />
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
 <Globe className="h-3.5 w-3.5" />
 <span>Site</span>
 </NavLink>

 <NavLink
 to="/dashboard"
 className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
 >
 <Key className="h-3.5 w-3.5" />
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
 className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 cursor-pointer min-h-[44px]"
 title="Logout"
 >
 <LogOut className="h-3.5 w-3.5" />
 <span className="hidden sm:inline">Logout</span>
 </button>
 </div>
 </div>
 </header>
 );
}

export default AdminHeader;
