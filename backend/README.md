# backend

Java 17 + Spring Boot 3.5.5 REST 服务，统一前缀为 `/api/v1`，默认监听 `127.0.0.1:8080`。工程按 Controller/Service/Repository/Domain 分层；当前使用可重复初始化的内存 Repository，便于课程本地联调，SQL 表结构见 `database/schema/schema.sql`。

## 启动

```powershell
cd backend
mvn spring-boot:run
```

固定演示账号：用户 `13800000001 / 123456`，商家 `merchant-a / 123456`。登录后通过 Session Cookie 访问受保护接口。种子数据含三个演示订单：`o1001` 进行中、`o1002` 已完成、`o1003` 待支付（用于 `POST /api/v1/orders/{orderId}/payment` 演示，15 分钟内有效，超时返回 409）。接口字段与状态以 `docs/backend/后端接口契约.md` 为准，架构说明见 `docs/backend/架构设计.md`。

## 校验

```powershell
mvn test
mvn package
```

所有错误均返回 `{code,message,data,details}` JSON；角色和资源归属由后端 Service 校验。
