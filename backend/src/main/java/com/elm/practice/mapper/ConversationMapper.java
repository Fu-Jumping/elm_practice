package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface ConversationMapper {
    String COLS = "conversation_id AS id, order_id AS orderId, user_id AS userId, merchant_id AS merchantId, "
            + "(SELECT nickname FROM users u WHERE u.user_id=conversations.user_id) AS userNickname, "
            + "(SELECT o.store_id FROM orders o WHERE o.order_id=conversations.order_id) AS storeId, "
            + "(SELECT s.name FROM stores s WHERE s.store_id=(SELECT o.store_id FROM orders o WHERE o.order_id=conversations.order_id)) AS storeName, "
            + "user_read AS userRead, merchant_read AS merchantRead";

    @Select("SELECT " + COLS + " FROM conversations WHERE conversation_id = #{id}")
    Domain.Conversation findById(String id);

    /**
     * 列表排序（契约 §6.1，2026-09-16 回写，BUG-20260916-004）：按**最后一条消息时间倒序**——
     * 用户端「消息」页与商家端「消息」页的会话列表都以「最近有消息的会话」在最上为准。
     * 无消息的会话排在最后（`MAX(created_at)` 为 NULL，MySQL 在 DESC 下把 NULL 放末尾）；
     * 时间相同时按会话号倒序（后建的会话在前）。原实现只按 `conversation_id`（≈建会话先后），
     * 会让「老会话刚收到新消息」沉在下面，两端都表现为「最新的会话在最底部」。
     */
    String ORDER_BY_LAST_MESSAGE = " ORDER BY (SELECT MAX(m.created_at) FROM messages m "
            + "WHERE m.conversation_id = conversations.conversation_id) DESC, conversation_id DESC";

    @Select("SELECT " + COLS + " FROM conversations WHERE user_id = #{userId}" + ORDER_BY_LAST_MESSAGE)
    List<Domain.Conversation> listForUser(String userId);

    @Select("SELECT " + COLS + " FROM conversations WHERE merchant_id = #{merchantId}" + ORDER_BY_LAST_MESSAGE)
    List<Domain.Conversation> listForMerchant(String merchantId);

    @Insert("INSERT INTO conversations(conversation_id, order_id, user_id, merchant_id, user_read, merchant_read) "
            + "VALUES(#{id}, #{orderId}, #{userId}, #{merchantId}, #{userRead}, #{merchantRead})")
    int insert(Domain.Conversation conversation);

    @Update("UPDATE conversations SET user_read = #{userRead}, merchant_read = #{merchantRead} "
            + "WHERE conversation_id = #{id}")
    int updateReadFlags(@Param("id") String id, @Param("userRead") boolean userRead,
                        @Param("merchantRead") boolean merchantRead);
}
