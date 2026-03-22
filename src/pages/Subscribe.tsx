import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Subscribe() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <h1 className="text-xl font-bold tracking-widest text-primary">
          MY GLOVE BRAND
        </h1>
        <h2 className="text-2xl font-semibold">Activate Your Subscription</h2>
        <p className="text-muted-foreground">
          Access the wholesale portal for{" "}
          <span className="font-semibold text-foreground">$49/month</span>.
          Place unlimited orders, use the Glove Builder, and manage your brand.
        </p>
        <Button size="lg" className="w-full" onClick={handleCheckout} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecting to Stripe…
            </>
          ) : (
            "Activate Subscription — $49/mo"
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          You'll be redirected to Stripe to complete payment.
        </p>
      </div>
    </div>
  );
}
