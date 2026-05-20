# toolbox-metals-market-snapshot Specification

## Purpose
定义 Tool Box 下金属市场快照页面的第一阶段范围、双口径 JSON contract、source matrix 与展示约束。

## ADDED Requirements

### Requirement: 刷新流程必须生成稳定的双口径金属快照
系统 MUST 在构建前生成一份面向 Tool Box 页面消费的静态 JSON 快照，并且对每个首发品种分别提供国内与国际 quote。

#### Scenario: 第一阶段快照固定包含 7 个首发品种
- **WHEN** 刷新流程成功生成第一阶段金属市场快照
- **THEN** `items` MUST 按固定顺序包含 `copper`、`aluminum`、`lead`、`zinc`、`nickel`、`tin`、`iron_ore`
- **AND** `itemCount` MUST 等于 7

#### Scenario: 每个品种都包含国内与国际两个 quote 对象
- **WHEN** 页面消费任意一个首发品种对象
- **THEN** 该对象 MUST 同时包含 `domesticQuote` 和 `internationalQuote`
- **AND** MUST 不把国内与国际价格合并成单一 price 字段

### Requirement: 快照 contract 必须保留口径与来源元数据
系统 MUST 为快照顶层、品种对象和 quote 对象提供稳定字段，以支持页面展示、问题排查和后续 source 替换。

#### Scenario: 顶层快照字段固定
- **WHEN** 快照文件被写入站内 public 数据路径
- **THEN** 顶层 MUST 包含 `schemaVersion`、`snapshotAt`、`snapshotDate`、`itemCount` 和 `items`

#### Scenario: quote 对象包含必需字段
- **WHEN** 任意 `domesticQuote` 或 `internationalQuote` 被写入快照
- **THEN** 该对象 MUST 包含 `status`、`basisKey`、`basisLabel`、`basisType`、`venueLabel`、`specLabel`、`price`、`currency`、`unit`、`previousPrice`、`changeAmount`、`changePercent`、`tradeDate`、`publishedAt`、`sourceLabel`、`sourceUrl` 和 `note`
- **AND** 第一阶段 SHOULD 同时保留 `sourceSection`、`basisReferenceLabel` 和 `basisReferenceUrl`，用于多源解释与排障

### Requirement: 第一阶段 quote 命名必须使用固定注册表
系统 MUST 对第一阶段 14 条 quote 使用固定的 `basisKey` 与 `specLabel` 组合，避免实现阶段各自命名。

#### Scenario: 首发品种使用固定的 basisKey 与 specLabel
- **WHEN** 刷新流程写入第一阶段 7 个品种的 14 条 quote
- **THEN** 每条 quote MUST 使用下表定义的 `basisKey` 与 `specLabel`

| quote | basisKey | specLabel |
| --- | --- | --- |
| `copper.domesticQuote` | `shmet_cu_domestic_settlement` | 铜现货内贸结算口径 |
| `copper.internationalQuote` | `shmet_cu_foreign_settlement` | 铜现货外贸结算口径 |
| `aluminum.domesticQuote` | `shmet_al_domestic_settlement` | 铝现货内贸结算口径 |
| `aluminum.internationalQuote` | `shmet_al_foreign_settlement` | 铝现货外贸结算口径 |
| `lead.domesticQuote` | `shmet_pb_domestic_settlement` | 铅现货内贸结算口径 |
| `lead.internationalQuote` | `shmet_pb_foreign_settlement` | 铅现货外贸结算口径 |
| `zinc.domesticQuote` | `shmet_zn_domestic_settlement` | 锌现货内贸结算口径 |
| `zinc.internationalQuote` | `shmet_zn_foreign_settlement` | 锌现货外贸结算口径 |
| `nickel.domesticQuote` | `shmet_ni_domestic_settlement` | 镍现货内贸结算口径 |
| `nickel.internationalQuote` | `shmet_ni_foreign_settlement` | 镍现货外贸结算口径 |
| `tin.domesticQuote` | `shmet_sn_domestic_settlement` | 锡现货内贸结算口径 |
| `tin.internationalQuote` | `shmet_sn_foreign_settlement` | 锡现货外贸结算口径 |
| `iron_ore.domesticQuote` | `tradingeconomics_iron_ore_cny_domestic_index` | 铁矿石人民币国内口径 |
| `iron_ore.internationalQuote` | `tradingeconomics_iron_ore_62fe_cfr_china_index` | 铁矿石 62% Fe CFR China 指数口径 |

