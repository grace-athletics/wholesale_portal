import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product, BATTING_MIN_TOTAL, formatCents } from "@/lib/pricing";
import { useCart } from "@/contexts/CartContext";
import { ProductGrid } from "@/components/order/ProductGrid";
import { ConfigPanel, ConfigPanelHandle } from "@/components/order/ConfigPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, X, Truck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { OrderCart } from "@/components/order/OrderCart";
import { LogoSection } from "@/components/order/LogoSection";
import { CheckoutDrawer } from "@/components/order/CheckoutDrawer";
import { GloveScreenshotStep } from "@/components/order/GloveScreenshotStep";
import { motion } from "framer-motion";
import { toast } from "sonner";

const GLOVE_ANGLES = ["Front", "Back", "Thumb", "Pinky"] as const;
const BATTING_ANGLES = ["Front", "Back"] as const;

function isBattingProduct(product: Product | null) {
  return product?.name.toLowerCase().includes("batting") ?? false;
}

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
  const [shipToName, setShipToName] = useState("");
  const [shipToAddress, setShipToAddress] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const pendingImagesRef = useRef<PendingImages>({});
  const configRef = useRef<ConfigPanelHandle>(null);
  const [currentGloveImages, setCurrentGloveImages] = useState<Record<number, File>>({});
  const [hasLogosOnFile, setHasLogosOnFile] = useState(false);
  const [, setTick] = useState(0);
  const [dragOverAngle, setDragOverAngle] = useState<number | null>(null);

  const handleScreenshotDrop = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverAngle(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setCurrentGloveImages((prev) => ({ ...prev, [idx]: file }));
    }
  }, []);

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

  // Screenshots are available for all products
  const hasCustomGloves = items.length > 0 || !!selectedProduct;

  const uploadGloveImages = async (orderId: string) => {
    const allImages = pendingImagesRef.current;
    const entries = Object.entries(allImages);
    if (entries.length === 0) return;

    let uploaded = 0;
    for (const [_itemId, angleFiles] of entries) {
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
          const { error: insertErr } = await supabase.from("order_images").insert({
            order_id: orderId,
            angle,
            image_url: urlData.publicUrl,
          });
          if (insertErr) throw insertErr;
          uploaded++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`Failed to upload angle ${angle}:`, msg);
          toast.error(`Screenshot upload failed: ${msg}`);
        }
      }
    }
    if (uploaded > 0) toast.success(`${uploaded} glove screenshot(s) uploaded`);
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

      const shippingNote = [
        shipToName ? `Ship to: ${shipToName}` : "",
        shipToAddress ? `Address: ${shipToAddress}` : "",
      ].filter(Boolean).join("\n");

      const { data, error } = await supabase.functions.invoke("create-order-checkout", {
        body: {
          items: orderItems,
          notes: shippingNote || null,
          logo_change_requested: logoChangeRequested,
          logo_change_notes: logoChangeNotes || null,
          promo_code: promoCode.trim() || null,
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
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
                onAdded={(newItemId) => {
                  // Transfer current glove images to the newly added cart item using the known ID
                  if (Object.keys(currentGloveImages).length > 0) {
                    pendingImagesRef.current[newItemId] = { ...currentGloveImages };
                    setCurrentGloveImages({});
                  }
                  setTick((t) => t + 1);
                  toast.success("Added to order");
                }}
                onConfigChange={() => setTick((t) => t + 1)}
              />
            </motion.div>
          )}

          {/* Step 3: Upload Glove Screenshots */}
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Step 3 — Upload Glove Screenshot
              </h2>
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Open your design link, run the <span className="font-medium text-foreground">MGB Screenshot</span> bookmarklet, then upload the composite image it saves.
                </p>
                {currentGloveImages[0] ? (
                  <div
                    className="relative rounded-md border overflow-hidden bg-muted/30 group"
                    onDragOver={(e) => { e.preventDefault(); setDragOverAngle(0); }}
                    onDragLeave={() => setDragOverAngle(null)}
                    onDrop={(e) => handleScreenshotDrop(0, e)}
                  >
                    <img
                      src={URL.createObjectURL(currentGloveImages[0])}
                      alt="Glove composite"
                      className="w-full object-contain max-h-56"
                    />
                    <button
                      type="button"
                      onClick={() => setCurrentGloveImages({})}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label
                    className={`cursor-pointer flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 transition-colors ${dragOverAngle === 0 ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-muted/20 hover:bg-muted/40"}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOverAngle(0); }}
                    onDragLeave={() => setDragOverAngle(null)}
                    onDrop={(e) => handleScreenshotDrop(0, e)}
                  >
                    <Upload className={`h-7 w-7 ${dragOverAngle === 0 ? "text-primary" : "text-muted-foreground/50"}`} />
                    <span className="text-sm text-muted-foreground">{dragOverAngle === 0 ? "Drop image here" : "Upload or drop composite screenshot"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setCurrentGloveImages({ 0: f });
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Screenshots for items already added to cart */}
              {items.length > 0 && (
                <div className="mt-4">
                  <GloveScreenshotStep
                    items={items}
                    pendingImagesRef={pendingImagesRef}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Confirm Logos */}
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {selectedProduct?.show_recipe_url ? "Step 4" : "Step 3"} — Confirm Logos
              </h2>
              <LogoSection
                isBatting={isBattingProduct(selectedProduct)}
                logoChangeRequested={logoChangeRequested}
                setLogoChangeRequested={setLogoChangeRequested}
                logoChangeNotes={logoChangeNotes}
                setLogoChangeNotes={setLogoChangeNotes}
                newLogoFiles={newLogoFiles}
                setNewLogoFiles={setNewLogoFiles}
                onLogoStatusChange={setHasLogosOnFile}
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
              <div className="rounded-lg border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Line Total</p>
                    <p className="text-xl font-bold">
                      {formatCents(configRef.current?.getPriceResult().lineTotal ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCents(configRef.current?.getPriceResult().unitPrice ?? 0)} × {configRef.current?.getConfig().quantity ?? 0}
                    </p>
                  </div>
                  {(() => {
                    const configValid = configRef.current?.isValid() ?? false;
                    const logosReady = hasLogosOnFile || logoChangeRequested;
                    const allReady = configValid && logosReady;

                    return (
                      <div className="space-y-2">
                        <Button
                          onClick={() => configRef.current?.handleAdd()}
                          disabled={!allReady}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add to Order
                        </Button>
                        {!allReady && (
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {!configValid && <p>• Complete product configuration</p>}
                            {!logosReady && <p>• Confirm logos on file or request a change</p>}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={configRef.current?.getConfig().notes || ""}
                    onChange={(e) => configRef.current?.updateNotes(e.target.value)}
                    placeholder="Any special instructions..."
                    rows={2}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Shipping + Cart (sticky on desktop) */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* Shipping Instructions */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Shipping
              </h2>
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Truck className="h-4 w-4" />
                  <span className="text-xs font-medium">Ship To</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Customer / Team Name</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Rake Baseball"
                      value={shipToName}
                      onChange={(e) => setShipToName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Ship-To Address</Label>
                    <Textarea
                      className="mt-1 resize-none"
                      rows={3}
                      placeholder={"123 Main St\nCity, State 12345"}
                      value={shipToAddress}
                      onChange={(e) => setShipToAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Your Order
              </h2>
              <OrderCart
                onCheckout={handleCheckout}
                loading={checkoutLoading}
                promoCode={promoCode}
                onPromoCodeChange={setPromoCode}
              />
            </div>
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
