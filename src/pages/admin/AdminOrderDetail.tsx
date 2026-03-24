import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, StatusStepper } from "@/components/order/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, ExternalLink, FileText, Image as ImageIcon, Loader2, Stamp } from "lucide-react";
import { formatCents } from "@/lib/pricing";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useCallback } from "react";

const ORDER_STATUSES = ["Order Placed", "Order Submitted", "Processing", "In Production", "Shipped", "Delivered"];

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("order.pdf");
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items } = useQuery({
    queryKey: ["admin-order-items", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("*").eq("order_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: orderImages = [] } = useQuery({
    queryKey: ["order-images", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_images")
        .select("*")
        .eq("order_id", id!)
        .order("angle", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: statusHistory } = useQuery({
    queryKey: ["admin-order-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", id!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: client } = useQuery({
    queryKey: ["admin-client-profile", order?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", order!.user_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!order?.user_id,
  });

  const { data: clientLogos } = useQuery({
    queryKey: ["admin-client-logos", order?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_logos")
        .select("*")
        .eq("user_id", order!.user_id)
        .order("version", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!order?.user_id,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error: orderErr } = await supabase
        .from("orders")
        .update({ status, status_updated_at: new Date().toISOString() })
        .eq("id", id!);
      if (orderErr) throw orderErr;

      const { error: histErr } = await supabase.from("order_status_history").insert({
        order_id: id!,
        old_status: order!.status,
        new_status: status,
        changed_by: user!.id,
      });
      if (histErr) throw histErr;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-history", id] });
      setNewStatus(null);
    },
    onError: () => toast.error("Failed to update status"),
  });

  const loadPdfPreview = useCallback(async (pdfUrl: string, fileName: string) => {
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error("Failed to load PDF");

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }

    setPdfPreviewUrl(blobUrl);
    setPdfFileName(fileName);
    setIsPdfOpen(true);
  }, [pdfPreviewUrl]);

  const closePdfPreview = useCallback(() => {
    setIsPdfOpen(false);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  }, [pdfPreviewUrl]);

  const generatePdf = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-order-pdf", {
        body: { order_id: id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
      if (data?.pdf_url) {
        try {
          const response = await fetch(data.pdf_url);
          if (!response.ok) throw new Error("Failed to fetch PDF");
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = `${order?.order_number || "order"}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          toast.success("Order form downloaded!");
        } catch {
          toast.error("PDF generated but download failed.");
        }
      }
    },
    onError: () => toast.error("Failed to generate PDF"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return <p className="text-muted-foreground">Order not found.</p>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/orders">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{order.order_number}</h1>
            <p className="text-sm text-muted-foreground">
              {client?.company_name || client?.full_name || "Unknown client"} · {format(new Date(order.created_at), "MMM d, yyyy")}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={generatePdf.isPending}
              onClick={() => generatePdf.mutate()}
            >
              {generatePdf.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating…</>
              ) : (
                <><FileText className="h-4 w-4 mr-1" /> Generate PDF</>
              )}
            </Button>
            {order.pdf_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadPdfPreview(order.pdf_url!, `${order.order_number}.pdf`).catch(() => {
                  toast.error("Could not load PDF preview.");
                })}
              >
                <Download className="h-4 w-4 mr-1" /> Preview PDF
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <StatusStepper currentStatus={order.status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Select value={newStatus ?? order.status} onValueChange={setNewStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!newStatus || newStatus === order.status || updateStatus.isPending}
                onClick={() => newStatus && updateStatus.mutate(newStatus)}
              >
                {updateStatus.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Glove Screenshots
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orderImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {orderImages.map((img) => {
                  const angleLabels = ["Front", "Back", "Thumb", "Pinky"];
                  return (
                    <div key={img.id} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground text-center">
                        {angleLabels[img.angle - 1] || `Angle ${img.angle}`}
                      </p>
                      <div className="aspect-square rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
                        <img
                          src={img.image_url}
                          alt={angleLabels[img.angle - 1] || `Angle ${img.angle}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No glove screenshots uploaded by client yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Stamp className="h-4 w-4" /> Client Logos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientLogos ? (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { url: clientLogos.palm_logo_url, label: "Palm Stamp" },
                  { url: clientLogos.thumb_logo_url, label: "Thumb Logo" },
                  { url: clientLogos.wrist_logo_url, label: "Wrist Logo" },
                ].map((logo) => (
                  <div key={logo.label} className="space-y-1 text-center">
                    <p className="text-xs font-medium text-muted-foreground">{logo.label}</p>
                    <div className="aspect-square rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden p-2">
                      {logo.url ? (
                        <img src={logo.url} alt={logo.label} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Not uploaded</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No logos on file for this client.</p>
            )}
          </CardContent>
        </Card>

        {items && items.some((i) => i.builder_recipe_url) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> Glove Design Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.filter((i) => i.builder_recipe_url).map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium">{item.product_name}</span>
                  <a
                    href={item.builder_recipe_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View Design <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Build Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Leather</TableHead>
                  <TableHead>Hand</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Flag</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.leather_type || "—"}</TableCell>
                    <TableCell>{item.hand || "—"}</TableCell>
                    <TableCell>{item.position || "—"}</TableCell>
                    <TableCell>{item.size || "—"}</TableCell>
                    <TableCell>{item.has_flag ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCents(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCents(item.line_total)}</TableCell>
                  </TableRow>
                ))}
                {items && items.some((i) => i.notes) && items.filter((i) => i.notes).map((item) => (
                  <TableRow key={`note-${item.id}`}>
                    <TableCell colSpan={9} className="text-xs text-muted-foreground italic">
                      Note ({item.product_name}): {item.notes}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={8} className="text-right font-semibold">Order Total</TableCell>
                  <TableCell className="text-right font-bold text-primary">{formatCents(order.total_amount)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {statusHistory && statusHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusHistory.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-32 shrink-0">
                      {format(new Date(h.changed_at), "MMM d, h:mm a")}
                    </span>
                    {h.old_status && <StatusBadge status={h.old_status} />}
                    <span className="text-muted-foreground">→</span>
                    <StatusBadge status={h.new_status} />
                    {h.note && <span className="text-muted-foreground">— {h.note}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {order.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Order Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
            </CardContent>
          </Card>
        )}

        {order.logo_change_requested && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logo Change Requested</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {order.logo_change_notes || "No details provided"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isPdfOpen} onOpenChange={(open) => !open && closePdfPreview()}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle>PDF Preview</DialogTitle>
            {pdfPreviewUrl && (
              <a href={pdfPreviewUrl} download={pdfFileName}>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" /> Download PDF
                </Button>
              </a>
            )}
          </DialogHeader>
          <div className="flex-1 rounded-md border overflow-hidden bg-muted/20">
            {pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                title="Order PDF Preview"
                className="w-full h-full"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                PDF preview unavailable.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
