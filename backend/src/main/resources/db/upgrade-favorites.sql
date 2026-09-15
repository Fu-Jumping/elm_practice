-- 批次⑥ 商家收藏（契约 §3.7）：存量库幂等升级。
-- 与 database/schema/schema.sql 中 favorites 定义保持一致（TODO-BE-014 双副本同步）。
CREATE TABLE IF NOT EXISTS favorites (
  favorite_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL, store_id VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  UNIQUE KEY uk_favorites_user_store (user_id, store_id),
  INDEX idx_favorites_user_time (user_id, created_at)
);
