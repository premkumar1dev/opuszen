import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
	title: string;
	value: string | number;
	change?: number;
	icon: ReactNode;
	iconBg?: string;
	iconColor?: string;
	loading?: boolean;
	className?: string;
}

function StatCard({
	title,
	value,
	change,
	icon,
	iconBg = "bg-primary/10",
	iconColor = "text-primary",
	loading = false,
	className = "",
}: StatCardProps) {
	const isPositive = change !== undefined && change >= 0;

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-md hover:border-primary/20",
				className,
			)}
		>
			{/* Gradient accent */}
			<div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none" />

			<div className="flex items-start justify-between relative">
				<div className="space-y-2.5 min-w-0">
					<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
						{title}
					</p>
					{loading ? (
						<Skeleton className="h-8 w-24" />
					) : (
						<p className="text-2xl sm:text-[1.65rem] font-bold text-foreground tracking-tight tabular-nums">
							{value}
						</p>
					)}
					{change !== undefined && !loading && (
						<div
							className={`flex items-center gap-1 text-[11px] font-semibold ${isPositive ? "text-emerald-500" : "text-red-500"}`}
						>
							{isPositive ? (
								<svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
									<path d="M6 2.5L10 7.5H2L6 2.5Z" fill="currentColor" />
								</svg>
							) : (
								<svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
									<path d="M6 9.5L2 4.5H10L6 9.5Z" fill="currentColor" />
								</svg>
							)}
							<span>
								{isPositive ? "+" : ""}
								{change}%
							</span>
							<span className="font-normal text-muted-foreground ml-0.5">vs last month</span>
						</div>
					)}
				</div>
				<div className={cn("shrink-0 w-11 h-11 rounded-xl flex items-center justify-center", iconBg, iconColor)}>
					{icon}
				</div>
			</div>
		</div>
	);
}

function Skeleton({ className = "" }: { className?: string }) {
	return (
		<div
			className={cn(
				"rounded-md bg-muted/70 overflow-hidden relative",
				className,
			)}
		>
			<div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
		</div>
	);
}

export { StatCard, Skeleton };
