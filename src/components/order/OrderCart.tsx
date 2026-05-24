import { useCart } from "@/contexts/CartContext";
import { formatCents } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, ShoppingCart, Sparkles, Loader2, Tag } from "lucide-react";

interface OrderCartProps {
  onCheckout: () => void;
  loading?: boolean;
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
}

export function OrderCart({ onCheckout, loading = false, promoCode, onPromoCodeChange }: OrderCartProps) {
  const { items, removeItem, cartTotal, totalSavings } = useCart();

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Your order is empty</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a product and configure it to get started
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Order Summary
          <Badge variant="secondary" className="ml-auto">
            {items.length} {items.length === 1 ? "item" : "items"}
          </Badge>
        </h3>
      </div>

      <div className="divide-y max-h-[400px] overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.product.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.config.leather_type && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {item.config.leather_type}
                    </Badge>
                  )}
                  {item.config.hand && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {item.config.hand}
                    </Badge>
                  )}
                  {item.config.position && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {item.config.position}
                    </Badge>
                  )}
                  {item.config.size && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {item.config.size}
                    </Badge>
                  )}
                  {item.config.has_flag && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      🏴 Flag
                    </Badge>
                  )}
                  {item.stockUnlocked && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-status-green/15 text-status-green border-0">
                      Stock price
                    </Badge>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {formatCents(item.unitPrice)} × {item.config.quantity}
              </span>
              <span className="font-semibold">{formatCents(item.lineTotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t space-y-3">
        {totalSavings > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-status-green/10 px-3 py-2">
            <Sparkles className="h-4 w-4 text-status-green shrink-0" />
            <p className="text-xs text-status-green font-medium">
              You saved {formatCents(totalSavings)} with stock pricing
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="font-semibold">Order Total</span>
          <span className="text-xl font-bold">{formatCents(cartTotal)}</span>
        </div>

        <div className="flex gap-2 items-center">
          <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Promo code (optional)"
            value={promoCode}
            onChange={(e) => onPromoCodeChange(e.target.value.toUpperCase())}
            className="h-8 text-sm"
          />
        </div>

        <Button className="w-full" size="lg" onClick={onCheckout} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            "Proceed to Checkout"
          )}
        </Button>
      </div>
    </div>
  );
}
