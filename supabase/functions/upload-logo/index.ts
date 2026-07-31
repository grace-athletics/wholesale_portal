import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
const MAX_SIZE = 10 * 1024 * 1024;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const slotKey = formData.get("slotKey") as string;
    const email = formData.get("email") as string;

    if (!file || !slotKey || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate file
    if (!VALID_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Only PNG, JPG, or SVG files are allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: "File must be under 10MB" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const storagePath = `${email}/${slotKey}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("client-logos")
      .upload(storagePath, fileBuffer, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    // Get signed URL (1 year expiration)
    const { data: signedData, error: signedError } = await supabase.storage
      .from("client-logos")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    if (signedError) throw signedError;

    const publicUrl = signedData.signedUrl;

    // Get existing record
    const { data: existing } = await supabase
      .from("client_logos")
      .select("id, version")
      .eq("user_email", email)
      .limit(1)
      .single();

    const urlField = `${slotKey}_logo_url`;
    const fnField = `${slotKey}_logo_filename`;

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("client_logos")
        .update({
          [urlField]: publicUrl,
          [fnField]: file.name,
          version: existing.version + 1,
          uploaded_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) throw updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from("client_logos")
        .insert({
          user_email: email,
          [urlField]: publicUrl,
          [fnField]: file.name,
          version: 1,
          uploaded_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        filename: file.name,
        slot: slotKey,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
