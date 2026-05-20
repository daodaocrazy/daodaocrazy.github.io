## Context

当前站点真实入口在 vitepress-docs/，并且已经存在一个未合并但方向明确的“每日公开 JSON 抓取”试点：先在构建前抓取公开源、生成站内静态 JSON，再由 Tool Box 页面只读快照结果。这个模式适合作为金属市场页面的基础路线，因为它不要求服务端运行时，也能兼容当前 GitHub Pages 发布方式。

用户已经明确两个核心约束：

- 金属范围不能只限于单个品种，第一阶段需要覆盖主流金属
- 国内与国际价格不能视为同一个价格，页面与快照都必须分别建模

经过前期探索，第一阶段已经收敛为 7 个首发品种：铜、铝、铅、锌、镍、锡、铁矿石。其中六大有色适合先复用同一公开站点结构；铁矿石则需要单独处理国内和国际口径。

## Goals / Non-Goals

**Goals:**
- 在 Tool Box 下新增独立金属市场快照页面，路径规划为 `/tools/metals-market-snapshot`
- 每日生成一份静态 JSON 快照，覆盖 7 个首发品种和 14 条 quote 记录（国内 7 条，国际 7 条）
- 明确双口径 contract：每个品种都包含 `domesticQuote` 和 `internationalQuote`
- 第一版锁定 source matrix，避免实现阶段继续漂移
- 页面展示时必须让用户一眼识别国内/国际、口径、币种、单位和更新时间

**Non-Goals:**
- 第一版不做历史时间序列、图表和趋势回放
- 不做汇率换算后的统一价格、跨市场价差或套利分析
- 不覆盖螺纹钢、热卷、不锈钢、废钢、生铁等第二阶段品种
- 不追求第一版就直连 SHFE、DCE、LME 等高门槛官方站点
- 不引入登录态、验证码、浏览器自动化或商业授权数据源

## Decisions

### 页面与阶段范围

- 工具页路径固定为 `/tools/metals-market-snapshot`
- 页面第一阶段只展示 7 个品种：`copper`、`aluminum`、`lead`、`zinc`、`nickel`、`tin`、`iron_ore`
- UI 按品种展示两张 quote 卡片或两列信息：国内与国际，不合并成单一价格

### 第一版 Source Matrix

| 品种 | 国内口径 | 国内入口 | 国际口径 | 国际入口 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 铜 | SHMET 铜内贸结算价 | http://shmet.com/ | SHMET 铜外贸结算价 | http://shmet.com/ | 通过主页不同分区抽取 |
| 铝 | SHMET 铝内贸结算价 | http://shmet.com/ | SHMET 铝外贸结算价 | http://shmet.com/ | 通过主页不同分区抽取 |
| 铅 | SHMET 铅内贸结算价 | http://shmet.com/ | SHMET 铅外贸结算价 | http://shmet.com/ | 通过主页不同分区抽取 |
| 锌 | SHMET 锌内贸结算价 | http://shmet.com/ | SHMET 锌外贸结算价 | http://shmet.com/ | 通过主页不同分区抽取 |
| 镍 | SHMET 镍内贸结算价 | http://shmet.com/ | SHMET 镍外贸结算价 | http://shmet.com/ | 通过主页不同分区抽取 |
| 锡 | SHMET 锡内贸结算价 | http://shmet.com/ | SHMET 锡外贸结算价 | http://shmet.com/ | 通过主页不同分区抽取 |
| 铁矿石 | Trading Economics 铁矿石人民币口径 | https://zh.tradingeconomics.com/commodity/iron-ore-cny | 62% Fe CFR China 国际指数口径 | https://zh.tradingeconomics.com/commodity/iron-ore | 同时保留 CME 口径锚点 |

- 六大有色第一版不为每个品种维护独立 URL，而是统一复用 SHMET 主页，并通过 `sourceSection` 区分 `Cu`、`Al`、`Pb`、`Zn`、`Ni`、`Sn` 和 `domestic-price` / `foreign-price`
- 铁矿石第一版拆成三类来源语义：
  - 国内展示源：Trading Economics 的公开铁矿石人民币行情页
  - 展示源：Trading Economics 的公开行情页
  - 口径锚点：CME 的 62% Fe CFR China 产品页

