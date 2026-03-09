-- Auth related tables
-- User Accounts
SELECT *
FROM account;
-- User Profiles
SELECT *
FROM user;
-- User Verification
SELECT *
FROM verification;
-- User Sessions
SELECT *
FROM session;
-- Catalog and Inventory related tables
-- Product Catalog
SELECT *
FROM products;
SELECT *
FROM product_localization;
SELECT *
FROM product_alias;
SELECT *
FROM v_products_resolved;
SELECT *
FROM stock_adjustments;
SELECT *
FROM agent_chat_message;
SELECT *
FROM agent_chat_session;
SELECT *
FROM cart_items;
SELECT *
FROM carts;
SELECT *
FROM customer_category_contributions;
SELECT *
FROM customer_category_preferences;
SELECT *
FROM customer_segments;
SELECT *
FROM inventory_items;
SELECT *
FROM loyalty_tiers;
SELECT *
FROM migrations;
SELECT *
FROM order_items;
SELECT *
FROM orders;
SELECT *
FROM pe_customers;
SELECT *
FROM pe_products;
SELECT *
FROM pe_promotions;
SELECT *
FROM pe_stores;
SELECT *
FROM pe_transactions;
SELECT *
FROM product_import_staging;
SELECT *
FROM transactions;
SELECT tc.table_schema || '.' || tc.table_name AS child_table,
    kcu.column_name AS child_col,
    ccu.table_schema || '.' || ccu.table_name AS parent_table,
    ccu.column_name AS parent_col,
    tc.constraint_name
FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY child_table;