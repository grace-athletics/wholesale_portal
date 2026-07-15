import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchWooProducts, type WooProduct } from "@/integrations/woocommerce/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Image as ImageIcon, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { CustomizerModal } from "@/components/CustomizerModal";

export default function Shop() {
  const { user } = useAuth();
  const [hasLogos, setHasLogos] = useState(false);
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<WooProduct | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [customizerProduct, setCustomizerProduct] = useState<WooProduct | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      // Check logos
      const { data } = await supabase
        .from("client_logos")
        .select("wrist_logo_url, thumb_logo_url, palm_logo_url")
        .eq("user_id", user.id)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      setHasLogos(!!(data?.wrist_logo_url && data?.thumb_logo_url && data?.palm_logo_url));

      // Fetch products
      const wooProducts = await fetchWooProducts();
      const productArray = Array.isArray(wooProducts) ? wooProducts : [];
      setProducts(productArray);
      setLoading(false);
    }
    loadData();
  }, [user]);

  const handleCustomize = (product: WooProduct) => {
    setCustomizerProduct(product);
    setCustomizerOpen(true);
  };

  const handleRecipeGenerated = (recipeId: string, quantity: number) => {
    if (!customizerProduct) return;

    // TODO: Add to cart with recipe ID
    console.log(`Recipe ${recipeId} with quantity ${quantity} for product ${customizerProduct.id}`);
    toast.success("Added to cart! (Cart coming soon)");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-semibold">Shop Custom Gloves</h1>
        <p className="text-muted-foreground mt-2">
          Build and customize your wholesale gloves. Your logos will be automatically applied to every order.
        </p>
      </motion.div>

      {/* Logo Status */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`rounded-lg border p-6 ${
            hasLogos
              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
              : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
          }`}
        >
          <div className="flex items-start gap-4">
            {hasLogos ? (
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {hasLogos ? "Your Logos Are Ready" : "Upload Your Logos First"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {hasLogos
                  ? "All orders will automatically include your uploaded logos (wrist, thumb, and palm)."
                  : "Upload your logos so they can be applied to every glove you order."}
              </p>
              {!hasLogos && (
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <a href="/account/logos">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Go to Logo Vault
                  </a>
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Products Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {products.map((product) => (
          <motion.div
            key={product.id}
            whileHover={{ y: -4 }}
          >
            <Card className="overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow">
              {product.images?.[0]?.src && (
                <div className="w-full h-48 bg-muted overflow-hidden">
                  <img
                    src={product.images[0].src}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold mb-2">{product.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  SKU: <code className="bg-muted px-2 py-1 rounded text-xs">{product.sku}</code>
                </p>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-muted-foreground">Wholesale from:</span>
                    <span className="font-bold text-lg">$145</span>
                  </div>
                  <Button className="w-full" onClick={() => handleCustomize(product)}>
                    Customize
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Customizer Modal */}
      {customizerProduct && (
        <CustomizerModal
          open={customizerOpen}
          onOpenChange={setCustomizerOpen}
          productId={customizerProduct.id}
          productName={customizerProduct.name}
          sku={customizerProduct.sku}
          onRecipeGenerated={handleRecipeGenerated}
        />
      )}
    </div>
  );
}
