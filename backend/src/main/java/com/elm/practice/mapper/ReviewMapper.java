package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface ReviewMapper {
    String COLS = "review_id AS id, order_id AS orderId, store_id AS storeId, user_id AS userId, content, rating, "
            + "reply, DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS createdAt, "
            + "DATE_FORMAT(replied_at,'%Y-%m-%d %H:%i:%s') AS repliedAt";

    @Select("SELECT " + COLS + " FROM reviews WHERE review_id = #{id}")
    Domain.Review findById(String id);

    @Select("<script>"
            + "SELECT " + COLS + " FROM reviews WHERE store_id = #{storeId}"
            + " <if test='rating != null'> AND rating = #{rating}</if>"
            + " ORDER BY created_at DESC, review_id DESC"
            + "</script>")
    List<Domain.Review> findByStore(@Param("storeId") String storeId, @Param("rating") Integer rating);

    @Insert("INSERT INTO reviews(review_id, order_id, store_id, user_id, content, rating, reply, created_at, replied_at) "
            + "VALUES(#{id}, #{orderId}, #{storeId}, #{userId}, #{content}, #{rating}, #{reply}, "
            + "STR_TO_DATE(#{createdAt},'%Y-%m-%d %H:%i:%s'), STR_TO_DATE(#{repliedAt},'%Y-%m-%d %H:%i:%s'))")
    int insert(Domain.Review review);

    @Update("UPDATE reviews SET reply = #{reply}, replied_at = STR_TO_DATE(#{repliedAt},'%Y-%m-%d %H:%i:%s') "
            + "WHERE review_id = #{id}")
    int updateReply(@Param("id") String id, @Param("reply") String reply, @Param("repliedAt") String repliedAt);
}
