## Context

仓库当前真实站点入口在 vitepress-docs/，而 GitHub Pages 需要在单一站点下同时承载 production、lab 与 feature preview 三类环境。

GitHub Pages 官方 deploy-pages 动作发布的是完整 artifact，而不是子目录增量同步。因此，多环境能力的核心不是“多次局部部署”，而是“恢复当前站点快照后，替换目标子路径，再发布整站 artifact”。

## Goals / Non-Goals

**Goals:**
- 固化分支到 Pages 环境的稳定映射
- 保证 build 失败时不会触发 deploy 覆盖线上
- 保留单站点内的 /、/lab/、/preview/<slug>/ 并允许 preview 生命周期清理
- 提供本地单端口多环境预览，提前复现 GitHub Pages 子路径行为

**Non-Goals:**
- 不做仓库大规模目录重构
- 不引入独立 gh-pages 分支或第三方发布模式
- 不在本次变更中把 docs/toolbox/playground 全量拆成 monorepo apps

## Decisions

- 使用 GitHub 官方 Pages Actions 链路作为唯一发布出口
- 用 resolve-pages-target.mjs 作为分支名到 channel/base_path/deploy_subdir 的唯一解析源
- 构建时通过 VITEPRESS_BASE_PATH 与 DOCS_CONTENT_REF 注入运行时路径与编辑链接目标
- 对 preview 环境生成索引页与 manifest，保证可发现性与可清理性
- 本地多环境预览采用单端口静态站点装配，而不是分别起多个站点

## Risks / Trade-offs

- 完整 artifact 装配比单目录部署更重，但这是 GitHub Pages 官方链路下保持多环境共存的必要代价
- 站点内容量较大时，本地构建耗时较长，需要接受较重的验证成本
- preview 元数据与索引依赖部署脚本维护，后续修改发布逻辑时必须同步更新