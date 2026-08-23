import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { Sun, Moon, Menu, X, Zap, Key, Sparkles, BookOpen, ShoppingBag, Activity } from "lucide-react";
import { useDashboardTheme } from "~/utils/theme";
import { BrandLogo } from "~/components/ui/brand-logo";

interface NavItem {
	label: string;
	to: string;
	icon: any;
	badge?: string;
	isAnchor?: boolean;
}

const NAV_ITEMS: NavItem[] = [
	{ label: "Models", to: "/#models", icon: Sparkles, isAnchor: true },
	{ label: "Pricing", to: "/pricing", icon: Zap, badge: "Plans" },
	{ label: "Docs", to: "/docs", icon: BookOpen },
	{ label: "Key Status", to: "/key-status", icon: Key },
	{ label: "Orders", to: "/orders", icon: ShoppingBag },
	{ label: "Status", to: "/status", icon: Activity },
];

export function Navbar() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const { theme, toggleTheme } = useDashboardTheme();
	const location = useLocation();
	const menuRef = useRef<HTMLDivElement>(null);

	// Handle scroll effect for glassmorphism
	useEffect(() => {
		const handleScroll = () => {
			if (window.scrollY > 20) {
				setScrolled(true);
			} else {
				setScrolled(false);
			}
		};
		window.addEventListener("scroll", handleScroll, { passive: true });
		handleScroll();
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	// Close mobile menu on route change
	useEffect(() => {
		setMobileMenuOpen(false);
	}, [location.pathname, location.hash]);

	// Close on Escape
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setMobileMenuOpen(false);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
		if (to.startsWith("/#")) {
			if (location.pathname === "/") {
				e.preventDefault();
				const targetId = to.replace("/#", "");
				const el = document.getElementById(targetId);
				if (el) {
					el.scrollIntoView({ behavior: "smooth" });
				}
			}
		}
	};

	return (
		<header
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
				scrolled
					? "bg-background/85 backdrop-blur-xl border-b border-border/80 shadow-sm py-3"
					: "bg-background/50 backdrop-blur-md border-b border-border/40 py-4"
			}`}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
				{/* Logo */}
				<BrandLogo size="md" variant="full" />

				{/* Desktop Navigation Links */}
				<nav className="hidden md:flex items-center gap-1 bg-secondary/40 dark:bg-card/40 border border-border/60 rounded-full px-3 py-1.5 shadow-2xs backdrop-blur-lg">
					{NAV_ITEMS.map((item) => {
						const isExactActive = location.pathname === item.to;
						return (
							<Link
								key={item.to}
								to={item.to}
								onClick={(e) => handleAnchorClick(e, item.to)}
								className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
									isExactActive
										? "bg-primary text-primary-foreground shadow-xs font-bold"
										: "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
								}`}
							>
								<span>{item.label}</span>
								{item.badge && (
									<span
										className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
											isExactActive
												? "bg-white/20 text-white"
												: "bg-primary/10 text-primary"
										}`}
									>
										{item.badge}
									</span>
								)}
							</Link>
						);
					})}
				</nav>

				{/* Desktop Actions */}
				<div className="hidden md:flex items-center gap-2.5">
					{/* Theme Switcher */}
					<button
						type="button"
						onClick={toggleTheme}
						aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
						className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
					>
						{theme === "dark" ? (
							<Sun className="w-4 h-4 text-amber-400 rotate-0 transition-transform duration-300" />
						) : (
							<Moon className="w-4 h-4 text-slate-700 -rotate-12 transition-transform duration-300" />
						)}
					</button>

					{/* Get Key / Pricing Button */}
					<Link
						to="/pricing"
						className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-primary via-orange-600 to-amber-600 text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all duration-200"
					>
						<Zap className="w-3.5 h-3.5 fill-white/20 stroke-white" />
						<span>Get API Key</span>
					</Link>
				</div>

				{/* Mobile Hamburger & Theme Toggle */}
				<div className="flex md:hidden items-center gap-2">
					<button
						type="button"
						onClick={toggleTheme}
						aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
						className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
					>
						{theme === "dark" ? (
							<Sun className="w-4 h-4 text-amber-400" />
						) : (
							<Moon className="w-4 h-4 text-slate-700" />
						)}
					</button>

					<button
						type="button"
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						aria-label={mobileMenuOpen ? "Close menu" : "Open navigation menu"}
						aria-expanded={mobileMenuOpen}
						className="p-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
					>
						{mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
					</button>
				</div>
			</div>

			{/* Mobile Navigation Drawer */}
			{mobileMenuOpen && (
				<div
					ref={menuRef}
					className="md:hidden border-b border-border bg-background/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200 shadow-xl"
				>
					<div className="grid grid-cols-2 gap-2 pt-2">
						{NAV_ITEMS.map((item) => {
							const Icon = item.icon;
							const isExactActive = location.pathname === item.to;
							return (
								<Link
									key={item.to}
									to={item.to}
									onClick={(e) => {
										handleAnchorClick(e, item.to);
										setMobileMenuOpen(false);
									}}
									className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
										isExactActive
											? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
											: "bg-card/70 border-border text-foreground hover:bg-secondary"
									}`}
								>
									<Icon className={`w-4 h-4 shrink-0 ${isExactActive ? "text-white" : "text-primary"}`} />
									<span className="truncate">{item.label}</span>
								</Link>
							);
						})}
					</div>

					<div className="pt-2 flex flex-col gap-2">
						<Link
							to="/pricing"
							onClick={() => setMobileMenuOpen(false)}
							className="w-full py-3 px-4 rounded-xl text-xs font-bold text-center bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 flex items-center justify-center gap-2"
						>
							<Zap className="w-4 h-4 fill-white/20" />
							<span>Get Started / View Plans</span>
						</Link>
					</div>
				</div>
			)}
		</header>
	);
}