### 第一阶段 Basis Registry 与命名约束

- `basisKey` 使用小写 snake_case，第一阶段显式绑定“当前展示口径 + 当前公开来源”；如果未来切换到另一条公开序列或更权威直连源，应视为 contract 变更，而不是静默复用旧 key
- `specLabel` 面向页面展示，使用稳定中文口径名，不携带日期、价格、来源 URL 或解释性备注
- 六大有色的 `sourceSection` 固定为 `domestic-price/<metal-code>` 或 `foreign-price/<metal-code>`，其中 `<metal-code>` 仅允许 `cu`、`al`、`pb`、`zn`、`ni`、`sn`
- 铁矿石第一阶段使用整页级抓取语义，因此国内与国际两侧的 `sourceSection` 固定为 `null`

第一阶段 14 条 quote 的规范注册表如下：

| quote | basisKey | basisLabel | specLabel | basisType | currency | unit | sourceSection |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `copper.domesticQuote` | `shmet_cu_domestic_settlement` | SHMET 铜内贸结算价 | 铜现货内贸结算口径 | `spot` | `CNY` | `元/吨` | `domestic-price/cu` |
| `copper.internationalQuote` | `shmet_cu_foreign_settlement` | SHMET 铜外贸结算价 | 铜现货外贸结算口径 | `spot` | `USD` | `美元/吨` | `foreign-price/cu` |
| `aluminum.domesticQuote` | `shmet_al_domestic_settlement` | SHMET 铝内贸结算价 | 铝现货内贸结算口径 | `spot` | `CNY` | `元/吨` | `domestic-price/al` |
| `aluminum.internationalQuote` | `shmet_al_foreign_settlement` | SHMET 铝外贸结算价 | 铝现货外贸结算口径 | `spot` | `USD` | `美元/吨` | `foreign-price/al` |
| `lead.domesticQuote` | `shmet_pb_domestic_settlement` | SHMET 铅内贸结算价 | 铅现货内贸结算口径 | `spot` | `CNY` | `元/吨` | `domestic-price/pb` |
| `lead.internationalQuote` | `shmet_pb_foreign_settlement` | SHMET 铅外贸结算价 | 铅现货外贸结算口径 | `spot` | `USD` | `美元/吨` | `foreign-price/pb` |
| `zinc.domesticQuote` | `shmet_zn_domestic_settlement` | SHMET 锌内贸结算价 | 锌现货内贸结算口径 | `spot` | `CNY` | `元/吨` | `domestic-price/zn` |
| `zinc.internationalQuote` | `shmet_zn_foreign_settlement` | SHMET 锌外贸结算价 | 锌现货外贸结算口径 | `spot` | `USD` | `美元/吨` | `foreign-price/zn` |
| `nickel.domesticQuote` | `shmet_ni_domestic_settlement` | SHMET 镍内贸结算价 | 镍现货内贸结算口径 | `spot` | `CNY` | `元/吨` | `domestic-price/ni` |
| `nickel.internationalQuote` | `shmet_ni_foreign_settlement` | SHMET 镍外贸结算价 | 镍现货外贸结算口径 | `spot` | `USD` | `美元/吨` | `foreign-price/ni` |
| `tin.domesticQuote` | `shmet_sn_domestic_settlement` | SHMET 锡内贸结算价 | 锡现货内贸结算口径 | `spot` | `CNY` | `元/吨` | `domestic-price/sn` |
| `tin.internationalQuote` | `shmet_sn_foreign_settlement` | SHMET 锡外贸结算价 | 锡现货外贸结算口径 | `spot` | `USD` | `美元/吨` | `foreign-price/sn` |
| `iron_ore.domesticQuote` | `tradingeconomics_iron_ore_cny_domestic_index` | Trading Economics 铁矿石人民币报价 | 铁矿石人民币国内口径 | `index` | `CNY` | `元/吨` | `null` |
| `iron_ore.internationalQuote` | `tradingeconomics_iron_ore_62fe_cfr_china_index` | Trading Economics 铁矿石 62% Fe CFR China 指数 | 铁矿石 62% Fe CFR China 指数口径 | `index` | `USD` | `美元/干吨` | `null` |

### Snapshot 顶层 Contract

