import { motion } from "framer-motion";
import { type ReactNode } from "react";

const MotionDiv = motion.create("div");
interface FadeUpProps {
 children: ReactNode;
 delay?: number;
 duration?: number;
 className?: string;
 once?: boolean;
}

export function FadeUp({
 children,
 delay = 0,
 duration = 0.6,
 className = "",
 once = true,
}: FadeUpProps) {
 return (
 <MotionDiv
 initial={{ opacity: 0, y: 28 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once, margin: "-80px" }}
 transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
 className={className}
 >
 {children}
 </MotionDiv>
 );
}

interface ScaleInProps {
 children: ReactNode;
 delay?: number;
 duration?: number;
 className?: string;
 once?: boolean;
}

export function ScaleIn({
 children,
 delay = 0,
 duration = 0.55,
 className = "",
 once = true,
}: ScaleInProps) {
 return (
 <MotionDiv
 initial={{ opacity: 0, y: 24, scale: 0.97 }}
 whileInView={{ opacity: 1, y: 0, scale: 1 }}
 viewport={{ once, margin: "-60px" }}
 transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
 className={className}
 >
 {children}
 </MotionDiv>
 );
}

interface StaggerContainerProps {
 children: ReactNode;
 staggerDelay?: number;
 className?: string;
 once?: boolean;
}

export function StaggerContainer({
 children,
 staggerDelay = 0.08,
 className = "",
 once = true,
}: StaggerContainerProps) {
 return (
 <MotionDiv
 initial="hidden"
 whileInView="visible"
 viewport={{ once, margin: "-60px" }}
 transition={{ staggerChildren: staggerDelay, delayChildren: 0.1 }}
 variants={{
 hidden: {},
 visible: {},
 }}
 className={className}
 >
 {children}
 </MotionDiv>
 );
}

interface StaggerItemProps {
	children: ReactNode;
	className?: string;
	delay?: number;
}

export function StaggerItem({ children, className = "", delay }: StaggerItemProps) {
	return (
		<MotionDiv
			variants={{
				hidden: { opacity: 0, y: 20, scale: 0.97 },
				visible: {
					opacity: 1,
					y: 0,
					scale: 1,
					transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
				},
			}}
			className={className}
		>
			{children}
		</MotionDiv>
	);
}
