package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface ProductMapper {
    String COLS = "product_id AS id, store_id AS storeId, category_id AS categoryId, name, description, image, "
            + "price, member_price AS memberPrice, tags AS tagsJson, spec_options AS specOptionsJson, "
            + "stock, on_sale AS onSale, sales";

    @Select("SELECT " + COLS + " FROM products WHERE product_id = #{id}")
    Domain.Product findById(String id);

    @Select("SELECT " + COLS + " FROM products WHERE product_id = #{id} FOR UPDATE")
    Domain.Product findByIdForUpdate(String id);

    @Select("<script>SELECT " + COLS + " FROM products WHERE store_id = #{storeId}"
            + " <if test='categoryId != null and categoryId != \"\"'> AND category_id = #{categoryId}</if>"
            + " <if test='onSaleOnly'> AND on_sale = TRUE</if>"
            + " ORDER BY sales DESC, product_id</script>")
    List<Domain.Product> findByStore(@Param("storeId") String storeId,
                                     @Param("categoryId") String categoryId,
                                     @Param("onSaleOnly") boolean onSaleOnly);

    @Insert("INSERT INTO products(product_id,store_id,category_id,name,description,image,price,member_price,tags,spec_options,stock,on_sale,sales) "
            + "VALUES(#{id},#{storeId},#{categoryId},#{name},#{description},#{image},#{price},#{memberPrice},"
            + "#{tagsJson},#{specOptionsJson},#{stock},#{onSale},#{sales})")
    int insert(Domain.Product product);

    @Update("UPDATE products SET name=#{name},description=#{description},image=#{image},category_id=#{categoryId},"
            + "price=#{price},member_price=#{memberPrice},tags=#{tagsJson},spec_options=#{specOptionsJson},"
            + "stock=#{stock},on_sale=#{onSale} WHERE product_id=#{id}")
    int updateFull(Domain.Product product);

    @Update("UPDATE products SET category_id=#{categoryId} WHERE product_id=#{productId}")
    int updateCategory(@Param("productId") String productId, @Param("categoryId") String categoryId);

    @Delete("DELETE FROM products WHERE product_id = #{id}")
    int delete(String id);

    @Update("UPDATE products SET stock=stock-#{quantity},sales=sales+#{quantity} "
            + "WHERE product_id=#{productId} AND stock>=#{quantity}")
    int decreaseStock(@Param("productId") String productId,@Param("quantity") int quantity);

    @Update("UPDATE products SET stock=stock+#{quantity},sales=GREATEST(0,sales-#{quantity}) WHERE product_id=#{productId}")
    int restoreStock(@Param("productId") String productId,@Param("quantity") int quantity);

    @Select("SELECT COUNT(*) FROM products WHERE category_id=#{categoryId}")
    long countByCategory(String categoryId);
    @Select("SELECT COUNT(*) FROM products WHERE store_id=#{storeId}")
    long countByStore(String storeId);
}
