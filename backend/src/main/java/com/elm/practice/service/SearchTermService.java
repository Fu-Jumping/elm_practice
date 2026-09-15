package com.elm.practice.service;

import com.elm.practice.common.JsonLists;
import com.elm.practice.mapper.SearchTermMapper;
import com.elm.practice.mapper.StoreMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/**
 * 搜索词条字典（2026-09-15 搜索增强）。
 *
 * 解决纯子串匹配召回不足的问题：用户口语词（炸鸡/奶茶/寿司/沙拉/kfc/便宜）经
 * 词条重映射展开为一组实义关键词（targets 优先、别名次之、原词兜底），再做多词
 * 联合召回 + 相关度打分；字典同时是联想（suggest）与热门词（hot）的唯一数据源。
 * 字典缓存于内存，test: 提交上复跑红端、feat: 后转绿。
 */
@Service
public class SearchTermService {
    private final SearchTermMapper terms;
    private final StoreMapper stores;
    private volatile List<Entry> cache;

    /** 字典条目：term 标准词 / aliases 联想别名 / targets 检索重映射目标词（人工策展，允许单字）。 */
    public record Entry(String term, List<String> aliases, List<String> targets, String kind, int weight, boolean hot) {}

    public SearchTermService(SearchTermMapper terms, StoreMapper stores) {
        this.terms = terms; this.stores = stores;
    }

    private List<Entry> dict() {
        if (cache == null) {
            List<Entry> list = new ArrayList<>();
            for (Map<String, Object> row : terms.findAll()) {
                list.add(new Entry(String.valueOf(row.get("term")),
                        JsonLists.tags(String.valueOf(row.get("aliases"))),
                        JsonLists.tags(String.valueOf(row.get("targets"))),
                        String.valueOf(row.get("kind")),
                        ((Number) row.get("weight")).intValue(),
                        Boolean.TRUE.equals(row.get("hot"))));
            }
            cache = list;
        }
        return cache;
    }

    /** 字典命中：q 等于词条/别名，或 q 含多字别名，或多字词条/别名包含 q（前缀联想语义）。 */
    private boolean hit(String q, String word) {
        if (q.equals(word)) return true;
        if (word.length() >= 2 && q.contains(word)) return true;
        return q.length() >= 2 && word.contains(q);
    }

    /** 查询展开：返回重映射结果（keywords 按权重排序去重；intentPrice 标记价格意图）。 */
    public Expansion expand(String q) {
        String query = q == null ? "" : q.trim().toLowerCase();
        LinkedHashSet<String> targets = new LinkedHashSet<>();
        LinkedHashSet<String> aliases = new LinkedHashSet<>();
        boolean priceIntent = false;
        if (!query.isEmpty()) {
            for (Entry e : dict()) {
                boolean matched = hit(query, e.term()) || e.aliases().stream().anyMatch(a -> hit(query, a));
                if (!matched) continue;
                targets.add(e.term());
                targets.addAll(e.targets());
                e.aliases().stream().filter(a -> a.length() >= 2).forEach(aliases::add);
                if ("intent".equals(e.kind()) && "便宜".equals(e.term())) priceIntent = true;
            }
        }
        return new Expansion(query, new ArrayList<>(targets), new ArrayList<>(aliases), priceIntent);
    }

    public record Expansion(String query, List<String> targets, List<String> aliases, boolean priceIntent) {
        /** 联合召回的全部关键词（原词 + 目标词 + 多字节名），已去重。 */
        public List<String> keywords() {
            LinkedHashSet<String> all = new LinkedHashSet<>();
            if (!query.isEmpty()) all.add(query);
            all.addAll(targets);
            all.addAll(aliases);
            return new ArrayList<>(all);
        }
    }

    /** 联想：词条（词/别名含 q）+ 店铺名 + 商品名，三源合并去重。 */
    public List<Map<String, Object>> suggest(String q, int limit) {
        String query = q == null ? "" : q.trim().toLowerCase();
        List<Map<String, Object>> out = new ArrayList<>();
        if (query.isEmpty()) return out;
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        for (Entry e : dict()) {
            boolean m = e.term().toLowerCase().contains(query)
                    || e.aliases().stream().anyMatch(a -> a.toLowerCase().contains(query) || query.contains(a));
            if (m && seen.add(e.term())) {
                out.add(Map.of("text", e.term(), "source", "term"));
            }
        }
        for (String name : stores.suggestStoreNames(query)) {
            if (seen.add(name)) out.add(Map.of("text", name, "source", "store"));
        }
        for (String name : stores.suggestProductNames(query)) {
            if (seen.add(name)) out.add(Map.of("text", name, "source", "product"));
        }
        return out.size() > limit ? new ArrayList<>(out.subList(0, limit)) : out;
    }

    /** 热门词：字典 hot 词条按权重排序；前 3 名带 HOT 标记（对齐设计稿 8 词 3 HOT 形态）。 */
    public List<Map<String, Object>> hot(int limit) {
        List<Map<String, Object>> out = new ArrayList<>();
        int rank = 0;
        for (Map<String, Object> row : terms.findHot(limit)) {
            rank++;
            out.add(new LinkedHashMap<>(Map.of("word", String.valueOf(row.get("term")),
                    "hot", rank <= 3)));
        }
        return out;
    }
}
