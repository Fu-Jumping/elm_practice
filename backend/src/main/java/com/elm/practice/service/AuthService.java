package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.HashUtil;
import com.elm.practice.common.IdGenerator;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.Times;
import com.elm.practice.domain.Domain;
import com.elm.practice.mapper.CategoryMapper;
import com.elm.practice.mapper.MerchantMapper;
import com.elm.practice.mapper.StoreMapper;
import com.elm.practice.mapper.UserMapper;
import jakarta.servlet.http.HttpSession;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class AuthService {
    private final UserMapper users; private final MerchantMapper merchants;
    private final StoreMapper stores; private final CategoryMapper categories; private final IdGenerator ids;
    public AuthService(UserMapper users, MerchantMapper merchants, StoreMapper stores,
                       CategoryMapper categories, IdGenerator ids) {
        this.users = users; this.merchants = merchants; this.stores = stores;
        this.categories = categories; this.ids = ids;
    }

    public Domain.User registerUser(String account, String password, String nickname) {
        if (account == null || !account.trim().matches("^1\\d{10}$")) throw ApiException.badRequest("账号必须是 11 位手机号");
        validatePassword(password);
        Domain.User user = new Domain.User(ids.nextId("u"), account.trim(), HashUtil.sha256(password),
                nickname == null || nickname.trim().isEmpty() ? account.trim() : nickname.trim(), Times.now());
        try { users.insert(user); }
        catch (DuplicateKeyException e) { throw ApiException.conflict("账号已注册"); }
        return user;
    }

    public Domain.User loginUser(String account, String password, String role, HttpSession session) {
        if (!"user".equals(RequestUtil.normalizedRole(role))) throw ApiException.forbidden("用户登录 role 必须为 user");
        String a = RequestUtil.required(account, "account"); RequestUtil.required(password, "password");
        Domain.User user = users.findByAccount(a);
        if (user == null || !user.passwordHash.equals(HashUtil.sha256(password))) throw ApiException.unauthorized("账号或密码错误");
        session.setAttribute(RequestUtil.SESSION_PRINCIPAL, new Domain.Principal(user.id, Domain.Role.USER)); return user;
    }

    /** 注册即自动建店（初始 CLOSED）+ 默认分类，merchant+store+category 同事务。 */
    @Transactional
    public Domain.Merchant registerMerchant(String account, String password, String storeName, String phone, String description) {
        String a = RequestUtil.required(account, "account"); validatePassword(password); String name = RequestUtil.required(storeName, "storeName");
        if (phone == null || !phone.trim().matches("^1\\d{10}$")) throw ApiException.badRequest("联系电话必须是 11 位手机号");
        if (merchants.findByAccount(a) != null) throw ApiException.conflict("商家账号已注册");
        String merchantId = ids.nextId("ma"); String storeId = ids.nextId("m");
        Domain.Merchant merchant = new Domain.Merchant(merchantId, a, HashUtil.sha256(password), storeId, phone.trim(), Times.now());
        Domain.Store store = new Domain.Store(storeId, name, description == null ? "" : description.trim(), "",
                BigDecimal.ZERO, 0, 30, new BigDecimal("0.00"), new BigDecimal("0.00"), Domain.StoreStatus.CLOSED, merchantId);
        try {
            merchants.insert(merchant);
            stores.insert(store);
        } catch (DuplicateKeyException e) { throw ApiException.conflict("商家账号已注册"); }
        categories.insert(new Domain.Category(ids.nextId("c"), storeId, "默认分类", 1));
        return merchant;
    }

    public Domain.Merchant loginMerchant(String account, String password, String role, HttpSession session) {
        if (!"merchant".equals(RequestUtil.normalizedRole(role))) throw ApiException.forbidden("商家登录 role 必须为 merchant");
        String a = RequestUtil.required(account, "account"); RequestUtil.required(password, "password");
        Domain.Merchant merchant = merchants.findByAccount(a);
        if (merchant == null || !merchant.passwordHash.equals(HashUtil.sha256(password))) throw ApiException.unauthorized("账号或密码错误");
        session.setAttribute(RequestUtil.SESSION_PRINCIPAL, new Domain.Principal(merchant.id, Domain.Role.MERCHANT)); return merchant;
    }

    public Domain.User requireUser(HttpSession session) {
        Domain.Principal p = RequestUtil.requireRole(session, Domain.Role.USER); Domain.User u = users.findById(p.id());
        if (u == null) { session.invalidate(); throw ApiException.unauthorized("会话已失效"); } return u;
    }

    public Domain.Merchant requireMerchant(HttpSession session) {
        Domain.Principal p = RequestUtil.requireRole(session, Domain.Role.MERCHANT); Domain.Merchant m = merchants.findById(p.id());
        if (m == null) { session.invalidate(); throw ApiException.unauthorized("会话已失效"); } return m;
    }

    public Domain.User updateNickname(Domain.User u, String nickname) {
        String n = RequestUtil.required(nickname, "nickname");
        u.nickname = n; users.updateNickname(u.id, n); return u;
    }

    public void logout(HttpSession session) { session.invalidate(); }
    private void validatePassword(String password) {
        if (password == null || password.length() < 6 || password.length() > 64) throw ApiException.badRequest("密码长度必须为 6-64 位");
    }
}
