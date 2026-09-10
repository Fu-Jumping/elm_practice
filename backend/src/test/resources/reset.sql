-- 每个测试方法前执行：清空全部业务表并重插与生产一致的演示种子。
SET FOREIGN_KEY_CHECKS=0;
TRUNCATE TABLE messages;
TRUNCATE TABLE conversations;
TRUNCATE TABLE reviews;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE cart_lines;
TRUNCATE TABLE addresses;
TRUNCATE TABLE products;
TRUNCATE TABLE categories;
TRUNCATE TABLE promotions;
TRUNCATE TABLE stores;
TRUNCATE TABLE merchants;
TRUNCATE TABLE users;
TRUNCATE TABLE id_sequence;
SET FOREIGN_KEY_CHECKS=1;
INSERT INTO id_sequence(name,next_val) VALUES ('global',1004);
-- MySQL 8+ demo seed. Password for both accounts is 123456 (SHA-256 digest only).
-- 目录真源：图片清单.md。商品编号、图片文件、店铺归属、分类必须保持一一对应。
-- 应用启动时仅当 users 为空才执行；已有环境使用 catalog-alignment.sql 做一次性对齐。
INSERT INTO users(user_id,account,password_hash,nickname,created_at) VALUES
('u001','13800000001','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','演示用户',NOW())
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

INSERT INTO addresses(address_id,user_id,contact_name,contact_sex,contact_phone,region,detail,label,is_default,updated_at) VALUES
('da001','u001','张同学','先生','13800000001','天津大学北洋园校区','12号楼 304室','学校',TRUE,NOW())
ON DUPLICATE KEY UPDATE region=VALUES(region),detail=VALUES(detail),is_default=VALUES(is_default);

-- 演示订单：商品快照也必须跟商品目录保持一致。
INSERT INTO orders(order_id,user_id,store_id,address_id,address_snapshot,remark,status,item_subtotal,packaging_fee,total,created_at,paid_at,idempotency_key) VALUES
('o1001','u001','m002','da001',JSON_OBJECT('addressId','da001','contactName','张同学','contactSex','先生','contactPhone','13800000001','region','天津大学北洋园校区','detail','12号楼 304室','label','学校','isDefault',TRUE),'少放辣','PROCESSING',19.50,2.00,21.50,DATE_SUB(NOW(),INTERVAL 40 MINUTE),DATE_SUB(NOW(),INTERVAL 40 MINUTE),NULL),
('o1002','u001','m002','da001',JSON_OBJECT('addressId','da001','contactName','张同学','contactSex','先生','contactPhone','13800000001','region','天津大学北洋园校区','detail','12号楼 304室','label','学校','isDefault',TRUE),'','COMPLETED',19.50,2.00,21.50,DATE_SUB(NOW(),INTERVAL 2 DAY),DATE_SUB(NOW(),INTERVAL 2 DAY),NULL),
('o1003','u001','m002','da001',JSON_OBJECT('addressId','da001','contactName','张同学','contactSex','先生','contactPhone','13800000001','region','天津大学北洋园校区','detail','12号楼 304室','label','学校','isDefault',TRUE),'','PENDING_PAYMENT',9.00,2.00,11.00,NOW(),NULL,NULL)
ON DUPLICATE KEY UPDATE status=VALUES(status),item_subtotal=VALUES(item_subtotal),packaging_fee=VALUES(packaging_fee),total=VALUES(total),address_snapshot=VALUES(address_snapshot);
INSERT INTO order_items(order_id,product_id,name,image,category_id,unit_price,quantity) VALUES
('o1001','p101','香辣鸡腿堡','/demo-images/product-m002-01.jpg','c101',19.50,1),
('o1002','p102','劲脆鸡腿堡','/demo-images/product-m002-02.jpg','c101',19.50,1),
('o1003','p105','九珍果汁','/demo-images/product-m002-05.jpg','c103',9.00,1)
ON DUPLICATE KEY UPDATE product_id=VALUES(product_id),name=VALUES(name),image=VALUES(image),category_id=VALUES(category_id),unit_price=VALUES(unit_price),quantity=VALUES(quantity);
