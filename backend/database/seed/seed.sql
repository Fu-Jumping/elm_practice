-- MySQL 8+ demo seed. Password for both accounts is 123456 (SHA-256 digest only).
-- 目录真源：图片清单.md。商品编号、图片文件、店铺归属、分类必须保持一一对应。
-- 应用启动时仅当 users 为空才执行；已有环境使用 catalog-alignment.sql 做一次性对齐。
-- 演示账号 u001 为会员（契约 §3.8，与 upgrade-member.sql 的存量库标记一致）。
INSERT INTO users(user_id,account,password_hash,nickname,created_at,is_member,member_activated_at) VALUES
('u001','13800000001','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','演示用户',NOW(),TRUE,DATE_SUB(NOW(),INTERVAL 30 DAY))
ON DUPLICATE KEY UPDATE nickname=VALUES(nickname);
INSERT INTO merchants(merchant_id,account,password_hash,store_id,phone,created_at) VALUES
('ma001','merchant-a','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','m002','13800000002',NOW())
ON DUPLICATE KEY UPDATE store_id=VALUES(store_id);

INSERT INTO stores(store_id,merchant_id,name,description,rating,monthly_sales,delivery_minutes,start_price,delivery_fee,image,status) VALUES
('m001',NULL,'老王小店','家常小炒 · 经济实惠',4.60,1200,30,15.00,3.00,'/demo-images/store-m001.jpg','OPEN'),
('m002','ma001','肯德基宅急送','炸鸡汉堡 · 外卖到家',4.80,3500,25,20.00,5.00,'/demo-images/store-m002.jpg','OPEN'),
('m003',NULL,'麦当劳','经典快餐 · 随时开吃',4.70,2800,25,20.00,5.00,'/demo-images/store-m003.jpg','OPEN'),
('m004',NULL,'老胖烧烤','深夜食堂 · 现烤现送',4.50,800,40,30.00,4.00,'/demo-images/store-m004.jpg','TEMPORARILY_CLOSED'),
('m005',NULL,'元盛居火锅','铜锅涮肉 · 宅家开涮',4.90,950,45,50.00,6.00,'/demo-images/store-m005.jpg','OPEN')
ON DUPLICATE KEY UPDATE
  name=VALUES(name),description=VALUES(description),rating=VALUES(rating),monthly_sales=VALUES(monthly_sales),
  delivery_minutes=VALUES(delivery_minutes),start_price=VALUES(start_price),delivery_fee=VALUES(delivery_fee),
  image=VALUES(image),status=VALUES(status);

-- 分类 ID 按店铺分段，避免不同商家复用同一个分类 ID 导致商品串店。
INSERT INTO categories(category_id,store_id,name,sort_order) VALUES
('c201','m001','招牌',1),('c202','m001','配菜',2),
('c101','m002','主食',1),('c102','m002','小食',2),('c103','m002','饮品',3),
('c301','m003','招牌',1),('c302','m003','配菜',2),
('c401','m004','招牌',1),('c402','m004','配菜',2),
('c501','m005','招牌',1),('c502','m005','配菜',2)
ON DUPLICATE KEY UPDATE store_id=VALUES(store_id),name=VALUES(name),sort_order=VALUES(sort_order);

