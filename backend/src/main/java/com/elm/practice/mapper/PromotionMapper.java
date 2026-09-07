package com.elm.practice.mapper;

import org.apache.ibatis.annotations.*;

import java.util.Map;

@Mapper
public interface PromotionMapper {
    @Select("SELECT store_id AS storeId, enabled, threshold, amount FROM promotions WHERE store_id = #{storeId}")
    Map<String, Object> findByStore(String storeId);

    @Insert("INSERT INTO promotions(store_id, enabled, threshold, amount) "
            + "VALUES(#{storeId}, #{enabled}, #{threshold}, #{amount}) "
            + "ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), threshold = VALUES(threshold), amount = VALUES(amount)")
    int upsert(@Param("storeId") String storeId, @Param("enabled") boolean enabled,
               @Param("threshold") java.math.BigDecimal threshold, @Param("amount") java.math.BigDecimal amount);
}
