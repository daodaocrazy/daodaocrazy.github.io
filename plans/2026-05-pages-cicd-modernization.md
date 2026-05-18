# GitHub Pages 多环境现代化改造方案

## 0. 本次实施摘要

本次改造已经直接落地到仓库，核心目标如下：

- main 允许直接 push
- build fail 不触发 deploy
- deploy 严格依赖 build 成功
- GitHub Pages 永远保持最后一次成功版本
- 使用 GitHub 官方 Pages Actions 链路：
  - actions/configure-pages
  - actions/upload-pages-artifact
  - actions/deploy-pages
- 支持三类环境：
  - production: /
  - lab: /lab/
  - preview: /preview/<branch-slug>/
- feature 分支删除后自动清理对应 preview 子路径

已落地文件：

- .github/workflows/deploy-vitepress.yml
- .github/workflows/preview-build.yml
- .github/workflows/cleanup-preview.yml
- vitepress-docs/docs/.vitepress/config.js
- vitepress-docs/package.json
- vitepress-docs/scripts/run-build.mjs
- vitepress-docs/scripts/resolve-pages-target.mjs
- vitepress-docs/scripts/render-preview-index.mjs

## 1. 当前仓库结构分析

你当前仓库是“历史内容 + 当前 VitePress + 未来实验空间”的混合体，优点是内容资产很丰富，问题是运行面和归档面还没有明确分层。

当前关键结构可抽象为：

```text
work tree
.
├─ .github/workflows/
├─ docs/                    # 老站点/旧 Pages 内容痕迹
├─ shadowrocket/            # 独立主题内容
├─ study-old/               # 历史归档
└─ vitepress-docs/          # 当前真正的站点构建入口
   ├─ docs/
   ├─ package.json
   └─ scripts/
```

当前结构里最不合理的点不是“文件多”，而是“站点真实入口不够单一”：

- 根目录的 docs 与 vitepress-docs/docs 同时存在，容易让维护者误判哪个才是生产入口。
- study-old 与 vitepress-docs/docs/study 同时存在，说明知识内容已经经历迁移，但归档边界还没有制度化。
- shadowrocket 作为独立内容域存在合理，但尚未纳入统一的信息架构。
- 仓库根目录同时承载“内容仓库”和“未来应用仓库”的角色，未来引入 tools/playground/react components 后，如果不先定义目录职责，会继续膨胀。

结论：

- 现在不适合大规模重构。
- 适合先把“构建入口、部署入口、环境路径规则”稳定下来。
- 在此基础上再做渐进式目录演化。

## 2. 当前 CI/CD 问题分析

你当前生产工作流其实已经用了官方 Pages artifact/deploy 模式，这是正确方向；问题主要集中在“能力不够完整”，而不是“方案完全错误”。

当前问题：

1. 生产只覆盖 main，没有 lab 和 preview 的正式路径设计。
2. preview-build 只是构建检查，不会生成可访问的预览环境。
3. VitePress 配置没有环境感知 base path，无法稳定支持 /、/lab/、/preview/<slug>/ 三种部署目标。
4. 缺少 preview 清理机制，未来 feature 分支一多，预览路径会持续堆积。
5. 缺少“单站点多子环境”的 artifact 装配策略。
6. editLink 指向旧路径 docs/:path，而你的真实内容目录在 vitepress-docs/docs/:path。

## 3. 当前 GitHub Actions 风险点

### 3.1 不是所有“构建成功”都等于“环境可访问”

你原来的 preview-build.yml 只能证明 VitePress 能 build，不能证明 GitHub Pages 上存在 preview URL。

### 3.2 多环境共享单一 Pages 站点时，不能只部署局部目录

GitHub Pages 官方 deploy-pages 部署的是“完整 artifact”，不是增量目录同步。

这意味着：

