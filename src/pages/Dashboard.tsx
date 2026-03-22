import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  DollarSign,
  Loader,
  Package,
  PlusCircle,
  ExternalLink,
  Image,
  Clock,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusColor: Record<string, string> = {
  Received: "bg-status-gray/15 text-status-gray",
  Processing: "bg-primary/15 text-primary",
  "In Production": "bg-status-blue/15 text-status-blue",
  Shipped: "bg-status-purple/15 text-status-purple",
  Delivered: "bg-status-green/15 text-status-green",
};

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function Dashboard() {
  const { profile, user } = useAuth();

  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ["my-orders-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total_amount");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: orderItemsSummary = [] } = useQuery({
    queryKey: ["my-order-items-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("order_id, product_name, quantity");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Build items-per-order lookup
  const itemsByOrder: Record<string, typeof orderItemsSummary> = {};
  orderItemsSummary.forEach((item) => {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push(item);
  });

  const totalOrders = allOrders.length;
  const totalSpent = allOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const activeStatuses = ["Received", "Processing", "In Production", "Shipped"];
  const activeOrders = allOrders.filter((o) => activeStatuses.includes(o.status));
  const inProduction = allOrders.filter((o) => o.status === "In Production").length;

  const shippedRecently = orders.find((o) => o.status === "Shipped");

  const kpis = [
    { label: "Total Orders", value: totalOrders.toString(), icon: ShoppingBag },
    { label: "Total Spent", value: formatCents(totalSpent), icon: DollarSign },
    { label: "In Production", value: inProduction.toString(), icon: Loader },
    { label: "Active Orders", value: activeOrders.length.toString(), icon: Package },
  ];

  const quickActions = [
    {
      label: "Order Gloves",
      description: "Place a new wholesale order",
      icon: PlusCircle,
      to: "/order/new",
    },
    {
      label: "Glove Builder",
      description: "Design your custom glove",
      icon: ExternalLink,
      href: "https://www.myglovebuilder.com/",
    },
    {
      label: "Mockup Studio",
      description: "Create product mockups",
      icon: Image,
      to: "/mockups",
    },
    {
      label: "Track Orders",
      description: "View your order history",
      icon: Clock,
      to: "/orders",
    },
  ];

  function summarizeItems(orderId: string) {
    const items = itemsByOrder[orderId];
    if (!items || items.length === 0) return "—";
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const names = [...new Set(items.map((i) => i.product_name))];
    if (names.length === 1) return `${totalQty}× ${names[0]}`;
    return `${totalQty} items (${names.length} products)`;
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div {...fadeIn} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-semibold">
          Welcome back, {profile?.company_name || "Partner"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's your wholesale portal overview.
        </p>
      </motion.div>

      {/* Shipped alert */}
      {shippedRecently && (
        <motion.div
          {...fadeIn}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="flex items-center gap-3 rounded-lg border border-status-purple/30 bg-status-purple/5 px-4 py-3"
        >
          <Truck className="h-5 w-5 text-status-purple shrink-0" />
          <p className="text-sm">
            <span className="font-medium">Order {shippedRecently.order_number}</span>{" "}
            has been shipped!{" "}
            <Link
              to={`/orders/${shippedRecently.id}`}
              className="text-primary hover:underline font-medium"
            >
              View details →
            </Link>
          </p>
        </motion.div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            {...fadeIn}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="rounded-lg border bg-card p-4 card-gold-top"
          >
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <kpi.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent orders */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="rounded-lg border bg-card"
      >
        <div className="flex items-center justify-between p-4 pb-0 sm:p-6 sm:pb-0">
          <h2 className="font-semibold">Recent Orders</h2>
          {orders.length > 0 && (
            <Link to="/orders" className="text-sm text-primary hover:underline font-medium">
              View all
            </Link>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="p-6 text-center">
            <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No orders yet. Place your first order to get started.
            </p>
            <Button asChild size="sm">
              <Link to="/order/new">Place Your First Order</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead className="hidden sm:table-cell">Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => (window.location.href = `/orders/${order.id}`)}
                  >
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-xs max-w-[200px] truncate">
                      {summarizeItems(order.id)}
                    </TableCell>
                    <TableCell>{formatCents(order.total_amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColor[order.status] || ""}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

      {/* Quick actions */}
      <motion.div {...fadeIn} transition={{ duration: 0.3, delay: 0.3 }}>
        <h2 className="font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const content = (
              <div className="rounded-lg border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
                <action.icon className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {action.description}
                </p>
              </div>
            );

            if (action.href) {
              return (
                <a
                  key={action.label}
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {content}
                </a>
              );
            }

            return (
              <Link key={action.label} to={action.to!}>
                {content}
              </Link>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
