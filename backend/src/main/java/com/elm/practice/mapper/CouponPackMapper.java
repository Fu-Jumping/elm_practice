package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

@Mapper
public interface CouponPackMapper {
    @Insert("INSERT INTO coupon_packs(pack_id,pack_key,user_id,price,quantity,created_at) "
            + "VALUES(#{id},#{packKey},#{userId},#{price},#{quantity},STR_TO_DATE(#{createdAt},'%Y-%m-%d %H:%i:%s'))")
    int insert(Domain.CouponPack pack);
}
