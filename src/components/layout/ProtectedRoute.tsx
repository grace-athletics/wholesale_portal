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
  const { user, loading, isAdmin, isSubscribed, profile } = useAuth();

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

  // Admins bypass subscription check
  if (requireSubscription && !isSubscribed && !isAdmin) {
    return <Navigate to="/subscribe" replace />;
  }

  return <>{children}</>;
}

/** Redirects authenticated users away from public-only pages (login, signup) */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, isSubscribed } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    // Route logged-in users to the right portal
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isSubscribed) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/subscribe" replace />;
  }

  return <>{children}</>;
}

/** Requires auth but NOT subscription — for the /subscribe page itself */
export function AuthOnlyRoute({ children }: { children: React.ReactNode }) {
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

  // If already subscribed or admin, skip subscribe page
  if (isSubscribed || isAdmin) {
    return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}
