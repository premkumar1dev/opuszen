import { motion } from "framer-motion";
import { StaggerContainer, StaggerItem } from "../components/motion/FadeUp";
import { SectionHeading } from "../components/SectionHeading";
import { BarChart3, Zap, Lock, Plug, Server, Eye } from "lucide-react";

const features = [
 {
 title: "Per-key rolling budgets",
 description: "Set per-key spending limits with 5-hour rolling windows. Each key gets its own budget, expiry, and rate limits.",
 icon: BarChart3,
 badge: "$7.50",
 },
 {
 title: "Direct streaming",
 description: "Zero-latency SSE streaming pass-through. Responses stream in real-time, just like Anthropic's API.",
 icon: Zap,
 badge: "SSE",
 },
 {
 title: "Free prompt caching",
 description: "Prompt caching is free — cache hits cost just 0.25x the normal rate. Save money on repeated prompts.",
 icon: Lock,
 badge: "0.25x",
 },
 {
 title: "Drop-in SDK compatible",
 description: "Works with the official Anthropic SDK, Claude Code, Python, Node.js, and any OpenAI-compatible client.",
 icon: Plug,
 badge: "SDK",
 },
 {
 title: "Server-side tools",
 description: "Use tool use and function calling with full server-side orchestration. No client-side complexity needed.",
 icon: Server,
 badge: "Tools",
 },
 {
 title: "Readable usage dashboard",
 description: "Track every request, token, and cost in a clean dashboard. Monitor usage across all keys and models.",
 icon: Eye,
 badge: "Dashboard",
 },
];

export default function FeatureCards() {
 return (
 <section className="relative px-4">
 <div className="max-w-7xl mx-auto">
 <SectionHeading number="02 —" title="Built for people who ship" description="Budgets that hold, streaming that doesn't buffer, and tools that are already switched on." />

 <StaggerContainer staggerDelay={0.1} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
 {features.map((feature, i) => (
 <StaggerItem key={feature.title} delay={i * 0.06} className="group relative rounded-xl border border-border bg-card p-6 hover:border-primary/30 card-lift transition-all duration-300">
 <div className="flex items-start justify-between mb-4">
 <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
 <feature.icon className="w-5 h-5 text-primary" />
 </div>
 <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted border border-border text-[11px] font-mono font-semibold text-muted-foreground">
 {feature.badge}
 </span>
 </div>
 <h3 className="text-base font-semibold text-foreground mb-2">
 {feature.title}
 </h3>
 <p className="text-sm text-muted-foreground leading-relaxed">
 {feature.description}
 </p>
 </StaggerItem>
 ))}
 </StaggerContainer>
 </div>
 </section>
 );
}