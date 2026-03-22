import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/order/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { DollarSign, ShoppingBag, Users, TrendingUp } from "lucide-react";
import { formatCents } from "@/lib/pricing";

export default function AdminDashboard() {
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, created_at, user_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, company_name, subscription_status, email");
      if (error) throw error;
      return data;
    },
  });

  const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) ?? 0;
  const totalOrders = orders?.length ?? 0;
  const activeClients = profiles?.filter((p) => p.subscription_status === "active").length ?? 0;

  // MRR — sum of orders in current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const mrr = orders?.filter((o) => o.created_at >= monthStart).reduce((sum, o) => sum + o.total_amount, 0) ?? 0;

  const needsAttention = orders?.filter((o) => o.status === "Received") ?? [];
  const recentOrders = orders?.slice(0, 8) ?? [];

  // Map user_id to profile
  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const kpis = [
    { label: "Monthly Revenue", value: formatCents(mrr), icon: TrendingUp, color: "text-status-green" },
    { label: "Total Revenue", value: formatCents(totalRevenue), icon: DollarSign, color: "text-primary" },
    { label: "Total Orders", value: totalOrders.toString(), icon: ShoppingBag, color: "text-status-blue" },
    { label: "Active Clients", value: activeClients.toString(), icon: Users, color: "text-status-purple" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="card-gold-top">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{kpi.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs Attention ({needsAttention.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {needsAttention.length === 0 ? (
              <p className="text-sm text-muted-foreground">All caught up! 🎉</p>
            ) : (
              <div className="space-y-2">
                {needsAttention.slice(0, 5).map((o) => {
                  const client = profileMap.get(o.user_id);
                  return (
                    <Link
                      key={o.id}
                      to={`/admin/orders/${o.id}`}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <div>
                        <span className="font-medium text-sm">{o.order_number}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {client?.company_name || client?.full_name || "Unknown"}
                        </span>
                      </div>
                      <span className="text-sm font-medium">{formatCents(o.total_amount)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => {
                  const client = profileMap.get(o.user_id);
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link to={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">
                          {o.order_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{client?.company_name || client?.full_name || "—"}</TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                      <TableCell className="text-right font-medium">{formatCents(o.total_amount)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
