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
    private final SearchTermService searchTerms;
    private final com.elm.practice.mapper.CategoryMapper categories;

    public SearchService(StoreMapper stores, ProductMapper products, PromotionTagService promotionTags,
                         SearchTermService searchTerms,
                         com.elm.practice.mapper.CategoryMapper categories) {
        this.stores = stores; this.products = products; this.promotionTags = promotionTags;
        this.searchTerms = searchTerms; this.categories = categories;
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
        // ---- 两段式召回（2026-09-15 搜索增强，TODO-BE-025）----
        // 第一段：原词直接命中（保准确率，SQL 分页），任一侧零命中才进入第二段。
        long merchantTotal = stores.countSearchStores(k, category);
        long productTotal = products.countSearchByName(k, category);
        List<Map<String, Object>> merchants;
        List<Map<String, Object>> productList;
        if (merchantTotal > 0 && productTotal > 0) {
            int offset = (pageNo - 1) * pageSize;
            merchants = stores.searchStores(k, category, normalizedSort, pageSize, offset)
                    .stream().map(s -> ViewMapper.storeWithTags(s, promotionTags.tags(s.id))).toList();
            productList = products.searchByName(k, category, pageSize, offset)
                    .stream().map(ViewMapper::product).toList();
            result.put("merchants", paged(merchants, pageNo, pageSize, merchantTotal));
            result.put("products", paged(productList, pageNo, pageSize, productTotal));
            return result;
        }
        // 第二段：词条字典重映射（保召回率）——多词联合全量召回 → 相关度打分 → 排序 → 内存分页。
        // 分类条件口径与第一段一致：不存在的分类保持空结果；存在的分类按店铺自身分类收窄。
        if (category != null && categories.findById(category) == null) {
            result.put("merchants", paged(List.of(), pageNo, pageSize, 0L));
            result.put("products", paged(List.of(), pageNo, pageSize, 0L));
            return result;
        }
        SearchTermService.Expansion exp = searchTerms.expand(k);
        List<Domain.Store> storeHits = List.of();
        List<Domain.Product> productHits = List.of();
        if (merchantTotal == 0 || productTotal == 0) {
            List<String> ks = exp.keywords().stream().map(SearchService::escape).toList();
            if (!ks.isEmpty()) {
                java.util.Set<String> storesWithCategory = category == null ? null
                        : stores.searchStoresByKeywords(ks).stream()
                            .flatMap(st -> categories.findByStore(st.id).stream())
                            .filter(c -> c.id.equals(category))
                            .map(c -> c.storeId)
                            .collect(java.util.stream.Collectors.toSet());
                storeHits = stores.searchStoresByKeywords(ks).stream()
                        .filter(st -> category == null
                                || categories.findByStore(st.id).stream().anyMatch(c -> c.id.equals(category)))
                        .toList();
                productHits = products.searchProductsByKeywords(ks).stream()
                        .filter(pr -> category == null || pr.categoryId.equals(category)
                                || (storesWithCategory != null && storesWithCategory.contains(pr.storeId)))
                        .toList();
            }
        }
        List<Domain.Store> rankedStores = storeHits.stream()
                .sorted((a, b) -> {
                    int d = Integer.compare(score(hay(a), exp, k), score(hay(b), exp, k));
                    return d != 0 ? d : compareStores(a, b, normalizedSort);
                }).toList();
        List<Domain.Product> rankedProducts = new java.util.ArrayList<>(productHits);
        if (exp.priceIntent()) {
            rankedProducts.sort((x, y) -> {
                int d = x.price.compareTo(y.price);
                return d != 0 ? d : x.id.compareTo(y.id);
            });
        } else {
            rankedProducts.sort((a, b) -> {
                int d = Integer.compare(score(hay(b), exp, k), score(hay(a), exp, k));
                return d != 0 ? d : compareProducts(a, b);
            });
        }
        merchants = rankedStores.stream().map(s -> ViewMapper.storeWithTags(s, promotionTags.tags(s.id))).toList();
        productList = rankedProducts.stream().map(ViewMapper::product).toList();
        result.put("merchants", paged(slice(merchants, pageNo, pageSize), pageNo, pageSize, (long) merchants.size()));
        result.put("products", paged(slice(productList, pageNo, pageSize), pageNo, pageSize, (long) productList.size()));
        return result;
    }

    /** 联想（契约 §3.6 /search/suggest）：词条+店铺+商品三源合并去重。 */
    public Map<String, Object> suggest(String keyword, Integer limit) {
        return Map.of("suggestions", searchTerms.suggest(keyword, limit == null || limit < 1 || limit > 20 ? 8 : limit));
    }

    /** 热门词（契约 §3.6 /search/hot）：字典 hot 词条按权重，前 3 带 HOT 标记。 */
    public List<Map<String, Object>> hot(Integer limit) {
        return searchTerms.hot(limit == null || limit < 1 || limit > 20 ? 8 : limit);
    }

    private static <T> List<T> slice(List<T> list, int page, int size) {
        int from = Math.min((page - 1) * size, list.size());
        return list.subList(from, Math.min(from + size, list.size()));
    }
    private static String hay(Domain.Store st) {
        return (st.name + " " + (st.description == null ? "" : st.description)).toLowerCase(Locale.ROOT);
    }
    private static String hay(Domain.Product pr) {
        return (pr.name + " " + (pr.description == null ? "" : pr.description)).toLowerCase(Locale.ROOT);
    }
    /** 相关度：原词 3 > 重映射目标词 2 > 别名 1。 */
    private static int score(String hay, SearchTermService.Expansion exp, String q) {
        int best = 0;
        for (String t : exp.targets()) if (hay.contains(t)) best = Math.max(best, 2);
        for (String a : exp.aliases()) if (hay.contains(a)) best = Math.max(best, 1);
        if (hay.contains(q)) best = Math.max(best, q.length() >= 2 ? 3 : 2);
        return best;
    }
    private static int compareStores(Domain.Store a, Domain.Store b, String sort) {
        if ("距离".equals(sort)) {
            double da = a.distanceKm == null ? 0 : a.distanceKm.doubleValue();
            double db = b.distanceKm == null ? 0 : b.distanceKm.doubleValue();
            return Double.compare(da, db);
        }
        if (b.monthlySales != a.monthlySales) return Integer.compare(b.monthlySales, a.monthlySales);
        if ("销量".equals(sort)) return 0;
        return b.rating.compareTo(a.rating);
    }
    private static int compareProducts(Domain.Product a, Domain.Product b) {
        return b.sales != a.sales ? Integer.compare(b.sales, a.sales) : a.id.compareTo(b.id);
    }
    /** LIKE 通配符转义（% _ \）。 */
    private static String escape(String k) {
        return k.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
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
