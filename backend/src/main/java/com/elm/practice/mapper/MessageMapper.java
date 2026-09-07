package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface MessageMapper {
    String COLS = "message_id AS id, conversation_id AS conversationId, sender_id AS senderId, "
            + "sender_role AS senderRole, content, DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS createdAt";

    @Select("SELECT " + COLS + " FROM messages WHERE conversation_id = #{conversationId} "
            + "ORDER BY created_at, message_id")
    List<Domain.Message> findByConversation(String conversationId);

    @Insert("INSERT INTO messages(message_id, conversation_id, sender_id, sender_role, content, created_at) "
            + "VALUES(#{id}, #{conversationId}, #{senderId}, #{senderRole}, #{content}, "
            + "STR_TO_DATE(#{createdAt},'%Y-%m-%d %H:%i:%s'))")
    int insert(Domain.Message message);
}
