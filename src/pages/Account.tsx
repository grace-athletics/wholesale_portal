import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink, Loader2 } from "lucide-react";

export default function Account() {
  const { profile, isSubscribed } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Account</h1>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <div className="grid gap-2 text-sm">
          <div><span className="text-muted-foreground">Name:</span> {profile?.full_name || "—"}</div>
          <div><span className="text-muted-foreground">Company:</span> {profile?.company_name || "—"}</div>
          <div><span className="text-muted-foreground">Email:</span> {profile?.email || "—"}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Subscription</h2>
        <div className="flex items-center gap-2">
          <Badge variant={isSubscribed ? "default" : "secondary"}>
            {profile?.subscription_status || "inactive"}
          </Badge>
          {profile?.subscription_started_at && (
            <span className="text-xs text-muted-foreground">
              Since {new Date(profile.subscription_started_at).toLocaleDateString()}
            </span>
          )}
        </div>
        {isSubscribed && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageBilling}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Manage Billing
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-3">
        <h2 className="font-semibold">Quick Links</h2>
        <div className="flex flex-col gap-2 text-sm">
          <Link to="/account/logos" className="text-primary hover:underline">Manage Logos →</Link>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-2">Account Manager</h2>
        <p className="text-sm text-muted-foreground">
          Your Account Manager: <strong className="text-foreground">James Hintz</strong> —{" "}
          <a href="mailto:james@myglovebrand.com" className="text-primary hover:underline">
            james@myglovebrand.com
          </a>
        </p>
      </div>
    </div>
  );
}
