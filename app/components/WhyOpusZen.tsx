import { motion } from "framer-motion";
import { FadeUp, StaggerContainer, StaggerItem } from "../components/motion/FadeUp";
import { SectionHeading } from "../components/SectionHeading";

const features = [
 "Per-key budgets with 5h rolling windows",
 "Isolated rate limits & expiry per key",
 "Zero-latency SSE streaming pass-through",
 "Prompt caching — cache tokens are free",
 "Drop-in Anthropic SDK compatible",
 "Works with Claude Code, Cursor, any IDE",
];

export function WhyOpusZen() {
 return (
 <section className="relative px-4" aria-labelledby="why-heading">
 <div className="max-w-7xl mx-auto">
 <div className="grid lg:grid-cols-2 gap-16 items-center">
 {/* Left: description */}
 <FadeUp>
 <div>
 <p className="text-sm font-semibold text-primary mb-4 tracking-wide uppercase">
 Why OpusZen
 </p>
 <SectionHeading number="" title="Built for teams that need control" description="Multi-tenant API key management with per-key budgets, rate limits, usage tracking, and a full admin dashboard. Designed for resellers and teams." align="left" />
 </div>
 </FadeUp>

 {/* Right: feature list */}
 <StaggerContainer staggerDelay={0.1}>
 <ul className="space-y-4" role="list">
 {features.map((feature) => (
 <StaggerItem key={feature}>
 <li className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 card-lift transition-colors">
 <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
 <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
 <path d="M20 6 9 17l-5-5" />
 </svg>
 </div>
 <motion.span
 className="text-sm text-foreground font-medium leading-relaxed"
 initial={{ opacity: 0, y: 6 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
 >
 {feature}
 </motion.span>
 </li>
 </StaggerItem>
 ))}
 </ul>
 </StaggerContainer>
 </div>
 </div>
 </section>
 )
}