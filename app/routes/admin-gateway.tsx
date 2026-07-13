import { type LoaderFunctionArgs, type MetaFunction, redirect, Link } from "react-router";
import { useLoaderData } from "react-router";
import { useState } from "react";
import { verifyAdminSession } from "../../utils/admin-auth";
import { AdminSidebar } from "~/components/admin/admin-sidebar";
import { cn } from "@/lib/utils";
import { FiServer, FiCpu, FiHardDrive, FiZap, FiGlobe, FiShield, FiRefreshCw, FiPlay, FiSquare, FiAlertTriangle, FiCheckCircle, FiXCircle, FiClock, FiCopy, FiChevronDown, FiKey, FiActivity, FiUsers, FiSettings } from "react-icons/fi";

export const meta: MetaFunction = () => [{ title: "API Gateway | Admin | OpusZen" }];

interface ServiceNode {
	id: string;
	name: string;
	status: "running" | "stopped" | "degraded";
	uptime: string;
	cpu: number;
	memory: number;
	requests: number;
	errors: number;
}

interface LoaderData {
	services: ServiceNode[];
	globalStatus: "operational" | "degraded" | "outage";
	totalRPS: number;
	totalRequests24h: number;
	avgResponseTime: number;
	adminEmail: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
	const adminCheck = await verifyAdminSession(request);
	if (!adminCheck.isAdmin) return redirect("/auth/admin");

	const services: ServiceNode[] = [
		{ id: "gw-1", name: "API Gateway (Primary)", status: "running", uptime: "14d 6h 23m", cpu: 34, memory: 62, requests: 28450, errors: 12 },
		{ id: "gw-2", name: "API Gateway (Replica)", status: "running", uptime: "14d 6h 23m", cpu: 28, memory: 55, requests: 22100, errors: 5 },
		{ id: "auth-1", name: "Auth Service", status: "running", uptime: "14d 6h 23m", cpu: 12, memory: 34, requests: 15200, errors: 0 },
		{ id: "rate-1", name: "Rate Limiter", status: "running", uptime: "14d 6h 23m", cpu: 8, memory: 22, requests: 50550, errors: 3 },
		{ id: "cache-1", name: "Cache Layer (Redis)", status: "degraded", uptime: "7d 12h 5m", cpu: 45, memory: 78, requests: 42000, errors: 2 },
		{ id: "db-1", name: "Database (PostgreSQL)", status: "running", uptime: "30d 2h 11m", cpu: 22, memory: 48, requests: 18500, errors: 1 },
	];

	return {
		services,
		globalStatus: "operational",
		totalRPS: 342,
		totalRequests24h: 148293,
		avgResponseTime: 87,
		adminEmail: adminCheck.adminEmail,
	};
}

