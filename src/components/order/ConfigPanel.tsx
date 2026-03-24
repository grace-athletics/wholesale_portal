import { useState, useEffect } from "react";
import {
  Product,
  CartItemConfig,
  calculateItemPrice,
  countSameModel,
  getStockNudge,
  formatCents,
  BATTING_GLOVE_SIZES,
  ALL_BATTING_SIZES,
  BATTING_MIN_PER_SIZE,
} from "@/lib/pricing";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, AlertTriangle, CheckCircle2, ExternalLink, Upload, X, Loader2 } from "lucide-react";

const GLOVE_ANGLES = ["Front", "Back", "Thumb", "Pinky"] as const;

interface ConfigPanelProps {
  product: Product;
  onAdded: () => void;
  onGloveImages?: (images: Record<number, File>) => void;
}

function isBattingGlove(product: Product) {
  return product.name.toLowerCase().includes("batting");
}

function buildDefaultConfig(product: Product): CartItemConfig {
  const dl =
    product.leather_options && product.leather_options.length > 0
      ? product.leather_options[0]
      : "";
  return {
    leather_type: dl,
    hand: product.has_hand_option ? "RHT" : null,
    position:
      product.position_options && product.position_options.length > 0
        ? product.position_options[0]
        : null,
    size: isBattingGlove(product) ? ALL_BATTING_SIZES[0] : null,
    has_flag: false,
    quantity: isBattingGlove(product) ? BATTING_MIN_PER_SIZE : product.min_order_qty,
    builder_recipe_url: "",
    notes: "",
  };
}

