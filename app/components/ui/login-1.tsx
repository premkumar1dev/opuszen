import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "~/utils/supabase";

interface Login1Props {
	heading?: string;
	logo?: {
		url: string;
		src: string;
		alt: string;
		title?: string;
	};
	buttonText?: string;
	signupText?: string;
	signupUrl?: string;
}

const Login1 = ({
	heading = "Welcome back",
	logo = {
		url: "/",
		src: "/logo-blue.png",
		alt: "Opuszen Logo",
		title: "Opuszen",
	},
	buttonText = "Login",
	signupText = "Don't have an account?",
	signupUrl = "/auth/signup",
}: Login1Props) => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const rawRedirect = searchParams.get("redirect") || "/";
	const redirectTo = rawRedirect.replace(/\.data(\?|$)/, "$1") || "/";
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const { error: authError } = await supabase.auth.signInWithPassword({
				email,
				password,
			});
			if (authError) {
				setError(authError.message);
				setLoading(false);
			} else {
				setSuccess(true);
				navigate(redirectTo);
			}
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : String(err));
			setLoading(false);
		}
	};

	return (
		<section className="bg-background min-h-screen">
			<div className="flex min-h-screen items-center justify-center px-4 py-8 sm:py-12">
				<div className="border-border bg-card flex w-full max-w-sm flex-col items-center gap-y-6 rounded-2xl border px-6 py-10 sm:py-12 shadow-sm">
					<div className="flex flex-col items-center gap-y-2">
						<div className="flex items-center gap-3">
							<a href={logo.url} className="flex items-center gap-3">
								<img
									src={logo.src}
									alt={logo.alt}
									title={logo.title}
									className="h-10 w-10"
								/>
								<span className="text-2xl font-bold tracking-tight text-foreground">{logo.title}</span>
							</a>
						</div>
						{heading && <h1 className="text-xl font-semibold mt-2">{heading}</h1>}
						{redirectTo !== "/" && (
							<p className="text-xs text-muted-foreground text-center">
								Please log in to continue to your requested page.
							</p>
						)}
					</div>
					<form className="flex w-full flex-col gap-6" onSubmit={handleSubmit}>
						{error && (
							<div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md">
								{error}
							</div>
						)}
						{success && (
							<div className="p-3 text-sm text-green-500 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-md">
								Successfully logged in! Redirecting...
							</div>
						)}
						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<label htmlFor="login-email" className="sr-only">Email</label>
								<Input
									id="login-email"
									type="email"
									placeholder="Email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									disabled={loading}
									autoComplete="email"
								/>
							</div>
							<div className="flex flex-col gap-2">
								<label htmlFor="login-password" className="sr-only">Password</label>
								<Input
									id="login-password"
									type="password"
									placeholder="Password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									disabled={loading}
									autoComplete="current-password"
								/>
								<div className="flex justify-end">
									<a href="/auth/forgot-password" className="text-xs text-primary hover:underline">
										Forgot password?
									</a>
								</div>
							</div>
							<div className="flex flex-col gap-4">
								<Button type="submit" className="mt-2 w-full" disabled={loading}>
									{loading ? "Logging in..." : buttonText}
								</Button>
							</div>
						</div>
					</form>
					<div className="text-muted-foreground flex justify-center gap-1 text-sm">
						<p>{signupText}</p>
						<a href={signupUrl} className="text-primary font-medium hover:underline">
							Sign up
						</a>
					</div>
				</div>
			</div>
		</section>
	);
};

export { Login1 };
