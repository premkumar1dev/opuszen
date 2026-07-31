import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useState, useEffect } from "react";
import { StaggerContainer, StaggerItem } from "../components/motion/FadeUp";
import { BlurReveal } from "../components/motion/BlurScaleReveal";

const steps = [
    {
        number: "01",
        title: "Create an account",
        description: "Sign up in seconds. No credit card required.",
    },
    {
        number: "02",
        title: "Pay in INR",
        description: "Top up your balance. Pay only for what you use.",
    },
    {
        number: "03",
        title: "Point your base URL here",
        description: "Update your Anthropic client. That's it.",
    },
];

export default function GettingStarted() {
    const [cursorVisible, setCursorVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setCursorVisible((v) => !v);
        }, 530);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative py-24 px-4 bg-background">
            <div className="max-w-7xl mx-auto">
                {/* Heading */}
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4"
                    >
                        <span className="text-muted-foreground text-2xl sm:text-3xl md:text-4xl font-mono">
                            04 —
                        </span>{" "}
                        Getting started
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-muted-foreground text-lg max-w-2xl mx-auto"
                    >
                        Three steps. Under two minutes.
                    </motion.p>
                </div>

                {/* Steps */}
                <StaggerContainer staggerDelay={0.12} className="grid md:grid-cols-3 gap-8 md:gap-4 items-start mb-16">
                    {steps.map((step, i) => (
                        <StaggerItem key={step.number}>
                            <div className="relative text-center md:text-left">
                                <div className="text-6xl font-black text-foreground/[0.04] mb-2 select-none">
                                    {step.number}
                                </div>
                                <h3 className="text-xl font-semibold text-foreground mb-2 -mt-4">
                                    {step.title}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {step.description}
                                </p>
                                {/* Arrow between steps */}
                                {i < steps.length - 1 && (
                                    <div className="hidden md:flex absolute top-8 -right-4 text-muted-foreground">
                                        <ArrowRight className="w-6 h-6" />
                                    </div>
                                )}
                            </div>
                        </StaggerItem>
                    ))}
                </StaggerContainer>

                {/* CTA block */}
                <BlurReveal delay={0.3}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="border border-border rounded-2xl p-8 md:p-12 bg-card text-center max-w-3xl mx-auto"
                    >
                        <p className="text-muted-foreground text-lg mb-2">
                            Two thousand developers already build on{" "}
                            <span className="text-foreground font-semibold">OpusZen</span>
                        </p>
                        <p className="text-muted-foreground mb-6">No waitlist. No approval needed.</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/auth/signup"
                                className="btn-ripple inline-flex items-center justify-center px-8 py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
                            >
                                Create your account
                            </Link>
                            <div className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-card border border-border font-mono text-sm shadow-sm">
                                <span className="text-muted-foreground">$ </span>
                                <span className="text-foreground">npx opuszen</span>
                                <span
                                    className={`text-primary ${cursorVisible ? "opacity-100" : "opacity-0"}`}
                                >
                                    █
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </BlurReveal>
            </div>
        </section>
    );
}