顶层快照字段固定为：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `schemaVersion` | string | 当前 contract 版本，第一版固定为 `1.0` |
| `snapshotAt` | string | 抓取完成时间，ISO 8601 |
| `snapshotDate` | string | 页面展示日期，`YYYY-MM-DD` |
| `itemCount` | number | 品种数量，第一版固定为 7 |
| `items` | array | 品种列表 |

### 品种对象 Contract

每个品种对象固定字段如下：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `metalKey` | string | 稳定英文 key |
| `metalLabel` | string | 中文名称 |
| `category` | string | 第一版仅允许 `non_ferrous` 或 `ferrous_raw_material` |
| `displayOrder` | number | 页面排序，1 到 7 且唯一 |
| `domesticQuote` | object | 国内 quote |
| `internationalQuote` | object | 国际 quote |

### Quote 对象 Contract

每个 quote 对象必须包含以下字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `status` | string | `ok`、`delayed` 或 `missing` |
| `basisKey` | string | 当前展示口径 key；第一阶段必须来自首发注册表 |
| `basisLabel` | string | 当前展示口径名称；第一阶段与注册表保持一致 |
| `basisType` | string | 第一版仅允许 `spot` 或 `index` |
| `venueLabel` | string | 报价机构、市场或指数来源名称 |
| `specLabel` | string | 规格、品位或口径说明；第一阶段必须来自首发注册表 |
| `price` | number or null | 当前价格 |
| `currency` | string | 第一版仅允许 `CNY` 或 `USD` |
| `unit` | string | 例如 `元/吨`、`美元/吨`、`美元/干吨` |
| `previousPrice` | number or null | 上一个可比价格 |
| `changeAmount` | number or null | 涨跌额 |
| `changePercent` | number or null | 涨跌幅 |
| `tradeDate` | string or null | 交易日或报价日 |
| `publishedAt` | string or null | 源站发布时间 |
| `sourceLabel` | string | 实际抓取来源名称 |
| `sourceUrl` | string or null | 实际抓取页面 |
| `sourceSection` | string or null | 页面分区或子栏目标识；SHMET 使用标准化 section key，铁矿石第一阶段为 `null` |
| `basisReferenceLabel` | string or null | 口径锚点来源名称 |
| `basisReferenceUrl` | string or null | 口径锚点页面 |
| `note` | string or null | 对口径、延迟或限制的说明 |

### 状态与计算规则

- `changeAmount` 和 `changePercent` 只能在同一个 `basisKey`、同一币种、同一单位下计算
- 页面 MUST 不把国内与国际价格混算成一个合并值
- 当 `status = missing` 时，`price`、`previousPrice`、`changeAmount` 和 `changePercent` 必须全部为 `null`
- 当 `status = delayed` 时，可以保留价格，但 `note` 必须说明延迟原因或市场休市
- 当 `basisKey = tradingeconomics_iron_ore_62fe_cfr_china_index` 时，`basisReferenceLabel` 和 `basisReferenceUrl` 必须同时存在，用于说明其口径锚点来自 CME 产品定义
- 第一版页面不做跨市场直接比较，不计算汇率换算后的统一价格

### 页面展示约束

- 每个品种都必须同时显示国内与国际两个 quote 区块，即便其中一侧为 `missing`
- 每个 quote 区块至少显示：价格、涨跌额、涨跌幅、币种、单位、口径名称、来源名称、时间
- 铁矿石国际区块必须显式提示其为“62% Fe CFR China 国际指数口径”，避免误解为海外现货零售价

### 示例 Snapshot 片段

以下示例只用于固定字段形状、命名和语义，不代表真实价格值：

