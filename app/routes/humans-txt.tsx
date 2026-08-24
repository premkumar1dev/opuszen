import { getSeoConfig } from "~/utils/seo-service.server";

export async function loader() {
	const config = await getSeoConfig();
	if (!config.humans_txt_enabled) {
		return new Response("# Humans.txt is disabled\n", {
			status: 404,
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}
	const content = config.humans_txt_content || "# Humans of OpusZen\n";
	return new Response(content, {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600, s-maxage=86400",
		},
	});
}

export default function HumansTxt() {
	return null;
}
