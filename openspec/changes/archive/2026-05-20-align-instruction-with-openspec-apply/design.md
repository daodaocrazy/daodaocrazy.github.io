## Context

本仓库当前的冲突点不是“有没有 OpenSpec”，而是“仓库 instruction 该用多硬的方式去约束 OpenSpec skill”。

`openspec-apply-change` 与 `opsx:apply` 的原始语义是：围绕一个 active change 行动，必要时可以边实现边补 artifacts，或者在部分实现后回到 artifacts，而不是要求所有动作只能按单次线性阶段完成。

上一轮改动把仓库级 instruction 和主 spec 写成了强 phase-locked 顺序，并进一步把 prompt/skill 也改成同口径。这会让仓库丢掉 OpenSpec skill 的真实使用方式，也会让 instruction 去覆盖 skill，而不是与 skill 协同工作。

## Goals / Non-Goals

**Goals:**
- 恢复 apply prompt/skill 的原始流动式 apply 语义
- 让仓库级 instruction 兼容这种基于 active change 的协作方式
- 继续保留“不能脱离 active change 长段实现”“完成前必须 validate/doc-sync”“归档前 tasks 必须完成”等硬约束
- 修正主 spec，使长期 source of truth 与实际协作方式一致

**Non-Goals:**
- 不移除 OpenSpec-first 的整体工作方式
- 不放宽 validate、doc-sync 或 archive 的完成门槛
- 不重写其他与本次冲突无关的 prompts 或 skills

## Decisions

- 保留 `.github/copilot-instructions.md` 对 OpenSpec source-of-truth 的强调，但把“严格不允许跳步”的写法改成“围绕 active change 流动推进”的写法
- 恢复 `opsx:apply` prompt 和 `openspec-apply-change` skill 的 “Fluid Workflow Integration” 表述，避免仓库局部入口再各自发明新的 apply 语义
- 修改 `repository-ai-change-workflow` 主 spec，使其要求 instruction 与 apply skill 兼容，而不是要求 apply skill 服从一个更硬的仓库级 phase model

## Risks / Trade-offs

- instruction 放松到兼容 skill 后，仓库级约束会少掉一部分“顺序感”，但这是为了保持与 OpenSpec 原始使用方式一致
- 允许 fluid apply 并不等于允许无序开发，因此必须继续把 active change、validate/doc-sync 和 archive 条件写成硬门槛