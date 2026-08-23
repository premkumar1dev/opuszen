import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { Key, Link2, Rocket } from 'lucide-react';
import { ScaleReveal } from "../components/motion/BlurScaleReveal";

const STEP_ICONS = [Key, Link2, Rocket];

export function ReadyIn60Seconds() {
	const [host, setHost] = useState(() => {
		if (typeof window !== 'undefined') {
			return window.location.host;
		}
		return 'opuszen.live';
	});

	const steps = [
		{
			number: '01',
			title: 'Get your API key',
			description: 'Your admin or reseller creates a key with budget and rate limits already configured.',
		},
		{
			number: '02',
			title: 'Set your base URL',
			description: `Point any Anthropic-compatible client to ${host}. Everything else stays the same.`,
		},
		{
			number: '03',
			title: 'Start building',
			description: 'Claude Code, Python SDK, cURL, Cursor — it all just works. Streaming included.',
		},
	];

	return (
		<section className="relative px-4" aria-labelledby="steps-heading">
			<div className="max-w-4xl mx-auto">
				<div className="text-center mb-16">
					<motion.h2
						initial={{ opacity: 0, y: 18 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
						id="steps-heading"
						className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4"
					>
						Ready in 60 seconds
					</motion.h2>
					<motion.p
						initial={{ opacity: 0, y: 14 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
						className="text-muted-foreground"
					>
						Three steps. That's it.
					</motion.p>
				</div>

				<div className="space-y-0">
					{steps.map((step, index) => {
						const IconComp = STEP_ICONS[index];
						return (
							<motion.div
								key={step.number}
								initial={{ opacity: 0, y: 24 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{
									duration: 0.6,
									delay: index * 0.12,
									ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
								}}
								className="flex gap-6 sm:gap-8 py-8 border-b border-border last:border-0 group card-lift"
							>
								<div className="flex-shrink-0">
									<div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/30 transition-all duration-300">
										<IconComp className="w-6 h-6 text-primary" />
									</div>
								</div>
								<div className="flex-1 pt-1">
									<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
										<span className="text-4xl font-black text-primary/10 tabular-nums">
											{step.number}
										</span>
										<div>
											<h3 className="text-lg font-semibold text-foreground transition-colors">
												{step.title}
											</h3>
											<p className="text-muted-foreground text-sm leading-relaxed mt-1">
												{step.description}
											</p>
										</div>
									</div>
								</div>
							</motion.div>
						);
					})}
				</div>
			</div>
		</section>
	);
}