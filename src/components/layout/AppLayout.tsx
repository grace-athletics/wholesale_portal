import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ClientSidebar } from "./ClientSidebar";
import { AdminSidebar } from "./AdminSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { Menu } from "lucide-react";

interface AppLayoutProps {
  variant?: "client" | "admin";
}

export function AppLayout({ variant = "client" }: AppLayoutProps) {
  const { isAdmin } = useAuth();
  const isAdminLayout = variant === "admin";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {isAdminLayout ? <AdminSidebar /> : <ClientSidebar />}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with sidebar trigger */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-card px-4 md:px-6">
            <SidebarTrigger className="text-foreground" />
            <div className="flex-1" />
          </header>

          {/* Main scrollable content */}
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
            <Outlet />
          </main>
        </div>

        {/* Mobile bottom tab bar — client only */}
        {!isAdminLayout && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
}
