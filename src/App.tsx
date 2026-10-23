import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import MarketHome from "@/pages/MarketHome";
import CategoryPage from "@/pages/CategoryPage";
import BrandPage from "@/pages/BrandPage";
import ListingPage from "@/pages/ListingPage";
import VendorPortal from "@/pages/VendorPortal";
import AdminConsole from "@/pages/admin/AdminConsole";
import Placeholder from "@/pages/Placeholder";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

// In the Lovable project, add only the /market* and /admin/marketplace routes
// to the existing router; Home, Meals, Progress and Profile already exist there.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Placeholder title="Home" />} />
            <Route path="/meals" element={<Placeholder title="Meals" />} />
            <Route path="/progress" element={<Placeholder title="Progress" />} />
            <Route path="/profile" element={<Placeholder title="Profile" />} />
            <Route path="/market" element={<MarketHome />} />
            <Route path="/market/category/:slug" element={<CategoryPage />} />
            <Route path="/market/brand/:slug" element={<BrandPage />} />
            <Route path="/market/listing/:slug" element={<ListingPage />} />
            <Route path="/market/vendor" element={<VendorPortal />} />
            <Route path="/admin/marketplace" element={<AdminConsole />} />
            <Route path="*" element={<Placeholder title="Page not found" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
