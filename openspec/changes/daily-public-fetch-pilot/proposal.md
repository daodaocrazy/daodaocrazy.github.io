## Why

当前仓库已经具备 GitHub Pages 多环境发布能力，但还没有一条稳定的“GitHub public runner 定时抓取公开站点信息并落到站内页面”的最小闭环。

如果直接从真实目标站点开始，会把验证成本耗在登录、反爬、HTML 结构波动或 CORS 上，而不是先确认这条自动化链路本身是否成立。

因此需要先补一个低风险试点：使用公开、稳定、无需登录的 JSONPlaceholder API，验证 public runner 能否定时抓取、生成站内静态快照、构建并发布到指定工具页。

## What Changes

- 新增一个面向公开 JSON API 的定时抓取试点能力，首个数据源固定为 JSONPlaceholder posts
- 新增一个抓取与规范化脚本，在构建前生成站内静态 JSON 快照
- 新增一个工具页入口，用于展示最近一次抓取的数据与抓取时间
- 新增一个 schedule + workflow_dispatch 的 GitHub Actions 工作流，在 runner 中抓取、构建并发布站点

## Capabilities

### New Capabilities
- `public-json-fetch-pilot`: 定义公开 JSON API 的定时抓取、静态快照生成、工具页展示与发布约束

### Modified Capabilities
- 无

## Impact

- .github/workflows/refresh-public-json-pilot.yml
- vitepress-docs/scripts/refresh-public-json-pilot.mjs
- vitepress-docs/tests/public-json-fetch-pilot.test.mjs
- vitepress-docs/docs/public/data/public-json-pilot.json
- vitepress-docs/docs/tools/index.md
- vitepress-docs/docs/tools/public-json-pilot.md
- vitepress-docs/docs/.vitepress/theme/Layout.vue
- vitepress-docs/docs/.vitepress/theme/components/PublicJsonPilotWorkbench.vue