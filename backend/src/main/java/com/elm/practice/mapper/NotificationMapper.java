package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.util.List;

/** 站内通知（批次⑨，契约 §3.9）：只返回当前用户通知，按时间倒序；标记已读幂等。 */
@Mapper
public interface NotificationMapper {
    String COLS = "notification_id AS id, user_id AS userId, type, title, content, "
            + "related_id AS relatedId, is_read AS `read`, "
            + "DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS createdAt";

    @Select("SELECT " + COLS + " FROM notifications WHERE user_id = #{userId} "
            + "ORDER BY created_at DESC, notification_id DESC")
    List<Domain.Notification> listByUser(String userId);

    @Select("SELECT " + COLS + " FROM notifications WHERE notification_id = #{id} AND user_id = #{userId}")
    Domain.Notification findOwned(@Param("id") String id, @Param("userId") String userId);

    @Insert("INSERT INTO notifications(notification_id,user_id,type,title,content,related_id,is_read,created_at) "
            + "VALUES(#{id},#{userId},#{type},#{title},#{content},#{relatedId},#{read},"
            + "STR_TO_DATE(#{createdAt},'%Y-%m-%d %H:%i:%s'))")
    int insert(Domain.Notification notification);

    @Update("UPDATE notifications SET is_read = TRUE WHERE notification_id = #{id} AND user_id = #{userId}")
    int markRead(@Param("id") String id, @Param("userId") String userId);

    @Update("UPDATE notifications SET is_read = TRUE WHERE user_id = #{userId} AND is_read = FALSE")
    int markAllRead(String userId);

    @Select("SELECT COUNT(*) FROM notifications WHERE user_id = #{userId} AND is_read = FALSE")
    int countUnread(String userId);
}