export function ConfigPanel({ product, onAdded, onGloveImages }: ConfigPanelProps) {
  const { items, addItem } = useCart();
  const batting = isBattingGlove(product);

  const [config, setConfig] = useState<CartItemConfig>(() => buildDefaultConfig(product));
  const [gloveImages, setGloveImages] = useState<Record<number, File>>({});

  // Reset config when product changes
  useEffect(() => {
    setConfig(buildDefaultConfig(product));
  }, [product.id]);

  const update = (field: string, value: any) =>
    setConfig((c) => ({ ...c, [field]: value }));

  // Calculate price preview
  const sameModelQty =
    countSameModel(product.id, config.leather_type, items, config.builder_recipe_url, config.has_flag) + config.quantity;
  const priceResult = calculateItemPrice(product, config, sameModelQty);
  const nudge = getStockNudge(product, config.leather_type, sameModelQty);

  // Show flag option only for custom/stock gloves (has flag_upcharge > 0)
  const showFlag = product.flag_upcharge > 0;
  const showLeather =
    product.leather_options && product.leather_options.length > 1;
  const showPosition =
    product.position_options && product.position_options.length > 0;

  // Recipe URL validation
  const recipeValid =
    !config.builder_recipe_url ||
    config.builder_recipe_url.startsWith("https://www.myglovebuilder.com");

  // Min qty for batting gloves is per-size (5)
  const minQty = batting ? BATTING_MIN_PER_SIZE : product.min_order_qty;

  const handleAdd = () => {
    if (product.show_recipe_url && config.builder_recipe_url && !recipeValid) {
      return;
    }
    addItem(product, config);
    if (Object.keys(gloveImages).length > 0 && onGloveImages) {
      onGloveImages(gloveImages);
    }
    setConfig(buildDefaultConfig(product));
    setGloveImages({});
    onAdded();
  };

  return (
    <div className="space-y-5 rounded-lg border bg-card p-5">
      <h3 className="font-semibold">Configure: {product.name}</h3>

      {/* Size (batting gloves only) */}
      {batting && (
        <div className="space-y-2">
          <Label>Size</Label>
          <Select
            value={config.size || ""}
            onValueChange={(v) => update("size", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {BATTING_GLOVE_SIZES.map((group) => (
                <SelectGroup key={group.group}>
                  <SelectLabel>{group.group}</SelectLabel>
                  {group.sizes.map((sz) => (
                    <SelectItem key={sz} value={sz}>
                      {sz}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Leather type */}
      {showLeather && (
        <div className="space-y-2">
          <Label>Leather Type</Label>
          <Select
            value={config.leather_type}
            onValueChange={(v) => update("leather_type", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {product.leather_options!.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                  {opt === "Japanese Kip" && product.japanese_kip_upcharge > 0
                    ? ` (+${formatCents(product.japanese_kip_upcharge)})`
                    : ""}
                  {product.leather_price_overrides?.[opt] !== undefined
                    ? ` — ${formatCents(product.leather_price_overrides[opt])}`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Hand */}
      {product.has_hand_option && (
        <div className="space-y-2">
          <Label>Throwing Hand</Label>
          <Select
            value={config.hand || "RHT"}
            onValueChange={(v) => update("hand", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RHT">RHT (Right Hand Throw)</SelectItem>
              <SelectItem value="LHT">LHT (Left Hand Throw)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Position */}
      {showPosition && (
        <div className="space-y-2">
          <Label>Position</Label>
          <Select
            value={config.position || ""}
            onValueChange={(v) => update("position", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {product.position_options!.map((pos) => (
                <SelectItem key={pos} value={pos}>
                  {pos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Flag */}
      {showFlag && (
        <div className="flex items-center justify-between">
          <div>
            <Label>Add Flag</Label>
            <p className="text-xs text-muted-foreground">
              +{formatCents(product.flag_upcharge)}
            </p>
          </div>
          <Switch
            checked={config.has_flag}
            onCheckedChange={(v) => update("has_flag", v)}
          />
        </div>
      )}

      {/* Quantity */}
      <div className="space-y-2">
        <Label>Quantity {batting ? "(per size, min 5)" : ""}</Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              update("quantity", Math.max(minQty, config.quantity - 1))
            }
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            value={config.quantity}
            onChange={(e) =>
              update(
                "quantity",
                Math.max(minQty, parseInt(e.target.value) || minQty)
              )
            }
            className="w-20 text-center"
            min={minQty}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => update("quantity", config.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Min: {minQty}
          </span>
        </div>
      </div>

      {/* Stock pricing nudge */}
      {nudge && (
        <div className="flex items-start gap-2 rounded-md bg-status-amber/10 border border-status-amber/30 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-status-amber mt-0.5 shrink-0" />
          <p className="text-xs">
            Add <strong>{nudge.needed} more</strong> of the same model to unlock{" "}
            <strong>{formatCents(nudge.stockPrice)}/glove</strong> stock pricing
          </p>
        </div>
      )}

      {priceResult.stockUnlocked && (
        <div className="flex items-start gap-2 rounded-md bg-status-green/10 border border-status-green/30 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-status-green mt-0.5 shrink-0" />
          <p className="text-xs">
            Stock pricing unlocked —{" "}
            <strong>{formatCents(priceResult.unitPrice)}/glove</strong>
          </p>
        </div>
      )}

      {/* Recipe URL */}
      {product.show_recipe_url && (
        <div className="space-y-2">
          <Label>Glove Design Link (from myglovebuilder.com)</Label>
          <div className="flex gap-2">
            <Input
              value={config.builder_recipe_url}
              onChange={(e) => update("builder_recipe_url", e.target.value)}
              placeholder="https://www.myglovebuilder.com/pages/custom-gloves?product=fielders&recipe_id=..."
              className="flex-1"
            />
            {config.builder_recipe_url && recipeValid && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                asChild
              >
                <a
                  href={config.builder_recipe_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open design in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
          {config.builder_recipe_url && !recipeValid && (
            <p className="text-xs text-destructive">
              Must start with https://www.myglovebuilder.com
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Build your design at{" "}
            <a
              href="https://www.myglovebuilder.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              myglovebuilder.com
            </a>
            , copy your recipe link, paste it here.
          </p>
        </div>
      )}

      {/* Glove Screenshot Uploads */}
      {product.show_recipe_url && (
        <div className="space-y-2">
          <Label>Glove Screenshots (4 angles)</Label>
          <p className="text-xs text-muted-foreground">
            Open your design link, run the screenshot bookmarklet, then upload the 4 PNGs here.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {GLOVE_ANGLES.map((label, idx) => {
              const file = gloveImages[idx];
              return (
                <div key={label} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground text-center">
                    {label}
                  </p>
                  <div className="aspect-square rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden relative group">
                    {file ? (
                      <>
                        <img
                          src={URL.createObjectURL(file)}
                          alt={label}
                          className="max-h-full max-w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setGloveImages((prev) => {
                              const next = { ...prev };
                              delete next[idx];
                              return next;
                            });
                          }}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-1 p-2">
                        <Upload className="h-5 w-5 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground">Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setGloveImages((prev) => ({ ...prev, [idx]: f }));
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea
          value={config.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Any special instructions..."
          rows={2}
        />
      </div>

      {/* Price + Add button */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div>
          <p className="text-xs text-muted-foreground">Line Total</p>
          <p className="text-xl font-bold">
            {formatCents(priceResult.lineTotal)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatCents(priceResult.unitPrice)} × {config.quantity}
          </p>
        </div>
        <Button onClick={handleAdd} disabled={product.show_recipe_url && config.builder_recipe_url !== "" && !recipeValid}>
          <Plus className="h-4 w-4 mr-1" /> Add to Order
        </Button>
      </div>
    </div>
  );
}