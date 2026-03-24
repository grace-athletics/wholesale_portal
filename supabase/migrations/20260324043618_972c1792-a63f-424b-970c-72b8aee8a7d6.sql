
-- Add size column to order_items
ALTER TABLE public.order_items ADD COLUMN size text;

-- Update batting gloves: min_order_qty = 5 per line, no stock pricing needed
-- We'll handle the 15-total validation in the frontend
UPDATE products SET
  min_order_qty = 5,
  stock_price = NULL,
  stock_min_qty = NULL,
  has_hand_option = false,
  show_recipe_url = false
WHERE id = 'e3850eff-bc27-4064-bec1-abd10fbdb79d';
