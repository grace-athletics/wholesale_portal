import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/lib/pricing";
import { useCart } from "@/contexts/CartContext";
import { ProductGrid } from "@/components/order/ProductGrid";
import { ConfigPanel } from "@/components/order/ConfigPanel";
import { OrderCart } from "@/components/order/OrderCart";
import { LogoSection } from "@/components/order/LogoSection";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function NewOrder() {
  const { items } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [logoChangeRequested, setLogoChangeRequested] = useState(false);
  const [logoChangeNotes, setLogoChangeNotes] = useState("");
  const [newLogoFiles, setNewLogoFiles] = useState<Record<string, File | null>>({});

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return data as Product[];
    },
  });

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Add at least one item to your order");
      return;
    }
    // TODO: Stripe Checkout integration
    toast.info("Stripe checkout coming soon — order saved to cart");
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-semibold">Place Order</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select a product, configure it, and add to your order.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product selection + config */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Product Grid */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Step 1 — Select Product
            </h2>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-36 rounded-lg border bg-muted/30 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <ProductGrid
                products={products}
                selectedId={selectedProduct?.id || null}
                onSelect={setSelectedProduct}
              />
            )}
          </div>

          {/* Step 2: Configuration */}
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Step 2 — Configure
              </h2>
              <ConfigPanel
                product={selectedProduct}
                onAdded={() => toast.success("Added to order")}
              />
            </motion.div>
          )}

          {/* Logo Section — shown after at least 1 item */}
          {items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Logos
              </h2>
              <LogoSection
                logoChangeRequested={logoChangeRequested}
                setLogoChangeRequested={setLogoChangeRequested}
                logoChangeNotes={logoChangeNotes}
                setLogoChangeNotes={setLogoChangeNotes}
                newLogoFiles={newLogoFiles}
                setNewLogoFiles={setNewLogoFiles}
              />
            </motion.div>
          )}
        </div>

        {/* Right: Cart (sticky on desktop) */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-20">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Your Order
            </h2>
            <OrderCart onCheckout={handleCheckout} />
          </div>
        </div>
      </div>
    </div>
  );
}
