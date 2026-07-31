import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useCounterAnimation — animates a numeric value from `from` to `to` when `trigger` becomes true.
 */
export function useCounterAnimation(
 trigger: boolean,
 from: number,
 to: number,
 duration: number = 2000
) {
 const [count, setCount] = useState(from);
 const rafRef = useRef<number>(0);
 const startRef = useRef<number | null>(null);

 useEffect(() => {
 if (!trigger) {
 setCount(from);
 return;
 }

 startRef.current = null;

 const animate = (timestamp: number) => {
 if (startRef.current === null) startRef.current = timestamp;
 const elapsed = timestamp - startRef.current;
 const progress = Math.min(elapsed / duration, 1);

 // easeOutExpo
 const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
 const current = Math.round(from + (to - from) * eased);
 setCount(current);

 if (progress < 1) {
 rafRef.current = requestAnimationFrame(animate);
 }
 };

 rafRef.current = requestAnimationFrame(animate);

 return () => cancelAnimationFrame(rafRef.current);
 }, [trigger, from, to, duration]);

 return count;
}

/**
 * useCursorLight — tracks mouse position for a cursor-following light effect.
 */
export function useCursorLight(enabled: boolean = true) {
 const [pos, setPos] = useState({ x: -500, y: -500 });
 const rafRef = useRef<number>(0);

 useEffect(() => {
 if (!enabled || typeof window === "undefined") return;

 const handleMouseMove = (e: MouseEvent) => {
 cancelAnimationFrame(rafRef.current);
 rafRef.current = requestAnimationFrame(() => {
 setPos({ x: e.clientX, y: e.clientY });
 });
 };

 window.addEventListener("mousemove", handleMouseMove, { passive: true });
 return () => {
 window.removeEventListener("mousemove", handleMouseMove);
 cancelAnimationFrame(rafRef.current);
 };
 }, [enabled]);

 return pos;
}

/**
 * useParallax — parallax offset based on scroll position.
 */
export function useParallax(speed: number = 0.5) {
 const [offset, setOffset] = useState(0);
 const tickingRef = useRef(false);

 useEffect(() => {
 const handleScroll = () => {
 if (tickingRef.current) return;
 tickingRef.current = true;
 requestAnimationFrame(() => {
 setOffset(window.scrollY * speed);
 tickingRef.current = false;
 });
 };

 window.addEventListener("scroll", handleScroll, { passive: true });
 handleScroll();
 return () => window.removeEventListener("scroll", handleScroll);
 }, [speed]);

 return offset;
}

/**
 * useMagneticButton — magnetic hover effect for a button element.
 */
export function useMagneticButton(strength: number = 0.3) {
 const ref = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const el = ref.current;
 if (!el) return;

 const handleMouseMove = (e: MouseEvent) => {
 const rect = el.getBoundingClientRect();
 const x = e.clientX - rect.left - rect.width / 2;
 const y = e.clientY - rect.top - rect.height / 2;
 el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
 };

 const handleMouseLeave = () => {
 el.style.transform = "translate(0px, 0px)";
 el.style.transition = "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
 };

 const handleMouseEnter = () => {
 el.style.transition = "transform 0.15s ease-out";
 };

 el.addEventListener("mousemove", handleMouseMove);
 el.addEventListener("mouseleave", handleMouseLeave);
 el.addEventListener("mouseenter", handleMouseEnter);

 return () => {
 el.removeEventListener("mousemove", handleMouseMove);
 el.removeEventListener("mouseleave", handleMouseLeave);
 el.removeEventListener("mouseenter", handleMouseEnter);
 };
 }, [strength]);

 return ref;
}
