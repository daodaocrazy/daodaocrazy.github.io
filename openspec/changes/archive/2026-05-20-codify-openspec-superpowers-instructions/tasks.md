# Repository AI Workflow Rollout

## 1. Source of Truth 与入口约束

- [x] 1.1 新增 `repository-ai-change-workflow` 的 proposal、design、tasks 与 spec delta，正式记录仓库级 AI 工作流约束
- [x] 1.2 在 `.github/copilot-instructions.md` 中加入 OpenSpec + superpowers 双层职责说明与新功能强制顺序
- [x] 1.3 对齐 `opsx:apply` prompt 与 `openspec-apply-change` skill，移除与仓库约束冲突的 fluid workflow 表述

## 2. 校验与落库

- [x] 2.1 运行 focused OpenSpec validate，确认 change artifacts 结构与 spec delta 合法
- [x] 2.2 将主 spec 同步到 `openspec/specs/repository-ai-change-workflow/spec.md`
- [x] 2.3 将 change 归档到 `openspec/changes/archive/`，并确认它不再出现在 active changes