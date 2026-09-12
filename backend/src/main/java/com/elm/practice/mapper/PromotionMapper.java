package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface PromotionMapper {
    /** 配置聚合读（不含阶梯，阶梯走 findTiers）；无行返回 null。 */
    @Select("SELECT enabled, new_user_amount AS newUserAmount, "
            + "free_delivery_threshold AS freeDeliveryThreshold, member_discount AS memberDiscountRate "
            + "FROM promotions WHERE store_id = #{storeId}")
    Domain.PromoConfig findConfig(String storeId);

    @Select("SELECT threshold, amount FROM promotion_tiers WHERE store_id = #{storeId} "
            + "ORDER BY sort_order, threshold")
    List<Domain.PromoTier> findTiers(String storeId);

    @Insert("INSERT INTO promotions(store_id, enabled, threshold, amount, new_user_amount, free_delivery_threshold, member_discount) "
            + "VALUES(#{storeId}, #{enabled}, 0, 0, #{newUserAmount}, #{freeDeliveryThreshold}, #{memberDiscount}) "
            + "ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), new_user_amount = VALUES(new_user_amount), "
            + "free_delivery_threshold = VALUES(free_delivery_threshold), member_discount = VALUES(member_discount)")
    int upsert(@Param("storeId") String storeId, @Param("enabled") boolean enabled,
               @Param("newUserAmount") java.math.BigDecimal newUserAmount,
               @Param("freeDeliveryThreshold") java.math.BigDecimal freeDeliveryThreshold,
               @Param("memberDiscount") java.math.BigDecimal memberDiscount);

    @Delete("DELETE FROM promotion_tiers WHERE store_id = #{storeId}")
    int deleteTiers(String storeId);

    @Insert("INSERT INTO promotion_tiers(store_id, threshold, amount, sort_order) "
            + "VALUES(#{storeId}, #{threshold}, #{amount}, #{sortOrder})")
    int insertTier(@Param("storeId") String storeId, @Param("threshold") java.math.BigDecimal threshold,
                   @Param("amount") java.math.BigDecimal amount, @Param("sortOrder") int sortOrder);
}
