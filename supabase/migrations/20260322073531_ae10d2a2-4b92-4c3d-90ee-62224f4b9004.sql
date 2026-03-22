
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  company_name TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  subscription_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'glove',
  base_price INTEGER NOT NULL,
  stock_price INTEGER,
  stock_min_qty INTEGER DEFAULT 5,
  min_order_qty INTEGER NOT NULL DEFAULT 1,
  leather_options JSONB,
  leather_price_overrides JSONB,
  japanese_kip_upcharge INTEGER DEFAULT 3500,
  flag_upcharge INTEGER DEFAULT 500,
  position_options JSONB,
  has_hand_option BOOLEAN DEFAULT true,
  show_recipe_url BOOLEAN DEFAULT false,
  description TEXT,
  lead_time TEXT DEFAULT '6-8 weeks',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 6. Orders table with auto-generated order number
CREATE SEQUENCE public.order_number_seq START 1;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL DEFAULT 'MGB-' || LPAD(nextval('public.order_number_seq')::TEXT, 4, '0'),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'Received',
  status_updated_at TIMESTAMPTZ DEFAULT now(),
  total_amount INTEGER NOT NULL DEFAULT 0,
  logo_change_requested BOOLEAN DEFAULT false,
  logo_change_notes TEXT,
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 7. Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  product_name TEXT NOT NULL,
  leather_type TEXT,
  hand TEXT,
  position TEXT,
  has_flag BOOLEAN DEFAULT false,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  line_total INTEGER NOT NULL,
  builder_recipe_url TEXT,
  notes TEXT
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 8. Order status history
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- 9. Order images
CREATE TABLE public.order_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  angle INTEGER NOT NULL CHECK (angle BETWEEN 1 AND 4),
  image_url TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_images ENABLE ROW LEVEL SECURITY;

-- 10. Client logos
CREATE TABLE public.client_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  palm_logo_url TEXT,
  wrist_logo_url TEXT,
  thumb_logo_url TEXT,
  palm_logo_filename TEXT,
  wrist_logo_filename TEXT,
  thumb_logo_filename TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1
);
ALTER TABLE public.client_logos ENABLE ROW LEVEL SECURITY;

-- 11. Auto-create profile + client role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. RLS Policies

-- Profiles: users see own, admins see all
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles: users see own, admins see all
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Products: everyone authenticated can read, admins can manage
CREATE POLICY "Authenticated users can view active products" ON public.products
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can view all products" ON public.products
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Orders: clients see own, admins see all
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Order items: via order ownership
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );
CREATE POLICY "Admins can manage all order items" ON public.order_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Order status history: via order ownership
CREATE POLICY "Users can view own order status history" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_status_history.order_id AND orders.user_id = auth.uid())
  );
CREATE POLICY "Admins can manage order status history" ON public.order_status_history
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Order images: via order ownership
CREATE POLICY "Users can view own order images" ON public.order_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_images.order_id AND orders.user_id = auth.uid())
  );
CREATE POLICY "Admins can manage order images" ON public.order_images
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Client logos: users see own, admins see all
CREATE POLICY "Users can view own logos" ON public.client_logos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logos" ON public.client_logos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logos" ON public.client_logos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all logos" ON public.client_logos
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 13. Seed products
INSERT INTO public.products (name, category, base_price, stock_price, stock_min_qty, min_order_qty, leather_options, japanese_kip_upcharge, flag_upcharge, position_options, has_hand_option, show_recipe_url, description, lead_time) VALUES
('Custom Glove', 'glove', 16500, 14400, 5, 1, '["Korean Kip","Japanese Kip"]'::jsonb, 3500, 500, '["Infield","Outfield","Pitcher","First Base","Catcher"]'::jsonb, true, true, '100% Korean Kip Leather. Fully custom — your logo, colors, specs. No minimum.', '6-8 weeks'),
('Stock Glove', 'glove', 14400, NULL, NULL, 5, '["Korean Kip","Japanese Kip"]'::jsonb, 3500, 500, '["Infield","Outfield","Pitcher","First Base","Catcher"]'::jsonb, true, true, 'Korean Kip. Stock model. Min 5 same model (mix RHT/LHT OK).', '6-8 weeks'),
('Tumbled Leather Glove', 'glove', 11200, NULL, NULL, 5, '["Tumbled Steerhide"]'::jsonb, 0, 0, NULL, true, false, 'Rolled Steerhide. Quicker break-in. Youth & adult. Limited colors: Blonde, Black, Red, Royal, Brown, Tan, White.', '6-8 weeks'),
('Pancake Trainer', 'trainer', 6800, NULL, NULL, 10, '["Tumbled Leather","Kip Leather"]'::jsonb, 0, 0, NULL, false, false, 'Tumbled min 10: $68ea. Kip min 10: $94ea.', '6-8 weeks'),
('9.5" Infield Trainer', 'trainer', 11000, NULL, NULL, 1, '["Stock Tumbled","Stock Kip","Custom Tumbled","Custom Kip"]'::jsonb, 0, 0, NULL, false, false, 'Stock Tumbled $110, Stock Kip $122, Custom Tumbled $143, Custom Kip $151.', '6-8 weeks'),
('28.5" Catcher''s Training Mitt', 'trainer', 11000, NULL, NULL, 1, '["Stock Tumbled","Stock Kip","Custom Tumbled","Custom Kip"]'::jsonb, 0, 0, NULL, false, false, 'Stock Tumbled $110, Stock Kip $122, Custom Tumbled $143, Custom Kip $151.', '6-8 weeks');

-- Add leather_price_overrides for products with tier pricing
UPDATE public.products SET leather_price_overrides = '{"Tumbled Leather": 6800, "Kip Leather": 9400}'::jsonb WHERE name = 'Pancake Trainer';
UPDATE public.products SET leather_price_overrides = '{"Stock Tumbled": 11000, "Stock Kip": 12200, "Custom Tumbled": 14300, "Custom Kip": 15100}'::jsonb WHERE name = '9.5" Infield Trainer';
UPDATE public.products SET leather_price_overrides = '{"Stock Tumbled": 11000, "Stock Kip": 12200, "Custom Tumbled": 14300, "Custom Kip": 15100}'::jsonb WHERE name = '28.5" Catcher''s Training Mitt';
