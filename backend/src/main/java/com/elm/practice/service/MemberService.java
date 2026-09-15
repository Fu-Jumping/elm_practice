package com.elm.practice.service;

import com.elm.practice.domain.Domain;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/** 会员标识查询（契约 §3.8）：会员由种子/后台标记，不提供开通与续费接口。 */
@Service
public class MemberService {
    /** 演示会员折扣率（与 PRD 7.4 演示数值、promotions.member_discount 一致）。 */
    public static final BigDecimal DEMO_DISCOUNT_RATE = new BigDecimal("0.95");

    public Map<String,Object> member(Domain.User u) {
        var m = new LinkedHashMap<String,Object>();
        m.put("memberOpened", u.isMember);
        m.put("discountRate", DEMO_DISCOUNT_RATE);
        m.put("discountDesc", "会员享合作商家会员折扣（演示 95 折）与会员价商品");
        m.put("activatedAt", u.memberActivatedAt);
        return m;
    }
}
