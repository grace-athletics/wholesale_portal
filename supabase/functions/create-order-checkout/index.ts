import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-ORDER-CHECKOUT] ${step}${d}`);
};

interface OrderItem {
  product_id: string;
  product_name: string;
  leather_type: string | null;
  hand: string | null;
  position: string | null;
  has_flag: boolean;
  quantity: number;
  unit_price: number;
  line_total: number;
  builder_recipe_url: string | null;
  notes: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    const items: OrderItem[] = body.items;
    const orderNotes: string | null = body.notes || null;
    const logoChangeRequested: boolean = body.logo_change_requested || false;
    const logoChangeNotes: string | null = body.logo_change_notes || null;

    if (!items || items.length === 0) throw new Error("No items provided");
    logStep("Items received", { count: items.length });

    const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);
    logStep("Total calculated", { totalAmount });

    // 1. Create the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: totalAmount,
        notes: orderNotes,
        logo_change_requested: logoChangeRequested,
        logo_change_notes: logoChangeNotes,
        status: "Received",
      })
      .select("id, order_number")
      .single();

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);
    logStep("Order created", { orderId: order.id, orderNumber: order.order_number });

    // 2. Insert order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      leather_type: item.leather_type,
      hand: item.hand,
      position: item.position,
      has_flag: item.has_flag,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      builder_recipe_url: item.builder_recipe_url,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw new Error(`Failed to insert items: ${itemsError.message}`);
    logStep("Order items inserted");

    // 3. Insert initial status history
    await supabaseAdmin.from("order_status_history").insert({
      order_id: order.id,
      new_status: "Received",
      changed_by: user.id,
      note: "Order placed",
    });

    // 4. Create Stripe checkout session (embedded)
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Order ${order.order_number}`,
              description: `${items.length} item(s) — wholesale glove order`,
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      ui_mode: "embedded",
      return_url: `${origin}/orders/${order.id}?payment=success`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
      },
    });

    logStep("Stripe checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({
        clientSecret: session.client_secret,
        order_id: order.id,
        order_number: order.order_number,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
