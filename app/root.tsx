import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigation,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { WhatsAppWidget } from "./components/WhatsAppWidget";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
    },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
  { rel: "icon", type: "image/png", href: "/favicon.png" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  let location;
  let navigationState = "idle";
  try {
    location = useLocation();
    const navigation = useNavigation();
    navigationState = navigation.state;
  } catch (e) {
    // Fallback if accessed outside RouterProvider context
  }
  const pathname = location?.pathname || "";
  const isAdminPath = pathname.startsWith("/dashboard") || pathname.startsWith("/auth/admin");

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {navigationState === "loading" && (
          <div className="fixed top-0 left-0 right-0 h-1 z-[9999] bg-primary/20">
            <div 
              className="h-full bg-gradient-to-r from-sky-400 via-violet-500 to-indigo-600 transition-all duration-300 ease-out" 
              style={{
                width: "90%",
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, load 10s cubic-bezier(0.1, 0.8, 0.1, 1) forwards"
              }}
            />
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes load {
                0% { width: 0%; }
                100% { width: 90%; }
              }
            `}} />
          </div>
        )}
        {children}
        {!isAdminPath && <WhatsAppWidget phoneNumber="8098830937" />}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
