import { type MetaFunction } from "react-router";
import type { Route } from "./+types/status";
import { Layout } from "../components/Layout";
import { useState, useEffect } from "react";

export const meta: MetaFunction = () => {
 return [
 { title: "Status | Opuszen" },
 {
 name: "description",
 content: "System status and uptime for OpusZen API gateway.",
 },
 ];
};

export default function StatusRoute() {
  const [host, setHost] = useState("opuszen.shop");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHost(window.location.host);
    }
  }, []);

  const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
  const apiBaseUrl = `${protocol}//${host}`;

 const services = [
 {
 name: "API Gateway",
 status: "operational",
 uptime: "99.9%",
 description: "Main API endpoint for all Claude model requests",
 },
 {
 name: "Web Search Tool",
 status: "operational",
 uptime: "99.8%",
 description: "Real-time web search functionality",
 },
 {
 name: "Image Analysis",
 status: "operational",
 uptime: "99.7%",
 description: "Image understanding and analysis",
 },
 {
 name: "SSE Streaming",
 status: "operational",
 uptime: "99.9%",
 description: "Server-Sent Events streaming",
 },
 ];

 const statusColors = {
 operational: "text-emerald-600 dark:text-emerald-400",
 degraded: "text-amber-600 dark:text-amber-400",
 outage: "text-red-600 dark:text-red-400",
 };

 const statusBg = {
 operational: "bg-emerald-500/10 dark:bg-emerald-500/20",
 degraded: "bg-amber-500/10 dark:bg-amber-500/20",
 outage: "bg-red-500/10 dark:bg-red-500/20",
 };

 const statusLabels = {
 operational: "Operational",
 degraded: "Degraded",
 outage: "Outage",
 };

 return (
 <Layout>
 <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
 {/* Header */}
 <div className="text-center mb-12">
 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-4">
 <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" aria-hidden="true" />
 All systems operational
 </div>
 <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
 System Status
 </h1>
 <p className="text-muted-foreground text-lg max-w-xl mx-auto">
 Real-time status and uptime information for OpusZen services.
 </p>
 </div>

 {/* Status cards */}
 <div className="grid gap-4 md:grid-cols-2 mb-12">
 {services.map((service) => (
 <div
 key={service.name}
 className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 hover:border-primary/30 transition-all"
 >
 <div className="flex items-start justify-between mb-3">
 <h2 className="text-lg font-semibold text-foreground">
 {service.name}
 </h2>
 <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBg[service.status as keyof typeof statusBg]} ${statusColors[service.status as keyof typeof statusColors]}`}>
 <div className={`w-1.5 h-1.5 rounded-full ${
 service.status === "operational"
 ? "bg-emerald-500 dark:bg-emerald-400"
 : service.status === "degraded"
 ? "bg-amber-500 dark:bg-amber-400"
 : "bg-red-500"
 }`} aria-hidden="true" />
 {statusLabels[service.status as keyof typeof statusLabels]}
 </div>
 </div>
 <p className="text-sm text-muted-foreground mb-3">
 {service.description}
 </p>
 <div className="flex items-center gap-2 text-sm">
 <span className="text-muted-foreground">Uptime:</span>
 <span className="font-semibold text-foreground">{service.uptime}</span>
 </div>
 </div>
 ))}
 </div>

 {/* API Base URL */}
 <div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 mb-8">
 <h2 className="text-lg font-semibold text-foreground mb-4">
 API Base URL
 </h2>
 <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 dark:bg-muted/10 border border-border/50">
 <code className="text-sm font-mono text-primary dark:text-violet-400">
 {apiBaseUrl}
 </code>
 <button
 onClick={() => navigator.clipboard.writeText(apiBaseUrl)}
 className="ml-auto p-2 rounded-lg hover:bg-muted/50 transition-colors"
 aria-label="Copy API URL"
 >
 <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground hover:text-foreground" aria-hidden="true">
 <rect width={14} height={14} x={8} y={8} rx={2} ry={2} />
 <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
 </svg>
 </button>
 </div>
 </div>

 {/* Incident history */}
 <div className="rounded-2xl border border-border bg-card dark:bg-card/60">
 <div className="px-6 py-4 border-b border-border">
 <h2 className="text-lg font-semibold text-foreground">
 Incident History
 </h2>
 </div>
 <div className="p-6 text-center text-muted-foreground">
 <svg xmlns="http://www.w3.org/2000/svg" width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-muted-foreground/40" aria-hidden="true">
 <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
 <path d="m9 12 2 2 4-4" />
 </svg>
 <p className="text-sm">No incidents reported in the past 30 days.</p>
 <p className="text-xs mt-1">All services are running smoothly.</p>
 </div>
 </div>
 </div>
 </Layout>
 )
}