- 你不能只上传 /lab 子目录就期待它补丁式进入现有站点。
- 如果要在一个 Pages 站点里同时保留 /、/lab/、/preview/*，你必须先组装完整站点，再整体 deploy。

### 3.3 如果没有环境路径规则，未来 React/Vite 子应用会直接冲突

后续引入 playground、toolbox、React Flow、DuckDB-WASM、PWA 后，base path 和产物路径不稳定会变成长期技术债。

### 3.4 preview 不清理会导致路径永久堆积

如果 feature 分支删除后没有对应删除 /preview/<slug>/，最终 Pages 上会残留大量过期环境。

## 4. 推荐的新目录结构

### 4.1 当前阶段：最小重构版

```text
work tree
.
├─ .github/
│  └─ workflows/
│     ├─ deploy-vitepress.yml
│     ├─ preview-build.yml
│     └─ cleanup-preview.yml
├─ plans/
│  └─ 2026-05-pages-cicd-modernization.md
├─ docs/                    # legacy，只读保留，后续逐步退出
├─ study-old/               # archive，只读保留
├─ shadowrocket/            # 暂时保留独立内容域
└─ vitepress-docs/
   ├─ docs/
   │  ├─ index.md
   │  ├─ study/
   │  ├─ lab/               # 未来实验型内容入口
   │  ├─ tools/             # 未来 Tool Box 文档入口
   │  ├─ playground/        # 未来 Playground 文档入口
   │  └─ experiments/       # 未来实验记录入口
   ├─ package.json
   └─ scripts/
```

### 4.2 中期演化版

```text
work tree
.
├─ apps/
│  ├─ docs/                 # VitePress 主文档站
│  ├─ toolbox/              # Vite/React 工具箱
│  └─ playground/           # 本地 AI / Prompt / DuckDB-WASM / PWA
├─ packages/
│  ├─ ui/                   # React 组件、shadcn/ui 包装层
│  ├─ flows/                # React Flow、Mermaid 适配
│  ├─ prompts/              # Prompt Hub 数据与 schema
│  └─ shared/               # 通用 TS/配置/常量
└─ content/
   ├─ study/
   ├─ lab/
   └─ experiments/
```

## 5. 推荐的 branch 策略

推荐策略：

- main
  - 允许直接 push
  - 唯一 production 来源
  - 对应 https://daodaocrazy.github.io/
- lab
  - 长期存在的集成实验分支
  - 对应 https://daodaocrazy.github.io/lab/
- feature/*
  - 短生命周期开发分支
  - 对应 https://daodaocrazy.github.io/preview/<branch-slug>/
- 可选 future
  - release/*: 如未来接入版本化发布再考虑

分支准则：

- main 只承载“可以公开展示”的稳定内容与功能。
- lab 承载“接近可演示但仍在快速迭代”的内容。
- feature/* 承载“单主题实验、UI 试验、MCP demo、Prompt playground 原型”。

## 6. 推荐的 GitHub Actions 架构

推荐保留三条工作流：

1. deploy-vitepress.yml
   - 触发：push 到 main、lab、feature/*
   - 作用：构建当前分支对应环境，并生成完整 Pages artifact 后部署

2. preview-build.yml
   - 触发：PR 到 main/lab，或手动触发
   - 作用：只做 build 校验，不部署

3. cleanup-preview.yml
   - 触发：delete 分支事件
   - 作用：当删除 feature/* 分支时，移除对应 /preview/<slug>/ 并重新部署完整 Pages 站点

### 6.1 关键设计理由

核心设计不是“每个环境各自独立部署”，而是：

- 先恢复当前线上 Pages 快照
- 再用当前分支产物覆盖目标子路径
- 最后上传完整站点 artifact 并统一 deploy

这样做的原因：

- GitHub Pages 官方动作是整站部署，不是子目录增量部署。
- 这种装配方式可以在保持官方链路的同时，支持单域名下多子环境。
- main 构建失败时不会触发 deploy，线上仍保持上一次成功版本。

## 7. 完整 workflow yaml

完整可运行 YAML 已直接落地在以下文件：

- .github/workflows/deploy-vitepress.yml
- .github/workflows/preview-build.yml
- .github/workflows/cleanup-preview.yml

它们就是当前仓库的 source of truth。

## 8. Pages 部署最佳实践

本次采用的最佳实践：

- 使用官方 Pages action 链路，不使用 gh-pages npm 包。
- 不 force push gh-pages 分支。
- deploy job 严格 `needs: build`。
- 使用 `upload-pages-artifact` 作为唯一发布输入。
- 用 `deploy-pages` 作为唯一发布出口。
- 使用 workflow concurrency，避免站点并发写入。
- build 与 deploy 分离，失败不会污染线上。

## 9. Preview Deploy 方案

本次落地的是“单 Pages 站点内嵌 preview 子环境”方案。

分支映射：

- feature/mcp-agent-lab
  - slug: mcp-agent-lab
  - base path: /preview/mcp-agent-lab/
  - URL: https://daodaocrazy.github.io/preview/mcp-agent-lab/

处理流程：

1. 解析 feature 分支名为稳定 slug。
2. 用该 slug 生成 base path。
3. 构建 VitePress 产物。
4. 将产物写入 Pages bundle 的 preview/<slug>/。
5. 生成 preview 索引页和 manifest。
6. 通过官方 artifact/deploy 流程整体发布。

## 10. Artifact Deploy 方案

Artifact 方案核心是“完整 bundle”，不是“单目录补丁”。

当前 bundle 装配流程：

1. 从线上站点恢复当前快照。
2. 保留已有 /lab/ 与 /preview/*。
3. 仅替换本次目标路径。
4. 重新上传整站 artifact。
5. 通过 deploy-pages 发布。

这个策略解决了 GitHub Pages 单站点多环境最大的结构性限制。

## 11. Build Fail Protection 方案

这是你最关心的部分，本次已经满足。

保护链路：

- push main 后自动触发 build
- build job 失败
  - deploy job 不执行
  - GitHub Pages 保持上一次成功部署版本不变
- build job 成功
  - 才会上传 artifact
  - 才会执行 deploy-pages

因此：

- main 允许直接 push
- 但构建失败绝不会覆盖线上

## 12. 多环境 base path 处理方案

本次已经把 VitePress 配置改成环境感知：

- production: /
- lab: /lab/
- preview: /preview/<slug>/

实现点：

- vitepress-docs/docs/.vitepress/config.js 读取环境变量：
  - VITEPRESS_BASE_PATH
  - DOCS_CONTENT_REF
- vitepress-docs/scripts/resolve-pages-target.mjs 负责把分支名映射为：
  - channel
  - base_path
  - deploy_subdir
  - preview_slug

## 13. VitePress 配置方案

当前已经落地的关键配置：

- `base` 改为动态注入
- favicon 改为 base-aware
- editLink 改为指向真实目录 `vitepress-docs/docs/:path`
- editLink 所属分支根据当前部署 ref 注入

这让未来 lab/preview 页面中的“编辑此页”不再错误指向 main/docs。

## 14. package.json scripts

当前已落地脚本：

```json
{
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:build:ci": "node ./scripts/run-build.mjs",
    "docs:build:main": "node ./scripts/run-build.mjs --base / --ref main",
    "docs:build:lab": "node ./scripts/run-build.mjs --base /lab/ --ref lab",
    "docs:build:preview": "node ./scripts/run-build.mjs --base /preview/local-preview/ --ref feature/local-preview",
    "docs:preview": "vitepress preview docs"
  }
}
```

建议常用命令：

```bash
cd vitepress-docs
npm ci
npm run docs:build:main
npm run docs:build:lab
npm run docs:build:preview
```

## 15. vite.config.ts/config.mts 示例

你当前主站是 VitePress，不需要额外引入 vite.config.ts 才能完成本次部署。

但为了未来接 React 子应用，建议预留这种 Vite 应用配置风格：

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const appBase = process.env.APP_BASE_PATH || '/playground/'

export default defineConfig({
  base: appBase,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

未来如果你在 apps/playground 下放 React 应用，它的 base 规则应与 Pages 子路径保持一致。

## 16. cache 优化

当前已做：

- `actions/setup-node` + npm cache
- `cache-dependency-path: vitepress-docs/package-lock.json`

未来可继续做：

- 对 monorepo 使用 `package-lock.json` 或 `pnpm-lock.yaml` 的 workspace 级 cache key
- 对大体积前端应用单独拆分安装缓存
- 只在真正引入大型 React playground 后再评估 Turborepo/Nx 缓存

当前阶段不要过早引入复杂缓存层。

## 17. monorepo 扩展兼容方案

如果后续仓库演化为 docs + tools + playground + experiments，建议逐步迁移到：

```text
work tree
.
├─ apps/
│  ├─ docs/
│  ├─ toolbox/
│  └─ playground/
├─ packages/
│  ├─ ui/
│  ├─ flows/
│  ├─ prompts/
│  └─ shared/
└─ content/
```

但这不是现在就要做的事情。

当前阶段的正确做法是：

- 先把 vitepress-docs 继续作为唯一生产入口
- 把 tools/playground/lab/experiments 先作为 vitepress-docs/docs 下的信息架构入口
- 等 React 页面和交互资产积累到一定规模，再抽 apps/

## 18. Cloudflare/Vercel 兼容方案

本次方案天然保留了未来兼容性，因为核心构建逻辑在站点层，而不是绑死在 gh-pages 分支发布模型里。

兼容原则：

- 构建产物路径规则保持明确
- base path 统一由环境变量注入
- 不依赖 gh-pages branch
- 不依赖仓库内 hardcoded deploy hack

未来迁移时：

- Cloudflare Pages
  - 可直接指向 vitepress-docs
  - Build command: `npm ci && npm run docs:build:main`
  - Output directory: `docs/.vitepress/dist`
- Vercel
  - 同理可接 VitePress 构建
  - 若未来主入口改为 React App，再由 Vercel 承载 app，Pages 继续承载 docs 也可以

## 19. React + VitePress 混合架构方案

建议采用“内容优先、应用渐进嵌入”的混合模式。

### 19.1 第一阶段

- VitePress 继续做主入口
- React 组件以自定义 theme 组件方式嵌入
- 适合：
  - Workflow Visualization
  - Mermaid 封装
  - React Flow 只读图
  - Prompt 展示器

### 19.2 第二阶段

- 将高交互页面抽为独立 Vite/React 子应用
- 用子路径接入：
  - /tools/
  - /playground/
  - /lab/

### 19.3 第三阶段

- 形成真正的 AI Native Personal Workspace
- 文档站负责：
  - 知识沉淀
  - 导航
  - 解释
- React 应用负责：
  - Prompt Playground
  - MCP Explorer
  - DuckDB-WASM 分析台
  - 本地浏览器 AI 实验
  - IndexedDB 本地工作区
  - PWA

## 20. 如何逐步从“文档站”演化为“AI Native Personal Workspace”

推荐按四个阶段推进。

### 阶段 A：先稳定底座

本次已完成的大部分工作属于这一阶段：

- 稳定 Pages 部署
- 明确 main/lab/preview
- 固化 base path
- 建立 preview 生命周期管理

### 阶段 B：补信息架构

下一步建议在 vitepress-docs/docs 下新增逻辑入口：

```text
work tree
vitepress-docs/docs
├─ tools/
├─ playground/
├─ lab/
└─ experiments/
```

这些目录一开始可以只放 README 页面，不需要马上做大迁移。

### 阶段 C：接交互能力

优先级建议：

1. Prompt Hub
2. MCP Explorer
3. Workflow Visualization
4. React Flow/Mermaid 图可视化
5. Browser-side AI Playground
6. DuckDB-WASM 数据实验

### 阶段 D：抽应用边界

当交互页面规模明显增大时，再进行：

- apps/playground
- apps/toolbox
- packages/ui
- packages/shared

那时再评估：

- pnpm workspace
- Turborepo
- shared UI library
- PWA service worker
- Cloudflare/Vercel 双部署

## 21. 为什么这套方案适合你的仓库

原因很简单：

- 你现在已经不是纯文档仓库，但也还没有演化成完整 monorepo。
- 你需要的是“允许增长的稳定底座”，而不是一次性大迁移。
- GitHub Pages 仍然足够承载未来 6 到 12 个月的演化。
- 官方 artifact/deploy 方案比 gh-pages 分支更现代，也更适合未来迁移到 Cloudflare/Vercel。

## 22. 本次实现后的维护规则

建议以后按以下规则维护：

- 生产内容直接进 main 没问题，但必须依赖 Actions build gate。
- lab 只放“准备公开但还在试”的内容。
- feature/* 只放单主题实验，做完就删，依赖 cleanup-preview 自动清理。
- 任何新增子路径应用，都必须先定义 base path，再接入 Pages。
- 不要回到 gh-pages branch 或 npm gh-pages 发布模式。

## 23. 本次实施后的本地验证命令

```bash
cd vitepress-docs
npm ci
npm run docs:build:main
npm run docs:build:lab
npm run docs:build:preview
node ./scripts/resolve-pages-target.mjs main
node ./scripts/resolve-pages-target.mjs lab
node ./scripts/resolve-pages-target.mjs feature/mcp-playground
```

## 24. 建议的下一步渐进改造

建议下一批变更只做三件事：

1. 在 vitepress-docs/docs 下补 `lab/`、`tools/`、`playground/`、`experiments/` 的入口 README。
2. 把 root docs 和 study-old 的角色写清楚：一个是 legacy，一个是 archive。
3. 选择一个高价值交互方向先做 MVP：
   - Prompt Playground
   - MCP Explorer
   - Workflow Visualizer

这样仓库会从“内容很多的文档站”平滑变成“可运行的 AI Native Personal Workspace”。

## 25. 本地多环境预览

为了在本地模拟 GitHub Pages 的单域名单站点限制，当前仓库已经支持一套本地多环境预览模式：

- `/` 显示 `main` 快照
- `/lab/` 显示 `lab` 分支快照
- `/worktree/` 显示当前工作树版本

常用命令：

```bash
cd vitepress-docs
npm run docs:preview:multi
npm run docs:preview:multi:status
npm run docs:preview:multi:stop
```

默认访问地址：

- http://127.0.0.1:4175/
- http://127.0.0.1:4175/lab/
- http://127.0.0.1:4175/worktree/

可选 preview 分支挂载：

```bash
cd vitepress-docs
npm run docs:preview:multi:stop
nohup npm run docs:preview:multi:feature -- --preview-ref feature/mcp-explorer >/tmp/daodao-multi-preview.log 2>&1 &
npm run docs:preview:multi:status -- --check-path /preview/mcp-explorer/
```

例如：

- `feature/mcp-explorer` 会挂到 `/preview/mcp-explorer/`
- `feature/prompt-lab` 会挂到 `/preview/prompt-lab/`

实现说明：

1. 从 `main` 导出一份临时快照并构建到根路径。
2. 从 `lab` 导出一份临时快照并构建到 `/lab/`。
3. 对当前工作树执行一次以 `/worktree/` 为 base 的构建。
4. 如指定 `--preview-ref`，再额外挂载 `/preview/<slug>/`。
5. 将多套产物组装成同一个本地静态站点。
6. 用本地静态服务在单端口下同时暴露 `/`、`/lab/`、`/worktree/` 与可选 preview 子路径。

这个模式的目的不是替代 GitHub Pages 真实部署，而是让你在本地就能按“单域名 + 子路径”的方式验证多环境体验。
