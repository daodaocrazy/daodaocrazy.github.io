## Context

当前站点真实入口在 vitepress-docs/，并通过 GitHub Pages 官方 Actions 链路发布。仓库已经有一套“先恢复线上快照，再替换目标子路径，最后发布整站 artifact”的多环境发布模式，用来同时保留 production、lab 与 preview 内容。

这次试点不需要处理真实业务站点的登录、Cookie、验证码或复杂反爬，而是要先验证一条更基础的工程链路：GitHub-hosted runner 能否定时获取一个公开 JSON 源，把结果变成站内静态资源，并通过现有 VitePress 站点稳定展示。

同时，仓库当前关闭了 markdown.html，交互式工具页不能直接在 Markdown 正文里写 Vue 标签，因此工具页需要通过主题 Layout 按路由注入一个新组件。

## Goals / Non-Goals

**Goals:**
- 用 JSONPlaceholder posts 验证公开站点数据抓取的最小闭环
- 在构建前生成静态 JSON 快照，并让工具页直接读取该快照展示
- 提供 schedule 与 workflow_dispatch 两种触发方式
- 发布时保留现有多环境站点结构，不覆盖无关子路径

**Non-Goals:**
- 不做多数据源抽象或插件化抓取框架
- 不处理需要登录、验证码或浏览器自动化的网站
- 不引入数据库、服务端运行时或长期历史存储
- 不在这次试点中重构现有 Pages 工作流为 reusable workflow

## Decisions

- 数据源固定为 `https://jsonplaceholder.typicode.com/posts`，只保留前 10 条记录，字段压缩为 `id`、`userId`、`title`、`body`
- 抓取脚本在 CI 中运行，并把结果写到 `vitepress-docs/docs/public/data/public-json-pilot.json`
- 快照文件除 `items` 外还包含 `source`、`fetchedAt`、`itemCount` 等元数据，便于页面展示与问题定位
- 工具页入口放在 `/tools/public-json-pilot`，并通过 `Layout.vue` 按路由注入 `PublicJsonPilotWorkbench.vue`
- 新工作流单独命名，负责抓取、构建与发布；部署阶段复用现有“恢复线上快照 + 同步目标子路径 + 上传整站 artifact”的装配方式
- 本地验证以 Node 原生测试覆盖规范化逻辑，并用 `npm --prefix vitepress-docs run docs:build:ci` 校验站点构建接入

## Risks / Trade-offs

- 新工作流会复制一部分现有 deploy-vitepress 的装配逻辑，短期可接受，但后续如果类似工作流增多，应该再考虑抽取共享流程
- JSONPlaceholder 是演示型公开源，能证明自动化链路成立，但不能代表真实 HTML 抓取场景的选择器稳定性
- 静态 JSON 快照意味着页面展示的是最近一次构建结果，而不是访问时实时抓取；这是为了换取稳定发布与零运行时依赖