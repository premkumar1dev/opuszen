import { useEffect, useState, useRef, useCallback } from "react";

/**
 * CursorLight — a radial gradient that follows the cursor position.
 * Place once at the Layout level.
 */
export function CursorLight() {
 const [visible, setVisible] = useState(false);
 const [pos, setPos] = useState({ x: -500, y: -500 });
 const rafRef = useRef<number>(0);

 const handleMouseMove = useCallback((e: MouseEvent) => {
 cancelAnimationFrame(rafRef.current);
 rafRef.current = requestAnimationFrame(() => {
 setPos({ x: e.clientX, y: e.clientY });
 });
 }, []);

 useEffect(() => {
 const onEnter = () => setVisible(true);
 const onLeave = () => setVisible(false);
 const onMove = (e: MouseEvent) => handleMouseMove(e);

 document.addEventListener("mouseenter", onEnter);
 document.addEventListener("mouseleave", onLeave);
 window.addEventListener("mousemove", onMove, { passive: true });

 return () => {
 document.removeEventListener("mouseenter", onEnter);
 document.removeEventListener("mouseleave", onLeave);
 window.removeEventListener("mousemove", onMove);
 cancelAnimationFrame(rafRef.current);
 };
 }, [handleMouseMove]);

 if (!visible) return null;

 return (
 <div
 className="cursor-light"
 style={{
 left: `${pos.x}px`,
 top: `${pos.y}px`,
 opacity: visible ? 1 : 0,
 }}
 aria-hidden="true"
 />
 );
}
