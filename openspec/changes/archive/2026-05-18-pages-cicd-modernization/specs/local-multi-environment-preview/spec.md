## ADDED Requirements

### Requirement: 本地预览必须复现单域名多子路径站点
系统 MUST 提供单端口本地预览，用于同时暴露生产根路径、lab 子路径与当前工作树子路径。

#### Scenario: 默认启动本地多环境预览
- **WHEN** 操作人执行本地多环境预览命令
- **THEN** 预览站点 MUST 在单一端口下同时提供 /
- **AND** MUST 提供 /lab/
- **AND** MUST 提供 /worktree/

### Requirement: 本地预览必须支持可选 preview 分支挂载
系统 MUST 支持把指定 feature 分支的构建结果挂载到本地 /preview/<slug>/ 子路径。

#### Scenario: 挂载指定 feature 分支的 preview
- **WHEN** 操作人使用 --preview-ref 指定 feature 分支
- **THEN** 系统 MUST 将该分支构建结果挂载到 /preview/<slug>/
- **AND** slug MUST 与线上 preview 环境使用同一归一化规则

### Requirement: 本地预览必须提供生命周期命令
系统 MUST 提供状态检查与停止命令，便于维护本地预览进程。

#### Scenario: 查询本地预览状态
- **WHEN** 操作人执行状态命令
- **THEN** 系统 MUST 返回当前端口与挂载路径的可用性信息

#### Scenario: 停止本地预览服务
- **WHEN** 操作人执行停止命令
- **THEN** 系统 MUST 停止对应端口上的本地预览服务