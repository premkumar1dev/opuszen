import { motion } from "framer-motion";
import { ScaleReveal } from "../components/motion/BlurScaleReveal";
import { SectionHeading } from "../components/SectionHeading";

export default function MigrationSection() {
 return (
 <section className="relative px-4">
 <div className="max-w-5xl mx-auto">
 <SectionHeading number="03 —" title="Migration" description="Change one line in your existing code. Everything else stays the same." />

 <ScaleReveal delay={0.2}>
 <div className="grid md:grid-cols-2 gap-4">
 <div className="rounded-xl border border-border overflow-hidden card-lift">
 <div className="px-4 py-2.5 bg-card border-b border-border">
 <span className="text-xs text-muted-foreground font-mono">Before</span>
 </div>
 <div className="bg-card p-5 font-mono text-sm leading-relaxed">
 <div>
 <span className="text-chart-2">const</span>{" "}
 <span className="text-primary">client</span>{" "}
 <span className="text-muted-foreground">=</span>{" "}
 <span className="text-chart-2">new</span>{" "}
 <span className="text-emerald-600">Anthropic</span>
 <span className="text-foreground">({"{"}</span>
 </div>
 <div className="pl-4">
 <span className="text-primary">baseURL</span>
 <span className="text-muted-foreground">: </span>
 <span className="text-emerald-600">"https://api.anthropic.com"</span>
 <span className="text-foreground">,</span>
 </div>
 <div>
 <span className="text-foreground">{"});"}</span>
 </div>
 </div>
 </div>

 <div className="rounded-xl border border-primary/30 overflow-hidden card-lift">
 <div className="px-4 py-2.5 bg-primary/10 border-b border-primary/20">
 <span className="text-xs text-primary font-mono">After</span>
 </div>
 <div className="bg-card p-5 font-mono text-sm leading-relaxed">
 <div>
 <span className="text-chart-2">const</span>{" "}
 <span className="text-primary">client</span>{" "}
 <span className="text-muted-foreground">=</span>{" "}
 <span className="text-chart-2">new</span>{" "}
 <span className="text-emerald-600">Anthropic</span>
 <span className="text-foreground">({"{"}</span>
 </div>
 <div className="pl-4">
 <span className="text-primary">baseURL</span>
 <span className="text-muted-foreground">: </span>
 <span className="text-emerald-600">"https://api.opuszen.shop"</span>
 <span className="text-foreground">,</span>
 </div>
 <div>
 <span className="text-foreground">{"});"}</span>
 </div>
 </div>
 </div>
 </div>
 </ScaleReveal>
 </div>
 </section>
 );
}
