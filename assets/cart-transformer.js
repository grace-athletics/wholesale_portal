// Transform cart via Railway API
class CartTransformer {
  constructor() {
    this.transforming = false;
    this.apiUrl = 'https://wholesaleportal-production-76c0.up.railway.app/cart/transform';
    console.log('CartTransformer: initialized');
    this.setupListeners();
  }

  setupListeners() {
    let timer;
    let lastCartState = null;

    // Watch for quantity changes
    document.addEventListener('change', (e) => {
      if (e.target.matches('input[name="quantity"]') || e.target.matches('input[data-quantity]')) {
        console.log('CartTransformer: qty input changed');
        clearTimeout(timer);
        timer = setTimeout(() => this.transform(), 200);
      }
    });

    // Watch for quantity buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-change-quantity]')) {
        console.log('CartTransformer: qty button clicked');
        clearTimeout(timer);
        timer = setTimeout(() => this.transform(), 300);
      }
    });

    // Fallback: Poll for cart changes every 1 second
    const self = this;
    setInterval(async () => {
      try {
        const res = await fetch('/cart.json');
        const cart = await res.json();
        const currentState = JSON.stringify(cart.items.map(i => ({ id: i.id, qty: i.quantity })));

        if (lastCartState && currentState !== lastCartState) {
          console.log('CartTransformer: cart change detected via polling', { old: lastCartState, new: currentState });
          self.transform();
        }
        lastCartState = currentState;
      } catch (e) {
        console.error('CartTransformer: polling error', e);
      }
    }, 1000);
  }

  async transform() {
    if (this.transforming) return;
    this.transforming = true;

    try {
      // Get current cart
      const cartRes = await fetch('/cart.json');
      const cartData = await cartRes.json();
      console.log('CartTransformer: fetched cart, items:', cartData.items.length);

      // Send to Railway for transformation
      console.log('CartTransformer: calling transformation endpoint...');
      const transformRes = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: cartData })
      });

      if (!transformRes.ok) {
        throw new Error(`Transform API error: ${transformRes.status}`);
      }

      const result = await transformRes.json();
      console.log('CartTransformer: transformation successful');

      // Apply updates from transformed cart
      if (result.cart && result.cart.lines) {
        await this.applyUpdates(cartData, result.cart);
      }
    } catch (e) {
      console.error('CartTransformer error:', e);
    } finally {
      this.transforming = false;
    }
  }

  async applyUpdates(originalCart, transformedCart) {
    // Compare quantities and apply changes
    const updates = [];

    console.log('CartTransformer: comparing carts', {
      original: originalCart.items.map(i => ({ title: i.title, qty: i.quantity })),
      transformed: transformedCart.lines.map(i => ({ title: i.title, qty: i.quantity }))
    });

    transformedCart.lines.forEach((transformedLine, idx) => {
      const originalLine = originalCart.items[idx];
      if (originalLine && transformedLine.quantity !== originalLine.quantity) {
        console.log(
          `CartTransformer: qty change needed - line ${idx + 1}: ${originalLine.quantity} → ${transformedLine.quantity}`
        );
        updates.push({
          line: idx + 1,
          qty: transformedLine.quantity
        });
      }
    });

    // Apply each update
    for (const u of updates) {
      console.log(`CartTransformer: updating line ${u.line} to qty ${u.qty}`);
      await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line: u.line,
          quantity: u.qty
        })
      });
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`CartTransformer: applied ${updates.length} updates`);
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new CartTransformer());
} else {
  new CartTransformer();
}
