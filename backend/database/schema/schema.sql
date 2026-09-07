CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(32) PRIMARY KEY, account VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL, nickname VARCHAR(80) NOT NULL, created_at TIMESTAMP NOT NULL
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
  stock INT NOT NULL DEFAULT 0, on_sale BOOLEAN NOT NULL DEFAULT TRUE, sales INT NOT NULL DEFAULT 0,
  CHECK(price >= 0), CHECK(stock >= 0)
);
CREATE TABLE IF NOT EXISTS addresses (
  address_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL, contact_name VARCHAR(80) NOT NULL,
  contact_sex VARCHAR(16), contact_phone VARCHAR(20) NOT NULL, region VARCHAR(200) NOT NULL,
  detail VARCHAR(300) NOT NULL, label VARCHAR(40), is_default BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS cart_lines (
  cart_line_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL, store_id VARCHAR(32) NOT NULL,
  product_id VARCHAR(32) NOT NULL, quantity INT NOT NULL, unit_price DECIMAL(10,2) NOT NULL, updated_at TIMESTAMP NOT NULL,
  UNIQUE(user_id,store_id,product_id), CHECK(quantity > 0)
);
CREATE TABLE IF NOT EXISTS orders (
  order_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL, store_id VARCHAR(32) NOT NULL,
  address_id VARCHAR(32) NOT NULL, address_snapshot JSON NOT NULL, remark VARCHAR(500), status VARCHAR(32) NOT NULL,
  item_subtotal DECIMAL(10,2) NOT NULL, packaging_fee DECIMAL(10,2) NOT NULL, total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL, paid_at TIMESTAMP NULL, idempotency_key VARCHAR(100),
  UNIQUE(user_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS order_items (
  order_id VARCHAR(32) NOT NULL, product_id VARCHAR(32) NOT NULL, name VARCHAR(120) NOT NULL,
  image VARCHAR(500), category_id VARCHAR(32), unit_price DECIMAL(10,2) NOT NULL, quantity INT NOT NULL,
  PRIMARY KEY(order_id,product_id)
);
