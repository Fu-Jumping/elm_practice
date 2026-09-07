package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.IdGenerator;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.mapper.CartLineMapper;
import com.elm.practice.mapper.ProductMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class CartService {
    private final CartLineMapper cartLines; private final ProductMapper products;
    private final StoreService stores; private final IdGenerator ids;
    public CartService(CartLineMapper cartLines, ProductMapper products, StoreService stores, IdGenerator ids) {
        this.cartLines = cartLines; this.products = products; this.stores = stores; this.ids = ids;
    }

    public List<Map<String,Object>> list(Domain.User u, String storeId) {
        RequestUtil.required(storeId, "storeId");
        return cartLines.findByUserAndStore(u.id, storeId).stream()
                .map(c -> ViewMapper.cart(c, products.findById(c.productId))).toList();
    }

    @Transactional
    public Domain.CartLine add(Domain.User u, Requests.CartAdd r) {
        if (r == null) throw ApiException.badRequest("请求体不能为空");
        String sid = RequestUtil.required(r.storeId, "storeId"), pid = RequestUtil.required(r.productId, "productId");
        int q = positive(r.quantity);
        Domain.Store s = stores.get(sid);
        if (s.status != Domain.StoreStatus.OPEN) throw ApiException.conflict("店铺当前未营业");
        // 行锁读商品：并发加购以最新库存为界（替代原 synchronized(repo)）。
        Domain.Product p = products.findByIdForUpdate(pid);
        if (p == null || !p.storeId.equals(sid)) throw ApiException.notFound("商品不存在");
        if (!p.onSale) throw ApiException.conflict("商品已下架");
        Domain.CartLine line = cartLines.findByUserStoreProduct(u.id, sid, pid);
        int next = q + (line == null ? 0 : line.quantity);
        if (next > p.stock) throw new ApiException(org.springframework.http.HttpStatus.CONFLICT, 40901, "商品库存不足",
                Map.of("field", "quantity", "reason", "库存最多为 " + p.stock));
        if (line == null) {
            line = new Domain.CartLine(ids.nextId("cl"), u.id, sid, pid, next, p.price, LocalDateTime.now());
            cartLines.insert(line);
        } else {
            line.quantity = next; line.unitPrice = p.price; line.updatedAt = LocalDateTime.now();
            cartLines.updateFull(line);
        }
        return line;
    }

    @Transactional
    public Domain.CartLine patch(Domain.User u, String id, Integer quantity) {
        Domain.CartLine c = get(u, id);
        int q = positive(quantity);
        Domain.Product p = products.findByIdForUpdate(c.productId);
        if (p == null || !p.onSale) throw ApiException.conflict("商品已下架");
        if (q > p.stock) throw ApiException.conflict("商品库存不足");
        c.quantity = q; c.unitPrice = p.price; c.updatedAt = LocalDateTime.now();
        cartLines.updateFull(c);
        return c;
    }

    @Transactional
    public void delete(Domain.User u, String id) {
        get(u, id);
        cartLines.delete(id);
    }

    public Domain.CartLine get(Domain.User u, String id) {
        Domain.CartLine c = cartLines.findById(id);
        if (c == null || !c.userId.equals(u.id)) throw ApiException.notFound("购物车行不存在"); return c;
    }

    public Domain.Product product(String productId) { return products.findById(productId); }

    private int positive(Integer q) {
        if (q == null || q <= 0) throw ApiException.badRequest("quantity必须是大于 0 的整数"); return q;
    }
}
