import React, { useEffect, useRef } from "react";
import { Link } from "react-router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MagneticButton } from "@/components/ui/motion-footer";

if (typeof window !== "undefined") {
 gsap.registerPlugin(ScrollTrigger);
}

const STYLES = `
.hero-aurora {
 background: radial-gradient(
 circle at 50% 30%,
 color-mix(in oklch, var(--primary) 15%, transparent) 0%,
 color-mix(in oklch, var(--color-accent, var(--primary)) 10%, transparent) 50%,
 transparent 80%
 );
}

@keyframes hero-breathe {
 0% { transform: translate(-50%, -30%) scale(1); opacity: 0.7; }
 100% { transform: translate(-50%, -30%) scale(1.15); opacity: 1; }
}

.animate-hero-breathe {
 animation: hero-breathe 8s ease-in-out infinite alternate;
}

.hero-bg-grid {
 background-size: 60px 60px;
 background-image:
 linear-gradient(to right, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px),
 linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px);
 mask-image: radial-gradient(circle at 50% 50%, black 60%, transparent 100%);
 -webkit-mask-image: radial-gradient(circle at 50% 50%, black 60%, transparent 100%);
}

.hero-giant-bg-text {
 font-size: 20vw;
 line-height: 0.75;
 font-weight: 900;
 letter-spacing: -0.05em;
 color: transparent;
 -webkit-text-stroke: 1px color-mix(in oklch, var(--foreground) 4%, transparent);
 background: linear-gradient(180deg, color-mix(in oklch, var(--foreground) 8%, transparent) 0%, transparent 80%);
 -webkit-background-clip: text;
 background-clip: text;
}
`;

export default function Hero() {
 const wrapperRef = useRef<HTMLDivElement>(null);
 const auroraRef = useRef<HTMLDivElement>(null);
 const gridRef = useRef<HTMLDivElement>(null);
 const giantTextRef = useRef<HTMLDivElement>(null);
 const badgeRef = useRef<HTMLDivElement>(null);
 const headingRef = useRef<HTMLHeadingElement>(null);
 const subheadlineRef = useRef<HTMLParagraphElement>(null);
 const buttonsRef = useRef<HTMLDivElement>(null);
 const codeRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 if (typeof window === "undefined") return;

 const ctx = gsap.context(() => {
 // 1. Entrance Stagger Animation
 gsap.fromTo(
 [
 badgeRef.current,
 headingRef.current,
 subheadlineRef.current,
 buttonsRef.current,
 codeRef.current
 ],
 { y: 40, opacity: 0 },
 {
 y: 0,
 opacity: 1,
 duration: 0.8,
 stagger: 0.12,
 ease: "power3.out",
 }
 );

 // 2. Parallax Animations on Scroll (only if wrapper and giant text exist)
 if (giantTextRef.current && wrapperRef.current) {
 gsap.fromTo(
 giantTextRef.current,
 { y: "5vh", scale: 0.95 },
 {
 y: "-15vh",
 scale: 1.05,
 scrollTrigger: {
 trigger: wrapperRef.current,
 start: "top top",
 end: "bottom top",
 scrub: true,
 }
 }
 );
 }

 if (auroraRef.current && wrapperRef.current) {
 gsap.fromTo(
 auroraRef.current,
 { y: 0, scale: 1 },
 {
 y: "8vh",
 scale: 1.1,
 scrollTrigger: {
 trigger: wrapperRef.current,
 start: "top top",
 end: "bottom top",
 scrub: true,
 }
 }
 );
 }

 if (gridRef.current && wrapperRef.current) {
 gsap.fromTo(
 gridRef.current,
 { y: 0 },
 {
 y: "5vh",
 scrollTrigger: {
 trigger: wrapperRef.current,
 start: "top top",
 end: "bottom top",
 scrub: true,
 }
 }
 );
 }
 }, wrapperRef);

 return () => ctx.revert();

 if (typeof window !== "undefined") {
 requestAnimationFrame(() => ScrollTrigger.refresh());
 }
 }, []);

 return (
 <>
 <style dangerouslySetInnerHTML={{ __html: STYLES }} />
 <section
 ref={wrapperRef}
 className="relative h-full min-h-[90vh] flex items-center justify-center overflow-hidden bg-background pt-24 pb-16 md:pt-28 md:pb-20"
 >
 {/* Breathing Aurora Layer */}
 <div
 ref={auroraRef}
 className="hero-aurora absolute left-1/2 top-1/3 h-[50vh] w-[80vw] animate-hero-breathe rounded-[50%] blur-[100px] pointer-events-none z-0"
 />

 {/* Masked Grid Backdrop */}
 <div
 ref={gridRef}
 className="hero-bg-grid absolute inset-0 z-0 pointer-events-none opacity-80"
 />

 {/* Giant Outlined Parallax Text */}
 <div
 ref={giantTextRef}
 className="hero-giant-bg-text absolute top-1/3 left-1/2 -translate-x-1/2 whitespace-nowrap z-0 pointer-events-none select-none"
 >
 OPUSZEN
 </div>

 {/* Hero Content */}
 <div className="relative text-center px-4 max-w-5xl mx-auto z-10 flex flex-col items-center">
 {/* Badge */}
 <div
 ref={badgeRef}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/60 backdrop-blur-md text-sm text-muted-foreground mb-8 shadow-sm"
 >
 <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" aria-hidden="true" />
 <span className="font-medium">All Claude models available now</span>
 </div>

 {/* Headline */}
 <h1
 ref={headingRef}
 id="hero-heading"
 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-foreground mb-6 leading-[1.05]"
 >
 One key.<br />
 <span className="bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 dark:from-primary dark:via-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
 Every model.
 </span>
 </h1>

 {/* Subheadline */}
 <p
 ref={subheadlineRef}
 className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
 >
 Access Opus 4.8, Sonnet, and Haiku through a single Anthropic-compatible endpoint. Swap your base URL — your code stays the same.
 </p>

 {/* CTA Buttons wrapped in MagneticButton */}
 <div
 ref={buttonsRef}
 className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 w-full"
 >
 <MagneticButton
 as={Link}
 to="/docs"
 className="group relative inline-flex items-center justify-center whitespace-nowrap font-semibold text-primary-foreground bg-primary hover:bg-primary/95 h-12 rounded-full px-8 py-3 text-base gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
 >
 <span>Start Building</span>
 <svg
 xmlns="http://www.w3.org/2000/svg"
 width={18}
 height={18}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="transition-transform group-hover:translate-x-1"
 aria-hidden="true"
 >
 <path d="M5 12h14" />
 <path d="m12 5 7 7-7 7" />
 </svg>
 </MagneticButton>

 <MagneticButton
 as={Link}
 to="/docs"
 className="inline-flex items-center justify-center whitespace-nowrap font-medium border-2 border-border bg-background/80 hover:bg-card hover:border-primary/50 dark:bg-card/80 dark:hover:bg-card dark:border-border dark:hover:border-primary h-12 rounded-full px-8 py-3 text-base gap-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background backdrop-blur-md"
 >
 Read the Docs
 </MagneticButton>
 </div>

 {/* Code Preview */}
 <div
 ref={codeRef}
 className="inline-flex items-center gap-3 px-5 py-4 rounded-2xl bg-card border border-border text-sm shadow-sm"
 >
 <span className="font-mono">
 <span className="text-primary dark:text-violet-400">$ npx opuszen </span>
 <span className="animate-pulse text-primary dark:text-violet-400 ml-1">|</span>
 </span>
 </div>
 </div>
 </section>
 </>
 );
}
