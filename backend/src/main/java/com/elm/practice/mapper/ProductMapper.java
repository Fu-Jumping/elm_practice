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

    // ---- 搜索增强（2026-09-15，TODO-BE-025）：多关键词全量召回（重映射后 Java 打分） ----
    String MULTI_WHERE = " FROM products p JOIN stores s ON s.store_id = p.store_id"
            + " WHERE s.status != 'CLOSED' AND p.on_sale = TRUE"
            + " AND (<foreach collection='ks' item='k' separator=' OR '>"
            + "p.name LIKE CONCAT('%', #{k}, '%')</foreach>)";

    @Select("<script>SELECT p.product_id AS id, p.store_id AS storeId, p.category_id AS categoryId, p.name,"
            + " p.description, p.image, p.price, p.member_price AS memberPrice, p.tags AS tagsJson,"
            + " p.spec_options AS specOptionsJson, p.stock, p.on_sale AS onSale, p.sales"
            + MULTI_WHERE + " ORDER BY p.sales DESC, p.product_id</script>")
    List<Domain.Product> searchProductsByKeywords(@Param("ks") java.util.List<String> ks);

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

    /**
     * 契约 §3.6 搜索的商品组：商品名命中，且所属店铺对用户端可见（CLOSED 隐藏）；
     * 分类条件接受商品自身 categoryId、店铺自身分类，或平台级课程分类（批次⑨ C1）。
     */
    String SEARCH_FROM = " FROM products WHERE on_sale = TRUE"
            + " AND EXISTS (SELECT 1 FROM stores s WHERE s.store_id = products.store_id AND s.status != 'CLOSED')"
            + " <if test=\"k != null and k != ''\"> AND LOWER(name) LIKE CONCAT('%', #{k}, '%') </if>"
            + " <if test=\"categoryId != null and categoryId != ''\">"
            + " AND (category_id = #{categoryId}"
            + " OR EXISTS (SELECT 1 FROM categories c WHERE c.store_id = products.store_id AND c.category_id = #{categoryId})"
            + " OR EXISTS (SELECT 1 FROM platform_category_stores pcs WHERE pcs.store_id = products.store_id AND pcs.category_id = #{categoryId}))</if>";

    @Select("<script>SELECT " + COLS + SEARCH_FROM + " ORDER BY sales DESC, product_id LIMIT #{limit} OFFSET #{offset}</script>")
    List<Domain.Product> searchByName(@Param("k") String k, @Param("categoryId") String categoryId,
                                      @Param("limit") int limit, @Param("offset") int offset);

    @Select("<script>SELECT COUNT(*)" + SEARCH_FROM + "</script>")
    long countSearchByName(@Param("k") String k, @Param("categoryId") String categoryId);
}
