package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

@Mapper
public interface UserMapper {
    String COLS = "user_id AS id, account, password_hash AS passwordHash, nickname, "
            + "DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS createdAt, "
            // 批次⑥（CHG-001）：当天免费爆占用日期，NULL=从未使用。
            + "DATE_FORMAT(free_blast_date,'%Y-%m-%d') AS freeBlastDate";

    @Select("SELECT " + COLS + " FROM users WHERE user_id = #{id}")
    Domain.User findById(String id);

    @Select("SELECT " + COLS + " FROM users WHERE account = #{account}")
    Domain.User findByAccount(String account);

    @Insert("INSERT INTO users(user_id, account, password_hash, nickname, created_at) "
            + "VALUES(#{id}, #{account}, #{passwordHash}, #{nickname}, STR_TO_DATE(#{createdAt},'%Y-%m-%d %H:%i:%s'))")
    int insert(Domain.User user);

    @Update("UPDATE users SET nickname = #{nickname} WHERE user_id = #{id}")
    int updateNickname(@Param("id") String id, @Param("nickname") String nickname);

    /** 占用当天免费爆次数：仅当 free_blast_date 早于今天（含 NULL）时更新成功；并发/重复调用返回 0 行（409）。 */
    @Update("UPDATE users SET free_blast_date = #{today} "
            + "WHERE user_id = #{id} AND (free_blast_date IS NULL OR free_blast_date < #{today})")
    int claimFreeBlast(@Param("id") String id, @Param("today") String today);

    @Select("SELECT COUNT(*) FROM users")
    long count();
}
