# React 组件集成指南

## 在 VitePress 中使用 React

虽然 VitePress 原生基于 Vue，但我们仍然可以通过一些方式集成 React 组件。

### 方法 1：使用 Micro-Frontend 方案

将 React 应用作为独立模块，通过 iframe 或自定义元素集成。

### 方法 2：渐进式迁移

保持现有 VitePress 作为文档系统，新功能在 playground/ 中独立开发，再逐步集成。

## 技术栈建议

- **React 18+**
- **shadcn/ui** (组件库)
- **Tailwind CSS** (样式)
- **React Flow** (工作流可视化)
- **DuckDB-WASM** (本地数据处理)
