import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Upload, Image as ImageIcon, RefreshCw, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const GLOVE_LOGO_SLOTS = [
  { key: "palm", label: "Palm Logo", urlField: "palm_logo_url", fnField: "palm_logo_filename" },
  { key: "wrist", label: "Wrist Logo", urlField: "wrist_logo_url", fnField: "wrist_logo_filename" },
  { key: "thumb", label: "Thumb Logo", urlField: "thumb_logo_url", fnField: "thumb_logo_filename" },
] as const;

const BATTING_LOGO_SLOTS = [
  { key: "batting_back_hand", label: "Back of Hand", urlField: "batting_back_hand_logo_url", fnField: "batting_back_hand_logo_filename" },
  { key: "batting_back_wrist", label: "Back of Wrist", urlField: "batting_back_wrist_logo_url", fnField: "batting_back_wrist_logo_filename" },
  { key: "batting_front_wrist", label: "Front of Wrist", urlField: "batting_front_wrist_logo_url", fnField: "batting_front_wrist_logo_filename" },
] as const;

const ALL_SLOTS = [...GLOVE_LOGO_SLOTS, ...BATTING_LOGO_SLOTS];

type LogoRecord = {
  id: string;
  user_id: string;
  palm_logo_url: string | null;
  wrist_logo_url: string | null;
  thumb_logo_url: string | null;
  palm_logo_filename: string | null;
  wrist_logo_filename: string | null;
  thumb_logo_filename: string | null;
  batting_back_hand_logo_url: string | null;
  batting_back_hand_logo_filename: string | null;
  batting_back_wrist_logo_url: string | null;
  batting_back_wrist_logo_filename: string | null;
  batting_front_wrist_logo_url: string | null;
  batting_front_wrist_logo_filename: string | null;
  version: number;
  uploaded_at: string;
};

const VALID_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
const MAX_SIZE = 10 * 1024 * 1024;

