import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "../../../utils/supabase";

interface Signup4Props {
 heading?: string;
 logo?: {
 url: string;
 src: string;
 alt: string;
 title?: string;
 };
 buttonText?: string;
 loginText?: string;
 loginUrl?: string;
 testimonial?: {
 quote: string;
 author: string;
 role: string;
 };
 backgroundImageUrl?: string;
}

const Signup4 = ({
 heading = "Create an account",
 logo = {
 url: "/",
 src: "/logo-blue.png",
 alt: "Opuszen Logo",
 title: "Opuszen",
 },
 buttonText = "Sign Up",
 loginText = "Already have an account?",
 loginUrl = "/auth/login",
 testimonial = {
 quote: "OpusZen has completely transformed how we build and scale our projects. The speed and visual quality are unmatched.",
 author: "Sarah Chen",
 role: "Lead Developer at TechFlow",
 },
 backgroundImageUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop",
}: Signup4Props) => {
 const [name, setName] = useState("");
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
 const { error: authError } = await supabase.auth.signUp({
 email,
 password,
 options: {
 data: {
 full_name: name,
 },
 },
 });
 if (authError) {
 setError(authError.message);
 } else {
 setSuccess(true);
 }
 } catch (err: unknown) {
 const message = err instanceof Error ? err.message : "An unexpected error occurred.";
 setError(message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <section className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-background">
 {/* Left side: Testimonial & Image Panel */}
 <div className="relative hidden lg:flex flex-col justify-between p-10 text-white bg-zinc-950 overflow-hidden">
 {/* Background Image Overlay */}
 <div
 className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
 style={{ backgroundImage: `url(${backgroundImageUrl})` }}
 />
 {/* Subtle Gradient Overlay */}
 <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-zinc-900/60 z-10" />

 {/* Top: Logo & Title */}
 <div className="relative z-20 flex items-center gap-3">
 <a href={logo.url} className="flex items-center gap-3">
 <img src={logo.src} alt={logo.alt} className="h-10 w-10" />
 <span className="text-2xl font-bold tracking-tight text-white">{logo.title}</span>
 </a>
 </div>

 {/* Bottom: Testimonial */}
 <div className="relative z-20 mt-auto">
 <blockquote className="space-y-4">
 <p className="text-lg font-medium leading-relaxed italic text-zinc-100">
 &ldquo;{testimonial.quote}&rdquo;
 </p>
 <footer className="text-sm">
 <div className="font-semibold text-white">{testimonial.author}</div>
 <div className="text-zinc-400">{testimonial.role}</div>
 </footer>
 </blockquote>
 </div>
 </div>

 {/* Right side: Signup Form Panel */}
 <div className="flex flex-col justify-center px-6 py-12 lg:px-8 bg-background">
 <div className="mx-auto w-full max-w-sm">
 {/* Logo & Header for Mobile/Tablet */}
 <div className="flex flex-col items-center gap-y-2 lg:hidden mb-8">
 <a href={logo.url} className="flex items-center gap-3">
 <img src={logo.src} alt={logo.alt} className="h-10 w-10" />
 <span className="text-2xl font-bold tracking-tight text-foreground">{logo.title}</span>
 </a>
 </div>

 {/* Form Header */}
 <div className="flex flex-col gap-y-2 text-center lg:text-left mb-8">
 <h2 className="text-3xl font-bold tracking-tight text-foreground">{heading}</h2>
 <p className="text-sm text-muted-foreground">
 Enter your details below to create your account
 </p>
 </div>

 {/* Form Fields */}
 <form className="space-y-6" onSubmit={handleSubmit}>
 {error && (
 <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md">
 {error}
 </div>
 )}
 {success && (
 <div className="p-3 text-sm text-green-500 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-md">
 Successfully signed up! Please check your email for confirmation.
 </div>
 )}
 <div className="space-y-4">
 <div className="flex flex-col gap-2">
 <label htmlFor="signup-name" className="sr-only">Full Name</label>
 <Input
 id="signup-name"
 type="text"
 placeholder="Full Name"
 value={name}
 onChange={(e) => setName(e.target.value)}
 required
 disabled={loading}
 />
 </div>
 <div className="flex flex-col gap-2">
 <label htmlFor="signup-email" className="sr-only">Email Address</label>
 <Input
 id="signup-email"
 type="email"
 placeholder="Email Address"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 disabled={loading}
 autoComplete="email"
 />
 </div>
 <div className="flex flex-col gap-2">
 <label htmlFor="signup-password" className="sr-only">Password</label>
 <Input
 id="signup-password"
 type="password"
 placeholder="Password (min. 8 characters)"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 required
 disabled={loading}
 autoComplete="new-password"
 minLength={8}
 />
 </div>
 </div>

 <Button type="submit" className="w-full" disabled={loading}>
 {loading ? "Signing Up..." : buttonText}
 </Button>
 </form>

 {/* Footer Link */}
 <div className="mt-8 text-center text-sm text-muted-foreground">
 {loginText}{" "}
 <a href={loginUrl} className="font-semibold text-primary hover:underline">
 Log in
 </a>
 </div>
 </div>
 </div>
 </section>
 );
};

export { Signup4 };
