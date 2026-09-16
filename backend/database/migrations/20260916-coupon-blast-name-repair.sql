-- 爆红包券名修复（2026-09-16，BUG-20260916-001）：替换式爆出曾漏写 coupons.name，
-- 已爆出的券「金额/门槛已更新、券名仍是替换前的旧名」（线上：爆出 ¥18.8 券面仍写「满30减5」）。
-- 派生口径（与 CouponService#couponName 一致）：门槛 0 → 无门槛减{减免}红包；门槛 >0 → 满{门槛}减{减免}红包，
-- 金额去掉无意义的小数尾零（5.00 → 5、18.80 → 18.8）。
-- 幂等：只对 source='BLAST_OUT' 重算，且结果只由 threshold/amount 决定，重复执行结果相同
--       （值已正确时 MySQL 报告 0 行变更）。
-- 范围：仅 BLAST_OUT 券（其名恒由门槛与减免派生）；SEED/PACK 券的名可带自定义前缀
--       （如种子券「肯德基满40减5红包」），一律不覆写。
UPDATE coupons
SET name = IF(threshold = 0,
              CONCAT('无门槛减', TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM CAST(amount AS CHAR))), '红包'),
              CONCAT('满', TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM CAST(threshold AS CHAR))),
                     '减', TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM CAST(amount AS CHAR))), '红包'))
WHERE source = 'BLAST_OUT';

-- 校验（人工执行）：SELECT coupon_id, name, threshold, amount FROM coupons WHERE source='BLAST_OUT';
