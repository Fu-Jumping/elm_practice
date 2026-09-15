-- 应用启动时由 DatabaseInitializer 自动执行（CREATE IF NOT EXISTS 幂等）。
-- 注意：本文件与 backend/database/schema/schema.sql 保持同步，修改需同步两处。
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(32) PRIMARY KEY, account VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL, nickname VARCHAR(80) NOT NULL, created_at TIMESTAMP NOT NULL,
  -- 批次⑥（CHG-001）：当天免费爆占用日期（东八区 yyyy-MM-dd），NULL=从未使用，0 点按日期自然重置。
  free_blast_date DATE NULL,
  -- 批次⑥：会员标识（种子/后台标记，不提供开通接口，契约 §3.8）；member_activated_at 为开通时间。
  is_member BOOLEAN NOT NULL DEFAULT FALSE, member_activated_at TIMESTAMP NULL
);
CREATE TABLE IF NOT EXISTS merchants (
  merchant_id VARCHAR(32) PRIMARY KEY, account VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL, store_id VARCHAR(32), phone VARCHAR(20) NOT NULL, created_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS stores (
  store_id VARCHAR(32) PRIMARY KEY, merchant_id VARCHAR(32), name VARCHAR(120) NOT NULL,
  description VARCHAR(500), image VARCHAR(500), rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  monthly_sales INT NOT NULL DEFAULT 0, delivery_minutes INT NOT NULL DEFAULT 30,
  start_price DECIMAL(10,2) NOT NULL DEFAULT 0, delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  category_id VARCHAR(32) PRIMARY KEY, store_id VARCHAR(32) NOT NULL, name VARCHAR(80) NOT NULL,
  sort_order INT NOT NULL DEFAULT 1, UNIQUE(store_id,name)
);
CREATE TABLE IF NOT EXISTS products (
  product_id VARCHAR(32) PRIMARY KEY, store_id VARCHAR(32) NOT NULL, category_id VARCHAR(32) NOT NULL,
  name VARCHAR(120) NOT NULL, description VARCHAR(500), image VARCHAR(500), price DECIMAL(10,2) NOT NULL,
  member_price DECIMAL(10,2) NULL, tags JSON NULL, spec_options JSON NULL,
  stock INT NOT NULL DEFAULT 0, on_sale BOOLEAN NOT NULL DEFAULT TRUE, sales INT NOT NULL DEFAULT 0,
  CHECK(price >= 0), CHECK(member_price IS NULL OR member_price >= 0), CHECK(stock >= 0)
);
CREATE TABLE IF NOT EXISTS addresses (
  address_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL, contact_name VARCHAR(80) NOT NULL,
  contact_sex VARCHAR(16), contact_phone VARCHAR(20) NOT NULL, region VARCHAR(200) NOT NULL,
  detail VARCHAR(300) NOT NULL, label VARCHAR(40), is_default BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS cart_lines (
  cart_line_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL, store_id VARCHAR(32) NOT NULL,
  product_id VARCHAR(32) NOT NULL, spec_key VARCHAR(500) NOT NULL DEFAULT '', spec_options JSON NULL,
  quantity INT NOT NULL, unit_price DECIMAL(10,2) NOT NULL, updated_at TIMESTAMP NOT NULL,
  CONSTRAINT uk_cart_spec UNIQUE(user_id,store_id,product_id,spec_key), CHECK(quantity > 0)
);
CREATE TABLE IF NOT EXISTS orders (
  order_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL, store_id VARCHAR(32) NOT NULL,
  address_id VARCHAR(32) NOT NULL, address_snapshot JSON NOT NULL, remark VARCHAR(500), status VARCHAR(32) NOT NULL,
  item_subtotal DECIMAL(10,2) NOT NULL, packaging_fee DECIMAL(10,2) NOT NULL, total DECIMAL(10,2) NOT NULL,
  -- 金额快照扩展列（批次①，契约 §3.5）：配送费与各优惠项，历史行 DEFAULT 0。
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  full_reduction_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  new_customer_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  member_discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  coupon_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee_discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL, paid_at TIMESTAMP NULL, idempotency_key VARCHAR(100),
  cancel_reason VARCHAR(50) NULL, cancelled_at TIMESTAMP NULL, cancelled_by VARCHAR(16) NULL,
  UNIQUE(user_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS order_items (
  order_id VARCHAR(32) NOT NULL, product_id VARCHAR(32) NOT NULL, name VARCHAR(120) NOT NULL,
  image VARCHAR(500), category_id VARCHAR(32), spec_key VARCHAR(500) NOT NULL DEFAULT '', spec_options JSON NULL,
  unit_price DECIMAL(10,2) NOT NULL, quantity INT NOT NULL,
  PRIMARY KEY(order_id,product_id,spec_key)
);
-- 以下 5 张表为 MyBatis 持久化接入新增（评价、会话、消息、店铺促销、应用侧 ID 序列）。
CREATE TABLE IF NOT EXISTS reviews (
  review_id VARCHAR(32) PRIMARY KEY, order_id VARCHAR(32) NOT NULL UNIQUE,
  store_id VARCHAR(32) NOT NULL, user_id VARCHAR(32) NOT NULL,
  content VARCHAR(500) NOT NULL, rating INT NOT NULL, tags JSON NULL, images JSON NULL, reply VARCHAR(500),
  created_at TIMESTAMP NOT NULL, replied_at TIMESTAMP NULL,
  CHECK(rating BETWEEN 1 AND 5)
);
CREATE TABLE IF NOT EXISTS conversations (
  conversation_id VARCHAR(32) PRIMARY KEY, order_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL, merchant_id VARCHAR(32) NOT NULL,
  user_read BOOLEAN NOT NULL DEFAULT FALSE, merchant_read BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS messages (
  message_id VARCHAR(32) PRIMARY KEY, conversation_id VARCHAR(32) NOT NULL,
  sender_id VARCHAR(32) NOT NULL, sender_role VARCHAR(16) NOT NULL,
  content VARCHAR(1000) NOT NULL, created_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS promotions (
  store_id VARCHAR(32) PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT FALSE,
  -- 旧单档满减列保留仅为迁移脚本读数；计价一律使用 promotion_tiers 与下方扩展列。
  threshold DECIMAL(10,2) NOT NULL DEFAULT 0, amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- 批次① 扩列（契约 §6.3）：新客立减金额（0=关闭）、免配送费门槛（0=不启用）、会员折扣率（1.00=关闭）。
  new_user_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  free_delivery_threshold DECIMAL(10,2) NOT NULL DEFAULT 0,
  member_discount DECIMAL(5,2) NOT NULL DEFAULT 1.00
);
-- 满减阶梯（批次①）：一店多档，按门槛升序；"满足门槛取最大档"。
CREATE TABLE IF NOT EXISTS promotion_tiers (
  store_id VARCHAR(32) NOT NULL, threshold DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL, sort_order INT NOT NULL DEFAULT 1,
  PRIMARY KEY(store_id, threshold)
);
CREATE TABLE IF NOT EXISTS id_sequence (
  name VARCHAR(32) PRIMARY KEY, next_val BIGINT NOT NULL
);
-- 批次⑥ 红包（契约 §3.8 + CHG-001 §3.10）：用户券一行一券；门槛基数=商品小计；scope 仅 ALL/STORE。
CREATE TABLE IF NOT EXISTS coupons (
  coupon_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL,
  name VARCHAR(80) NOT NULL, amount DECIMAL(10,2) NOT NULL, threshold DECIMAL(10,2) NOT NULL,
  scope VARCHAR(8) NOT NULL DEFAULT 'ALL', store_id VARCHAR(32),
  valid_from TIMESTAMP NOT NULL, valid_to TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE, used_order_id VARCHAR(32),
  source VARCHAR(16) NOT NULL DEFAULT 'SEED', can_blast BOOLEAN NOT NULL DEFAULT FALSE, pack_id VARCHAR(32),
  INDEX idx_coupons_user (user_id), CHECK(scope IN ('ALL','STORE')), CHECK(amount >= 0), CHECK(threshold >= 0)
);
-- 红包套餐购买记录（CHG-001；前端模拟付费，不产生支付记录、不新增支付表）。
CREATE TABLE IF NOT EXISTS coupon_packs (
  pack_id VARCHAR(32) PRIMARY KEY, pack_key VARCHAR(16) NOT NULL, user_id VARCHAR(32) NOT NULL,
  price DECIMAL(10,2) NOT NULL, quantity INT NOT NULL, created_at TIMESTAMP NOT NULL,
  INDEX idx_packs_user (user_id)
);

-- 批次⑥ 商家收藏（契约 §3.7）：(user_id, store_id) 唯一，重复收藏幂等。
CREATE TABLE IF NOT EXISTS favorites (
  favorite_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL, store_id VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  UNIQUE KEY uk_favorites_user_store (user_id, store_id),
  INDEX idx_favorites_user_time (user_id, created_at)
);
INSERT IGNORE INTO id_sequence(name,next_val) VALUES ('global',1004);
