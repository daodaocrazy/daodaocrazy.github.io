# 仓库工作说明

本文件是 Codex 读取的仓库级指令。作用域覆盖整个仓库，子目录如需更具体的规则，在该子目录放 `AGENTS.md`，就近的规则优先。

`.github/copilot-instructions.md` 是同一份约定的 GitHub Copilot 侧副本。改动仓库约定时两处同步：Codex 侧改本文件，Copilot 侧改那份。不要只改一处。

## 站点结构

- 真实构建入口在 `vitepress-docs/`。涉及站点内容、构建脚本或发布逻辑时，从 `vitepress-docs/package.json`、`vitepress-docs/docs/` 和 `vitepress-docs/scripts/` 出发，不要把仓库根目录当成站点入口。
- `vitepress-docs/docs/` 是当前 VitePress 文档源。
- 仓库根的 `docs/` 与 `study-old/` 是历史归档。除非任务明确要求，不要把它们当成新的 VitePress 页面源，也不要为了让它们构建通过而改动构建链路。
- `shadowrocket/` 是独立内容域。除非任务明确涉及该目录，不要把它和 VitePress 主站内容混为一体。

## 构建与校验

- 修改 VitePress 配置、内容生成脚本或工作流之后，在 `vitepress-docs/` 下跑 `npm run docs:build:ci` 作为最相关的本地校验。
- 改动数据、脚本或测试之后跑 `npm test`（等价于在 `vitepress-docs/` 下执行 `node --test tests/*.test.mjs`）。CI 会在部署前跑同一命令，测试失败会挡住发布。
- 数据驱动页面（`docs/.data/`、`docs/public/data/`）有对应的刷新脚本和单元测试。改动这些页面的数据形状时，同时更新 `tests/` 下对应断言。
- 依赖本地预览或开发服务验证时，如果现有进程没有可靠拾取改动，或出现旧资源、旧页面、旧路由，直接重启该服务再继续，不必等待额外提示。

## VitePress 约定

- 当前 VitePress 配置把 `markdown.html` 设为关闭。需要交互式工具页时，不要在 Markdown 正文里直接写 Vue 组件标签；通过主题 `Layout` 按路由注入，或用自定义页面组件承载交互区。
- 与上方 `VPFeatures` 对齐的自定义首页板块，用「外层 `padding: 0 24px` + 内层 `max-width: 1152px; margin: 0 auto`」的两段式容器。只写 `max-width` 加 padding 会让内容盒变窄并在宽屏上内缩 24px。

## GitHub Pages 与发布

- 变更 GitHub Pages、预览环境或 base path 相关逻辑时，同时检查 `.github/workflows/` 与 `vitepress-docs/scripts/`，保持 production、lab、preview 三类路径规则一致。
- 仓库的 Pages 设置必须保持 `build_type=workflow`。如果发现 Pages 仍处于 legacy branch source 模式，修仓库 Settings > Pages，不要改写 `.github/workflows/` 去绕开平台限制。
- Pages environment branch policy 必须与分支映射一致：`github-pages` 至少允许 `main` 与 `lab`，`github-pages-preview` 至少允许 `feature/*`。改 Pages workflow、环境名或分支映射时，一并核对这些仓库级设置与 `vitepress-docs/scripts/resolve-pages-target.mjs`。
- 修改 `.github/workflows/` 时保持 GitHub Pages 官方 Actions 链路与现有仓库结构兼容，不要引入本地部署步骤。

## GitHub 访问

- 访问 public GitHub（`github.com`）的查询、仓库查看、Actions 查询或手动触发，一律用 `~/.config/gh-public/ghpub ...`，不要直接调用裸 `gh`。该包装器从 macOS Keychain 取 Fine-grained PAT，临时设置 `GH_HOST=github.com`，并清理会导致 public GitHub 访问失败的代理变量。
- `ghpub` 提示缺少 github.com PAT 时，先运行 `~/.config/gh-public/ghpub-store-token` 把 PAT 写入 Keychain 再重试。不要把 PAT 写进仓库文件、shell profile、明文环境变量，也不要提交到版本库。
- 企业版 GitHub（`atc-github.azure.cloud.bmw`）继续使用现有企业版 `gh` 与 MCP 上下文。不要为了 public GitHub 查询去全局导出或覆盖 `GH_HOST`、`GH_TOKEN`、`GH_CONFIG_DIR`，那会破坏企业版访问。
- 走 GitHub API 的脚本在 CI 里用 `github.token`（5000 次/小时），不要依赖未认证的 60 次/小时限额。刷新失败时保留已有快照并用 `continue-on-error`，不要让数据刷新阻断站点发布。

## AI 自定义内容的位置

本仓库同时支持 Codex 与 Copilot，两套入口各用自己被发现的标准位置，不要互相复制：

| 工具 | 指令 | 仓库级 skill |
|---|---|---|
| Codex | `AGENTS.md`（本文件） | `.agents/skills/<name>/SKILL.md` |
| Copilot | `.github/copilot-instructions.md` | `.github/skills/<name>/SKILL.md` |

- 新增 Codex skill 放在 `.agents/skills/` 下，不要放进 `.github/skills/`（Codex 不扫描该目录），也不要新建 `.claude/`、`.trae/` 或 `.agents/` 之外的目录副本。
- Codex 的 `SKILL.md` frontmatter 只接受 `name`、`description`、`license`、`allowed-tools`、`metadata`。多写字段会被判为错误。
- 复用 `.github/prompts/` 下已有的 Copilot prompt；需要 Codex 版本时在 `.agents/skills/` 建对应 skill，不要把 Copilot 的 `argument-hint`、`agent` 字段搬进 `SKILL.md`。

## 文档语言与知识沉淀

- 本仓库的文档、计划和工作区 AI 指令默认使用中文，只有用户明确要求时才用英文。
- 需要长期沉淀的仓库知识写进仓库内文档或上述指令文件，不要只写进本地 memory 作为唯一来源。
