---
title: Playground
description: 交互式实验空间，面向 Prompt、浏览器侧 AI 与数据分析原型
---

# Playground

这里用于承载需要交互、即时反馈和浏览器运行时能力的内容。

## 计划方向

- [Prompt Playground](/playground/prompt-playground)
- Browser-side AI Demo
- DuckDB-WASM 数据实验
- IndexedDB 本地存储样例
- PWA 原型
- [Workflow Visualizer](/playground/workflow-visualizer)

## 建议的进入顺序

1. 先做纯前端可运行 Demo，不依赖后端。
2. 再接入本地存储、浏览器推理、数据分析能力。
3. 最后再抽出真正独立的 React 子应用。

## 当前定位

这个目录现在先承担“统一入口”的职责，后续可以平滑挂接更复杂的前端页面。

## 已建立的原型入口

- [Prompt Playground](/playground/prompt-playground)：承载提示词迭代、模板调试与本地存储式实验。
- [Workflow Visualizer](/playground/workflow-visualizer)：承载 React Flow、Mermaid 与 Agent/MCP 工作流可视化方向。

