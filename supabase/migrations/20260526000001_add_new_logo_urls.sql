-- Add column to store new logo URLs when a client requests a logo change during order placement
ALTER TABLE orders ADD COLUMN IF NOT EXISTS new_logo_urls JSONB;
