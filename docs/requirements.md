# 二站需求分析与开发计划

## 目标

以 `dotcomcanvas.de.zip` 的首页快照为参考，构建独立的 Shopify Online Store 2.0 海报商城。主题运行完全依赖 Shopify 原生的商品、集合、菜单、搜索和购物车数据；不依赖参考站的抓取页面或第三方服务。

## 开发范围

- 全局：促销栏、响应式导航、搜索、迷你购物车、页脚。
- 首页：主视觉商品、促销滚动条、精选商品、客户/灵感画廊、分类与材质入口、评价、订阅与服务承诺。
- 商城链路：商品变体与加购、集合商品网格、搜索、购物车、内容页与 404。
- 配置：品牌、颜色、主视觉、首页模块内容、集合来源和链接都应在 Shopify 主题编辑器中编辑。

## 不迁移的内容

不复制参考站的后台数据、广告像素、Klaviyo、支付/风控、商品定制应用、Cookie 服务、客户信息或第三方应用脚本。Shopify checkout 保持平台托管。

## 数据与埋点

商品、价格、库存、变体和集合只读取 Shopify 对象。前端事件由 `assets/analytics.js` 统一派发为站内 `CustomEvent`，包括 `site_nav_click`、`site_search_submit`、`product_variant_select`、`add_to_cart`、`cart_view`、`checkout_start` 和 `newsletter_submit`；接入外部平台前需另行确认。

## 验收标准

- Theme Check 无错误，主题可从 GitHub `main` 同步到测试店。
- 首页、集合、商品、搜索、购物车和 404 在桌面/移动端可用，无未加载的样式与横向溢出。
- 变体、数量、Ajax 加购、购物车更新/删除和 Checkout 为真实 Shopify 链路。
- 主题编辑器可配置首页每个主模块，未配置商品或集合时有正式空状态。
