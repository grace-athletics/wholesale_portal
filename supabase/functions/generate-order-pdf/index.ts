// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[PDF] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
};

// Colors
const DARK       = rgb(0.05, 0.05, 0.05);
const GRAY       = rgb(0.45, 0.45, 0.45);
const LIGHT_GRAY = rgb(0.75, 0.75, 0.75);
const LINE_COLOR = rgb(0.88, 0.88, 0.88);
const GOLD       = rgb(0.72, 0.55, 0.18);
const WHITE      = rgb(1,    1,    1   );
const HEADER_BG  = rgb(0.08, 0.08, 0.08);
const LINK_BLUE  = rgb(0.18, 0.35, 0.72);

const formatCents = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

async function fetchImage(pdfDoc: any, url: string): Promise<any> {
  try {
    log("fetchImage", { url: url.substring(0, 100) });
    const res = await fetch(url);
    if (!res.ok) {
      log("fetchImage failed", { status: res.status, statusText: res.statusText });
      return null;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const ct = res.headers.get("content-type") || "";
    log("fetchImage ok", { ct, bytes: bytes.length });
    // Detect PNG by content-type OR by URL extension
    const isPng = ct.includes("png") || url.toLowerCase().split("?")[0].endsWith(".png");
    if (isPng) return await pdfDoc.embedPng(bytes);
    return await pdfDoc.embedJpg(bytes);
  } catch (e) {
    log("fetchImage error", { error: String(e) });
    return null;
  }
}

// Convert a Supabase public storage URL to a resized thumbnail URL
function thumbUrl(url: string, width = 400): string {
  return url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + `?width=${width}&quality=65`;
}

// Extract recipe_id param from a builder URL
function extractRecipeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const rid = new URL(url).searchParams.get("recipe_id");
    if (rid) return rid;
  } catch { /* fall through */ }
  const m = url.match(/recipe_id=([^&\s]+)/);
  return m ? m[1] : null;
}

