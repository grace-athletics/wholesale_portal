import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ClientSidebar } from "./ClientSidebar";
import { AdminSidebar } from "./AdminSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { OnboardingGuide, OnboardingStep } from "@/components/OnboardingGuide";
import { useState } from "react";

interface AppLayoutProps {
  variant?: "client" | "admin";
}

function storageKey(userId: string) {
  return `mgb-onboarding-${userId}`;
}

function readStep(userId: string): OnboardingStep {
  const v = localStorage.getItem(storageKey(userId));
  if (v === "order") return "order";
  if (v === "done") return null;
  return "logos"; // default: show step 1
}

function writeStep(userId: string, step: OnboardingStep | "done") {
  localStorage.setItem(storageKey(userId), step ?? "done");
}

export function AppLayout({ variant = "client" }: AppLayoutProps) {
  const { isAdmin, user } = useAuth();
  const isAdminLayout = variant === "admin";
  const location = useLocation();
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(null);

  // Load onboarding state once user is known (client portal only)
  useEffect(() => {
    if (isAdminLayout || !user?.id) return;
    setOnboardingStep(readStep(user.id));
  }, [user?.id, isAdminLayout]);

  // Advance step when user navigates to the target page
  useEffect(() => {
    if (!user?.id || isAdminLayout) return;
    if (onboardingStep === "logos" && location.pathname === "/account/logos") {
      setOnboardingStep("order");
      writeStep(user.id, "order");
    } else if (onboardingStep === "order" && location.pathname === "/order/new") {
      setOnboardingStep(null);
      writeStep(user.id, "done");
    }
  }, [location.pathname, onboardingStep, user?.id, isAdminLayout]);

  const handleAdvance = () => {
    if (!user?.id) return;
    const next: OnboardingStep = onboardingStep === "logos" ? "order" : null;
    setOnboardingStep(next);
    writeStep(user.id, next ?? "done");
  };

  const handleDismiss = () => {
    if (!user?.id) return;
    setOnboardingStep(null);
    writeStep(user.id, "done");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {isAdminLayout ? (
          <AdminSidebar />
        ) : (
          <ClientSidebar onboardingStep={onboardingStep} />
        )}

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

      {/* Onboarding guide overlay (client portal only) */}
      {!isAdminLayout && (
        <OnboardingGuide
          step={onboardingStep}
          onAdvance={handleAdvance}
          onDismiss={handleDismiss}
        />
      )}
    </SidebarProvider>
  );
}