export default function AdminGatewayRoute() {
	const { services, globalStatus, totalRPS, totalRequests24h, avgResponseTime, adminEmail } = useLoaderData<LoaderData>();
	const [selectedService, setSelectedService] = useState<ServiceNode | null>(services[0]);

	const StatusBadge = ({ status }: { status: string }) => (
		<span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${status === "running" ? "bg-emerald-500/10 text-emerald-500" : status === "degraded" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"}`}>
			<span className={`w-1.5 h-1.5 rounded-full ${status === "running" ? "bg-emerald-500 animate-pulse" : status === "degraded" ? "bg-amber-500" : "bg-red-500"}`} />
			{status}
		</span>
	);

	const MeterBar = ({ value, color }: { value: number; color: string }) => (
		<div className="h-1.5 bg-muted rounded-full overflow-hidden">
			<div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, value)}%`, background: color }} />
		</div>
	);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<AdminSidebar collapsed={false} onToggle={() => {}} adminEmail={adminEmail || undefined} />
			<main className="ml-[220px] min-h-screen">
				<div className="max-w-[1400px] space-y-6">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<div className="inline-flex items-center gap-1.5 mb-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-semibold text-emerald-500 uppercase tracking-wider">
								<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
								All Systems Operational
							</div>
							<h1 className="text-3xl font-bold text-foreground">API Gateway</h1>
							<p className="text-muted-foreground text-sm mt-1">Service health, performance metrics, and infrastructure monitoring</p>
						</div>
						<div className="flex gap-2">
							<button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted/50 transition-colors cursor-pointer text-muted-foreground">
								<FiRefreshCw className="w-3.5 h-3.5" />
								Restart All
							</button>
							<button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-sm">
								<FiPlay className="w-3.5 h-3.5" />
								Deploy
							</button>
						</div>
					</div>

					{/* Sub-navigation */}
					<div className="flex flex-wrap gap-2">
						{[
							{ to: "/auth/admin/gateway/keys", label: "Master Keys", icon: FiKey },
							{ to: "/auth/admin/gateway/user-keys", label: "User Keys", icon: FiUsers },
							{ to: "/auth/admin/gateway/logs", label: "Request Logs", icon: FiClock },
							{ to: "/auth/admin/gateway/failover-logs", label: "Failover Logs", icon: FiActivity },
							{ to: "/auth/admin/gateway/health", label: "Health Monitor", icon: FiShield },
							{ to: "/auth/admin/gateway/settings", label: "Settings", icon: FiSettings },
						].map((nav) => (
							<Link
								key={nav.to}
								to={nav.to}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/50 hover:bg-muted/50 hover:border-border transition-all"
							>
								<nav.icon className="w-3 h-3" />
								{nav.label}
							</Link>
						))}
					</div>

					{/* Global Metrics */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
						{[
							{ label: "Requests/sec", value: totalRPS.toString(), icon: <FiZap className="w-4 h-4" />, color: "text-amber-500" },
							{ label: "24h Requests", value: (totalRequests24h / 1000).toFixed(1) + "K", icon: <FiGlobe className="w-4 h-4" />, color: "text-indigo-500" },
							{ label: "Avg Response", value: avgResponseTime + "ms", icon: <FiClock className="w-4 h-4" />, color: "text-emerald-500" },
							{ label: "Active Nodes", value: services.filter(s => s.status === "running").length + "/" + services.length, icon: <FiServer className="w-4 h-4" />, color: "text-violet-500" },
						].map((m) => (
							<div key={m.label} className="p-4 rounded-xl border border-border bg-card/60">
								<div className="flex items-center gap-2 mb-2">
									<div className={`w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center ${m.color}`}>{m.icon}</div>
									<span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{m.label}</span>
								</div>
								<p className="text-2xl font-bold text-foreground">{m.value}</p>
							</div>
						))}
					</div>

					{/* Services Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
						<div className="lg:col-span-2 space-y-3">
							<h3 className="text-sm font-bold text-foreground px-1">Service Nodes</h3>
							{services.map((svc) => (
								<div key={svc.id}
									onClick={() => setSelectedService(svc)}
									className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedService?.id === svc.id ? "border-primary/50 bg-primary/5" : "border-border bg-card/60 hover:border-border/80"}`}>
									<div className="flex items-center justify-between mb-3">
										<div className="flex items-center gap-3">
											<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${svc.status === "running" ? "bg-emerald-500/10 text-emerald-500" : svc.status === "degraded" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"}`}>
												<FiServer className="w-4 h-4" />
											</div>
											<div>
												<p className="text-sm font-semibold text-foreground">{svc.name}</p>
												<p className="text-[10px] text-muted-foreground font-mono">Uptime: {svc.uptime}</p>
											</div>
										</div>
										<StatusBadge status={svc.status} />
									</div>
									<div className="grid grid-cols-4 gap-3">
										<div className="p-2.5 rounded-lg bg-muted/20 border border-border/40">
											<p className="text-[9px] font-semibold text-muted-foreground uppercase">CPU</p>
											<p className="text-xs font-bold text-foreground mt-0.5">{svc.cpu}%</p>
											<div className="mt-1"><MeterBar value={svc.cpu} color={svc.cpu > 80 ? "var(--destructive)" : "var(--primary)"} /></div>
										</div>
										<div className="p-2.5 rounded-lg bg-muted/20 border border-border/40">
											<p className="text-[9px] font-semibold text-muted-foreground uppercase">Memory</p>
											<p className="text-xs font-bold text-foreground mt-0.5">{svc.memory}%</p>
											<div className="mt-1"><MeterBar value={svc.memory} color={svc.memory > 80 ? "var(--destructive)" : "var(--primary)"} /></div>
										</div>
										<div className="p-2.5 rounded-lg bg-muted/20 border border-border/40">
											<p className="text-[9px] font-semibold text-muted-foreground uppercase">Requests</p>
											<p className="text-xs font-bold text-foreground mt-0.5">{svc.requests.toLocaleString()}</p>
										</div>
										<div className="p-2.5 rounded-lg bg-muted/20 border border-border/40">
											<p className="text-[9px] font-semibold text-muted-foreground uppercase">Errors</p>
											<p className={`text-xs font-bold mt-0.5 ${svc.errors > 0 ? "text-red-500" : "text-muted-foreground"}`}>{svc.errors}</p>
										</div>
									</div>
								</div>
							))}
						</div>

						{/* Node Detail Panel */}
						<div className="space-y-4">
							{selectedService && (
								<div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
									<div className="flex items-center justify-between">
										<h4 className="font-bold text-foreground">Node Details</h4>
										<StatusBadge status={selectedService.status} />
									</div>
									<div className="space-y-3">
										<div className="flex justify-between items-center text-xs py-1 border-b border-border/55">
											<span className="text-muted-foreground">Node ID</span>
											<span className="font-mono text-foreground">{selectedService.id}</span>
										</div>
										<div className="flex justify-between items-center text-xs py-1 border-b border-border/55">
											<span className="text-muted-foreground">Process Name</span>
											<span className="font-semibold text-foreground">{selectedService.name}</span>
										</div>
										<div className="flex justify-between items-center text-xs py-1 border-b border-border/55">
											<span className="text-muted-foreground">Continuous Uptime</span>
											<span className="font-medium text-foreground">{selectedService.uptime}</span>
										</div>
										<div className="flex justify-between items-center text-xs py-1">
											<span className="text-muted-foreground">Error Rate</span>
											<span className={`font-semibold ${selectedService.errors > 0 ? "text-red-500" : "text-emerald-500"}`}>
												{((selectedService.errors / (selectedService.requests || 1)) * 100).toFixed(3)}%
											</span>
										</div>
									</div>
									<div className="flex gap-2 pt-2">
										{selectedService.status === "running" ? (
											<button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/15 text-red-500 transition-colors cursor-pointer">
												<FiSquare className="w-3.5 h-3.5" /> Stop Node
											</button>
										) : (
											<button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-500 transition-colors cursor-pointer">
												<FiPlay className="w-3.5 h-3.5" /> Start Node
											</button>
										)}
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Environment & Config */}
					<div className="rounded-2xl border border-border bg-card/60 p-5">
						<h3 className="font-bold text-foreground mb-4">Environment Configuration</h3>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{[
								{ label: "Gateway URL", value: "https://api.opuszen.shop/api", icon: <FiGlobe className="w-3.5 h-3.5" /> },
								{ label: "Environment", value: "Production", icon: <FiServer className="w-3.5 h-3.5" /> },
								{ label: "Node Version", value: "v20.11.0", icon: <FiCpu className="w-3.5 h-3.5" /> },
								{ label: "Database", value: "PostgreSQL 16", icon: <FiHardDrive className="w-3.5 h-3.5" /> },
								{ label: "Cache", value: "Redis 7.2", icon: <FiZap className="w-3.5 h-3.5" /> },
								{ label: "Auth", value: "Supabase Auth", icon: <FiShield className="w-3.5 h-3.5" /> },
							].map((cfg) => (
								<div key={cfg.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
									<div className="text-muted-foreground shrink-0">{cfg.icon}</div>
									<div className="min-w-0">
										<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cfg.label}</p>
										<p className="text-sm font-semibold text-foreground truncate">{cfg.value}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
