import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { initializeCustomizer, destroyCustomizer, changeVariant } from "@/integrations/vu-customizer/client";
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

    const initCustomizer = async () => {
      setLoading(true);
      try {
        await initializeCustomizer({
          productId,
          productName,
          sku,
          onRecipeGenerated: (recipe) => {
            setRecipeId(recipe);
            toast.success("Recipe ready! Set quantity and add to cart.");
          },
          onClose: () => {
            onOpenChange(false);
          },
        });
      } catch (error) {
        console.error("Failed to initialize customizer:", error);
        toast.error("Failed to load customizer");
      } finally {
        setLoading(false);
      }
    };

    initCustomizer();

    return () => {
      destroyCustomizer();
    };
  }, [open, productId, productName, sku, onOpenChange]);

  // Change variant when product changes
  useEffect(() => {
    if (open && !loading) {
      changeVariant(productId);
      setRecipeId(null);
    }
  }, [productId, open, loading]);

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

        <div className="space-y-6">
          {/* VU Customizer container */}
          <div
            id="vu-customizer-container"
            className="min-h-96 bg-muted rounded-lg p-4"
            data-variant={productId}
            data-store-key="068b86c3"
            data-environment="production"
          >
            {loading && (
              <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading customizer...</p>
                </div>
              </div>
            )}
          </div>

          {/* Quantity Selection */}
          {recipeId && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
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
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={addingToCart}>
              Cancel
            </Button>
            <Button onClick={handleAddToCart} disabled={!recipeId || addingToCart}>
              {addingToCart && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {addingToCart ? "Adding to Cart..." : "Add to Cart"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
