package com.elm.practice.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 爆红包 10 档权重池纯单测（契约 §10.5 第 2 条，代码常量与契约表双写）。
 * 随机源可注入种子：同种子必须产生同序列，集成测试之外的确定性保证。
 */
class BlastTierPoolTest {

    /** 档位池 10 档、权重合计 100（%）。 */
    @Test void poolHasTenTiersAndWeightsSum100() {
        var tiers = BlastTierPool.tiers();
        assertEquals(10, tiers.size(), "档位池必须为 10 档");
        int sum = tiers.stream().mapToInt(t -> t.weight()).sum();
        assertEquals(100, sum, "权重合计必须为 100");
        tiers.forEach(t -> {
            assertTrue(t.index() >= 1 && t.index() <= 10);
            assertTrue(t.threshold().signum() >= 0, "门槛非负");
            assertTrue(t.amount().signum() > 0, "减免金额为正");
        });
        // 无门槛档（threshold=0）恰好 1 档；两个 18.8 特色档在池
        assertEquals(1, tiers.stream().filter(t -> t.threshold().compareTo(BigDecimal.ZERO) == 0).count());
        assertEquals(2, tiers.stream().filter(t -> t.amount().compareTo(new BigDecimal("18.80")) == 0).count());
    }

    /** 注入固定种子：同种子两次抽取序列完全一致（契约 §3.10"随机源必须可注入种子"）。 */
    @Test void seededRandomProducesDeterministicSequence() {
        List<BlastTierPool.Tier> a = new ArrayList<>();
        List<BlastTierPool.Tier> b = new ArrayList<>();
        var ra = new Random(20260912L);
        var rb = new Random(20260912L);
        for (int i = 0; i < 50; i++) {
            a.add(BlastTierPool.pick(ra));
            b.add(BlastTierPool.pick(rb));
        }
        for (int i = 0; i < 50; i++) assertEquals(a.get(i).index(), b.get(i).index());
    }

    /** 大量抽取结果始终落在 1..10 档且权重分布与契约表一致（±3 个百分点，容忍抽样误差）。 */
    @Test void distributionFollowsWeights() {
        int[] hits = new int[11];
        int n = 200000;
        var r = new Random(42L);
        for (int i = 0; i < n; i++) hits[BlastTierPool.pick(r).index()]++;
        var tiers = BlastTierPool.tiers();
        for (var t : tiers) {
            double actual = hits[t.index()] * 100.0 / n;
            double expected = t.weight();
            assertEquals(expected, actual, 3.0,
                    "档位 " + t.index() + " 实际占比 " + actual + "% 偏离权重 " + expected + "% 超过 3pp");
        }
    }
}
