package com.elm.practice.mapper;

import com.elm.practice.common.AddressSnapshotTypeHandler;
import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Map;

@Mapper
public interface OrderMapper {
    String COLS = "order_id AS id, user_id AS userId, store_id AS storeId, address_id AS addressId, "
            + "address_snapshot, remark, status, item_subtotal AS itemSubtotal, packaging_fee AS packagingFee, "
            + "total, delivery_fee AS deliveryFee, full_reduction_amount AS fullReductionAmount, "
            + "new_customer_amount AS newCustomerAmount, member_discount_amount AS memberDiscountAmount, "
            + "coupon_amount AS couponAmount, delivery_fee_discount AS deliveryFeeDiscount, "
            + "DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS createdAt, "
            + "DATE_FORMAT(paid_at,'%Y-%m-%d %H:%i:%s') AS paidAt, idempotency_key AS idempotencyKey, "
            + "cancel_reason AS cancelReason, DATE_FORMAT(cancelled_at,'%Y-%m-%d %H:%i:%s') AS cancelledAt, "
            + "cancelled_by AS cancelledBy";

    String SNAPSHOT = " @Result(property = \"addressSnapshot\", column = \"address_snapshot\", "
            + "typeHandler = com.elm.practice.common.AddressSnapshotTypeHandler.class)";

    @Select("SELECT " + COLS + " FROM orders WHERE order_id = #{id}")
    @Results(id = "orderWithSnapshot", value = {
            @Result(property = "addressSnapshot", column = "address_snapshot",
                    typeHandler = AddressSnapshotTypeHandler.class)
    })
    Domain.Order findById(String id);

    @Select("SELECT " + COLS + " FROM orders WHERE order_id = #{id} FOR UPDATE")
    @Results({
            @Result(property = "addressSnapshot", column = "address_snapshot",
                    typeHandler = AddressSnapshotTypeHandler.class)
    })
    Domain.Order findByIdForUpdate(String id);

    @Select("SELECT " + COLS + " FROM orders WHERE user_id = #{userId} AND idempotency_key = #{key}")
    @Results({
            @Result(property = "addressSnapshot", column = "address_snapshot",
                    typeHandler = AddressSnapshotTypeHandler.class)
    })
    Domain.Order findByIdempotent(@Param("userId") String userId, @Param("key") String key);

    @Select("<script>"
            + "SELECT " + COLS + " FROM orders WHERE user_id = #{userId}"
            + " <if test='status != null and status != \"\"'> AND status = #{status}</if>"
            + " ORDER BY created_at DESC, order_id DESC"
            + "</script>")
    @Results({
            @Result(property = "addressSnapshot", column = "address_snapshot",
                    typeHandler = AddressSnapshotTypeHandler.class)
    })
    List<Domain.Order> listByUser(@Param("userId") String userId, @Param("status") String status);

    /** 商家端口径：本店铺且未支付订单不可见（契约 §5/PRD 7.6）。 */
    @Select("<script>"
            + "SELECT " + COLS + " FROM orders WHERE store_id = #{storeId} AND status != 'PENDING_PAYMENT'"
            + " <if test='status != null and status != \"\"'> AND status = #{status}</if>"
            + " ORDER BY created_at DESC, order_id DESC"
            + "</script>")
    @Results({
            @Result(property = "addressSnapshot", column = "address_snapshot",
                    typeHandler = AddressSnapshotTypeHandler.class)
    })
    List<Domain.Order> listForMerchant(@Param("storeId") String storeId, @Param("status") String status);

    @Insert("INSERT INTO orders(order_id, user_id, store_id, address_id, address_snapshot, remark, status, "
            + "item_subtotal, packaging_fee, total, delivery_fee, full_reduction_amount, new_customer_amount, "
            + "member_discount_amount, coupon_amount, delivery_fee_discount, created_at, paid_at, idempotency_key) "
            + "VALUES(#{id}, #{userId}, #{storeId}, #{addressId}, "
            + "#{addressSnapshot,typeHandler=com.elm.practice.common.AddressSnapshotTypeHandler}, "
            + "#{remark}, #{status}, #{itemSubtotal}, #{packagingFee}, #{total}, "
            + "#{deliveryFee}, #{fullReductionAmount}, #{newCustomerAmount}, "
            + "#{memberDiscountAmount}, #{couponAmount}, #{deliveryFeeDiscount}, "
            + "STR_TO_DATE(#{createdAt},'%Y-%m-%d %H:%i:%s'), STR_TO_DATE(#{paidAt},'%Y-%m-%d %H:%i:%s'), #{idempotencyKey})")
    int insert(Domain.Order order);

    /** 店铺新客判定（批次①）：该用户在该店铺的历史订单数（下单即算，含待支付）。 */
    @Select("SELECT COUNT(*) FROM orders WHERE user_id = #{userId} AND store_id = #{storeId}")
    int countByUserAndStore(@Param("userId") String userId, @Param("storeId") String storeId);

    /** 条件状态推进：WHERE status=from 保证幂等与防跳级的并发安全。 */
    @Update("UPDATE orders SET status = #{to} WHERE order_id = #{id} AND status = #{from}")
    int updateStatusConditional(@Param("id") String id, @Param("from") Domain.OrderStatus from,
                                @Param("to") Domain.OrderStatus to);

    /** 支付成功：仅 PENDING_PAYMENT 可支付，重复调用 affected=0；支付成功即 PENDING（待接单，TODO-BE-002），PROCESSING 仅 P0 历史兼容。 */
    @Update("UPDATE orders SET status = 'PENDING', paid_at = STR_TO_DATE(#{paidAt},'%Y-%m-%d %H:%i:%s') "
            + "WHERE order_id = #{id} AND status = 'PENDING_PAYMENT'")
    int markPaid(@Param("id") String id, @Param("paidAt") String paidAt);

    @Update("UPDATE orders SET status='CANCELLED', cancel_reason=#{reason}, "
            + "cancelled_at=STR_TO_DATE(#{cancelledAt},'%Y-%m-%d %H:%i:%s'), cancelled_by='USER' "
            + "WHERE order_id=#{id} AND status=#{expected}")
    int cancelConditional(@Param("id") String id, @Param("expected") Domain.OrderStatus expected,
                          @Param("reason") String reason, @Param("cancelledAt") String cancelledAt);

    /** 测试辅助：构造"支付超时"场景数据（正常业务不修改 created_at）。 */
    @Update("UPDATE orders SET created_at = STR_TO_DATE(#{createdAt},'%Y-%m-%d %H:%i:%s') WHERE order_id = #{id}")
    int updateCreatedAt(@Param("id") String id, @Param("createdAt") String createdAt);

    @Select("SELECT COUNT(*) AS orderCount, COALESCE(SUM(total), 0) AS salesAmount FROM orders "
            + "WHERE store_id = #{storeId} AND status != 'PENDING_PAYMENT'")
    Map<String, Object> overviewByStore(String storeId);
}
