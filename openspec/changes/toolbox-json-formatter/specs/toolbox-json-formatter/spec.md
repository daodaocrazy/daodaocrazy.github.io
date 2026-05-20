# toolbox-json-formatter Specification

## Purpose
定义 Tool Box 下 JSON Formatter 页面的功能范围、错误处理、折叠视图交互与响应式工作区约束。

## ADDED Requirements

### Requirement: 工具页必须提供自动解析与可切换的结果模式
系统 MUST 在 `/tools/json-formatter` 页面上提供输入变化后的自动解析能力，并允许用户在格式化与压缩两种结果模式之间切换。

#### Scenario: 默认模式下自动生成格式化结果
- **WHEN** 用户输入合法 JSON 且当前处于默认格式化模式
- **THEN** 页面 MUST 自动生成规范化缩进的 JSON 文本结果
- **AND** MUST 基于同一份解析结果生成折叠视图

#### Scenario: 结果区对 JSON token 做可区分着色
- **WHEN** 页面展示格式化结果文本或折叠视图
- **THEN** 对象键、字符串值、数字值、布尔值、`null` 与标点 MUST 使用可区分的颜色
- **AND** 结果文本区与折叠视图区 MUST 复用一致的 token 颜色语义

#### Scenario: 切换到压缩模式后自动生成单行结果
- **WHEN** 用户点击“压缩”或当前已处于压缩模式后继续输入合法 JSON
- **THEN** 页面 MUST 生成单行 JSON 文本结果
- **AND** MUST 基于同一份解析结果生成折叠视图

#### Scenario: 切回格式化模式后立即刷新当前结果
- **WHEN** 用户点击“格式化”且当前输入已经可以被成功解析
- **THEN** 页面 MUST 立即把当前结果切回规范化缩进文本
- **AND** 后续输入变化 MUST 继续沿用格式化模式自动解析

### Requirement: 非法 JSON 必须进入明确错误态
系统 MUST 在 JSON 解析失败时停止展示旧成功结果，并提供可定位的错误信息。

#### Scenario: 解析失败时清空旧成功结果
- **WHEN** 用户输入变化后触发自动解析，但输入不是合法 JSON
- **THEN** 页面 MUST 清空已有的成功结果文本与折叠视图
- **AND** MUST 展示错误态而不是保留旧结果

#### Scenario: 错误态展示位置与上下文
- **WHEN** `JSON.parse` 可提供 position 语义的错误信息
- **THEN** 页面 MUST 显示 line、column 和附近文本片段
- **AND** MUST 同时保留原始错误消息作为降级信息

#### Scenario: 兼容按钮可修复告警 JSON 的双重转义
- **WHEN** 用户点击“自动修复双重转义”且输入包含告警 JSON 中常见的 `\\"` 双重转义引号
- **THEN** 页面 MUST 尝试修复这类双重转义
- **AND** 修复成功后 MUST 回填修复后的 JSON 源文本到输入区
- **AND** MUST 继续生成格式化结果文本与折叠视图

#### Scenario: 默认格式化路径自动修复可安全修复的双重转义
- **WHEN** 用户输入或粘贴的内容包含可安全修复的 `\\"` 双重转义引号
- **THEN** 页面 MUST 在自动解析路径中自动修复这类双重转义并继续解析
- **AND** 修复成功后 MUST 回填修复后的 JSON 源文本到输入区
- **AND** MUST 继续生成结果文本与折叠视图

#### Scenario: 不可修复的非法 JSON 仍然保留明确错误态
- **WHEN** 用户输入变化后触发自动解析，且输入既不是合法 JSON，也不属于可安全修复的双重转义场景
- **THEN** 页面 MUST 保持错误态并展示原始错误信息
- **AND** MUST 不展示旧成功结果

### Requirement: 解析成功后必须提供折叠视图与路径高亮
系统 MUST 允许用户浏览解析后的对象结构，并以稳定路径表示当前选中节点。

#### Scenario: 点击折叠节点时展示路径
- **WHEN** 用户点击折叠视图中的任意对象、数组或基础值节点
- **THEN** 页面 MUST 显示对应节点的 JSONPath 风格路径
- **AND** 当前节点 MUST 被强高亮
- **AND** 祖先链 MUST 被弱高亮

#### Scenario: 折叠节点时展示单行摘要
- **WHEN** 用户折叠对象或数组节点
- **THEN** 页面 MUST 把该节点收敛成单行摘要
- **AND** 对象摘要 MUST 使用 `Object{...}` 形式
- **AND** 数组摘要 MUST 使用 `Array(length)[...]` 形式

#### Scenario: 路径格式遵循 JSONPath 风格
- **WHEN** 页面为对象键或数组索引生成路径
- **THEN** 根节点 MUST 使用 `$`
- **AND** 普通对象键 MUST 使用点号形式
- **AND** 特殊对象键 MUST 使用括号字符串形式
- **AND** 数组索引 MUST 使用 `[index]` 形式

### Requirement: 折叠视图必须支持受控展开与折叠
系统 MUST 提供默认展开策略以及整体展开和折叠操作，避免大 JSON 首屏过载。

#### Scenario: 默认只展开前两层
- **WHEN** 页面首次渲染解析成功后的折叠视图
- **THEN** 根节点与第一层对象或数组 MUST 默认展开
- **AND** 更深层节点 MUST 默认折叠

#### Scenario: 工具条控制展开全部与折叠全部
- **WHEN** 用户点击“展开全部”或“折叠全部”
- **THEN** 页面 MUST 只对对象和数组节点调整展开状态
- **AND** MUST 不把基础值节点加入展开状态集合

### Requirement: 工作区必须兼顾桌面端效率与移动端可用性
系统 MUST 在桌面端提供双栏工作区，并在窄屏上保持可切换的可用布局。

#### Scenario: 桌面端显示双栏工作区
- **WHEN** 页面在桌面端渲染
- **THEN** 左侧 MUST 显示原始 JSON 输入区
- **AND** 右侧 MUST 显示结果文本区与折叠视图区

#### Scenario: 移动端切换结果文本与折叠视图
- **WHEN** 页面在窄屏环境渲染
- **THEN** 输入区与输出区 MUST 采用上下堆叠
- **AND** 输出区 MUST 允许在结果文本和折叠视图之间切换