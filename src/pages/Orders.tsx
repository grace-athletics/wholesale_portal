import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatCents } from "@/lib/pricing";
import { StatusBadge } from "@/components/order/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingBag, Search, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";

const STATUSES = ["All", "Order Placed", "Processing", "In Production", "Shipped", "Delivered"];

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ["my-order-items-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("order_id, product_name, quantity");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const itemsByOrder: Record<string, typeof orderItems> = {};
  orderItems.forEach((item) => {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push(item);
  });

  function summarize(orderId: string) {
    const items = itemsByOrder[orderId];
    if (!items || items.length === 0) return "—";
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const names = [...new Set(items.map((i) => i.product_name))];
    if (names.length === 1) return `${totalQty}× ${names[0]}`;
    return `${totalQty} items`;
  }

  const filtered = orders.filter((o) => {
    if (statusFilter !== "All" && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.order_number.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-semibold">Order History</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {orders.length} total order{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/order/new">
            <PlusCircle className="h-4 w-4 mr-1" /> New Order
          </Link>
        </Button>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center">
          <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            {orders.length === 0
              ? "No orders yet. Place your first order to get started."
              : "No orders match your filters."}
          </p>
          {orders.length === 0 && (
            <Button asChild size="sm" className="mt-4">
              <Link to="/order/new">Place Your First Order</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                    {summarize(order.id)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCents(order.total_amount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
