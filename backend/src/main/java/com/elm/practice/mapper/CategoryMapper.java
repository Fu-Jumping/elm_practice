package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface CategoryMapper {
    String COLS = "category_id AS id, store_id AS storeId, name, sort_order AS sortOrder";

    @Select("SELECT " + COLS + " FROM categories WHERE category_id = #{id}")
    Domain.Category findById(String id);

    @Select("SELECT " + COLS + " FROM categories WHERE store_id = #{storeId} ORDER BY sort_order, category_id")
    List<Domain.Category> findByStore(String storeId);

    @Select("SELECT " + COLS + " FROM categories WHERE store_id = #{storeId} AND name = #{name}")
    Domain.Category findByName(@Param("storeId") String storeId, @Param("name") String name);

    @Insert("INSERT INTO categories(category_id, store_id, name, sort_order) "
            + "VALUES(#{id}, #{storeId}, #{name}, #{sortOrder})")
    int insert(Domain.Category category);

    @Update("UPDATE categories SET name = #{name}, sort_order = #{sortOrder} WHERE category_id = #{id}")
    int updateFull(Domain.Category category);

    @Delete("DELETE FROM categories WHERE category_id = #{id}")
    int delete(String id);
}
