import { Link } from "react-router";
import { Activity, Shield, ArrowUp, ExternalLink, Heart, Lock } from "lucide-react";
import { WhatsAppIcon } from "~/components/ui/brand-icons";
import { BrandLogo } from "~/components/ui/brand-logo";

export function Footer() {
	const scrollToTop = () => {
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	return (
		<footer className="border-t border-border bg-card/60 dark:bg-card/30 backdrop-blur-md text-foreground transition-colors mt-auto">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
				{/* Main Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-border/60">
					{/* Brand Column (2 cols wide on desktop) */}
					<div className="lg:col-span-2 space-y-4">
						<BrandLogo size="md" variant="full" />
						
						<p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
							High-performance Anthropic Claude API gateway with zero waitlists, transparent rolling token billing, and automatic failover.
						</p>

						{/* Live System Status Pill */}
						<div className="pt-2">
							<Link
								to="/status"
								className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors shadow-2xs"
							>
								<span className="relative flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
									<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
								</span>
								<span>All Systems Operational</span>
							</Link>
						</div>
					</div>

					{/* Product Column */}
					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Product
						</h4>
						<ul className="space-y-2 text-sm">
							<li>
								<Link to="/#models" className="text-muted-foreground hover:text-foreground transition-colors">
									Claude Models
								</Link>
							</li>
							<li>
								<Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
									Pricing & Plans
								</Link>
							</li>
							<li>
								<Link to="/key-status" className="text-muted-foreground hover:text-foreground transition-colors">
									Key Status & Quota
								</Link>
							</li>
							<li>
								<Link to="/orders" className="text-muted-foreground hover:text-foreground transition-colors">
									Track Orders
								</Link>
							</li>
							<li>
								<Link to="/status" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
									<Activity className="w-3.5 h-3.5 text-emerald-500" /> Live Status
								</Link>
							</li>
						</ul>
					</div>

					{/* Developers Column */}
					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Developers
						</h4>
						<ul className="space-y-2 text-sm">
							<li>
								<Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
									Documentation
								</Link>
							</li>
							<li>
								<Link to="/docs#quickstart" className="text-muted-foreground hover:text-foreground transition-colors">
									Quick Start Guide
								</Link>
							</li>
							<li>
								<Link to="/docs#models-endpoint" className="text-muted-foreground hover:text-foreground transition-colors">
									Models Endpoint
								</Link>
							</li>
							<li>
								<Link to="/docs#error-handling" className="text-muted-foreground hover:text-foreground transition-colors">
									Error Codes & Fallbacks
								</Link>
							</li>
							<li>
								<Link to="/setup.ps1" className="text-muted-foreground hover:text-foreground transition-colors font-mono text-xs">
									PowerShell Setup
								</Link>
							</li>
						</ul>
					</div>

					{/* Legal & Account Column */}
					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Legal & Access
						</h4>
						<ul className="space-y-2 text-sm">
							<li>
								<Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
									Terms of Service
								</Link>
							</li>
							<li>
								<Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
									Privacy Policy
								</Link>
							</li>
							<li>
								<Link to="/auth/admin" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
									<Lock className="w-3 h-3" /> Admin Console
								</Link>
							</li>
							<li>
								<a
									href="https://wa.me/918098830937"
									target="_blank"
									rel="noopener noreferrer"
									className="text-[#25D366] hover:underline font-semibold flex items-center gap-1.5"
								>
									<WhatsAppIcon className="w-3.5 h-3.5 fill-current" /> WhatsApp Admin
								</a>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom Credits & Back to Top */}
				<div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
					<p>© {new Date().getFullYear()} OpusZen Technologies. All rights reserved.</p>
					
					<div className="flex items-center gap-4">
						<span className="flex items-center gap-1 text-muted-foreground">
							Crafted with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> for AI Builders
						</span>
						
						<button
							type="button"
							onClick={scrollToTop}
							aria-label="Scroll back to top"
							className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs group flex items-center gap-1"
							title="Scroll to top"
						>
							<ArrowUp className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5" />
							<span className="hidden sm:inline text-[11px] font-medium">Top</span>
						</button>
					</div>
				</div>
			</div>
		</footer>
	);
}
