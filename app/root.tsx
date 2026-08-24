import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLocation,
	useNavigation,
	useRouteLoaderData,
} from "react-router";
import { useEffect } from "react";
import type { Route } from "./+types/root";
import type { SeoConfig, SocialLink, PageMeta } from "~/types/seo";
import { injectAnalyticsScripts } from "~/hooks/use-analytics";
import { WhatsAppWidget } from "~/components/WhatsAppWidget";
import { useLenisScroll } from "~/hooks/useLenisScroll";
import { ScrollProgressBar } from "~/components/ScrollProgressBar";
import { CursorLight } from "~/components/CursorLight";
import { SocialLinksProvider } from "~/components/SocialLinksProvider";
import "./app.css";

export const meta: Route.MetaFunction = (args: any) => {
	const data = args?.data as LoaderData | undefined;
	const location = args?.location;
	const pathname = location?.pathname || "/";
	const seoConfig = data?.seoConfig;
	const allPageMeta = data?.allPageMeta || [];

	if (!seoConfig) return [{ title: "OpusZen — AI API Gateway" }];

	const pageMeta = allPageMeta.find((pm) => pm.route_path === pathname);

	const title = pageMeta?.meta_title || seoConfig.site_title || seoConfig.site_name || "OpusZen";
	const description = pageMeta?.meta_description || seoConfig.site_description || "";
	const keywords = pageMeta?.meta_keywords || seoConfig.keywords || "";
	const url = (seoConfig.site_url || "https://opuszen.com").replace(/\/$/, "");
	const canonicalUrl = `${url}${pathname === "/" ? "" : pathname}`;
	const image = pageMeta?.og_image || seoConfig.og_image || `${url}/logo.png`;
	const isNoIndex = pageMeta?.no_index ?? false;
	const robots = isNoIndex
		? "noindex, nofollow"
		: seoConfig.robots_index
		? "index, follow" + (seoConfig.robots_custom ? ", " + seoConfig.robots_custom : "")
		: "noindex, nofollow";

	const ogTitle = pageMeta?.og_title || seoConfig.og_title || title;
	const ogDescription = pageMeta?.og_description || seoConfig.og_description || description;

	const tags: any[] = [
		{ charSet: "utf-8" },
		{ name: "viewport", content: "width=device-width, initial-scale=1" },
		{ title },
		{ name: "description", content: description },
		{ name: "keywords", content: keywords },
		{ name: "author", content: seoConfig.author || "" },
		{ name: "robots", content: robots },
		{ property: "og:site_name", content: seoConfig.site_name },
		{ property: "og:type", content: seoConfig.og_type || "website" },
		{ property: "og:url", content: canonicalUrl },
		{ property: "og:title", content: ogTitle },
		{ property: "og:description", content: ogDescription },
		{ property: "og:image", content: image },
		{ property: "twitter:card", content: seoConfig.twitter_card || "summary_large_image" },
		{ property: "twitter:title", content: ogTitle },
		{ property: "twitter:description", content: ogDescription },
		{ property: "twitter:image", content: image },
	];

	if (seoConfig.google_site_verification) {
		tags.push({ name: "google-site-verification", content: seoConfig.google_site_verification });
	}
	if (seoConfig.bing_site_verification) {
		tags.push({ name: "msvalidate.01", content: seoConfig.bing_site_verification });
	}
	if (seoConfig.google_analytics_id) {
		tags.push({ "script:ld": [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: seoConfig.site_name, url, logo: seoConfig.logo_url, sameAs: [] }) }] } as any);
	}
	return tags;
};

export const links: Route.LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap",
	},
	{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
	{ rel: "icon", type: "image/png", href: "/favicon.png" },
	{ rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
	{ rel: "alternate", type: "text/plain", href: "/llms.txt", title: "LLMs.txt" },
	{ rel: "alternate", type: "text/plain", href: "/humans.txt", title: "Humans.txt" },
];

export interface LoaderData {
	seoConfig: SeoConfig;
	allPageMeta: PageMeta[];
	socialLinks: SocialLink[];
}

export async function loader() {
	const { getSeoConfig, getAllPageMeta, getVisibleSocialLinks } = await import("~/utils/seo-service.server");
	const [seoConfig, allPageMeta, socialLinks] = await Promise.all([
		getSeoConfig(),
		getAllPageMeta(),
		getVisibleSocialLinks(),
	]);

	return { seoConfig, allPageMeta, socialLinks };
}

function AnalyticsInjector() {
	const rootData = useRouteLoaderData("root");
	const seoConfig = rootData as LoaderData | undefined;

	useEffect(() => {
		if (seoConfig?.seoConfig) {
			injectAnalyticsScripts(
				seoConfig.seoConfig.google_analytics_id || undefined,
				seoConfig.seoConfig.google_tag_manager_id || undefined
			);
		}
	}, [seoConfig]);

	return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
	useLenisScroll();
	const location = useLocation();
	const navigation = useNavigation();

	const pathname = location?.pathname || "";
	const isAdminPath = pathname.startsWith("/dashboard") || pathname.startsWith("/auth/admin");

	return (
		<html lang="en" suppressHydrationWarning>
		<head>
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<Meta />
			<Links />
			<AnalyticsInjector />
		</head>
		<body suppressHydrationWarning>
			{navigation.state === "loading" && (
				<div className="fixed top-0 left-0 right-0 h-1 z-toast bg-primary/20">
					<div
						className="h-full bg-gradient-to-r from-amber-400 via-primary to-primary/80 transition-all duration-300 ease-out"
						style={{
							width: "90%",
							animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, load 10s cubic-bezier(0.1, 0.8, 0.1, 1) forwards"
						}}
					/>
					<style dangerouslySetInnerHTML={{ __html: `
						@keyframes load {
							0% { width: 0%; }
							100% { width: 90%; }
						}
					` }} />
				</div>
			)}
			<ScrollProgressBar />
			{!isAdminPath && <CursorLight />}
			<SocialLinksProvider>
				{children}
			</SocialLinksProvider>
			{!isAdminPath && <WhatsAppWidget phoneNumber="918098830937" />}
			<ScrollRestoration />
			<Scripts />
		</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
	} else if (import.meta.env?.DEV && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="pt-16 p-4 container mx-auto">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && <pre className="w-full p-4 overflow-x-auto"><code>{stack}</code></pre>}
		</main>
	);
}