```json
{
  "schemaVersion": "1.0",
  "snapshotAt": "2026-05-20T08:30:12.000Z",
  "snapshotDate": "2026-05-20",
  "itemCount": 7,
  "items": [
    {
      "metalKey": "copper",
      "metalLabel": "铜",
      "category": "non_ferrous",
      "displayOrder": 1,
      "domesticQuote": {
        "status": "ok",
        "basisKey": "shmet_cu_domestic_settlement",
        "basisLabel": "SHMET 铜内贸结算价",
        "basisType": "spot",
        "venueLabel": "上海金属网",
        "specLabel": "铜现货内贸结算口径",
        "price": 78240,
        "currency": "CNY",
        "unit": "元/吨",
        "previousPrice": 78090,
        "changeAmount": 150,
        "changePercent": 0.19,
        "tradeDate": "2026-05-20",
        "publishedAt": "2026-05-20T09:15:00+08:00",
        "sourceLabel": "SHMET 首页",
        "sourceUrl": "http://shmet.com/",
        "sourceSection": "domestic-price/cu",
        "basisReferenceLabel": null,
        "basisReferenceUrl": null,
        "note": null
      },
      "internationalQuote": {
        "status": "ok",
        "basisKey": "shmet_cu_foreign_settlement",
        "basisLabel": "SHMET 铜外贸结算价",
        "basisType": "spot",
        "venueLabel": "上海金属网",
        "specLabel": "铜现货外贸结算口径",
        "price": 10875,
        "currency": "USD",
        "unit": "美元/吨",
        "previousPrice": 10840,
        "changeAmount": 35,
        "changePercent": 0.32,
        "tradeDate": "2026-05-20",
        "publishedAt": "2026-05-20T09:15:00+08:00",
        "sourceLabel": "SHMET 首页",
        "sourceUrl": "http://shmet.com/",
        "sourceSection": "foreign-price/cu",
        "basisReferenceLabel": null,
        "basisReferenceUrl": null,
        "note": "SHMET 外贸结算价，不等同于 LME 官方直接报价"
      }
    },
    {
      "metalKey": "iron_ore",
      "metalLabel": "铁矿石",
      "category": "ferrous_raw_material",
      "displayOrder": 7,
      "domesticQuote": {
        "status": "ok",
        "basisKey": "tradingeconomics_iron_ore_cny_domestic_index",
        "basisLabel": "Trading Economics 铁矿石人民币报价",
        "basisType": "index",
        "venueLabel": "Trading Economics",
        "specLabel": "铁矿石人民币国内口径",
        "price": 797,
        "currency": "CNY",
        "unit": "元/吨",
        "previousPrice": 798.5,
        "changeAmount": -1.5,
        "changePercent": -0.19,
        "tradeDate": "2026-05-20",
        "publishedAt": null,
        "sourceLabel": "Trading Economics 铁矿石人民币行情页",
        "sourceUrl": "https://zh.tradingeconomics.com/commodity/iron-ore-cny",
        "sourceSection": null,
        "basisReferenceLabel": null,
        "basisReferenceUrl": null,
        "note": "展示值来自公开铁矿石人民币行情页"
      },
      "internationalQuote": {
        "status": "ok",
        "basisKey": "tradingeconomics_iron_ore_62fe_cfr_china_index",
        "basisLabel": "Trading Economics 铁矿石 62% Fe CFR China 指数",
        "basisType": "index",
        "venueLabel": "Trading Economics",
        "specLabel": "铁矿石 62% Fe CFR China 指数口径",
        "price": 104.35,
        "currency": "USD",
        "unit": "美元/干吨",
        "previousPrice": 103.9,
        "changeAmount": 0.45,
        "changePercent": 0.43,
        "tradeDate": "2026-05-20",
        "publishedAt": null,
        "sourceLabel": "Trading Economics 铁矿石行情页",
        "sourceUrl": "https://zh.tradingeconomics.com/commodity/iron-ore",
        "sourceSection": null,
        "basisReferenceLabel": "CME 62% Fe CFR China 产品页",
        "basisReferenceUrl": "https://www.cmegroup.com/markets/metals/ferrous/iron-ore-62-cfr-china.html",
        "note": "展示值来自公开行情页，口径锚点使用 CME 产品定义"
      }
    }
  ]
}
```

## Risks / Trade-offs

- SHMET REST API 与 Trading Economics HTML 页面都可能发生结构或可达性变化，直接影响抓取稳定性
- 第一版六大有色国际侧使用 SHMET 外贸结算价，展示上足够实用，但不能等同于 LME 官方直接价格
- 铁矿石国际侧采用“展示页 + 口径锚点页”的双源模式，工程上更稳，但数据语义需要在页面上明确说明
- 交易所官网虽然更权威，但当前公开访问存在人机识别、动态加载或许可限制，第一版放弃直连是有意识的工程取舍