## Context

本仓库已经引入 OpenSpec 与一组 superpowers prompt/skill，用于加速 propose、apply、archive 等日常执行动作。但现状仍然缺少一个仓库级、明确可执行的规则，来说明：

- OpenSpec 与 superpowers 分别负责什么
- 新功能是否允许跳过 propose 或 validate
- apply 入口在本仓库里是否仍然可以“随时插入、自由流动”

如果这些边界不写清楚，agent 会优先遵循离当前入口最近的 prompt/skill 文本，而不是仓库想要的全局执行秩序。

## Goals / Non-Goals

**Goals:**
- 固化 OpenSpec 与 superpowers 的职责边界，避免入口文本各说各话
- 要求新功能开发必须先有 active change，再进入实现
- 要求完成态必须包含 validate、doc-sync 与 archive，而不是停在“代码写完”
- 让 apply 入口与仓库级 instruction 保持一致，消除显式冲突

**Non-Goals:**
- 不改造 OpenSpec CLI 本身的行为
- 不把所有 bugfix 或微小文案修正都强制提升为新功能流程
- 不在本次变更中重写所有 prompt/skill，只修正与仓库约束直接冲突的入口

## Decisions

- 用仓库级 `.github/copilot-instructions.md` 作为最高优先级的人机协作规则入口，明确新功能必须遵循 `propose -> apply -> validate -> doc-sync -> archive`
- 用单独的 OpenSpec capability `repository-ai-change-workflow` 作为这套约束的长期 source of truth，而不是只把规则写进 instruction 文本
- 将 `opsx:apply` prompt 和 `openspec-apply-change` skill 调整为“兼容仓库规则”，明确缺少 artifacts 时必须回到 propose/continue，任务完成后必须继续 validate/doc-sync/archive
- 将“只要属于新功能开发”作为强制范围，避免把所有维护性小改都错误纳入重流程

## Risks / Trade-offs

- 流程更严格后，纯实现类入口会少一些“立即开写”的灵活性，但这是为了保证本仓库的 specs、任务和文档同步不再被跳过
- 只更新 apply 入口而不全面重写所有 prompts/skills，意味着未来若新增其他入口，也需要继续遵守并复用这套规则