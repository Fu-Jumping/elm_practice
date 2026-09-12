package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.IdGenerator;
import com.elm.practice.common.Times;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.mapper.CouponMapper;
import com.elm.practice.mapper.CouponPackMapper;
import com.elm.practice.mapper.UserMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * 红包与爆红包（契约 §3.8 会员与红包、§3.10/§10.5 CHG-001 爆红包）。
 * 一单一红包：下单在订单事务内经 FOR UPDATE 锁定 + 条件更新核销，并发下同一券只能成功一次。
 */
@Service
public class CouponService {
    private final CouponMapper coupons; private final CouponPackMapper packs; private final UserMapper users;
    private final IdGenerator ids;
    /** 档位随机源；注入 Random 便于测试固定种子（契约 §3.10）。 */
    private Random rng = new Random();

    public CouponService(CouponMapper coupons, CouponPackMapper packs, UserMapper users, IdGenerator ids) {
        this.coupons = coupons; this.packs = packs; this.users = users; this.ids = ids;
    }

    /** 套餐定义（§10.5 第 7 条，代码常量与契约表双写）：门槛+减免序列，价格为模拟付费价。 */
    private record PackSpec(String key, BigDecimal price, BigDecimal[][] items) {
        int quantity() { return items.length; }
    }
    private static final Map<String,PackSpec> PACKS = Map.of(
            "pack49", new PackSpec("pack49", new BigDecimal("49.00"), new BigDecimal[][]{
                    {new BigDecimal("30.00"), new BigDecimal("5.00")},
                    {new BigDecimal("30.00"), new BigDecimal("5.00")},
                    {new BigDecimal("30.00"), new BigDecimal("5.00")},
                    {BigDecimal.ZERO, new BigDecimal("5.00")}}),
            "pack99", new PackSpec("pack99", new BigDecimal("99.00"), new BigDecimal[][]{
                    {new BigDecimal("30.00"), new BigDecimal("5.00")},
                    {new BigDecimal("30.00"), new BigDecimal("5.00")},
                    {new BigDecimal("30.00"), new BigDecimal("5.00")},
                    {new BigDecimal("30.00"), new BigDecimal("5.00")},
                    {new BigDecimal("30.00"), new BigDecimal("5.00")},
                    {new BigDecimal("30.00"), new BigDecimal("5.00")},
                    {new BigDecimal("40.00"), new BigDecimal("10.00")},
                    {BigDecimal.ZERO, new BigDecimal("5.00")}})
    );

    public List<Map<String,Object>> list(Domain.User u, String status) {
        if (status != null && !status.equals("available") && !status.equals("expired"))
            throw ApiException.badRequest("status 仅支持 available/expired");
        boolean available = !"expired".equals(status);
        return coupons.listByUser(u.id, available).stream().map(ViewMapper::coupon).toList();
    }

    public List<Map<String,Object>> availableForOrder(Domain.User u, String storeId, BigDecimal amount) {
        if (storeId == null || storeId.isBlank()) throw ApiException.badRequest("storeId 不能为空");
        if (amount == null || amount.signum() < 0) throw ApiException.badRequest("amount 必须为非负金额");
        return coupons.listUsable(u.id, storeId, amount.setScale(2)).stream().map(ViewMapper::coupon).toList();
    }

    @Transactional
    public Map<String,Object> purchasePack(Domain.User u, Requests.PackPurchase r) {
        if (r == null || r.packKey == null) throw ApiException.badRequest("packKey 不能为空");
        PackSpec spec = PACKS.get(r.packKey);
        if (spec == null) throw ApiException.badRequest("packKey 仅支持 pack49/pack99");
        String now = Times.nowCn(), validTo = Times.plusDaysCn(7);
        String packId = ids.nextId("cp");
        packs.insert(new Domain.CouponPack(packId, u.id, spec.key(), spec.price(), spec.quantity(), now));
        var views = new ArrayList<Map<String,Object>>();
        for (BigDecimal[] item : spec.items()) {
            Domain.Coupon c = newCoupon(u.id, item[0], item[1], "ALL", null, now, validTo);
            c.source = "PACK"; c.canBlast = true; c.packId = packId;
            coupons.insert(c);
            views.add(ViewMapper.coupon(c));
        }
        var out = new LinkedHashMap<String,Object>();
        out.put("packId", packId); out.put("packKey", spec.key()); out.put("price", spec.price());
        out.put("quantity", spec.quantity()); out.put("coupons", views);
        return out;
    }

