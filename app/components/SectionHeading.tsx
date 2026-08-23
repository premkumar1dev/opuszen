import React from "react";
import { motion } from "framer-motion";

interface SectionHeadingProps {
	number?: string;
	title: string;
	description?: string;
	align?: "left" | "center";
}

export function SectionHeading({
	number,
	title,
	description,
	align = "center",
}: SectionHeadingProps) {
	const isCenter = align === "center";
	return (
		<div className={`mb-12 ${isCenter ? "text-center" : "text-left"}`}>
			<motion.h2
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.5 }}
				className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4"
			>
				{number && (
					<span className="text-muted-foreground text-2xl sm:text-3xl md:text-4xl font-mono mr-2">
						{number}
					</span>
				)}
				{title}
			</motion.h2>
			{description && (
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className={`text-muted-foreground text-lg leading-relaxed ${
						isCenter ? "max-w-2xl mx-auto" : "max-w-2xl"
					}`}
				>
					{description}
				</motion.p>
			)}
		</div>
	);
}
