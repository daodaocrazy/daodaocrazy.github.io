## 1. GitHub Pages 多环境部署

- [x] 1.1 使用 actions/configure-pages、actions/upload-pages-artifact 和 actions/deploy-pages 替换非官方发布链路
- [x] 1.2 让 main、lab、feature/* 分支分别映射到 /、/lab/、/preview/<slug>/
- [x] 1.3 将 deploy 严格绑定到 build 成功之后，避免构建失败污染线上站点
- [x] 1.4 通过恢复线上快照并只覆盖目标子路径的方式装配完整 Pages artifact
- [x] 1.5 在 feature 分支删除时移除对应 preview 子路径并重建预览索引

## 2. VitePress 环境感知与本地预览

- [x] 2.1 让 VitePress 构建消费 base path 与内容分支环境变量
- [x] 2.2 修正 editLink 到 vitepress-docs/docs/:path，并随部署 ref 变化
- [x] 2.3 增加 main、lab、preview 三类构建命令
- [x] 2.4 增加单端口本地多环境预览、状态查询与停止命令