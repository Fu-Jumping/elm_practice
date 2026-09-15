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
 * 启动自举：先幂等执行 db/schema.sql（CREATE IF NOT EXISTS + INSERT IGNORE）与
 * db/upgrade-*.sql（存量库扩列/建表类迁移，脚本自身幂等），
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
            // 批次①：存量库结构升级（promotions 扩列 + promotion_tiers + orders 金额快照扩列），幂等可重复执行。
            ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/upgrade-promotion-tiers.sql"), StandardCharsets.UTF_8));
            // 批次⑥：红包与爆红包（users.free_blast_date + coupons + coupon_packs + 演示券种子），幂等可重复执行。
            ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/upgrade-coupons-blast.sql"), StandardCharsets.UTF_8));
            ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/upgrade-catalog-stage2.sql"), StandardCharsets.UTF_8));
            ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/upgrade-order-cancellation.sql"), StandardCharsets.UTF_8));
            ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/upgrade-reviews-stage2.sql"), StandardCharsets.UTF_8));
            // AI 点餐助手：会话与消息表（会话记忆复用 MySQL），幂等可重复执行。
            ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/upgrade-ai-chat.sql"), StandardCharsets.UTF_8));
            // 批次⑥：商家收藏表（契约 §3.7），幂等可重复执行。
            ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/upgrade-favorites.sql"), StandardCharsets.UTF_8));
            // 批次⑥：会员标识扩列（契约 §3.8），幂等可重复执行。
            ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/upgrade-member.sql"), StandardCharsets.UTF_8));
            if (users.count() == 0) {
                ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/seed.sql"), StandardCharsets.UTF_8));
            }
        }
    }
}
