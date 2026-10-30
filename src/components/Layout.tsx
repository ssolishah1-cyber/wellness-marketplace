import { useEffect } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Home, Salad, LineChart, ShoppingBag, User, Shield, Store } from "lucide-react";
import { isDemoMode, supabase } from "@/integrations/supabase/client";
import { getDemoPersona, onDemoPersonaChange, setDemoPersona, type DemoPersona } from "@/lib/demoApi";
import { useViewer } from "./ui";
import { useProfile } from "./nutrition";

// Pages a new user may visit before finishing setup.
const SETUP_EXEMPT = ["/welcome", "/reset-password", "/privacy", "/terms", "/profile", "/signup", "/login", "/support", "/delete-account"];

const APP_NAME = (import.meta.env.VITE_APP_NAME as string | undefined) || "Nutrition App";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/meals", label: "Meals", icon: Salad },
  { to: "/progress", label: "Progress", icon: LineChart },
  { to: "/market", label: "Market", icon: ShoppingBag },
  { to: "/profile", label: "Profile", icon: User },
];

export default function Layout() {
  const qc = useQueryClient();
  const { data: viewer } = useViewer();
  const profile = useProfile();
  const { pathname } = useLocation();
  const needsSetup = !!viewer?.userId && !!profile.data && !profile.data.onboarded_at && !SETUP_EXEMPT.includes(pathname);

  // New page starts at the top.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  useEffect(() => {
    if (isDemoMode) return onDemoPersonaChange(() => qc.invalidateQueries());
    const { data } = supabase!.auth.onAuthStateChange(() => qc.invalidateQueries());
    return () => data.subscription.unsubscribe();
  }, [qc]);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {isDemoMode && <DemoBar />}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-brand-700">
            <Salad className="h-5 w-5" /> {APP_NAME}
          </NavLink>
          <nav className="ml-4 hidden gap-1 md:flex">
            {NAV.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm ${isActive ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {viewer?.userId && (
              <NavLink to="/market/vendor" className="btn-outline px-3 py-1.5 text-xs"><Store className="h-3.5 w-3.5" /> Vendor portal</NavLink>
            )}
            {viewer?.isStaff && (
              <NavLink to="/admin" className="btn-outline px-3 py-1.5 text-xs"><Shield className="h-3.5 w-3.5" /> {viewer.isAdmin ? "Admin" : "Review console"}</NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        {needsSetup ? <Navigate to="/welcome" replace /> : <Outlet />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom,0px)] md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? "font-semibold text-brand-700" : "text-slate-500"}`}>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

const PERSONAS: { id: DemoPersona; label: string }[] = [
  { id: "visitor", label: "Visitor" },
  { id: "member", label: "App user" },
  { id: "vendor", label: "Vendor" },
  { id: "admin", label: "Admin" },
];

function DemoBar() {
  const current = getDemoPersona();
  return (
    <div className="bg-slate-900 px-4 py-2 text-xs text-slate-200">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
        <span className="font-semibold text-amber-300">Demo mode</span>
        <span className="hidden sm:inline">sample data · view as:</span>
        {PERSONAS.map((p) => (
          <button key={p.id} onClick={() => setDemoPersona(p.id)}
            className={`rounded-full px-2.5 py-0.5 ${current === p.id ? "bg-amber-300 font-semibold text-slate-900" : "bg-slate-700 hover:bg-slate-600"}`}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
