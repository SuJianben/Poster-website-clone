# Google Apps Script 评论测试

这套测试流程是：客户提交评论 -> Google Sheet（`PENDING`）-> 你审核 -> 改成 `APPROVED` -> 点击菜单发布 -> 商品页显示。

## 1. 创建审核表

1. 新建一个 Google Sheet。
2. 打开“扩展程序 -> Apps Script”。
3. 删除默认代码，把 [`review-moderation.gs`](../scripts/google-apps-script/review-moderation.gs) 的全部内容复制进去并保存。
4. 回到表格，刷新页面，打开“Review moderation -> Initialize review sheet”。

## 2. 创建 Shopify 元字段

在 Shopify 后台打开“设置 -> 自定义数据 -> 产品”，新增定义：

- 名称：已发布评论
- 命名空间和键：`custom.approved_reviews`
- 类型：JSON

主题会把这个 JSON 元字段里的评论和原来的“客户评论”区块一起显示。

## 3. 配置发布权限

在 Apps Script 的“项目设置 -> 脚本属性”中新增：

- `SHOPIFY_STORE_DOMAIN`：店铺的 `your-store.myshopify.com`
- `SHOPIFY_ADMIN_TOKEN`：Shopify 自定义应用的 Admin API access token
- `SHOPIFY_API_VERSION`：可选，默认 `2025-10`

自定义应用至少需要 `read_products` 和 `write_products` 权限。Token 只放在脚本属性中，不要放入主题设置、Liquid 或前端 JavaScript。

## 4. 部署接收地址

在 Apps Script 中点击“部署 -> 新部署”：

- 类型：Web 应用
- 执行身份：我
- 谁可以访问：任何人

复制生成的 `/exec` 地址。不要使用 `/dev` 地址。

## 5. 填入主题

在 Shopify 主题编辑器打开 `page.write-review` 页面，选中“撰写评论”区块，在“Google Apps Script 审核地址”中填入 `/exec` 地址并保存。

留空时，页面仍使用 Shopify 原生联系表单；填入后，表单会进入 Google Sheet，不会自动公开评论。

## 6. 测试发布

1. 打开前台写评论页面，填写姓名、邮箱、评分、标题、正文，并确保当前页面有对应商品。
2. 提交后，在 Google Sheet 中找到状态为 `PENDING` 的行。
3. 检查内容，把状态改成 `APPROVED`。
4. 回到表格菜单，点击“Review moderation -> Publish APPROVED reviews”。
5. 刷新对应商品页，评论会从 `custom.approved_reviews` 读取并显示。

如果发布结果为 `ERROR`，查看该行最后一列的错误信息。常见原因是产品 ID 缺失、元字段不是 JSON、Token 权限不足或店铺域名填写错误。

## 注意事项

- Web App 地址是公开的，提交内容必须人工审核；脚本不会自动发布。
- 邮箱、年龄、职业、房间和 Instagram 只留在审核表，不会写入公开评论 JSON。
- 测试版图片使用 HTTPS 图片链接；正式上线建议增加 CAPTCHA 或改用 Shopify App Proxy/评论应用。
