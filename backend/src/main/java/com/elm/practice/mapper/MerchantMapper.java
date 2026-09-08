package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface MerchantMapper {
    String COLS = "merchant_id AS id, account, password_hash AS passwordHash, store_id AS storeId, phone, "
            + "DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS createdAt";

    @Select("SELECT " + COLS + " FROM merchants WHERE merchant_id = #{id}")
    Domain.Merchant findById(String id);

    @Select("SELECT " + COLS + " FROM merchants WHERE account = #{account}")
    Domain.Merchant findByAccount(String account);

    @Insert("INSERT INTO merchants(merchant_id, account, password_hash, store_id, phone, created_at) "
            + "VALUES(#{id}, #{account}, #{passwordHash}, #{storeId}, #{phone}, STR_TO_DATE(#{createdAt},'%Y-%m-%d %H:%i:%s'))")
    int insert(Domain.Merchant merchant);
}
