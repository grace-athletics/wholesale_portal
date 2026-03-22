import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { ShoppingBag, DollarSign, Loader, Package } from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export default function Dashboard() {
  const { profile } = useAuth();

  const kpis = [
    { label: "Total Orders", value: "0", icon: ShoppingBag },
    { label: "Total Spent", value: "$0", icon: DollarSign },
    { label: "In Production", value: "0", icon: Loader },
    { label: "Active Orders", value: "0", icon: Package },
  ];

  return (
    <div className="space-y-6">
      <motion.div {...fadeIn}>
        <h1 className="text-2xl font-semibold">
          Welcome back, {profile?.company_name || "Partner"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's your wholesale portal overview.
        </p>
      </motion.div>

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

      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-4">Recent Orders</h2>
        <p className="text-sm text-muted-foreground">
          No orders yet. Place your first order to get started.
        </p>
      </div>
    </div>
  );
}
