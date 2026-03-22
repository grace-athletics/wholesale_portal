import { Product, formatCents } from "@/lib/pricing";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  selectedId: string | null;
  onSelect: (product: Product) => void;
}

export function ProductGrid({ products, selectedId, onSelect }: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product, i) => {
        const selected = product.id === selectedId;
        return (
          <motion.button
            key={product.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
            onClick={() => onSelect(product)}
            className={`relative text-left rounded-lg border p-4 transition-all hover:shadow-md ${
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {selected && (
              <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <h3 className="font-semibold text-sm">{product.name}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {product.description}
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-lg font-bold">
                {formatCents(product.base_price)}
              </span>
              {product.stock_price && (
                <span className="text-xs text-status-green font-medium">
                  Stock: {formatCents(product.stock_price)}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Min {product.min_order_qty}</span>
              <span>·</span>
              <span>{product.lead_time}</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
