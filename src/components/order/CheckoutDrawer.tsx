import { useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

interface CheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  clientSecret: string | null;
}

export function CheckoutDrawer({ open, onClose, clientSecret }: CheckoutDrawerProps) {
  const fetchClientSecret = useCallback(async () => {
    return clientSecret!;
  }, [clientSecret]);

  // Detect test/live mode mismatch between the publishable key and the session secret.
  // A session created with sk_test_ returns a cs_test_ client_secret;
  // combining that with a pk_live_ key causes a silent blank form.
  const modeMismatch = !!(
    clientSecret &&
    STRIPE_KEY &&
    (
      (clientSecret.startsWith("cs_test_") && STRIPE_KEY.startsWith("pk_live_")) ||
      (clientSecret.startsWith("cs_live_") && STRIPE_KEY.startsWith("pk_test_"))
    )
  );

  if (!clientSecret) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>
        <div className="min-h-[400px]">
          {!STRIPE_KEY ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-3">
              <p className="text-destructive font-medium">Payment unavailable</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                The Stripe publishable key is not configured. Add{" "}
                <code className="text-xs bg-muted px-1 rounded">VITE_STRIPE_PUBLISHABLE_KEY</code>{" "}
                to your Vercel environment variables and redeploy.
              </p>
            </div>
          ) : modeMismatch ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-3">
              <p className="text-destructive font-medium">Stripe mode mismatch</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                The checkout session was created in <strong>test mode</strong> but the publishable key is <strong>live mode</strong> (or vice versa).
                In the Supabase dashboard → Edge Functions → Secrets, make sure{" "}
                <code className="text-xs bg-muted px-1 rounded">STRIPE_SECRET_KEY</code>{" "}
                is a <code className="text-xs bg-muted px-1 rounded">sk_live_</code> key to match your live publishable key.
              </p>
            </div>
          ) : (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
