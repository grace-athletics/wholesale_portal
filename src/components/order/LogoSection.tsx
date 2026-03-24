import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface LogoInfo {
  palm_logo_url: string | null;
  wrist_logo_url: string | null;
  thumb_logo_url: string | null;
  palm_logo_filename: string | null;
  wrist_logo_filename: string | null;
  thumb_logo_filename: string | null;
}

interface LogoSectionProps {
  logoChangeRequested: boolean;
  setLogoChangeRequested: (v: boolean) => void;
  logoChangeNotes: string;
  setLogoChangeNotes: (v: string) => void;
  newLogoFiles: Record<string, File | null>;
  setNewLogoFiles: (files: Record<string, File | null>) => void;
}

const LOGO_SLOTS = [
  { key: "palm", label: "Palm Logo", urlKey: "palm_logo_url", fnKey: "palm_logo_filename" },
  { key: "wrist", label: "Wrist Logo", urlKey: "wrist_logo_url", fnKey: "wrist_logo_filename" },
  { key: "thumb", label: "Thumb Logo", urlKey: "thumb_logo_url", fnKey: "thumb_logo_filename" },
] as const;

export function LogoSection({
  logoChangeRequested,
  setLogoChangeRequested,
  logoChangeNotes,
  setLogoChangeNotes,
  newLogoFiles,
  setNewLogoFiles,
}: LogoSectionProps) {
  const { user } = useAuth();
  const [logos, setLogos] = useState<LogoInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogos() {
      if (!user) return;
      const { data } = await supabase
        .from("client_logos")
        .select("*")
        .eq("user_id", user.id)
        .order("version", { ascending: false })
        .limit(1)
        .single();
      setLogos(data as LogoInfo | null);
      setLoading(false);
    }
    fetchLogos();
  }, [user]);

  const hasAnyLogo = logos?.palm_logo_url || logos?.wrist_logo_url || logos?.thumb_logo_url;

  const handleFileSelect = (key: string, file: File | null) => {
    if (file) {
      const validTypes = ["image/png", "image/jpeg", "image/svg+xml"];
      if (!validTypes.includes(file.type)) {
        toast.error("Only PNG, JPG, or SVG files are allowed");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File must be under 10MB");
        return;
      }
    }
    setNewLogoFiles({ ...newLogoFiles, [key]: file });
  };

  if (loading) return null;

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <h3 className="font-semibold">Logos</h3>

      {!hasAnyLogo && (
        <div className="rounded-md bg-status-amber/10 border border-status-amber/30 px-3 py-2">
          <p className="text-xs text-status-amber">
            No logos on file.{" "}
            <a href="/account/logos" className="underline font-medium">
              Upload your logos
            </a>{" "}
            before placing an order.
          </p>
        </div>
      )}

      {hasAnyLogo && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {LOGO_SLOTS.map((slot) => {
              const url = logos?.[slot.urlKey as keyof LogoInfo] as string | null;
              const filename = logos?.[slot.fnKey as keyof LogoInfo] as string | null;
              return (
                <div key={slot.key} className="text-center space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{slot.label}</p>
                  <div className="aspect-square rounded-md border bg-muted/50 flex items-center justify-center overflow-hidden">
                    {url ? (
                      <img
                        src={url}
                        alt={slot.label}
                        className="max-h-full max-w-full object-contain p-1"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="logo-change"
              checked={logoChangeRequested}
              onCheckedChange={(v) => setLogoChangeRequested(!!v)}
            />
            <label
              htmlFor="logo-change"
              className="text-sm cursor-pointer leading-tight"
            >
              I need to update my logos for this order
            </label>
          </div>

          {!logoChangeRequested && (
            <p className="text-xs text-muted-foreground">
              ✓ Logos on file will be used for this order.
            </p>
          )}
        </>
      )}

      {logoChangeRequested && (
        <div className="space-y-4 border-t pt-4">
          <div className="grid grid-cols-3 gap-3">
            {LOGO_SLOTS.map((slot) => {
              const file = newLogoFiles[slot.key];
              return (
                <div key={slot.key} className="space-y-1">
                  <Label className="text-xs">{slot.label}</Label>
                  <label className="block aspect-square rounded-md border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors flex items-center justify-center bg-muted/30">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg"
                      className="hidden"
                      onChange={(e) =>
                        handleFileSelect(slot.key, e.target.files?.[0] || null)
                      }
                    />
                    {file ? (
                      <div className="text-center px-1">
                        <p className="text-[10px] text-primary font-medium truncate">
                          {file.name}
                        </p>
                      </div>
                    ) : (
                      <Upload className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </label>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Logo Change Notes</Label>
            <Textarea
              value={logoChangeNotes}
              onChange={(e) => setLogoChangeNotes(e.target.value)}
              placeholder="Describe what changed (e.g. new palm logo, updated colors...)"
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
}
