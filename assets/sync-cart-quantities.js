// Sync child item quantities to parent quantities
class ChildSync {
  constructor() {
    this.syncing = false;
    console.log('ChildSync: initialized');
    this.setupListeners();
  }

  setupListeners() {
    let timer;

    // On any quantity change
    document.addEventListener('change', (e) => {
      if (e.target.matches('input[name="quantity"]') || e.target.matches('input[data-quantity]')) {
        console.log('ChildSync: quantity input changed');
        clearTimeout(timer);
        timer = setTimeout(() => this.updateChildren(), 200);
      }
    });

    // On quantity buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-change-quantity]')) {
        console.log('ChildSync: quantity button clicked');
        clearTimeout(timer);
        timer = setTimeout(() => this.updateChildren(), 300);
      }
    });

    // Listen for Shopify's cart:update event
    document.addEventListener('cart:update', () => {
      console.log('ChildSync: cart:update event');
      clearTimeout(timer);
      timer = setTimeout(() => this.updateChildren(), 200);
    });

    // Fallback: poll for changes every 1 second
    setInterval(() => {
      this.updateChildren();
    }, 1000);
  }

  async updateChildren() {
    if (this.syncing) return;
    this.syncing = true;
    console.log('ChildSync: checking for children to update...');

    try {
      const res = await fetch('/cart.json');
      const cart = await res.json();

      // Find all items with _ParentKey (children)
      const updates = [];
      const parents = new Map();

      // First pass: identify all parents by their _AssociationKey
      cart.items.forEach((item, idx) => {
        const assocKey = item.properties?._AssociationKey;
        if (assocKey) {
          parents.set(assocKey, { qty: item.quantity, idx });
        }
      });

      console.log('ChildSync: parents found:', Array.from(parents.entries()));

      // Second pass: find children and queue updates
      cart.items.forEach((item, idx) => {
        const parentKey = item.properties?._ParentKey;
        if (parentKey && parents.has(parentKey)) {
          const parent = parents.get(parentKey);
          const parentQty = parent.qty;
          const childQty = item.quantity;

          console.log(`ChildSync: found child "${item.title}" qty ${childQty}, parent qty ${parentQty}`);

          if (childQty !== parentQty) {
            console.log(`ChildSync: queueing update - line ${idx + 1} from ${childQty} to ${parentQty}`);
            updates.push({ line: idx + 1, qty: parentQty });
          }
        }
      });

      // Apply all updates
      if (updates.length > 0) {
        console.log(`ChildSync: applying ${updates.length} updates`);
        for (const u of updates) {
          console.log(`ChildSync: updating line ${u.line} to qty ${u.qty}`);
          await fetch('/cart/change.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ line: u.line, quantity: u.qty })
          });
          await new Promise(r => setTimeout(r, 100));
        }
      } else {
        console.log('ChildSync: no updates needed');
      }
    } catch (e) {
      console.error('ChildSync error:', e);
    } finally {
      this.syncing = false;
    }
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ChildSync());
} else {
  new ChildSync();
}
