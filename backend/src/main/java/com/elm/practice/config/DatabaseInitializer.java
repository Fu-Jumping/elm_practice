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
 * 否则种子里的 ON DUPLICATE KEY 会在每次重启时重置运行期库存/销量；
 * 最后执行 db/upgrade-stage3.sql：它包含**数据种子**（演示会员、课程分类、距离、收藏、通知），
 * 必须晚于 seed.sql 才能在首次建库时命中刚插入的行，因此不能并到上面的结构性迁移里。
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
            if (users.count() == 0) {
                ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/seed.sql"), StandardCharsets.UTF_8));
            }
            // 批次⑨：搜索距离字段 + 商家收藏 + 通知 + 会员标识 + 平台级课程分类（含数据种子），
            // 幂等可重复执行；必须晚于 seed.sql，否则首次建库时没有行可更新。
            ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/upgrade-stage3.sql"), StandardCharsets.UTF_8));
            // 搜索词条字典（2026-09-15 搜索增强，TODO-BE-025）：别名联想 + 检索重映射，幂等。
            ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/upgrade-search-terms.sql"), StandardCharsets.UTF_8));
            // 商品规格纠偏（2026-09-15 验收快修）：香辣鸡腿堡 p101 历史被误配「大杯」规格，
            // 需为「直接加购」口径；幂等，放在 stage3 规格种子之后执行。
            ScriptUtils.executeSqlScript(conn, new EncodedResource(new ClassPathResource("db/upgrade-product-spec-fix.sql"), StandardCharsets.UTF_8));
        }
    }
}
