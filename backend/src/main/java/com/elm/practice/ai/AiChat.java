package com.elm.practice.ai;

import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.UserMessage;
import reactor.core.publisher.Flux;

/**
 * AI 点餐助手对话接口。
 * 系统提示词由 AiChatConfig 的 systemMessageProvider 动态生成（含平台商家商品知识库）。
 */
public interface AiChat {

    String chat(@MemoryId String sessionId, @UserMessage String prompt);

    Flux<String> streamChat(@MemoryId String sessionId, @UserMessage String prompt);
}
