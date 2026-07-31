import { useEffect, useState, useCallback, useRef } from "react";

/**
 * useScrollProgress — tracks scroll progress (0 to 1) across the document.
 */
export function useScrollProgress() {
 const [progress, setProgress] = useState(0);
 const tickingRef = useRef(false);

 const update = useCallback(() => {
 if (tickingRef.current) return;
 tickingRef.current = true;

 requestAnimationFrame(() => {
 const scrollTop = window.scrollY;
 const docHeight = document.documentElement.scrollHeight - window.innerHeight;
 setProgress(docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0);
 tickingRef.current = false;
 });
 }, []);

 useEffect(() => {
 window.addEventListener("scroll", update, { passive: true });
 update();
 return () => window.removeEventListener("scroll", update);
 }, [update]);

 return progress;
}

/**
 * useIntersectionObserver — observes an element and reports when it enters/exits the viewport.
 */
export function useIntersectionObserver(
 options: IntersectionObserverInit = {}
) {
 const ref = useRef<HTMLDivElement>(null);
 const [isVisible, setIsVisible] = useState(false);
 const [progress, setProgress] = useState(0);

 useEffect(() => {
 const element = ref.current;
 if (!element) return;

 const observer = new IntersectionObserver(
 ([entry]) => {
 if (entry.isIntersecting && !isVisible) {
 setIsVisible(true);
 }
 setProgress(entry.intersectionRatio);
 },
 {
 threshold: Array.from({ length: 20 }, (_, i) => i / 19),
 ...options,
 }
 );

 observer.observe(element);
 return () => observer.disconnect();
 }, [isVisible]);

 return { ref, isVisible, progress };
}