function LogoGrid({ slots, logos, uploading, dragOver, handleDrop, handleDragOver, handleDragLeave, handleFileInput }: {
  slots: readonly { key: string; label: string; urlField: string; fnField: string }[];
  logos: LogoRecord | null;
  uploading: Record<string, boolean>;
  dragOver: string | null;
  handleDrop: (key: string) => (e: React.DragEvent) => void;
  handleDragOver: (key: string) => (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleFileInput: (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {slots.map((slot, i) => {
        const url = logos?.[slot.urlField as keyof LogoRecord] as string | null;
        const filename = logos?.[slot.fnField as keyof LogoRecord] as string | null;
        const isUploading = uploading[slot.key];
        const isDraggedOver = dragOver === slot.key;
        return (
          <motion.div
            key={slot.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            className="rounded-lg border bg-card overflow-hidden"
          >
            <div className="p-3 border-b">
              <h3 className="text-sm font-semibold">{slot.label}</h3>
            </div>
            <div
              onDrop={handleDrop(slot.key)}
              onDragOver={handleDragOver(slot.key)}
              onDragLeave={handleDragLeave}
              className={`relative aspect-square flex items-center justify-center transition-colors ${
                isDraggedOver ? "bg-primary/10 border-2 border-dashed border-primary" : "bg-muted/20"
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">Uploading...</p>
                </div>
              ) : url ? (
                <img src={url} alt={slot.label} className="max-h-full max-w-full object-contain p-4" />
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 p-4 w-full h-full justify-center">
                  <input type="file" accept=".png,.jpg,.jpeg,.svg" className="hidden" onChange={handleFileInput(slot.key)} />
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Drag & drop or click to upload</p>
                  <p className="text-[10px] text-muted-foreground">PNG, JPG, or SVG · Max 10MB</p>
                </label>
              )}
            </div>
            <div className="p-3 border-t space-y-2">
              {filename && (
                <p className="text-xs text-muted-foreground truncate" title={filename}>{filename}</p>
              )}
              {url && (
                <label className="w-full">
                  <input type="file" accept=".png,.jpg,.jpeg,.svg" className="hidden" onChange={handleFileInput(slot.key)} />
                  <Button variant="outline" size="sm" className="w-full pointer-events-none" disabled={isUploading} asChild>
                    <span><RefreshCw className="h-3 w-3 mr-1" />Update Logo</span>
                  </Button>
                </label>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function LogoVault() {
  const { user } = useAuth();
  const [logos, setLogos] = useState<LogoRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);

  const fetchLogos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("client_logos")
      .select("*")
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .single();
    setLogos(data as LogoRecord | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLogos();
  }, [fetchLogos]);

  const validateFile = (file: File): boolean => {
    if (!VALID_TYPES.includes(file.type)) {
      toast.error("Only PNG, JPG, or SVG files are allowed");
      return false;
    }
    if (file.size > MAX_SIZE) {
      toast.error("File must be under 10MB");
      return false;
    }
    return true;
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("client-logos").getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadLogo = async (slotKey: string, file: File) => {
    if (!user || !validateFile(file)) return;

    setUploading((prev) => ({ ...prev, [slotKey]: true }));

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const storagePath = `${user.id}/${slotKey}.${ext}`;

      // Upload to storage (upsert to overwrite)
      const { error: uploadError } = await supabase.storage
        .from("client-logos")
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL for private bucket
      const { data: signedData, error: signedError } = await supabase.storage
        .from("client-logos")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

      if (signedError) throw signedError;
      const url = signedData.signedUrl;

      // Update or insert client_logos record
      const urlField = ALL_SLOTS.find((s) => s.key === slotKey)!.urlField;
      const fnField = ALL_SLOTS.find((s) => s.key === slotKey)!.fnField;

      if (logos) {
        // Update existing record + increment version
        const { error: updateError } = await supabase
          .from("client_logos")
          .update({
            [urlField]: url,
            [fnField]: file.name,
            version: logos.version + 1,
            uploaded_at: new Date().toISOString(),
          })
          .eq("id", logos.id);

        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from("client_logos")
          .insert({
            user_id: user.id,
            [urlField]: url,
            [fnField]: file.name,
          });

        if (insertError) throw insertError;
      }

      toast.success(`${slotKey.charAt(0).toUpperCase() + slotKey.slice(1)} logo updated`);
      await fetchLogos();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading((prev) => ({ ...prev, [slotKey]: false }));
    }
  };

  const handleDrop = (slotKey: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadLogo(slotKey, file);
  };

  const handleDragOver = (slotKey: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(slotKey);
  };

  const handleDragLeave = () => setDragOver(null);

  const handleFileInput = (slotKey: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo(slotKey, file);
    e.target.value = ""; // reset so same file can be re-selected
  };

  const allLogosUploaded =
    logos?.palm_logo_url && logos?.wrist_logo_url && logos?.thumb_logo_url;

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          to="/account"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to account
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">My Logos</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Upload your brand logos for use on all glove orders.
            </p>
          </div>
          {logos && (
            <Badge variant="outline" className="text-xs">
              Version {logos.version}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Prompt if no logos */}
      {!loading && !allLogosUploaded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-status-amber/30 bg-status-amber/5 p-4"
        >
          <p className="text-sm">
            <strong>Upload all three logos</strong> (Palm, Wrist, Thumb) before
            placing your first order. These will be applied to every glove.
          </p>
        </motion.div>
      )}

      {/* Glove Logos */}
      <h2 className="text-lg font-semibold mt-2">Glove Logos</h2>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <LogoGrid slots={GLOVE_LOGO_SLOTS} logos={logos} uploading={uploading} dragOver={dragOver} handleDrop={handleDrop} handleDragOver={handleDragOver} handleDragLeave={handleDragLeave} handleFileInput={handleFileInput} />
      )}

      {/* Batting Glove Logos */}
      <h2 className="text-lg font-semibold mt-6">Batting Glove Logos</h2>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <LogoGrid slots={BATTING_LOGO_SLOTS} logos={logos} uploading={uploading} dragOver={dragOver} handleDrop={handleDrop} handleDragOver={handleDragOver} handleDragLeave={handleDragLeave} handleFileInput={handleFileInput} />
      )}

      {/* Version history note */}
      {logos && logos.version > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Logos have been updated {logos.version - 1} time{logos.version > 2 ? "s" : ""} ·
          Last update: {new Date(logos.uploaded_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
