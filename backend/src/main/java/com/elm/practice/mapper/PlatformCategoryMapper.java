package com.elm.practice.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/**
 * 平台级课程分类（批次⑨，PRD 7.16.1 首页分类宫格）。
 * 与 categories（店铺自身商品分类）分离：课程分类不进入商家详情的分类页签。
 */
@Mapper
public interface PlatformCategoryMapper {
    @Select("SELECT COUNT(*) FROM platform_categories WHERE category_id = #{categoryId}")
    long countById(String categoryId);
}
