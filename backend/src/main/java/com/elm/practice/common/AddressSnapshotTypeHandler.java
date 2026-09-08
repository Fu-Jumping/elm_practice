package com.elm.practice.common;

import com.elm.practice.domain.Domain;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedJdbcTypes;
import org.apache.ibatis.type.MappedTypes;

import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/** orders.address_snapshot（JSON 列）与 Domain.Address 的互转：JSON 键与 seed.sql 的 JSON_OBJECT 口径一致。 */
@MappedTypes(Domain.Address.class)
@MappedJdbcTypes(value = JdbcType.VARCHAR, includeNullJdbcType = true)
public class AddressSnapshotTypeHandler extends BaseTypeHandler<Domain.Address> {
    static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .setVisibility(PropertyAccessor.FIELD, JsonAutoDetect.Visibility.ANY);

    public static String toJson(Domain.Address a) {
        if (a == null) return null;
        try { return MAPPER.writeValueAsString(a); } catch (JsonProcessingException e) { throw new IllegalStateException(e); }
    }
    public static Domain.Address fromJson(String s) {
        if (s == null || s.isBlank()) return null;
        try { return MAPPER.readValue(s, Domain.Address.class); } catch (JsonProcessingException e) { throw new IllegalStateException(e); }
    }

    @Override public void setNonNullParameter(PreparedStatement ps, int i, Domain.Address a, JdbcType jdbcType) throws SQLException {
        ps.setString(i, toJson(a));
    }
    @Override public Domain.Address getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return fromJson(rs.getString(columnName));
    }
    @Override public Domain.Address getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return fromJson(rs.getString(columnIndex));
    }
    @Override public Domain.Address getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        return fromJson(cs.getString(columnIndex));
    }
}
