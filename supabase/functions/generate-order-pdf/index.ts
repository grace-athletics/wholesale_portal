import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GENERATE-ORDER-PDF] ${step}${d}`);
};

const GOLD = rgb(0.788, 0.659, 0.298);
const GRAY = rgb(0.4, 0.4, 0.4);
const DARK = rgb(0.1, 0.1, 0.1);
const LIGHT_GRAY = rgb(0.6, 0.6, 0.6);
const BG_GRAY = rgb(0.96, 0.96, 0.96);

const formatCents = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Check admin role
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Fetching order data", { order_id });

    // Fetch all data in parallel
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: items }, { data: profile }, { data: logos }, { data: orderImages }] =
      await Promise.all([
        admin.from("order_items").select("*").eq("order_id", order_id),
        admin.from("profiles").select("*").eq("id", order.user_id).single(),
        admin
          .from("client_logos")
          .select("*")
          .eq("user_id", order.user_id)
          .order("version", { ascending: false })
          .limit(1),
        admin
          .from("order_images")
          .select("*")
          .eq("order_id", order_id)
          .order("angle", { ascending: true }),
      ]);

    log("Data fetched", {
      items: items?.length,
      hasProfile: !!profile,
      logos: logos?.length,
      orderImages: orderImages?.length,
    });

    // ----- Build PDF with pdf-lib -----
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 595;
    const PAGE_H = 842;
    const MARGIN = 50;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    function ensureSpace(needed: number) {
      if (y - needed < MARGIN + 20) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
    }

    function drawText(
      text: string,
      x: number,
      yPos: number,
      options: { font?: any; size?: number; color?: any; maxWidth?: number } = {}
    ) {
      const f = options.font || font;
      const s = options.size || 10;
      const c = options.color || DARK;
      page.drawText(text, { x, y: yPos, size: s, font: f, color: c, maxWidth: options.maxWidth });
    }

    // ===== HEADER =====
    drawText("MY GLOVE BRAND", MARGIN, y, { font: fontBold, size: 18, color: GOLD });
    drawText("Order Confirmation", MARGIN, y - 18, { size: 9, color: GRAY });

    // Right side - order info
    drawText(order.order_number, PAGE_W - MARGIN - fontBold.widthOfTextAtSize(order.order_number, 14), y, {
      font: fontBold,
      size: 14,
    });
    const dateStr = new Date(order.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    drawText(dateStr, PAGE_W - MARGIN - font.widthOfTextAtSize(dateStr, 9), y - 16, {
      size: 9,
      color: GRAY,
    });
    const statusStr = `Status: ${order.status}`;
    drawText(statusStr, PAGE_W - MARGIN - font.widthOfTextAtSize(statusStr, 9), y - 28, {
      size: 9,
      color: GRAY,
    });

    y -= 40;

    // Gold divider
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 2,
      color: GOLD,
    });
    y -= 20;

    // ===== CLIENT INFO =====
    const clientName = profile?.company_name || profile?.full_name || "Client";
    drawText(clientName, MARGIN, y, { font: fontBold, size: 13 });
    y -= 14;
    if (profile?.email) {
      drawText(profile.email, MARGIN, y, { size: 9, color: GRAY });
      y -= 12;
    }
    y -= 12;

    // ===== LINE ITEMS =====
    drawText("LINE ITEMS", MARGIN, y, { font: fontBold, size: 11, color: rgb(0.3, 0.3, 0.3) });
    y -= 18;

    // Table header
    const cols = [MARGIN, MARGIN + 110, MARGIN + 195, MARGIN + 255, MARGIN + 310, MARGIN + 360, MARGIN + 430];
    const colHeaders = ["Product", "Leather", "Hand", "Pos", "Qty", "Unit", "Total"];
    colHeaders.forEach((h, i) => {
      drawText(h, cols[i], y, { font: fontBold, size: 8, color: LIGHT_GRAY });
    });
    y -= 4;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
    y -= 14;

    // Table rows
    for (const item of items ?? []) {
      ensureSpace(60);

      const row = [
        item.product_name,
        item.leather_type || "—",
        item.hand || "—",
        item.position || "—",
        String(item.quantity),
        formatCents(item.unit_price),
        formatCents(item.line_total),
      ];
      row.forEach((val, i) => {
        drawText(val, cols[i], y, { size: 9 });
      });
      y -= 4;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.92, 0.92, 0.92) });
      y -= 10;

      // Item details: flag, notes, builder URL
      const details: string[] = [];
      if (item.has_flag) details.push("🏴 Flag added");
      if (item.notes) details.push(`Note: ${item.notes}`);
      if (item.builder_recipe_url) details.push(`Builder: ${item.builder_recipe_url}`);

      if (details.length > 0) {
        for (const detail of details) {
          ensureSpace(14);
          const displayText = detail.length > 90 ? detail.substring(0, 90) + "…" : detail;
          drawText(displayText, MARGIN + 10, y, { size: 7, color: GRAY });
          y -= 10;
        }
        y -= 4;
      }
    }

    // Order total
    y -= 4;
    page.drawLine({ start: { x: MARGIN + 300, y: y + 8 }, end: { x: PAGE_W - MARGIN, y: y + 8 }, thickness: 2, color: GOLD });
    ensureSpace(20);
    drawText("Order Total:", MARGIN + 310, y, { font: fontBold, size: 12 });
    drawText(formatCents(order.total_amount), MARGIN + 430, y, { font: fontBold, size: 12, color: GOLD });
    y -= 24;

    // ===== ORDER NOTES =====
    if (order.notes) {
      ensureSpace(40);
      drawText("ORDER NOTES", MARGIN, y, { font: fontBold, size: 11, color: rgb(0.3, 0.3, 0.3) });
      y -= 14;
      const noteText = order.notes.substring(0, 500);
      drawText(noteText, MARGIN, y, { size: 9, color: rgb(0.35, 0.35, 0.35), maxWidth: CONTENT_W });
      y -= Math.ceil(noteText.length / 80) * 12 + 10;
    }

    // ===== LOGO CHANGE INFO =====
    if (order.logo_change_requested) {
      ensureSpace(40);
      drawText("⚠ LOGO CHANGE REQUESTED", MARGIN, y, { font: fontBold, size: 10, color: rgb(0.8, 0.2, 0.1) });
      y -= 14;
      if (order.logo_change_notes) {
        drawText(order.logo_change_notes, MARGIN, y, { size: 9, color: rgb(0.35, 0.35, 0.35), maxWidth: CONTENT_W });
        y -= 20;
      }
    }

    // ===== CLIENT LOGOS =====
    const logo = logos && logos.length > 0 ? logos[0] : null;
    if (logo) {
      ensureSpace(100);
      drawText("CLIENT LOGOS", MARGIN, y, { font: fontBold, size: 11, color: rgb(0.3, 0.3, 0.3) });
      y -= 16;

      const logoUrls = [
        { url: logo.palm_logo_url, label: "Palm" },
        { url: logo.wrist_logo_url, label: "Wrist" },
        { url: logo.thumb_logo_url, label: "Thumb" },
      ].filter((l) => l.url);

      let logoX = MARGIN;
      for (const logoInfo of logoUrls) {
        try {
          const response = await fetch(logoInfo.url);
          if (!response.ok) continue;
          const imageBytes = new Uint8Array(await response.arrayBuffer());
          const contentType = response.headers.get("content-type") || "";

          let image;
          if (contentType.includes("png")) {
            image = await pdfDoc.embedPng(imageBytes);
          } else {
            image = await pdfDoc.embedJpg(imageBytes);
          }

          const scale = Math.min(80 / image.width, 80 / image.height);
          const imgW = image.width * scale;
          const imgH = image.height * scale;

          ensureSpace(imgH + 20);
          page.drawImage(image, { x: logoX, y: y - imgH, width: imgW, height: imgH });
          drawText(logoInfo.label, logoX + imgW / 2 - font.widthOfTextAtSize(logoInfo.label, 8) / 2, y - imgH - 12, {
            size: 8,
            color: GRAY,
          });
          logoX += imgW + 24;
        } catch (e) {
          log("Failed to embed logo", { label: logoInfo.label, error: String(e) });
          drawText(`[${logoInfo.label} — failed to load]`, logoX, y - 10, { size: 8, color: GRAY });
          logoX += 100;
        }
      }
      y -= 100;
    }

    // ===== ORDER IMAGES (Glove screenshots) =====
    if (orderImages && orderImages.length > 0) {
      ensureSpace(30);
      drawText("GLOVE IMAGES", MARGIN, y, { font: fontBold, size: 11, color: rgb(0.3, 0.3, 0.3) });
      y -= 16;

      const angleLabels: Record<number, string> = {
        1: "Front",
        2: "Back",
        3: "Heel / Side",
        4: "Palm Side",
      };

      // 2x2 grid of images
      const imgSize = 200;
      const gap = 16;
      let col = 0;

      for (const oi of orderImages) {
        try {
          ensureSpace(imgSize + 30);
          const response = await fetch(oi.image_url);
          if (!response.ok) continue;
          const imageBytes = new Uint8Array(await response.arrayBuffer());
          const contentType = response.headers.get("content-type") || "";

          let image;
          if (contentType.includes("png")) {
            image = await pdfDoc.embedPng(imageBytes);
          } else {
            image = await pdfDoc.embedJpg(imageBytes);
          }

          const scale = Math.min(imgSize / image.width, imgSize / image.height);
          const imgW = image.width * scale;
          const imgH = image.height * scale;

          const xPos = col === 0 ? MARGIN : MARGIN + imgSize + gap;
          page.drawImage(image, { x: xPos, y: y - imgH, width: imgW, height: imgH });

          const label = angleLabels[oi.angle] || `Angle ${oi.angle}`;
          drawText(label, xPos, y - imgH - 12, { size: 8, color: GRAY, font: fontBold });

          col++;
          if (col >= 2) {
            col = 0;
            y -= imgH + 30;
          }
        } catch (e) {
          log("Failed to embed order image", { angle: oi.angle, error: String(e) });
        }
      }
      if (col === 1) y -= imgSize + 30; // close partial row
    }

    // ===== QC SIGN-OFF =====
    ensureSpace(80);
    y -= 10;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    y -= 20;
    drawText("QC SIGN-OFF", MARGIN, y, { font: fontBold, size: 10, color: rgb(0.3, 0.3, 0.3) });
    y -= 18;
    drawText("Inspected by: ________________________", MARGIN, y, { size: 9, color: GRAY });
    drawText("Date: _______________", MARGIN + 280, y, { size: 9, color: GRAY });
    y -= 16;
    drawText("Notes: _______________________________________________", MARGIN, y, { size: 9, color: GRAY });

    // ===== FOOTER =====
    const footerText = `MY GLOVE BRAND · Custom Glove Manufacturing · Generated ${new Date().toLocaleDateString("en-US")}`;
    // Add footer to all pages
    for (const p of pdfDoc.getPages()) {
      p.drawText(footerText, {
        x: MARGIN,
        y: 20,
        size: 7,
        font,
        color: LIGHT_GRAY,
      });
    }

    // Serialize
    const pdfBytes = await pdfDoc.save();
    log("PDF generated", { bytes: pdfBytes.length });

    // Upload to storage
    const filePath = `${order.order_number}.pdf`;
    const { error: uploadErr } = await admin.storage
      .from("order-pdfs")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      log("Upload error", { error: uploadErr.message });
      return new Response(JSON.stringify({ error: "Failed to upload PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get signed URL
    const { data: signedUrl } = await admin.storage
      .from("order-pdfs")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    // Update order record
    await admin
      .from("orders")
      .update({
        pdf_url: signedUrl?.signedUrl || null,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq("id", order_id);

    log("PDF uploaded and order updated");

    return new Response(
      JSON.stringify({ pdf_url: signedUrl?.signedUrl, message: "PDF generated" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    log("ERROR", { message: String(err) });
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
