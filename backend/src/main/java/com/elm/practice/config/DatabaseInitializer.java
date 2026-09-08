package com.elm.practice.config;

import com.elm.practice.mapper.UserMapper;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;

/**
 * 启动自举：先幂等执行 db/schema.sql（CREATE IF NOT EXISTS + INSERT IGNORE），
 * 再仅当 users 表为空时执行 db/seed.sql——不能改用 spring.sql.init.mode=always，
 * 否则种子里的 ON DUPLICATE KEY 会在每次重启时重置运行期库存/销量。
 */
@Component
public class DatabaseInitializer implements ApplicationRunner {
    private final DataSource dataSource;
    private final UserMapper users;

    public DatabaseInitializer(DataSource dataSource, UserMapper users) {
        this.dataSource = dataSource; this.users = users;
    }

    @Override public void run(ApplicationArguments args) throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/schema.sql"), StandardCharsets.UTF_8));
            if (users.count() == 0) {
                ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/seed.sql"), StandardCharsets.UTF_8));
            }
        }
    }
}
