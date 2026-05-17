# Daodaocrazy GitHub Pages 现代化部署架构

## 一、当前状态分析

### 1.1 仓库结构问题
- **不规范的布局**：VitePress 项目在子目录中，根目录缺少统一管理
- **遗留文件**：`docs-legacy/`、`study-old/`、`shadowrocket/` 等冗余内容
- **缺乏扩展性**：没有为未来的工具、实验预留位置

### 1.2 现有 CI/CD 优缺点
**优点**：
- 使用官方推荐的 `upload-pages-artifact` 和 `deploy-pages`
- 已实现 `needs: build` 保护机制
- 有基本的缓存和并发控制

**缺点**：
- 仅支持 main 分支部署
- 缺少多环境支持
- 没有 preview 环境
- 扩展性不足

---

## 二、推荐的新目录结构

```
/workspace/
├── .github/
│   └── workflows/
│       ├── deploy-vitepress.yml    # 主部署 (main + lab)
│       └── preview-deploy.yml       # Preview 部署
├── docs/                           # VitePress 文档根目录
│   ├── .vitepress/
│   │   ├── config.js
│   │   ├── theme/
│   │   └── dist/
│   ├── public/
│   ├── study/                     # 学习笔记
│   ├── tech/                      # 技术博客
│   └── index.md
├── tools/                         # 工具集目录 (未来扩展)
│   └── README.md
├── playground/                    # 试验场 (React 组件/AI 演示)
│   └── README.md
├── lab/                           # Lab 环境内容
│   └── README.md
├── experiments/                   # 实验项目
│   └── README.md
├── package.json
├── package-lock.json
└── .gitignore
```

---

## 三、分支策略

| 分支 | URL | 用途 |
|------|-----|------|
| `main` | https://daodaocrazy.github.io/ | 生产环境，稳定版 |
| `lab` | https://daodaocrazy.github.io/lab/ | 实验环境，测试新功能 |
| `feature/*` | https://daodaocrazy.github.io/preview/[name]/ | 预览环境，特性分支 |

---

## 四、GitHub Actions 架构

### 4.1 主要特性

1. **严格的 Build-First 机制**：
   - Deploy 必须依赖 Build 成功
   - Build 失败绝对不会触发 Deploy

2. **多环境支持**：
   - `main`: 根路径 `/`
   - `lab`: 子路径 `/lab`
   - Preview: `/preview/[branch]`

3. **并发控制**：
   - 每个分支独立的并发组
   - `cancel-in-progress: true` 避免浪费资源

### 4.2 Workflow 文件

#### `deploy-vitepress.yml` (主部署)
- **触发条件**：push 到 `main` 或 `lab`
- **权限**：pages: write, id-token: write
- **关键步骤**：
  1. 检测环境
  2. 依赖安装 + 缓存
  3. 使用 BASE_URL 构建
  4. Upload artifact
  5. Deploy (仅 build 成功后)

#### `preview-deploy.yml` (预览)
- **触发条件**：PR 或非 main/lab 分支 push
- **产物**：上传到 Actions Artifacts (保留 7 天)

---

## 五、VitePress 多环境配置

### 5.1 BASE_URL 环境变量
```javascript
// docs/.vitepress/config.js
export default defineConfig({
  base: process.env.BASE_URL || '/',
  // ...
})
```

### 5.2 构建命令
```bash
# 生产环境
npm run docs:build

# Lab 环境
BASE_URL=/lab npm run docs:build

# Preview 环境
BASE_URL=/preview/feature-x npm run docs:build
```

---

## 六、Pages 部署最佳实践

### 6.1 官方推荐方案
✅ 使用 **`actions/upload-pages-artifact@v3`**  
✅ 使用 **`actions/deploy-pages@v4`**  
✅ 配置 **GITHUB_TOKEN** 权限正确  
❌ 不要使用 `gh-pages` npm 包  
❌ 不要 force push 到 `gh-pages` 分支  

### 6.2 Build Fail 保护机制
```yaml
deploy:
  needs: build  # 这一行保证了 build 失败不会 deploy
  runs-on: ubuntu-latest
  steps:
    - uses: actions/deploy-pages@v4
```

---

## 七、未来扩展计划

### 7.1 技术栈演进路线
| 阶段 | 内容 |
|------|------|
| 1 | 稳定 VitePress 文档系统 |
| 2 | 添加 React + shadcn/ui + Tailwind 组件 |
| 3 | 集成 Prompt Playground (本地存储) |
| 4 | MCP Explorer + Workflow 可视化 |
| 5 | 本地浏览器 AI 能力 (WebLLM 等) |
| 6 | PWA 支持 |

### 7.2 与 Cloudflare/Vercel 的兼容性
通过以下设计保持兼容：
- 使用标准的 `BASE_URL` 环境变量
- 输出目录保持 `docs/.vitepress/dist`
- 构建命令标准化

---

## 八、如何渐进式演进

1. **保持现有功能**：当前 VitePress 保持不变
2. **逐步添加新目录**：tools/、playground/ 等
3. **集成新组件**：在 VitePress 中使用 Vue 组件逐渐引入 React
4. **独立部署**：复杂功能可以考虑部署到单独的子域名或 Pages

---

## 九、快速开始

```bash
# 本地开发
npm install
npm run docs:dev

# 本地构建
npm run docs:build
npm run docs:preview

# Lab 环境本地构建
npm run docs:build:lab
```

---

## 十、总结

本架构设计：
✅ 允许 main 分支直接 push  
✅ Build 失败绝对不会部署  
✅ 支持多环境 (main/lab/preview)  
✅ 使用官方 Pages 部署方案  
✅ 便于扩展和未来演进  
✅ 不强制 PR 流程  
