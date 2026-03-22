import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents } from "@/lib/pricing";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { DollarSign, TrendingUp, ShoppingBag } from "lucide-react";

export default function AdminRevenue() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-revenue-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("total_amount, created_at, status")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Build monthly data for last 12 months
  const now = new Date();
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i);
    months.push({
      label: format(d, "MMM yyyy"),
      start: startOfMonth(d),
      end: endOfMonth(d),
    });
  }

  const monthlyData = months.map((m) => {
    const monthOrders = (orders ?? []).filter((o) => {
      const d = new Date(o.created_at);
      return d >= m.start && d <= m.end;
    });
    return {
      month: format(m.start, "MMM"),
      revenue: monthOrders.reduce((sum, o) => sum + o.total_amount, 0),
      orders: monthOrders.length,
    };
  });

  const totalRevenue = orders?.reduce((s, o) => s + o.total_amount, 0) ?? 0;
  const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue ?? 0;
  const prevMonthRevenue = monthlyData[monthlyData.length - 2]?.revenue ?? 0;
  const growthPct = prevMonthRevenue > 0 ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(43 50% 54%)" },
    orders: { label: "Orders", color: "hsl(210 52% 60%)" },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Revenue Overview</h1>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "All-Time Revenue", value: formatCents(totalRevenue), icon: DollarSign },
          { label: "This Month", value: formatCents(currentMonthRevenue), icon: TrendingUp },
          {
            label: "Growth",
            value: `${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(1)}%`,
            icon: ShoppingBag,
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="card-gold-top">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold">{kpi.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} className="text-xs" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCents(value as number)}
                    />
                  }
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Orders Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="orders" stroke="var(--color-orders)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
