package com.elm.practice.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Random;

/**
 * 爆红包 10 档权重池（CHG-001 §10.5 第 2 条，代码常量与契约表双写——改动任一处必须同步另一处）。
 * 权重：满30减5 26% / 满30减8 18% / 满25减8 14% / 满40减10 11% / 满25减15 9% /
 * 满40减20 6% / 满50减25 3% / 无门槛减5 3% / 满30减18.8 5% / 满40减18.8 5%。
 */
public final class BlastTierPool {
    private BlastTierPool() {}

    public record Tier(int index, BigDecimal threshold, BigDecimal amount, int weight) {}

    private static final List<Tier> TIERS = List.of(
            new Tier(1,  new BigDecimal("30.00"), new BigDecimal("5.00"),  26),
            new Tier(2,  new BigDecimal("30.00"), new BigDecimal("8.00"),  18),
            new Tier(3,  new BigDecimal("25.00"), new BigDecimal("8.00"),  14),
            new Tier(4,  new BigDecimal("40.00"), new BigDecimal("10.00"), 11),
            new Tier(5,  new BigDecimal("25.00"), new BigDecimal("15.00"), 9),
            new Tier(6,  new BigDecimal("40.00"), new BigDecimal("20.00"), 6),
            new Tier(7,  new BigDecimal("50.00"), new BigDecimal("25.00"), 3),
            new Tier(8,  BigDecimal.ZERO,         new BigDecimal("5.00"),  3),
            new Tier(9,  new BigDecimal("30.00"), new BigDecimal("18.80"), 5),
            new Tier(10, new BigDecimal("40.00"), new BigDecimal("18.80"), 5)
    );

    public static List<Tier> tiers() { return TIERS; }

    /** 按权重随机抽一档；随机源由调用方注入（测试传固定种子的 Random 断言确定档位）。 */
    public static Tier pick(Random rng) {
        int roll = rng.nextInt(100);
        int cumulative = 0;
        for (Tier t : TIERS) {
            cumulative += t.weight();
            if (roll < cumulative) return t;
        }
        return TIERS.get(TIERS.size() - 1); // 权重合计恒 100，理论不可达
    }
}
