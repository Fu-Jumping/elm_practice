-- 批次⑥ 商家收藏（契约 §3.7）：存量库迁移脚本，可重复执行。
-- 运行时升级脚本副本：backend/src/main/resources/db/upgrade-favorites.sql（DatabaseInitializer 启动执行）。
CREATE TABLE IF NOT EXISTS favorites (
  favorite_id VARCHAR(32) PRIMARY KEY, user_id VARCHAR(32) NOT NULL, store_id VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  UNIQUE KEY uk_favorites_user_store (user_id, store_id),
  INDEX idx_favorites_user_time (user_id, created_at)
);
