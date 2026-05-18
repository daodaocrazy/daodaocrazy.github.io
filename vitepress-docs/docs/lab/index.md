---
title: Lab
description: 长周期集成实验区，对应 lab 分支与 /lab/ 环境
---

# Lab

Lab 用于承载比 feature preview 更稳定、但还不适合直接进入主站根路径的内容。

## 适合放什么

- 接近可公开展示的新页面
- 新信息架构试验
- 新主题样式试验
- 即将进入主站的交互模块
- 多页面联动实验

## 分支与环境关系

- `main` 对应生产站根路径
- `lab` 对应 `/lab/`
- `feature/*` 对应 `/preview/<branch-slug>/`

## 使用方式

1. 先在 `feature/*` 上快速验证。
2. 验证方向稳定后合并或推送到 `lab`。
3. 在 `lab` 环境完成集成后，再进入 `main`。
