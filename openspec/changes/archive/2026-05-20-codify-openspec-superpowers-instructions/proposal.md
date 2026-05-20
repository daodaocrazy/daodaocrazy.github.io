## Why

当前仓库已经在仓库级 instruction 中要求非平凡变更优先使用 OpenSpec，但还没有把“OpenSpec + superpowers 双层工作模式”和“新功能必须按 propose -> apply -> validate -> doc-sync -> archive 顺序推进”写成明确、可复用的仓库约束。

这带来两个直接问题：

- 仓库级 instruction 只表达了“优先使用 OpenSpec”，没有把新功能开发的强制顺序写清楚，执行口径容易漂移。
- `.github/prompts/opsx-apply.prompt.md` 与 `.github/skills/openspec-apply-change/SKILL.md` 仍保留 “Fluid Workflow Integration” 表述，会把 apply 描述成可随时插入的流动阶段，和仓库希望的 Source of Truth 顺序相冲突。

本次 change 的目标是把这套工作模式正式写入仓库 instruction，并把 apply 入口同步到同一口径，避免后续 agent 在本仓库内一边被要求先补 change，一边又被 prompt/skill 引导去跳步实现。

## What Changes

- 新增一个面向仓库 AI 工作流治理的 OpenSpec 能力定义
- 在仓库级 `copilot-instructions.md` 中加入 OpenSpec + superpowers 双层职责与新功能强制流程
- 对齐 `opsx:apply` prompt 和 `openspec-apply-change` skill 的说明，移除与仓库约束冲突的 fluid workflow 表述

## Capabilities

### New Capabilities
- `repository-ai-change-workflow`: 定义仓库 instruction 对 OpenSpec/source-of-truth、新功能固定顺序、validate/doc-sync/archive 完成条件以及 apply 入口兼容性的要求

### Modified Capabilities
- 无

## Impact

- .github/copilot-instructions.md
- .github/prompts/opsx-apply.prompt.md
- .github/skills/openspec-apply-change/SKILL.md
- openspec/changes/codify-openspec-superpowers-instructions/proposal.md
- openspec/changes/codify-openspec-superpowers-instructions/design.md
- openspec/changes/codify-openspec-superpowers-instructions/tasks.md
- openspec/changes/codify-openspec-superpowers-instructions/specs/repository-ai-change-workflow/spec.md
- openspec/specs/repository-ai-change-workflow/spec.md