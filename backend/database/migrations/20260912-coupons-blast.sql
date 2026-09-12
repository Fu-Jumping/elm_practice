-- 批次⑥ 红包与爆红包：users 扩列 + coupons / coupon_packs 建表 + 演示券种子。
-- 适用：已有旧结构的开发库/测试库（elm_practice / elm_practice_test）。新库直接执行 schema.sql 即可，无需本脚本。
-- 幂等性：MySQL 8 无 ADD COLUMN IF NOT EXISTS，以下用 information_schema + PREPARE 逐列判断；CREATE TABLE IF NOT EXISTS；种子 INSERT IGNORE。可重复执行。
-- 执行方式：mysql -h<host> -u<user> -p <db> < backend/database/migrations/20260912-coupons-blast.sql
-- 注意：步骤 1–4 已由 DatabaseInitializer 在应用启动时自动执行（运行时副本 src/main/resources/db/upgrade-coupons-blast.sql，
--       两处需保持同步）；本文件保留作为手工迁移/DBA 依据。

-- 1) users 扩列：当天免费爆占用日期（东八区 yyyy-MM-dd，NULL=从未使用，0 点按日期自然重置）
SET @db := DATABASE();
SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE users ADD COLUMN free_blast_date DATE NULL',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='free_blast_date');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- 2) 红包表（契约 §3.8：couponId/name/amount/threshold/scope/storeId/validFrom/validTo/used；
--    CHG-001 §3.10 扩列 source/can_blast/pack_id 与 used_order_id 核销留痕；scope 仅 ALL/STORE）
CREATE TABLE IF NOT EXISTS coupons (
  coupon_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL,
  name VARCHAR(80) NOT NULL, amount DECIMAL(10,2) NOT NULL, threshold DECIMAL(10,2) NOT NULL,
  scope VARCHAR(8) NOT NULL DEFAULT 'ALL', store_id VARCHAR(32),
  valid_from TIMESTAMP NOT NULL, valid_to TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE, used_order_id VARCHAR(32),
  source VARCHAR(16) NOT NULL DEFAULT 'SEED', can_blast BOOLEAN NOT NULL DEFAULT FALSE, pack_id VARCHAR(32),
  INDEX idx_coupons_user (user_id), CHECK(scope IN ('ALL','STORE')), CHECK(amount >= 0), CHECK(threshold >= 0)
);

-- 3) 红包套餐购买记录表（CHG-001；前端模拟付费，不产生支付记录、不新增支付表）
CREATE TABLE IF NOT EXISTS coupon_packs (
  pack_id VARCHAR(32) PRIMARY KEY, pack_key VARCHAR(16) NOT NULL, user_id VARCHAR(32) NOT NULL,
  price DECIMAL(10,2) NOT NULL, quantity INT NOT NULL, created_at TIMESTAMP NOT NULL,
  INDEX idx_packs_user (user_id)
);

-- 4) 演示券种子（契约 §3.8/验收第 22 行：全场券与指定商家券各至少 1 张；
--    INSERT IGNORE 固定券号，已核销后重复执行不回滚 used 状态）
INSERT IGNORE INTO coupons(coupon_id,user_id,name,amount,threshold,scope,store_id,valid_from,valid_to,used,source,can_blast)
VALUES ('cp001','u001','满20减2红包',2.00,20.00,'ALL',NULL,DATE_SUB(NOW(),INTERVAL 1 DAY),DATE_ADD(NOW(),INTERVAL 30 DAY),FALSE,'SEED',FALSE),
       ('cp002','u001','肯德基满40减5红包',5.00,40.00,'STORE','m002',DATE_SUB(NOW(),INTERVAL 1 DAY),DATE_ADD(NOW(),INTERVAL 30 DAY),FALSE,'SEED',FALSE);

-- 校验（人工执行）：SHOW COLUMNS FROM users LIKE 'free_blast_date'; SELECT coupon_id,scope,store_id,threshold,amount FROM coupons;
