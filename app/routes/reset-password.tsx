import { type MetaFunction, useNavigate, Link } from "react-router";
import { useState, useEffect } from "react";
import { FiLock, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "../../utils/supabase";

export const meta: MetaFunction = () => {
 return [
 { title: "Reset Password | OpusZen" },
 {
 name: "description",
 content: "Set a new password for your OpusZen account.",
 },
 ];
};

export default function ResetPasswordRoute() {
 const navigate = useNavigate();
 const [session, setSession] = useState<any>(null);
 const [loadingSession, setLoadingSession] = useState(true);

 const [password, setPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [success, setSuccess] = useState(false);

 useEffect(() => {
 supabase.auth.getSession().then(({ data }) => {
 setSession(data.session);
 setLoadingSession(false);
 });

 const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
 setSession(currentSession);
 setLoadingSession(false);
 });

 return () => subscription.unsubscribe();
 }, []);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!password) {
 setError("Password is required.");
 return;
 }
 if (password.length < 8) {
 setError("Password must be at least 8 characters.");
 return;
 }
 if (password !== confirmPassword) {
 setError("Passwords do not match.");
 return;
 }

 setLoading(true);
 setError(null);
 try {
 const { error: updateError } = await supabase.auth.updateUser({
 password: password
 });

 if (updateError) {
 setError(updateError.message);
 } else {
 setSuccess(true);
 await supabase.auth.signOut();
 setTimeout(() => {
 navigate("/auth/login", { replace: true });
 }, 3000);
 }
 } catch (err: unknown) {
 const message = err instanceof Error ? err.message : "An unexpected error occurred.";
 setError(message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <section className="bg-muted bg-background h-screen">
 <div className="flex h-full items-center justify-center">
 <div className="border-muted bg-background flex w-full max-w-sm flex-col items-center gap-y-8 rounded-md border px-6 py-12 shadow-md">
 <div className="flex flex-col items-center gap-y-2">
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
 <h1 className="text-xl font-semibold mt-2">New Password</h1>
 <p className="text-xs text-muted-foreground text-center px-4">
 Please enter and confirm your new account password.
 </p>
 </div>

 <div className="w-full">
 {loadingSession ? (
 <div className="flex flex-col items-center justify-center py-8 gap-3">
 <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
 <p className="text-xs text-muted-foreground font-mono">Verifying recovery link...</p>
 </div>
 ) : !session ? (
 <div className="flex flex-col gap-6 w-full">
 <div className="p-3.5 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md flex items-start gap-2">
 <FiAlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
 <div>
 <h4 className="font-semibold">Invalid or Expired Link</h4>
 <p className="text-xs mt-0.5 opacity-90">
 The password reset link is invalid, expired, or has already been used. Please request a new link.
 </p>
 </div>
 </div>
 <Button asChild className="w-full">
 <Link to="/auth/forgot-password">Request New Link</Link>
 </Button>
 </div>
 ) : (
 <form className="flex w-full flex-col gap-6" onSubmit={handleSubmit}>
 {error && (
 <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md flex items-start gap-2">
 <FiAlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
 <span>{error}</span>
 </div>
 )}
 {success && (
 <div className="p-3 text-sm text-green-500 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-md flex items-start gap-2">
 <FiCheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
 <span>Password updated successfully! Redirecting to login...</span>
 </div>
 )}

 <div className="flex flex-col gap-4">
 <div className="flex flex-col gap-2">
 <label htmlFor="reset-password" className="sr-only">New Password</label>
 <Input
 id="reset-password"
 type="password"
 placeholder="New Password (min. 8 characters)"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 required
 disabled={loading || success}
 autoComplete="new-password"
 minLength={8}
 />
 </div>
 <div className="flex flex-col gap-2">
 <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
 <Input
 id="confirm-password"
 type="password"
 placeholder="Confirm New Password"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 required
 disabled={loading || success}
 autoComplete="new-password"
 />
 </div>
 <Button type="submit" className="w-full mt-2" disabled={loading || success}>
 {loading ? "Updating..." : "Update Password"}
 </Button>
 </div>
 </form>
 )}
 </div>
 </div>
 </div>
 </section>
 );
}
