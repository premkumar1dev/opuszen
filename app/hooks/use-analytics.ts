import { useEffect, useCallback, useRef } from "react";

declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: (...args: unknown[]) => void;
	}
}

export interface UseAnalyticsOptions {
	/** GA4 Measurement ID (e.g. "G-XXXXXXXXXX") */
	ga4Id?: string;
	/** Google Tag Manager Container ID (e.g. "GTM-XXXXXXX") */
	gtmId?: string;
	/** Auto-track page views on route change. Default: true */
	autoTrackPageViews?: boolean;
	/** Debug mode — logs events to console */
	debug?: boolean;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
	const { ga4Id, gtmId, autoTrackPageViews = true, debug = false } = options;

	const trackPageView = useCallback(
		(url: string) => {
			if (debug) console.log("[Analytics] page_view:", url);
			if (gtmId && window.dataLayer) {
				window.dataLayer.push({ event: "page_view", page_path: url });
			}
			if (ga4Id && window.gtag) {
				window.gtag("event", "page_view", { page_path: url });
			}
		},
		[ga4Id, gtmId, debug]
	);

	const trackEvent = useCallback(
		(name: string, params?: Record<string, unknown>) => {
			if (debug) console.log("[Analytics] event:", name, params);
			if (gtmId && window.dataLayer) {
				window.dataLayer.push({ event: name, ...params });
			}
			if (ga4Id && window.gtag) {
				window.gtag("event", name, params);
			}
		},
		[ga4Id, gtmId, debug]
	);

	const trackSignup = useCallback(
		(method = "email") => trackEvent("sign_up", { method }),
		[trackEvent]
	);

	const trackLogin = useCallback(
		(method = "email") => trackEvent("login", { method }),
		[trackEvent]
	);

	const trackPurchase = useCallback(
		(value: number, currency = "USD", items?: Record<string, unknown>[]) => {
			trackEvent("purchase", { value, currency, items });
		},
		[trackEvent]
	);

	const trackCTA = useCallback(
		(ctaName: string) => trackEvent("cta_click", { cta_name: ctaName }),
		[trackEvent]
	);

	const trackError = useCallback(
		(errorMessage: string, fatal = false) => {
			trackEvent("exception", { description: errorMessage, fatal });
		},
		[trackEvent]
	);

	useEffect(() => {
		if (!autoTrackPageViews) return;

		const handleRouteChange = () => {
			const url = window.location.pathname + window.location.search;
			trackPageView(url);
		};

		handleRouteChange();
		window.addEventListener("popstate", handleRouteChange);

		const origPush = history.pushState.bind(history);
		history.pushState = function (...args) { origPush(...args); handleRouteChange(); };

		const origReplace = history.replaceState.bind(history);
		history.replaceState = function (...args) { origReplace(...args); handleRouteChange(); };

		return () => {
			window.removeEventListener("popstate", handleRouteChange);
			history.pushState = origPush;
			history.replaceState = origReplace;
		};
	}, [autoTrackPageViews, trackPageView]);

	return { trackPageView, trackEvent, trackSignup, trackLogin, trackPurchase, trackCTA, trackError };
}

/**
 * Inject GA4 and/or GTM scripts into the page head.
 * Call this once (e.g. in the Layout component) with the IDs from loader data.
 */
export function injectAnalyticsScripts(ga4Id?: string, gtmId?: string) {
	if (!ga4Id && !gtmId) return;

	// GTM snippet
	if (gtmId) {
		const script = document.createElement("script");
		script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;
		document.head.appendChild(script);

		const noscript = document.createElement("noscript");
		noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
		noscript.setAttribute("data-gtm-noscript", "true");
		document.body.prepend(noscript);
	}

	// GA4 snippet
	if (ga4Id) {
		const script = document.createElement("script");
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
		document.head.appendChild(script);

		const config = document.createElement("script");
		config.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');window.gtag=gtag;`;
		document.head.appendChild(config);
	}
}
