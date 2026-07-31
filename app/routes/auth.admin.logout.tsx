import { type ActionFunctionArgs, redirect } from "react-router";
import { destroyAdminSession } from "~/utils/admin-auth";

export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== "POST") {
		return redirect("/auth/admin");
	}

	await destroyAdminSession();

	const headers = new Headers();
	headers.append("Set-Cookie", "admin_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT");
	headers.append("Set-Cookie", "admin_bypass=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT");
	headers.append("Set-Cookie", "sb-access-token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT");
	headers.append("Set-Cookie", "sb-refresh-token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT");

	return redirect("/auth/admin", { headers });
}

export default function AdminLogoutRoute() {
	return null;
}
