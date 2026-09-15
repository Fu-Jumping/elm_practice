package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface ReviewMapper {
    String COLS = "review_id AS id,order_id AS orderId,store_id AS storeId,user_id AS userId,"
            + "(SELECT nickname FROM users u WHERE u.user_id=reviews.user_id) AS userNickname,"
            + "content,rating,tags AS tagsJson,images AS imagesJson,reply,"
            + "DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS createdAt,"
            + "DATE_FORMAT(replied_at,'%Y-%m-%d %H:%i:%s') AS repliedAt";

    @Select("SELECT " + COLS + " FROM reviews WHERE review_id=#{id}")
    Domain.Review findById(String id);

    @Select("<script>SELECT " + COLS + " FROM reviews WHERE store_id=#{storeId}"
            + " <if test='rating != null'> AND rating=#{rating}</if>"
            + " <if test='filter == \"有图\"'> AND images IS NOT NULL AND JSON_LENGTH(images) &gt; 0</if>"
            + " <if test='filter == \"好评\"'> AND rating &gt;= 4</if>"
            + " <if test='filter == \"差评\"'> AND rating &lt;= 3</if>"
            + " ORDER BY created_at DESC,review_id DESC</script>")
    List<Domain.Review> findByStore(@Param("storeId") String storeId,@Param("rating") Integer rating,@Param("filter") String filter);

    @Insert("INSERT INTO reviews(review_id,order_id,store_id,user_id,content,rating,tags,images,reply,created_at,replied_at) "
            + "VALUES(#{id},#{orderId},#{storeId},#{userId},#{content},#{rating},#{tagsJson},#{imagesJson},#{reply},"
            + "STR_TO_DATE(#{createdAt},'%Y-%m-%d %H:%i:%s'),STR_TO_DATE(#{repliedAt},'%Y-%m-%d %H:%i:%s'))")
    int insert(Domain.Review review);

    @Update("UPDATE reviews SET reply=#{reply},replied_at=STR_TO_DATE(#{repliedAt},'%Y-%m-%d %H:%i:%s') WHERE review_id=#{id}")
    int updateReply(@Param("id") String id,@Param("reply") String reply,@Param("repliedAt") String repliedAt);

    /** 评价聚合（Wave3，契约 §6.2）：平均分（1 位小数四舍五入）+ 总数，不随筛选变化。 */
    @Select("SELECT ROUND(AVG(rating),1) AS averageRating, COUNT(*) AS totalCount FROM reviews WHERE store_id=#{storeId}")
    java.util.Map<String,Object> summarizeByStore(@Param("storeId") String storeId);

    @Select("SELECT COUNT(*) FROM reviews WHERE order_id=#{orderId}")
    int countByOrder(String orderId);

    @Select("SELECT COUNT(*) FROM reviews WHERE store_id=#{storeId} AND (reply IS NULL OR TRIM(reply)='')")
    long countUnrepliedByStore(String storeId);
}
