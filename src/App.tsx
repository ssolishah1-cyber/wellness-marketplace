import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
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
import { ToastProvider } from "@/components/Toast";
import ProfilePage from "@/pages/ProfilePage";

// The shareable demo build keeps routes in memory (no server rewrites needed)
// and opens straight on the Market. VITE_BASE lets the app live under a
// sub-path such as /app on the Vercel site.
const basename = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || undefined;
function Router({ children }: { children: React.ReactNode }) {
  return import.meta.env.VITE_ROUTER === "memory"
    ? <MemoryRouter initialEntries={["/market"]}>{children}</MemoryRouter>
    : <BrowserRouter basename={basename}>{children}</BrowserRouter>;
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/meals" element={<MealsPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/market" element={<MarketHome />} />
            <Route path="/market/category/:slug" element={<CategoryPage />} />
            <Route path="/market/brand/:slug" element={<BrandPage />} />
            <Route path="/market/listing/:slug" element={<ListingPage />} />
            <Route path="/market/vendor" element={<VendorPortal />} />
            <Route path="/admin/marketplace" element={<AdminConsole />} />
            <Route path="*" element={<Placeholder title="Page not found" />} />
          </Route>
        </Routes>
      </Router>
      </ToastProvider>
    </QueryClientProvider>
  );
}
