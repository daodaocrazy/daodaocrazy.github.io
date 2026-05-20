# Align Instruction With OpenSpec Apply

## 1. 回滚 apply 入口的额外约束

- [x] 1.1 恢复 `openspec-apply-change` skill 的原始 fluid workflow 表述
- [x] 1.2 恢复 `opsx:apply` prompt 的匹配说明，避免 apply 两个入口继续分叉

## 2. 调整仓库级 source of truth

- [x] 2.1 把 `.github/copilot-instructions.md` 改为兼容 active change / fluid apply 的协作约束
- [x] 2.2 为 `repository-ai-change-workflow` 编写修改型 spec delta，说明 instruction 应适配 skill

## 3. 校验与落库

- [x] 3.1 运行 focused OpenSpec validate，并确认 prompt/skill 已恢复 fluid wording
- [x] 3.2 同步主 spec 并归档 change