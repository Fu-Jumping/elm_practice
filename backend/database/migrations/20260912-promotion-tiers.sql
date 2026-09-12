-- 批次① 优惠计价接入：promotions 扩列 + promotion_tiers 建表 + orders 金额快照扩列 + 旧单档满减迁移。
-- 适用：已有旧结构的开发库/测试库（elm_practice / elm_practice_test）。新库直接执行 schema.sql 即可，无需本脚本。
-- 幂等性：MySQL 8 无 ADD COLUMN IF NOT EXISTS，以下用 information_schema + PREPARE 逐列判断；可重复执行。
-- 执行方式：mysql -h<host> -u<user> -p <db> < backend/database/migrations/20260912-promotion-tiers.sql
-- 注意：步骤 1–4 已由 DatabaseInitializer 在应用启动时自动执行（运行时副本 src/main/resources/db/upgrade-promotion-tiers.sql，
--       两处需保持同步）；本文件保留作为手工迁移/DBA 依据。步骤 5 为一次性演示种子，不随启动执行（避免每次重启覆盖商家配置）。

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

-- 5) 演示促销种子（口径见 PRD 7.4：满 20 减 2、满 40 减 5、新客立减 3、免配送费门槛 30、会员 95 折）
INSERT INTO promotions(store_id, enabled, threshold, amount, new_user_amount, free_delivery_threshold, member_discount)
VALUES ('m002', 1, 0, 0, 3.00, 30.00, 0.95)
ON DUPLICATE KEY UPDATE enabled=VALUES(enabled), new_user_amount=VALUES(new_user_amount),
  free_delivery_threshold=VALUES(free_delivery_threshold), member_discount=VALUES(member_discount);
INSERT IGNORE INTO promotion_tiers(store_id, threshold, amount, sort_order)
VALUES ('m002', 20.00, 2.00, 1), ('m002', 40.00, 5.00, 2);

-- 校验（人工执行）：SELECT * FROM promotion_tiers; SHOW COLUMNS FROM orders LIKE '%amount';
