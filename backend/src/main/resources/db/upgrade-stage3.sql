-- 批次⑨（2026-09-15）：「轻量外卖」遗留缺口收口的数据侧变更——
-- 搜索距离字段（契约 §3.6）、商家收藏（§3.7）、通知（§3.9）、会员标识（§3.8）、平台级课程分类（PRD 7.16.1 首页分类宫格）。
-- 由 DatabaseInitializer 在 schema.sql 与既有 upgrade-*.sql 之后、**seed.sql 之后**幂等执行：
-- 会员标识与课程分类属于数据种子，必须晚于 seed.sql 才有行可更新；脚本自身可重复执行。
-- 与 backend/database/migrations/20260915-stage3.sql 保持同步，修改需同步两处。

-- 1) stores 扩列：种子距离（km）。契约 §3.6「距离 = 种子固定字段 distanceKm 升序，不引入地图与定位服务」，
--    同时是 distanceText（列表/收藏卡展示文案）的唯一数据源。
SET @db := DATABASE();
SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE stores ADD COLUMN distance_km DECIMAL(5,2) NULL',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='stores' AND COLUMN_NAME='distance_km');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- 2) users 扩列：会员标识（契约 §3.8「会员标识由种子数据或后台标记，本契约不提供开通与续费接口」）。
SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE users ADD COLUMN member_opened BOOLEAN NOT NULL DEFAULT FALSE',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='member_opened');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

SET @ddl := (SELECT IF(COUNT(*)=0,
    'ALTER TABLE users ADD COLUMN member_activated_at TIMESTAMP NULL',
    'SELECT 1') FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='member_activated_at');
PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

-- 3) 商家收藏（契约 §3.7）：(user_id, store_id) 唯一，重复收藏幂等返回当前收藏，不产生重复记录。
CREATE TABLE IF NOT EXISTS favorites (
  favorite_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL, store_id VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  UNIQUE KEY uk_favorite_user_store (user_id, store_id),
  INDEX idx_favorites_user (user_id)
);

-- 4) 通知（契约 §3.9）：ORDER 订单状态更新 / COUPON 红包到账 / MEMBER 会员权益提醒。
CREATE TABLE IF NOT EXISTS notifications (
  notification_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL,
  type VARCHAR(16) NOT NULL, title VARCHAR(120) NOT NULL, content VARCHAR(500) NOT NULL,
  related_id VARCHAR(32), is_read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL,
  INDEX idx_notifications_user (user_id, created_at),
  CONSTRAINT chk_notification_type CHECK(type IN ('ORDER','COUPON','MEMBER'))
);

-- 5) 平台级课程分类（PRD 7.16.1 首页分类宫格；编号 pc01~pc09 与用户端 COURSE_CATEGORIES 一致）。
--    独立成表而不复用 categories，避免课程分类污染商家详情的商品分类页签。
CREATE TABLE IF NOT EXISTS platform_categories (
  category_id VARCHAR(32) PRIMARY KEY, name VARCHAR(80) NOT NULL, sort_order INT NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS platform_category_stores (
  category_id VARCHAR(32) NOT NULL, store_id VARCHAR(32) NOT NULL,
  PRIMARY KEY (category_id, store_id)
);

-- 6) 种子：店铺距离（仅补空值，不覆盖运行期数据）。
UPDATE stores SET distance_km = CASE store_id
    WHEN 'm001' THEN 1.80 WHEN 'm002' THEN 2.40 WHEN 'm003' THEN 2.90
    WHEN 'm004' THEN 3.60 WHEN 'm005' THEN 4.20 END
 WHERE store_id IN ('m001','m002','m003','m004','m005') AND distance_km IS NULL;

-- 7) 种子：课程分类项与店铺归属。接口返回空数组即空态（PRD 835），不用演示数据伪装成功。
INSERT INTO platform_categories(category_id, name, sort_order) VALUES
  ('pc01','美食外卖',1),('pc02','甜品饮品',2),('pc03','0元领水果',3),('pc04','会吃',4),
  ('pc05','放心点榜',5),('pc06','趋势情报局',6),('pc07','汉堡西餐',7),('pc08','奶茶果汁',8),('pc09','全部',9)
ON DUPLICATE KEY UPDATE name=VALUES(name), sort_order=VALUES(sort_order);

INSERT IGNORE INTO platform_category_stores(category_id, store_id) VALUES
  ('pc01','m001'),('pc01','m002'),('pc01','m003'),('pc01','m004'),('pc01','m005'),
  ('pc02','m002'),('pc02','m003'),
  ('pc04','m005'),
  ('pc05','m001'),('pc05','m002'),('pc05','m005'),
  ('pc06','m004'),
  ('pc07','m002'),('pc07','m003'),
  ('pc08','m002'),
  ('pc09','m001'),('pc09','m002'),('pc09','m003'),('pc09','m004'),('pc09','m005');

-- 8) 种子：演示会员 u001（开通时间固定为 30 天前；已开通则保留原时间，不覆盖运行期数据）。
UPDATE users SET member_opened = TRUE,
    member_activated_at = IFNULL(member_activated_at, DATE_SUB(NOW(), INTERVAL 30 DAY))
 WHERE user_id = 'u001';

-- 9) 种子：演示收藏（u001 收藏 m002、m001）与会员权益提醒通知。
--    通知 created_at 用固定相对时间，保证「时间倒序」断言稳定。
INSERT IGNORE INTO favorites(favorite_id, user_id, store_id, created_at) VALUES
  ('fv001','u001','m002', STR_TO_DATE('2026-09-10 12:00:00','%Y-%m-%d %H:%i:%s')),
  ('fv002','u001','m001', STR_TO_DATE('2026-09-09 12:00:00','%Y-%m-%d %H:%i:%s'));

INSERT IGNORE INTO notifications(notification_id, user_id, type, title, content, related_id, is_read, created_at) VALUES
  ('nt001','u001','MEMBER','会员权益提醒','您已开通会员，全店商品享 95 折（与商品会员价不叠加）',NULL,FALSE, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
  ('nt002','u001','ORDER','订单状态更新','订单 o1002 已完成，感谢惠顾','o1002',TRUE, DATE_SUB(NOW(), INTERVAL 3 HOUR));
-- 10) 种子：商品会员价与规格（2026-09-15 缺口 D2）。仅补空值，不覆盖商家端运行期配置；
--     会员价用于 PRD 7.4 第⑤步计价（配置了会员价的商品按会员价计价，不再叠加会员折扣）。
UPDATE products SET member_price = CASE product_id
    WHEN 'p102' THEN 17.50 WHEN 'p103' THEN 15.00 WHEN 'p106' THEN 12.50
    WHEN 'p205' THEN 9.90 WHEN 'p208' THEN 35.00 END
 WHERE product_id IN ('p102','p103','p106','p205','p208') AND member_price IS NULL;

UPDATE products SET spec_options = JSON_ARRAY(JSON_OBJECT('name','标准','priceDelta',0), JSON_OBJECT('name','大份','priceDelta',3))
 WHERE product_id = 'p103' AND spec_options IS NULL;

UPDATE products SET spec_options = JSON_ARRAY(JSON_OBJECT('name','5块','priceDelta',0), JSON_OBJECT('name','10块','priceDelta',6))
 WHERE product_id = 'p106' AND spec_options IS NULL;