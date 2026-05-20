## Why

刚刚补入仓库的 `repository-ai-change-workflow` instruction/spec 把新功能开发写成了严格 phase-locked 的固定顺序，并据此改动了 `opsx:apply` prompt 与 `openspec-apply-change` skill。

但仓库实际复用的是 OpenSpec 原有的 “actions on a change” 模型：`apply` 可以在已有 change 上继续推进、与 artifact 更新交错进行，并不要求所有动作只能按单次线性阶段前进。用户这次明确要求取消对 skill 的修改，并改成“instruction 去适配 skill”，说明真正需要保留的是 skill 的流动式 apply 语义，而不是反过来改写 skill。

如果不修正：

- 仓库级 instruction、主 spec、apply prompt 和 apply skill 会继续对同一件事给出相反指导
- agent 既可能被 instruction 拉去严格跳步治理，也可能被 skill 拉回流动式 apply，造成执行分叉
- 新增的主 spec 会把一个并非仓库真实约束的硬规则继续固化下来

本次 change 的目标是回滚对 apply prompt/skill 的额外约束，并把 instruction 与主 spec 调整为兼容 OpenSpec skill 的 change-centric / fluid apply 模型，同时保留 active change、validate、doc-sync 和 archive 的完成条件。

## What Changes

- 回滚 `opsx:apply` prompt 和 `openspec-apply-change` skill 中刚刚加入的仓库级 guardrails
- 把仓库级 `copilot-instructions.md` 从严格 phase-locked 顺序改为以 active change 为中心的协作约束
- 修改 `repository-ai-change-workflow` capability，使其描述“instruction 适配 skill”，而不是“skill 适配 instruction”

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `repository-ai-change-workflow`: 改为定义与 OpenSpec apply skill 兼容的 change-centric / fluid apply 约束，同时保留 active change、validate、doc-sync 与 archive 的完成条件

## Impact

- .github/copilot-instructions.md
- .github/prompts/opsx-apply.prompt.md
- .github/skills/openspec-apply-change/SKILL.md
- openspec/changes/align-instruction-with-openspec-apply/proposal.md
- openspec/changes/align-instruction-with-openspec-apply/design.md
- openspec/changes/align-instruction-with-openspec-apply/tasks.md
- openspec/changes/align-instruction-with-openspec-apply/specs/repository-ai-change-workflow/spec.md
- openspec/specs/repository-ai-change-workflow/spec.md