## Why

当前仓库已经完成 GitHub Pages 多环境现代化改造，但 OpenSpec 中没有对应的变更记录与能力说明。

这会带来两个直接问题：

- 后续维护者无法从 OpenSpec 得到当前 Pages 行为的正式约束
- 未来继续扩展 lab、preview 或本地多环境预览时，缺少可追溯的能力基线

本次补一份回溯式 change，用来把已经落地的实现正式沉淀为 OpenSpec 归档。

## What Changes

- 记录 GitHub Pages 多环境部署的正式能力边界
- 记录本地单域名多子路径预览的正式能力边界
- 让这次已完成的改造可以通过 OpenSpec archive 进入归档与主 specs

## Capabilities

### New Capabilities
- `pages-multi-environment-deployment`: 定义 main、lab、feature 分支对应的 Pages 路径、构建门控、整站 artifact 装配与 preview 清理规则
- `local-multi-environment-preview`: 定义本地单端口下的 main、lab、worktree 与可选 preview 子路径预览规则

### Modified Capabilities
- 无

## Impact

- .github/workflows/deploy-vitepress.yml
- .github/workflows/preview-build.yml
- .github/workflows/cleanup-preview.yml
- vitepress-docs/docs/.vitepress/config.js
- vitepress-docs/package.json
- vitepress-docs/scripts/run-build.mjs
- vitepress-docs/scripts/resolve-pages-target.mjs
- vitepress-docs/scripts/render-preview-index.mjs
- vitepress-docs/scripts/local-multi-env-preview.mjs
- vitepress-docs/scripts/local-multi-env-status.mjs
- vitepress-docs/scripts/local-multi-env-stop.mjs
- plans/2026-05-pages-cicd-modernization.md