-- 商品与图片清单逐项对应；p101–p106 是肯德基主菜单，p201–p209 是其余四店菜单。
-- member_price 仅 m002（会员店）给演示会员价，其余店铺 NULL（契约 §3.2/§3.8）。
INSERT INTO products(product_id,store_id,category_id,name,description,image,price,member_price,stock,on_sale,sales) VALUES
('p201','m001','c201','家常豆腐','下饭神器','/demo-images/product-m001-04.jpg',12.00,NULL,50,TRUE,300),
('p202','m001','c201','鱼香肉丝','酸甜下饭','/demo-images/product-m001-05.jpg',15.00,NULL,40,TRUE,260),
('p203','m001','c202','米饭','粒粒分明','/demo-images/product-m001-06.jpg',2.00,NULL,100,TRUE,180),
('p101','m002','c101','香辣鸡腿堡','招牌汉堡，香辣多汁','/demo-images/product-m002-01.jpg',19.50,18.50,100,TRUE,1200),
('p102','m002','c101','劲脆鸡腿堡','外酥里嫩，经典之选','/demo-images/product-m002-02.jpg',19.50,18.50,100,TRUE,960),
('p103','m002','c101','老北京鸡肉卷','经典风味，饱腹满足','/demo-images/product-m002-03.jpg',17.00,16.10,80,TRUE,880),
('p104','m002','c102','黄金鸡块（5块）','分享装，外酥里嫩','/demo-images/product-m002-04.jpg',11.50,10.90,120,TRUE,750),
('p105','m002','c103','九珍果汁','冰爽解腻','/demo-images/product-m002-05.jpg',9.00,8.50,150,TRUE,640),
('p106','m002','c101','热辣香骨鸡（5块）','销量冠军，售完即止','/demo-images/product-m002-06.jpg',13.90,13.20,0,TRUE,0),
('p204','m003','c301','巨无霸','经典双层牛肉','/demo-images/product-m003-01.jpg',25.50,NULL,60,TRUE,1800),
('p205','m003','c302','薯条（大）','金黄酥脆','/demo-images/product-m003-03.jpg',11.00,NULL,80,TRUE,900),
('p206','m004','c401','羊肉串（10串）','现烤现送','/demo-images/product-m004-01.jpg',28.00,NULL,30,TRUE,500),
('p207','m004','c402','烤茄子','蒜香浓郁','/demo-images/product-m004-02.jpg',10.00,NULL,20,TRUE,300),
('p208','m005','c501','精品肥牛','纹理细腻，涮煮鲜嫩','/demo-images/product-m005-01.jpg',39.00,NULL,25,TRUE,400),
('p209','m005','c502','手切鲜羊肉','现切鲜羊肉','/demo-images/product-m005-02.jpg',46.00,NULL,18,TRUE,350)
ON DUPLICATE KEY UPDATE
  store_id=VALUES(store_id),category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),
  image=VALUES(image),price=VALUES(price),member_price=VALUES(member_price),stock=VALUES(stock),on_sale=VALUES(on_sale),sales=VALUES(sales);

INSERT INTO addresses(address_id,user_id,contact_name,contact_sex,contact_phone,region,detail,label,is_default,updated_at) VALUES
('da001','u001','张同学','先生','13800000001','天津大学北洋园校区','12号楼 304室','学校',TRUE,NOW())
ON DUPLICATE KEY UPDATE region=VALUES(region),detail=VALUES(detail),is_default=VALUES(is_default);

