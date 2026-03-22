-- Seed products
INSERT INTO public.products (name, category, base_price, min_order_qty, description, lead_time, is_active, flag_upcharge, japanese_kip_upcharge, stock_price, stock_min_qty, has_hand_option, show_recipe_url, leather_options, position_options) VALUES
  ('Infield Glove', 'glove', 18500, 1, 'Premium custom infield glove with full-grain leather', '6-8 weeks', true, 500, 3500, 16000, 5, true, true, '["Korean Pro", "Japanese Kip"]'::jsonb, '["SS","2B","3B"]'::jsonb),
  ('Outfield Glove', 'glove', 19500, 1, 'Custom outfield glove with deep pocket design', '6-8 weeks', true, 500, 3500, 17000, 5, true, true, '["Korean Pro", "Japanese Kip"]'::jsonb, '["OF"]'::jsonb),
  ('First Base Mitt', 'glove', 20500, 1, 'Wide-body first base mitt for maximum scoops', '6-8 weeks', true, 500, 3500, 18000, 5, true, false, '["Korean Pro", "Japanese Kip"]'::jsonb, '["1B"]'::jsonb),
  ('Catcher Mitt', 'glove', 22000, 1, 'Heavy-duty catcher mitt built for durability', '8-10 weeks', true, 500, 3500, 19500, 5, true, false, '["Korean Pro", "Japanese Kip"]'::jsonb, '["C"]'::jsonb),
  ('Batting Gloves', 'accessory', 4500, 6, 'Custom branded batting gloves with Cabretta leather', '4-6 weeks', true, 0, 0, 3800, 12, false, false, '["Cabretta"]'::jsonb, null),
  ('Trainer Glove', 'trainer', 8500, 1, 'Flat training glove for fielding drills', '4-6 weeks', true, 0, 0, null, null, true, false, '["Korean Pro"]'::jsonb, null);

-- Orders attributed to your admin account for seed display
INSERT INTO public.orders (id, user_id, order_number, status, total_amount, created_at, updated_at, status_updated_at) VALUES
  ('bbbbbbbb-0001-4000-8000-000000000001', 'c277b623-f998-4d14-b7b6-d1abd4a09a08', 'MGB-0001', 'Delivered', 111000, now() - interval '3 months', now() - interval '1 month', now() - interval '1 month'),
  ('bbbbbbbb-0001-4000-8000-000000000002', 'c277b623-f998-4d14-b7b6-d1abd4a09a08', 'MGB-0002', 'In Production', 93000, now() - interval '5 weeks', now() - interval '2 weeks', now() - interval '2 weeks'),
  ('bbbbbbbb-0001-4000-8000-000000000003', 'c277b623-f998-4d14-b7b6-d1abd4a09a08', 'MGB-0003', 'Received', 45000, now() - interval '2 days', now() - interval '2 days', now() - interval '2 days'),
  ('bbbbbbbb-0002-4000-8000-000000000001', 'c277b623-f998-4d14-b7b6-d1abd4a09a08', 'MGB-0004', 'Shipped', 78000, now() - interval '6 weeks', now() - interval '1 week', now() - interval '1 week'),
  ('bbbbbbbb-0002-4000-8000-000000000002', 'c277b623-f998-4d14-b7b6-d1abd4a09a08', 'MGB-0005', 'Processing', 27000, now() - interval '4 days', now() - interval '3 days', now() - interval '3 days'),
  ('bbbbbbbb-0002-4000-8000-000000000003', 'c277b623-f998-4d14-b7b6-d1abd4a09a08', 'MGB-0006', 'Received', 62000, now() - interval '1 day', now() - interval '1 day', now() - interval '1 day');

