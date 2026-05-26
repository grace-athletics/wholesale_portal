import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { formatCents } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, ShoppingCart, Sparkles, Loader2, Tag, ChevronDown, ChevronUp, ExternalLink, Pencil } from "lucide-react";
import { CartItem } from "@/lib/pricing";

interface OrderCartProps {
  onCheckout: () => void;
  loading?: boolean;
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
  onEdit?: (item: CartItem) => void;
}

export function OrderCart({ onCheckout, loading = false, promoCode, onPromoCodeChange, onEdit }: OrderCartProps) {
  const { items, removeItem, cartTotal, totalSavings } = useCart();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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

      <div className="divide-y max-h-[500px] overflow-y-auto">
        {items.map((item) => {
          const isExpanded = expandedIds.has(item.id);
          return (
            <div key={item.id} className="p-4 space-y-2">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
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
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Edit item"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={isExpanded ? "Hide details" : "View details"}
                  >
                    {isExpanded
                      ? <ChevronUp className="h-3.5 w-3.5" />
                      : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Price row */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatCents(item.unitPrice)} × {item.config.quantity}
                </span>
                <span className="font-semibold">{formatCents(item.lineTotal)}</span>
              </div>

              {/* Expandable details */}
              {isExpanded && (
                <div className="mt-2 pt-2 border-t space-y-1.5 text-xs text-muted-foreground">
                  {[
                    { label: "Leather", value: item.config.leather_type },
                    { label: "Hand", value: item.config.hand },
                    { label: "Position", value: item.config.position },
                    { label: "Size", value: item.config.size },
                    { label: "Quantity", value: String(item.config.quantity) },
                    { label: "Flag", value: item.config.has_flag ? "Yes" : null },
                  ]
                    .filter((r) => r.value)
                    .map((r) => (
                      <div key={r.label} className="flex justify-between">
                        <span>{r.label}</span>
                        <span className="font-medium text-foreground">{r.value}</span>
                      </div>
                    ))}
                  {item.config.builder_recipe_url && (
                    <a
                      href={item.config.builder_recipe_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline pt-0.5"
                    >
                      <ExternalLink className="h-3 w-3" /> View design
                    </a>
                  )}
                  {item.config.notes && (
                    <p className="italic pt-0.5">"{item.config.notes}"</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
