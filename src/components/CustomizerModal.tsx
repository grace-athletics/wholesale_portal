import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CustomizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  productName: string;
  sku: string;
  onRecipeGenerated: (recipeId: string, quantity: number) => void;
}

export function CustomizerModal({
  open,
  onOpenChange,
  productId,
  productName,
  sku,
  onRecipeGenerated,
}: CustomizerModalProps) {
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setRecipeId(null);

    const initCustomizer = async () => {
      try {
        // Wait for VU customizer to be available
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds

        while (typeof (window as any).customizer === "undefined" && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }

        if (typeof (window as any).customizer === "undefined") {
          throw new Error("VU Customizer not loaded");
        }

        console.log("[VU] Customizer available, checking if we need to change variant");

        // Only call changeVariant if it's available and different from current variant
        if (typeof (window as any).customizer.changeVariant === "function") {
          console.log("[VU] Calling customizer.changeVariant with variantID:", productId);
          (window as any).customizer.changeVariant(productId);
        } else {
          console.log("[VU] changeVariant not available, customizer should already be initialized with data-variant");
        }

        // Listen for recipe generated and close events
        const messageHandler = (event: MessageEvent) => {
          if (event.data?.type === "VU_RECIPE_GENERATED") {
            const recipeId = event.data.recipeId;
            console.log("[VU] Recipe generated:", recipeId);
            setRecipeId(recipeId);
            toast.success("Recipe ready! Set quantity and add to cart.");
          }

          if (event.data?.type === "VU_CUSTOMIZER_CLOSED") {
            console.log("[VU] Customizer closed");
            onOpenChange(false);
          }
        };

        window.addEventListener("message", messageHandler);

        return () => {
          window.removeEventListener("message", messageHandler);
        };
      } catch (error) {
        console.error("Failed to initialize customizer:", error);
        toast.error("Failed to load customizer");
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    };

    const cleanup = initCustomizer();
    return () => {
      cleanup?.then((fn) => fn?.());
    };
  }, [open, productId, onOpenChange]);

  const handleAddToCart = () => {
    if (!recipeId) {
      toast.error("Please complete your customization first");
      return;
    }

    if (quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    setAddingToCart(true);
    try {
      onRecipeGenerated(recipeId, quantity);
      toast.success(`Added ${quantity} item(s) to cart!`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to add to cart");
      console.error(error);
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customize {productName}</DialogTitle>
        </DialogHeader>

        {/* VU Customizer HTML structure — script will populate these elements */}
        <div id="customizer-root" className="w-full">
          <div className="grid grid-cols-3 gap-4">
            {/* Main customizer canvas (2/3 width) */}
            <div className="col-span-2">
              <div id="customizer-main-perspective" className="min-h-96 bg-muted rounded-lg p-4">
                {loading && (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading customizer...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar (1/3 width) */}
            <div className="col-span-1 space-y-3">
              {/* Product info */}
              <div className="p-3 border rounded-lg bg-card">
                <div className="customizer-product-name font-semibold text-sm mb-2" />
                <div className="customizer-price text-lg font-bold text-primary mb-3" />
                <button className="customizer-add-to-cart-button w-full px-3 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 text-sm">
                  Add to Cart
                </button>
              </div>

              {/* Customization options tabs */}
              <div className="p-3 border rounded-lg bg-card">
                <div id="customizer-tab-container" className="space-y-2 mb-3" />
                <div id="customizer-tab-body-container" className="space-y-2" />
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <button id="customizer-reset-button" className="w-full px-3 py-2 text-sm border rounded hover:bg-muted">
                  Reset
                </button>
                <button id="customizer-save-button" className="w-full px-3 py-2 text-sm border rounded hover:bg-muted">
                  Save
                </button>
                <button id="customizer-share-button" className="w-full px-3 py-2 text-sm border rounded hover:bg-muted">
                  Share
                </button>
              </div>

              {/* Saved items */}
              <div id="customizer-saved-items" className="p-3 border rounded-lg bg-card text-sm" />
            </div>
          </div>

          {/* Hidden elements that VU script may use */}
          <div id="customizer-perspectives" className="hidden" />
          <div id="customizer-saved-item-count" className="hidden" />
          <div id="customizer-summary-items" className="hidden" />
          <div id="customizer-disclaimer" className="hidden" />
          <div id="customizer-share-link" className="hidden" />
        </div>

        {/* Quantity Selection */}
        {recipeId && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border mt-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 border rounded hover:bg-background"
                  disabled={addingToCart}
                >
                  −
                </button>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                  disabled={addingToCart}
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 border rounded hover:bg-background"
                  disabled={addingToCart}
                >
                  +
                </button>
              </div>
            </div>

            <div className="pt-2 border-t space-y-2">
              <div className="text-sm text-muted-foreground">
                <strong>Recipe ID:</strong> {recipeId}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={addingToCart}>
            Cancel
          </Button>
          <Button onClick={handleAddToCart} disabled={!recipeId || addingToCart}>
            {addingToCart && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {addingToCart ? "Adding to Cart..." : "Add to Cart"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
