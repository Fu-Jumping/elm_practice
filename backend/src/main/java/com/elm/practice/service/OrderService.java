package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.repository.InMemoryRepository;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class OrderService {
    private static final BigDecimal PACKAGING_FEE=new BigDecimal("2.00");
    private final InMemoryRepository repo; private final StoreService stores; private final AddressService addresses;
    public OrderService(InMemoryRepository repo,StoreService stores,AddressService addresses){this.repo=repo;this.stores=stores;this.addresses=addresses;}
    /** Synchronized section is the in-memory equivalent of a DB transaction with row locks. */
    public Domain.Order create(Domain.User u,Requests.OrderCreate r){
        synchronized(repo){
            if(r==null)throw ApiException.badRequest("请求体不能为空");
            String sid=RequestUtil.required(r.storeId,"storeId"),aid=RequestUtil.required(r.addressId,"addressId");
            if(r.idempotencyKey!=null&&!r.idempotencyKey.isBlank()){
                Domain.Order old=repo.orders.values().stream().filter(o->u.id.equals(o.userId)&&r.idempotencyKey.equals(o.idempotencyKey)).findFirst().orElse(null);
                if(old!=null)return old;
            }
            Domain.Store store=stores.get(sid);
            if(store.status!=Domain.StoreStatus.OPEN)throw ApiException.conflict("店铺当前未营业");
            Domain.Address address=addresses.get(u,aid);
            List<Domain.CartLine> lines=repo.cartLines.values().stream().filter(c->c.userId.equals(u.id)&&c.storeId.equals(sid)).toList();
            if(lines.isEmpty())throw ApiException.badRequest("购物车为空");
        BigDecimal subtotal=BigDecimal.ZERO;var snapshots=new java.util.ArrayList<Domain.OrderItem>();
        for(Domain.CartLine line:lines){Domain.Product p=repo.products.get(line.productId);if(p==null||!p.onSale)throw ApiException.conflict("商品已下架");if(line.quantity>p.stock)throw new ApiException(org.springframework.http.HttpStatus.CONFLICT,40901,"商品库存不足",Map.of("productId",p.id,"reason","库存最多为 "+p.stock));BigDecimal unit=p.price.setScale(2);subtotal=subtotal.add(unit.multiply(BigDecimal.valueOf(line.quantity)));snapshots.add(new Domain.OrderItem(p.id,p.name,p.image,p.categoryId,unit,line.quantity));}
        subtotal=subtotal.setScale(2);if(subtotal.compareTo(store.startPrice)<0)throw ApiException.conflict("未达到起送金额 "+store.startPrice);
        BigDecimal total=subtotal.add(PACKAGING_FEE).setScale(2);String id=repo.nextId("o");
        // 支付扩展已选定：订单创建即待支付，15 分钟内支付成功后进入 PROCESSING（契约 3.5）。
        Domain.Order order=new Domain.Order(id,u.id,sid,aid,r.remark==null?"":r.remark.trim(),repo.now(),Domain.OrderStatus.PENDING_PAYMENT,subtotal,PACKAGING_FEE,total,InMemoryRepository.copyAddress(address),r.idempotencyKey);order.items.addAll(snapshots);repo.orders.put(id,order);
        // A conversation is created with the order, keeping "联系商家" scoped to that order.
        if (store.merchantId != null) { String conversationId = repo.nextId("cv"); repo.conversations.put(conversationId, new Domain.Conversation(conversationId, id, u.id, store.merchantId)); }
        for(Domain.CartLine line:lines){repo.products.get(line.productId).stock-=line.quantity;repo.products.get(line.productId).sales+=line.quantity;repo.cartLines.remove(line.id);}return order;
        }
    }
    public List<Map<String,Object>> list(Domain.User u,String status){synchronized(repo){return repo.orders.values().stream().filter(o->o.userId.equals(u.id)&&(status==null||status.isBlank()||o.status.name().equals(status))).sorted(Comparator.comparing((Domain.Order o)->o.createdAt).reversed().thenComparing(x->x.id,Comparator.<String>reverseOrder())).map(o->ViewMapper.order(o,false)).toList();}}
    public Domain.Order get(Domain.User u,String id){synchronized(repo){Domain.Order o=repo.orders.get(id);if(o==null||!o.userId.equals(u.id))throw ApiException.notFound("订单不存在");return o;}}
    public List<Map<String,Object>> merchantList(Domain.Merchant m,String status){synchronized(repo){return repo.orders.values().stream().filter(o->{Domain.Store s=repo.stores.get(o.storeId);return s!=null&&m.storeId.equals(s.id)&&o.status!=Domain.OrderStatus.PENDING_PAYMENT&&(status==null||status.isBlank()||o.status.name().equals(status));}).sorted(Comparator.comparing((Domain.Order o)->o.createdAt).reversed().thenComparing(x->x.id,Comparator.<String>reverseOrder())).map(o->ViewMapper.order(o,false)).toList();}}
    public Domain.Order merchantGet(Domain.Merchant m,String id){synchronized(repo){Domain.Order o=repo.orders.get(id);if(o==null||!m.storeId.equals(o.storeId)||o.status==Domain.OrderStatus.PENDING_PAYMENT)throw ApiException.notFound("订单不存在");return o;}}
    public Domain.Order pay(Domain.User u,String id,boolean success){synchronized(repo){Domain.Order o=get(u,id);if(o.status!=Domain.OrderStatus.PENDING_PAYMENT)return o;if(LocalDateTime.now().minusMinutes(15).isAfter(LocalDateTime.parse(o.createdAt,InMemoryRepository.TIME)))throw ApiException.conflict("支付已超时");if(success){o.status=Domain.OrderStatus.PROCESSING;o.paidAt=repo.now();}return o;}}
    public Domain.Order advance(Domain.Merchant m,String id,String next){synchronized(repo){Domain.Order o=merchantGet(m,id);Domain.OrderStatus target;try{target=Domain.OrderStatus.valueOf(RequestUtil.required(next,"status"));}catch(IllegalArgumentException e){throw ApiException.badRequest("非法订单状态");}if(o.status==target)return o;boolean valid=(o.status==Domain.OrderStatus.PROCESSING&&target==Domain.OrderStatus.PENDING)||(o.status==Domain.OrderStatus.PENDING&&target==Domain.OrderStatus.COOKING)||(o.status==Domain.OrderStatus.COOKING&&target==Domain.OrderStatus.DELIVERING)||(o.status==Domain.OrderStatus.DELIVERING&&target==Domain.OrderStatus.COMPLETED);if(!valid)throw ApiException.conflict("订单状态不能跳级");o.status=target;return o;}}
}
