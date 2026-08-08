import { useEffect } from "react";
import { useLocation } from "react-router";

export function useLenisScroll() {
	let pathname = "";
	try {
		const loc = useLocation();
		pathname = loc?.pathname || "";
	} catch {
		// Fallback if accessed outside Router context
	}

	useEffect(() => {
		if (typeof window === "undefined") return;

		// Disable Lenis for reduced-motion or touch devices to prevent wheel/touch drag
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const isTouchOnly = window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches;
		const isDashboardRoute = pathname.startsWith("/user") || pathname.startsWith("/auth/admin") || pathname.startsWith("/dashboard");

		if (prefersReducedMotion || isTouchOnly || isDashboardRoute) {
			return;
		}

		let lenis: any = null;
		let tickerCallback: ((time: number) => void) | null = null;
		let gsapInstance: any = null;
		let scrollTriggerInstance: any = null;
		let destroyed = false;

		const init = async () => {
			try {
				const LenisModule = await import("lenis");
				if (destroyed) return;
				const Lenis = (LenisModule as any).default || LenisModule;

				lenis = new Lenis({
					duration: 0.9,
					easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
					smoothWheel: true,
					wheelMultiplier: 1.0,
					touchMultiplier: 1.0,
					syncTouch: false,
					autoRaf: false,
				});

				const gsapModule = await import("gsap");
				if (destroyed) {
					lenis?.destroy();
					return;
				}
				gsapInstance = (gsapModule as any).gsap || (gsapModule as any).default || gsapModule;

				try {
					const { ScrollTrigger } = await import("gsap/ScrollTrigger");
					if (!destroyed && ScrollTrigger) {
						scrollTriggerInstance = ScrollTrigger;
						gsapInstance.registerPlugin(ScrollTrigger);
						lenis.on("scroll", ScrollTrigger.update);
					}
				} catch {
					// ScrollTrigger optional
				}

				tickerCallback = (time: number) => {
					if (lenis && !destroyed) {
						lenis.raf(time * 1000);
					}
				};

				gsapInstance.ticker.add(tickerCallback);
				// Enable lag smoothing so momentary frame hiccups don't cause stutter
				gsapInstance.ticker.lagSmoothing(500, 33);
			} catch (err) {
				console.warn("Lenis initialization skipped:", err);
			}
		};

		init();

		return () => {
			destroyed = true;
			if (gsapInstance && tickerCallback) {
				gsapInstance.ticker.remove(tickerCallback);
			}
			if (lenis) {
				lenis.destroy();
				lenis = null;
			}
		};
	}, [pathname]);
}
