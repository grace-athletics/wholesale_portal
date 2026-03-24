import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/order/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { formatCents } from "@/lib/pricing";
import { format } from "date-fns";

export default function AdminOrders() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, created_at, user_id, notes")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, company_name, email");
      if (error) throw error;
      return data;
    },
  });

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const filtered = (orders ?? []).filter((o) => {
    const client = profileMap.get(o.user_id);
    const haystack = `${o.order_number} ${client?.company_name ?? ""} ${client?.full_name ?? ""}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesTab =
      tab === "all" ||
      (tab === "attention" && o.status === "Order Placed") ||
      (tab === "active" && !["Delivered", "Order Placed"].includes(o.status)) ||
      (tab === "completed" && o.status === "Delivered");
    return matchesSearch && matchesTab;
  });

  const attentionCount = (orders ?? []).filter((o) => o.status === "Order Placed").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">All Orders</h1>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({orders?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="attention">
            Need To Submit {attentionCount > 0 && `(${attentionCount})`}
          </TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No orders found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((o) => {
                      const client = profileMap.get(o.user_id);
                      return (
                        <TableRow key={o.id}>
                          <TableCell>
                            <Link to={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">
                              {o.order_number}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">
                            {client?.company_name || client?.full_name || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(o.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell><StatusBadge status={o.status} /></TableCell>
                          <TableCell className="text-right font-medium">{formatCents(o.total_amount)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
