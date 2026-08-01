import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Link } from "react-router";
import { ScaleReveal } from "../components/motion/BlurScaleReveal";

export default function CTASection() {
 return (
 <section className="relative py-24 px-4 bg-background overflow-hidden">
 {/* Animated gradient background */}
 <div
 className="absolute inset-0 opacity-[0.05] gradient-animated"
 style={{
 background: "linear-gradient(135deg, #C74413, #e0683b, #e8e0dc, #C74413)",
 }}
 aria-hidden="true"
 />
 {/* Floating glow */}
 <div
 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none blob-1"
 style={{ background: "radial-gradient(circle, rgba(199,68,19,0.08) 0%, transparent 70%)" }}
 aria-hidden="true"
 />

 <div className="relative z-10 max-w-3xl mx-auto text-center">
 {/* Icon */}
 <ScaleReveal>
 <motion.div
 initial={{ opacity: 0, scale: 0.9 }}
 whileInView={{ opacity: 1, scale: 1 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5 }}
 className="mb-8 inline-flex items-center justify-center"
 >
 <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl shadow-primary/20">
 <Sparkles className="w-10 h-10 text-primary-foreground" />
 </div>
 </motion.div>
 </ScaleReveal>

 {/* Heading */}
 <motion.h2
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5 }}
 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4"
 >
 Ready to supercharge your AI workflow?
 </motion.h2>
 <motion.p
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5, delay: 0.1 }}
 className="text-muted-foreground text-lg max-w-xl mx-auto mb-8 leading-relaxed"
 >
 Join thousands of developers using OpusZen for instant access to every Claude model.
 </motion.p>

 {/* CTA */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5, delay: 0.2 }}
 >
 <Link
 to="/auth/signup"
 className="btn-ripple inline-block px-8 py-3.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
 >
 Get Started Free
 </Link>
 </motion.div>

 {/* Trust badges */}
 <motion.div
 initial={{ opacity: 0 }}
 whileInView={{ opacity: 1 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5, delay: 0.3 }}
 className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground"
 >
 <div className="flex items-center gap-2">
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
 className="text-emerald-500"
 aria-hidden="true"
 >
 <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
 <path d="M22 4 12 14.01l-3-3" />
 </svg>
 No credit card required
 </div>
 <div className="flex items-center gap-2">
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
 className="text-emerald-500"
 aria-hidden="true"
 >
 <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
 <path d="M22 4 12 14.01l-3-3" />
 </svg>
 Cancel anytime
 </div>
 </motion.div>
 </div>
 </section>
 );
}
