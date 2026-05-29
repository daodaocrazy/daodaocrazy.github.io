# 仓库工作说明

- 当前站点的真实构建入口在 `vitepress-docs/`。涉及站点内容、构建脚本或发布逻辑时，优先从 `vitepress-docs/package.json`、`vitepress-docs/docs/` 和 `vitepress-docs/scripts/` 出发，不要默认把仓库根目录当成当前站点入口。
- `vitepress-docs/docs/` 是当前 VitePress 文档源。仓库根目录的 `docs/` 和 `study-old/` 主要视为历史内容或归档，除非任务明确要求，否则不要把它们当成新的 VitePress 页面源。
- 当前 VitePress 配置将 `markdown.html` 设为关闭状态。需要交互式工具页时，不要在 Markdown 正文里直接写 Vue 组件标签；优先通过主题 `Layout` 按路由注入，或使用自定义页面组件承载交互区。
- 变更 GitHub Pages、预览环境或 base path 相关逻辑时，同时检查 `.github/workflows/` 与 `vitepress-docs/scripts/`，保持 production、lab、preview 三类路径规则一致。
- 本仓库中的文档、计划和工作区 AI 指令默认使用中文；只有用户明确要求时才使用英文。
- 需要长期沉淀的仓库知识，优先写入仓库内文档或 `.github/` 指令文件，不要只写到本地 memory 作为唯一来源。
- 在当前 macOS 环境中，凡是访问 public GitHub `github.com` 的 `gh` 查询、仓库查看、Actions 查询或手动触发操作，默认使用 `~/.config/gh-public/ghpub ...`，不要直接调用裸 `gh`。这个包装器会从 macOS Keychain 读取 Fine-grained PAT，临时设置 `GH_HOST=github.com`，并清理会导致 public GitHub 访问失败的代理变量。
- 如果 `ghpub` 提示缺少 github.com PAT，先运行 `~/.config/gh-public/ghpub-store-token` 把 Fine-grained PAT 写入 macOS Keychain，再重试；不要把 PAT 写入仓库文件、shell profile、明文环境变量或提交到版本库。
- 企业版 GitHub `atc-github.azure.cloud.bmw` 的操作继续使用现有企业版 `gh` / MCP 上下文；不要为了 public GitHub 查询去全局导出或覆盖 `GH_HOST`、`GH_TOKEN`、`GH_CONFIG_DIR`，避免影响企业版使用。
- 本仓库的 GitHub Pages 仓库设置必须保持 `build_type=workflow`；如果发现 Pages 仍处于 legacy branch source 模式，优先修复仓库 Settings > Pages，而不是继续修改 `.github/workflows/` 试图绕过平台限制。
- 本仓库的 GitHub Pages environment branch policy 必须与分支映射保持一致：`github-pages` 至少允许 `main` 与 `lab`，`github-pages-preview` 至少允许 `feature/*`。修改 Pages workflow、环境名或分支映射时，同时检查这些仓库级设置与 `vitepress-docs/scripts/resolve-pages-target.mjs` 保持一致。
- 修改 VitePress 配置、内容生成脚本或工作流后，优先运行最相关的本地校验；通常在 `vitepress-docs/` 下使用 `npm run docs:build:ci`。
- 当当前任务依赖本地预览或开发服务时，修改后若现有进程未可靠拾取变更，或出现旧资源、旧页面、旧路由等陈旧状态，默认自动重启对应服务后再继续验证，无需等待额外提示。
- 仓库内的 AI 自定义内容统一放在 `.github/` 下维护。新增 prompts、skills 或 instructions 时，优先复用 `.github/prompts/`、`.github/skills/` 和本文件，不要重新生成 `.agents/`、`.claude/` 或 `.trae/` 目录副本，除非用户明确要求。
- 修改 `.github/workflows/` 时，保持 GitHub Pages 官方 Actions 链路与现有仓库结构兼容，不要引入本地部署步骤。
- `shadowrocket/` 是独立内容域；除非任务明确涉及该目录，否则不要把它和 VitePress 主站内容混为一体。