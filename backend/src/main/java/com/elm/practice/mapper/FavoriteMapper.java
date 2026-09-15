package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface FavoriteMapper {
    String COLS = "f.favorite_id AS id, f.user_id AS userId, f.store_id AS storeId, "
            + "DATE_FORMAT(f.created_at,'%Y-%m-%d %H:%i:%s') AS createdAt, "
            + "s.name AS storeName, s.image, s.status AS storeStatus, s.rating, s.delivery_fee AS deliveryFee, "
            + "s.monthly_sales AS monthlySales, s.delivery_minutes AS deliveryMinutes";

    @Select("SELECT " + COLS + " FROM favorites f JOIN stores s ON s.store_id = f.store_id "
            + "WHERE f.user_id = #{userId} ORDER BY f.created_at DESC, f.favorite_id DESC")
    List<Domain.Favorite> listByUser(String userId);

    @Select("SELECT " + COLS + " FROM favorites f JOIN stores s ON s.store_id = f.store_id "
            + "WHERE f.user_id = #{userId} AND f.store_id = #{storeId}")
    Domain.Favorite findByUserStore(@Param("userId") String userId, @Param("storeId") String storeId);

    // INSERT IGNORE：(user_id, store_id) 唯一键冲突时 affectedRows=0，配合先查实现重复收藏幂等。
    @Insert("INSERT IGNORE INTO favorites(favorite_id, user_id, store_id, created_at) "
            + "VALUES(#{id}, #{userId}, #{storeId}, STR_TO_DATE(#{createdAt},'%Y-%m-%d %H:%i:%s'))")
    int insert(Domain.Favorite favorite);

    @Delete("DELETE FROM favorites WHERE user_id = #{userId} AND store_id = #{storeId}")
    int delete(@Param("userId") String userId, @Param("storeId") String storeId);
}
