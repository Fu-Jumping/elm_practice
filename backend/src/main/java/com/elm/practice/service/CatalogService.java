package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.IdGenerator;
import com.elm.practice.common.JsonLists;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.mapper.CategoryMapper;
import com.elm.practice.mapper.ProductMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
public class CatalogService {
    private final CategoryMapper categories;
    private final ProductMapper products;
    private final StoreService stores;
    private final IdGenerator ids;

    public CatalogService(CategoryMapper categories, ProductMapper products, StoreService stores, IdGenerator ids) {
        this.categories=categories; this.products=products; this.stores=stores; this.ids=ids;
    }

    public List<Map<String,Object>> categories(Domain.Merchant m) {
        stores.requireMerchantStore(m); return stores.categories(m.storeId);
    }

    @Transactional
    public Domain.Category createCategory(Domain.Merchant m,String name,Integer sort) {
        stores.requireMerchantStore(m);
        String n=RequestUtil.required(name,"name");
        if(categories.findByName(m.storeId,n)!=null) throw ApiException.conflict("同一店铺分类名称不能重复");
        Domain.Category c=new Domain.Category(ids.nextId("c"),m.storeId,n,sort==null?1:sort);
        try { categories.insert(c); }
        catch(DuplicateKeyException e){ throw ApiException.conflict("同一店铺分类名称不能重复"); }
        return c;
    }

    @Transactional
    public Domain.Category patchCategory(Domain.Merchant m,String id,String name,Integer sort) {
        Domain.Category c=requireCategory(m,id);
        if(name!=null){
            String n=RequestUtil.required(name,"name");
            Domain.Category same=categories.findByName(m.storeId,n);
            if(same!=null&&!same.id.equals(id)) throw ApiException.conflict("同一店铺分类名称不能重复");
            c.name=n;
        }
        if(sort!=null)c.sortOrder=sort;
        try{categories.updateFull(c);}catch(DuplicateKeyException e){throw ApiException.conflict("同一店铺分类名称不能重复");}
        return c;
    }

    @Transactional
    public void deleteCategory(Domain.Merchant m,String id) {
        Domain.Category c=requireCategory(m,id);
        if(products.countByCategory(id)>0) throw ApiException.conflict("该分类下存在商品，请先处理商品归属");
        categories.delete(c.id);
    }

    public List<Map<String,Object>> products(Domain.Merchant m,String categoryId) {
        stores.requireMerchantStore(m); return stores.products(m.storeId,categoryId,true);
    }

    @Transactional
    public void bindProducts(Domain.Merchant m,String categoryId,List<String> productIds) {
        requireCategory(m,categoryId);
        if(productIds==null) throw ApiException.badRequest("productIds不能为空");
        var unique=new LinkedHashSet<String>();
        for(String id:productIds){
            String pid=RequestUtil.required(id,"productId");
            Domain.Product p=products.findById(pid);
            if(p==null||!m.storeId.equals(p.storeId)) throw ApiException.notFound("商品不存在");
            unique.add(pid);
        }
        unique.forEach(id->products.updateCategory(id,categoryId));
    }

    @Transactional
    public Domain.Product createProduct(Domain.Merchant m,Requests.ProductCreate r) {
        if(r==null) throw ApiException.badRequest("请求体不能为空");
        stores.requireMerchantStore(m);
        validateRequiredProduct(r.name,r.categoryId,r.price,r.stock);
        requireCategory(m,r.categoryId);
        Domain.Product p=new Domain.Product(ids.nextId("p"),m.storeId,r.categoryId,
                RequestUtil.required(r.name,"name"),trim(r.description),validateImage(r.image),
                RequestUtil.money(r.price,"price"),r.stock,r.onSale==null||r.onSale,0);
        p.memberPrice=memberPrice(r.memberPrice,p.price);
        p.tagsJson=JsonLists.toJson(normalizeTags(r.tags));
        p.specOptionsJson=JsonLists.toJson(normalizeSpecs(r.specOptions));
        products.insert(p);
        return p;
    }

    public Domain.Product getProduct(Domain.Merchant m,String id) {
        stores.requireMerchantStore(m);
        Domain.Product p=products.findById(id);
        if(p==null||!m.storeId.equals(p.storeId)) throw ApiException.notFound("商品不存在");
        return p;
    }

