package com.elm.practice.mapper;

import com.elm.practice.domain.Domain;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface AddressMapper {
    String COLS = "address_id AS id, user_id AS userId, contact_name AS contactName, contact_sex AS contactSex, "
            + "contact_phone AS contactPhone, region, detail, label, is_default AS isDefault, updated_at AS updatedAt";

    @Select("SELECT " + COLS + " FROM addresses WHERE address_id = #{id}")
    Domain.Address findById(String id);

    @Select("SELECT " + COLS + " FROM addresses WHERE user_id = #{userId} "
            + "ORDER BY is_default DESC, updated_at DESC, address_id DESC")
    List<Domain.Address> listByUser(String userId);

    @Select("SELECT COUNT(*) FROM addresses WHERE user_id = #{userId}")
    long countByUser(String userId);

    @Insert("INSERT INTO addresses(address_id, user_id, contact_name, contact_sex, contact_phone, region, detail, label, is_default, updated_at) "
            + "VALUES(#{id}, #{userId}, #{contactName}, #{contactSex}, #{contactPhone}, #{region}, #{detail}, #{label}, #{isDefault}, #{updatedAt})")
    int insert(Domain.Address address);

    @Update("UPDATE addresses SET contact_name = #{contactName}, contact_sex = #{contactSex}, contact_phone = #{contactPhone}, "
            + "region = #{region}, detail = #{detail}, label = #{label}, is_default = #{isDefault}, updated_at = #{updatedAt} "
            + "WHERE address_id = #{id}")
    int updateFull(Domain.Address address);

    @Delete("DELETE FROM addresses WHERE address_id = #{id}")
    int delete(String id);

    @Update("UPDATE addresses SET is_default = FALSE WHERE user_id = #{userId}")
    int clearDefaultForUser(String userId);

    /** 删除默认地址后的自动改派：该用户最近更新的一条（原 max(updatedAt) 口径，address_id 兜底确定性）。 */
    @Select("SELECT " + COLS + " FROM addresses WHERE user_id = #{userId} "
            + "ORDER BY updated_at DESC, address_id DESC LIMIT 1")
    Domain.Address firstByRecent(String userId);
}
