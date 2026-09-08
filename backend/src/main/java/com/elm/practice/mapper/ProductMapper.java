package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface ProductMapper {
    String COLS = "product_id AS id, store_id AS storeId, category_id AS categoryId, name, description, image, "
            + "price, stock, on_sale AS onSale, sales";

    @Select("SELECT " + COLS + " FROM products WHERE product_id = #{id}")
    Domain.Product findById(String id);

    /** 事务内行锁读：购物车加购/修改以最新库存为界。 */
    @Select("SELECT " + COLS + " FROM products WHERE product_id = #{id} FOR UPDATE")
    Domain.Product findByIdForUpdate(String id);

    @Select("<script>"
            + "SELECT " + COLS + " FROM products WHERE store_id = #{storeId}"
            + " <if test='categoryId != null and categoryId != \"\"'> AND category_id = #{categoryId}</if>"
            + " <if test='onSaleOnly'> AND on_sale = TRUE</if>"
            + " ORDER BY sales DESC, product_id"
            + "</script>")
    List<Domain.Product> findByStore(@Param("storeId") String storeId,
                                     @Param("categoryId") String categoryId,
                                     @Param("onSaleOnly") boolean onSaleOnly);

    @Insert("INSERT INTO products(product_id, store_id, category_id, name, description, image, price, stock, on_sale, sales) "
            + "VALUES(#{id}, #{storeId}, #{categoryId}, #{name}, #{description}, #{image}, #{price}, #{stock}, #{onSale}, #{sales})")
    int insert(Domain.Product product);

    @Update("UPDATE products SET name = #{name}, description = #{description}, image = #{image}, "
            + "category_id = #{categoryId}, price = #{price}, stock = #{stock}, on_sale = #{onSale} WHERE product_id = #{id}")
    int updateFull(Domain.Product product);

    @Delete("DELETE FROM products WHERE product_id = #{id}")
    int delete(String id);

    /** 下单扣库存：WHERE stock >= 条件兜底并发，affected rows = 0 即 40901 并整体回滚。 */
    @Update("UPDATE products SET stock = stock - #{quantity}, sales = sales + #{quantity} "
            + "WHERE product_id = #{productId} AND stock >= #{quantity}")
    int decreaseStock(@Param("productId") String productId, @Param("quantity") int quantity);

    @Select("SELECT COUNT(*) FROM products WHERE category_id = #{categoryId}")
    long countByCategory(String categoryId);

    @Select("SELECT COUNT(*) FROM products WHERE store_id = #{storeId}")
    long countByStore(String storeId);
}
