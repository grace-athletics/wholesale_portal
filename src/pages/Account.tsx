import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function Account() {
  const { profile } = useAuth();

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
          <Badge variant={profile?.subscription_status === "active" ? "default" : "secondary"}>
            {profile?.subscription_status || "inactive"}
          </Badge>
          {profile?.subscription_started_at && (
            <span className="text-xs text-muted-foreground">
              Since {new Date(profile.subscription_started_at).toLocaleDateString()}
            </span>
          )}
        </div>
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