-- 演示订单：商品快照也必须跟商品目录保持一致。
-- 金额按批次①计价口径（u001 在 m002 非新客、小计 <20 无满减、<30 不免配送费，m002 配送费 5.00）：
-- 实付 = 小计 + 配送费 5.00 + 打包费 2.00。
INSERT INTO orders(order_id,user_id,store_id,address_id,address_snapshot,remark,status,item_subtotal,packaging_fee,total,delivery_fee,full_reduction_amount,new_customer_amount,member_discount_amount,coupon_amount,delivery_fee_discount,created_at,paid_at,idempotency_key) VALUES
('o1001','u001','m002','da001',JSON_OBJECT('addressId','da001','contactName','张同学','contactSex','先生','contactPhone','13800000001','region','天津大学北洋园校区','detail','12号楼 304室','label','学校','isDefault',TRUE),'少放辣','PROCESSING',19.50,2.00,26.50,5.00,0.00,0.00,0.00,0.00,0.00,DATE_SUB(NOW(),INTERVAL 40 MINUTE),DATE_SUB(NOW(),INTERVAL 40 MINUTE),NULL),
('o1002','u001','m002','da001',JSON_OBJECT('addressId','da001','contactName','张同学','contactSex','先生','contactPhone','13800000001','region','天津大学北洋园校区','detail','12号楼 304室','label','学校','isDefault',TRUE),'','COMPLETED',19.50,2.00,26.50,5.00,0.00,0.00,0.00,0.00,0.00,DATE_SUB(NOW(),INTERVAL 2 DAY),DATE_SUB(NOW(),INTERVAL 2 DAY),NULL),
('o1003','u001','m002','da001',JSON_OBJECT('addressId','da001','contactName','张同学','contactSex','先生','contactPhone','13800000001','region','天津大学北洋园校区','detail','12号楼 304室','label','学校','isDefault',TRUE),'','PENDING_PAYMENT',9.00,2.00,16.00,5.00,0.00,0.00,0.00,0.00,0.00,NOW(),NULL,NULL)
ON DUPLICATE KEY UPDATE status=VALUES(status),item_subtotal=VALUES(item_subtotal),packaging_fee=VALUES(packaging_fee),total=VALUES(total),delivery_fee=VALUES(delivery_fee),full_reduction_amount=VALUES(full_reduction_amount),new_customer_amount=VALUES(new_customer_amount),member_discount_amount=VALUES(member_discount_amount),coupon_amount=VALUES(coupon_amount),delivery_fee_discount=VALUES(delivery_fee_discount),address_snapshot=VALUES(address_snapshot);
INSERT INTO order_items(order_id,product_id,name,image,category_id,unit_price,quantity) VALUES
('o1001','p101','香辣鸡腿堡','/demo-images/product-m002-01.jpg','c101',19.50,1),
('o1002','p102','劲脆鸡腿堡','/demo-images/product-m002-02.jpg','c101',19.50,1),
('o1003','p105','九珍果汁','/demo-images/product-m002-05.jpg','c103',9.00,1)
ON DUPLICATE KEY UPDATE product_id=VALUES(product_id),name=VALUES(name),image=VALUES(image),category_id=VALUES(category_id),unit_price=VALUES(unit_price),quantity=VALUES(quantity);

-- 批次① 演示促销配置（m002：满 20 减 2、满 40 减 5、新客立减 3、满 30 免配送费、会员 95 折），
-- 与迁移脚本 20260912-promotion-tiers.sql 步骤 5 保持一致。
INSERT INTO promotions(store_id, enabled, threshold, amount, new_user_amount, free_delivery_threshold, member_discount)
VALUES ('m002', TRUE, 0, 0, 3.00, 30.00, 0.95)
ON DUPLICATE KEY UPDATE enabled=VALUES(enabled), new_user_amount=VALUES(new_user_amount),
  free_delivery_threshold=VALUES(free_delivery_threshold), member_discount=VALUES(member_discount);
INSERT IGNORE INTO promotion_tiers(store_id, threshold, amount, sort_order)
VALUES ('m002', 20.00, 2.00, 1), ('m002', 40.00, 5.00, 2);

-- 批次⑥ 演示红包（契约 §3.8：全场券与指定商家券各至少 1 张；新环境仅在 users 为空时随种子落库）。
INSERT INTO coupons(coupon_id,user_id,name,amount,threshold,scope,store_id,valid_from,valid_to,used,source,can_blast)
VALUES ('cp001','u001','满20减2红包',2.00,20.00,'ALL',NULL,DATE_SUB(NOW(),INTERVAL 1 DAY),DATE_ADD(NOW(),INTERVAL 30 DAY),FALSE,'SEED',FALSE),
       ('cp002','u001','肯德基满40减5红包',5.00,40.00,'STORE','m002',DATE_SUB(NOW(),INTERVAL 1 DAY),DATE_ADD(NOW(),INTERVAL 30 DAY),FALSE,'SEED',FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name);
