-- 批次⑥ 红包与爆红包存量库升级（CHG-001 §3.10）。由 DatabaseInitializer 启动时幂等执行。
-- 与 backend/database/migrations/20260912-coupons-blast.sql 步骤 1–3 保持同步；手工迁移依据见该文件。
-- MySQL 8 无 ADD COLUMN IF NOT EXISTS，用 information_schema + PREPARE 逐列判断；可重复执行。

-- 1) users 扩列：当天免费爆占用日期（NULL=从未使用）
SET @db := DATABASE();
SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE users ADD COLUMN free_blast_date DATE NULL',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='free_blast_date');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- 2) 红包表（一券一行；scope 仅 ALL/STORE）
CREATE TABLE IF NOT EXISTS coupons (
  coupon_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL,
  name VARCHAR(80) NOT NULL, amount DECIMAL(10,2) NOT NULL, threshold DECIMAL(10,2) NOT NULL,
  scope VARCHAR(8) NOT NULL DEFAULT 'ALL', store_id VARCHAR(32),
  valid_from TIMESTAMP NOT NULL, valid_to TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE, used_order_id VARCHAR(32),
  source VARCHAR(16) NOT NULL DEFAULT 'SEED', can_blast BOOLEAN NOT NULL DEFAULT FALSE, pack_id VARCHAR(32),
  INDEX idx_coupons_user (user_id), CHECK(scope IN ('ALL','STORE')), CHECK(amount >= 0), CHECK(threshold >= 0)
);

-- 3) 红包套餐购买记录表（前端模拟付费，无支付表）
CREATE TABLE IF NOT EXISTS coupon_packs (
  pack_id VARCHAR(32) PRIMARY KEY, pack_key VARCHAR(16) NOT NULL, user_id VARCHAR(32) NOT NULL,
  price DECIMAL(10,2) NOT NULL, quantity INT NOT NULL, created_at TIMESTAMP NOT NULL,
  INDEX idx_packs_user (user_id)
);

-- 4) 演示券种子（仅补 u001；INSERT IGNORE 固定券号，重启不覆盖已用状态，被核销后保持已用）
INSERT IGNORE INTO coupons(coupon_id,user_id,name,amount,threshold,scope,store_id,valid_from,valid_to,used,source,can_blast)
VALUES ('cp001','u001','满20减2红包',2.00,20.00,'ALL',NULL,DATE_SUB(NOW(),INTERVAL 1 DAY),DATE_ADD(NOW(),INTERVAL 30 DAY),FALSE,'SEED',FALSE),
       ('cp002','u001','肯德基满40减5红包',5.00,40.00,'STORE','m002',DATE_SUB(NOW(),INTERVAL 1 DAY),DATE_ADD(NOW(),INTERVAL 30 DAY),FALSE,'SEED',FALSE);
