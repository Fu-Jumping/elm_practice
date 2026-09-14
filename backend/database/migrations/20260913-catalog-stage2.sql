-- 二阶段商品字段、规格组合与快照的幂等升级。
SET @db := DATABASE();

SET @ddl := (SELECT IF(COUNT(*)=0,'ALTER TABLE products ADD COLUMN member_price DECIMAL(10,2) NULL','SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='products' AND COLUMN_NAME='member_price');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl := (SELECT IF(COUNT(*)=0,'ALTER TABLE products ADD COLUMN tags JSON NULL','SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='products' AND COLUMN_NAME='tags');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl := (SELECT IF(COUNT(*)=0,'ALTER TABLE products ADD COLUMN spec_options JSON NULL','SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='products' AND COLUMN_NAME='spec_options');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := (SELECT IF(COUNT(*)=0,"ALTER TABLE cart_lines ADD COLUMN spec_key VARCHAR(500) NOT NULL DEFAULT ''",'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='cart_lines' AND COLUMN_NAME='spec_key');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl := (SELECT IF(COUNT(*)=0,'ALTER TABLE cart_lines ADD COLUMN spec_options JSON NULL','SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='cart_lines' AND COLUMN_NAME='spec_options');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @old_cart_idx := (
  SELECT INDEX_NAME FROM (
    SELECT INDEX_NAME,NON_UNIQUE,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='cart_lines' AND INDEX_NAME<>'PRIMARY'
    GROUP BY INDEX_NAME,NON_UNIQUE
  ) x WHERE NON_UNIQUE=0 AND cols='user_id,store_id,product_id' LIMIT 1
);
SET @ddl := IF(@old_cart_idx IS NULL,'SELECT 1',CONCAT('ALTER TABLE cart_lines DROP INDEX ',@old_cart_idx));
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl := (SELECT IF(COUNT(*)=0,
  'ALTER TABLE cart_lines ADD CONSTRAINT uk_cart_spec UNIQUE(user_id,store_id,product_id,spec_key)','SELECT 1')
  FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='cart_lines' AND INDEX_NAME='uk_cart_spec');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := (SELECT IF(COUNT(*)=0,"ALTER TABLE order_items ADD COLUMN spec_key VARCHAR(500) NOT NULL DEFAULT ''",'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='order_items' AND COLUMN_NAME='spec_key');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl := (SELECT IF(COUNT(*)=0,'ALTER TABLE order_items ADD COLUMN spec_options JSON NULL','SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='order_items' AND COLUMN_NAME='spec_options');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @pk_cols := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='order_items' AND INDEX_NAME='PRIMARY');
SET @ddl := IF(@pk_cols=2,'ALTER TABLE order_items DROP PRIMARY KEY, ADD PRIMARY KEY(order_id,product_id,spec_key)','SELECT 1');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
