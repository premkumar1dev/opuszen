import { useEffect, useRef } from "react";

/**
 * ScrollProgressBar — fixed top scroll progress indicator.
 * Uses GPU-accelerated transform scaleX to avoid layout reflow during scrolling.
 */
export function ScrollProgressBar() {
	const barRef = useRef<HTMLDivElement>(null);
	const tickingRef = useRef(false);

	useEffect(() => {
		const update = () => {
			if (tickingRef.current) return;
			tickingRef.current = true;
			requestAnimationFrame(() => {
				const scrollTop = window.scrollY;
				const docHeight = document.documentElement.scrollHeight - window.innerHeight;
				const progress = docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;
				if (barRef.current) {
					barRef.current.style.transform = `scaleX(${progress})`;
				}
				tickingRef.current = false;
			});
		};

		window.addEventListener("scroll", update, { passive: true });
		update();
		return () => window.removeEventListener("scroll", update);
	}, []);

	return (
		<div
			ref={barRef}
			className="scroll-progress-bar"
			style={{
				transform: "scaleX(0)",
				transformOrigin: "left",
				willChange: "transform",
			}}
			aria-hidden="true"
		/>
	);
}
