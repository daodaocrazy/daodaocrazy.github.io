import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Daodaocrazy 的学习笔记',
  description: '个人技术学习笔记整理，涵盖 Java、大数据、算法、前端等多个领域',
  srcDir: '.',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' }],
    ['meta', { name: 'theme-color', content: '#3c8772' }],
  ],

  themeConfig: {
    logo: '/icon.svg',
    siteTitle: '📚 学习笔记',

    nav: [
      { text: '🏠 首页', link: '/' },
      { text: '📖 学习笔记', link: '/study/' },
      { text: '💻 技术栈', link: '/tech/' },
      {
        text: '🔗 链接',
        items: [
          { text: 'GitHub', link: 'https://github.com/daodaocrazy' },
        ]
      }
    ],

    sidebar: {
      '/study/': [
        {
          text: '📖 学习目录',
          collapsed: false,
          items: [
            { text: '📚 目录索引', link: '/study/' },
            { text: '☕ Java', link: '/study/Java/README' },
            { text: '🐘 BigData', link: '/study/BigData/README' },
            { text: '🗄️ DataBase', link: '/study/DataBase/README' },
            { text: '🐍 Python', link: '/study/Python/README' },
            { text: '🧠 LeetCode', link: '/study/LeetCode_Study/README' },
            { text: '⚛️ React', link: '/study/React/README' },
            { text: '💚 Vue', link: '/study/Vue/README' },
            { text: '🦀 Rust', link: '/study/Rust/README' },
            { text: '🐹 GoLang', link: '/study/GoLang/README' },
            { text: '🍀 Scala', link: '/study/Scala/README' },
            { text: '🌱 Spring', link: '/study/Spring/README' },
            { text: '🚀 SpringBoot', link: '/study/SpringBoot/README' },
            { text: '☁️ SpringCloud', link: '/study/SpringCloud/README' },
            { text: '🔌 Netty', link: '/study/Netty/README' },
            { text: '🧩 MQ', link: '/study/MQ/README' },
            { text: '🐳 Docker', link: '/study/Docker/README' },
            { text: '☸️ Kubernetes', link: '/study/kubernetes/README' },
            { text: '🔍 Elastic Stack', link: '/study/Elastic-Stack/README' },
            { text: '🔄 CICD', link: '/study/CICD/README' },
            { text: '💻 Linux', link: '/study/Linux/README' },
            { text: '🌐 计算机网络', link: '/study/计算机网络/README' },
            { text: '🔒 网络安全', link: '/study/网络安全/README' },
            { text: '🎨 设计模式', link: '/study/设计模式/README' },
            { text: '🎯 推荐系统', link: '/study/推荐系统/README' },
            { text: '📢 计算广告', link: '/study/计算广告/README' },
            { text: '📐 分布式策略', link: '/study/分布式策略/README' },
            { text: '⚖️ 负载均衡', link: '/study/负载均衡-代理/README' },
            { text: '📁 文件管理', link: '/study/文件管理/README' },
            { text: '🎭 编程范式', link: '/study/编程范式(ProgrammingParadigm)/README' },
            { text: '💾 操作系统', link: '/study/操作系统和硬件/README' },
            { text: '📱 Android', link: '/study/Android/README' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/daodaocrazy' }
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true
      }
    },

    editLink: {
      pattern: 'https://github.com/daodaocrazy/daodaocrazy.github.io/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2024 Daodaocrazy. All rights reserved.'
    },

    docFooter: {
      prev: '← 上一页',
      next: '下一页 →'
    }
  },

  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  }
})
