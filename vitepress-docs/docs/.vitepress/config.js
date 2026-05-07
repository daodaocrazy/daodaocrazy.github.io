import { defineConfig } from 'vitepress'

function sanitizeLegacyStudyMarkdown(source) {
  return source
    .replace(/\{([^{}\n]+)\}/g, '&#123;$1&#125;')
    .replace(/!\[([^\]]*)\]\(((?:[A-Za-z]:)?\\[^)]+)\)/g, (_match, alt, imagePath) => {
      const label = alt || '本地图片'
      return `[${label}：原始本地图片路径已省略]`
    })
    .replace(/<img\b([^>]*)>/gi, (_match, attrs) => {
      const srcMatch = attrs.match(/\bsrc=(['"])(.*?)\1/i)

      if (!srcMatch) {
        return ''
      }

      const altMatch = attrs.match(/\balt=(['"])(.*?)\1/i)
      const alt = altMatch?.[2] || 'img'

      return `![${alt}](${srcMatch[2]})`
    })
    .replace(/\{\{/g, '&#123;&#123;')
    .replace(/\}\}/g, '&#125;&#125;')
    .replace(/<sup>([^<]+)<\/sup>/g, '^$1')
    .replace(/<sub>([^<]+)<\/sub>/g, '_$1')
    .replace(/<big>([^<]+)<\/big>/g, '$1')
    .replace(/<\/?u>/g, '')
    .replace(/<\/?small>/g, '')
    .replace(/<\/?big>/g, '')
    .replace(/<\\?html>/g, '&lt;html&gt;')
    .replace(/<=/g, '&lt;=')
    .replace(/<(?!\/?br\b)([^>\n]+)>/g, '&lt;$1&gt;')
}

export default defineConfig({
  title: "Daodaocrazy's Blog",
  description: '个人 blog portal，承载技术文档、学习记录、项目实验与持续输出',
  appearance: 'dark',
  srcDir: '.',
  ignoreDeadLinks: true,
  vite: {
    plugins: [
      {
        name: 'sanitize-legacy-study-markdown',
        enforce: 'pre',
        transform(source, id) {
          if (!id.endsWith('.md') || !id.includes('/docs/study/')) {
            return null
          }

          return sanitizeLegacyStudyMarkdown(source)
        }
      }
    ]
  },
  head: [
    ['meta', { name: 'theme-color', content: '#3c8772' }],
     ['link', { rel: 'icon', type: 'image/jpeg', href: '/_media/icon.jpeg' }],
  ],

  themeConfig: {
    siteTitle: "Daodaocrazy's Blog",

    nav: [
      { text: '首页', link: '/' },
      { text: '知识归档', link: '/study/' }
    ],

    sidebar: {
      '/study/': [
        {
          text: '📖 知识归档',
          collapsed: false,
          items: [
            { text: '📚 归档索引', link: '/study/' },
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
    },

    outline: {
      level: [1, 2],
      label: '页内目录'
    }
  },

  markdown: {
    html: false,
    lineNumbers: true,
    config(md) {
      const defaultImageRenderer = md.renderer.rules.image || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

      md.renderer.rules.image = (tokens, idx, options, env, self) => {
        tokens[idx].attrSet('referrerpolicy', 'no-referrer')
        tokens[idx].attrSet('loading', 'lazy')
        tokens[idx].attrSet('decoding', 'async')

        return defaultImageRenderer(tokens, idx, options, env, self)
      }
    },
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  }
})
