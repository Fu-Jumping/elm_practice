package com.elm.practice.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface IdSequenceMapper {
    /** 事务内行锁读当前值（调用方事务提交前其他会话阻塞）。 */
    @Select("SELECT next_val FROM id_sequence WHERE name = 'global' FOR UPDATE")
    Long currentForUpdate();

    @Update("UPDATE id_sequence SET next_val = next_val + 1 WHERE name = 'global'")
    int advance();
}
