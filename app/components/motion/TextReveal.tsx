import { motion, type Variants } from "framer-motion";
import { useRef, useEffect, useState, type ReactNode } from "react";

const MotionDiv = motion.create("div");
const MotionSpan = motion.create("span");

function useClient() {
 const [c, setC] = useState(false);
 useEffect(() => { setC(true); }, []);
 return c;
}

function useReveal(margin = "-60px") {
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

const containerVariants: Variants = {
 hidden: {},
 visible: {
 transition: {
 staggerChildren: 0.12,
 delayChildren: 0.05,
 },
 },
};

const spanVariants: Variants = {
 hidden: { y: "108%", rotateX: -20 },
 visible: { y: "0%", rotateX: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

const wordVariants: Variants = {
 hidden: { opacity: 0, y: 20 },
 visible: {
 opacity: 1,
 y: 0,
 transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
 },
};

const wordVariantsFast: Variants = {
 hidden: { opacity: 0, y: 16 },
 visible: {
 opacity: 1,
 y: 0,
 transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
 },
};

const wordVariantsMap: Record<string, Variants> = {
 fadeUp: {
 hidden: { opacity: 0, y: 22 },
 visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
 },
 fadeIn: {
 hidden: { opacity: 0 },
 visible: { opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
 },
 slideLeft: {
 hidden: { opacity: 0, x: 30 },
 visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
 },
 slideRight: {
 hidden: { opacity: 0, x: -30 },
 visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
 },
};

interface TextRevealProps {
 children: ReactNode;
 staggerDelay?: number;
 className?: string;
 byWord?: boolean;
 style?: keyof typeof wordVariantsMap;
}

export function TextReveal({
 children,
 staggerDelay = 0.12,
 className = "",
 byWord = false,
 style = "fadeUp",
}: TextRevealProps) {
 const { ref, show } = useReveal("-60px");

 if (byWord && typeof children === "string") {
 const variants = wordVariantsMap[style] || wordVariantsMap.fadeUp;
 const words = children.split(/(\s+)/);
 return (
 <MotionDiv
 ref={ref}
 initial="hidden"
 whileInView={show ? "visible" : "hidden"}
 variants={{
 hidden: {},
 visible: {
 transition: {
 staggerChildren: staggerDelay,
 delayChildren: 0.05,
 },
 },
 }}
 className={className}
 >
 {words.map((word, i) => (
 <MotionSpan
 key={i}
 variants={variants}
 className={word.trim() ? "" : "inline"}
 style={{ display: word.trim() ? "inline-block" : "inline", willChange: "transform, opacity" }}
 >
 {word}
 </MotionSpan>
 ))}
 </MotionDiv>
 );
 }

 const variants: Variants = {
 ...containerVariants,
 visible: {
 transition: {
 staggerChildren: staggerDelay,
 delayChildren: 0.05,
 },
 },
 };

 return (
 <MotionDiv
 ref={ref}
 initial="hidden"
 whileInView={show ? "visible" : "hidden"}
 variants={variants}
 className={className}
 >
 {typeof children === "string" ? (
 <MotionSpan
 variants={spanVariants}
 style={{ display: "inline-block", willChange: "transform" }}
 >
 {children}
 </MotionSpan>
 ) : (
 children
 )}
 </MotionDiv>
 );
}

interface TextRevealLineProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function TextRevealLine({ children, className = "", style }: TextRevealLineProps) {
  const { ref, show } = useReveal("-40px");

  return (
    <MotionSpan
      ref={ref}
      initial={{ y: "108%", rotateX: -15 }}
      whileInView={show ? { y: "0%", rotateX: 0 } : undefined}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      style={{ display: "inline-block", willChange: "transform", ...style }}
      className={className}
    >
      {children}
    </MotionSpan>
  );
}
