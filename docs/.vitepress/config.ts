import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Daodaocrazy的个人MD笔记',
  description: 'Daodaocrazy的个人学习笔记集合',

  ignoreDeadLinks: true,

  markdown: {
    lineNumbers: true,
    html: false, // 禁用 HTML 标签解析！这是关键！
    vue: false, // 完全禁用 Vue 插值和组件解析
  },

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: 'GitHub', link: 'https://github.com/daodaocrazy/daodaocrazy.github.io' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/daodaocrazy/daodaocrazy.github.io' }
    ],
    search: { provider: 'local' },
    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2024 Daodaocrazy'
    }
  }
})
