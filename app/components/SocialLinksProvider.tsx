import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { SocialLink } from "~/types/seo";

interface SocialLinksContextValue {
	links: SocialLink[];
	loading: boolean;
}

const SocialLinksContext = createContext<SocialLinksContextValue>({
	links: [],
	loading: true,
});

export function SocialLinksProvider({ children }: { children: ReactNode }) {
	const [links, setLinks] = useState<SocialLink[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const res = await fetch("/api/social-links", { headers: { Accept: "application/json" } });
				if (res.ok) {
					const data = await res.json();
					if (!cancelled) {
						setLinks(data.links || []);
					}
				}
			} catch {
				// silent
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		load();

		// Refresh periodically
		const interval = setInterval(load, 5 * 60_000);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, []);

	return (
		<SocialLinksContext.Provider value={{ links, loading }}>
			{children}
		</SocialLinksContext.Provider>
	);
}

export function useSocialLinks() {
	return useContext(SocialLinksContext);
}
