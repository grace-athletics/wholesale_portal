/**
 * VU Customizer integration
 * Per VU documentation: customizer.initializeCustomizer(variantID)
 */

/**
 * Check if the VU customizer is available
 */
export function isCustomizerAvailable(): boolean {
  return typeof (window as any).customizer !== "undefined" && typeof (window as any).customizer.initializeCustomizer === "function";
}

/**
 * Initialize customizer with a variant ID
 * This is a wrapper around the VU API: customizer.initializeCustomizer(variantID)
 */
export function initCustomizer(variantID: number): void {
  if (!isCustomizerAvailable()) {
    console.error("[VU] Customizer not available");
    return;
  }
  console.log("[VU] Initializing customizer with variantID:", variantID);
  (window as any).customizer.initializeCustomizer(variantID);
}

/**
 * Change variant (only use if users can switch between variants on the same page)
 * Per VU docs: customizer.changeVariant(variantID, preCallback, postCallback)
 */
export function changeVariant(variantID: number, preCallback?: () => void, postCallback?: () => void): void {
  if (typeof (window as any).customizer?.changeVariant !== "function") {
    console.error("[VU] changeVariant not available");
    return;
  }
  console.log("[VU] Changing variant to:", variantID);
  (window as any).customizer.changeVariant(variantID, preCallback, postCallback);
}

// Extend window type to include customizer
declare global {
  interface Window {
    customizer?: {
      initializeCustomizer: (variantID: number) => void;
      changeVariant: (variantID: number, preCallback?: () => void, postCallback?: () => void) => void;
      addToCart?: () => void;
    };
  }
}
