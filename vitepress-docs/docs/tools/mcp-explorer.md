---
title: MCP Explorer
description: 面向 MCP Server、Tool Contract、调用路径与调试能力的统一入口
---

# MCP Explorer

这个页面是未来 MCP Explorer 的信息架构原型，用来整理 MCP 相关能力，而不是把零散笔记分散在不同目录里。

## 核心目标

- 浏览已接入的 MCP Server
- 查看每个 server 暴露的 tools
- 对比 tool 输入输出约定
- 追踪 tool routing 与失败路径
- 汇总不同 agent 的调用上下文

## 未来页面模块

- Server 列表
- Tool Catalog
- Invocation Timeline
- Error Diagnostics
- Prompt Routing Notes
- 示例请求与响应

## 适合沉淀的内容

- GitHub MCP 的使用套路
- Atlassian MCP 路由规则
- 预加载与 deferred tool 策略
- Tool choice 规则与常见误区
- Subagent 与 MCP 的协作边界

## 建议的实现顺序

1. 先做静态目录页，整理 server 与 tool 信息。
2. 再做 JSON 驱动的可检索目录。
3. 最后做交互式调用检查器与可视化时间线。

## 当前结论

MCP Explorer 适合作为 Tool Box 的第一个核心能力，因为它天然连接你的网站主题、日常工作流和未来的 AI Native 方向。