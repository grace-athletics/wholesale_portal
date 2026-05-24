import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ANGLE_LABELS = ["Front", "Back", "Heel / Side", "Palm Side"];

interface GloveImageUploadProps {
  orderId: string;
}

export default function GloveImageUpload({ orderId }: GloveImageUploadProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<number | null>(null);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["order-images", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_images")
        .select("*")
        .eq("order_id", orderId)
        .order("angle", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const deleteImage = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase.from("order_images").delete().eq("id", imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Image removed");
      queryClient.invalidateQueries({ queryKey: ["order-images", orderId] });
    },
    onError: () => toast.error("Failed to remove image"),
  });

  const handleUpload = async (angle: number, file: File) => {
    setUploading(angle);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${orderId}/angle-${angle}.${ext}`;

      // Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from("order-images")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("order-images")
        .getPublicUrl(path);

      const imageUrl = urlData.publicUrl;

      // Delete existing image for this angle if any
      const existing = images.find((i) => i.angle === angle);
      if (existing) {
        await supabase.from("order_images").delete().eq("id", existing.id);
      }

      // Insert record
      const { error: insertErr } = await supabase.from("order_images").insert({
        order_id: orderId,
        angle,
        image_url: imageUrl,
      });
      if (insertErr) throw insertErr;

      toast.success(`${ANGLE_LABELS[angle - 1]} image uploaded`);
      queryClient.invalidateQueries({ queryKey: ["order-images", orderId] });
    } catch (err) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> Glove Screenshots
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Upload 4 angle screenshots captured from the glove builder. Use the bookmarklet on the builder page, then upload the PNGs here.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((angle) => {
            const img = images.find((i) => i.angle === angle);
            const isUploading = uploading === angle;

            return (
              <div key={angle} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground text-center">
                  {ANGLE_LABELS[angle - 1]}
                </p>
                <div className="aspect-square rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden relative group">
                  {img ? (
                    <>
                      <img
                        src={img.image_url}
                        alt={ANGLE_LABELS[angle - 1]}
                        className="max-h-full max-w-full object-contain"
                      />
                      <button
                        onClick={() => deleteImage.mutate(img.id)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-1 p-2">
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-muted-foreground/50" />
                          <span className="text-[10px] text-muted-foreground">Upload</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(angle, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
                {img && (
                  <label className="cursor-pointer">
                    <Button variant="ghost" size="sm" className="w-full text-xs h-6" asChild>
                      <span>
                        {isUploading ? "Uploading…" : "Replace"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(angle, file);
                            e.target.value = "";
                          }}
                        />
                      </span>
                    </Button>
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
