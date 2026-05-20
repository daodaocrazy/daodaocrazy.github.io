## Why

当前仓库已经有 Tool Box 入口，但还没有可直接使用的 JSON 工具页。用户希望参考 json.cn 的双栏操作流，把 JSON 格式化能力直接集成到站内，而不是继续停留在静态信息架构原型。

如果没有正式的 OpenSpec 变更：

- 后续实现容易把“参考 json.cn”误解为视觉复刻，而不是操作流借鉴
- 页面能力边界会漂移，导致第一版过早引入编辑器增强、导入导出或其他超范围功能
- Tool Box 的后续工具页难以复用统一的交互与验证约束

本次 change 的目标是把 JSON Formatter 的第一阶段能力沉淀为正式的 OpenSpec 工件，再据此实施。

## What Changes

- 新增 Tool Box JSON Formatter 工具页的正式能力定义
- 明确页面布局、自动解析状态流、结果模式切换、错误定位、折叠视图交互与告警 JSON 双重转义默认自动修复兼容约束
- 把执行步骤直接维护到当前 change 的 `tasks.md`，不再使用单独的 `plans/` 目录

## Capabilities

### New Capabilities
- `toolbox-json-formatter`: 定义 Tool Box 下 JSON Formatter 页面的功能范围、错误处理、折叠视图、双重转义兼容与响应式行为

### Modified Capabilities
- 无

## Impact

- vitepress-docs/docs/tools/index.md
- vitepress-docs/docs/tools/json-formatter.md
- vitepress-docs/docs/.vitepress/theme/components/JsonFormatterWorkbench.vue
- vitepress-docs/docs/.vitepress/theme/components/JsonFormatterTreeNode.vue
- vitepress-docs/docs/.vitepress/theme/utils/json-formatter.mjs
- vitepress-docs/tests/json-formatter-utils.test.mjs