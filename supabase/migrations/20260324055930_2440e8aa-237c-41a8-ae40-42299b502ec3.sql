UPDATE products
SET has_hand_option = true,
    position_options = '["Infield", "Outfield", "Pitcher", "First Base", "Catcher"]'::jsonb,
    flag_upcharge = 500,
    show_recipe_url = true,
    leather_options = '["Korean Kip", "Japanese Kip"]'::jsonb
WHERE name = '9.5" Infield Trainer' AND is_active = true;