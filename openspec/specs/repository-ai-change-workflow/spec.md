# repository-ai-change-workflow Specification

## Purpose
定义仓库级 instruction 对 OpenSpec source-of-truth、superpowers 执行入口、新功能固定顺序以及 validate/doc-sync/archive 完成条件的约束。

## Requirements
### Requirement: 仓库 instruction 必须声明 OpenSpec 与 superpowers 的职责边界
仓库 MUST 在仓库级 instruction 中定义 OpenSpec 与 superpowers 的角色边界，避免执行入口与 source-of-truth 脱节。

#### Scenario: agent 读取仓库 instruction 时看到双层工作模式
- **WHEN** agent 进入本仓库并读取仓库级 instruction
- **THEN** instruction MUST 声明仓库采用 OpenSpec + superpowers 双层开发模式
- **AND** MUST 说明 OpenSpec 负责 `openspec/changes/<change>/` 下的 `proposal.md`、`design.md`、`tasks.md`、spec delta 与 archive 生命周期
- **AND** MUST 说明 superpowers 只负责 `propose`、`apply`、`validate`、`archive`、`doc-sync` 的执行入口与加速，而不得替代 Source of Truth 顺序
- **AND** MUST 说明当 superpowers 入口与仓库文档规则冲突时，必须先更新 change 或文档，再继续执行

### Requirement: 新功能开发必须先具备 active change
仓库 MUST 要求新功能开发在开始编码前，先具备对应的 active change 和必要的 source-of-truth artifacts。

#### Scenario: 新功能开发在编码前先补齐 change artifacts
- **WHEN** 用户请求的工作属于新功能开发
- **THEN** instruction MUST 要求先在 `openspec/changes/<change>/` 创建或续写 `proposal.md`、`design.md` 与 `tasks.md`
- **AND** 这些 artifacts MUST 包含 source-of-truth、范围、非目标、验证计划与文档同步点
- **AND** 在 active change 未创建或未续写完成前 MUST NOT 开始实现新功能代码

### Requirement: 新功能开发必须遵循固定顺序并留下验证证据
仓库 MUST 对新功能开发执行固定顺序，并把 validate、doc-sync、archive 作为完成态的一部分。

#### Scenario: 新功能开发按固定顺序推进
- **WHEN** agent 执行新的功能型变更
- **THEN** instruction MUST 要求按 `propose -> apply -> validate -> doc-sync -> archive` 顺序推进
- **AND** apply 阶段 MUST 按 `tasks.md` 的最小可验证任务推进，并在完成后立即回写勾选状态
- **AND** 若实现偏离原计划 MUST 先更新 change artifacts 再继续编码

#### Scenario: 宣称完成前必须有 validate 与 doc-sync 证据
- **WHEN** agent 准备宣称新功能开发完成
- **THEN** MUST 先运行最相关的 focused tests，再补必要的类型检查或 lint
- **AND** MUST 检查并同步相关 specs、README、架构文档与受影响文档，或明确记录“已检查，无需更新”

#### Scenario: 归档前不得留下未完成任务
- **WHEN** agent 准备将 change 归档
- **THEN** `tasks.md` MUST 不再包含未完成项
- **AND** change MUST 被移动到 `openspec/changes/archive/YYYY-MM-DD-<change>/`
- **AND** 归档后该 change MUST 不再出现在 active changes 列表中

### Requirement: apply 入口说明必须与仓库级顺序兼容
仓库 MUST 让 apply prompt/skill 的说明文本与仓库级 instruction 保持一致，不能继续宣传跳步或流动式新功能实现。

#### Scenario: apply 入口在缺少 artifacts 时回退到 propose 或 continue
- **WHEN** agent 使用 apply prompt 或 apply skill 处理一个新功能请求
- **THEN** 入口说明 MUST 要求在缺少必需 artifacts 时停止编码，并回退到 propose/continue
- **AND** MUST 要求当实现引发范围或设计漂移时先更新 artifacts 再继续编码
- **AND** MUST 把 `validate -> doc-sync -> archive` 说明为实现后的必经后续步骤，而不是可选收尾