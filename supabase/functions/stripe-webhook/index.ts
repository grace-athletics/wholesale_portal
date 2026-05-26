import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    logStep("ERROR", { message: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" });
    return new Response("Webhook configuration error", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { error: String(err) });
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;

    if (!orderId) {
      logStep("No order_id in session metadata", { sessionId: session.id });
      return new Response("OK", { status: 200 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Update order status to "Order Placed"
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "Order Placed" })
      .eq("id", orderId)
      .eq("status", "Pending Payment"); // only update if still pending

    if (updateError) {
      logStep("Failed to update order status", { orderId, error: updateError.message });
      return new Response("DB update failed", { status: 500 });
    }

    // Add status history entry
    await supabaseAdmin.from("order_status_history").insert({
      order_id: orderId,
      new_status: "Order Placed",
      note: `Payment confirmed via Stripe (session: ${session.id})`,
    });

    logStep("Order confirmed", { orderId, sessionId: session.id });
  }

  return new Response("OK", { status: 200 });
});
