import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Daodaocrazy 大数据学习笔记',
  description: 'Big Data Learning Notes - Hadoop, Spark, Flink, HBase, Hive, ClickHouse 等',
  srcDir: '.',
  ignoreDeadLinks: true,
  head: [
    ['meta', { name: 'theme-color', content: '#3c8772' }],
  ],

  themeConfig: {
    logo: { src: '/icon.svg', alt: 'Logo' },
    siteTitle: '📊 大数据学习笔记',

    nav: [
      { text: '🏠 首页', link: '/' },
      { text: '📚 学习笔记', link: '/bigdata/' },
      {
        text: '🔗 链接',
        items: [
          { text: 'GitHub', link: 'https://github.com/daodaocrazy' },
        ]
      }
    ],

    sidebar: {
      '/bigdata/': [
        {
          text: '大数据生态',
          collapsed: false,
          items: [
            { text: '目录索引', link: '/bigdata/' },
            { text: 'Hadoop', link: '/bigdata/Hadoop/README' },
            { text: 'Spark', link: '/bigdata/Spark/README' },
            { text: 'Flink', link: '/bigdata/Flink/README' },
            { text: 'HBase', link: '/bigdata/HBase/README' },
            { text: 'Hive', link: '/bigdata/Hive/README' },
            { text: 'ClickHouse', link: '/bigdata/ClickHouse/README' },
            { text: '大数据理论', link: '/bigdata/理论/README' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/daodaocrazy' }
    ],

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/daodaocrazy/daodaocrazy.github.io/edit/main/docs/:path',
      text: '编辑此页'
    },

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2024 Daodaocrazy. All rights reserved.'
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
