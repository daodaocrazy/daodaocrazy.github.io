## Context

当前站点的真实构建入口在 `vitepress-docs/`，`vitepress-docs/docs/tools/index.md` 已经提供 Tool Box 入口，但还没有成熟的高交互工具页。现有 `tools/` 和 `playground/` 页面以信息架构原型为主，仍然适合沿用“VitePress 页面 + 主题层交互组件”的轻量模式，而不是直接拆到独立子应用。由于站点配置关闭了 `markdown.html`，交互组件不能直接写在 Markdown 正文里，需要由主题 `Layout` 或自定义页面组件承载。

用户希望“模仿 json.cn”时更接近其功能结构和双栏工作区，而不是照搬视觉。第一阶段已经收敛到增强版能力：JSON 格式化、压缩、非法 JSON 校验、错误位置提示、折叠视图、路径高亮与节点折叠。

## Goals / Non-Goals

**Goals:**
- 在 Tool Box 下新增独立 JSON Formatter 页面，路径规划为 `/tools/json-formatter`
- 输入变化后自动解析，并允许用户在格式化与压缩两种结果模式之间切换
- 在成功解析后同时提供格式化文本与可浏览折叠视图
- 在解析失败时提供行号、列号与附近文本上下文，并清空旧成功结果
- 为告警 JSON 中常见的双重转义引号提供默认自动兼容，并保留显式兼容按钮
- 桌面端保持双栏工作区，移动端保持可读和可操作的堆叠结构

**Non-Goals:**
- 不复刻 json.cn 的配色、边框和模块样式
- 不在第一版引入 Monaco、CodeMirror 或其他重量级编辑器
- 不做文本光标与树节点的双向定位
- 不做文件导入导出、历史记录或跨格式转换

## Decisions

- 页面实现采用 VitePress Markdown 页面承载元信息与说明文案，再由主题 `Layout` 按路由注入 Vue 工作台组件；这样既保留文档页结构，也兼容当前 `markdown.html = false` 的站点配置
- 工作台组件集中持有 `rawInput`、`formattedOutput`、`parsedValue`、`parseError`、`transformMode`、`selectedPath`、`expandedPaths` 和 `activeResultView` 等状态
- 解析逻辑采用“延迟自动解析模式”：输入变化后经过短暂 debounce 自动解析，避免大 JSON 输入时每个按键都立即重算；“格式化”和“压缩”按钮用于切换当前结果模式，并立即按该模式刷新当前输入
- 默认格式化和压缩路径先按严格 `JSON.parse` 尝试；若输入命中告警 JSON 中常见的 `\\"` 双重转义且可安全修复，则自动切到修复后的源文本继续解析，并回填输入区，再复用同一套结果渲染逻辑；“自动修复双重转义”按钮保留为显式入口，方便用户主动清洗这类输入
- 结果文本区通过轻量 token 拆分对格式化 JSON 做运行时语法着色；折叠视图复用同一套 token 颜色语义，保证两种结果视图的可读性一致
- 折叠视图使用递归节点组件渲染，保持接近 JSON 文本的括号结构；折叠对象和数组时展示 `Object{...}` 与 `Array(n)[...]` 这样的单行摘要，并继续沿用 JSONPath 风格路径：`$`、`$.user.name`、`$["display-name"]`、`$.items[0]`
- 默认只展开前两层；点击节点时对当前节点做强高亮，对祖先链做弱高亮，并显示完整路径
- 解析失败时必须清空旧成功结果，错误态至少展示 message、line、column 和 snippet
- 纯逻辑部分提取为工具函数，并使用 Node 内置测试覆盖路径生成、展开状态和错误位置换算

## Risks / Trade-offs

- 不引入成熟编辑器可以保持依赖轻，但输入体验不会像专门的 JSON 工具站那么强，需要接受第一版取舍
- 递归折叠视图对超大 JSON 的性能有限，因此默认展开层级必须收敛，并通过 debounce 自动解析降低输入过程中的频繁重算
- 错误位置换算依赖 `JSON.parse` 报错中的 position 语义，不同浏览器细节可能存在差异，需要保留原始 message 作为降级信息