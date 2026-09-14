package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface OrderItemMapper {
    @Select("SELECT product_id AS productId,name,image,category_id AS categoryId,spec_key AS specKey,"
            + "spec_options AS specOptionsJson,unit_price AS unitPrice,quantity,unit_price*quantity AS subtotal "
            + "FROM order_items WHERE order_id=#{orderId} ORDER BY product_id,spec_key")
    List<Domain.OrderItem> findByOrder(String orderId);

    @Insert("INSERT INTO order_items(order_id,product_id,name,image,category_id,spec_key,spec_options,unit_price,quantity) "
            + "VALUES(#{orderId},#{item.productId},#{item.name},#{item.image},#{item.categoryId},"
            + "#{item.specKey},#{item.specOptionsJson},#{item.unitPrice},#{item.quantity})")
    int insert(@Param("orderId") String orderId,@Param("item") Domain.OrderItem item);
}
