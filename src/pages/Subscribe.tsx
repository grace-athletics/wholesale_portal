import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Subscribe() {
  const { profile } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-checkout");
    if (error) throw error;
    if (!data?.clientSecret) throw new Error("No client secret returned");
    return data.clientSecret as string;
  }, []);

  const handleStart = () => {
    setShowCheckout(true);
  };

  if (showCheckout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg space-y-4">
          <div className="text-center">
            <img src={logo} alt="My Glove Brand" className="h-10 object-contain mx-auto" />
            <h2 className="text-lg font-semibold mt-2">Complete Payment</h2>
          </div>
          <div className="rounded-lg border bg-card p-1 min-h-[400px]">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => setShowCheckout(false)}
          >
            ← Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <img src={logo} alt="My Glove Brand" className="h-10 object-contain mx-auto" />
        <h2 className="text-2xl font-semibold">Activate Your Subscription</h2>
        <p className="text-muted-foreground">
          Access the wholesale portal for{" "}
          <span className="font-semibold text-foreground">$49/month</span>.
          Place unlimited orders, use the Blank Glove Builder, and manage your brand.
        </p>
        <Button size="lg" className="w-full" onClick={handleStart}>
          Activate Subscription — $49/mo
        </Button>
        <p className="text-xs text-muted-foreground">
          Secure payment powered by Stripe.
        </p>
      </div>
    </div>
  );
}
