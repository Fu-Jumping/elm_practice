package com.elm.practice.ai;

import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.store.memory.chat.ChatMemoryStore;

import java.util.List;

/**
 * 适配 LangChain4j ChatMemoryStore 接口到 MysqlChatMemoryStore（基于 MySQL 实现）。
 */
public class LangChainChatMemoryStoreAdapter implements ChatMemoryStore {

    private final MysqlChatMemoryStore delegate;
    private final String sessionId;

    public LangChainChatMemoryStoreAdapter(MysqlChatMemoryStore delegate, String sessionId) {
        this.delegate = delegate;
        this.sessionId = sessionId;
    }

    @Override
    public List<ChatMessage> getMessages(Object memoryId) {
        return delegate.getMessages(sessionId);
    }

    @Override
    public void updateMessages(Object memoryId, List<ChatMessage> messages) {
        delegate.updateMessages(sessionId, messages);
    }

    @Override
    public void deleteMessages(Object memoryId) {
        delegate.deleteMessages(sessionId);
    }
}
