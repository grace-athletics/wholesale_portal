import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// Status progression timeline:
// Order Submitted  → Processing    after 1 week
// Processing       → In Production after 3 weeks (4 weeks total from submitted)
// In Production    → Shipped       after 6 weeks (10 weeks total from submitted)
// Shipped → Delivered is manual (once tracking is confirmed)

const TRANSITIONS: { from: string; to: string; daysAfterLastUpdate: number }[] = [
  { from: "Order Submitted", to: "Processing", daysAfterLastUpdate: 7 },
  { from: "Processing", to: "In Production", daysAfterLastUpdate: 21 },
  { from: "In Production", to: "Shipped", daysAfterLastUpdate: 42 },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const fromStatuses = TRANSITIONS.map((t) => t.from);

    const { data: orders, error } = await admin
      .from("orders")
      .select("id, order_number, status, status_updated_at")
      .in("status", fromStatuses);

    if (error) {
      console.error("[AUTO-STATUS] Failed to fetch orders:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    let updated = 0;

    for (const order of orders ?? []) {
      const transition = TRANSITIONS.find((t) => t.from === order.status);
      if (!transition) continue;

      const lastUpdate = order.status_updated_at
        ? new Date(order.status_updated_at)
        : null;

      if (!lastUpdate) continue;

      const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceUpdate >= transition.daysAfterLastUpdate) {
        // Update order status
        const { error: updateErr } = await admin
          .from("orders")
          .update({
            status: transition.to,
            status_updated_at: now.toISOString(),
          })
          .eq("id", order.id);

        if (updateErr) {
          console.error(`[AUTO-STATUS] Failed to update ${order.order_number}:`, updateErr.message);
          continue;
        }

        // Insert history record
        await admin.from("order_status_history").insert({
          order_id: order.id,
          old_status: order.status,
          new_status: transition.to,
          note: "Auto-updated by system",
        });

        console.log(`[AUTO-STATUS] ${order.order_number}: ${order.status} → ${transition.to}`);
        updated++;
      }
    }

    return new Response(
      JSON.stringify({ checked: orders?.length ?? 0, updated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[AUTO-STATUS] ERROR:", String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
