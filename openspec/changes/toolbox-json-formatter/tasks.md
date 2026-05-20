## 1. OpenSpec 与页面入口

- [x] 1.1 校对 proposal、design 与 spec，确保第一阶段范围只包含自动解析、格式化/压缩模式切换、错误定位、折叠视图、路径高亮和折叠
- [x] 1.2 在 `vitepress-docs/docs/tools/index.md` 新增 JSON Formatter 入口
- [x] 1.3 创建 `vitepress-docs/docs/tools/json-formatter.md` 并挂载工作台组件

## 2. 解析逻辑与测试

- [x] 2.1 新增 `vitepress-docs/docs/.vitepress/theme/utils/json-formatter.mjs`，实现解析、格式化、压缩、JSONPath 生成、默认展开状态和错误位置换算
- [x] 2.2 新增 `vitepress-docs/tests/json-formatter-utils.test.mjs`，覆盖纯逻辑核心场景，包括默认自动修复与显式双重转义修复兼容路径
- [x] 2.3 运行 `cd vitepress-docs && node --test tests/json-formatter-utils.test.mjs`

## 3. 工作台与折叠视图

- [x] 3.1 新增 `JsonFormatterWorkbench.vue`，实现顶部工具条、自动解析输入区、结果区、错误态与移动端视图切换
- [x] 3.2 新增 `JsonFormatterTreeNode.vue`，实现接近 JSON 文本的递归折叠视图、单行摘要、路径回传与高亮
- [x] 3.3 接通自动解析、格式化/压缩模式切换、清空、复制、展开全部、折叠全部和“自动修复双重转义”等交互；默认自动解析会自动修复可安全修复的双重转义，同时统一结果文本区与折叠视图的 JSON token 着色

## 4. 最终验证

- [x] 4.1 运行 `cd vitepress-docs && node --test tests/json-formatter-utils.test.mjs`
- [x] 4.2 运行 `cd vitepress-docs && npm run docs:build:ci`
- [x] 4.3 检查 OpenSpec 工件与实现是否仍然一致，并已同步 `proposal.md`、`design.md` 与 `spec.md`