package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.math.BigDecimal;
import java.util.List;

@Mapper
public interface CouponMapper {
    String COLS = "coupon_id AS id, user_id AS userId, name, amount, threshold, scope, store_id AS storeId, "
            + "DATE_FORMAT(valid_from,'%Y-%m-%d %H:%i:%s') AS validFrom, "
            + "DATE_FORMAT(valid_to,'%Y-%m-%d %H:%i:%s') AS validTo, "
            + "used, used_order_id AS usedOrderId, source, can_blast AS canBlast, pack_id AS packId";

    /** 行锁读取：下单选用/爆出替换在事务内串行化（契约 §3.8 并发下一单一红包）。 */
    @Select("SELECT " + COLS + " FROM coupons WHERE coupon_id = #{couponId} FOR UPDATE")
    Domain.Coupon findByIdForUpdate(String couponId);

    /** 状态仅表达有效期：available=当前在有效期窗口内（used 单独回显），expired=已过 validTo。
     *  时间统一东八区：valid_from/valid_to 存东八区文本，NOW() 取 UTC 故加 8 小时对齐。 */
    @Select("<script>SELECT " + COLS + " FROM coupons WHERE user_id = #{userId} "
            + "<if test='available'> AND valid_from &lt;= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR) "
            + "AND valid_to &gt;= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR) </if>"
            + "<if test='!available'> AND valid_to &lt; DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR) </if>"
            + " ORDER BY valid_to DESC, coupon_id</script>")
    List<Domain.Coupon> listByUser(@Param("userId") String userId, @Param("available") boolean available);

    /** 当前订单可用：未用、在有效期、门槛 ≤ 商品小计、全场或本店；门槛基数=商品小计（契约 §3.8）。 */
    @Select("SELECT " + COLS + " FROM coupons WHERE user_id = #{userId} AND used = FALSE "
            + "AND valid_from <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR) "
            + "AND valid_to >= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR) "
            + "AND threshold <= #{amount} "
            + "AND (scope = 'ALL' OR (scope = 'STORE' AND store_id = #{storeId})) "
            + "ORDER BY amount DESC, coupon_id")
    List<Domain.Coupon> listUsable(@Param("userId") String userId, @Param("storeId") String storeId,
                                   @Param("amount") BigDecimal amount);

    @Insert("INSERT INTO coupons(coupon_id,user_id,name,amount,threshold,scope,store_id,valid_from,valid_to,"
            + "used,used_order_id,source,can_blast,pack_id) VALUES("
            + "#{id},#{userId},#{name},#{amount},#{threshold},#{scope},#{storeId},"
            + "STR_TO_DATE(#{validFrom},'%Y-%m-%d %H:%i:%s'),STR_TO_DATE(#{validTo},'%Y-%m-%d %H:%i:%s'),"
            + "#{used},#{usedOrderId},#{source},#{canBlast},#{packId})")
    int insert(Domain.Coupon c);

    /** 消耗券爆出：替换式原地更新，条件限定未用且可爆（0 行=状态冲突，由 Service 转 409）。 */
    @Update("UPDATE coupons SET threshold=#{threshold}, amount=#{amount}, "
            + "valid_from=STR_TO_DATE(#{validFrom},'%Y-%m-%d %H:%i:%s'), "
            + "valid_to=STR_TO_DATE(#{validTo},'%Y-%m-%d %H:%i:%s'), "
            + "source='BLAST_OUT', can_blast=FALSE WHERE coupon_id=#{couponId} AND used=FALSE AND can_blast=TRUE")
    int blastReplace(@Param("couponId") String couponId, @Param("threshold") BigDecimal threshold,
                     @Param("amount") BigDecimal amount, @Param("validFrom") String validFrom,
                     @Param("validTo") String validTo);

    /** 下单核销：条件更新保证同一券并发下只能被一个订单占用（0 行=已被占用，事务整体回滚）。 */
    @Update("UPDATE coupons SET used=TRUE, used_order_id=#{orderId} "
            + "WHERE coupon_id=#{couponId} AND user_id=#{userId} AND used=FALSE")
    int markUsed(@Param("couponId") String couponId, @Param("userId") String userId,
                 @Param("orderId") String orderId);
}
