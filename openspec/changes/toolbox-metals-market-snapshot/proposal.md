## Why

当前仓库已经验证过“公开源抓取 -> 静态 JSON 快照 -> VitePress 页面展示”的最小闭环，但还没有真正面向金属市场场景的正式能力定义。用户已经明确需要覆盖主流金属，并且必须区分国内与国际两套价格口径，不能把它们误当成同一个价格。

如果没有正式的 OpenSpec 变更：

- 后续实现容易把“金属价格”做成单一 price 字段，忽略国内外口径不等价的问题
- 金属清单、第一期范围和 source matrix 会持续漂移，导致抓取链路和页面结构反复返工
- 第一版可能过早追求权威交易所直连，而忽略公开页面可抓取性与交付节奏

本次 change 的目标是把 Tool Box 下“金属市场快照”页面的第一阶段范围沉淀为正式 OpenSpec 工件，先锁定 7 个首发品种、双口径 JSON contract 和第一版 source matrix，再据此进入实现。

## What Changes

- 新增 Tool Box 金属市场快照工具页的正式能力定义
- 明确第一阶段 7 个首发品种、国内/国际双口径展示约束与 JSON data contract
- 固化第一版公开源策略：六大有色复用 SHMET 主页分区，铁矿石单独使用国内黑色链入口和国际口径展示入口
- 把实施步骤直接维护到当前 change 的 `tasks.md`，不再使用单独的 `plans/` 目录

## Capabilities

### New Capabilities
- `toolbox-metals-market-snapshot`: 定义 Tool Box 下金属市场快照页面的范围、首发品种、双口径 JSON contract、source matrix 和页面展示约束

### Modified Capabilities
- 无

## Impact

- openspec/changes/toolbox-metals-market-snapshot/proposal.md
- openspec/changes/toolbox-metals-market-snapshot/design.md
- openspec/changes/toolbox-metals-market-snapshot/tasks.md
- openspec/changes/toolbox-metals-market-snapshot/specs/toolbox-metals-market-snapshot/spec.md
- vitepress-docs/docs/tools/index.md
- vitepress-docs/docs/tools/metals-market-snapshot.md
- vitepress-docs/docs/.vitepress/theme/components/MetalsMarketWorkbench.vue
- vitepress-docs/scripts/refresh-metals-market-snapshot.mjs
- vitepress-docs/docs/public/data/metals-market-snapshot.json
- vitepress-docs/tests/metals-market-snapshot.test.mjs