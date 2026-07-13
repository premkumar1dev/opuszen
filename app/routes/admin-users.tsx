import { useState, useCallback, useEffect } from "react";
import { type LoaderFunctionArgs, type MetaFunction, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { verifyAdminSession } from "../../utils/admin-auth";
import { supabase } from "../../utils/supabase";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { StatCard } from "~/components/admin/stat-card";
import { cn } from "@/lib/utils";
import {
 FiSearch,
 FiPlus,
 FiEdit2,
 FiTrash2,
 FiMoreVertical,
 FiMail,
 FiShield,
 FiCheck,
 FiX,
 FiChevronLeft,
 FiChevronRight,
 FiDownload,
 FiFilter,
 FiRefreshCw,
 FiUserCheck,
 FiUserX,
 FiLoader,
} from "react-icons/fi";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
 SheetFooter,
} from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export const meta: MetaFunction = () => {
 return [{ title: "Manage Users | Admin | OpusZen" }];
};

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

interface User {
 id: string;
 username: string;
 password: string;
 name: string;
  phone_number: string;
 account_balance: number;
 total_orders: number;
 total_spent: number;
 created_at: string;
}

interface FilterState {
 search: string;
}

/* ------------------------------------------------------------------ */
/* Loader */
/* ------------------------------------------------------------------ */

export async function loader({ request }: LoaderFunctionArgs) {
 const adminCheck = await verifyAdminSession(request);
 if (!adminCheck.isAdmin) {
 return redirect("/auth/admin");
 }

 const { data: users, error } = await supabase
 .from("users")
 .select("*")
 .order("created_at", { ascending: false });

 if (error) {
 return { users: [], error: error.message, adminEmail: adminCheck.adminEmail };
 }

 return { users: (users ?? []) as User[], error: null, adminEmail: adminCheck.adminEmail };
}

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function formatDate(iso: string | null): string {
 if (!iso) return "Never";
 const d = new Date(iso);
 if (isNaN(d.getTime())) return iso;
 const day = String(d.getDate()).padStart(2, "0");
 const month = String(d.getMonth() + 1).padStart(2, "0");
 const year = d.getFullYear();
 const time = d.toLocaleTimeString(undefined, {
 hour: "numeric",
 minute: "2-digit",
 hour12: true,
 });
 return `${day}/${month}/${year}, ${time}`;
}

function formatRelative(iso: string | null): string {
 if (!iso) return "Never";
 const diff = Date.now() - new Date(iso).getTime();
 const mins = Math.floor(diff / 60000);
 if (mins < 1) return "Just now";
 if (mins < 60) return `${mins}m ago`;
 const hours = Math.floor(mins / 60);
 if (hours < 24) return `${hours}h ago`;
 const days = Math.floor(hours / 24);
 if (days < 30) return `${days}d ago`;
 return formatDate(iso);
}

function getInitials(name: string): string {
 return name
 .split(" ")
 .map((n) => n[0])
 .join("")
 .toUpperCase()
 .slice(0, 2);
}

const AVATAR_COLORS = [
 "bg-indigo-500",
 "bg-violet-500",
 "bg-fuchsia-500",
 "bg-pink-500",
 "bg-rose-500",
 "bg-cyan-500",
 "bg-teal-500",
 "bg-emerald-500",
 "bg-amber-500",
 "bg-orange-500",
];

