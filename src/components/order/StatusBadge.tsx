import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  "Order Placed": "bg-status-gray/15 text-status-gray",
  "Order Submitted": "bg-status-amber/15 text-status-amber",
  Processing: "bg-primary/15 text-primary",
  "In Production": "bg-status-blue/15 text-status-blue",
  Shipped: "bg-status-purple/15 text-status-purple",
  Delivered: "bg-status-green/15 text-status-green",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", STATUS_STYLES[status] || "")}>
      {status}
    </Badge>
  );
}

const ORDER_STATUSES = ["Order Placed", "Order Submitted", "Processing", "In Production", "Shipped", "Delivered"];

const STATUS_WEEKS: Record<string, string> = {
  "Order Placed": "Week 1",
  "Order Submitted": "Week 1",
  Processing: "Week 2–3",
  "In Production": "Week 4–5",
  Shipped: "Week 6–7",
  Delivered: "Week 8",
};

const STEP_COLORS: Record<string, { active: string; completed: string }> = {
  "Order Placed": { active: "border-status-gray bg-status-gray", completed: "border-status-gray bg-status-gray" },
  "Order Submitted": { active: "border-status-amber bg-status-amber", completed: "border-status-amber bg-status-amber" },
  Processing: { active: "border-primary bg-primary", completed: "border-primary bg-primary" },
  "In Production": { active: "border-status-blue bg-status-blue", completed: "border-status-blue bg-status-blue" },
  Shipped: { active: "border-status-purple bg-status-purple", completed: "border-status-purple bg-status-purple" },
  Delivered: { active: "border-status-green bg-status-green", completed: "border-status-green bg-status-green" },
};

export function StatusStepper({ currentStatus }: { currentStatus: string }) {
  const currentIndex = ORDER_STATUSES.indexOf(currentStatus);

  return (
    <div className="flex items-center w-full">
      {ORDER_STATUSES.map((status, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex;
        const colors = STEP_COLORS[status];

        return (
          <div key={status} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all",
                  isCompleted && `${colors.completed} text-white`,
                  isCurrent && `${colors.active} text-white ring-4 ring-primary/20`,
                  isFuture && "border-border bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1.5 text-center whitespace-nowrap",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {status}
              </span>
              <span className="text-[9px] text-muted-foreground mt-0.5">
                {STATUS_WEEKS[status]}
              </span>
            </div>
            {i < ORDER_STATUSES.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 mt-[-28px]",
                  i < currentIndex ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Returns estimated delivery date (8 weeks from order placed) */
export function getEstimatedDelivery(createdAt: string): Date {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + 56); // 8 weeks
  return date;
}

export function formatEstimatedDelivery(createdAt: string): string {
  return getEstimatedDelivery(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}