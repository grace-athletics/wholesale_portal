import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSubscription?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireSubscription = false,
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isSubscribed } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireSubscription && !isSubscribed && !isAdmin) {
    return <Navigate to="/subscribe" replace />;
  }

  return <>{children}</>;
}
