import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product, CartItem, CartItemConfig, BATTING_MIN_TOTAL, formatCents } from "@/lib/pricing";
import { useCart } from "@/contexts/CartContext";
import { ProductGrid } from "@/components/order/ProductGrid";
import { ConfigPanel, ConfigPanelHandle } from "@/components/order/ConfigPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, X, Truck, HelpCircle, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const DRAFT_KEY = "mgb-order-draft";

function loadDraft(): Record<string, any> {
  try {
    const v = localStorage.getItem(DRAFT_KEY);
    return v ? JSON.parse(v) : {};
  } catch {
    return {};
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export default function NewOrder() {
  const { items, clearCart, removeItem } = useCart();
  const [draft] = useState(() => loadDraft());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [logoChangeRequested, setLogoChangeRequested] = useState<boolean>(draft.logoChangeRequested ?? false);
  const [logoChangeNotes, setLogoChangeNotes] = useState<string>(draft.logoChangeNotes ?? "");
  const [newLogoFiles, setNewLogoFiles] = useState<Record<string, File | null>>({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [shipToName, setShipToName] = useState<string>(draft.shipToName ?? "");
  const [shipToAddress, setShipToAddress] = useState<string>(draft.shipToAddress ?? "");
  const [promoCode, setPromoCode] = useState<string>(draft.promoCode ?? "");
  const pendingImagesRef = useRef<PendingImages>({});
  const configRef = useRef<ConfigPanelHandle>(null);
  const [currentGloveImages, setCurrentGloveImages] = useState<Record<number, File>>({});
  const [hasLogosOnFile, setHasLogosOnFile] = useState(false);
  const [, setTick] = useState(0);
  const [dragOverAngle, setDragOverAngle] = useState<number | null>(null);
  const [showBookmarkGuide, setShowBookmarkGuide] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CartItemConfig | null>(null);
  const [editingKey, setEditingKey] = useState(0);

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

  // Restore selected product from draft once products have loaded
  useEffect(() => {
    if (draft.selectedProductId && products.length > 0 && !selectedProduct) {
      const p = products.find((p) => p.id === draft.selectedProductId);
      if (p) setSelectedProduct(p);
    }
  }, [products]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist form state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        selectedProductId: selectedProduct?.id ?? null,
        logoChangeRequested,
        logoChangeNotes,
        shipToName,
        shipToAddress,
        promoCode,
      })
    );
  }, [selectedProduct, logoChangeRequested, logoChangeNotes, shipToName, shipToAddress, promoCode]);

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

  const handleEdit = (item: CartItem) => {
    removeItem(item.id);
    setSelectedProduct(item.product);
    setEditingConfig(item.config);
    setEditingKey((k) => k + 1); // force ConfigPanel to remount with fresh state
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        clearDraft();
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
                {editingConfig ? "Step 2 — Edit Item" : "Step 2 — Configure"}
              </h2>
              <ConfigPanel
                key={editingKey}
                ref={configRef}
                product={selectedProduct}
                initialConfig={editingConfig ?? (draft.draftConfig as CartItemConfig | undefined) ?? undefined}
                onAdded={(newItemId) => {
                  // Transfer current glove images to the newly added cart item using the known ID
                  if (Object.keys(currentGloveImages).length > 0) {
                    pendingImagesRef.current[newItemId] = { ...currentGloveImages };
                    setCurrentGloveImages({});
                  }
                  setTick((t) => t + 1);
                  toast.success(editingConfig ? "Item updated" : "Added to order");
                  setEditingConfig(null);
                  // Clear the in-progress config from the draft
                  try {
                    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
                    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, draftConfig: null, selectedProductId: null }));
                  } catch {}
                  // Reset the form so the user can start a fresh item
                  setSelectedProduct(null);
                }}
                onConfigChange={() => {
                  setTick((t) => t + 1);
                  // Persist the current in-progress config so it survives navigation
                  const cfg = configRef.current?.getConfig();
                  if (cfg) {
                    try {
                      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
                      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, draftConfig: cfg }));
                    } catch {}
                  }
                }}
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
                  Open your design link, run the <span className="font-medium text-foreground">Glove Image</span> bookmarklet, then upload the image it saves.{" "}
                  <button
                    type="button"
                    onClick={() => setShowBookmarkGuide(true)}
                    className="inline-flex items-center gap-0.5 text-primary hover:underline font-medium"
                  >
                    <HelpCircle className="h-3 w-3" /> How to capture glove images
                  </button>
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
                onEdit={handleEdit}
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

      {/* Bookmark guide modal */}
      <Dialog open={showBookmarkGuide} onOpenChange={setShowBookmarkGuide}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>How To Add The "Glove Image" Bookmark Tool</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* Step 1 — copy the code */}
            <div className="space-y-2">
              <p className="font-medium">Step 1 — Copy this code</p>
              <div className="relative rounded-md border bg-muted/50 p-3 pr-10">
                <code className="text-xs break-all text-muted-foreground select-all leading-relaxed">
                  {`javascript:(async()=>{let c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];if(!c)return alert('no canvas');try{let a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='grace-glove.png';a.click();alert('Done — saved 1 image!')}catch(e){alert('export blocked (CORS) — use OS screenshot.')}})();`}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`javascript:(async()=>{let c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];if(!c)return alert('no canvas');try{let a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='grace-glove.png';a.click();alert('Done — saved 1 image!')}catch(e){alert('export blocked (CORS) — use OS screenshot.')}})();`);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                  className="absolute top-2.5 right-2.5 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Copy code"
                >
                  {codeCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Steps 2–7 */}
            <ol className="space-y-2 text-muted-foreground list-none">
              {[
                "Open a new tab in your browser.",
                "Locate your bookmarks bar at the top of the browser window.",
                "Right-click anywhere on the bookmarks bar.",
                <>Click <span className="font-medium text-foreground">"Add Page…"</span></>,
                <>In the <span className="font-medium text-foreground">Name</span> field, type: <span className="font-mono font-medium text-foreground">Glove Image</span></>,
                <>In the <span className="font-medium text-foreground">URL</span> field, paste the copied code.</>,
                <>Click <span className="font-medium text-foreground">Save</span>.</>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                    {i + 2}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <p className="text-xs text-muted-foreground border-t pt-3">
              Once saved, open your glove design link, click the <span className="font-medium text-foreground">Glove Image</span> bookmark, and it will automatically save the glove image to your Downloads folder.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
