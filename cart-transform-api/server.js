const express = require('express');
const app = express();

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const PORT = process.env.PORT || 3000;

// Constants
const BASE_PRICE_LOW = 16500; // $165 in cents
const BASE_PRICE_HIGH = 14500; // $145 in cents
const QTY_THRESHOLD = 5;
const UPLIFT_PRICE = 3500; // $35 in cents

/**
 * Shopify Cart Transform Endpoint
 * Receives cart data, syncs uplift quantities, applies volume pricing
 */
app.post('/cart/transform', (req, res) => {
  try {
    const { cart } = req.body;

    if (!cart) {
      return res.status(400).json({ error: 'Invalid cart data' });
    }

    // Handle both Shopify formats: items (storefront) and lines (admin API)
    const items = cart.items || cart.lines;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart has no items' });
    }

    console.log(`[Cart Transform] Processing cart with ${items.length} items`);

    // Process cart
    const transformedCart = transformCart({ ...cart, lines: items });

    res.json({ cart: transformedCart });
  } catch (error) {
    console.error('[Cart Transform] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Transform cart: sync quantities and calculate pricing
 */
function transformCart(cart) {
  const lines = JSON.parse(JSON.stringify(cart.lines)); // Deep copy

  // Step 1: Group items by association key
  const groups = groupByAssociation(lines);

  console.log(`[Transform] Found ${Object.keys(groups).length} recipe groups`);

  // Step 2: Sync uplift quantities to parent quantities
  const updates = syncUpliftQuantities(lines, groups);
  console.log(`[Transform] Syncing ${updates.length} uplift quantities`);

  // Step 3: Calculate volume pricing
  const pricing = calculatePricing(groups);
  console.log('[Transform] Pricing analysis:', pricing);

  // Step 4: Apply discount codes based on pricing
  applyDiscountCodes(lines, pricing);

  // Return transformed cart
  return { ...cart, lines };
}

/**
 * Group lines by _AssociationKey (recipe ID)
 */
function groupByAssociation(lines) {
  const groups = {};

  lines.forEach((line, idx) => {
    const assocKey = line.properties?._AssociationKey;
    if (assocKey) {
      if (!groups[assocKey]) {
        groups[assocKey] = { main: null, uplifts: [] };
      }
      groups[assocKey].main = { ...line, idx };
    }
  });

  // Find uplifts by _ParentKey
  lines.forEach((line, idx) => {
    const parentKey = line.properties?._ParentKey;
    if (parentKey && groups[parentKey]) {
      groups[parentKey].uplifts.push({ ...line, idx });
    }
  });

  return groups;
}

/**
 * Sync uplift quantities to match parent quantities
 */
function syncUpliftQuantities(lines, groups) {
  const updates = [];

  Object.values(groups).forEach(group => {
    if (group.main && group.uplifts.length > 0) {
      const mainQty = group.main.quantity;

      group.uplifts.forEach(uplift => {
        if (uplift.quantity !== mainQty) {
          lines[uplift.idx].quantity = mainQty;
          updates.push({
            product: uplift.title,
            oldQty: uplift.quantity,
            newQty: mainQty
          });
        }
      });
    }
  });

  return updates;
}

/**
 * Calculate pricing tiers per recipe
 */
function calculatePricing(groups) {
  const pricing = {};

  Object.entries(groups).forEach(([key, group]) => {
    if (!group.main) return;

    const qty = group.main.quantity;
    const shouldDiscount = qty >= QTY_THRESHOLD;
    const basePrice = shouldDiscount ? BASE_PRICE_HIGH : BASE_PRICE_LOW;

    pricing[key] = {
      qty,
      shouldDiscount,
      basePrice: basePrice / 100,
      discountPerItem: shouldDiscount ? (BASE_PRICE_LOW - BASE_PRICE_HIGH) / 100 : 0,
      totalBasePrice: (basePrice * qty) / 100,
      numUplifts: group.uplifts.length,
      totalUpliftPrice: (UPLIFT_PRICE * qty * group.uplifts.length) / 100
    };
  });

  return pricing;
}

/**
 * Apply discount codes based on pricing
 * Note: Shopify will validate and apply these codes server-side
 */
function applyDiscountCodes(lines, pricing) {
  const discountsToApply = [];

  Object.values(pricing).forEach(p => {
    if (p.shouldDiscount) {
      discountsToApply.push('WHOLESALE5PLUS');
    }
  });

  // Add discount codes to cart attributes if needed
  // Shopify's cart transform can set attributes but codes are applied via automatic discounts
  console.log('[Transform] Applicable discount codes:', discountsToApply);
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'wholesale-cart-transform' });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`\n🚀 Cart Transform API listening on port ${PORT}`);
  console.log(`📍 Endpoint: POST http://localhost:${PORT}/cart/transform`);
  console.log(`💚 Health check: GET http://localhost:${PORT}/health\n`);
});
