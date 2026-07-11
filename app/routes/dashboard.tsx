import { useState, useEffect } from "react";
import { type MetaFunction } from "react-router";
import { AdminApp } from "~/components/admin/adminApp";

export const meta: MetaFunction = () => {
  return [
    { title: "Admin Dashboard | OpusZen" },
    {
      name: "description",
      content: "OpusZen API gateway administrator control panel.",
    },
  ];
};

export default function DashboardRoute() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-zinc-200 font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <div className="text-sm tracking-wider uppercase text-zinc-400">Loading OpusZen Admin Panel...</div>
        </div>
      </div>
    );
  }

  return <AdminApp />;
}
