import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Calendar } from "lucide-react";
import { useState } from "react";

export default function ShopifyOrders() {
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["shopify-orders", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_email", user.email)
        .order("order_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.email,
  });

  const calculateExpectedShipDate = (orderDate: string) => {
    const date = new Date(orderDate);
    date.setDate(date.getDate() + 42); // 6 weeks = 42 days
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      unfulfilled: "🟠 In Production",
      partial: "🟡 Partially Shipped",
      fulfilled: "✅ Shipped",
      restocked: "🔄 Restocked",
      cancelled: "❌ Cancelled",
      scheduled: "📅 Scheduled",
    };
    return statusMap[status] || status;
  };

  const formatOrderDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted/30 animate-pulse rounded" />
        <div className="h-96 bg-muted/30 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No orders found.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold">Your Orders</h1>
        <p className="text-muted-foreground mt-1">View your glove orders and download travelers</p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Order #</TableHead>
              <TableHead>Date Placed</TableHead>
              <TableHead>Expected Ship</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <>
                <TableRow
                  key={order.id}
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                >
                  <TableCell className="font-semibold">MGB{order.order_number}</TableCell>
                  <TableCell className="text-sm">{formatOrderDate(order.order_date)}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {calculateExpectedShipDate(order.order_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {formatStatusBadge(order.fulfillment_status || "unfulfilled")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{order.product_title}</TableCell>
                  <TableCell className="text-right">
                    {order.traveler_pdf_url && (
                      <a href={`${order.traveler_pdf_url}?download`} download>
                        <Button size="sm" variant="outline" className="gap-2">
                          <Download className="h-3.5 w-3.5" /> PDF
                        </Button>
                      </a>
                    )}
                  </TableCell>
                </TableRow>
                {selectedOrder === order.id && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={6} className="p-0">
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-6 py-4"
                      >
                        <h3 className="text-base font-semibold mb-3">Order Specifications</h3>
                        {order.line_item_properties && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2">
                            {Object.entries(order.line_item_properties)
                              .filter(([key]) => !key.startsWith("_") && key !== "thumbnail")
                              .map(([key, value]) => (
                                <div key={key} className="flex justify-between items-start gap-3 py-1">
                                  <span className="text-xs text-muted-foreground capitalize whitespace-nowrap">
                                    {key.replace(/_/g, " ")}
                                  </span>
                                  <span className="font-medium text-xs text-right">{String(value)}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </motion.div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
