"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Building2, BarChart3, Clock, Calendar,
  Settings, Zap, Microscope, LogOut, Shield,
} from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard",  id: "dashboard" },
  { icon: Building2,       label: "Companies",  id: "companies" },
  { icon: BarChart3,       label: "Market",     id: "market" },
  { icon: Microscope,      label: "Research",   id: "research" },
  { icon: Clock,           label: "History",    id: "history" },
  { icon: Calendar,        label: "Schedule",   id: "schedule" },
  { icon: Settings,        label: "Settings",   id: "settings" },
];

function initials(name: string) {
  return (name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
}

type AppSession = { user: { id: string; role: string; name?: string | null; email?: string | null } }

export default function Sidebar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  const { data: rawSession } = useSession();
  const session = rawSession as AppSession | null;
  const router = useRouter();
  const isAdmin = session?.user?.role === "admin";

  return (
    <aside
      className="fixed left-0 top-0 h-full w-[68px] flex flex-col items-center py-5 gap-2 z-50"
      style={{ background: "#0e0e11" }}
    >
      {/* Logo */}
      <div className="mb-4 flex flex-col items-center gap-1">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #a3ff6e 0%, #4ade80 100%)" }}
        >
          <Zap className="w-5 h-5 text-black" fill="black" />
        </div>
      </div>

      {/* Nav icons */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV.map(({ icon: Icon, label, id }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            title={label}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group"
            style={{
              background: active === id ? "#1e1e24" : "transparent",
              color: active === id ? "#ffffff" : "#555566",
            }}
          >
            {active === id && (
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                style={{ background: "#a3ff6e" }}
              />
            )}
            <Icon className="w-[18px] h-[18px]" />
            <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              {label}
            </span>
          </button>
        ))}
      </nav>

      {/* Bottom: admin link + logout + user avatar */}
      <div className="flex flex-col items-center gap-1 mt-2">
        {/* Admin panel — only for admins */}
        {isAdmin && (
          <button
            onClick={() => router.push("/admin")}
            title="Admin Panel"
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group"
            style={{ color: "#a3ff6e" }}
          >
            <Shield className="w-[18px] h-[18px]" />
            <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              Admin Panel
            </span>
          </button>
        )}

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={`Sign out (${session?.user?.email ?? ""})`}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group"
          style={{ color: "#555566" }}
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            Sign Out
          </span>
        </button>

        {/* User avatar */}
        <div
          title={session?.user?.name ?? session?.user?.email ?? ""}
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-black mt-1 cursor-default"
          style={{ background: "linear-gradient(135deg, #a3ff6e 0%, #4ade80 100%)" }}
        >
          {initials(session?.user?.name ?? session?.user?.email ?? "?")}
        </div>
      </div>
    </aside>
  );
}
