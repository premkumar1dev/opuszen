import { type AuthProvider } from "react-admin";
import { supabase } from "~/../utils/supabase";
import { verifyAdminSession } from "~/../utils/admin-auth";

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    });
    if (error) throw new Error(error.message);

    const role = data.user?.app_metadata?.role || data.user?.user_metadata?.role;
    if (role !== "admin") {
      await supabase.auth.signOut();
      throw new Error("Access Denied: Account lacks administrative privileges.");
    }
  },
  logout: async () => {
    await supabase.auth.signOut();
    return "/auth/admin";
  },
  checkAuth: async () => {
    const { isAdmin } = await verifyAdminSession();
    if (!isAdmin) {
      throw { message: "Authentication required", redirectTo: "/auth/admin" };
    }
  },
  checkError: (error) => {
    const status = error.status;
    if (status === 401 || status === 403) {
      return Promise.reject();
    }
    return Promise.resolve();
  },
  getPermissions: async () => {
    const { isAdmin } = await verifyAdminSession();
    return isAdmin ? "admin" : "user";
  },
  getIdentity: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No user found");
    return {
      id: user.id,
      fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "Administrator",
      avatar: user.user_metadata?.avatar_url,
    };
  },
};
