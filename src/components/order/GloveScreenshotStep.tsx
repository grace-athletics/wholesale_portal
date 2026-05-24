import { MutableRefObject, useState } from "react";
import { CartItem } from "@/lib/pricing";
import { Upload, X, ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";

// One composite screenshot per cart item (all 4 angles stitched into 1 image by the bookmarklet)
type PendingImages = Record<string, Record<number, File>>;

interface GloveScreenshotStepProps {
  items: CartItem[];
  pendingImagesRef: MutableRefObject<PendingImages>;
}

export function GloveScreenshotStep({ items, pendingImagesRef }: GloveScreenshotStepProps) {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const setImage = (itemId: string, file: File) => {
    pendingImagesRef.current[itemId] = { 0: file };
    refresh();
  };

  const removeImage = (itemId: string) => {
    delete pendingImagesRef.current[itemId];
    refresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Run the <span className="font-medium text-foreground">MGB Screenshot</span> bookmarklet on your design page, then upload the composite image it saves.
      </p>

      {items.map((item) => {
        const file = pendingImagesRef.current[item.id]?.[0];
        const designUrl = item.config.builder_recipe_url;

        return (
          <div key={item.id} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {item.product.name}
                {item.config.leather_type ? ` — ${item.config.leather_type}` : ""}
                {item.config.has_flag ? " + Flag" : ""}
              </Label>
              {designUrl && (
                <a href={designUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                  Open Design ↗
                </a>
              )}
            </div>

            {file ? (
              <div className="relative rounded-md border overflow-hidden bg-muted/30 group">
                <img
                  src={URL.createObjectURL(file)}
                  alt="Glove composite"
                  className="w-full object-contain max-h-56"
                />
                <button
                  type="button"
                  onClick={() => removeImage(item.id)}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-6 hover:bg-muted/40 transition-colors">
                <ImageIcon className="h-7 w-7 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">Upload composite screenshot</span>
                <span className="text-xs text-muted-foreground/70">Run the bookmarklet, then upload the PNG it saves</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setImage(item.id, f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
