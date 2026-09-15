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

    @Select("SELECT " + COLS + " FROM conversations WHERE user_id = #{userId} ORDER BY conversation_id")
    List<Domain.Conversation> listForUser(String userId);

    @Select("SELECT " + COLS + " FROM conversations WHERE merchant_id = #{merchantId} ORDER BY conversation_id")
    List<Domain.Conversation> listForMerchant(String merchantId);

    @Insert("INSERT INTO conversations(conversation_id, order_id, user_id, merchant_id, user_read, merchant_read) "
            + "VALUES(#{id}, #{orderId}, #{userId}, #{merchantId}, #{userRead}, #{merchantRead})")
    int insert(Domain.Conversation conversation);

    @Update("UPDATE conversations SET user_read = #{userRead}, merchant_read = #{merchantRead} "
            + "WHERE conversation_id = #{id}")
    int updateReadFlags(@Param("id") String id, @Param("userRead") boolean userRead,
                        @Param("merchantRead") boolean merchantRead);
}
