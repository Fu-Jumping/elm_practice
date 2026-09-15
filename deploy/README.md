# 2026-09-08 发布与复现

本目录针对已有服务器的本次迁移。`release.py` 依赖部署前保存的 PM2 配置与指定备份目录，并非任意机器的一键初始化器。它不会初始化或清空业务数据库。

> **证据时效（2026-09-15 加注，使用前必读）**
> - `release-manifest.json` 是 **2026-09-08 首次发布快照**（`baseline` = `508889ee2c0b09431d93fa40482fe47a9200b0b0`，分支 `fix/deploy-audit-20260908`）。
> - `smoke-result.json` 是 **2026-09-10 10:02 的冒烟证据**（合成订单 `o1178`、测试店 `m1172`）。
> - 两者**均早于 2026-09-13 / 09-14 / 09-15 三批合并**，**不得作为当前代码的证据**；要作为当前版本证据，必须重跑冒烟：
>
> ```bash
> # 服务器上、以当前发布源码目录为工作目录（tag 按实际发布目录替换）
> cd /home/ubuntu/releases/elm-20260914-a2f15b1
> python3 deploy/smoke.py
> ```
>
> 重跑会新增合成数据（不是只读监控，见文末「验证」）；完成后把新的 `deploy/smoke-result.json` 一并提交。

## 运行入口

| 服务 | 地址 |
| --- | --- |
| 用户 H5 | http://82.157.137.114:4001/user/ |
| 商家端 | http://82.157.137.114:4001/ |
| 互动汇报 | http://82.157.137.114:4001/demo/ |
| 后端 | 仅本机 127.0.0.1:4000，由 Nginx 两条 API 路径代理 |

当前 release（**2026-09-14 发布，在线版本 `20260914-a2f15b1`**）：static release `/srv/elm-releases/20260914-a2f15b1`，**`/srv/elm-current` 当前指向它**；源码与构建产物在 `/home/ubuntu/releases/elm-20260914-a2f15b1`。回滚点保留：`/srv/elm-releases/20260913-707f234`（源码 `/home/ubuntu/releases/elm-20260913-707f234`）与更早的 `/srv/elm-releases/20260910-99a646d`（源码 `/home/ubuntu/releases/elm-20260910-e41444c`，提交 `99a646d`）。
`release.py` 已参数化（2026-09-10；默认值仍为 2026-09-08 首次发布）。**风险提示：不带任何参数运行 = 按默认值发布 2026-09-08 首次发布版本（`--source /home/ubuntu/releases/elm-20260908-508889e`、`--tag 20260908-508889e`、`--backup /home/ubuntu/backups/elm-20260908`），等价于把线上回滚到旧版**；正式发布/回滚必须显式传全 `--source` / `--tag` / `--release-sha` / `--backup`。**`--tag` 必须与 `/srv/elm-releases` 下的发布目录名一致，`--release-sha` 是该目录对应的提交号**（2026-09-15 统一：2026-09-10 那次发布为 `--tag 20260910-99a646d --release-sha 99a646d`；`release.py` docstring 示例此前误写为 `20260910-e41444c`，已按此口径改齐）：

```bash
python3 deploy/release.py --source /home/ubuntu/releases/elm-20260910-e41444c \
    --tag 20260910-99a646d --release-sha 99a646d --backup /home/ubuntu/backups/elm-20260908
```

发布前会校验 `--source/www`、`nginx.conf` 模板、`--backup/pm2-before.json` 与后端 jar，缺失即退出，不触碰现网；失败按原逻辑回滚到 `--backup` 指向的版本。

## 构建

使用满足 package.json engines 的 Node（例如服务器现有 22.23.2）、Java 17、Maven 3.6+。三端锁文件不变。对用户端直接调用 Vite 的 base 参数，避免 npm 多层脚本吞掉参数。