    @Transactional
    public Map<String,Object> blast(Domain.User u, Requests.BlastRequest r) {
        boolean free = r == null || r.couponId == null || r.couponId.isBlank();
        BlastTierPool.Tier tier = BlastTierPool.pick(rng);
        String now = Times.nowCn(), endOfToday = Times.endOfTodayCn();
        Domain.Coupon c;
        if (free) {
            // 条件更新占用当天免费次数：0 行=今天已爆过（含并发请求），直接 409，不产生任何券。
            if (users.claimFreeBlast(u.id, Times.todayCn()) == 0)
                throw ApiException.conflict("今日免费次数已用完，购买红包套餐后可继续爆");
            c = newCoupon(u.id, tier.threshold(), tier.amount(), "ALL", null, now, endOfToday);
            c.source = "BLAST_OUT"; c.canBlast = false;
            coupons.insert(c);
        } else {
            c = coupons.findByIdForUpdate(r.couponId);
            if (c == null || !c.userId.equals(u.id)) throw ApiException.notFound("红包不存在");
            if (c.used) throw ApiException.conflict("红包已使用");
            if (!c.canBlast || !"PACK".equals(c.source)) throw ApiException.conflict("该红包不可再爆");
            if (!withinWindow(c)) throw ApiException.conflict("红包已过期");
            // 替换式原地更新：不新增行；条件更新 0 行=并发已被爆/已用，事务回滚无脏数据。
            if (coupons.blastReplace(c.id, tier.threshold(), tier.amount(), now, endOfToday) == 0)
                throw ApiException.conflict("红包状态已变化，请刷新后重试");
            c.threshold = tier.threshold(); c.amount = tier.amount(); c.validFrom = now; c.validTo = endOfToday;
            c.source = "BLAST_OUT"; c.canBlast = false;
        }
        var out = new LinkedHashMap<String,Object>(ViewMapper.coupon(c));
        out.put("tierIndex", tier.index()); out.put("freeBlast", free);
        return out;
    }

    /** 下单事务内调用：行锁读券并做归属/有效期/适用范围/门槛校验，返回券（金额由 OrderService 传入计价）。 */
    public Domain.Coupon lockForOrder(Domain.User u, String couponId, String storeId, BigDecimal itemSubtotal) {
        Domain.Coupon c = coupons.findByIdForUpdate(couponId);
        if (c == null || !c.userId.equals(u.id)) throw ApiException.notFound("红包不存在");
        if (c.used) throw ApiException.conflict("红包已使用");
        if (!withinWindow(c)) throw ApiException.conflict("红包已过期");
        if ("STORE".equals(c.scope) && !storeId.equals(c.storeId))
            throw new ApiException(HttpStatus.BAD_REQUEST, 40001, "红包不适用于当前商家",
                    Map.of("couponId", c.id, "reason", "适用商家不符"));
        if (itemSubtotal.compareTo(c.threshold) < 0)
            throw new ApiException(HttpStatus.BAD_REQUEST, 40001, "未达到红包使用门槛",
                    Map.of("couponId", c.id, "threshold", c.threshold, "itemSubtotal", itemSubtotal,
                            "reason", "商品小计 " + itemSubtotal + " 未达到门槛 " + c.threshold));
        return c;
    }

    /** 条件更新核销；0 行=并发下已被其他订单占用（OrderService 据此抛 409，订单事务整体回滚）。 */
    public int markUsed(Domain.Coupon c, String orderId) {
        return coupons.markUsed(c.id, c.userId, orderId);
    }

    private Domain.Coupon newCoupon(String userId, BigDecimal threshold, BigDecimal amount,
                                   String scope, String storeId, String validFrom, String validTo) {
        var c = new Domain.Coupon();
        c.id = ids.nextId("c"); c.userId = userId; c.name = couponName(threshold, amount);
        c.threshold = threshold.setScale(2); c.amount = amount.setScale(2);
        c.scope = scope; c.storeId = storeId; c.validFrom = validFrom; c.validTo = validTo;
        return c;
    }

    /** 红包展示名：满30减5红包 / 无门槛减5红包。 */
    public static String couponName(BigDecimal threshold, BigDecimal amount) {
        String amountText = amount.setScale(2).stripTrailingZeros().toPlainString();
        if (threshold.signum() == 0) return "无门槛减" + amountText + "红包";
        return "满" + threshold.setScale(2).stripTrailingZeros().toPlainString()
                + "减" + amountText + "红包";
    }

    private static boolean withinWindow(Domain.Coupon c) {
        try {
            var fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            var now = LocalDateTime.now(Times.CN);
            return !LocalDateTime.parse(c.validFrom, fmt).isAfter(now) && !LocalDateTime.parse(c.validTo, fmt).isBefore(now);
        } catch (Exception e) { return false; }
    }
}
