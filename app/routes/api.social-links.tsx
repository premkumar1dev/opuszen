import { getVisibleSocialLinks } from "~/utils/seo-service.server";

export async function loader() {
	const links = await getVisibleSocialLinks();
	return Response.json({ links });
}
