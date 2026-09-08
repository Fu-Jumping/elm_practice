package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

@Mapper
public interface UserMapper {
    String COLS = "user_id AS id, account, password_hash AS passwordHash, nickname, "
            + "DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS createdAt";

    @Select("SELECT " + COLS + " FROM users WHERE user_id = #{id}")
    Domain.User findById(String id);

    @Select("SELECT " + COLS + " FROM users WHERE account = #{account}")
    Domain.User findByAccount(String account);

    @Insert("INSERT INTO users(user_id, account, password_hash, nickname, created_at) "
            + "VALUES(#{id}, #{account}, #{passwordHash}, #{nickname}, STR_TO_DATE(#{createdAt},'%Y-%m-%d %H:%i:%s'))")
    int insert(Domain.User user);

    @Update("UPDATE users SET nickname = #{nickname} WHERE user_id = #{id}")
    int updateNickname(@Param("id") String id, @Param("nickname") String nickname);

    @Select("SELECT COUNT(*) FROM users")
    long count();
}
