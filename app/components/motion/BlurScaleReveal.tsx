import { motion } from "framer-motion";
import { type ReactNode, useEffect, useState, useRef } from "react";

const MotionDiv = motion.create("div");

function useClient() {
 const [c, setC] = useState(false);
 useEffect(() => { setC(true); }, []);
 return c;
}

function useReveal(margin = "-80px") {
 const ref = useRef<HTMLDivElement>(null);
 const [show, setShow] = useState(false);
 const client = useClient();

 useEffect(() => {
 if (!client) return;
 const el = ref.current;
 if (!el) return;
 const obs = new IntersectionObserver(
 ([e]) => { if (e.isIntersecting) { setShow(true); obs.disconnect(); } },
 { threshold: 0.1, rootMargin: margin }
 );
 obs.observe(el);
 return () => obs.disconnect();
 }, [client]);

 return { ref, show };
}

interface BlurRevealProps {
 children: ReactNode;
 delay?: number;
 duration?: number;
 className?: string;
 once?: boolean;
}

export function BlurReveal({
 children,
 delay = 0,
 duration = 0.7,
 className = "",
 once = true,
}: BlurRevealProps) {
 const { ref } = useReveal("-60px");

 return (
 <MotionDiv
 ref={ref}
 initial={{ opacity: 0, filter: "blur(12px)", y: 20 }}
 whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
 viewport={{ once, margin: "-60px" }}
 transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
 className={className}
 >
 {children}
 </MotionDiv>
 );
}

interface ScaleRevealProps {
 children: ReactNode;
 delay?: number;
 duration?: number;
 className?: string;
 once?: boolean;
}

export function ScaleReveal({
 children,
 delay = 0,
 duration = 0.6,
 className = "",
 once = true,
}: ScaleRevealProps) {
 const { ref } = useReveal("-60px");

 return (
 <MotionDiv
 ref={ref}
 initial={{ opacity: 0, y: 24, scale: 0.985 }}
 whileInView={{ opacity: 1, y: 0, scale: 1 }}
 viewport={{ once, margin: "-60px" }}
 transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
 className={className}
 >
 {children}
 </MotionDiv>
 );
}
