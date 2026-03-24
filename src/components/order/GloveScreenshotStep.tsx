import { MutableRefObject, useState } from "react";
import { CartItem } from "@/lib/pricing";
import { Upload, X } from "lucide-react";
import { Label } from "@/components/ui/label";

const GLOVE_ANGLES = ["Front", "Back", "Thumb", "Pinky"] as const;

type PendingImages = Record<string, Record<number, File>>;

interface GloveScreenshotStepProps {
  items: CartItem[];
  pendingImagesRef: MutableRefObject<PendingImages>;
}

export function GloveScreenshotStep({ items, pendingImagesRef }: GloveScreenshotStepProps) {
  // Force re-render when images change
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const setImage = (itemId: string, angleIdx: number, file: File) => {
    if (!pendingImagesRef.current[itemId]) {
      pendingImagesRef.current[itemId] = {};
    }
    pendingImagesRef.current[itemId][angleIdx] = file;
    refresh();
  };

  const removeImage = (itemId: string, angleIdx: number) => {
    if (pendingImagesRef.current[itemId]) {
      delete pendingImagesRef.current[itemId][angleIdx];
      if (Object.keys(pendingImagesRef.current[itemId]).length === 0) {
        delete pendingImagesRef.current[itemId];
      }
    }
    refresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Upload 4 angle screenshots for each custom glove. Open your design link, run the screenshot bookmarklet, then upload the PNGs here.
      </p>

      {items.map((item) => {
        const itemImages = pendingImagesRef.current[item.id] || {};
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
                <a
                  href={designUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Open Design ↗
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {GLOVE_ANGLES.map((label, idx) => {
                const file = itemImages[idx];
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
                            onClick={() => removeImage(item.id, idx)}
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
                              if (f) setImage(item.id, idx, f);
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
        );
      })}
    </div>
  );
}
