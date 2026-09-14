-- AI 点餐助手会话与消息表（会话记忆复用 MySQL，替代 ByteCoach 原 Redis）
-- 幂等：CREATE TABLE IF NOT EXISTS，可重复执行
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  session_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(32),
  title VARCHAR(100),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  INDEX idx_ai_session_user (user_id)
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  role VARCHAR(16) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  INDEX idx_ai_msg_session (session_id, created_at),
  CHECK(role IN ('SYSTEM','USER','ASSISTANT','TOOL'))
);
