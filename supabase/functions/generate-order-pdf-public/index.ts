// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[PDF] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const { order_number, customer_name, order_date } = await req.json();

    if (!order_number) return new Response(JSON.stringify({ error: "order_number required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!customer_name) return new Response(JSON.stringify({ error: "customer_name required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    log("Building PDF URL", { order_number, customer_name, order_date });

    if (!order_date) {
      return new Response(JSON.stringify({ error: "order_date required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract just the date portion from order_date, converting to UTC
    // Shopify provides timestamp in local timezone like "2026-07-23 21:22:49 -0400"
    // PDFs are stored by UTC date, so convert to UTC first
    const date = new Date(order_date);
    const folderName = date.toISOString().substring(0, 10);

    // Construct the filename: {ORDER_NUMBER}_{CUSTOMER_NAME}_1_traveler.pdf
    const filename = `${order_number}_${customer_name}_1_traveler.pdf`;

    // Construct the public URL - encode only spaces, keep colons unencoded
    const encodedFolderName = folderName.replace(/ /g, '%20');
    const encodedFilename = filename.replace(/ /g, '%20');
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/traveler-pdfs/travelers/${encodedFolderName}/${encodedFilename}`;

    log("Constructed PDF URL", { publicUrl: publicUrl.substring(0, 150) });

    return new Response(JSON.stringify({ pdf_url: publicUrl, message: "PDF URL constructed" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    log("ERROR", { message: String(err) });
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
