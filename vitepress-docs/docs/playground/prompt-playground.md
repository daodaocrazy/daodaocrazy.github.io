---
title: Prompt Playground
description: 面向提示词调试、模板演进与本地浏览器实验的原型页面
---

# Prompt Playground

这个页面是未来 Prompt Playground 的站内入口原型，目标不是只展示 Prompt 文本，而是支持一整套浏览器侧实验流。

## 目标能力

- 多版本 Prompt 模板切换
- 变量注入与渲染预览
- System、User、Tool 上下文拼装
- Prompt 评审与对比
- 本地 IndexedDB 持久化
- 导入导出 JSON/YAML Prompt 包

## 适合的使用场景

- 调试 Copilot 指令模板
- 迭代 MCP tool-routing prompt
- 管理 Agent system prompt 片段
- 维护 Skill Engineering 模板
- 对比不同提示词写法的结构差异

## 建议的页面结构

1. 左侧模板列表
2. 中间编辑区
3. 右侧渲染结果与变量面板
4. 底部历史版本与导出区

## 建议的技术路线

- 第一阶段：VitePress 页面内嵌轻量交互组件
- 第二阶段：独立 React 页面接入 shadcn/ui 与 Tailwind
- 第三阶段：加入本地浏览器 AI、Embedding 与 Prompt 对比分析

## 未来扩展

- Prompt Test Case Runner
- Prompt Diff View
- Token 估算器
- MCP Prompt Pack Registry
- Browser-side LLM Demo

## 当前结论

这个能力最适合先做成前端本地实验，不依赖服务端，就能很快体现出 AI Native Personal Workspace 的差异化价值。
