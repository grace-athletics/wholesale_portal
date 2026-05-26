import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCents } from "@/lib/pricing";
import { StatusBadge, StatusStepper } from "@/components/order/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  ExternalLink,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["order-items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: images = [] } = useQuery({
    queryKey: ["order-images", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_images")
        .select("*")
        .eq("order_id", id)
        .order("angle");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted/30 animate-pulse rounded" />
        <div className="h-20 bg-muted/30 animate-pulse rounded-lg" />
        <div className="h-40 bg-muted/30 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Order not found.</p>
        <Link to="/orders" className="text-primary hover:underline text-sm mt-2 inline-block">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const angleLabels = ["Front", "Back", "Heel/Side", "Palm Side"];

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          to="/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">{order.order_number}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Placed {new Date(order.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </motion.div>

      {/* Status stepper */}
      <div className="rounded-lg border bg-card p-5">
        <StatusStepper currentStatus={order.status} />
      </div>

      {/* Glove preview — only render slots for images that exist */}
      {images.length > 0 && (
        <div className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold mb-3">Glove Preview</h2>
          <div className={`grid gap-3 ${images.length === 1 ? "grid-cols-1 max-w-xs" : "grid-cols-2 sm:grid-cols-4"}`}>
            {images.map((img) => (
              <div
                key={img.angle}
                className="aspect-square rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden"
              >
                <img
                  src={img.image_url}
                  alt={angleLabels[img.angle - 1] ?? "Glove"}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Line items */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Order Items</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="hidden sm:table-cell">Specs</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{item.product_name}</p>
                    {item.builder_recipe_url && (
                      <a
                        href={item.builder_recipe_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                      >
                        View design <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {/* Mobile specs */}
                    <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                      {item.leather_type && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.leather_type}
                        </Badge>
                      )}
                      {item.hand && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.hand}
                        </Badge>
                      )}
                      {item.position && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.position}
                        </Badge>
                      )}
                      {item.has_flag && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          🏴 Flag
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {item.leather_type && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.leather_type}
                        </Badge>
                      )}
                      {item.hand && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.hand}
                        </Badge>
                      )}
                      {item.position && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.position}
                        </Badge>
                      )}
                      {item.has_flag && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          🏴 Flag
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCents(item.unit_price)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCents(item.line_total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="p-4 border-t flex justify-end">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Order Total</p>
            <p className="text-xl font-bold">{formatCents(order.total_amount)}</p>
          </div>
        </div>
      </div>

      {/* Logo status */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold mb-2">Logo Status</h2>
        {order.logo_change_requested ? (
          <div className="space-y-2">
            <Badge variant="destructive" className="text-xs">
              LOGO CHANGE REQUESTED
            </Badge>
            {order.logo_change_notes && (
              <p className="text-sm text-muted-foreground">
                {order.logo_change_notes}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-status-green flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-status-green" />
            Using logos on file
          </p>
        )}
      </div>

      {/* Admin notes */}
      {order.notes && (
        <div className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Notes from MGB
          </h2>
          <p className="text-sm text-muted-foreground">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
