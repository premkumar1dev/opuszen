import { useEffect } from "react";

export function useLenisScroll() {
 useEffect(() => {
 if (typeof window === "undefined") return;

 let lenis: any;
 let rafId: number;

 const init = async () => {
 try {
 const LenisModule = await import("lenis");
 const Lenis = (LenisModule as any).default || LenisModule;

 lenis = new Lenis({
 duration: 1.2,
 easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
 smoothWheel: true,
 smoothTouch: false,
 touchMultiplier: 2,
 });

 const gsapModule = await import("gsap");
 const gsap = (gsapModule as any).gsap || (gsapModule as any).default || gsapModule;

 const { ScrollTrigger } = await import("gsap/ScrollTrigger");
 gsap.registerPlugin(ScrollTrigger);

 lenis.on("scroll", ScrollTrigger.update);

 gsap.ticker.add((time: number) => {
 lenis.raf(time * 1000);
 });

 gsap.ticker.lagSmoothing(0);

 rafId = requestAnimationFrame(() => {});
 } catch (err) {
 console.warn("Lenis initialization failed:", err);
 }
 };

 init();

 return () => {
 if (rafId) cancelAnimationFrame(rafId);
 if (lenis) lenis.destroy();
 };
 }, []);
}
