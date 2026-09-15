package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.util.List;

/** 商家收藏（批次⑨，契约 §3.7）：只读写当前用户；(user_id, store_id) 唯一，重复收藏幂等。 */
@Mapper
public interface FavoriteMapper {
    String COLS = "favorite_id AS id, user_id AS userId, store_id AS storeId, "
            + "DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS createdAt";

    /** 列表按收藏时间倒序（契约 §3.7）。 */
    @Select("SELECT " + COLS + " FROM favorites WHERE user_id = #{userId} "
            + "ORDER BY created_at DESC, favorite_id DESC")
    List<Domain.Favorite> findByUser(String userId);

    @Select("SELECT " + COLS + " FROM favorites WHERE user_id = #{userId} AND store_id = #{storeId}")
    Domain.Favorite findOne(@Param("userId") String userId, @Param("storeId") String storeId);

    @Insert("INSERT INTO favorites(favorite_id,user_id,store_id,created_at) "
            + "VALUES(#{id},#{userId},#{storeId},STR_TO_DATE(#{createdAt},'%Y-%m-%d %H:%i:%s'))")
    int insert(Domain.Favorite favorite);

    @Delete("DELETE FROM favorites WHERE user_id = #{userId} AND store_id = #{storeId}")
    int delete(@Param("userId") String userId, @Param("storeId") String storeId);
}
