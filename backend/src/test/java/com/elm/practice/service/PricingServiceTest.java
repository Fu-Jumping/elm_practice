package com.elm.practice.service;

import com.elm.practice.domain.Domain;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * PricingService 七步计价单元测试：覆盖集成层难以精确构造的边界场景。
 * TC-PRV-003（小计恰等于门槛）、TC-PRV-006（会员 95 折，与会员价不叠加的公式层验证）、
 * TC-PRV-007（优惠合计超过应付基数，截断到 0 不为负）。
 */
@SpringBootTest
class PricingServiceTest {
    @Autowired PricingService pricing;

    private Domain.PromoConfig cfg(boolean enabled) {
        var c = new Domain.PromoConfig();
        c.enabled = enabled;
        c.tiers.add(new Domain.PromoTier(new BigDecimal("20"), new BigDecimal("2")));
        c.tiers.add(new Domain.PromoTier(new BigDecimal("40"), new BigDecimal("5")));
        c.newUserAmount = new BigDecimal("3");
        c.freeDeliveryThreshold = new BigDecimal("30");
        c.memberDiscountRate = new BigDecimal("0.95");
        return c;
    }

    /** TC-PRV-003：小计恰好等于门槛 20 元，按"满足门槛"命中满减，BigDecimal 无浮点误差漏减。 */
    @Test void tcPrv003_subtotalExactlyAtThresholdHits() {
        var r = pricing.price(new BigDecimal("20.00"), new BigDecimal("5.00"), cfg(true), false, false, null);
        assertEquals(0, r.fullReductionAmount.compareTo(new BigDecimal("2.00")));
        // 20 − 2 + 5（<30 不免配送）+ 2 = 25.00
        assertEquals(0, r.total.compareTo(new BigDecimal("25.00")));
    }

    /** TC-PRV-006：会员 95 折作用于商品小计（10 → 折扣 0.50）；非会员同单无折扣。 */
    @Test void tcPrv006_memberDiscountAppliesToSubtotal() {
        var r = pricing.price(new BigDecimal("10.00"), new BigDecimal("3.00"), cfg(true), false, true, null);
        assertEquals(0, r.memberDiscountAmount.compareTo(new BigDecimal("0.50")));
        // 10 − 0.5 + 3 + 2 = 14.50
        assertEquals(0, r.total.compareTo(new BigDecimal("14.50")));
        var nonMember = pricing.price(new BigDecimal("10.00"), new BigDecimal("3.00"), cfg(true), false, false, null);
        assertEquals(0, nonMember.memberDiscountAmount.compareTo(BigDecimal.ZERO));
        assertEquals(0, nonMember.total.compareTo(new BigDecimal("15.00")));
    }

    /** TC-PRV-007：优惠合计超过应付基数，实付截断到 0，不返回负数。 */
    @Test void tcPrv007_negativeTotalClampedToZero() {
        var c = cfg(true);
        c.tiers.clear();
        // 直配大额档：满 1 减 100（绕过保存校验的构造，仅公式层验证）
        c.tiers.add(new Domain.PromoTier(new BigDecimal("1"), new BigDecimal("100")));
        var r = pricing.price(new BigDecimal("10.00"), new BigDecimal("0.00"), c, true, false, new BigDecimal("5"));
        assertTrue(r.total.signum() >= 0, "实付不得为负");
        assertEquals(0, r.total.compareTo(BigDecimal.ZERO));
    }

    /** 配置整体缺失（无 promotions 行）时等价于全部优惠关闭，金额 = 小计 + 配送费 + 打包费。 */
    @Test void missingConfigMeansNoPromotion() {
        var r = pricing.price(new BigDecimal("23.00"), new BigDecimal("5.00"), null, true, true, null);
        assertEquals(0, r.fullReductionAmount.compareTo(BigDecimal.ZERO));
        assertEquals(0, r.memberDiscountAmount.compareTo(BigDecimal.ZERO));
        assertEquals(0, r.total.compareTo(new BigDecimal("30.00")));
    }
}
