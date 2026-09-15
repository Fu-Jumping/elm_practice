package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface StoreMapper {
    String COLS = "store_id AS id, merchant_id AS merchantId, name, description, image, rating, "
            + "monthly_sales AS monthlySales, delivery_minutes AS deliveryMinutes, "
            + "start_price AS startPrice, delivery_fee AS deliveryFee, status, "
            + "distance_km AS distanceKm";

    /**
     * 排序口径（契约 §3.2 与 §3.6 共用）：综合 = 销量优先、评分次之（不做加权）；
     * 销量 = monthlySales 倒序；距离 = 种子字段 distanceKm 升序（NULL 排最后，不引入地图与定位服务）。
     */
    String ORDER_CLAUSE = " <choose>"
            + " <when test=\"sort == '销量'\">ORDER BY monthly_sales DESC, store_id</when>"
            + " <when test=\"sort == '距离'\">ORDER BY distance_km IS NULL, distance_km, store_id</when>"
            + " <otherwise>ORDER BY monthly_sales DESC, rating DESC, store_id</otherwise>"
            + " </choose>";

    /** 分类条件：同时接受店铺自身 categories 与平台级课程分类（批次⑨ C1）。 */
    String CATEGORY_CLAUSE = " <if test=\"categoryId != null and categoryId != ''\">"
            + " AND (EXISTS (SELECT 1 FROM categories c WHERE c.store_id = stores.store_id AND c.category_id = #{categoryId})"
            + " OR EXISTS (SELECT 1 FROM platform_category_stores pcs WHERE pcs.store_id = stores.store_id AND pcs.category_id = #{categoryId}))"
            + " </if>";

    /** 契约 §3.6 搜索的商家组：商家名命中，或该店任一商品名命中后回带所属商家。 */
    String SEARCH_K_CLAUSE = " <if test=\"k != null and k != ''\">"
            + " AND (LOWER(stores.name) LIKE CONCAT('%', #{k}, '%')"
            + " OR EXISTS (SELECT 1 FROM products p WHERE p.store_id = stores.store_id AND LOWER(p.name) LIKE CONCAT('%', #{k}, '%')))"
            + " </if>";

    @Select("SELECT " + COLS + " FROM stores WHERE store_id = #{id}")
    Domain.Store findById(String id);

    /** 用户端可见列表（契约 §3.2）：CLOSED 隐藏、TEMPORARILY_CLOSED 可见；关键词/分类过滤与排序下推 SQL。 */
    @Select("<script>"
            + "SELECT " + COLS + " FROM stores WHERE status != 'CLOSED'"
            + " <if test=\"k != null and k != ''\">"
            + " AND (LOWER(name) LIKE CONCAT('%', #{k}, '%') OR LOWER(description) LIKE CONCAT('%', #{k}, '%'))"
            + " </if>"
            + CATEGORY_CLAUSE
            + ORDER_CLAUSE
            + "</script>")
    List<Domain.Store> listVisible(@Param("k") String k, @Param("categoryId") String categoryId, @Param("sort") String sort);

    @Select("<script>"
            + "SELECT " + COLS + " FROM stores WHERE status != 'CLOSED'"
            + SEARCH_K_CLAUSE
            + CATEGORY_CLAUSE
            + ORDER_CLAUSE
            + " LIMIT #{limit} OFFSET #{offset}</script>")
    List<Domain.Store> searchStores(@Param("k") String k, @Param("categoryId") String categoryId,
                                    @Param("sort") String sort, @Param("limit") int limit, @Param("offset") int offset);

    /** 与 searchStores 同一套过滤条件的命中总数（分页 total）。 */
    @Select("<script>"
            + "SELECT COUNT(*) FROM stores WHERE status != 'CLOSED'"
            + SEARCH_K_CLAUSE
            + CATEGORY_CLAUSE
            + "</script>")
    long countSearchStores(@Param("k") String k, @Param("categoryId") String categoryId);

    @Insert("INSERT INTO stores(store_id, merchant_id, name, description, image, rating, monthly_sales, "
            + "delivery_minutes, start_price, delivery_fee, status) "
            + "VALUES(#{id}, #{merchantId}, #{name}, #{description}, #{image}, #{rating}, #{monthlySales}, "
            + "#{deliveryMinutes}, #{startPrice}, #{deliveryFee}, #{status})")
    int insert(Domain.Store store);

    @Update("UPDATE stores SET name = #{name}, description = #{description}, image = #{image}, "
            + "start_price = #{startPrice}, delivery_fee = #{deliveryFee}, status = #{status} WHERE store_id = #{id}")
    int updateFull(Domain.Store store);

    @Update("UPDATE stores SET status = #{status} WHERE store_id = #{id}")
    int updateStatus(@Param("id") String id, @Param("status") Domain.StoreStatus status);
}
