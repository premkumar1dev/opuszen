import { type ActionFunctionArgs, type MetaFunction, Link } from "react-router";
import { useFetcher } from "react-router";
import { useState } from "react";
import { FiArrowLeft, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "../../utils/supabase";

export const meta: MetaFunction = () => {
  return [
    { title: "Forgot Password | OpusZen" },
    {
      name: "description",
      content: "Request a password reset link for your OpusZen account.",
    },
  ];
};

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const email = (formData.get("email") as string)?.trim();

    if (!email) {
      return Response.json({ error: "Email address is required." }, { status: 400 });
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const requestUrl = new URL(request.url);
    const redirectTo = `${requestUrl.origin}/auth/reset-password`;

    // Call Supabase native password reset
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (resetError) {
      console.error("[Forgot password Supabase error]:", resetError.message);
      return Response.json({ error: resetError.message }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Forgot password server error:", err);
    return Response.json({ error: err.message || "An unexpected error occurred." }, { status: 500 });
  }
}

export default function ForgotPasswordRoute() {
  const fetcher = useFetcher();
  const [email, setEmail] = useState("");

  const isSubmitting = fetcher.state !== "idle";
  const data = fetcher.data as { success?: boolean; error?: string } | undefined;

  return (
    <section className="bg-muted bg-background h-screen">
      <div className="flex h-full items-center justify-center">
        <div className="border-muted bg-background flex w-full max-w-sm flex-col items-center gap-y-8 rounded-md border px-6 py-12 shadow-md">
          <div className="flex flex-col items-center gap-y-2">
            {/* Logo and Site Name */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3">
                <img
                  src="/logo-blue.png"
                  alt="Opuszen Logo"
                  className="h-10 w-10"
                />
                <span className="text-2xl font-bold tracking-tight text-foreground">Opuszen</span>
              </Link>
            </div>
            <h1 className="text-xl font-semibold mt-2">Reset password</h1>
            <p className="text-xs text-muted-foreground text-center px-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <fetcher.Form method="post" className="flex w-full flex-col gap-6">
            {data?.error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md flex items-start gap-2">
                <FiAlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{data.error}</span>
              </div>
            )}
            {data?.success && (
              <div className="p-3 text-sm text-green-500 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-md flex items-start gap-2">
                <FiCheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>If that email exists, a password reset link has been sent.</span>
              </div>
            )}

            {!data?.success && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 relative">
                  <Input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>
            )}
          </fetcher.Form>

          <div className="flex justify-center text-sm">
            <Link
              to="/auth/login"
              className="text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