#### Scenario: 六大有色必须输出标准化 sourceSection
- **WHEN** 刷新流程写入六大有色的国内或国际 quote
- **THEN** 国内 quote 的 `sourceSection` MUST 使用 `domestic-price/<metal-code>`
- **AND** 国际 quote 的 `sourceSection` MUST 使用 `foreign-price/<metal-code>`
- **AND** `<metal-code>` MUST 仅允许 `cu`、`al`、`pb`、`zn`、`ni`、`sn`

#### Scenario: 国际铁矿石 quote 必须保留口径锚点
- **WHEN** 刷新流程写入 `iron_ore.internationalQuote`
- **THEN** `basisReferenceLabel` MUST 不为 `null`
- **AND** `basisReferenceUrl` MUST 不为 `null`

### Requirement: 涨跌值必须只在同口径内计算
系统 MUST 确保涨跌额与涨跌幅只基于同一口径、同一币种、同一单位的历史值计算。

#### Scenario: 同口径下计算涨跌额与涨跌幅
- **WHEN** 某个 quote 同时拥有当前价格与上一可比价格
- **THEN** `changeAmount` MUST 只基于同一 `basisKey` 的前值计算
- **AND** `changePercent` MUST 只基于同一币种和同一单位下的前值计算

#### Scenario: 缺失状态不保留伪造涨跌值
- **WHEN** 某个 quote 因休市、抓取失败或页面不可用而标记为 `missing`
- **THEN** `price`、`previousPrice`、`changeAmount` 和 `changePercent` MUST 全部为 `null`

### Requirement: 第一阶段 source matrix 必须遵循约定的公开入口
系统 MUST 在第一阶段按约定的公开页面入口构建快照，避免实装阶段继续漂移。

#### Scenario: 六大有色复用 SHMET 主页分区
- **WHEN** 刷新流程处理 `copper`、`aluminum`、`lead`、`zinc`、`nickel` 或 `tin`
- **THEN** 国内与国际 quote MUST 都来自 SHMET 主页分区逻辑
- **AND** 国内侧 MUST 使用内贸结算价分支
- **AND** 国际侧 MUST 使用外贸结算价分支

#### Scenario: 铁矿石使用独立国内与国际入口
- **WHEN** 刷新流程处理 `iron_ore`
- **THEN** 国内侧 MUST 使用公开可访问的铁矿石人民币口径展示入口
- **AND** 国际侧 MUST 使用公开可访问的 62% Fe CFR China 国际口径展示入口
- **AND** SHOULD 同时保留一个交易所或合约产品页作为口径锚点

### Requirement: 页面必须明确区分国内与国际市场上下文
系统 MUST 在工具页中清楚展示每个 quote 所属的市场上下文，避免用户误以为两侧价格可直接等价。

#### Scenario: 页面展示口径、币种、单位和来源
- **WHEN** 用户访问金属市场快照页面
- **THEN** 每个 quote 区块 MUST 显示口径名称、币种、单位、来源名称和时间
- **AND** MUST 让用户能够区分国内与国际两个区块

#### Scenario: 页面不直接展示合并价或跨市场价差
- **WHEN** 页面同时展示国内与国际 quote
- **THEN** 页面 MUST 不生成默认合并价
- **AND** MUST 不在第一阶段默认展示跨市场直接价差或换算后的统一价格