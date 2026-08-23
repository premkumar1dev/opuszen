import { getSeoConfig, generateRobotsTxt } from "~/utils/seo-service.server";

export async function loader() {
	const config = await getSeoConfig();
	const content = generateRobotsTxt(config);
	return new Response(content, {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600, s-maxage=86400",
		},
	});
}

export default function RobotsTxt() {
	return null;
}
