package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface StoreMapper {
    String COLS = "store_id AS id, merchant_id AS merchantId, name, description, image, rating, "
            + "monthly_sales AS monthlySales, delivery_minutes AS deliveryMinutes, "
            + "start_price AS startPrice, delivery_fee AS deliveryFee, status";

    @Select("SELECT " + COLS + " FROM stores WHERE store_id = #{id}")
    Domain.Store findById(String id);

    /** 用户端可见列表：CLOSED 隐藏、TEMPORARILY_CLOSED 可见；关键词/分类过滤与排序下推 SQL（默认序=store_id，等价原插入序）。 */
    @Select("<script>"
            + "SELECT " + COLS + " FROM stores WHERE status != 'CLOSED'"
            + " <if test='k != null and k != \"\"'>"
            + " AND (LOWER(name) LIKE CONCAT('%', #{k}, '%') OR LOWER(description) LIKE CONCAT('%', #{k}, '%'))"
            + " </if>"
            + " <if test='categoryId != null and categoryId != \"\"'>"
            + " AND EXISTS (SELECT 1 FROM categories c WHERE c.store_id = stores.store_id AND c.category_id = #{categoryId})"
            + " </if>"
            + " <choose>"
            + " <when test=\"sort == '销量'\">ORDER BY monthly_sales DESC, store_id</when>"
            + " <otherwise>ORDER BY store_id</otherwise>"
            + " </choose>"
            + "</script>")
    List<Domain.Store> listVisible(@Param("k") String k, @Param("categoryId") String categoryId, @Param("sort") String sort);

    @Insert("INSERT INTO stores(store_id, merchant_id, name, description, image, rating, monthly_sales, "
            + "delivery_minutes, start_price, delivery_fee, status) "
            + "VALUES(#{id}, #{merchantId}, #{name}, #{description}, #{image}, #{rating}, #{monthlySales}, "
            + "#{deliveryMinutes}, #{startPrice}, #{deliveryFee}, #{status})")
    int insert(Domain.Store store);

    @Update("UPDATE stores SET name = #{name}, description = #{description}, image = #{image}, "
            + "start_price = #{startPrice}, delivery_fee = #{deliveryFee}, status = #{status} WHERE store_id = #{id}")
    int updateFull(Domain.Store store);
}
