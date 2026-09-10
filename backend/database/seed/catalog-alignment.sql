-- 2026-09-08 演示目录对齐迁移
-- 用途：服务器已经有运行期订单/用户，DatabaseInitializer 不会重新执行 seed.sql，
-- 因此单独、可重复执行一次，修正旧 seed 中商品图片、名称、归属和分类。
-- 执行前请先备份数据库；本脚本只触碰固定演示 ID，不删除 QA 临时店铺。
START TRANSACTION;

-- 订单明细保存了商品快照（名称/图片/价格），因此旧商品行可以安全移除；
-- 同时清掉旧购物车行，避免用户端继续提交已下线的商品。
DELETE FROM cart_lines
WHERE product_id IN ('p111','p112','p113','p114','p131','p132','p133','p134','p141','p142','p143','p144','p151','p152','p153','p154');
DELETE FROM products
WHERE product_id IN ('p111','p112','p113','p114','p131','p132','p133','p134','p141','p142','p143','p144','p151','p152','p153','p154');
DELETE FROM categories
WHERE category_id IN ('c101','c102','c103','c104','c105');

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

INSERT INTO categories(category_id,store_id,name,sort_order) VALUES
('c201','m001','招牌',1),('c202','m001','配菜',2),
('c101','m002','主食',1),('c102','m002','小食',2),('c103','m002','饮品',3),
('c301','m003','招牌',1),('c302','m003','配菜',2),
('c401','m004','招牌',1),('c402','m004','配菜',2),
('c501','m005','招牌',1),('c502','m005','配菜',2)
ON DUPLICATE KEY UPDATE store_id=VALUES(store_id),name=VALUES(name),sort_order=VALUES(sort_order);

INSERT INTO products(product_id,store_id,category_id,name,description,image,price,stock,on_sale,sales) VALUES
('p201','m001','c201','家常豆腐','下饭神器','/demo-images/product-m001-04.jpg',12.00,50,TRUE,300),
('p202','m001','c201','鱼香肉丝','酸甜下饭','/demo-images/product-m001-05.jpg',15.00,40,TRUE,260),
('p203','m001','c202','米饭','粒粒分明','/demo-images/product-m001-06.jpg',2.00,100,TRUE,180),
('p101','m002','c101','香辣鸡腿堡','招牌汉堡，香辣多汁','/demo-images/product-m002-01.jpg',19.50,100,TRUE,1200),
('p102','m002','c101','劲脆鸡腿堡','外酥里嫩，经典之选','/demo-images/product-m002-02.jpg',19.50,100,TRUE,960),
('p103','m002','c101','老北京鸡肉卷','经典风味，饱腹满足','/demo-images/product-m002-03.jpg',17.00,80,TRUE,880),
('p104','m002','c102','黄金鸡块（5块）','分享装，外酥里嫩','/demo-images/product-m002-04.jpg',11.50,120,TRUE,750),
('p105','m002','c103','九珍果汁','冰爽解腻','/demo-images/product-m002-05.jpg',9.00,150,TRUE,640),
('p106','m002','c101','热辣香骨鸡（5块）','销量冠军，售完即止','/demo-images/product-m002-06.jpg',13.90,0,TRUE,0),
('p204','m003','c301','巨无霸','经典双层牛肉','/demo-images/product-m003-01.jpg',25.50,60,TRUE,1800),
('p205','m003','c302','薯条（大）','金黄酥脆','/demo-images/product-m003-03.jpg',11.00,80,TRUE,900),
('p206','m004','c401','羊肉串（10串）','现烤现送','/demo-images/product-m004-01.jpg',28.00,30,TRUE,500),
('p207','m004','c402','烤茄子','蒜香浓郁','/demo-images/product-m004-02.jpg',10.00,20,TRUE,300),
('p208','m005','c501','精品肥牛','纹理细腻，涮煮鲜嫩','/demo-images/product-m005-01.jpg',39.00,25,TRUE,400),
('p209','m005','c502','手切鲜羊肉','现切鲜羊肉','/demo-images/product-m005-02.jpg',46.00,18,TRUE,350)
ON DUPLICATE KEY UPDATE
  store_id=VALUES(store_id),category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),
  image=VALUES(image),price=VALUES(price),stock=VALUES(stock),on_sale=VALUES(on_sale),sales=VALUES(sales);

UPDATE orders SET item_subtotal=19.50, packaging_fee=2.00, total=21.50,
  address_snapshot=JSON_SET(address_snapshot,'$.region','天津大学北洋园校区')
WHERE order_id IN ('o1001','o1002') AND store_id='m002';
UPDATE orders SET item_subtotal=9.00, packaging_fee=2.00, total=11.00,
  address_snapshot=JSON_SET(address_snapshot,'$.region','天津大学北洋园校区')
WHERE order_id='o1003' AND store_id='m002';
UPDATE order_items SET product_id='p101',name='香辣鸡腿堡',image='/demo-images/product-m002-01.jpg',category_id='c101',unit_price=19.50
WHERE order_id='o1001';
UPDATE order_items SET product_id='p102',name='劲脆鸡腿堡',image='/demo-images/product-m002-02.jpg',category_id='c101',unit_price=19.50
WHERE order_id='o1002';
UPDATE order_items SET product_id='p105',name='九珍果汁',image='/demo-images/product-m002-05.jpg',category_id='c103',unit_price=9.00
WHERE order_id='o1003';

COMMIT;
