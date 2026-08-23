import React from "react";
import { Link } from "react-router";

export interface BrandMarkProps {
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	className?: string;
}

const SIZE_MAP = {
	xs: { card: "w-6 h-6 rounded-md", svg: "w-3.5 h-3.5", stroke: "2.4" },
	sm: { card: "w-8 h-8 rounded-lg", svg: "w-4.5 h-4.5", stroke: "2.2" },
	md: { card: "w-9 h-9 rounded-xl", svg: "w-5 h-5", stroke: "2.2" },
	lg: { card: "w-11 h-11 rounded-2xl", svg: "w-6 h-6", stroke: "2.2" },
	xl: { card: "w-14 h-14 rounded-2xl", svg: "w-8 h-8", stroke: "2.2" },
};

/**
 * BrandMark - Standalone Orange Squircle with white hollow lightning bolt
 */
export function BrandMark({ size = "md", className = "" }: BrandMarkProps) {
	const config = SIZE_MAP[size] || SIZE_MAP.md;
	return (
		<div
			className={`${config.card} bg-gradient-to-br from-[#FF6B00] via-[#FF5000] to-[#EA3B00] flex items-center justify-center shrink-0 shadow-md shadow-orange-600/25 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-orange-600/35 ${className}`}
		>
			<svg
				className={config.svg}
				viewBox="0 0 24 24"
				fill="none"
				stroke="#FFFFFF"
				strokeWidth={config.stroke}
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
			</svg>
		</div>
	);
}

export interface BrandLogoProps {
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	variant?: "full" | "simple" | "compact" | "mark";
	badgeText?: string | null;
	subtitle?: string | null;
	asLink?: boolean;
	to?: string;
	className?: string;
	collapsed?: boolean;
	onClick?: () => void;
}

/**
 * BrandLogo - Unified OpusZen Brand Component with Icon, Typography, API Badge & Subtitle
 */
export function BrandLogo({
	size = "md",
	variant = "full",
	badgeText = "API",
	subtitle = "Gateway & Billing",
	asLink = true,
	to = "/",
	className = "",
	collapsed = false,
	onClick,
}: BrandLogoProps) {
	if (variant === "mark" || collapsed) {
		const markContent = <BrandMark size={size} className={className} />;
		if (asLink) {
			return (
				<Link to={to} onClick={onClick} className="inline-flex items-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl" aria-label="OpusZen Home">
					{markContent}
				</Link>
			);
		}
		return markContent;
	}

	const textSizeMap = {
		xs: { title: "text-sm", badge: "text-[9px] px-1 py-0.2", sub: "text-[9px]" },
		sm: { title: "text-base", badge: "text-[9px] px-1.5 py-0.5", sub: "text-[10px]" },
		md: { title: "text-lg sm:text-xl", badge: "text-[10px] px-1.5 py-0.5", sub: "text-[10px]" },
		lg: { title: "text-xl sm:text-2xl", badge: "text-xs px-2 py-0.5", sub: "text-xs" },
		xl: { title: "text-2xl sm:text-3xl", badge: "text-xs px-2.5 py-0.5", sub: "text-sm" },
	};

	const textConfig = textSizeMap[size] || textSizeMap.md;

	const content = (
		<div className={`flex items-center gap-2.5 group select-none ${className}`}>
			<BrandMark size={size} />
			<div className="flex flex-col justify-center min-w-0">
				<div className="flex items-center gap-1.5 leading-none">
					<span className={`font-black tracking-tight text-foreground ${textConfig.title} leading-none`}>
						OpusZen
					</span>
					{badgeText && (
						<span
							className={`font-mono font-bold uppercase rounded-full bg-[#FFF0EB] dark:bg-orange-950/50 text-[#EA580C] dark:text-orange-400 border border-[#FED7AA] dark:border-orange-800/60 leading-tight ${textConfig.badge}`}
						>
							{badgeText}
						</span>
					)}
				</div>
				{variant === "full" && subtitle && (
					<span className={`text-muted-foreground font-medium tracking-wide mt-0.5 leading-tight ${textConfig.sub}`}>
						{subtitle}
					</span>
				)}
			</div>
		</div>
	);

	if (asLink) {
		return (
			<Link
				to={to}
				onClick={onClick}
				className="inline-flex items-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
				aria-label="OpusZen Home"
			>
				{content}
			</Link>
		);
	}

	return content;
}
