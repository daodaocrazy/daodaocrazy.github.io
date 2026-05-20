## MODIFIED Requirements

### Requirement: 仓库 instruction 必须声明 OpenSpec 与 superpowers 的职责边界
仓库 MUST 在仓库级 instruction 中定义 OpenSpec 与 superpowers 的角色边界，但这套边界必须兼容围绕 active change 的流动式协作，而不是强制所有入口采用单次线性阶段模型。

#### Scenario: agent 读取仓库 instruction 时看到 change-centric 双层工作模式
- **WHEN** agent 进入本仓库并读取仓库级 instruction
- **THEN** instruction MUST 声明仓库采用 OpenSpec + superpowers 双层开发模式
- **AND** MUST 说明 OpenSpec 负责 `openspec/changes/<change>/` 下的 `proposal.md`、`design.md`、`tasks.md`、spec delta 与 archive 生命周期
- **AND** MUST 说明 superpowers 入口可以围绕同一个 active change 迭代推进，但相关 artifacts 必须保持同步，不能脱离 OpenSpec 单独演进
- **AND** MUST 说明当 superpowers 入口与仓库文档规则冲突时，必须先更新 change 或文档，再继续执行

### Requirement: 新功能开发必须先具备 active change
仓库 MUST 要求新功能开发在进入稳定实现前，先具备对应的 active change 和当前任务所需的 source-of-truth artifacts。

#### Scenario: 新功能开发围绕 active change 启动
- **WHEN** 用户请求的工作属于新功能开发
- **THEN** instruction MUST 要求先在 `openspec/changes/<change>/` 创建或续写与当前任务相关的 `proposal.md`、`design.md` 与 `tasks.md`
- **AND** 这些 artifacts MUST 覆盖当前任务需要的 source-of-truth、范围、非目标、验证计划与文档同步点
- **AND** 在 active change 缺失或 artifacts 明显不足时 MUST NOT 脱离 change 长段实现新功能代码

### Requirement: 新功能开发必须围绕同一 change 协作并留下完成证据
仓库 MUST 允许新功能开发围绕同一个 active change 进行流动式 apply，同时保留 validate、doc-sync 与 archive 的完成门槛。

#### Scenario: apply 可以与 artifact 更新交错推进
- **WHEN** agent 在已有 active change 上推进一个新功能请求
- **THEN** instruction MUST 允许 `propose`、`continue`、`apply` 围绕同一个 change 迭代推进
- **AND** apply 阶段 MAY 在部分实现后回写或补齐 artifacts
- **AND** 一旦实现偏离当前 change MUST 先更新 artifacts 再继续编码

#### Scenario: 宣称完成前必须有 validate 与 doc-sync 证据
- **WHEN** agent 准备宣称新功能开发完成、交付、归档或推送
- **THEN** MUST 先运行最相关的 focused tests，再补必要的类型检查或 lint
- **AND** MUST 检查并同步相关 specs、README、架构文档与受影响文档，或明确记录“已检查，无需更新”

#### Scenario: 归档前不得留下未完成任务
- **WHEN** agent 准备将 change 归档
- **THEN** `tasks.md` MUST 不再包含未完成项
- **AND** change MUST 被移动到 `openspec/changes/archive/YYYY-MM-DD-<change>/`
- **AND** 归档后该 change MUST 不再出现在 active changes 列表中

### Requirement: apply 入口说明必须与仓库级 guidance 兼容
仓库 MUST 让 apply prompt/skill 的说明文本与仓库级 instruction 保持一致，允许 change-centric / fluid apply，而不是额外发明更硬的 phase-locked 入口规则。

#### Scenario: apply 入口保留流动式 apply 语义
- **WHEN** agent 使用 apply prompt 或 apply skill 处理一个已有 change 的新功能请求
- **THEN** 入口说明 MUST 允许在已有 change 上继续推进、在实现后回写 artifacts、并与其他动作交错进行
- **AND** MUST NOT 把 apply 描述成只能在所有 artifacts 先齐备后才能进入的单一线性阶段
- **AND** MUST 继续把 `validate -> doc-sync -> archive` 说明为完成态必须补齐的后续步骤