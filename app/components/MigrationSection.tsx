import { motion } from "framer-motion";
import { ScaleReveal } from "../components/motion/BlurScaleReveal";

export default function MigrationSection() {
    return (
        <section className="relative py-24 px-4 bg-background">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4"
                    >
                        <span className="text-muted-foreground text-2xl sm:text-3xl md:text-4xl font-mono">
                            03 —
                        </span>{" "}
                        Migration
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-muted-foreground text-lg max-w-2xl mx-auto"
                    >
                        Change one line in your existing code. Everything else stays the same.
                    </motion.p>
                </div>

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
