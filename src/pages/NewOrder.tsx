import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product, BATTING_MIN_TOTAL, formatCents } from "@/lib/pricing";
import { useCart } from "@/contexts/CartContext";
import { ProductGrid } from "@/components/order/ProductGrid";
import { ConfigPanel, ConfigPanelHandle } from "@/components/order/ConfigPanel";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { OrderCart } from "@/components/order/OrderCart";
import { LogoSection } from "@/components/order/LogoSection";
import { CheckoutDrawer } from "@/components/order/CheckoutDrawer";
import { GloveScreenshotStep } from "@/components/order/GloveScreenshotStep";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Pending images keyed by cart item id -> angle index -> File
type PendingImages = Record<string, Record<number, File>>;

export default function NewOrder() {
  const { items, clearCart } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [logoChangeRequested, setLogoChangeRequested] = useState(false);
  const [logoChangeNotes, setLogoChangeNotes] = useState("");
  const [newLogoFiles, setNewLogoFiles] = useState<Record<string, File | null>>({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const pendingImagesRef = useRef<PendingImages>({});
  const configRef = useRef<ConfigPanelHandle>(null);
  const [, setTick] = useState(0);

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

  // Check if any cart items need glove screenshots
  const hasCustomGloves = items.some((item) => item.product.show_recipe_url);

  const uploadGloveImages = async (orderId: string) => {
    const allImages = pendingImagesRef.current;
    for (const [_itemId, angleFiles] of Object.entries(allImages)) {
      for (const [angleIdx, file] of Object.entries(angleFiles)) {
        const angle = Number(angleIdx) + 1;
        const ext = file.name.split(".").pop() || "png";
        const path = `${orderId}/angle-${angle}-${_itemId}.${ext}`;
        try {
          const { error: uploadErr } = await supabase.storage
            .from("order-images")
            .upload(path, file, { upsert: true });
          if (uploadErr) throw uploadErr;
          const { data: urlData } = supabase.storage
            .from("order-images")
            .getPublicUrl(path);
          await supabase.from("order_images").insert({
            order_id: orderId,
            angle,
            image_url: urlData.publicUrl,
          });
        } catch (err: any) {
          console.error(`Failed to upload angle ${angle}:`, err.message);
        }
      }
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error("Add at least one item to your order");
      return;
    }

    const battingTotal = items
      .filter((i) => i.product.name.toLowerCase().includes("batting"))
      .reduce((sum, i) => sum + i.config.quantity, 0);

    if (battingTotal > 0 && battingTotal < BATTING_MIN_TOTAL) {
      toast.error(
        `Batting Gloves require a minimum total of ${BATTING_MIN_TOTAL} pairs across all sizes. You currently have ${battingTotal}.`
      );
      return;
    }

    setCheckoutLoading(true);
    try {
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        leather_type: item.config.leather_type || null,
        hand: item.config.hand || null,
        position: item.config.position || null,
        size: item.config.size || null,
        has_flag: item.config.has_flag,
        quantity: item.config.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
        builder_recipe_url: item.config.builder_recipe_url || null,
        notes: item.config.notes || null,
      }));

      const { data, error } = await supabase.functions.invoke("create-order-checkout", {
        body: {
          items: orderItems,
          notes: null,
          logo_change_requested: logoChangeRequested,
          logo_change_notes: logoChangeNotes || null,
        },
      });

      if (error) throw error;

      if (data?.clientSecret) {
        const orderId = data.order_id;
        if (orderId) {
          await uploadGloveImages(orderId);
        }

        clearCart();
        pendingImagesRef.current = {};
        setCheckoutSecret(data.clientSecret);
        setShowCheckout(true);
        toast.success(`Order ${data.order_number} created! Complete payment below.`);
      } else {
        throw new Error("No checkout session returned");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
    } finally {
      setCheckoutLoading(false);
    }
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
        {/* Left: Steps */}
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
                ref={configRef}
                product={selectedProduct}
                onAdded={() => {
                  setTick((t) => t + 1);
                  toast.success("Added to order");
                }}
                onConfigChange={() => setTick((t) => t + 1)}
              />
            </motion.div>
          )}

          {/* Step 3: Upload Glove Screenshots */}
          {hasCustomGloves && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Step 3 — Upload Glove Screenshots
              </h2>
              <GloveScreenshotStep
                items={items.filter((item) => item.product.show_recipe_url)}
                pendingImagesRef={pendingImagesRef}
              />
            </motion.div>
          )}

          {/* Step 4: Confirm Logos */}
          {items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {hasCustomGloves ? "Step 4" : "Step 3"} — Confirm Logos
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

          {/* Line Total + Add to Order — below all steps */}
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center justify-between rounded-lg border bg-card p-5">
                <div>
                  <p className="text-xs text-muted-foreground">Line Total</p>
                  <p className="text-xl font-bold">
                    {formatCents(configRef.current?.getPriceResult().lineTotal ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCents(configRef.current?.getPriceResult().unitPrice ?? 0)} × {configRef.current?.getConfig().quantity ?? 0}
                  </p>
                </div>
                <Button
                  onClick={() => configRef.current?.handleAdd()}
                  disabled={!configRef.current?.isValid()}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add to Order
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Cart (sticky on desktop) */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-20">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Your Order
            </h2>
            <OrderCart onCheckout={handleCheckout} loading={checkoutLoading} />
          </div>
        </div>
      </div>

      <CheckoutDrawer
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        clientSecret={checkoutSecret}
      />
    </div>
  );
}
