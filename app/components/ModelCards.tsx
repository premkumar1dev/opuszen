import { motion } from "framer-motion";
import { StaggerContainer, StaggerItem } from "../components/motion/FadeUp";

const featuredModels = [
 {
 name: "Claude Fable 5",
 id: "claude-fable-5",
 description: "Most intelligent, best for complex reasoning",
 tier: "pro",
 context: "1M",
 badges: ["New", "1M context"],
 },
 {
 name: "Claude Opus 5",
 id: "claude-opus-5",
 description: "Highest capability for complex tasks",
 tier: "pro",
 context: "200K",
 badges: ["New"],
 },
 {
 name: "Claude Sonnet 5",
 id: "claude-sonnet-5",
 description: "Balanced performance and speed",
 tier: "dev",
 context: "200K",
 badges: [],
 },
 {
 name: "Claude Haiku 4.5",
 id: "claude-haiku-4-5-20251001",
 description: "Fast and affordable",
 tier: "free",
 context: "200K",
 badges: [],
 },
];

const tierConfig = {
 pro: { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
 dev: { color: "text-chart-2", bg: "bg-chart-4/50", border: "border-chart-4/80" },
 free: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
};

const badgeConfig = {
 New: { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
 "1M context": { color: "text-chart-2", bg: "bg-chart-4/50", border: "border-chart-4/80" },
};

export default function ModelCards() {
 return (
 <section className="relative py-24 px-4 bg-background">
 <div className="max-w-7xl mx-auto">
 <div className="text-center mb-16">
 <motion.h2
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5 }}
 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4"
 >
 <span className="text-muted-foreground text-2xl sm:text-3xl md:text-4xl font-mono">
 01 —
 </span>{" "}
 The lineup
 </motion.h2>
 <motion.p
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5, delay: 0.1 }}
 className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed"
 >
 The whole Claude lineup. One endpoint.
 </motion.p>
 </div>

 <StaggerContainer staggerDelay={0.08} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
 {featuredModels.map((model, i) => {
 const tier = tierConfig[model.tier as keyof typeof tierConfig];
 return (
 <motion.div
 key={model.id}
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5, delay: i * 0.08 }}
 className="group relative rounded-xl border border-border bg-card hover:border-blue-300 card-lift overflow-hidden"
 >
 <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

 <div className="p-5 sm:p-6">
 <div className="flex flex-wrap gap-2 mb-3">
 {model.badges.map((badge) => {
 const bc = badgeConfig[badge as keyof typeof badgeConfig];
 return (
 <span
 key={badge}
 className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${bc.bg} ${bc.color} ${bc.border} border`}
 >
 {badge}
 </span>
 );
 })}
 </div>

 <h3 className="text-lg font-semibold text-foreground mb-1">
 {model.name}
 </h3>

 <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded block mb-2">
 {model.id}
 </code>

 <p className="text-sm text-muted-foreground leading-relaxed mb-4">
 {model.description}
 </p>

 <div className="flex items-center justify-between pt-3 border-t border-border">
 <span className="text-xs text-muted-foreground font-mono">
 {model.context} context
 </span>
 <span
 className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${tier.bg} ${tier.color} ${tier.border} border`}
 >
 {model.tier}
 </span>
 </div>
 </div>
 </motion.div>
 );
 })}
 </StaggerContainer>

 <div className="text-center mt-10">
 <button
 className="btn-ripple inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all cursor-pointer"
 >
 Show all 9 supporting models
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={16}
 height={16}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 <path d="m6 9 6 6 6-6" />
 </svg>
 </button>
 </div>
 </div>
 </section>
 );
}
