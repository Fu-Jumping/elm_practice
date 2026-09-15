-- 搜索词条字典（2026-09-15 搜索增强）：词条 + 别名（联想展示）+ 检索目标词（重映射展开）。
-- 幂等：建表 IF NOT EXISTS + 种子 ON DUPLICATE KEY UPDATE。
CREATE TABLE IF NOT EXISTS search_terms (
  term_id INT AUTO_INCREMENT PRIMARY KEY,
  term VARCHAR(40) NOT NULL UNIQUE,
  aliases JSON NOT NULL,
  targets JSON NOT NULL,
  kind VARCHAR(12) NOT NULL,
  weight INT NOT NULL DEFAULT 1,
  hot BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO search_terms(term, aliases, targets, kind, weight, hot) VALUES
('辣', '["麻辣","香辣","变态辣","重口味","火辣"]', '["香辣","鱼香","辣"]', 'flavor', 9, TRUE),
('炸鸡', '["鸡米花","鸡腿","鸡块","鸡翅"]', '["鸡","炸鸡"]', 'category', 9, TRUE),
('汉堡', '["burger","汉煲","堡"]', '["堡"]', 'category', 8, TRUE),
('烧烤', '["撸串","烤串","夜宵","烤肉"]', '["烤","串"]', 'category', 8, TRUE),
('火锅', '["涮锅","涮肉","铜锅"]', '["涮","肥牛","羊肉"]', 'category', 7, TRUE),
('果汁', '["饮品","饮料","喝的","奶茶","可乐","解腻","解渴"]', '["果汁","九珍"]', 'category', 7, TRUE),
('肯德基', '["kfc","开封菜","肯德基宅急送"]', '["肯德基","鸡腿堡"]', 'brand', 8, TRUE),
('便宜', '["实惠","低价","平价","省钱","经济"]', '["米饭","果汁","豆腐"]', 'intent', 6, TRUE),
('甜', '["甜品","甜点","嗜甜"]', '["甜","九珍"]', 'flavor', 5, FALSE),
('酸', '["酸甜","酸辣"]', '["酸","鱼香"]', 'flavor', 4, FALSE),
('清淡', '["清爽","沙拉","轻食"]', '["豆腐","涮"]', 'flavor', 4, FALSE),
('酥脆', '["脆皮","香脆"]', '["脆","酥"]', 'flavor', 4, FALSE),
('家常菜', '["小炒","下饭","家常","麻辣烫"]', '["豆腐","肉丝","米饭"]', 'category', 5, FALSE),
('主食', '["米饭","面条","饺子","寿司","包子"]', '["米饭","鸡肉卷"]', 'category', 5, FALSE),
('甜品', '["冰粉","蛋糕","棉花糖","糖水"]', '["甜","果汁"]', 'category', 5, FALSE),
('麦当劳', '["m记","金拱门","macdonald"]', '["麦当劳","巨无霸"]', 'brand', 6, FALSE),
('老王小店', '["老王"]', '["老王"]', 'brand', 4, FALSE),
('老胖烧烤', '["老胖"]', '["老胖","串"]', 'brand', 4, FALSE),
('元盛居', '["元盛"]', '["元盛居","肥牛"]', 'brand', 4, FALSE)
ON DUPLICATE KEY UPDATE aliases=VALUES(aliases), targets=VALUES(targets), kind=VALUES(kind), weight=VALUES(weight), hot=VALUES(hot);
