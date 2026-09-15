-- 批次⑥ 会员标识与会员价（契约 §3.8）：存量库迁移脚本，可重复执行。
-- 运行时升级脚本副本：backend/src/main/resources/db/upgrade-member.sql（DatabaseInitializer 启动执行）。
SET @db := DATABASE();
SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE users ADD COLUMN is_member BOOLEAN NOT NULL DEFAULT FALSE',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='is_member');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE users ADD COLUMN member_activated_at TIMESTAMP NULL',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='member_activated_at');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- 演示种子：u001 为会员（与 seed.sql 一致；仅在该用户存在且未标记时更新）。
UPDATE users SET is_member = TRUE, member_activated_at = COALESCE(member_activated_at, DATE_SUB(NOW(), INTERVAL 30 DAY))
WHERE user_id = 'u001' AND is_member = FALSE;

-- 存量库回填 m002 六个演示商品的会员价（与 seed.sql 一致）。
-- member_price 列由 20260913-catalog-stage2 迁移添加但存量数据为 NULL；
-- 仅回填固定种子商品且当前为 NULL 的行，幂等且不覆盖商家后续设置。
UPDATE products SET member_price = 18.50 WHERE product_id = 'p101' AND store_id = 'm002' AND member_price IS NULL;
UPDATE products SET member_price = 18.50 WHERE product_id = 'p102' AND store_id = 'm002' AND member_price IS NULL;
UPDATE products SET member_price = 16.10 WHERE product_id = 'p103' AND store_id = 'm002' AND member_price IS NULL;
UPDATE products SET member_price = 10.90 WHERE product_id = 'p104' AND store_id = 'm002' AND member_price IS NULL;
UPDATE products SET member_price = 8.50  WHERE product_id = 'p105' AND store_id = 'm002' AND member_price IS NULL;
UPDATE products SET member_price = 13.20 WHERE product_id = 'p106' AND store_id = 'm002' AND member_price IS NULL;
