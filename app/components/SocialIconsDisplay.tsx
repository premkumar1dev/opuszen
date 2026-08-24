import { Link } from "react-router";
import type { SocialLink } from "~/types/seo";
import {
	Mail,
	Globe,
} from "lucide-react";
import {
	XIcon,
	GithubIcon,
	LinkedinIcon,
	FacebookIcon,
	InstagramIcon,
	YoutubeIcon,
	DiscordIcon,
	TelegramIcon,
	WhatsappIcon,
} from "~/components/SocialIcons";

const PLATFORM_ICONS: Record<string, React.ComponentType<any>> = {
	x: XIcon,
	twitter: XIcon,
	facebook: FacebookIcon,
	linkedin: LinkedinIcon,
	github: GithubIcon,
	instagram: InstagramIcon,
	youtube: YoutubeIcon,
	discord: DiscordIcon,
	telegram: TelegramIcon,
	whatsapp: WhatsappIcon,
	email: Mail,
	website: Globe,
};

const PLATFORM_LABELS: Record<string, string> = {
	x: "X (Twitter)",
	twitter: "Twitter",
	facebook: "Facebook",
	linkedin: "LinkedIn",
	github: "GitHub",
	instagram: "Instagram",
	youtube: "YouTube",
	discord: "Discord",
	telegram: "Telegram",
	whatsapp: "WhatsApp",
	email: "Email",
	website: "Website",
};

interface SocialIconsDisplayProps {
	links?: SocialLink[];
	className?: string;
	size?: "sm" | "md" | "lg";
	variant?: "filled" | "outline" | "ghost";
}

const SIZE_CLASSES = {
	sm: "w-8 h-8",
	md: "w-10 h-10",
	lg: "w-12 h-12",
};

const ICON_SIZES = {
	sm: "w-4 h-4",
	md: "w-[18px] h-[18px]",
	lg: "w-5 h-5",
};

export function SocialIconsDisplay({
	links,
	className = "",
	size = "md",
	variant = "ghost",
}: SocialIconsDisplayProps) {
	if (!links || links.length === 0) return null;

	return (
		<div className={`flex items-center gap-2 flex-wrap ${className}`}>
			{links.map((link) => {
				const IconComp = PLATFORM_ICONS[link.platform] || Globe;
				const label = link.label || PLATFORM_LABELS[link.platform] || link.platform;
				const isExternal = !link.url.startsWith("/");

				const baseClasses = `inline-flex items-center justify-center rounded-full transition-all duration-200 flex-shrink-0 cursor-pointer group`;

				const variantClasses = {
					filled:
						"bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg",
					outline:
						"border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/50",
					ghost:
						"text-muted-foreground hover:text-foreground hover:bg-muted/50",
				};

				const inner = (
					<>
						<IconComp className={`${ICON_SIZES[size]} transition-transform group-hover:scale-110`} />
						<span className="sr-only">{label}</span>
					</>
				);

				if (isExternal) {
					return (
						<a
							key={link.id || link.platform}
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							className={`${baseClasses} ${SIZE_CLASSES[size]} ${variantClasses[variant]}`}
							title={label}
							aria-label={label}
						>
							{inner}
						</a>
					);
				}

				return (
					<Link
						key={link.id || link.platform}
						to={link.url}
						className={`${baseClasses} ${SIZE_CLASSES[size]} ${variantClasses[variant]}`}
						title={label}
						aria-label={label}
					>
						{inner}
					</Link>
				);
			})}
		</div>
	);
}
