import { supabase } from "../utils/supabase";

export type AdminSessionResult = {
	isAdmin: boolean;
	email: string | null;
};

export async function verifyAdminSession(): Promise<AdminSessionResult> {
	const {
		data: { session },
		error: sessionError,
	} = await supabase.auth.getSession();

	if (sessionError || !session?.user) {
		return { isAdmin: false, email: null };
	}

	const user = session.user;
	const role = user.app_metadata?.role || user.user_metadata?.role;
	const email = user.email ?? null;

	return { isAdmin: role === "admin", email };
}
