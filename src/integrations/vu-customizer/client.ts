/**
 * VU Customizer integration
 * Handles embedding and communicating with VU's customizer
 */

const VU_STORE_KEY = "750e6130";
const VU_CUSTOMIZER_URL = "https://vu-customizer.s3.amazonaws.com/production/main.js";
const VU_ENVIRONMENT = "production";

export interface CustomizerConfig {
  productId: number;
  productName: string;
  sku: string;
  onRecipeGenerated?: (recipeId: string) => void;
  onClose?: () => void;
}

export interface RecipeData {
  recipeId: string;
  productId: number;
  productName: string;
  sku: string;
  timestamp: number;
}

/**
 * Initialize VU Customizer on the page
 * This loads the customizer script and sets up communication
 */
export async function initializeCustomizer(config: CustomizerConfig): Promise<void> {
  return new Promise((resolve) => {
    // Load the VU Customizer script
    const script = document.createElement("script");
    script.id = "vu-customizer";
    script.src = VU_CUSTOMIZER_URL;
    script.async = true;

    // Set up data attributes for the customizer
    script.setAttribute("data-variant", String(config.productId));
    script.setAttribute("data-store-key", VU_STORE_KEY);
    script.setAttribute("data-environment", VU_ENVIRONMENT);

    // Listen for customizer ready
    script.onload = () => {
      // Set up postMessage listener for recipe generation
      window.addEventListener("message", (event) => {
        if (event.data?.type === "VU_RECIPE_GENERATED") {
          const recipeId = event.data.recipeId;
          if (config.onRecipeGenerated && recipeId) {
            config.onRecipeGenerated(recipeId);
          }
        }

        if (event.data?.type === "VU_CUSTOMIZER_CLOSED") {
          if (config.onClose) {
            config.onClose();
          }
        }
      });

      resolve();
    };

    script.onerror = () => {
      console.error("Failed to load VU Customizer");
      resolve();
    };

    document.body.appendChild(script);
  });
}

/**
 * Change the variant being customized
 * Call this when switching between products
 */
export function changeVariant(productId: number): void {
  if (window.customizer && typeof window.customizer.changeVariant === "function") {
    window.customizer.changeVariant(productId);
  }
}

/**
 * Clean up the customizer
 * Remove script and event listeners
 */
export function destroyCustomizer(): void {
  const script = document.getElementById("vu-customizer");
  if (script) {
    script.remove();
  }

  // Clear the customizer instance
  if (window.customizer) {
    delete (window as any).customizer;
  }
}

// Extend window type to include customizer
declare global {
  interface Window {
    customizer?: {
      changeVariant: (productId: number) => void;
      addToCart?: () => void;
    };
  }
}
