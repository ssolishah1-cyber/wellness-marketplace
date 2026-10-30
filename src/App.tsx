import { useEffect } from "react";
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { initNative } from "@/lib/native";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import MarketHome from "@/pages/MarketHome";
import CategoryPage from "@/pages/CategoryPage";
import BrandPage from "@/pages/BrandPage";
import ListingPage from "@/pages/ListingPage";
import VendorPortal from "@/pages/VendorPortal";
import AdminConsole from "@/pages/admin/AdminConsole";
import Placeholder from "@/pages/Placeholder";
import HomePage from "@/pages/HomePage";
import MealsPage from "@/pages/MealsPage";
import ProgressPage from "@/pages/ProgressPage";
import WelcomePage from "@/pages/WelcomePage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import { PrivacyPage, TermsPage } from "@/pages/LegalPage";
import HelpPage from "@/pages/HelpPage";
import { ToastProvider } from "@/components/Toast";
import ProfilePage from "@/pages/ProfilePage";
import { useViewer } from "@/components/ui";
import ConditionPage from "@/pages/ConditionPage";
import WorkoutsPage from "@/pages/WorkoutsPage";
import ExerciseLibraryPage from "@/pages/ExerciseLibraryPage";
import LearnPage, { ArticlePage } from "@/pages/LearnPage";

// The shareable demo build keeps routes in memory (no server rewrites needed)
// and opens straight on the Market. VITE_BASE lets the app live under a
// sub-path such as /app on the Vercel site.
const basename = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || undefined;
function Router({ children }: { children: React.ReactNode }) {
  return import.meta.env.VITE_ROUTER === "memory"
    ? <MemoryRouter initialEntries={["/market"]}>{children}</MemoryRouter>
    : <BrowserRouter basename={basename}>{children}</BrowserRouter>;
}

// Phone app: back button, deep links (sign-up confirmation, password reset), splash screen.
function NativeBridge() {
  const navigate = useNavigate();
  useEffect(() => initNative({
    navigate: (p) => navigate(p, { replace: true }),
    onAuthLink: async (u) => {
      const code = u.searchParams.get("code");
      if (code && supabase) await supabase.auth.exchangeCodeForSession(code);
    },
  }), [navigate]);
  return null;
}

// Direct sign-up link; people who are already signed in go to Home.
function SignUpRoute() {
  const { data: viewer, isLoading } = useViewer();
  if (isLoading) return null;
  return viewer?.userId ? <Navigate to="/" replace /> : <ProfilePage signUp />;
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
      <Router>
        <NativeBridge />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/meals" element={<MealsPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/signup" element={<SignUpRoute />} />
            <Route path="/login" element={<ProfilePage />} />
            <Route path="/workouts" element={<WorkoutsPage />} />
            <Route path="/workouts/library" element={<ExerciseLibraryPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/learn/:slug" element={<ArticlePage />} />
            <Route path="/health/:id" element={<ConditionPage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/support" element={<HelpPage />} />
            <Route path="/delete-account" element={<HelpPage />} />
            <Route path="/market" element={<MarketHome />} />
            <Route path="/market/category/:slug" element={<CategoryPage />} />
            <Route path="/market/brand/:slug" element={<BrandPage />} />
            <Route path="/market/listing/:slug" element={<ListingPage />} />
            <Route path="/market/vendor" element={<VendorPortal />} />
            <Route path="/admin" element={<AdminConsole />} />
            <Route path="/admin/marketplace" element={<AdminConsole start="queue" />} />
            <Route path="*" element={<Placeholder title="Page not found" />} />
          </Route>
        </Routes>
      </Router>
      </ToastProvider>
    </QueryClientProvider>
  );
}