    @Transactional
    public Domain.Product patchProduct(Domain.Merchant m,String id,Requests.ProductPatch r) {
        if(r==null) throw ApiException.badRequest("请求体不能为空");
        Domain.Product p=getProduct(m,id);
        if(r.name!=null)p.name=RequestUtil.required(r.name,"name");
        if(r.description!=null)p.description=r.description.trim();
        if(r.image!=null)p.image=validateImage(r.image);
        if(r.categoryId!=null){requireCategory(m,r.categoryId);p.categoryId=r.categoryId;}
        if(r.price!=null)p.price=RequestUtil.money(r.price,"price");
        if(r.memberPrice!=null)p.memberPrice=memberPrice(r.memberPrice,p.price);
        if(r.stock!=null){if(r.stock<0)throw ApiException.badRequest("stock必须为非负整数");p.stock=r.stock;}
        if(r.onSale!=null)p.onSale=r.onSale;
        if(r.tags!=null)p.tagsJson=JsonLists.toJson(normalizeTags(r.tags));
        if(r.specOptions!=null)p.specOptionsJson=JsonLists.toJson(normalizeSpecs(r.specOptions));
        if(p.memberPrice!=null&&p.memberPrice.compareTo(p.price)>0)
            throw ApiException.badRequest("memberPrice不能高于price");
        products.updateFull(p);
        return p;
    }

    @Transactional
    public Domain.Product saveSpecifications(Domain.Merchant m,String id,List<Domain.SpecOption> specs) {
        Domain.Product p=getProduct(m,id);
        p.specOptionsJson=JsonLists.toJson(normalizeSpecs(specs));
        products.updateFull(p);
        return p;
    }

    @Transactional
    public void deleteProduct(Domain.Merchant m,String id){
        Domain.Product p=getProduct(m,id);
        if(p.onSale)throw ApiException.conflict("在售商品不能删除，请先下架");
        products.delete(p.id);
    }

    @Transactional
    public Domain.Product availability(Domain.Merchant m,String id,Boolean sale,Integer stock){
        Domain.Product p=getProduct(m,id);
        if(stock!=null&&stock<0)throw ApiException.badRequest("stock必须为非负整数");
        if(stock!=null)p.stock=stock;
        if(sale!=null)p.onSale=sale;
        products.updateFull(p);
        return p;
    }

    private Domain.Category requireCategory(Domain.Merchant m,String id){
        if(id==null)throw ApiException.badRequest("categoryId不能为空");
        Domain.Category c=categories.findById(id);
        if(c==null||!c.storeId.equals(m.storeId))throw ApiException.notFound("分类不存在");
        return c;
    }

    private void validateRequiredProduct(String name,String category,BigDecimal price,Integer stock){
        RequestUtil.required(name,"name");
        if(category==null||category.isBlank())throw ApiException.badRequest("categoryId不能为空");
        RequestUtil.money(price,"price");
        if(stock==null||stock<0)throw ApiException.badRequest("stock必须为非负整数");
    }

    private BigDecimal memberPrice(BigDecimal value,BigDecimal price){
        if(value==null)return null;
        BigDecimal v=RequestUtil.money(value,"memberPrice");
        if(v.compareTo(price)>0)throw ApiException.badRequest("memberPrice不能高于price");
        return v;
    }

    private String validateImage(String image){
        String value=trim(image);
        if(value.isEmpty())return value;
        if(!value.startsWith("/uploads/")&&!value.startsWith("/demo-images/"))
            throw ApiException.badRequest("image必须来自平台图片上传接口");
        return value;
    }

    private List<String> normalizeTags(List<String> tags){
        if(tags==null)return List.of();
        var result=new ArrayList<String>();
        var seen=new HashSet<String>();
        for(String raw:tags){
            String value=RequestUtil.required(raw,"tag");
            if(value.length()>20)throw ApiException.badRequest("单个标签不能超过20个字符");
            if(seen.add(value))result.add(value);
        }
        if(result.size()>10)throw ApiException.badRequest("标签最多10个");
        return result;
    }

    private List<Domain.SpecOption> normalizeSpecs(List<Domain.SpecOption> specs){
        if(specs==null)return List.of();
        var result=new ArrayList<Domain.SpecOption>();
        var seen=new HashSet<String>();
        for(Domain.SpecOption raw:specs){
            if(raw==null)throw ApiException.badRequest("规格项不能为空");
            String name=RequestUtil.required(raw.name,"specOptions.name");
            if(!seen.add(name))throw ApiException.badRequest("规格名称不能重复");
            BigDecimal delta=RequestUtil.money(raw.priceDelta,"priceDelta");
            result.add(new Domain.SpecOption(name,delta));
        }
        if(result.size()>20)throw ApiException.badRequest("规格最多20项");
        return result;
    }

    private String trim(String value){return value==null?"":value.trim();}
}
