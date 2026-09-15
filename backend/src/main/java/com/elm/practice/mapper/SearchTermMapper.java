package com.elm.practice.mapper;

import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Map;

/** 搜索词条字典（2026-09-15 搜索增强）：别名联想 + 检索重映射的词源。 */
@Mapper
public interface SearchTermMapper {
    @Select("SELECT term, aliases, targets, kind, weight, hot FROM search_terms")
    List<Map<String, Object>> findAll();

    @Select("SELECT term, weight FROM search_terms WHERE hot = TRUE ORDER BY weight DESC, term LIMIT #{limit}")
    List<Map<String, Object>> findHot(@Param("limit") int limit);
}
