import { type ReactNode, useRef } from "react";
import { motion, type Variants, useScroll, useTransform } from "framer-motion";

const MotionDiv = motion.create("div");

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const directionVariants: Record<string, Variants> = {
	up: {
		hidden: { opacity: 0, y: 48 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.7, ease: EASE },
		},
	},
	left: {
		hidden: { opacity: 0, x: -40 },
		visible: {
			opacity: 1,
			x: 0,
			transition: { duration: 0.7, ease: EASE },
		},
	},
	right: {
		hidden: { opacity: 0, x: 40 },
		visible: {
			opacity: 1,
			x: 0,
			transition: { duration: 0.7, ease: EASE },
		},
	},
	fade: {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { duration: 0.6, ease: EASE },
		},
	},
	scale: {
		hidden: { opacity: 0, scale: 0.96 },
		visible: {
			opacity: 1,
			scale: 1,
			transition: { duration: 0.6, ease: EASE },
		},
	},
};

const staggerItemVariants: Variants = {
	hidden: { opacity: 0, y: 28, scale: 0.97 },
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: { duration: 0.55, ease: EASE },
	},
};

interface ScrollSectionProps {
	children: ReactNode;
	direction?: "up" | "left" | "right" | "fade" | "scale";
	stagger?: boolean;
	staggerDelay?: number;
	margin?: string;
	once?: boolean;
	className?: string;
	orbs?: Array<{
		color: string;
		size?: "sm" | "md" | "lg";
		speed?: number;
		top?: string;
		left?: string;
	}>;
	divider?: boolean;
	py?: string;
	bg?: string;
}

/* ParallaxOrb — its own component so hooks stay at top level */
function ParallaxOrb({
	color,
	size,
	speed,
	top,
	left,
	targetRef,
}: {
	color: string;
	size: "sm" | "md" | "lg";
	speed: number;
	top?: string;
	left?: string;
	targetRef: React.RefObject<HTMLDivElement | null>;
}) {
	const { scrollYProgress } = useScroll({
		target: targetRef,
		offset: ["start end", "end start"],
	});

	const y = useTransform(scrollYProgress, [0, 1], [
		`-${50 * speed}px`,
		`${50 * speed}px`,
	]);

	const sizeMap = { sm: 300, md: 500, lg: 700 };
	const dim = sizeMap[size] || 500;

	return (
		<MotionDiv
			className="parallax-orb"
			style={{
				top: top || "50%",
				left: left || "50%",
				width: dim,
				height: dim,
				marginLeft: -dim / 2,
				marginTop: -dim / 2,
				y,
				background: color,
			}}
		/>
	);
}

export function ScrollSection({
	children,
	direction = "up",
	stagger = false,
	staggerDelay = 0.08,
	margin = "-80px",
	once = true,
	className = "",
	orbs = [],
	divider = false,
	py,
	bg,
}: ScrollSectionProps) {
	const sectionRef = useRef<HTMLDivElement>(null);
	const variants = directionVariants[direction] || directionVariants.up;

	return (
		<section
			ref={sectionRef}
			className={`relative overflow-hidden ${py || "py-24"} ${bg || "bg-background"} ${className}`}
		>
			{orbs.map((orb, i) => (
				<ParallaxOrb
					key={i}
					color={orb.color}
					size={orb.size || "md"}
					speed={orb.speed ?? 1}
					top={orb.top}
					left={orb.left}
					targetRef={sectionRef}
				/>
			))}

			<MotionDiv
				initial="hidden"
				whileInView="visible"
				viewport={{ once, margin }}
				variants={
					stagger
						? {
								hidden: {},
								visible: {
									transition: {
										staggerChildren: staggerDelay,
										delayChildren: 0.05,
									},
								},
							}
						: variants
				}
			>
				<MotionDiv
					variants={staggerItemVariants}
					className="relative z-10"
				>
					{children}
				</MotionDiv>
			</MotionDiv>

			{divider && (
				<motion.div
					initial={{ scaleX: 0 }}
					whileInView={{ scaleX: 1 }}
					viewport={{ once: true, margin: "-40px" }}
					transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
					className="section-divider max-w-7xl mx-auto"
					style={{ originX: 0.5 }}
				/>
			)}
		</section>
	);
}

interface ScrollItemProps {
	children: ReactNode;
	delay?: number;
	className?: string;
}

export function ScrollItem({ children, delay = 0, className = "" }: ScrollItemProps) {
	return (
		<MotionDiv
			variants={{
				hidden: { opacity: 0, y: 28, scale: 0.97 },
				visible: {
					opacity: 1,
					y: 0,
					scale: 1,
					transition: { duration: 0.55, ease: EASE, delay },
				},
			}}
			className={className}
		>
			{children}
		</MotionDiv>
	);
}

/* ScrollProgress — fixed top reading bar */
export function ScrollProgress() {
	const { scrollYProgress } = useScroll();

	return (
		<MotionDiv
			className="scroll-progress"
			style={{ scaleX: scrollYProgress }}
		/>
	);
}
