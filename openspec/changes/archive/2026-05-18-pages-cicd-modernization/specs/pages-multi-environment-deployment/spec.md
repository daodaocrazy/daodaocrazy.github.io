## ADDED Requirements

### Requirement: 分支必须映射到稳定的 Pages 目标
系统 MUST 根据 Git 分支名解析出唯一的 Pages 部署目标，包括 channel、base path、deploy subdir、environment name 与 preview slug。

#### Scenario: main 分支发布到生产根路径
- **WHEN** 部署目标分支为 main
- **THEN** channel MUST 为 production
- **AND** base path MUST 为 /
- **AND** deploy subdir MUST 为空
- **AND** environment name MUST 为 github-pages

#### Scenario: lab 分支发布到固定子路径
- **WHEN** 部署目标分支为 lab
- **THEN** channel MUST 为 lab
- **AND** base path MUST 为 /lab/
- **AND** deploy subdir MUST 为 lab
- **AND** environment name MUST 为 github-pages

#### Scenario: feature 分支发布到预览子路径
- **WHEN** 部署目标分支匹配 feature/*
- **THEN** channel MUST 为 preview
- **AND** base path MUST 为 /preview/<slug>/
- **AND** deploy subdir MUST 为 preview/<slug>
- **AND** environment name MUST 为 github-pages-preview
- **AND** slug MUST 由分支名稳定归一化生成

### Requirement: deploy 必须严格依赖 build 成功
系统 MUST 在 build 成功之后才允许执行 GitHub Pages 部署。

#### Scenario: 构建失败时不得覆盖线上
- **WHEN** 任一受支持分支触发的 build job 失败
- **THEN** deploy job MUST NOT 执行
- **AND** GitHub Pages MUST 保持最后一次成功部署的站点内容

#### Scenario: 构建成功时发布 artifact
- **WHEN** build job 成功完成
- **THEN** 工作流 MUST 上传 Pages artifact
- **AND** deploy-pages MUST 使用该 artifact 作为唯一发布输入

### Requirement: 多环境站点必须以完整 artifact 装配并发布
系统 MUST 先恢复当前线上站点快照，再只替换当前目标子路径，最后发布完整站点 artifact。

#### Scenario: 发布 preview 环境时保留其他环境
- **WHEN** 当前部署目标为 preview/<slug>
- **THEN** 工作流 MUST 保留已有的生产根路径、/lab/ 与其他 /preview/* 内容
- **AND** 仅替换当前 slug 对应的 preview 子路径

#### Scenario: 发布生产根路径时保留 lab 与 preview
- **WHEN** 当前部署目标为生产根路径
- **THEN** 工作流 MUST 替换根路径站点内容
- **AND** MUST 保留 /lab/ 与 /preview/ 子树

### Requirement: preview 环境必须可发现且可清理
系统 MUST 为 preview 环境维护可发现的索引与可清理的生命周期。

#### Scenario: feature 分支部署后记录 preview 元数据
- **WHEN** preview 环境部署成功
- **THEN** 对应子路径 MUST 包含分支名、slug、部署时间与 URL 的元数据文件
- **AND** 预览索引页与 manifest MUST 基于当前保留的 preview 环境重建

#### Scenario: 删除 feature 分支时清理 preview 子树
- **WHEN** delete 事件删除的分支匹配 feature/*
- **THEN** 工作流 MUST 删除对应的 /preview/<slug>/ 子树
- **AND** MUST 重建 preview 索引页与 manifest
- **AND** MUST 重新发布更新后的完整 Pages artifact

### Requirement: VitePress 构建必须感知部署路径与内容来源
系统 MUST 允许构建过程通过环境变量注入部署 base path 与文档内容来源分支。

#### Scenario: 构建时注入 base path
- **WHEN** 构建命令传入部署 base path
- **THEN** 站点生成结果 MUST 使用该 base path 生成资源链接与站内链接

#### Scenario: 构建时注入内容分支
- **WHEN** 构建命令传入内容来源 ref
- **THEN** 生成站点中的 editLink MUST 指向该 ref 下的 vitepress-docs/docs/:path