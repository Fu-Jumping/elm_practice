package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface CartLineMapper {
    String COLS = "cart_line_id AS id,user_id AS userId,store_id AS storeId,product_id AS productId,"
            + "spec_key AS specKey,spec_options AS specOptionsJson,quantity,unit_price AS unitPrice,updated_at AS updatedAt";

    @Select("SELECT " + COLS + " FROM cart_lines WHERE cart_line_id=#{id}")
    Domain.CartLine findById(String id);
    @Select("SELECT " + COLS + " FROM cart_lines WHERE user_id=#{userId} AND store_id=#{storeId} ORDER BY cart_line_id")
    List<Domain.CartLine> findByUserAndStore(@Param("userId") String userId,@Param("storeId") String storeId);
    @Select("SELECT " + COLS + " FROM cart_lines WHERE user_id=#{userId} AND store_id=#{storeId} ORDER BY cart_line_id FOR UPDATE")
    List<Domain.CartLine> findByUserAndStoreForUpdate(@Param("userId") String userId,@Param("storeId") String storeId);
    @Select("SELECT " + COLS + " FROM cart_lines WHERE user_id=#{userId} AND store_id=#{storeId} "
            + "AND product_id=#{productId} AND spec_key=#{specKey}")
    Domain.CartLine findByCombination(@Param("userId") String userId,@Param("storeId") String storeId,
                                      @Param("productId") String productId,@Param("specKey") String specKey);
    @Insert("INSERT INTO cart_lines(cart_line_id,user_id,store_id,product_id,spec_key,spec_options,quantity,unit_price,updated_at) "
            + "VALUES(#{id},#{userId},#{storeId},#{productId},#{specKey},#{specOptionsJson},#{quantity},#{unitPrice},#{updatedAt})")
    int insert(Domain.CartLine line);
    @Update("UPDATE cart_lines SET quantity=#{quantity},unit_price=#{unitPrice},updated_at=#{updatedAt} WHERE cart_line_id=#{id}")
    int updateFull(Domain.CartLine line);
    @Delete("DELETE FROM cart_lines WHERE cart_line_id=#{id}") int delete(String id);
    @Delete("DELETE FROM cart_lines WHERE user_id=#{userId} AND store_id=#{storeId}")
    int deleteByUserAndStore(@Param("userId") String userId,@Param("storeId") String storeId);
}
