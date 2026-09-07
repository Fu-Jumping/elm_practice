package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface OrderItemMapper {
    @Select("SELECT product_id AS productId, name, image, category_id AS categoryId, "
            + "unit_price AS unitPrice, quantity, unit_price * quantity AS subtotal "
            + "FROM order_items WHERE order_id = #{orderId} ORDER BY product_id")
    List<Domain.OrderItem> findByOrder(String orderId);

    @Insert("INSERT INTO order_items(order_id, product_id, name, image, category_id, unit_price, quantity) "
            + "VALUES(#{orderId}, #{item.productId}, #{item.name}, #{item.image}, #{item.categoryId}, "
            + "#{item.unitPrice}, #{item.quantity})")
    int insert(@Param("orderId") String orderId, @Param("item") Domain.OrderItem item);
}
