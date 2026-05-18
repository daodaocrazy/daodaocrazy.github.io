---
title: Workflow Visualizer
description: 面向 Agent、Tool、MCP、Workflow 的可视化实验入口
---

# Workflow Visualizer

这个页面用于承接未来的流程可视化能力，把静态文档中的执行链路转成可交互的图形视图。

## 优先支持的图类型

- Agent 到 Tool 的调用链
- MCP server 与 tool registry 关系图
- Prompt 到执行结果的数据流
- CI/CD workflow 可视化
- 本地缓存、artifact、preview 环境关系图

## 适合的技术组合

- React Flow：适合交互式节点与边编辑
- Mermaid：适合快速生成文档内嵌图
- SVG 导出：适合博客展示与归档
- JSON schema：适合作为图的可编排输入

## 推荐实现阶段

1. 先支持 Mermaid 文本输入与预览。
2. 再加入 React Flow 版节点图。
3. 最后支持从 workflow JSON 自动生成图谱。

## 未来可视化对象

- GitHub Actions Pages 部署链路
- MCP Explorer 调用路径
- Prompt Playground 数据流
- Browser-side AI 处理流

## 当前结论

如果你的站点要从文档站走向 Workspace，这个页面会是最容易体现“文档 + 工具 + 可视化”融合价值的能力之一。
