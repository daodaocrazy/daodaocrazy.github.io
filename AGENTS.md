# 仓库工作说明

## OpenSpec + Superpowers 工作模式

- 仓库默认采用 OpenSpec + superpowers 双层开发模式。
- OpenSpec 负责 `openspec/changes/<change>/` 下的 `proposal.md`、`design.md`、`tasks.md`、spec delta 与 archive 生命周期，作为 change-centric 协作的 Source of Truth。
- superpowers 负责 `propose`、`apply`、`validate`、`archive`、`doc-sync` 的执行入口与工作流加速；这些入口可以围绕同一个 active change 迭代推进，但相关 artifacts 必须保持同步，不得脱离 OpenSpec 单独演进。
- 若 superpowers 入口与仓库文档规则冲突，必须先更新对应 change 或仓库文档，再继续执行。

## 新功能开发协作约束

只要属于"新功能开发"，默认围绕同一个 active change 推进：

1. `propose` / `continue`：先创建或续写 `proposal.md`、`design.md`、`tasks.md`，至少补齐当前任务需要的 source-of-truth、范围、非目标、验证计划和文档同步点。
2. `apply`：可以在已有 change 上继续推进实现，也允许在实现过程中回写或补齐 artifacts；但一旦实现偏离当前 change，必须先更新 change 文档再继续扩展代码。
3. `validate`：在宣称完成、交付、归档或推送前，必须先补齐改动最相关的 focused tests，再补必要的类型检查或 lint。
4. `doc-sync`：在宣称完成或归档前，必须检查并同步相关 `openspec/specs/*`、README、相关 `docs/` 与其他受影响说明；若无需更新，也必须明确记录"已检查，无需更新"。
5. `archive`：只有当任务完成且 validate/doc-sync 已闭环时，才归档到 `openspec/changes/archive/YYYY-MM-DD-<change>/`，并确认该 change 不再出现在 active changes。

补充约束：

- 全新 feature 在进入稳定实现前，至少要有对应的 active change 与当前任务所需 artifacts；不要脱离 change 长段编码。
- `apply` 可以服务于继续已有 change、分段推进实现以及实现后回写 artifacts，不要求所有动作严格 phase-locked；但完成态仍必须回到 `validate -> doc-sync -> archive`。
- `tasks.md` 仍有未完成项时，不得执行完成态归档。
- 若实现中出现范围或设计漂移，必须先回写 change 再继续编码；只有在明确阻塞时才允许暂停，并记录阻塞原因与恢复条件。

- 当前站点的真实构建入口在 `vitepress-docs/`。涉及站点内容、构建脚本或发布逻辑时，优先从 `vitepress-docs/package.json`、`vitepress-docs/docs/` 和 `vitepress-docs/scripts/` 出发，不要默认把仓库根目录当成当前站点入口。
- `vitepress-docs/docs/` 是当前 VitePress 文档源。仓库根目录的 `docs/` 和 `study-old/` 主要视为历史内容或归档，除非任务明确要求，否则不要把它们当成新的 VitePress 页面源。
- 当前 VitePress 配置将 `markdown.html` 设为关闭状态。需要交互式工具页时，不要在 Markdown 正文里直接写 Vue 组件标签；优先通过主题 `Layout` 按路由注入，或使用自定义页面组件承载交互区。
- 变更 GitHub Pages、预览环境或 base path 相关逻辑时，同时检查 `.github/workflows/` 与 `vitepress-docs/scripts/`，保持 production、lab、preview 三类路径规则一致。
- 本仓库中的文档、计划、spec、工作区 AI 指令默认使用中文；只有用户明确要求时才使用英文。
- 对涉及用户可见行为、工具能力、信息架构、构建发布规则或工作流约束的非平凡变更，优先用 OpenSpec 维护需求、设计和执行任务：先在 `openspec/changes/<change-name>/` 下新增或更新 `proposal.md`、`design.md`、`tasks.md` 与相关 `specs/`，再实施代码和文档变更。
- 不要在本仓库新增、维护或继续使用 `plans/` 目录。执行步骤直接写入对应 OpenSpec change 的 `tasks.md`；已完成工作的回填放入 archived change，并以 `openspec/specs/` 中的主 specs 作为长期 source of truth。
- 需要长期沉淀的仓库知识，优先写入仓库内的 OpenSpec、文档或 `.github/` 指令文件，不要只写到本地 memory 作为唯一来源。
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
