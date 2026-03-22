import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function Subscribe() {
  const { profile } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <h1 className="text-xl font-bold tracking-widest text-primary">
          MY GLOVE BRAND
        </h1>
        <h2 className="text-2xl font-semibold">Activate Your Subscription</h2>
        <p className="text-muted-foreground">
          Access the wholesale portal for <span className="font-semibold text-foreground">$49/month</span>.
          Place unlimited orders, use the Glove Builder, and manage your brand.
        </p>
        <Button size="lg" className="w-full">
          Activate Subscription — $49/mo
        </Button>
        <p className="text-xs text-muted-foreground">
          You'll be redirected to Stripe to complete payment.
        </p>
      </div>
    </div>
  );
}
