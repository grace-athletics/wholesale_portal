import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ProtectedRoute,
  PublicOnlyRoute,
  AuthOnlyRoute,
} from "@/components/layout/ProtectedRoute";

// Public pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Subscribe from "./pages/Subscribe";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Client pages
import Dashboard from "./pages/Dashboard";
import Shop from "./pages/Shop";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import ShopifyOrders from "./pages/ShopifyOrders";
import PlaceOrder from "./pages/PlaceOrder";
import Account from "./pages/Account";
import LogoVault from "./pages/LogoVault";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
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
            {/* Public-only routes — redirect logged-in users */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Subscribe — requires auth, but not subscription */}
            <Route path="/subscribe" element={<AuthOnlyRoute><Subscribe /></AuthOnlyRoute>} />

            {/* Client portal — auth + active subscription required */}
            <Route
              element={
                <ProtectedRoute requireSubscription>
                  <AppLayout variant="client" />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/shopify-orders" element={<ShopifyOrders />} />
              <Route path="/place-order" element={<PlaceOrder />} />
              <Route path="/account" element={<Account />} />
              <Route path="/account/logos" element={<LogoVault />} />
            </Route>

            {/* Admin portal — admin role required */}
            <Route
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout variant="admin" />
                </ProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
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
