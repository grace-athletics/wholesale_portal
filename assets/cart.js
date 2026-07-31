class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      
      // Check if this is a parent item
      if (this.dataset.isParent === 'true' && this.dataset.parentKey) {
        cartItems.updateQuantity(this.dataset.index, 0, event, null, null, this.dataset.parentKey);
      } else {
        cartItems.updateQuantity(this.dataset.index, 0, event);
      }
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') || document.getElementById('CartDrawer-LineItemStatus');

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener('change', debouncedOnChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') {
        return;
      }
      return this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    input.value = input.getAttribute('value');
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  validateQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;
    let message = '';

    if (inputValue < event.target.dataset.min) {
      message = window.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min);
    } else if (inputValue > parseInt(event.target.max)) {
      message = window.quickOrderListStrings.max_error.replace('[max]', event.target.max);
    } else if (inputValue % parseInt(event.target.step) !== 0) {
      message = window.quickOrderListStrings.step_error.replace('[step]', event.target.step);
    }

    if (message) {
      this.setValidity(event, index, message);
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.updateQuantity(
        index,
        inputValue,
        event,
        document.activeElement.getAttribute('name'),
        event.target.dataset.quantityVariantId
      );
    }
  }

  onChange(event) {
    this.validateQuantity(event);
  }

  onCartUpdate() {
    if (this.tagName === 'CART-DRAWER-ITEMS') {
      return fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const selectors = ['cart-drawer-items', '.cart-drawer__footer'];
          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if (targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      return fetch(`${routes.cart_url}?section_id=main-cart-items`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      },
    ];
  }

  updateQuantity(line, quantity, event, name, variantId, parentKey) {
    this.enableLoading(line);

    // If removing a parent, find and remove all children first
    if (quantity === 0 && parentKey) {
      return this.removeParentAndChildren(line, parentKey, event);
    }

    this.performQuantityUpdate(line, quantity, event, name, variantId);
  }

  performQuantityUpdate(line, quantity, event, name, variantId) {
    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });
    const eventTarget = event.currentTarget instanceof CartRemoveButton ? 'clear' : 'change';

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);

        CartPerformance.measure(`${eventTarget}:paint-updated-sections"`, () => {
          const quantityElement =
            document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
          const items = document.querySelectorAll('.cart-item');

          if (parsedState.errors) {
            quantityElement.value = quantityElement.getAttribute('value');
            this.updateLiveRegions(line, parsedState.errors);
            return;
          }

          this.classList.toggle('is-empty', parsedState.item_count === 0);
          const cartDrawerWrapper = document.querySelector('cart-drawer');
          const cartFooter = document.getElementById('main-cart-footer');

          if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
          if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

          this.getSectionsToRender().forEach((section) => {
            const elementToReplace =
              document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              section.selector
            );
          });
          const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
          let message = '';
          if (items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
            if (typeof updatedValue === 'undefined') {
              message = window.cartStrings.error;
            } else {
              message = window.cartStrings.quantityError.replace('[quantity]', updatedValue);
            }
          }
          this.updateLiveRegions(line, message);

          const lineItem =
            document.getElementById(`CartItem-${line}`) || document.getElementById(`CartDrawer-Item-${line}`);
          if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
            cartDrawerWrapper
              ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
              : lineItem.querySelector(`[name="${name}"]`).focus();
          } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
            trapFocus(cartDrawerWrapper.querySelector('.drawer__inner-empty'), cartDrawerWrapper.querySelector('a'));
          } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
            trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
          }
        });

        CartPerformance.measureFromEvent(`${eventTarget}:user-action`, event);

        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState, variantId: variantId });
      })
      .catch(() => {
        this.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.add('hidden'));
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        this.disableLoading(line);
      });
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError) lineItemError.querySelector('.cart-item__error-text').textContent = message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
  }

  getPropertyValue(item, propertyName) {
    if (!item.properties) {
      return null;
    }
    
    // Handle object properties (most common in Shopify cart JSON)
    if (typeof item.properties === 'object' && !Array.isArray(item.properties)) {
      // Try direct access first
      if (item.properties[propertyName] !== undefined) {
        return item.properties[propertyName];
      }
      // Try with different casing
      const lowerKey = propertyName.toLowerCase();
      for (const key in item.properties) {
        if (key.toLowerCase() === lowerKey) {
          return item.properties[key];
        }
      }
      return null;
    }
    
    // Handle array properties (Liquid format: array of objects with 'name'/'value' or 'first'/'last')
    if (Array.isArray(item.properties)) {
      for (const prop of item.properties) {
        if (prop.name === propertyName || prop.first === propertyName) {
          return prop.value || prop.last || null;
        }
      }
    }
    
    return null;
  }

  async removeParentAndChildren(parentLine, parentKey, event) {
    // First, get current cart data to find child items and parent
    try {
      const cartResponse = await fetch(`${routes.cart_url}.json`);
      const cartData = await cartResponse.json();
      
      // Build updates object with all items to remove (parent + children)
      const updates = {};
      
      // Find parent and all child items
      cartData.items.forEach((item, index) => {
        const lineNumber = index + 1; // Shopify uses 1-based indexing
        
        const associationKey = this.getPropertyValue(item, '_AssociationKey');
        const parentKeyValue = this.getPropertyValue(item, '_ParentKey');
        
        // Check if this is the parent item (has _AssociationKey matching parentKey)
        if (associationKey && String(associationKey).trim() === String(parentKey).trim()) {
          updates[lineNumber.toString()] = 0;
        }
        // Check if this is a child item (has _ParentKey matching parentKey)
        if (parentKeyValue && String(parentKeyValue).trim() === String(parentKey).trim()) {
          updates[lineNumber.toString()] = 0;
        }
      });
      
      // If no items found, fallback to removing just the parent line
      if (Object.keys(updates).length === 0) {
        updates[parentLine.toString()] = 0;
      }
      
      // Remove items sequentially (highest line number first to avoid renumbering issues)
      // Use cart_change_url (same as regular remove button) instead of cart_update_url
      const linesToRemove = Object.keys(updates).map(Number).sort((a, b) => b - a);
      
      let lastResponse = null;
      const sectionsToRender = this.getSectionsToRender().map((section) => section.section);
      
      for (let i = 0; i < linesToRemove.length; i++) {
        const lineNum = linesToRemove[i];
        // Use the same format as performQuantityUpdate - cart_change_url with line and quantity
        const body = JSON.stringify({
          line: lineNum,
          quantity: 0,
          sections: sectionsToRender,
          sections_url: window.location.pathname,
        });
        
        const response = await fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } });
        
        if (!response.ok) {
          // Continue with next item even if one fails
          continue;
        }
        
        const responseText = await response.text();
        lastResponse = JSON.parse(responseText);
        
        // Small delay between removals to ensure each completes
        if (i < linesToRemove.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (!lastResponse) {
        throw new Error('Failed to remove any items');
      }
      
      const parsedState = lastResponse;
      
      // Verify items were actually removed
      if (parsedState.errors) {
        // Don't throw, continue to verify
      }
      
      // Update the cart display with the final response
      this.classList.toggle('is-empty', parsedState.item_count === 0);
      const cartDrawerWrapper = document.querySelector('cart-drawer');
      const cartFooter = document.getElementById('main-cart-footer');
      
      if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
      if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);
      
      // Update sections if available in the response
      if (parsedState.sections) {
        this.getSectionsToRender().forEach((section) => {
          const elementToReplace =
            document.getElementById(section.id)?.querySelector(section.selector) || document.getElementById(section.id);
          if (elementToReplace && parsedState.sections[section.section]) {
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              section.selector
            );
          }
        });
      } else {
        // If sections not in response, fetch them separately
        const sectionsPromises = this.getSectionsToRender().map(async (section) => {
          try {
            const sectionResponse = await fetch(`${routes.cart_url}?section_id=${section.section}`);
            const sectionHtml = await sectionResponse.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(sectionHtml, 'text/html');
            const sourceElement = doc.querySelector(section.selector);
            const elementToReplace =
              document.getElementById(section.id)?.querySelector(section.selector) || document.getElementById(section.id);
            if (sourceElement && elementToReplace) {
              elementToReplace.innerHTML = sourceElement.innerHTML;
            }
          } catch (error) {
            // Silently continue if section fetch fails
          }
        });
        await Promise.all(sectionsPromises);
      }
      
      // Verify removal and retry if needed
      const verifyResponse = await fetch(`${routes.cart_url}.json`);
      const verifyCartData = await verifyResponse.json();
      
      // Check if any items with matching keys still exist
      const remainingItems = verifyCartData.items.filter((item) => {
        const associationKey = this.getPropertyValue(item, '_AssociationKey');
        const parentKeyValue = this.getPropertyValue(item, '_ParentKey');
        
        const isParent = associationKey && String(associationKey).trim() === String(parentKey).trim();
        const isChild = parentKeyValue && String(parentKeyValue).trim() === String(parentKey).trim();
        
        return isParent || isChild;
      });
      
      if (remainingItems.length > 0) {
        // Retry removal for remaining items - try sequential removal
        const linesToRemove = [];
        verifyCartData.items.forEach((item, index) => {
          const lineNumber = index + 1;
          
          const associationKey = this.getPropertyValue(item, '_AssociationKey');
          const parentKeyValue = this.getPropertyValue(item, '_ParentKey');
          
          if ((associationKey && String(associationKey).trim() === String(parentKey).trim()) ||
              (parentKeyValue && String(parentKeyValue).trim() === String(parentKey).trim())) {
            linesToRemove.push(lineNumber);
          }
        });
        
        // Remove items sequentially (highest line number first to avoid renumbering issues)
        linesToRemove.sort((a, b) => b - a);
        
        for (const lineNum of linesToRemove) {
          const retryBody = JSON.stringify({
            line: lineNum,
            quantity: 0,
            sections: this.getSectionsToRender().map((section) => section.section),
            sections_url: window.location.pathname,
          });
          
          const retryResponse = await fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body: retryBody } });
          
          if (!retryResponse.ok) {
            continue;
          }
          
          const retryText = await retryResponse.text();
          const retryState = JSON.parse(retryText);
          
          // Small delay between removals
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Get final cart state after retry
        const finalRetryResponse = await fetch(`${routes.cart_url}.json`);
        const finalRetryCartData = await finalRetryResponse.json();
        
        // Update UI with final state
        this.getSectionsToRender().forEach((section) => {
          const elementToReplace =
            document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
          if (elementToReplace) {
            // Fetch fresh sections
            fetch(`${routes.cart_url}?section_id=${section.section}`)
              .then(response => response.text())
              .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const sourceElement = doc.querySelector(section.selector);
                if (sourceElement && elementToReplace) {
                  elementToReplace.innerHTML = sourceElement.innerHTML;
                }
              });
          }
        });
        
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: finalRetryCartData });
      } else {
        // All items removed successfully, publish update
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: verifyCartData });
      }
      
      this.disableLoading(parentLine);
    } catch (error) {
      this.disableLoading(parentLine);
      // Fallback to just removing parent
      this.performQuantityUpdate(parentLine, 0, event, null, null);
    }
  }
}

customElements.define('cart-items', CartItems);

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          'input',
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
              .then(() => CartPerformance.measureFromEvent('note-update:user-action', event));
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }
    }
  );
}
