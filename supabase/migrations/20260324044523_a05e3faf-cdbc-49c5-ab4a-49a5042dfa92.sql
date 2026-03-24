UPDATE orders SET status = 'Order Placed' WHERE status = 'Received';
UPDATE order_status_history SET new_status = 'Order Placed' WHERE new_status = 'Received';
UPDATE order_status_history SET old_status = 'Order Placed' WHERE old_status = 'Received';
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'Order Placed';