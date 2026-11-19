---
name: publish-current-changes
description: Move the current working-tree changes onto a new branch, push them, open a pull request against the remote default branch, then follow the triggered CI to a conclusion. Use when the user asks to publish, ship, or open a PR for uncommitted work in this repository, or to turn current changes into a reviewable pull request. Do not use for committing onto the current branch, for pushing an existing branch without a new PR, or when the user only wants a commit message.
metadata:
  short-description: 把当前改动发成 PR 并跟进 CI
---

# 发布当前改动为 PR

把工作区里的改动整理到新分支，推送到实际目标仓库，创建合并到该仓库默认分支的 PR，并跟进触发的 CI/CD 直到有明确结果。

## 输入

用户可能在调用时补充分支名、提交信息、PR 标题、PR 描述或额外上下文。没有提供时，基于当前 diff、提交历史和仓库上下文生成合理默认值。

## 执行步骤

### 1. 识别实际推送目标和真实默认分支

- 检查当前分支的 upstream remote。
- 没有 upstream 时，依次检查 `branch.pushRemote`、`remote.pushDefault`、`origin`。
- 基于实际要 push 的 remote 查询仓库默认分支，优先用远端仓库元数据；只有取不到远端元数据时才回退到本地 remote HEAD。
- 绝不假设默认分支是 `main` 或 `master`。
- 访问 public GitHub 时遵循仓库 `AGENTS.md` 的约定（本仓库用 `ghpub`）。

### 2. 检查工作区状态

- 查看当前分支、`git status`、暂存与未暂存改动、是否有未推送提交、已配置的 remotes。
- 没有可发布的改动时，直接说明并停止。
- 输出一段准备摘要，至少包含：实际 push remote、检测到的默认分支、拟创建的新分支名、拟使用的 commit message、拟使用的 PR 标题。

### 3. commit 之前先取得确认

- 严格遵守：执行 `git commit` 之前，先把准备摘要发给用户并等待明确确认。
- 用户只修正分支名、commit message 或 PR 文案时，按修正后的内容继续。
- 没有得到确认时，不要 commit、不要 push、不要创建 PR。

### 4. 创建新分支并发布

- 从当前 HEAD 新建分支，把当前改动带到新分支上。
- 即使当前不在默认分支，只要目标是「把当前修改放到新分支并提 PR」，也要新建分支，不要直接复用当前分支。
- 不要丢失、覆盖或回退用户已有改动。
- 提交后推送到选定的 remote，创建 PR，目标分支必须是第 1 步检测出的真实默认分支。
- PR 描述保持简洁，包含变更摘要、已做的校验，以及仍需关注的风险或后续项。
- 优先使用仓库感知的 GitHub 工具，避免交互式 git 流程。

### 5. 持续跟进 CI/CD

- PR 创建后检查关联的 CI/CD、GitHub Actions、required checks 或其他平台的检查状态。
- 有任务在运行时持续监控，直到全部成功、失败、取消，或出现明确需要人工介入的阻塞。
- 不要中途停下来问用户要不要继续观察。
- 失败时汇总失败的 job 或 check、关键报错和下一步建议。
- 成功时给出 PR 链接、目标分支、最终检查结果和合并建议。
- 完全没有触发检查时，明确说明「未发现关联检查任务」。

## 安全边界

- 不要强推。
- 不要改写与当前发布无关的文件。
- 不要假设 remote 名称、默认分支名称或 CI 平台。
- 缺少 push、创建 PR 或读取检查结果的权限时，直接说明阻塞点，以及已经完成到哪一步。
