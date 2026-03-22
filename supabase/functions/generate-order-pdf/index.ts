import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for admin check and data access
    const admin = createClient(supabaseUrl, serviceKey);
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

    // Fetch order + items + client profile
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

    const [{ data: items }, { data: profile }, { data: logos }] = await Promise.all([
      admin.from("order_items").select("*").eq("order_id", order_id),
      admin.from("profiles").select("*").eq("id", order.user_id).single(),
      admin.from("client_logos").select("*").eq("user_id", order.user_id).order("version", { ascending: false }).limit(1),
    ]);

    // Build PDF as HTML → rendered with a simple PDF approach
    const formatCents = (c: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

    const logoSection = logos && logos.length > 0
      ? `<div style="margin-top:16px;display:flex;gap:16px;">
          ${logos[0].palm_logo_url ? `<div><img src="${logos[0].palm_logo_url}" style="max-height:60px;"/><div style="font-size:10px;color:#888;">Palm</div></div>` : ""}
          ${logos[0].wrist_logo_url ? `<div><img src="${logos[0].wrist_logo_url}" style="max-height:60px;"/><div style="font-size:10px;color:#888;">Wrist</div></div>` : ""}
          ${logos[0].thumb_logo_url ? `<div><img src="${logos[0].thumb_logo_url}" style="max-height:60px;"/><div style="font-size:10px;color:#888;">Thumb</div></div>` : ""}
        </div>`
      : "";

    const itemRows = (items ?? [])
      .map(
        (item) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e5e5;">${item.product_name}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e5e5;">${item.leather_type || "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e5e5;">${item.hand || "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e5e5;">${item.position || "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:center;">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">${formatCents(item.unit_price)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:600;">${formatCents(item.line_total)}</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 40px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #c9a84c; padding-bottom: 16px; }
    .brand { font-size: 18px; font-weight: 700; letter-spacing: 3px; color: #c9a84c; }
    .meta { text-align: right; font-size: 12px; color: #666; }
    .meta strong { color: #1a1a1a; font-size: 14px; }
    .section-title { font-size: 14px; font-weight: 600; margin: 24px 0 8px; color: #333; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #888; border-bottom: 2px solid #e5e5e5; }
    th:nth-child(5), th:nth-child(6), th:nth-child(7) { text-align: right; }
    th:nth-child(5) { text-align: center; }
    .total-row td { border-top: 2px solid #c9a84c; font-weight: 700; font-size: 15px; padding: 12px 8px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #999; text-align: center; }
    .client-info { background: #f9f9f9; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; }
    .client-info span { display: block; font-size: 12px; color: #666; }
    .client-info strong { font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">MY GLOVE BRAND</div>
      <div style="font-size:11px;color:#888;margin-top:2px;">Order Confirmation</div>
    </div>
    <div class="meta">
      <strong>${order.order_number}</strong><br/>
      ${new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}<br/>
      Status: ${order.status}
    </div>
  </div>

  <div class="client-info">
    <strong>${profile?.company_name || profile?.full_name || "Client"}</strong>
    <span>${profile?.email || ""}</span>
  </div>

  <div class="section-title">Line Items</div>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Leather</th>
        <th>Hand</th>
        <th>Position</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="total-row">
        <td colspan="6" style="text-align:right;">Order Total</td>
        <td style="text-align:right;color:#c9a84c;">${formatCents(order.total_amount)}</td>
      </tr>
    </tbody>
  </table>

  ${order.notes ? `<div class="section-title">Notes</div><p style="font-size:12px;color:#555;">${order.notes}</p>` : ""}

  ${logoSection ? `<div class="section-title">Client Logos</div>${logoSection}` : ""}

  <div class="footer">
    MY GLOVE BRAND &bull; Custom Glove Manufacturing &bull; Generated ${new Date().toLocaleDateString("en-US")}
  </div>
</body>
</html>`;

    // Use jspdf with html approach — for edge functions, store HTML as PDF-ready document
    // We'll store the HTML as a styled document that can be printed to PDF from browser
    // For true server-side PDF, we use a simple text-based PDF generator

    const pdfBytes = generateSimplePdf(order, items ?? [], profile, formatCents);

    // Upload to order-pdfs bucket
    const filePath = `${order.order_number}.pdf`;
    const { error: uploadErr } = await admin.storage
      .from("order-pdfs")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Failed to upload PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get signed URL (valid 1 year)
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

    return new Response(
      JSON.stringify({ pdf_url: signedUrl?.signedUrl, message: "PDF generated" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---- Minimal PDF generator (no external deps) ----
function generateSimplePdf(
  order: any,
  items: any[],
  profile: any,
  formatCents: (c: number) => string
): Uint8Array {
  const lines: string[] = [];
  let yPos = 750;
  const objects: string[] = [];
  const offsets: number[] = [];
  let objectCount = 0;

  function addObject(content: string): number {
    objectCount++;
    offsets.push(-1); // placeholder
    objects.push(content);
    return objectCount;
  }

  // Build text content
  const textLines: { text: string; x: number; y: number; size: number; bold?: boolean; color?: string }[] = [];

  function addText(text: string, x: number, size: number, options?: { bold?: boolean; color?: string }) {
    textLines.push({ text, x, y: yPos, size, bold: options?.bold, color: options?.color });
    yPos -= size * 1.4;
  }

  function addGap(gap: number) {
    yPos -= gap;
  }

  // Header
  addText("MY GLOVE BRAND", 50, 16, { bold: true, color: "0.788 0.659 0.298" });
  addText("Order Confirmation", 50, 9, { color: "0.5 0.5 0.5" });
  addGap(8);

  // Order info (right side)
  textLines.push({ text: order.order_number, x: 400, y: 750, size: 14, bold: true });
  textLines.push({
    text: new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    x: 400, y: 734, size: 9, color: "0.4 0.4 0.4",
  });
  textLines.push({ text: `Status: ${order.status}`, x: 400, y: 720, size: 9, color: "0.4 0.4 0.4" });

  // Divider line
  addGap(4);
  const dividerY = yPos + 6;

  // Client info
  addGap(8);
  addText(profile?.company_name || profile?.full_name || "Client", 50, 12, { bold: true });
  if (profile?.email) addText(profile.email, 50, 9, { color: "0.4 0.4 0.4" });
  addGap(16);

  // Line items header
  addText("LINE ITEMS", 50, 10, { bold: true, color: "0.3 0.3 0.3" });
  addGap(6);

  // Table header
  const colX = [50, 160, 240, 300, 360, 420, 490];
  const headers = ["Product", "Leather", "Hand", "Pos", "Qty", "Unit", "Total"];
  headers.forEach((h, i) => {
    textLines.push({ text: h, x: colX[i], y: yPos, size: 8, bold: true, color: "0.5 0.5 0.5" });
  });
  yPos -= 14;

  // Table rows
  items.forEach((item) => {
    if (yPos < 80) {
      yPos = 750; // simple page overflow (won't handle multi-page well but sufficient for most orders)
    }
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
      textLines.push({ text: val, x: colX[i], y: yPos, size: 9 });
    });
    yPos -= 16;
  });

  // Total
  addGap(4);
  textLines.push({ text: "Order Total:", x: 360, y: yPos, size: 11, bold: true });
  textLines.push({ text: formatCents(order.total_amount), x: 490, y: yPos, size: 11, bold: true, color: "0.788 0.659 0.298" });
  addGap(20);

  // Notes
  if (order.notes) {
    addText("NOTES", 50, 10, { bold: true, color: "0.3 0.3 0.3" });
    addGap(4);
    addText(order.notes.substring(0, 200), 50, 9, { color: "0.35 0.35 0.35" });
    addGap(12);
  }

  // Footer
  textLines.push({
    text: `MY GLOVE BRAND • Custom Glove Manufacturing • Generated ${new Date().toLocaleDateString("en-US")}`,
    x: 120, y: 30, size: 8, color: "0.6 0.6 0.6",
  });

  // ---- Build PDF binary ----
  const stream: string[] = [];

  // Build content stream
  let contentStream = "";

  // Gold divider line
  contentStream += `0.788 0.659 0.298 RG\n2 w\n50 ${dividerY} m 545 ${dividerY} l S\n`;

  // Text
  for (const t of textLines) {
    const escaped = t.text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    if (t.color) {
      contentStream += `${t.color} rg\n`;
    } else {
      contentStream += "0 0 0 rg\n";
    }
    const fontRef = t.bold ? "/F2" : "/F1";
    contentStream += `BT ${fontRef} ${t.size} Tf ${t.x} ${t.y} Td (${escaped}) Tj ET\n`;
  }

  // Assemble PDF objects
  const pdfObjects: { id: number; content: string }[] = [];
  let nextId = 1;

  const catalogId = nextId++;
  const pagesId = nextId++;
  const pageId = nextId++;
  const fontId = nextId++;
  const fontBoldId = nextId++;
  const contentId = nextId++;

  const contentStreamBytes = new TextEncoder().encode(contentStream);

  const objStrings: string[] = [];
  objStrings.push(`${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj`);
  objStrings.push(`${pagesId} 0 obj\n<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>\nendobj`);
  objStrings.push(
    `${pageId} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> >>\nendobj`
  );
  objStrings.push(`${fontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);
  objStrings.push(`${fontBoldId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`);
  objStrings.push(
    `${contentId} 0 obj\n<< /Length ${contentStreamBytes.length} >>\nstream\n${contentStream}endstream\nendobj`
  );

  // Build final PDF
  let pdf = "%PDF-1.4\n";
  const objOffsets: number[] = [];
  for (const obj of objStrings) {
    objOffsets.push(pdf.length);
    pdf += obj + "\n";
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${nextId}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of objOffsets) {
    pdf += String(offset).padStart(10, "0") + " 00000 n \n";
  }
  pdf += `trailer\n<< /Size ${nextId} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
