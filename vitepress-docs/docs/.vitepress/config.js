import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Daodaocrazy 的学习笔记',
  description: '个人技术学习笔记整理，涵盖 Java、大数据、算法、前端等多个领域',
  srcDir: '.',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' }],
    ['meta', { name: 'theme-color', content: '#3c8772' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'Daodaocrazy 的学习笔记' }],
    ['meta', { name: 'og:description', content: '个人技术学习笔记整理' }],
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
          text: '📖 学习笔记',
          collapsed: false,
          items: [
            { text: '目录索引', link: '/study/' },
            { text: 'Java', link: '/study/java' },
            { text: 'Python', link: '/study/python' },
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
