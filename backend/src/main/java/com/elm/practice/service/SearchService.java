package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.mapper.ProductMapper;
import com.elm.practice.mapper.StoreMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 契约 §3.6 搜索、排序与分页：一次返回商家与商品两组分页对象（§1.3 列表约定的唯一例外）。
 * 排序：综合 = 销量优先、评分次之（不做加权）；销量 = monthlySales 倒序；距离 = 种子 distanceKm 升序。
 * 分类条件无匹配返回空列表不返回 404；非法 sort / 非正整数 page、size 返回 400；空关键词返回空列表。
 */
@Service
public class SearchService {
    public static final int DEFAULT_PAGE = 1;
    public static final int DEFAULT_SIZE = 10;
    private static final List<String> SORT_VALUES = List.of("综合", "销量", "距离");

    private final StoreMapper stores;
    private final ProductMapper products;
    private final PromotionTagService promotionTags;

    public SearchService(StoreMapper stores, ProductMapper products, PromotionTagService promotionTags) {
        this.stores = stores; this.products = products; this.promotionTags = promotionTags;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> search(String keyword, String categoryId, String sort, String page, String size) {
        String normalizedSort = normalizeSort(sort);
        int pageNo = positive(page, "page", DEFAULT_PAGE);
        int pageSize = positive(size, "size", DEFAULT_SIZE);
        String k = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        Map<String, Object> result = new LinkedHashMap<>();
        if (k.isEmpty()) {
            result.put("merchants", paged(List.of(), pageNo, pageSize, 0L));
            result.put("products", paged(List.of(), pageNo, pageSize, 0L));
            return result;
        }
        String category = categoryId == null || categoryId.isBlank() ? null : categoryId.trim();
        int offset = (pageNo - 1) * pageSize;
        long merchantTotal = stores.countSearchStores(k, category);
        List<Map<String, Object>> merchants = stores.searchStores(k, category, normalizedSort, pageSize, offset)
                .stream().map(s -> ViewMapper.storeWithTags(s, promotionTags.tags(s.id))).toList();
        long productTotal = products.countSearchByName(k, category);
        List<Map<String, Object>> productList = products.searchByName(k, category, pageSize, offset)
                .stream().map(ViewMapper::product).toList();
        result.put("merchants", paged(merchants, pageNo, pageSize, merchantTotal));
        result.put("products", paged(productList, pageNo, pageSize, productTotal));
        return result;
    }

    private static Map<String, Object> paged(List<?> list, int page, int size, long total) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("list", list); m.put("page", page); m.put("size", size); m.put("total", total);
        return m;
    }

    private static String normalizeSort(String sort) {
        if (sort == null || sort.isBlank()) return "综合";
        String value = sort.trim();
        if (!SORT_VALUES.contains(value)) throw ApiException.badRequest("排序取值不合法（综合/销量/距离）");
        return value;
    }

    private static int positive(String raw, String field, int fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        int value;
        try {
            value = Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            throw ApiException.badRequest(field + "必须为正整数");
        }
        if (value < 1) throw ApiException.badRequest(field + "必须为正整数");
        return value;
    }
}
