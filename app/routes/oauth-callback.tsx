import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

export default function OAuthCallbackRoute() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session && session.user) {
          const email = session.user.email;
          if (email && active) {
            // Trigger server-side SMTP login notification
            try {
              await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              });
            } catch (mailErr) {
              console.error("Failed to send OAuth login notification:", mailErr);
            }
          }
          navigate("/key-status", { replace: true });
        } else {
          // Listen to state changes in case session parses asynchronously
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (currentSession && currentSession.user && active) {
              const email = currentSession.user.email;
              if (email) {
                try {
                  await fetch("/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                  });
                } catch (mailErr) {
                  console.error("Failed to send OAuth login notification:", mailErr);
                }
              }
              subscription.unsubscribe();
              navigate("/key-status", { replace: true });
            }
          });

          // Redirect to login if auth fails to establish within 5 seconds
          setTimeout(() => {
            if (active) {
              subscription.unsubscribe();
              navigate("/auth/login", { replace: true });
            }
          }, 5000);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Authentication failed.");
          setTimeout(() => navigate("/auth/login", { replace: true }), 3000);
        }
      }
    }

    handleCallback();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground font-mono">
      <div className="flex flex-col items-center gap-4">
        {error ? (
          <div className="text-red-500 text-sm p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md">
            {error}. Redirecting to login...
          </div>
        ) : (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <div className="text-sm tracking-wider uppercase text-muted-foreground animate-pulse">Completing Google Sign In...</div>
          </>
        )}
      </div>
    </div>
  );
}
