# backend

Java 17 + Spring Boot 3.5.5 REST 服务，统一前缀为 `/api/v1`，默认监听 `127.0.0.1:4000`（端口口径 4000，见 BUG-20260908-007；服务器由命令行参数同值覆盖）。工程按 Controller/Service/Mapper/Domain 分层；持久化用 MyBatis + MySQL 8（云服务器 `82.157.137.114`），表结构见 `database/schema/schema.sql`。

## 启动（连服务器 MySQL）

```powershell
cd backend
$env:JAVA_HOME="C:\Users\79924\.jdks\ms-17.0.17"  # 本机 JDK 17 路径，按实际调整
$env:DB_HOST="82.157.137.114"; $env:DB_USER="elm"; $env:DB_PASSWORD="你的密码"; $env:DB_NAME="elm_practice"
mvn spring-boot:run
```

连接参数经环境变量注入，密码不入仓库；`application.properties` 默认指向本机，部署时设置 `DB_*` 覆盖。建表与种子由 `DatabaseInitializer` 启动时幂等执行（users 表为空才插种子）。

固定演示账号：用户 `13800000001 / 123456`，商家 `merchant-a / 123456`。登录后通过 Session Cookie 访问受保护接口。种子数据含三个演示订单：`o1001` 进行中、`o1002` 已完成、`o1003` 待支付（用于 `POST /api/v1/orders/{orderId}/payment` 演示，15 分钟内有效，超时返回 409）。接口字段与状态以 `docs/backend/后端接口契约.md` 为准，架构说明见 `docs/backend/架构设计.md`。

## 校验

```powershell
$env:DB_HOST="82.157.137.114"; $env:DB_USER="elm"; $env:DB_PASSWORD="你的密码"; $env:DB_NAME="elm_practice_test"
mvn clean test   # 连服务器独立测试库，每用例前 reset.sql 复位
mvn package
```

所有错误均返回 `{code,message,data,details}` JSON；角色和资源归属由后端 Service 校验。
