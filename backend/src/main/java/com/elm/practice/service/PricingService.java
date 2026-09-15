package com.elm.practice.service;

import com.elm.practice.domain.Domain;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * 优惠计价七步（PRD 7.4，2026-09-09 定稿；契约 §3.5「优惠计价接入下单」）。
 * 顺序固定：① 商品小计（调用方按购物车行计算后传入；会员价商品级计价待批次⑥ memberPrice）
 * → ② 店铺满减（取最大满足档）→ ③ 新客立减（店铺新用户首单）→ ④ 配送费与配送费优惠（只作用于配送费）
 * → ⑤ 会员折扣（作用于商品小计，与会员价不叠加）→ ⑥ 用户红包（一单一红包，批次⑥接入，当前传 0）
 * → ⑦ 实付 = 小计 − 满减 − 新客 − 会员折扣 − 红包 + 配送费 − 配送费优惠 + 打包费，且不小于 0。
 * 金额一律 setScale(2)；超额优惠被截断到 0（TC-PRV-007），不返回负数。
 */
@Service
public class PricingService {
    public static final BigDecimal PACKAGING_FEE = new BigDecimal("2.00");
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    /** 计价结果：与契约金额快照字段一一对应（itemSubtotal/packagingFee/deliveryFee/fullReductionAmount/…）。 */
    public static class Result {
        public BigDecimal itemSubtotal, packagingFee, deliveryFee, fullReductionAmount,
                newCustomerAmount, memberDiscountAmount, couponAmount, deliveryFeeDiscount, total;
    }

    /** 兼容入口（无会员价商品时等价）：会员折扣基数 = 商品小计。 */
    public Result price(BigDecimal itemSubtotal, BigDecimal deliveryFee, Domain.PromoConfig promo,
                        boolean isNewCustomer, boolean isMember, BigDecimal couponAmount) {
        return price(itemSubtotal, itemSubtotal, deliveryFee, promo, isNewCustomer, isMember, couponAmount);
    }

    /**
     * 计价主入口（PRD 7.4 七步）。{@code memberDiscountBase} = **未配置会员价**的商品小计：
     * 配置了会员价的商品已在第①步按会员价计价，第⑤步不再对它们打折（契约 §3.2/§3.5「与会员折扣不叠加」）。
     */
    public Result price(BigDecimal itemSubtotal, BigDecimal memberDiscountBase, BigDecimal deliveryFee,
                        Domain.PromoConfig promo, boolean isNewCustomer, boolean isMember, BigDecimal couponAmount) {
        BigDecimal discountBase = memberDiscountBase == null ? ZERO : memberDiscountBase.setScale(2);
        var r = new Result();
        r.itemSubtotal = (itemSubtotal == null ? ZERO : itemSubtotal).setScale(2);
        r.packagingFee = PACKAGING_FEE.setScale(2);
        r.deliveryFee = (deliveryFee == null ? ZERO : deliveryFee).setScale(2);
        var cfg = promo == null ? new Domain.PromoConfig() : promo;
        // ② 满减：enabled 时取"满足门槛（小计 ≥ threshold）的最大档"，两档不叠加。
        BigDecimal full = ZERO;
        Domain.PromoTier best = null;
        if (cfg.enabled) {
            for (Domain.PromoTier t : cfg.tiers) {
                if (t.threshold == null || t.amount == null) continue;
                if (r.itemSubtotal.compareTo(t.threshold) >= 0
                        && (best == null || t.threshold.compareTo(best.threshold) > 0)) best = t;
            }
        }
        if (best != null) full = best.amount;
        r.fullReductionAmount = full.setScale(2);
        // ③ 新客立减：店铺新用户首单（isCustomerNew 由调用方按该店历史订单数判定）。
        BigDecimal newUser = (isNewCustomer && cfg.newUserAmount.signum() > 0) ? cfg.newUserAmount : ZERO;
        r.newCustomerAmount = newUser.setScale(2);
        // ④ 配送费优惠：免配送费门槛基数 = 商品小计（原始小计，不扣满减/折扣，TC-PRV-005）。
        BigDecimal feeDiscount = (cfg.freeDeliveryThreshold.signum() > 0
                && r.itemSubtotal.compareTo(cfg.freeDeliveryThreshold) >= 0) ? r.deliveryFee : ZERO;
        r.deliveryFeeDiscount = feeDiscount.setScale(2);
        // ⑤ 会员折扣：作用于商品小计；与会员价不叠加由调用方保证（已按会员价计价的商品不再打折，批次⑥）。
        BigDecimal member = ZERO;
        if (isMember && cfg.memberDiscountRate.signum() > 0
                && cfg.memberDiscountRate.compareTo(BigDecimal.ONE) < 0) {
            member = discountBase.multiply(BigDecimal.ONE.subtract(cfg.memberDiscountRate));
        }
        r.memberDiscountAmount = member.setScale(2);
        // ⑥ 用户红包：批次⑥ coupons 表接入，当前恒 0。
        r.couponAmount = (couponAmount == null ? ZERO : couponAmount).setScale(2);
        // ⑦ 实付且不小于 0（TC-PRV-007：超额优惠截断）。
        BigDecimal total = r.itemSubtotal.subtract(r.fullReductionAmount).subtract(r.newCustomerAmount)
                .subtract(r.memberDiscountAmount).subtract(r.couponAmount)
                .add(r.deliveryFee).subtract(r.deliveryFeeDiscount).add(r.packagingFee);
        if (total.signum() < 0) total = ZERO;
        r.total = total.setScale(2);
        return r;
    }
}
