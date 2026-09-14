package com.elm.practice.service;

import com.elm.practice.common.*;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.mapper.CartLineMapper;
import com.elm.practice.mapper.ProductMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class CartService {
    private final CartLineMapper cartLines;
    private final ProductMapper products;
    private final StoreService stores;
    private final IdGenerator ids;

    public CartService(CartLineMapper cartLines,ProductMapper products,StoreService stores,IdGenerator ids){
        this.cartLines=cartLines;this.products=products;this.stores=stores;this.ids=ids;
    }

    public List<Map<String,Object>> list(Domain.User u,String storeId){
        RequestUtil.required(storeId,"storeId");
        return cartLines.findByUserAndStore(u.id,storeId).stream()
                .map(c->ViewMapper.cart(c,products.findById(c.productId))).toList();
    }

    @Transactional
    public Domain.CartLine add(Domain.User u,Requests.CartAdd r){
        if(r==null)throw ApiException.badRequest("请求体不能为空");
        String sid=RequestUtil.required(r.storeId,"storeId");
        String pid=RequestUtil.required(r.productId,"productId");
        int q=positive(r.quantity);
        Domain.Store store=stores.get(sid);
        if(store.status!=Domain.StoreStatus.OPEN)throw ApiException.conflict("店铺当前未营业");
        Domain.Product p=products.findByIdForUpdate(pid);
        if(p==null||!p.storeId.equals(sid))throw ApiException.notFound("商品不存在");
        if(!p.onSale)throw ApiException.conflict("商品已下架");
        List<Domain.SpecOption> selected=validatedSelection(p,r.specOptions);
        String specJson=JsonLists.toJson(selected);
        String specKey=selected.stream().map(x->x.name).sorted().reduce((a,b)->a+"|"+b).orElse("");
        BigDecimal unit=unitPrice(p,selected);
        Domain.CartLine line=cartLines.findByCombination(u.id,sid,pid,specKey);
        int next=q+(line==null?0:line.quantity);
        if(next>p.stock)throw new ApiException(org.springframework.http.HttpStatus.CONFLICT,40901,
                "商品库存不足",Map.of("field","quantity","reason","库存最多为 "+p.stock));
        if(line==null){
            line=new Domain.CartLine(ids.nextId("cl"),u.id,sid,pid,next,unit,LocalDateTime.now());
            line.specKey=specKey;line.specOptionsJson=specJson;
            cartLines.insert(line);
        }else{
            line.quantity=next;line.unitPrice=unit;line.specOptionsJson=specJson;line.updatedAt=LocalDateTime.now();
            cartLines.updateFull(line);
        }
        return line;
    }

    @Transactional
    public Domain.CartLine patch(Domain.User u,String id,Integer quantity){
        Domain.CartLine c=get(u,id);
        int q=positive(quantity);
        Domain.Product p=products.findByIdForUpdate(c.productId);
        if(p==null||!p.onSale)throw ApiException.conflict("商品已下架");
        if(q>p.stock)throw ApiException.conflict("商品库存不足");
        List<Domain.SpecOption> selected=validatedSelection(p,JsonLists.specs(c.specOptionsJson));
        c.quantity=q;c.unitPrice=unitPrice(p,selected);c.specOptionsJson=JsonLists.toJson(selected);c.updatedAt=LocalDateTime.now();
        cartLines.updateFull(c);
        return c;
    }

    @Transactional public void delete(Domain.User u,String id){get(u,id);cartLines.delete(id);}

    public Domain.CartLine get(Domain.User u,String id){
        Domain.CartLine c=cartLines.findById(id);
        if(c==null||!c.userId.equals(u.id))throw ApiException.notFound("购物车行不存在");
        return c;
    }

    public Domain.Product product(String productId){return products.findById(productId);}

    public static List<Domain.SpecOption> validatedSelection(Domain.Product product,List<Domain.SpecOption> requested){
        List<Domain.SpecOption> available=JsonLists.specs(product.specOptionsJson);
        if(available.isEmpty()){
            if(requested!=null&&!requested.isEmpty())throw ApiException.badRequest("该商品没有可选规格");
            return List.of();
        }
        if(requested==null||requested.isEmpty())throw ApiException.badRequest("请选择商品规格");
        if(requested.size()!=1)throw ApiException.badRequest("每个商品请选择一个规格");
        String name=RequestUtil.required(requested.get(0).name,"specOptions.name");
        return available.stream().filter(x->name.equals(x.name)).findFirst()
                .map(x->List.of(new Domain.SpecOption(x.name,x.priceDelta)))
                .orElseThrow(()->ApiException.badRequest("商品规格不存在"));
    }

    public static BigDecimal unitPrice(Domain.Product product,List<Domain.SpecOption> specs){
        BigDecimal result=product.price;
        for(Domain.SpecOption option:specs)result=result.add(option.priceDelta);
        return result.setScale(2);
    }

    private int positive(Integer q){
        if(q==null||q<=0)throw ApiException.badRequest("quantity必须是大于 0 的整数");
        return q;
    }
}
