-- 批次① 优惠计价接入：promotions 扩列 + promotion_tiers 建表 + orders 金额快照扩列 + 旧单档满减迁移。
-- 本文件由 DatabaseInitializer 在每次启动时幂等执行（information_schema 逐列判断 + CREATE IF NOT EXISTS，
-- 重复执行无副作用），替代手工对存量库跑迁移；与 backend/database/migrations/20260912-promotion-tiers.sql
-- 的步骤 1–4 保持同步（该文件的步骤 5 为一次性演示种子，不随启动执行）。
-- 注意：本文件与 backend/database/migrations/20260912-promotion-tiers.sql 保持同步，修改需同步两处。

-- 1) promotions 扩列：new_user_amount（新客立减，0=关闭）、free_delivery_threshold（免配送费门槛，0=不启用）、member_discount（会员折扣率，1.00=关闭）
SET @db := DATABASE();
SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE promotions ADD COLUMN new_user_amount DECIMAL(10,2) NOT NULL DEFAULT 0',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='promotions' AND COLUMN_NAME='new_user_amount');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE promotions ADD COLUMN free_delivery_threshold DECIMAL(10,2) NOT NULL DEFAULT 0',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='promotions' AND COLUMN_NAME='free_delivery_threshold');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE promotions ADD COLUMN member_discount DECIMAL(5,2) NOT NULL DEFAULT 1.00',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='promotions' AND COLUMN_NAME='member_discount');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- 2) 满减阶梯表（一店多档；主键 (store_id, threshold) 保证门槛不重复）
CREATE TABLE IF NOT EXISTS promotion_tiers (
  store_id VARCHAR(32) NOT NULL, threshold DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL, sort_order INT NOT NULL DEFAULT 1,
  PRIMARY KEY(store_id, threshold)
);

-- 3) 旧单档满减迁入阶梯（enabled=1 且门槛>0 的旧行迁为一档）；幂等：INSERT IGNORE 撞主键跳过
INSERT IGNORE INTO promotion_tiers(store_id, threshold, amount, sort_order)
SELECT store_id, threshold, amount, 1 FROM promotions
WHERE enabled = 1 AND threshold > 0 AND amount > 0
  AND NOT EXISTS (SELECT 1 FROM promotion_tiers t WHERE t.store_id = promotions.store_id);

-- 4) orders 金额快照扩列（历史行 DEFAULT 0，金额口径按旧规则成立的演示数据可由 seed 重置覆盖）
SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='delivery_fee');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE orders ADD COLUMN full_reduction_amount DECIMAL(10,2) NOT NULL DEFAULT 0',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='full_reduction_amount');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE orders ADD COLUMN new_customer_amount DECIMAL(10,2) NOT NULL DEFAULT 0',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='new_customer_amount');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE orders ADD COLUMN member_discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='member_discount_amount');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE orders ADD COLUMN coupon_amount DECIMAL(10,2) NOT NULL DEFAULT 0',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='coupon_amount');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE orders ADD COLUMN delivery_fee_discount DECIMAL(10,2) NOT NULL DEFAULT 0',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='delivery_fee_discount');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
