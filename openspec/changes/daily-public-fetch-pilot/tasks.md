# Daily Public Fetch Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 GitHub public runner 跑通 JSONPlaceholder 的定时抓取、站内静态快照生成、工具页展示与 GitHub Pages 发布闭环。

**Architecture:** Node 抓取脚本在 CI 中获取并规范化公开 JSON 数据，写入 `vitepress-docs/docs/public/data/public-json-pilot.json`；VitePress 工具页读取该快照渲染结果；独立 workflow 复用现有 Pages 快照恢复与整站 artifact 装配方式完成发布。

**Tech Stack:** GitHub Actions、Node 20、VitePress、Vue 3、node:test

---

## 1. OpenSpec 与数据契约

- [x] 1.1 确认 `proposal.md`、`design.md`、`specs/public-json-fetch-pilot/spec.md` 与试点范围一致
- [x] 1.2 固化快照字段：`source`、`fetchedAt`、`itemCount`、`items[].id`、`items[].userId`、`items[].title`、`items[].body`

## 2. 抓取脚本与测试

- [x] 2.1 新增 `vitepress-docs/scripts/refresh-public-json-pilot.mjs`，负责抓取 JSONPlaceholder、裁剪前 10 条并写入 `vitepress-docs/docs/public/data/public-json-pilot.json`
- [x] 2.2 新增 `vitepress-docs/tests/public-json-fetch-pilot.test.mjs`，覆盖规范化成功路径、条目裁剪与异常输入失败路径
- [x] 2.3 运行 `node --test vitepress-docs/tests/public-json-fetch-pilot.test.mjs` 验证脚本逻辑

## 3. 工具页接入

- [x] 3.1 新增 `vitepress-docs/docs/tools/public-json-pilot.md` 作为工具页路由入口
- [x] 3.2 修改 `vitepress-docs/docs/tools/index.md`，在 Tool Box 中加入公开 JSON 抓取试点入口
- [x] 3.3 新增 `vitepress-docs/docs/.vitepress/theme/components/PublicJsonPilotWorkbench.vue`，读取静态快照并展示元数据、列表与错误状态
- [x] 3.4 修改 `vitepress-docs/docs/.vitepress/theme/Layout.vue`，按 `/tools/public-json-pilot` 路由挂载新组件
- [x] 3.5 运行 `npm --prefix vitepress-docs run docs:build:ci` 验证页面接入与静态资源路径

## 4. GitHub Actions 刷新与发布

- [x] 4.1 新增 `.github/workflows/refresh-public-json-pilot.yml`，提供 `schedule` 与 `workflow_dispatch` 触发
- [x] 4.2 在 workflow 中串联 `npm ci`、抓取脚本、VitePress 构建、线上快照恢复、目标子路径同步与 Pages artifact 上传
- [x] 4.3 保证 workflow 在抓取或构建失败时不进入 deploy

## 5. 收尾校验与文档同步

- [x] 5.1 运行 `openspec validate`，确认变更文档结构可通过校验
- [x] 5.2 再次运行 `node --test vitepress-docs/tests/public-json-fetch-pilot.test.mjs` 与 `npm --prefix vitepress-docs run docs:build:ci`
- [x] 5.3 检查受影响 specs 与相关文档是否需要补充说明；本次已同步 OpenSpec proposal、design、spec 与 tasks，未发现其他必须补充的文档
- [x] 5.4 检查架构图是否需要同步；仓库当前未发现与该试点直接关联的架构图文件，因此无需额外更新