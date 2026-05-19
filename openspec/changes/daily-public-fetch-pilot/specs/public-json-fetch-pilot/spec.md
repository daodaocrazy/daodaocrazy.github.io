## ADDED Requirements

### Requirement: 刷新流程必须支持定时与手动触发
系统 MUST 提供一个既可按日执行、也可手动触发的刷新工作流，用于生成并发布公开 JSON 抓取试点的数据快照。

#### Scenario: 定时任务刷新生产站点数据
- **WHEN** 每日定时任务触发刷新工作流
- **THEN** 工作流 MUST 在 runner 中抓取公开 JSON 数据
- **AND** MUST 生成最新静态快照并参与站点构建
- **AND** MUST 仅在抓取与构建都成功后才进入部署阶段

#### Scenario: 手动触发用于按分支验证
- **WHEN** 操作人在 GitHub Actions 中手动触发刷新工作流
- **THEN** 工作流 MUST 基于当前触发分支执行抓取与构建
- **AND** 对受支持的部署分支 MUST 使用与站点发布一致的目标路径解析规则

### Requirement: 刷新流程必须生成稳定的静态 JSON 快照
系统 MUST 在构建前把公开源数据规范化为站内静态 JSON 文件，供页面直接读取。

#### Scenario: JSONPlaceholder posts 被规范化为固定结构
- **WHEN** 抓取脚本成功获取 JSONPlaceholder posts
- **THEN** 输出快照 MUST 写入站内 public 数据路径
- **AND** 快照 MUST 包含 `source`、`fetchedAt`、`itemCount` 与 `items`
- **AND** `items` MUST 只包含前 10 条记录
- **AND** 每条记录 MUST 只包含 `id`、`userId`、`title`、`body`

#### Scenario: 远端响应异常时不得发布旧逻辑之外的坏数据
- **WHEN** 远端响应非成功状态、返回无效 JSON 或缺失预期字段
- **THEN** 抓取步骤 MUST 失败
- **AND** 部署步骤 MUST NOT 执行

### Requirement: 工具页必须展示最近一次静态快照
系统 MUST 提供一个可从 Tool Box 访问的页面，用于展示最近一次抓取结果与元数据。

#### Scenario: 工具页展示抓取元数据与条目列表
- **WHEN** 用户访问公开 JSON 抓取试点工具页
- **THEN** 页面 MUST 展示数据源标识、最近抓取时间与条目数量
- **AND** MUST 展示按快照顺序排列的条目列表
- **AND** 每条记录 MUST 至少显示标题、正文与用户编号

#### Scenario: 工具页请求快照失败时给出错误提示
- **WHEN** 页面无法获取静态快照文件
- **THEN** 页面 MUST 呈现可见的错误状态
- **AND** MUST 不影响站点其他导航与正文区域渲染

### Requirement: 刷新部署必须保留现有多环境子路径
系统 MUST 在发布刷新结果时保留 production、lab 与其他 preview 内容，只替换当前目标路径。

#### Scenario: 发布生产根路径时保留 lab 与 preview
- **WHEN** 刷新工作流部署目标为生产根路径
- **THEN** 工作流 MUST 先恢复当前线上站点快照
- **AND** MUST 仅替换生产根路径内容
- **AND** MUST 保留 `/lab/` 与 `/preview/` 子树

#### Scenario: 发布 preview 路径时保留其他环境
- **WHEN** 刷新工作流部署目标为 `preview/<slug>`
- **THEN** 工作流 MUST 仅替换当前 slug 对应的 preview 子路径
- **AND** MUST 保留生产根路径、`/lab/` 与其他 preview 子路径

### Requirement: Tool Box 必须暴露试点入口
系统 MUST 在 Tool Box 首页列出公开 JSON 抓取试点入口，便于发现与手动验证。

#### Scenario: Tool Box 列出公开 JSON 抓取试点
- **WHEN** 用户浏览 Tool Box 首页
- **THEN** 页面 MUST 包含指向公开 JSON 抓取试点工具页的链接
- **AND** 链接说明 MUST 表明该页面展示 GitHub Actions 定时抓取得到的静态结果