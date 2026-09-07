package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.repository.InMemoryRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class CartService {
    private final InMemoryRepository repo; private final StoreService stores;
    public CartService(InMemoryRepository repo,StoreService stores){this.repo=repo;this.stores=stores;}
    public List<Map<String,Object>> list(Domain.User u,String storeId){RequestUtil.required(storeId,"storeId");synchronized(repo){return repo.cartLines.values().stream().filter(c->c.userId.equals(u.id)&&c.storeId.equals(storeId)).map(c->ViewMapper.cart(c,repo.products.get(c.productId))).toList();}}
    public Domain.CartLine add(Domain.User u,Requests.CartAdd r){if(r==null)throw ApiException.badRequest("请求体不能为空");String sid=RequestUtil.required(r.storeId,"storeId"),pid=RequestUtil.required(r.productId,"productId");int q=positive(r.quantity);Domain.Store s=stores.get(sid);if(s.status!=Domain.StoreStatus.OPEN)throw ApiException.conflict("店铺当前未营业");Domain.Product p=repo.products.get(pid);if(p==null||!p.storeId.equals(sid))throw ApiException.notFound("商品不存在");if(!p.onSale)throw ApiException.conflict("商品已下架");synchronized(repo){Domain.CartLine line=repo.cartLines.values().stream().filter(c->c.userId.equals(u.id)&&c.storeId.equals(sid)&&c.productId.equals(pid)).findFirst().orElse(null);int next=q+(line==null?0:line.quantity);if(next>p.stock)throw new ApiException(org.springframework.http.HttpStatus.CONFLICT,40901,"商品库存不足",Map.of("field","quantity","reason","库存最多为 "+p.stock));if(line==null){line=new Domain.CartLine(repo.nextId("cl"),u.id,sid,pid,next,p.price,LocalDateTime.now());repo.cartLines.put(line.id,line);}else{line.quantity=next;line.unitPrice=p.price;line.updatedAt=LocalDateTime.now();}return line;}}
    public Domain.CartLine patch(Domain.User u,String id,Integer quantity){synchronized(repo){Domain.CartLine c=get(u,id);int q=positive(quantity);Domain.Product p=repo.products.get(c.productId);if(p==null||!p.onSale)throw ApiException.conflict("商品已下架");if(q>p.stock)throw ApiException.conflict("商品库存不足");c.quantity=q;c.unitPrice=p.price;c.updatedAt=LocalDateTime.now();return c;}}
    public void delete(Domain.User u,String id){synchronized(repo){get(u,id);repo.cartLines.remove(id);}}
    public Domain.CartLine get(Domain.User u,String id){Domain.CartLine c=repo.cartLines.get(id);if(c==null||!c.userId.equals(u.id))throw ApiException.notFound("购物车行不存在");return c;}
    public Domain.Product product(String productId){ return repo.products.get(productId); }
    private int positive(Integer q){if(q==null||q<=0)throw ApiException.badRequest("quantity必须是大于 0 的整数");return q;}
}
