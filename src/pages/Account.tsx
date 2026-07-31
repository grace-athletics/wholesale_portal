import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ExternalLink, Loader2 } from "lucide-react";

export default function Account() {
  const { profile, isSubscribed } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordLoading(false);
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

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={passwordLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={passwordLoading}
            />
          </div>

          <Button type="submit" size="sm" disabled={passwordLoading}>
            {passwordLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </form>
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
