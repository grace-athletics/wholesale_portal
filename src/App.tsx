import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

// Public pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Subscribe from "./pages/Subscribe";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Client pages
import Dashboard from "./pages/Dashboard";
import NewOrder from "./pages/NewOrder";
import Orders from "./pages/Orders";
import Builders from "./pages/Builders";
import Mockups from "./pages/Mockups";
import Account from "./pages/Account";
import LogoVault from "./pages/LogoVault";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminClients from "./pages/admin/AdminClients";
import AdminRevenue from "./pages/admin/AdminRevenue";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Client portal (auth + subscription required) */}
            <Route
              element={
                <ProtectedRoute requireSubscription>
                  <AppLayout variant="client" />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/order/new" element={<NewOrder />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/builders" element={<Builders />} />
              <Route path="/mockups" element={<Mockups />} />
              <Route path="/account" element={<Account />} />
              <Route path="/account/logos" element={<LogoVault />} />
            </Route>

            {/* Admin portal */}
            <Route
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout variant="admin" />
                </ProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/clients" element={<AdminClients />} />
              <Route path="/admin/revenue" element={<AdminRevenue />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