```bash
# 在 frontend/user-h5 内
npm ci
npx vitest run
npm run type-check
VITE_API_MODE=real VITE_API_BASE_URL=/user/api/v1 npx vite build --base=/user/

# 在 frontend/merchant-admin 内
npm ci
npm test
VITE_API_MODE=real VITE_API_BASE_URL=/api/v1 npm run build

# 在 backend 内；事先通过私有环境设置 DB_HOST / DB_USER / DB_PASSWORD
DB_NAME=elm_practice_test mvn -B package
```

Windows PowerShell 使用 `$env:VITE_API_MODE='real'` 等独立赋值。后端测试会重置测试数据，DB_NAME 必须是独立测试库；生产 PM2 启动时恢复原业务库名。

### 构建/部署前置清单（2026-09-15 补；缺任一前置条件即发布失败）

- **上传目录**：`backend/uploads/` 必须存在且可写（图片上传目录；配置项 `file.upload-dir` 默认 `uploads`，服务器可用 `FILE_UPLOAD_DIR` 覆盖，见 `backend/src/main/resources/application.properties`）。该目录**不入 Git**，发布后需确认在服务器上持久存在且运行用户可写。
- **AI 点餐助手密钥**：必须在 PM2 环境里配置 `DEEPSEEK_API_KEY`（见 `backend/src/main/resources/application.properties:25` 的 `deepseek.api-key=${DEEPSEEK_API_KEY:}`）。**未配置时 AI 接口（`POST /api/v1/ai/chat`、`POST /api/v1/ai/stream-chat`）返回 503**，其余接口与启动不受影响。
- **数据库重置（仅在需要重置时执行）**：SQL **真源**是 `backend/database/schema/schema.sql` 与 `backend/database/seed/seed.sql`；`backend/src/main/resources/db/` 下是**打包副本**（`schema.sql`、`seed.sql` 与 `upgrade-*.sql` 同源双写，改动必须同步两处）。

  ```bash
  mysql elm_practice < backend/database/schema/schema.sql
  mysql elm_practice < backend/database/seed/seed.sql
  ```

  库名按环境替换（账号与口令由负责人私聊分发，不入仓库）；**测试库必须是 `elm_practice_test`**，**禁止对业务库 `elm_practice` 执行重置类脚本**。

汇集 user-h5/dist 到 www/user、merchant-admin/dist 到 www/merchant，docs/presentation 到 www/demo。`release.py` 复制 www 到 static release、写 Nginx 配置、切换后端、探活，然后停止旧前端 dev 服务并保存 PM2；失败会恢复原应用。

## 验证

```bash
python deploy/smoke.py
sudo nginx -t
curl -f http://127.0.0.1:4001/user/api/v1/stores
curl -f http://127.0.0.1:4001/demo/
```

smoke.py 会注册合成用户/商家、创建并完成合成订单，关闭临时测试店，保留证据；不是纯只读监控。重复运行会新增合成数据。`smoke-result.json` 保留上次运行摘要，人工执行还须确认 Python 退出码为 0 与全部业务断言通过。

## 回滚到本次迁移前版本

已备份 `/home/ubuntu/backups/elm-20260908/source-before.tar.gz`、`database-before.sql`、`pm2-before.json`。首次发布失败时实际执行过应用回滚。正常情况下只需应用回滚，不回灌数据库，以保留发布后的订单。

```bash
# 服务器 ubuntu 用户；restore-backend.json 为本次已生成的私有配置
sudo mv /etc/nginx/conf.d/elm-release.conf /home/ubuntu/backups/elm-20260908/nginx-disabled.conf
sudo nginx -t
sudo systemctl reload nginx
pm2 delete elm-backend
pm2 start /home/ubuntu/backups/elm-20260908/restore-backend.json
pm2 start /home/ubuntu/backups/elm-20260908/restore-frontends.json
pm2 save
```

不要公开 PM2 JSON 或数据库转储，其中包含私有配置或业务数据。源码变更和公开汇报中不保存 SSH / 数据库凭据。

发布收尾时旧前端 PM2 条目已退役；回滚使用上面的 restore-frontends.json 重建，而不依赖旧条目仍存在。该配置已从迁移前快照生成并保存在服务器备份目录，权限 600。
