package com.elm.practice.ai;

import com.elm.practice.common.ApiResponse;
import com.elm.practice.common.ApiException;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.util.Map;
import java.util.UUID;

/**
 * AI 点餐助手对话接口。
 * 会话 ID 优先取前端传入的 sessionId，未传则基于 HttpSession 生成，保证多轮对话记忆。
 * 未配置 DASHSCOPE_API_KEY 时返回 503，不影响其他接口。
 */
@RestController
@RequestMapping("/api/v1/ai")
public class AiChatController {

    private final AiChat aiChat;

    @Value("${deepseek.api-key:}")
    private String apiKey;

    public AiChatController(AiChat aiChat) { this.aiChat = aiChat; }

    /** 非流式对话：一次性返回完整回复。 */
    @PostMapping("/chat")
    public ApiResponse<Map<String, String>> chat(@RequestBody ChatRequest req, HttpSession session) {
        checkEnabled();
        String sid = resolveSessionId(req, session);
        String reply = aiChat.chat(sid, req.getPrompt());
        return ApiResponse.success(Map.of("sessionId", sid, "reply", reply));
    }

    /** 流式对话：以 text/event-stream 分段返回。 */
    @PostMapping(value = "/stream-chat", produces = "text/event-stream")
    public Flux<String> streamChat(@RequestBody ChatRequest req, HttpSession session) {
        checkEnabled();
        String sid = resolveSessionId(req, session);
        return aiChat.streamChat(sid, req.getPrompt());
    }

    private void checkEnabled() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, 50301,
                    "AI 点餐助手未配置 DEEPSEEK_API_KEY，暂不可用", null);
        }
    }

    private String resolveSessionId(ChatRequest req, HttpSession session) {
        if (req != null && req.getSessionId() != null && !req.getSessionId().isBlank()) {
            return req.getSessionId();
        }
        String key = "ai_session_id";
        String sid = (String) session.getAttribute(key);
        if (sid == null) {
            sid = UUID.randomUUID().toString().replace("-", "");
            session.setAttribute(key, sid);
        }
        return sid;
    }

    public static class ChatRequest {
        private String sessionId;
        private String prompt;
        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }
        public String getPrompt() { return prompt; }
        public void setPrompt(String prompt) { this.prompt = prompt; }
    }
}