-- Order items
INSERT INTO public.order_items (order_id, product_id, product_name, leather_type, hand, position, quantity, unit_price, line_total, has_flag) VALUES
  ('bbbbbbbb-0001-4000-8000-000000000001', (SELECT id FROM products WHERE name='Infield Glove' LIMIT 1), 'Infield Glove', 'Korean Pro', 'RHT', 'SS', 3, 18500, 55500, false),
  ('bbbbbbbb-0001-4000-8000-000000000001', (SELECT id FROM products WHERE name='Infield Glove' LIMIT 1), 'Infield Glove', 'Korean Pro', 'LHT', '2B', 3, 18500, 55500, false),
  ('bbbbbbbb-0001-4000-8000-000000000002', (SELECT id FROM products WHERE name='Outfield Glove' LIMIT 1), 'Outfield Glove', 'Japanese Kip', 'RHT', 'OF', 2, 23000, 46000, true),
  ('bbbbbbbb-0001-4000-8000-000000000002', (SELECT id FROM products WHERE name='First Base Mitt' LIMIT 1), 'First Base Mitt', 'Korean Pro', 'LHT', '1B', 2, 20500, 41000, false),
  ('bbbbbbbb-0001-4000-8000-000000000003', (SELECT id FROM products WHERE name='Batting Gloves' LIMIT 1), 'Batting Gloves', 'Cabretta', null, null, 10, 4500, 45000, false),
  ('bbbbbbbb-0002-4000-8000-000000000001', (SELECT id FROM products WHERE name='Catcher Mitt' LIMIT 1), 'Catcher Mitt', 'Korean Pro', 'RHT', 'C', 2, 22000, 44000, false),
  ('bbbbbbbb-0002-4000-8000-000000000001', (SELECT id FROM products WHERE name='Infield Glove' LIMIT 1), 'Infield Glove', 'Korean Pro', 'RHT', '3B', 2, 18500, 37000, true),
  ('bbbbbbbb-0002-4000-8000-000000000002', (SELECT id FROM products WHERE name='Batting Gloves' LIMIT 1), 'Batting Gloves', 'Cabretta', null, null, 6, 4500, 27000, false),
  ('bbbbbbbb-0002-4000-8000-000000000003', (SELECT id FROM products WHERE name='Outfield Glove' LIMIT 1), 'Outfield Glove', 'Korean Pro', 'RHT', 'OF', 2, 19500, 39000, false),
  ('bbbbbbbb-0002-4000-8000-000000000003', (SELECT id FROM products WHERE name='Infield Glove' LIMIT 1), 'Infield Glove', 'Japanese Kip', 'LHT', 'SS', 1, 22000, 22000, true);

-- Status history
INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_at, changed_by) VALUES
  ('bbbbbbbb-0001-4000-8000-000000000001', 'Received', 'Processing', now() - interval '2.5 months', 'c277b623-f998-4d14-b7b6-d1abd4a09a08'),
  ('bbbbbbbb-0001-4000-8000-000000000001', 'Processing', 'In Production', now() - interval '2 months', 'c277b623-f998-4d14-b7b6-d1abd4a09a08'),
  ('bbbbbbbb-0001-4000-8000-000000000001', 'In Production', 'Shipped', now() - interval '6 weeks', 'c277b623-f998-4d14-b7b6-d1abd4a09a08'),
  ('bbbbbbbb-0001-4000-8000-000000000001', 'Shipped', 'Delivered', now() - interval '1 month', 'c277b623-f998-4d14-b7b6-d1abd4a09a08'),
  ('bbbbbbbb-0001-4000-8000-000000000002', 'Received', 'Processing', now() - interval '4 weeks', 'c277b623-f998-4d14-b7b6-d1abd4a09a08'),
  ('bbbbbbbb-0001-4000-8000-000000000002', 'Processing', 'In Production', now() - interval '2 weeks', 'c277b623-f998-4d14-b7b6-d1abd4a09a08'),
  ('bbbbbbbb-0002-4000-8000-000000000001', 'Received', 'Processing', now() - interval '5 weeks', 'c277b623-f998-4d14-b7b6-d1abd4a09a08'),
  ('bbbbbbbb-0002-4000-8000-000000000001', 'Processing', 'In Production', now() - interval '3 weeks', 'c277b623-f998-4d14-b7b6-d1abd4a09a08'),
  ('bbbbbbbb-0002-4000-8000-000000000001', 'In Production', 'Shipped', now() - interval '1 week', 'c277b623-f998-4d14-b7b6-d1abd4a09a08'),
  ('bbbbbbbb-0002-4000-8000-000000000002', 'Received', 'Processing', now() - interval '3 days', 'c277b623-f998-4d14-b7b6-d1abd4a09a08');