function getAvatarColor(id: string): string {
 const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
 return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatCurrency(n: number): string {
 return new Intl.NumberFormat("en-IN", {
 style: "currency",
 currency: "INR",
 minimumFractionDigits: 2,
 }).format(n);
}

/* ------------------------------------------------------------------ */
/* Edit User Sheet */
/* ------------------------------------------------------------------ */

interface EditUserSheetProps {
 user: User | null;
 isNew: boolean;
 onClose: () => void;
 onSave: (user: User) => void;
 onAdd: (user: User) => void;
 onDelete: (id: string) => void;
 saving: boolean;
}

function EditUserSheet({ user, isNew, onClose, onSave, onAdd, onDelete, saving }: EditUserSheetProps) {
 const [form, setForm] = useState<Partial<User>>({});
 const [deleting, setDeleting] = useState(false);

 useEffect(() => {
 if (user) {
 setForm({ ...user });
  } else if (isNew) {
 setForm({ username: "", password: "", name: "", phone_number: "", account_balance: 0, total_orders: 0, total_spent: 0 });
 setDeleting(false);
 }
 }, [user, isNew]);

 const handleSave = () => {
 if (!user && !isNew) return;
 if (isNew) {
 onAdd({ ...(form as User), id: crypto.randomUUID() });
 } else {
 onSave({ ...user, ...form } as User);
 }
 onClose();
 };

 const handleDelete = () => {
 if (!user) return;
 if (deleting) {
 onDelete(user.id);
 onClose();
 } else {
 setDeleting(true);
 }
 };

 return (
 <Sheet open={!!user || isNew} onOpenChange={(open) => !open && onClose()}>
 <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto">
 <SheetHeader>
 <SheetTitle className="flex items-center gap-2">
 {isNew ? <FiPlus className="w-4 h-4" /> : <FiEdit2 className="w-4 h-4" />}
 {isNew ? "Add New User" : "Edit User"}
 </SheetTitle>
 <SheetDescription>
 {isNew ? "Fill in the details to create a new user." : `${user?.name} — @${user?.username}`}
 </SheetDescription>
  </SheetHeader>

 <AnimatePresence mode="wait">
 {(user || isNew) && (
 <motion.div
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 transition={{ duration: 0.15 }}
 className="mt-6 space-y-5"
 >
 {/* Avatar Preview */}
 <div className="flex items-center gap-4">
 <div
 className={`w-14 h-14 rounded-2xl ${isNew ? "bg-gray-400" : getAvatarColor(user?.id ?? "")} flex items-center justify-center text-white font-bold text-lg`}
 >
 {user ? getInitials(user.name) : "?"}
 </div>
 <div>
 <p className="font-semibold text-foreground">{user?.name || "New User"}</p>
 <p className="text-sm text-muted-foreground">@{user?.username || "username"}</p>
 </div>
 </div>

 {/* Form Fields */}
 <div className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Display Name
 </label>
 <Input
 value={form.name ?? ""}
 onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
 placeholder="Full name"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Username
 </label>
 <Input
 value={form.username ?? ""}
 onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
 placeholder="Username"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Password
 </label>
 <Input
 value={form.password ?? ""}
 onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
 placeholder="Password"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Phone Number
 </label>
 <Input
 value={form.phone_number ?? ""}
 onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
 placeholder="Phone number"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Account Balance
 </label>
 <Input
 type="number"
 step="0.01"
 value={form.account_balance ?? 0}
 onChange={(e) =>
 setForm((f) => ({ ...f, account_balance: parseFloat(e.target.value) || 0 }))
 }
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Total Orders
 </label>
 <Input
 type="number"
 value={form.total_orders ?? 0}
 onChange={(e) =>
 setForm((f) => ({ ...f, total_orders: parseInt(e.target.value) || 0 }))
 }
 />
 </div>
  </div>

 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
 Total Spent
 </label>
 <Input
 type="number"
 step="0.01"
  value={form.total_spent ?? 0}
 onChange={(e) =>
 setForm((f) => ({ ...f, total_spent: parseFloat(e.target.value) || 0 }))
 }
 />
 </div>
 </div>

 {/* Stats Summary */}
 <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
 Account Info
 </p>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <p className="text-[10px] text-muted-foreground">Created At</p>
 <p className="text-sm font-bold text-foreground">
 {formatDate(user?.created_at ?? null)}
 </p>
 </div>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 <SheetFooter className="mt-6 pt-4 border-t border-border flex flex-col gap-2">
 <div className="flex gap-2">
 <Button
 variant="default"
 className="flex-1"
 onClick={handleSave}
 disabled={saving}
 >
 {saving ? (
 <>
 <FiLoader className="w-4 h-4 mr-1.5 animate-spin" />
 Saving…
 </>
 ) : (
 <>
 <FiCheck className="w-4 h-4 mr-1.5" />
 {isNew ? "Create User" : "Save Changes"}
 </>
 )}
 </Button>
 <Button
 variant="outline"
 className="flex-1"
 onClick={onClose}
 disabled={saving}
 >
 Cancel
 </Button>
 </div>
 {!isNew && (
 <Button
 variant="destructive"
 className="w-full"
 onClick={handleDelete}
 disabled={saving}
 >
 <FiTrash2 className="w-4 h-4 mr-1.5" />
 {deleting ? "Click again to confirm delete" : "Delete User"}
 </Button>
 )}
 </SheetFooter>
 </SheetContent>
 </Sheet>
 );
}

/* ------------------------------------------------------------------ */
/* Main Component */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 10;

export default function AdminUsersRoute() {
 const { users: initialUsers, error: loadError, adminEmail } = useLoaderData<{
 users: User[];
 error: string | null;
 adminEmail: string | null;
 }>();

 const [allUsers, setAllUsers] = useState<User[]>(initialUsers);
 const [loading, setLoading] = useState(false);
 const [saving, setSaving] = useState(false);
 const [filters, setFilters] = useState<FilterState>({
 search: "",
 });
 const [page, setPage] = useState(1);
 const [sortField, setSortField] = useState<keyof User>("created_at");
 const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
 const [selectedUser, setSelectedUser] = useState<User | null>(null);
 const [isNewUser, setIsNewUser] = useState(false);
 const [showFilters, setShowFilters] = useState(false);

 const refresh = useCallback(async () => {
 setLoading(true);
 const { data, error } = await supabase
 .from("users")
 .select("*")
 .order("created_at", { ascending: false });
 if (!error && data) setAllUsers(data as User[]);
 setLoading(false);
 }, []);

 const handleAdd = useCallback(async (newUser: User) => {
 setSaving(true);
 const { data, error } = await (supabase
 .from("users") as any)
 .insert({
 username: newUser.username,
 password: newUser.password,
 name: newUser.name,
 phone_number: newUser.phone_number,
 account_balance: newUser.account_balance,
 total_orders: newUser.total_orders,
 total_spent: newUser.total_spent,
 })
 .select()
 .single();

 if (!error && data) {
 setAllUsers((prev) => [data as User, ...prev]);
 } else {
 alert("Failed to create user: " + (error?.message ?? "Unknown error"));
 }
 setSaving(false);
 }, []);

 const handleSave = useCallback(async (updated: User) => {
 setSaving(true);
 const { error } = await (supabase
 .from("users") as any)
 .update({
 username: updated.username,
 password: updated.password,
 name: updated.name,
 phone_number: updated.phone_number,
 account_balance: updated.account_balance,
 total_orders: updated.total_orders,
 total_spent: updated.total_spent,
 })
 .eq("id", updated.id);

 if (!error) {
 setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
 } else {
 alert("Failed to save: " + (error?.message ?? "Unknown error"));
 }
 setSaving(false);
 }, []);

 const handleDelete = useCallback(async (id: string) => {
 setSaving(true);
 const { error } = await supabase.from("users").delete().eq("id", id);
 if (!error) {
 setAllUsers((prev) => prev.filter((u) => u.id !== id));
 setPage(1);
 } else {
 alert("Failed to delete: " + (error?.message ?? "Unknown error"));
 }
 setSaving(false);
 }, []);

 const handleExport = () => {
 const csv = [
 ["Username", "Password", "Name", "Phone Number", "Account Balance", "Total Orders", "Total Spent", "Created At"].join(","),
 ...allUsers.map((u) =>
 [
 `"${u.username}"`,
 `"${u.password}"`,
 `"${u.name}"`,
 `"${u.phone_number}"`,
 u.account_balance ?? 0.00,
 u.total_orders ?? 0,
 u.total_spent ?? 0.00,
 u.created_at,
 ].join(",")
 ),
 ].join("\n");

 const blob = new Blob([csv], { type: "text/csv" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 };

 const handleSort = (field: keyof User) => {
 if (sortField === field) {
 setSortDir((d) => (d === "asc" ? "desc" : "asc"));
 } else {
 setSortField(field);
 setSortDir("asc");
 }
 };

 // Filter & sort
 const filtered = allUsers.filter((u) => {
 if (filters.search) {
 const q = filters.search.toLowerCase();
 if (
 !u.name.toLowerCase().includes(q) &&
 !u.username.toLowerCase().includes(q) &&
 !u.phone_number.toLowerCase().includes(q)
 ) {
 return false;
 }
 }
 return true;
 });

 const sorted = [...filtered].sort((a, b) => {
 const valA = a[sortField];
 const valB = b[sortField];
 let cmp = 0;
 if (typeof valA === "string" && typeof valB === "string") {
 cmp = valA.localeCompare(valB);
 } else if (typeof valA === "number" && typeof valB === "number") {
 cmp = valA - valB;
 }
 return sortDir === "asc" ? cmp : -cmp;
 });

 const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
 const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

 const activeFilterCount = filters.search ? 1 : 0;

 const stats = {
 total: allUsers.length,
 totalOrders: allUsers.reduce((sum, u) => sum + (u.total_orders || 0), 0),
 totalBalance: allUsers.reduce((sum, u) => sum + Number(u.account_balance || 0), 0),
 totalSpent: allUsers.reduce((sum, u) => sum + Number(u.total_spent || 0), 0),
 };

 const SortIcon = ({ field }: { field: keyof User }) => (
 <span className="ml-1 inline-flex flex-col gap-[1px]">
 <FiChevronRight
 className={`w-2.5 h-2.5 -ml-0.5 transition-colors ${
 sortField === field && sortDir === "asc" ? "text-primary" : "text-muted-foreground/40"
 }`}
 style={{ transform: "rotate(-90deg)" }}
 />
 <FiChevronRight
 className={`w-2.5 h-2.5 -ml-0.5 -mt-[3px] transition-colors ${
  sortField === field && sortDir === "desc" ? "text-primary" : "text-muted-foreground/40"
 }`}
 style={{ transform: "rotate(90deg)" }}
 />
 </span>
 );

 return (
 <div className="min-h-screen bg-background text-foreground">
 <AdminSidebar collapsed={false} onToggle={() => {}} adminEmail={adminEmail || undefined} />
 <main className="ml-[220px] min-h-screen">
 <div className="max-w-[1200px]">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
 <div>
 <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
 User Management
 </div>
 <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-gradient">
 All Users
 </h1>
 <p className="text-muted-foreground text-sm mt-1">
 {filtered.length} of {allUsers.length} users
 {activeFilterCount > 0 ? ` (${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} active)` : ""}
  </p>
 </div>

 <div className="flex items-center gap-2 flex-wrap">
 <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
 <FiDownload className="w-3.5 h-3.5" />
 Export
 </Button>
 <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
 <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
 Refresh
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setShowFilters((v) => !v)}
 className="gap-1.5"
 >
 <FiFilter className="w-3.5 h-3.5" />
 Filters
 {activeFilterCount > 0 && (
 <span className="ml-1 w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
 {activeFilterCount}
 </span>
 )}
 </Button>
 <Button size="sm" className="gap-1.5" onClick={() => { setSelectedUser(null); setIsNewUser(true); }}>
 <FiPlus className="w-3.5 h-3.5" />
 Add User
 </Button>
 </div>
 </div>

 {/* Error Banner */}
 {loadError && (
 <div className="mb-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-sm">
 Failed to load users: {loadError}. Check your Supabase configuration.
 </div>
 )}

 {/* Stats Row */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
 {[
 { label: "Total Users", value: stats.total, color: "text-foreground" },
 { label: "Total Orders", value: stats.totalOrders, color: "text-emerald-500" },
 { label: "Total Balance", value: formatCurrency(stats.totalBalance), color: "text-fuchsia-500" },
 { label: "Total Spent", value: formatCurrency(stats.totalSpent), color: "text-amber-500" },
 ].map((stat) => (
 <div key={stat.label} className="p-4 rounded-xl border border-border bg-card dark:bg-card/60">
 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
 {stat.label}
 </p>
 <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
 </div>
 ))}
 </div>

  {/* Filter Bar */}
 <AnimatePresence>
 {showFilters && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: "auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden mb-4"
 >
 <div className="p-4 rounded-xl border border-border bg-card dark:bg-card/60 flex flex-wrap gap-3 items-end">
 <div className="flex-1 min-w-[200px]">
 <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
 Search
 </label>
 <Input
 placeholder="Name, username or phone..."
 value={filters.search}
 onChange={(e) => {
 setFilters((f) => ({ ...f, search: e.target.value }));
 setPage(1);
 }}
 className="h-9"
 />
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setFilters({ search: "" })}
 className="h-9"
 >
 <FiRefreshCw className="w-3.5 h-3.5 mr-1" />
 Clear
 </Button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Table */}
 <div className="rounded-2xl border border-border bg-card dark:bg-card/60 overflow-hidden">
 {loading && allUsers.length === 0 ? (
 <div className="flex items-center justify-center py-20">
 <FiLoader className="w-8 h-8 animate-spin text-muted-foreground" />
 </div>
 ) : (
 <>
 <div className="overflow-x-auto">
 <table className="w-full text-sm text-left">
 <thead>
 <tr className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border">
 <th
 className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
 onClick={() => handleSort("name")}
 >
 <span className="flex items-center">User <SortIcon field="name" /></span>
 </th>
 <th
 className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
 onClick={() => handleSort("password")}
 >
 <span className="flex items-center">Password <SortIcon field="password" /></span>
 </th>
 <th
 className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
 onClick={() => handleSort("created_at")}
 >
 <span className="flex items-center">Created At <SortIcon field="created_at" /></span>
 </th>
 <th
 className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors text-right"
 onClick={() => handleSort("account_balance")}
 >
 <span className="flex items-center justify-end">Balance <SortIcon field="account_balance" /></span>
 </th>
 <th
 className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors text-right"
 onClick={() => handleSort("total_orders")}
 >
 <span className="flex items-center justify-end">Orders <SortIcon field="total_orders" /></span>
 </th>
 <th
 className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground transition-colors text-right"
 onClick={() => handleSort("total_spent")}
 >
 <span className="flex items-center justify-end">Total Spent <SortIcon field="total_spent" /></span>
 </th>
 <th className="px-4 py-3 font-semibold text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {paginated.length === 0 ? (
 <tr>
 <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
 <div className="flex flex-col items-center gap-2">
 <FiUserX className="w-8 h-8 opacity-40" />
 <p className="text-sm font-medium">No users found</p>
 <p className="text-xs">Try adjusting your filters</p>
 </div>
 </td>
 </tr>
 ) : (
 paginated.map((user) => (
 <tr key={user.id} className="hover:bg-muted/10 transition-colors group">
 {/* User cell */}
 <td className="px-4 py-3">
 <div className="flex items-center gap-3">
 <div
 className={`w-8 h-8 rounded-lg ${getAvatarColor(user.id)} flex items-center justify-center text-white font-bold text-xs shrink-0`}
 >
 {getInitials(user.name)}
 </div>
 <div className="min-w-0">
  <p className="font-medium text-foreground truncate max-w-[160px]">
 {user.name}
 </p>
 <p className="text-xs text-muted-foreground truncate max-w-[180px]">
 @{user.username} {user.phone_number ? `• ${user.phone_number}` : ""}
 </p>
 </div>
 </div>
 </td>

 {/* Password */}
 <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
 {user.password}
 </td>

 {/* Created At */}
 <td className="px-4 py-3 text-xs text-muted-foreground">
 {formatDate(user.created_at)}
 </td>

 {/* Balance */}
 <td className="px-4 py-3 text-right font-mono text-xs text-foreground">
 {formatCurrency(user.account_balance)}
 </td>

 {/* Orders */}
 <td className="px-4 py-3 text-right font-mono text-xs text-foreground">
 {user.total_orders}
 </td>

 {/* Total Spent */}
 <td className="px-4 py-3 text-right font-mono text-xs text-foreground">
 {formatCurrency(user.total_spent)}
 </td>

 {/* Actions */}
 <td className="px-4 py-3">
 <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => setSelectedUser(user)}
 className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
 title="Edit user"
 type="button"
 >
 <FiEdit2 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => {
 if (confirm(`Delete user "${user.name}"?`)) {
 handleDelete(user.id);
 }
 }}
 className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
 title="Delete user"
 type="button"
 >
 <FiTrash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </td>
  </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
 <p className="text-xs text-muted-foreground">
 Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
 </p>
 <div className="flex items-center gap-1">
 <Button
 variant="outline"
 size="sm"
 className="w-8 h-8 p-0"
 onClick={() => setPage((p) => Math.max(1, p - 1))}
 disabled={page === 1}
 >
 <FiChevronLeft className="w-4 h-4" />
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
 {totalPages > 5 && (
 <span className="px-1 text-xs text-muted-foreground">…</span>
 )}
 <Button
 variant="outline"
 size="sm"
 className="w-8 h-8 p-0"
 onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
 disabled={page === totalPages}
 >
 <FiChevronRight className="w-4 h-4" />
 </Button>
 </div>
 </div>
 </>
 )}
 </div>

 {/* Edit Sheet */}
 <EditUserSheet
 user={selectedUser}
 isNew={isNewUser}
 onClose={() => { setSelectedUser(null); setIsNewUser(false); }}
 onSave={handleSave}
 onAdd={handleAdd}
 onDelete={handleDelete}
 saving={saving}
 />
 </div>
 </main>
 </div>
 );
}
