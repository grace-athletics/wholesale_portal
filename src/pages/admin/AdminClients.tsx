import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users } from "lucide-react";
import { format } from "date-fns";
import { formatCents } from "@/lib/pricing";
import { useState } from "react";

export default function AdminClients() {
  const [search, setSearch] = useState("");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-orders-for-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("user_id, total_amount");
      if (error) throw error;
      return data;
    },
  });

  // Build stats per user
  const clientStats = new Map<string, { orderCount: number; totalSpend: number }>();
  orders?.forEach((o) => {
    const prev = clientStats.get(o.user_id) ?? { orderCount: 0, totalSpend: 0 };
    clientStats.set(o.user_id, {
      orderCount: prev.orderCount + 1,
      totalSpend: prev.totalSpend + o.total_amount,
    });
  });

  const filtered = (profiles ?? []).filter((p) => {
    const haystack = `${p.full_name ?? ""} ${p.company_name ?? ""} ${p.email ?? ""}`.toLowerCase();
    return !search || haystack.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Client Management</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {profiles?.length ?? 0} clients
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No clients found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const stats = clientStats.get(p.id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                      <TableCell>{p.company_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={p.subscription_status === "active" ? "default" : "secondary"}>
                          {p.subscription_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{stats?.orderCount ?? 0}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCents(stats?.totalSpend ?? 0)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(p.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
