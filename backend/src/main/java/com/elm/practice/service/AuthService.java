package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.domain.Domain;
import com.elm.practice.repository.InMemoryRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final InMemoryRepository repo;
    public AuthService(InMemoryRepository repo) { this.repo = repo; }

    public Domain.User registerUser(String account, String password, String nickname) {
        if (account == null || !account.trim().matches("^1\\d{10}$")) throw ApiException.badRequest("账号必须是 11 位手机号");
        validatePassword(password);
        synchronized (repo) {
            if (repo.users.values().stream().anyMatch(u -> u.account.equals(account.trim()))) throw ApiException.conflict("账号已注册");
            String id = repo.nextId("u");
            Domain.User user = new Domain.User(id, account.trim(), InMemoryRepository.hash(password),
                    nickname == null || nickname.trim().isEmpty() ? account.trim() : nickname.trim(), repo.now());
            repo.users.put(id, user); return user;
        }
    }
    public Domain.User loginUser(String account, String password, String role, HttpSession session) {
        if (!"user".equals(RequestUtil.normalizedRole(role))) throw ApiException.forbidden("用户登录 role 必须为 user");
        String a = RequestUtil.required(account, "account"); RequestUtil.required(password, "password");
        Domain.User user;
        synchronized (repo) { user = repo.users.values().stream().filter(u -> u.account.equals(a)).findFirst().orElse(null); }
        if (user == null || !user.passwordHash.equals(InMemoryRepository.hash(password))) throw ApiException.unauthorized("账号或密码错误");
        session.setAttribute(RequestUtil.SESSION_PRINCIPAL, new Domain.Principal(user.id, Domain.Role.USER)); return user;
    }
    public Domain.Merchant registerMerchant(String account, String password, String storeName, String phone, String description) {
        String a = RequestUtil.required(account, "account"); validatePassword(password); String name = RequestUtil.required(storeName, "storeName");
        if (phone == null || !phone.trim().matches("^1\\d{10}$")) throw ApiException.badRequest("联系电话必须是 11 位手机号");
        synchronized (repo) {
            if (repo.merchants.values().stream().anyMatch(m -> m.account.equals(a))) throw ApiException.conflict("商家账号已注册");
            String merchantId = repo.nextId("ma"); String storeId = repo.nextId("m");
            Domain.Merchant merchant = new Domain.Merchant(merchantId, a, InMemoryRepository.hash(password), storeId, phone.trim(), repo.now());
            repo.merchants.put(merchantId, merchant);
            repo.stores.put(storeId, new Domain.Store(storeId, name, description == null ? "" : description.trim(), "",
                    java.math.BigDecimal.ZERO, 0, 30, new java.math.BigDecimal("0.00"), new java.math.BigDecimal("0.00"), Domain.StoreStatus.CLOSED, merchantId));
            String categoryId = repo.nextId("c");
            repo.categories.put(categoryId, new Domain.Category(categoryId, storeId, "默认分类", 1));
            return merchant;
        }
    }
    public Domain.Merchant loginMerchant(String account, String password, String role, HttpSession session) {
        if (!"merchant".equals(RequestUtil.normalizedRole(role))) throw ApiException.forbidden("商家登录 role 必须为 merchant");
        String a = RequestUtil.required(account, "account"); RequestUtil.required(password, "password");
        Domain.Merchant merchant;
        synchronized (repo) { merchant = repo.merchants.values().stream().filter(m -> m.account.equals(a)).findFirst().orElse(null); }
        if (merchant == null || !merchant.passwordHash.equals(InMemoryRepository.hash(password))) throw ApiException.unauthorized("账号或密码错误");
        session.setAttribute(RequestUtil.SESSION_PRINCIPAL, new Domain.Principal(merchant.id, Domain.Role.MERCHANT)); return merchant;
    }
    public Domain.User requireUser(HttpSession session) {
        Domain.Principal p = RequestUtil.requireRole(session, Domain.Role.USER); Domain.User u = repo.users.get(p.id());
        if (u == null) { session.invalidate(); throw ApiException.unauthorized("会话已失效"); } return u;
    }
    public Domain.Merchant requireMerchant(HttpSession session) {
        Domain.Principal p = RequestUtil.requireRole(session, Domain.Role.MERCHANT); Domain.Merchant m = repo.merchants.get(p.id());
        if (m == null) { session.invalidate(); throw ApiException.unauthorized("会话已失效"); } return m;
    }
    public void logout(HttpSession session) { session.invalidate(); }
    private void validatePassword(String password) {
        if (password == null || password.length() < 6 || password.length() > 64) throw ApiException.badRequest("密码长度必须为 6-64 位");
    }
}
