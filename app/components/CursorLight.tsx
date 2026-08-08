import { useEffect, useRef } from "react";

/**
 * CursorLight — a radial gradient that follows the cursor position.
 * Uses direct DOM manipulation & hardware accelerated transform to prevent
 * React re-renders and eliminate scrolling/pointer lag.
 */
export function CursorLight() {
	const lightRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef<number>(0);
	const mousePos = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });
	const isVisible = useRef(false);

	useEffect(() => {
		if (typeof window === "undefined") return;

		// Disable on touch devices or reduced motion
		const isTouch = window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches;
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (isTouch || prefersReducedMotion) return;

		const el = lightRef.current;
		if (!el) return;

		const updatePosition = () => {
			if (el && isVisible.current) {
				el.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0) translate(-50%, -50%)`;
			}
			rafRef.current = 0;
		};

		const onMove = (e: MouseEvent) => {
			mousePos.current.x = e.clientX;
			mousePos.current.y = e.clientY;
			if (!isVisible.current) {
				isVisible.current = true;
				if (el) el.style.opacity = "1";
			}
			if (!rafRef.current) {
				rafRef.current = requestAnimationFrame(updatePosition);
			}
		};

		const onLeave = () => {
			isVisible.current = false;
			if (el) el.style.opacity = "0";
		};

		const onEnter = () => {
			isVisible.current = true;
			if (el) el.style.opacity = "1";
		};

		document.addEventListener("mouseenter", onEnter, { passive: true });
		document.addEventListener("mouseleave", onLeave, { passive: true });
		window.addEventListener("mousemove", onMove, { passive: true });

		return () => {
			document.removeEventListener("mouseenter", onEnter);
			document.removeEventListener("mouseleave", onLeave);
			window.removeEventListener("mousemove", onMove);
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, []);

	return (
		<div
			ref={lightRef}
			className="cursor-light"
			style={{
				opacity: 0,
				transform: "translate3d(-1000px, -1000px, 0) translate(-50%, -50%)",
				pointerEvents: "none",
			}}
			aria-hidden="true"
		/>
	);
}
