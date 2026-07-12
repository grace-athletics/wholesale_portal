import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function Shop() {
  const { user } = useAuth();
  const [hasLogos, setHasLogos] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkLogos() {
      if (!user) return;
      const { data } = await supabase
        .from("client_logos")
        .select("wrist_logo_url, thumb_logo_url, palm_logo_url")
        .eq("user_id", user.id)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      const allUploaded = data?.wrist_logo_url && data?.thumb_logo_url && data?.palm_logo_url;
      setHasLogos(!!allUploaded);
      setLoading(false);
    }
    checkLogos();
  }, [user]);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-semibold">Shop Custom Gloves</h1>
        <p className="text-muted-foreground mt-2">
          Build your custom gloves on our main site — your logos will be automatically applied to every order.
        </p>
      </motion.div>

      {/* Logo Status Card */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`rounded-lg border p-6 ${
            hasLogos
              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
              : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
          }`}
        >
          <div className="flex items-start gap-4">
            {hasLogos ? (
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {hasLogos ? "Your Logos Are Ready" : "Upload Your Logos First"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {hasLogos
                  ? "All orders placed on myglovebuilder.com will automatically include your uploaded logos (wrist, thumb, and palm)."
                  : "Before placing orders, upload your logos to the Logo Vault so they can be applied to every glove you order."}
              </p>
              {!hasLogos && (
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <a href="/account/logos">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Go to Logo Vault
                  </a>
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Shop CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="rounded-lg border bg-card p-8 text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Wholesale Pricing Active
        </div>
        <h2 className="text-2xl font-semibold">Ready to Order?</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Visit our custom glove builder to design and order your gloves. Your subscription unlocks exclusive wholesale pricing.
        </p>
        <Button asChild size="lg" className="mt-4">
          <a href="https://www.myglovebuilder.com/" target="_blank" rel="noopener noreferrer">
            Open Glove Builder <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </motion.div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="rounded-lg border bg-card/50 p-6"
      >
        <h3 className="font-semibold mb-4">How It Works</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <Badge variant="outline" className="h-6 w-6 flex items-center justify-center rounded-full flex-shrink-0">
              1
            </Badge>
            <span className="text-muted-foreground">
              Build your custom glove on <strong>myglovebuilder.com</strong>
            </span>
          </li>
          <li className="flex gap-3">
            <Badge variant="outline" className="h-6 w-6 flex items-center justify-center rounded-full flex-shrink-0">
              2
            </Badge>
            <span className="text-muted-foreground">
              Complete checkout — your logos are automatically applied
            </span>
          </li>
          <li className="flex gap-3">
            <Badge variant="outline" className="h-6 w-6 flex items-center justify-center rounded-full flex-shrink-0">
              3
            </Badge>
            <span className="text-muted-foreground">
              Track your order status right here in the portal
            </span>
          </li>
        </ol>
      </motion.div>
    </div>
  );
}
