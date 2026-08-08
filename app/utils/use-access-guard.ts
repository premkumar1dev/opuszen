import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "./supabase";

/**
 * Hook that redirects the user to /pricing if they have no active API key.
 * Call it at the top level of a dashboard page component.
 */
export function useAccessGuard() {
	const [authorized, setAuthorized] = useState<boolean | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		let cancelled = false;

		async function check() {
			const { data } = await supabase.auth.getUser();
			const user = data.user;
			if (!user) {
				navigate("/login");
				return;
			}

			const { data: keys } = await supabase
				.from("user_api_keys")
				.select("status")
				.eq("user_id", user.id)
				.eq("status", "active")
				.limit(1);

			if (!cancelled) {
				const hasAccess = (keys?.length ?? 0) > 0;
				setAuthorized(hasAccess);
				if (!hasAccess) {
					navigate("/pricing");
				}
			}
		}

		check();

		return () => {
			cancelled = true;
		};
	}, [navigate]);

	return authorized;
}
