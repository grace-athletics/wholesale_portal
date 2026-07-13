import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function PlaceOrder() {
  const { user } = useAuth();
  const [recipeId, setRecipeId] = useState("");
  const [productTitle, setProductTitle] = useState("Elite Glove");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{ orderNumber: string; travelerId: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipeId.trim()) {
      toast.error("Please enter a RecipeID");
      return;
    }

    if (!user?.email) {
      toast.error("Not authenticated");
      return;
    }

    setLoading(true);
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No auth token");
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
      const response = await fetch(`${apiBase}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          recipe_id: recipeId.trim(),
          customer_name: user.user_metadata?.name || "Customer",
          customer_email: user.email,
          product_title: productTitle,
          quantity: parseInt(quantity) || 1,
          line_item_properties: {},
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to place order");
      }

      const result = await response.json();
      setSuccessOrder({
        orderNumber: result.order_number,
        travelerId: result.traveler_url,
      });
      toast.success("Order placed successfully!");
      setRecipeId("");
      setProductTitle("Elite Glove");
      setQuantity("1");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to place order";
      toast.error(message);
      console.error("Order error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (successOrder) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-green-900 dark:text-green-100">
                Order Placed Successfully!
              </h2>
              <p className="text-sm text-green-700 dark:text-green-200 mt-1">
                Your order {successOrder.orderNumber} has been submitted to manufacturing.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <strong>Order Number:</strong> {successOrder.orderNumber}
                </p>
                <p>
                  <strong>Traveler:</strong>{" "}
                  <a
                    href={`${successOrder.travelerId}?download`}
                    className="text-green-600 dark:text-green-400 hover:underline"
                  >
                    Download PDF
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={() => setSuccessOrder(null)} className="w-full">
          Place Another Order
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold">Place Custom Order</h1>
        <p className="text-muted-foreground mt-2">
          Submit your RecipeID to create a custom glove order
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* RecipeID Input */}
          <div className="space-y-2">
            <Label htmlFor="recipeId">RecipeID *</Label>
            <Input
              id="recipeId"
              placeholder="e.g., 12345abc..."
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              disabled={loading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Get this from the VU Glove Builder after customizing your design
            </p>
          </div>

          {/* Product Title */}
          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Input
              id="product"
              placeholder="e.g., Elite Glove"
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="100"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Placing Order..." : "Place Order"}
          </Button>
        </form>
      </Card>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-lg border bg-card/50 p-4"
      >
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-2">
            <p className="font-medium">What happens next?</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Your order is sent to VU Custom for manufacturing</li>
              <li>A traveler PDF is generated and available for download</li>
              <li>Your order appears in "My Orders" for tracking</li>
              <li>Manufacturing typically takes 5-7 business days</li>
            </ol>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
