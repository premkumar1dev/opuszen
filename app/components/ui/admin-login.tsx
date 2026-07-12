import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { FiMail, FiLock, FiShield, FiEye, FiEyeOff, FiTerminal, FiDatabase, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "../../../utils/supabase";

interface AdminLoginProps {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title?: string;
  };
}

export function AdminLoginForm({
  logo = {
    url: "/",
    src: "/logo.png",
    alt: "Opuszen Logo",
    title: "Opuszen",
  },
}: AdminLoginProps) {
  const [email, setEmail] = useState("tamilaninstamedia1@gmail.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Console logs simulator
  const [logs, setLogs] = useState<string[]>([]);
 const navigate = useNavigate();

  useEffect(() => {
    const rawLogs = [
      "SYS: Initializing secure shell connection...",
      "NET: E2E TLS 1.3 encryption handshake established.",
      "DB: Connected to supabase.database.co via gateway.",
      "SEC: Security module active (IP logged).",
      "AUTH: Awaiting developer or operator authentication credentials..."
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < rawLogs.length) {
        setLogs((prev) => [...prev, rawLogs[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLogs((prev) => [...prev, "AUTH: Verifying credentials..."]);
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLogs((prev) => [...prev, `ERR: Authentication failed. ${authError.message}`]);
        setLoading(false);
        return;
      }

      const user = data.user;
      const userRole = user?.app_metadata?.role || user?.user_metadata?.role;
      
      const isAdmin = userRole === "admin";

      if (isAdmin) {
        setLogs((prev) => [...prev, "AUTH: Privilege check PASSED.", "SYS: Granting session tokens...", "SYS: Redirecting to admin core dashboard..."]);
        setSuccess(true);
        setTimeout(() => {
          navigate("/auth/admin/dashboard", { replace: true });
        }, 1200);
      } else {
        // Sign user back out so they don't persist an unauthorized session
        await supabase.auth.signOut();
        setLogs((prev) => [...prev, "ERR: Privilege check FAILED. Role is insufficient.", "SEC: Incident flagged and logged."]);
        setError("Access Denied: Account lacks administrative privileges.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected system error occurred.");
      setLogs((prev) => [...prev, `ERR: Exception caught: ${err?.message || "unknown"}`]);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background bg-grid-pattern px-4 py-12">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative w-full max-w-lg transition-all duration-300">
        
        {/* Glow border outline decoration */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 via-violet-500/30 to-fuchsia-500/50 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse-ring" />

        {/* Card Body */}
        <div className="relative border border-border bg-card/90 dark:bg-card/75 backdrop-blur-xl rounded-2xl p-6 sm:p-10 shadow-2xl flex flex-col gap-6">
          
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center gap-2">
            <a href={logo.url} className="flex items-center gap-3">
              <img
                src={logo.src}
                alt={logo.alt}
                title={logo.title}
                className="h-10 w-10 animate-float"
              />
              <span className="text-2xl font-bold tracking-tight text-foreground">{logo.title}</span>
            </a>
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono font-semibold text-primary uppercase tracking-wider">
              <FiShield className="size-3.5 animate-pulse" />
              Secure Admin Console
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-2">
              System Administrator Login
            </h1>
            <p className="text-muted-foreground text-sm max-w-sm">
              Authorization required. All connection attempts and actions are monitored.
            </p>
          </div>

          {/* Retro Shell Console Logs */}
          <div className="bg-[#0f0f13] border border-border/80 rounded-lg p-3.5 font-mono text-[11px] leading-relaxed text-zinc-400 select-none shadow-inner">
            <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <FiTerminal className="text-primary size-3.5" />
                <span className="font-semibold text-zinc-300 text-xs">console_session_log</span>
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500/80" />
                <span className="w-2 h-2 rounded-full bg-yellow-500/80" />
                <span className="w-2 h-2 rounded-full bg-green-500/80" />
              </div>
            </div>
            <div className="space-y-1 max-h-[110px] overflow-y-auto custom-scrollbar">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-1">
                  <span className="text-primary select-none">&gt;</span>
                  <span className={log.startsWith("ERR") ? "text-red-400" : log.startsWith("SEC") ? "text-yellow-500" : log.includes("PASSED") ? "text-emerald-400" : ""}>
                    {log}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <span className="text-primary select-none">&gt;</span>
                <span className="w-1.5 h-3 bg-primary animate-pulse" />
              </div>
            </div>
          </div>

          {/* Form */}
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2.5">
                <FiAlertTriangle className="size-4 mt-0.5 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}
            
            {success && (
              <div className="p-3 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2.5">
                <FiCheckCircle className="size-4 mt-0.5 shrink-0" />
                <span className="font-medium">Authentication successful! Opening shell...</span>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                  <Input
                    type="email"
                    placeholder="tamilaninstamedia1@gmail.com"
                    className="pl-10 bg-background/50 border-border focus:border-primary/50 focus:ring-primary/20"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading || success}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                </div>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="admin123"
                    className="pl-10 pr-10 bg-background/50 border-border focus:border-primary/50 focus:ring-primary/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading || success}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <FiEyeOff className="size-4" /> : <FiEye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 mt-2">
              <Button 
                type="submit" 
                className="w-full font-semibold bg-primary text-primary-foreground hover:bg-primary/95 shadow-md flex items-center justify-center gap-2"
                disabled={loading || success}
              >
                {loading ? (
                  <>
                    <FiDatabase className="size-4 animate-spin" />
                    Checking Privileges...
                  </>
                ) : (
                  <>
                    <FiShield className="size-4" />
                    Authenticate Operator
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Footer details */}
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono mt-2 border-t border-border/50 pt-4">
            <span>OPUSZEN SECURE SHELL</span>
            <span>v1.2.0</span>
          </div>

        </div>
      </div>
    </div>
  );
}
