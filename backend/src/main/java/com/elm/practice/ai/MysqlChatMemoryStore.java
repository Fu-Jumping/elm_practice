package com.elm.practice.ai;

import com.elm.practice.common.Times;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.agent.tool.ToolExecutionRequest;
import dev.langchain4j.data.message.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * 基于 MySQL 的 LangChain4j ChatMemoryStore，替代 ByteCoach 原 RedisChatMemoryStore。
 * 消息以 JSON 序列化存入 ai_chat_messages，按 created_at 顺序恢复。
 */
@Component
public class MysqlChatMemoryStore {

    private static final Logger log = LoggerFactory.getLogger(MysqlChatMemoryStore.class);
    private final JdbcTemplate jdbc;
    private final ObjectMapper json = new ObjectMapper();

    public MysqlChatMemoryStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<ChatMessage> getMessages(String sessionId) {
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT role, content FROM ai_chat_messages WHERE session_id = ? ORDER BY created_at, id",
                    sessionId);
            List<ChatMessage> msgs = new ArrayList<>();
            for (Map<String, Object> r : rows) {
                String role = (String) r.get("role");
                String content = (String) r.get("content");
                ChatMessage m = deserialize(role, content);
                if (m != null) msgs.add(m);
            }
            return msgs;
        } catch (Exception e) {
            log.warn("读取会话记忆失败 sessionId={}: {}", sessionId, e.getMessage());
            return List.of();
        }
    }

    public void updateMessages(String sessionId, List<ChatMessage> messages) {
        try {
            jdbc.update("DELETE FROM ai_chat_messages WHERE session_id = ?", sessionId);
            String now = Times.nowCn();
            for (ChatMessage m : messages) {
                String role = roleOf(m);
                String content = serialize(m);
                jdbc.update(
                        "INSERT INTO ai_chat_messages(session_id, role, content, created_at) VALUES(?,?,?,STR_TO_DATE(?,'%Y-%m-%d %H:%i:%s'))",
                        sessionId, role, content, now);
            }
            jdbc.update(
                    "INSERT INTO ai_chat_sessions(session_id, user_id, title, created_at, updated_at) VALUES(?,?,?,STR_TO_DATE(?,'%Y-%m-%d %H:%i:%s'),STR_TO_DATE(?,'%Y-%m-%d %H:%i:%s')) "
                            + "ON DUPLICATE KEY UPDATE updated_at = STR_TO_DATE(?,'%Y-%m-%d %H:%i:%s')",
                    sessionId, null, "点餐助手会话", now, now, now);
        } catch (Exception e) {
            log.warn("写入会话记忆失败 sessionId={}: {}", sessionId, e.getMessage());
        }
    }

    public void deleteMessages(String sessionId) {
        try {
            jdbc.update("DELETE FROM ai_chat_messages WHERE session_id = ?", sessionId);
            jdbc.update("DELETE FROM ai_chat_sessions WHERE session_id = ?", sessionId);
        } catch (Exception e) {
            log.warn("删除会话记忆失败 sessionId={}: {}", sessionId, e.getMessage());
        }
    }

    private String roleOf(ChatMessage m) {
        if (m instanceof SystemMessage) return "SYSTEM";
        if (m instanceof UserMessage) return "USER";
        if (m instanceof AiMessage) return "ASSISTANT";
        if (m instanceof ToolExecutionResultMessage) return "TOOL";
        return "ASSISTANT";
    }

    private String serialize(ChatMessage m) {
        try {
            Map<String, Object> map = new LinkedHashMap<>();
            if (m instanceof SystemMessage sm) {
                map.put("text", sm.text());
            } else if (m instanceof UserMessage um) {
                map.put("text", um.singleText());
            } else if (m instanceof AiMessage am) {
                map.put("text", am.text());
                if (am.toolExecutionRequests() != null && !am.toolExecutionRequests().isEmpty()) {
                    List<Map<String, Object>> reqs = new ArrayList<>();
                    for (ToolExecutionRequest r : am.toolExecutionRequests()) {
                        Map<String, Object> rm = new LinkedHashMap<>();
                        rm.put("id", r.id());
                        rm.put("name", r.name());
                        rm.put("arguments", r.arguments());
                        reqs.add(rm);
                    }
                    map.put("toolRequests", reqs);
                }
            } else if (m instanceof ToolExecutionResultMessage tm) {
                map.put("id", tm.id());
                map.put("toolName", tm.toolName());
                map.put("text", tm.text());
            }
            return json.writeValueAsString(map);
        } catch (Exception e) {
            return "{}";
        }
    }

    @SuppressWarnings("unchecked")
    private ChatMessage deserialize(String role, String content) {
        try {
            Map<String, Object> map = json.readValue(content, new TypeReference<>() {});
            String text = String.valueOf(map.getOrDefault("text", ""));
            return switch (role) {
                case "SYSTEM" -> SystemMessage.from(text);
                case "USER" -> UserMessage.from(text);
                case "ASSISTANT" -> {
                    if (map.containsKey("toolRequests")) {
                        List<Map<String, Object>> reqs = (List<Map<String, Object>>) map.get("toolRequests");
                        List<ToolExecutionRequest> list = new ArrayList<>();
                        for (Map<String, Object> r : reqs) {
                            list.add(ToolExecutionRequest.builder()
                                    .id(String.valueOf(r.get("id")))
                                    .name(String.valueOf(r.get("name")))
                                    .arguments(String.valueOf(r.get("arguments")))
                                    .build());
                        }
                        yield AiMessage.builder().text(text).toolExecutionRequests(list).build();
                    }
                    yield AiMessage.from(text);
                }
                case "TOOL" -> ToolExecutionResultMessage.from(
                        String.valueOf(map.getOrDefault("id", "")),
                        String.valueOf(map.getOrDefault("toolName", "")),
                        text);
                default -> null;
            };
        } catch (Exception e) {
            return null;
        }
    }
}
