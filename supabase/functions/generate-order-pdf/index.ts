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

const DARK = rgb(0.1, 0.1, 0.1);
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT_GRAY = rgb(0.7, 0.7, 0.7);
const LINE_COLOR = rgb(0.85, 0.85, 0.85);

const formatCents = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

async function fetchImage(pdfDoc: any, url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const imageBytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("png")) {
      return await pdfDoc.embedPng(imageBytes);
    } else {
      return await pdfDoc.embedJpg(imageBytes);
    }
  } catch (e) {
    log("Failed to fetch image", { url: url.substring(0, 80), error: String(e) });
    return null;
  }
}

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

    // ----- Build PDF -----
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 612; // Letter width
    const PAGE_H = 792; // Letter height
    const MARGIN = 36;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    // Pre-fetch logo images once
    const logo = logos && logos.length > 0 ? logos[0] : null;
    const logoImages: { label: string; image: any }[] = [];

    if (logo) {
      const logoEntries = [
        { url: logo.palm_logo_url, label: "Palm Stamp" },
        { url: logo.thumb_logo_url, label: "Thumb Logo" },
        { url: logo.wrist_logo_url, label: "Wrist Logo" },
      ];
      for (const entry of logoEntries) {
        if (entry.url) {
          // Generate signed URL for private bucket
          const path = entry.url.includes("/client-logos/")
            ? entry.url.split("/client-logos/").pop()
            : null;
          let imageUrl = entry.url;
          if (path) {
            const { data: signedData } = await admin.storage
              .from("client-logos")
              .createSignedUrl(path, 300);
            if (signedData?.signedUrl) {
              imageUrl = signedData.signedUrl;
            }
          }
          const img = await fetchImage(pdfDoc, imageUrl);
          if (img) {
            logoImages.push({ label: entry.label, image: img });
          }
        }
      }
    }

    // Pre-fetch order images (glove screenshots)
    const screenshotImages: { angle: number; image: any }[] = [];
    if (orderImages) {
      for (const oi of orderImages) {
        const img = await fetchImage(pdfDoc, oi.image_url);
        if (img) {
          screenshotImages.push({ angle: oi.angle, image: img });
        }
      }
    }

    // ===== Generate one page per line item =====
    for (const item of items ?? []) {
      const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      let y = PAGE_H - MARGIN;

      const drawText = (
        text: string,
        x: number,
        yPos: number,
        options: { font?: any; size?: number; color?: any; maxWidth?: number } = {}
      ) => {
        const f = options.font || font;
        const s = options.size || 10;
        const c = options.color || DARK;
        page.drawText(text, { x, y: yPos, size: s, font: f, color: c, maxWidth: options.maxWidth });
      };

      // ===== TOP: 4 Glove Screenshots in a row =====
      const imgBoxW = (CONTENT_W - 18) / 4; // 4 images with 6px gaps
      const imgBoxH = imgBoxW * 1.0; // square-ish
      const screenshotY = y - imgBoxH;

      // Draw screenshot boxes
      for (let i = 0; i < 4; i++) {
        const boxX = MARGIN + i * (imgBoxW + 6);
        // Draw border
        page.drawRectangle({
          x: boxX,
          y: screenshotY,
          width: imgBoxW,
          height: imgBoxH,
          borderColor: LINE_COLOR,
          borderWidth: 0.5,
          color: rgb(0.98, 0.98, 0.98),
        });

        // Find matching screenshot
        const shot = screenshotImages.find((s) => s.angle === i + 1);
        if (shot) {
          const scale = Math.min(
            (imgBoxW - 8) / shot.image.width,
            (imgBoxH - 8) / shot.image.height
          );
          const iw = shot.image.width * scale;
          const ih = shot.image.height * scale;
          page.drawImage(shot.image, {
            x: boxX + (imgBoxW - iw) / 2,
            y: screenshotY + (imgBoxH - ih) / 2,
            width: iw,
            height: ih,
          });
        }
      }

      y = screenshotY - 16;

      // ===== BOTTOM: Two-column layout =====
      // Left: Build specs | Right: Logos
      const leftColW = CONTENT_W * 0.55;
      const rightColX = MARGIN + CONTENT_W * 0.58;
      const rightColW = CONTENT_W * 0.42;

      // --- LEFT COLUMN: Build Specs ---
      const specsStartY = y;

      // Draw border box for specs
      const specsBoxHeight = PAGE_H - MARGIN - (PAGE_H - specsStartY) - MARGIN;

      page.drawRectangle({
        x: MARGIN,
        y: MARGIN,
        width: leftColW,
        height: specsStartY - MARGIN,
        borderColor: LINE_COLOR,
        borderWidth: 0.5,
        color: rgb(1, 1, 1),
      });

      let specY = specsStartY - 14;

      const specLine = (label: string, value: string) => {
        if (specY < MARGIN + 10) return;
        drawText(`${label}: ${value}`, MARGIN + 8, specY, { font: fontBold, size: 10 });
        specY -= 16;
      };

      // Build spec lines from item data
      if (item.leather_type) specLine("Leather Type", item.leather_type);
      if (item.hand) specLine("Throwing Hand", item.hand === "RHT" ? "right" : item.hand === "LHT" ? "left" : item.hand);
      if (item.position) specLine("Position", item.position);
      if (item.size) specLine("Size", item.size);
      specLine("Add Flag", item.has_flag ? "yes" : "no");
      specLine("Quantity", String(item.quantity));
      specLine("Unit Price", formatCents(item.unit_price));
      specLine("Line Total", formatCents(item.line_total));

      if (item.builder_recipe_url) {
        specY -= 8;
        drawText("Design Link:", MARGIN + 8, specY, { font: fontBold, size: 9 });
        specY -= 12;
        const displayUrl = item.builder_recipe_url.length > 60
          ? item.builder_recipe_url.substring(0, 60) + "..."
          : item.builder_recipe_url;
        drawText(displayUrl, MARGIN + 8, specY, { size: 8, color: rgb(0.2, 0.2, 0.8) });
        specY -= 16;
      }

      if (item.notes) {
        specY -= 4;
        drawText("Notes:", MARGIN + 8, specY, { font: fontBold, size: 9 });
        specY -= 12;
        drawText(item.notes.substring(0, 200), MARGIN + 8, specY, { size: 8, color: GRAY, maxWidth: leftColW - 20 });
      }

      // --- RIGHT COLUMN: Logos ---
      // Draw border box for logos
      page.drawRectangle({
        x: rightColX - 4,
        y: MARGIN,
        width: rightColW + 4,
        height: specsStartY - MARGIN,
        borderColor: LINE_COLOR,
        borderWidth: 0.5,
        color: rgb(1, 1, 1),
      });

      let logoY = specsStartY - 10;
      const logoAreaW = rightColW - 16;

      for (const li of logoImages) {
        if (logoY < MARGIN + 40) break;

        // Label
        const labelW = fontBold.widthOfTextAtSize(li.label, 10);
        drawText(li.label, rightColX + (logoAreaW - labelW) / 2 + 4, logoY, {
          font: fontBold,
          size: 10,
        });
        logoY -= 8;

        // Image
        const maxLogoH = (specsStartY - MARGIN - 40) / 3 - 20;
        const maxLogoW = logoAreaW - 8;
        const scale = Math.min(maxLogoW / li.image.width, maxLogoH / li.image.height, 1);
        const lw = li.image.width * scale;
        const lh = li.image.height * scale;

        page.drawImage(li.image, {
          x: rightColX + (logoAreaW - lw) / 2 + 4,
          y: logoY - lh,
          width: lw,
          height: lh,
        });
        logoY -= lh + 16;

        // Separator line
        if (logoY > MARGIN + 40) {
          page.drawLine({
            start: { x: rightColX + 8, y: logoY + 6 },
            end: { x: rightColX + logoAreaW - 4, y: logoY + 6 },
            thickness: 0.5,
            color: LINE_COLOR,
          });
        }
      }

      // Page header - item info
      const headerText = `${order.order_number} - ${item.product_name}`;
      drawText(headerText, MARGIN, PAGE_H - MARGIN + 12, { size: 7, color: LIGHT_GRAY });

      // Footer
      const clientName = profile?.company_name || profile?.full_name || "Client";
      const footerText = `${clientName} | ${order.order_number} | Generated ${new Date().toLocaleDateString("en-US")}`;
      page.drawText(footerText, { x: MARGIN, y: 16, size: 7, font, color: LIGHT_GRAY });
    }

    // Serialize
    const pdfBytes = await pdfDoc.save();
    log("PDF generated", { bytes: pdfBytes.length, pages: items?.length || 0 });

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

    const { data: signedUrl } = await admin.storage
      .from("order-pdfs")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

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