// Fetch full glove recipe from VuCustom API (public, no auth needed)
async function fetchRecipeData(recipeId: string | null): Promise<any> {
  if (!recipeId) return null;
  try {
    const res = await fetch(`https://os.vucustom.com/api/recipes/${recipeId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    log("fetchRecipeData error", { recipeId, error: String(e) });
    return null;
  }
}

// Pull color/style name from recipe — API wraps everything in response.data.body
function colorVal(recipe: any, field: string): string | null {
  return recipe?.data?.body?.[field]?.value?.name ?? null;
}

async function getImage(pdfDoc: any, admin: any, rawUrl: string | null | undefined, bucket: string, isPrivate = false): Promise<any> {
  if (!rawUrl) return null;
  const marker = `/${bucket}/`;
  const i = rawUrl.indexOf(marker);

  if (isPrivate && i !== -1) {
    // Private bucket: use signed URL with transform option to get a small version
    const path = rawUrl.slice(i + marker.length).split("?")[0];
    const { data } = await admin.storage.from(bucket).createSignedUrl(path, 600, {
      transform: { width: 400, quality: 65 },
    });
    if (data?.signedUrl) return fetchImage(pdfDoc, data.signedUrl);
    // Fallback: try without transform
    const { data: plain } = await admin.storage.from(bucket).createSignedUrl(path, 600);
    if (plain?.signedUrl) return fetchImage(pdfDoc, plain.signedUrl);
    return null;
  }

  // Public bucket: use Supabase image transformation endpoint
  return fetchImage(pdfDoc, thumbUrl(rawUrl));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await createClient(supabaseUrl, anonKey).auth.getUser(token);
    if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (!roleData) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { order_id } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    log("Fetching data", { order_id });

    const { data: order, error: orderErr } = await admin.from("orders").select("*").eq("id", order_id).single();
    if (orderErr || !order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const [{ data: items }, { data: profile }, { data: logos }, { data: orderImages }] = await Promise.all([
      admin.from("order_items").select("*").eq("order_id", order_id),
      admin.from("profiles").select("*").eq("id", order.user_id).single(),
      admin.from("client_logos").select("*").eq("user_id", order.user_id).order("version", { ascending: false }).limit(1),
      admin.from("order_images").select("*").eq("order_id", order_id).order("angle", { ascending: true }),
    ]);

    log("Data ready", { items: items?.length ?? 0, logos: logos?.length ?? 0, shots: orderImages?.length ?? 0 });

    // ---- Build PDF ----
    const pdfDoc  = await PDFDocument.create();
    const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const W = 612, H = 792, M = 36, CW = W - M * 2;

    // Pre-fetch logos
    const logoSrc = logos && logos.length > 0 ? logos[0] : null;
    const logoImages: { label: string; img: any }[] = [];
    if (logoSrc) {
      for (const e of [
        { url: logoSrc.palm_logo_url,  label: "Palm Stamp"  },
        { url: logoSrc.thumb_logo_url, label: "Thumb Logo"  },
        { url: logoSrc.wrist_logo_url, label: "Wrist Logo"  },
      ]) {
        logoImages.push({ label: e.label, img: await getImage(pdfDoc, admin, e.url, "client-logos", true) });
      }
    }

    // Pre-fetch uploaded screenshot (fallback)
    const shots: { angle: number; img: any }[] = [];
    for (const oi of orderImages ?? []) {
      shots.push({ angle: oi.angle, img: await fetchImage(pdfDoc, oi.image_url) });
    }

    const clientName  = profile?.company_name || profile?.full_name || "Client";
    const clientEmail = profile?.email || "";
    const dateStr     = new Date(order.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const allItems: any[] = items ?? [];

    // Pre-fetch VuCustom recipe DATA only (JSON, cheap) — no images from VuCustom (1.2MB each = CPU timeout)
    // The customer-uploaded composite screenshot already has all 4 angles stitched together.
    const recipeDataCache: Record<string, any> = {};

    for (const item of allItems) {
      try {
        const rId = extractRecipeId(item.builder_recipe_url);
        if (rId && !(rId in recipeDataCache)) {
          recipeDataCache[rId] = await fetchRecipeData(rId);
          log("Cached recipe", { rId, found: !!recipeDataCache[rId] });
        }
      } catch (e) {
        log("Recipe pre-fetch error (non-fatal)", { error: String(e) });
      }
    }

    for (let idx = 0; idx < allItems.length; idx++) {
      const item = allItems[idx];
      const page = pdfDoc.addPage([W, H]);

      const dt = (text: string, x: number, y: number, f: any, s: number, c: any, maxW?: number) => {
        if (y < 0 || y > H) return;
        page.drawText(String(text ?? ""), { x, y, size: s, font: f, color: c, ...(maxW ? { maxWidth: maxW } : {}) });
      };

      // Recipe data + glove image
      const recipeId = extractRecipeId(item.builder_recipe_url);
      const recipe   = recipeId ? recipeDataCache[recipeId] ?? null : null;
      const gloveImg = shots[0]?.img ?? null;
      const body     = recipe?.data?.body ?? {};
      // cv() returns the VuCustom field value or "—" when not set
      const cv = (field: string): string => body?.[field]?.value?.name ?? "—";

      // ── HEADER ──
      const HEADER_H = 68;
      page.drawRectangle({ x: 0, y: H - HEADER_H, width: W, height: HEADER_H, color: HEADER_BG });
      page.drawRectangle({ x: 0, y: H - HEADER_H - 2, width: W, height: 2, color: GOLD });
      dt("MY GLOVE BRAND", M, H - 26, fontBold, 15, WHITE);
      const numW = fontBold.widthOfTextAtSize(order.order_number, 18);
      dt(order.order_number, W - M - numW, H - 28, fontBold, 18, GOLD);
      dt(clientName, M, H - 46, font, 9, LIGHT_GRAY);
      if (clientEmail) dt(clientEmail, M, H - 58, font, 8, LIGHT_GRAY);
      const dlbl = `Ordered: ${dateStr}`;
      dt(dlbl, W - M - font.widthOfTextAtSize(dlbl, 8), H - 46, font, 8, LIGHT_GRAY);

      // ── LOGO STRIP ──
      const LOGO_H = 84;
      const LOGO_TOP = H - HEADER_H - 2;
      const LOGO_BOT = LOGO_TOP - LOGO_H;
      page.drawRectangle({ x: M, y: LOGO_BOT, width: CW, height: LOGO_H, color: rgb(0.97, 0.97, 0.97), borderColor: LINE_COLOR, borderWidth: 0.5 });
      const validLogos = logoImages.filter(l => l.img);
      if (validLogos.length > 0) {
        const slotW = Math.floor(CW / validLogos.length);
        for (let li = 0; li < validLogos.length; li++) {
          const logo = validLogos[li];
          const slotX = M + li * slotW;
          if (li > 0) page.drawLine({ start: { x: slotX, y: LOGO_BOT }, end: { x: slotX, y: LOGO_TOP }, thickness: 0.5, color: LINE_COLOR });
          const labelW = font.widthOfTextAtSize(logo.label, 7);
          dt(logo.label, slotX + (slotW - labelW) / 2, LOGO_BOT + 6, font, 7, GRAY);
          const maxImgW = slotW - 16, maxImgH = LOGO_H - 22;
          const sc = Math.min(maxImgW / logo.img.width, maxImgH / logo.img.height, 1);
          const lw = logo.img.width * sc, lh = logo.img.height * sc;
          page.drawImage(logo.img, { x: slotX + (slotW - lw) / 2, y: LOGO_BOT + 16 + (maxImgH - lh) / 2, width: lw, height: lh });
        }
      } else {
        const noLogo = "No logos on file";
        dt(noLogo, M + (CW - font.widthOfTextAtSize(noLogo, 8)) / 2, LOGO_BOT + LOGO_H / 2 - 4, font, 8, LIGHT_GRAY);
      }

      // ── LAYOUT ──
      // Page splits into two vertical sections:
      //   TOP  (~40%): order info (left) + glove composite screenshot (right)
      //   SPEC (~60%): full-width 3-column build specification table
      const CONTENT_TOP = LOGO_BOT - 8;
      const CONTENT_BOT = M + 28;
      const CONTENT_H   = CONTENT_TOP - CONTENT_BOT;
      const TOP_H       = Math.floor(CONTENT_H * 0.40);
      const TOP_BOT     = CONTENT_TOP - TOP_H;
      const SPEC_TOP    = TOP_BOT - 6;   // 6px gap between sections
      const SPEC_BOT    = CONTENT_BOT;
      const SPEC_H      = SPEC_TOP - SPEC_BOT;

      // ── TOP SECTION: full-width glove composite screenshot ──
      const PAD = 10;
      page.drawRectangle({ x: M, y: TOP_BOT, width: CW, height: TOP_H, color: rgb(0.96, 0.96, 0.96), borderColor: LINE_COLOR, borderWidth: 0.75 });

      // Small item label in the top-left corner of the image area
      const itemNumStr = `Item ${idx + 1} of ${allItems.length}`;
      dt(itemNumStr, M + PAD, CONTENT_TOP - 13, fontBold, 9, DARK);
      if (item.product_name) {
        const itemNumW = fontBold.widthOfTextAtSize(itemNumStr, 9);
        dt(`— ${item.product_name}`, M + PAD + itemNumW + 4, CONTENT_TOP - 13, font, 9, GRAY, CW - PAD * 2 - itemNumW - 4);
      }

      if (gloveImg) {
        const maxW = CW - 16, maxH = TOP_H - 28;
        const sc = Math.min(maxW / gloveImg.width, maxH / gloveImg.height);
        const iw = gloveImg.width * sc, ih = gloveImg.height * sc;
        page.drawImage(gloveImg, { x: M + (CW - iw) / 2, y: TOP_BOT + 8, width: iw, height: ih });
      } else {
        const ph = "No screenshot uploaded";
        dt(ph, M + (CW - font.widthOfTextAtSize(ph, 8)) / 2, TOP_BOT + TOP_H / 2, font, 8, LIGHT_GRAY);
      }

      // ── SPEC TABLE: full-width 3-column build specification grid ──
      // Pulls all 30+ fields from VuCustom recipe JSON (recipe.data.body.<field>.value.name)
      page.drawRectangle({ x: M, y: SPEC_BOT, width: CW, height: SPEC_H, color: rgb(0.98, 0.98, 0.98), borderColor: LINE_COLOR, borderWidth: 0.75 });

      // Title bar
      const SPEC_TITLE_H = 16;
      const specTitleY   = SPEC_TOP - SPEC_TITLE_H;
      page.drawRectangle({ x: M, y: specTitleY, width: CW, height: SPEC_TITLE_H, color: HEADER_BG });
      dt("GLOVE BUILD SPECIFICATIONS", M + PAD, specTitleY + 5, fontBold, 8, WHITE);
      if (recipeId) {
        const tok = `Recipe ID: ${recipeId}`;
        dt(tok, W - M - font.widthOfTextAtSize(tok, 7) - PAD, specTitleY + 6, font, 7, LIGHT_GRAY);
      }

      // Three equal columns
      const COL_W   = Math.floor(CW / 3);
      const COL_PAD = 8;
      const ROW_H   = 11;
      const col0X   = M;
      const col1X   = M + COL_W;
      const col2X   = M + COL_W * 2;

      // Extend dividers behind the title bar (title bar rect drawn on top hides them)
      page.drawLine({ start: { x: col1X, y: SPEC_BOT }, end: { x: col1X, y: SPEC_TOP }, thickness: 0.5, color: LINE_COLOR });
      page.drawLine({ start: { x: col2X, y: SPEC_BOT }, end: { x: col2X, y: SPEC_TOP }, thickness: 0.5, color: LINE_COLOR });

      // Draw a column section header with a gray band
      const drawColHdr = (colX: number, y: number, title: string): number => {
        page.drawRectangle({ x: colX + 1, y: y - 2, width: COL_W - 2, height: ROW_H + 1, color: rgb(0.84, 0.84, 0.84) });
        dt(title, colX + COL_PAD, y, fontBold, 7.5, DARK);
        return y - (ROW_H + 3);
      };

      // Draw one label:value row with alternating background
      const drawRow = (colX: number, y: number, label: string, value: string, rowIdx: number): number => {
        if (y < SPEC_BOT + 4) return y;
        if (rowIdx % 2 === 1) {
          page.drawRectangle({ x: colX + 1, y: y - 2, width: COL_W - 2, height: ROW_H, color: rgb(0.93, 0.93, 0.93) });
        }
        const lbW = fontBold.widthOfTextAtSize(label, 7);
        dt(label, colX + COL_PAD, y, fontBold, 7, GRAY);
        dt(value, colX + COL_PAD + lbW + 2, y, font, 7, DARK, COL_W - COL_PAD * 2 - lbW - 2);
        return y - ROW_H;
      };

      // Push firstRowY down so column header bands clear the title bar
      // Band top = firstRowY + (ROW_H - 1); must be ≤ specTitleY → firstRowY ≤ specTitleY - ROW_H
      const firstRowY = specTitleY - (ROW_H + 4);

      // Column 0 — CONSTRUCTION
      let c0Y = drawColHdr(col0X, firstRowY, "CONSTRUCTION");
      const constructionSpecs: [string, string][] = [
        ["Web Style:",     cv("web_style")],
        ["Leather:",       cv("leather_type")],
        ["Throwing Hand:", cv("throwing_hand")],
        ["Player Age:",    cv("player_age")],
        ["Sport:",         cv("what_sport_do_you_play")],
        ["Add Flag:",      cv("add_flag")],
        ["Flag Style:",    cv("flags")],
        ["Flag Location:", cv("flag_location")],
        ["Finger Pad:",    cv("add_a_finger_pad_or_finger_hood")],
        ["Thumb Name:",    cv("add_thumb_name")],
      ];
      for (let ri = 0; ri < constructionSpecs.length; ri++) {
        c0Y = drawRow(col0X, c0Y, constructionSpecs[ri][0], constructionSpecs[ri][1], ri);
      }

      // Column 1 — COLORS
      let c1Y = drawColHdr(col1X, firstRowY, "COLORS");
      const colorSpecs: [string, string][] = [
        ["Lining:",     cv("lining")],
        ["Palm:",       cv("palm")],
        ["Wrist:",      cv("wrist")],
        ["Laces:",      cv("laces")],
        ["Bindings:",   cv("bindings")],
        ["Welting:",    cv("welting")],
        ["Stitching:",  cv("stitching")],
        ["Web:",        cv("web")],
        ["Finger Pad:", cv("fingerpad_fingerhood")],
      ];
      for (let ri = 0; ri < colorSpecs.length; ri++) {
        c1Y = drawRow(col1X, c1Y, colorSpecs[ri][0], colorSpecs[ri][1], ri);
      }

      // Column 2 — FINGER COLORS
      let c2Y = drawColHdr(col2X, firstRowY, "FINGER COLORS");
      const fingerSpecs: [string, string][] = [
        ["Pinky 1st:",    cv("pinky_1")],
        ["Pinky 2nd:",    cv("pinky_2")],
        ["Pinky 3rd:",    cv("pinky_3")],
        ["Ring 1st:",     cv("ring_1")],
        ["Ring 2nd:",     cv("ring_2")],
        ["Middle 1st:",   cv("middle_1")],
        ["Middle 2nd:",   cv("middle_2")],
        ["Middle 3rd:",   cv("middle_3")],
        ["Index:",        cv("index")],
        ["Finger Shell:", cv("finger_shell")],
        ["Thumb 1st:",    cv("thumb_1")],
        ["Thumb 2nd:",    cv("thumb_2")],
      ];
      for (let ri = 0; ri < fingerSpecs.length; ri++) {
        c2Y = drawRow(col2X, c2Y, fingerSpecs[ri][0], fingerSpecs[ri][1], ri);
      }

      // ── FOOTER ──
      page.drawLine({ start: { x: M, y: M + 20 }, end: { x: W - M, y: M + 20 }, thickness: 0.5, color: LINE_COLOR });
      dt(`${clientName}  ·  ${order.order_number}  ·  ${dateStr}`, M, M + 7, font, 7, LIGHT_GRAY);
      const pg = `Page ${idx + 1} of ${allItems.length}`;
      dt(pg, W - M - font.widthOfTextAtSize(pg, 7), M + 7, font, 7, LIGHT_GRAY);
    }

    // Safety: at least one page
    if (allItems.length === 0) pdfDoc.addPage([W, H]);

    const pdfBytes = await pdfDoc.save();
    log("PDF bytes", { size: pdfBytes.length, pages: allItems.length });

    // Upload
    const filePath = `${order.order_number}.pdf`;
    const { error: upErr } = await admin.storage.from("order-pdfs").upload(filePath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) {
      log("Upload error", { error: upErr.message });
      return new Response(JSON.stringify({ error: `Upload failed: ${upErr.message}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: signed } = await admin.storage.from("order-pdfs").createSignedUrl(filePath, 60 * 60 * 24 * 365);
    await admin.from("orders").update({ pdf_url: signed?.signedUrl ?? null, pdf_generated_at: new Date().toISOString() }).eq("id", order_id);

    log("Done");
    return new Response(JSON.stringify({ pdf_url: signed?.signedUrl, message: "PDF generated" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    log("ERROR", { message: String(err) });
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
