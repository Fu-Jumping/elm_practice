-- MySQL 8+ demo seed. Password for both accounts is 123456 (SHA-256 digest only).
INSERT INTO users(user_id,account,password_hash,nickname,created_at) VALUES
('u001','13800000001','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','演示用户',NOW())
ON DUPLICATE KEY UPDATE nickname=VALUES(nickname);
INSERT INTO merchants(merchant_id,account,password_hash,store_id,phone,created_at) VALUES
('ma001','merchant-a','8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92','m002','13800000002',NOW())
ON DUPLICATE KEY UPDATE store_id=VALUES(store_id);
INSERT INTO stores(store_id,merchant_id,name,description,rating,monthly_sales,delivery_minutes,start_price,delivery_fee,status) VALUES
('m001',NULL,'老王小店','家常菜与便当',4.60,1000,30,20.00,3.00,'OPEN'),
('m002','ma001','肯德基宅急送','吮指原味鸡，宅家也能吃',4.80,1000,30,20.00,3.00,'OPEN'),
('m003',NULL,'麦当劳','经典汉堡套餐',4.70,1000,30,20.00,3.00,'OPEN'),
('m004',NULL,'老胖烧烤','夜宵烧烤外卖',4.50,1000,30,20.00,3.00,'TEMPORARILY_CLOSED'),
('m005',NULL,'元盛居火锅','鲜切羊肉火锅',4.60,1000,30,20.00,3.00,'OPEN')
ON DUPLICATE KEY UPDATE name=VALUES(name),status=VALUES(status);
INSERT INTO categories(category_id,store_id,name,sort_order) VALUES
('c101','m001','热销推荐',1),('c102','m002','热销推荐',1),('c103','m003','热销推荐',1),('c104','m004','热销推荐',1),('c105','m005','热销推荐',1)
ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO products(product_id,store_id,category_id,name,description,price,stock,on_sale,sales) VALUES
('p101','m002','c102','吮指原味鸡','经典美味',29.00,20,TRUE,120),
('p102','m002','c102','香辣鸡翅','外酥里嫩',19.00,20,TRUE,88),
('p103','m002','c102','黄金鸡块','分享装',16.00,30,TRUE,75),
('p104','m002','c102','可乐（中杯）','冰爽可口',8.00,40,TRUE,140),
('p105','m002','c102','劲脆鸡腿堡','现做汉堡',25.00,15,TRUE,64),
('p111','m001','c101','红烧肉套餐','米饭配例汤',26.00,20,TRUE,96),
('p112','m001','c101','番茄炒蛋饭','酸甜下饭',18.00,20,TRUE,132),
('p113','m001','c101','宫保鸡丁饭','微辣经典',22.00,20,TRUE,105),
('p114','m001','c101','紫菜蛋花汤','清爽暖胃',6.00,40,TRUE,88),
('p131','m003','c103','巨无霸套餐','汉堡+薯条+可乐',33.00,20,TRUE,150),
('p132','m003','c103','麦辣鸡腿堡','香辣过瘾',24.00,20,TRUE,118),
('p133','m003','c103','薯条（大）','金黄酥脆',13.00,30,TRUE,200),
('p134','m003','c103','可口可乐','冰爽畅饮',9.00,40,TRUE,210),
('p141','m004','c104','羊肉串（10串）','炭火现烤',28.00,20,TRUE,140),
('p142','m004','c104','烤鸡翅','外焦里嫩',18.00,20,TRUE,110),
('p143','m004','c104','烤茄子','蒜香浓郁',12.00,30,TRUE,95),
('p144','m004','c104','冰镇啤酒','夜宵伴侣',10.00,40,TRUE,160),
('p151','m005','c105','鲜切羊肉（半斤）','每天现切',68.00,15,TRUE,80),
('p152','m005','c105','麻辣锅底','牛油麻辣',38.00,20,TRUE,90),
('p153','m005','c105','手切牛上脑','纹理细腻',58.00,15,TRUE,72),
('p154','m005','c105','冻豆腐','吸汤入味',8.00,30,TRUE,60)
ON DUPLICATE KEY UPDATE name=VALUES(name),price=VALUES(price),stock=VALUES(stock),on_sale=VALUES(on_sale);
INSERT INTO addresses(address_id,user_id,contact_name,contact_sex,contact_phone,region,detail,label,is_default,updated_at) VALUES
('da001','u001','张同学','先生','13800000001','天津大学软件园校区','12号楼 304室','学校',TRUE,NOW())
ON DUPLICATE KEY UPDATE detail=VALUES(detail),is_default=VALUES(is_default);
-- 演示订单：1 个进行中、1 个已完成、1 个待支付（支付扩展已选定，契约第 2/3.5 章）。
INSERT INTO orders(order_id,user_id,store_id,address_id,address_snapshot,remark,status,item_subtotal,packaging_fee,total,created_at,paid_at,idempotency_key) VALUES
('o1001','u001','m002','da001',JSON_OBJECT('addressId','da001','contactName','张同学','contactSex','先生','contactPhone','13800000001','region','天津大学软件园校区','detail','12号楼 304室','label','学校','isDefault',TRUE),'少放辣','PROCESSING',29.00,2.00,31.00,DATE_SUB(NOW(),INTERVAL 40 MINUTE),DATE_SUB(NOW(),INTERVAL 40 MINUTE),NULL),
('o1002','u001','m002','da001',JSON_OBJECT('addressId','da001','contactName','张同学','contactSex','先生','contactPhone','13800000001','region','天津大学软件园校区','detail','12号楼 304室','label','学校','isDefault',TRUE),'','COMPLETED',19.00,2.00,21.00,DATE_SUB(NOW(),INTERVAL 2 DAY),DATE_SUB(NOW(),INTERVAL 2 DAY),NULL),
('o1003','u001','m002','da001',JSON_OBJECT('addressId','da001','contactName','张同学','contactSex','先生','contactPhone','13800000001','region','天津大学软件园校区','detail','12号楼 304室','label','学校','isDefault',TRUE),'','PENDING_PAYMENT',25.00,2.00,27.00,NOW(),NULL,NULL)
ON DUPLICATE KEY UPDATE status=VALUES(status),total=VALUES(total);
INSERT INTO order_items(order_id,product_id,name,image,category_id,unit_price,quantity) VALUES
('o1001','p101','吮指原味鸡','','c102',29.00,1),
('o1002','p102','香辣鸡翅','','c102',19.00,1),
('o1003','p105','劲脆鸡腿堡','','c102',25.00,1)
ON DUPLICATE KEY UPDATE name=VALUES(name),unit_price=VALUES(unit_price),quantity=VALUES(quantity);
