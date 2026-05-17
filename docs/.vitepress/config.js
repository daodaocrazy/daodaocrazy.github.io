import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const studyArchiveItems = [
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

const configDir = path.dirname(fileURLToPath(import.meta.url))
const docsDir = path.resolve(configDir, '..')
const studyDir = path.resolve(docsDir, 'study')
const studyOrder = new Map(
  studyArchiveItems.map((item, index) => [item.link.replace(/^\/study\//, '').replace(/\/README$/, ''), index])
)

function normalizeSidebarLabel(text) {
  return text.replace(/^\p{Extended_Pictographic}+[\uFE0F\u200D\s]*/u, '').trim()
}

const studyLabel = new Map(studyArchiveItems.map((item) => [item.link, normalizeSidebarLabel(item.text)]))

function toPosixPath(value) {
  return value.split(path.sep).join('/')
}

function toDocLink(relativePath) {
  return `/${toPosixPath(relativePath).replace(/\.md$/, '')}`
}

function resolveReadmeLinkTarget(relativeDir, target) {
  if (!target || target.startsWith('http://') || target.startsWith('https://') || target.startsWith('#')) {
    return undefined
  }

  const normalizedTarget = target.replace(/\.html$/, '').replace(/\.md$/, '')

  if (normalizedTarget.startsWith('/')) {
    return normalizedTarget
  }

  const resolved = path.posix.normalize(path.posix.join(`/${relativeDir}`, normalizedTarget))
  return resolved === '/study/README' ? '/study/' : resolved.replace(/\/README$/, '/README')
}

function readDirectoryOrder(relativeDir, absoluteDir) {
  const readmePath = path.join(absoluteDir, 'README.md')

  if (!fs.existsSync(readmePath)) {
    return new Map()
  }

  const content = fs.readFileSync(readmePath, 'utf8')
  const order = new Map()
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
  let match
  let index = 0

  while ((match = linkPattern.exec(content)) !== null) {
    const [, text, target] = match
    const resolvedLink = resolveReadmeLinkTarget(relativeDir, target)

    if (!resolvedLink || order.has(resolvedLink)) {
      continue
    }

    order.set(resolvedLink, { index, text })
    index += 1
  }

  return order
}

function compareNames(left, right) {
  return left.localeCompare(right, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
}

function compareStudyDirs(left, right, parentRelativeDir) {
  if (parentRelativeDir === 'study') {
    const leftOrder = studyOrder.get(left.name) ?? Number.MAX_SAFE_INTEGER
    const rightOrder = studyOrder.get(right.name) ?? Number.MAX_SAFE_INTEGER

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }
  }

  return compareNames(left.name, right.name)
}

function buildStudyTree(absoluteDir, relativeDir = 'study') {
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true })
  const directoryName = path.basename(absoluteDir)
  const directoryOrder = readDirectoryOrder(relativeDir, absoluteDir)
  const readmeExists = entries.some((entry) => entry.isFile() && entry.name === 'README.md')
  const link = relativeDir === 'study'
    ? '/study/'
    : (readmeExists ? toDocLink(path.posix.join(relativeDir, 'README.md')) : undefined)

  const childDirectories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.endsWith('-章节'))
    .map((entry) => {
      const childRelativeDir = path.posix.join(relativeDir, entry.name)
      const childLink = toDocLink(path.posix.join(childRelativeDir, 'README.md'))

      return {
        entry,
        orderMeta: directoryOrder.get(childLink),
        tree: buildStudyTree(path.join(absoluteDir, entry.name), childRelativeDir)
      }
    })
    .sort((left, right) => {
      if (left.orderMeta && right.orderMeta) {
        return left.orderMeta.index - right.orderMeta.index
      }

      if (left.orderMeta) {
        return -1
      }

      if (right.orderMeta) {
        return 1
      }

      return compareStudyDirs(left.entry, right.entry, relativeDir)
    })
    .map(({ tree, orderMeta }) => ({
      ...tree,
      text: orderMeta?.text ?? tree.text
    }))

  const childDocuments = entries
    .filter((entry) => {
      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        return false
      }

      return !['README.md', '_sidebar.md', '_navbar.md', '_coverpage.md'].includes(entry.name)
    })
    .map((entry) => {
      const childLink = toDocLink(path.posix.join(relativeDir, entry.name))

      return {
        entry,
        link: childLink,
        orderMeta: directoryOrder.get(childLink)
      }
    })
    .sort((left, right) => {
      if (left.orderMeta && right.orderMeta) {
        return left.orderMeta.index - right.orderMeta.index
      }

      if (left.orderMeta) {
        return -1
      }

      if (right.orderMeta) {
        return 1
      }

      return compareNames(left.entry.name, right.entry.name)
    })
    .map((entry) => ({
      type: 'file',
      text: entry.orderMeta?.text ?? entry.entry.name.replace(/\.md$/, ''),
      link: entry.link
    }))

  return {
    type: 'dir',
    slug: directoryName,
    text: relativeDir === 'study' ? '学习目录' : (studyLabel.get(link) ?? directoryName),
    link,
    items: [...childDirectories, ...childDocuments]
  }
}

function buildSidebarItems(node, activeSegments) {
  function buildSidebarDirectoryItem(child, childActiveSegments = []) {
    const isActiveBranch = childActiveSegments[0] === child.slug
    const nestedActiveSegments = isActiveBranch ? childActiveSegments.slice(1) : []

    return {
      text: child.text,
      link: child.link,
      collapsed: !isActiveBranch,
      items: buildSidebarItems(child, nestedActiveSegments)
    }
  }

  if (activeSegments.length === 0) {
    return node.items.flatMap((child) => {
      if (child.type === 'file') {
        return [{ text: child.text, link: child.link }]
      }

      if (child.items.length === 0) {
        return child.link ? [{ text: child.text, link: child.link }] : []
      }

      return [buildSidebarDirectoryItem(child)]
    })
  }

  const [activeSegment, ...remainingSegments] = activeSegments

  return node.items.flatMap((child) => {
    if (child.type === 'file') {
      return [{ text: child.text, link: child.link }]
    }

    if (child.slug !== activeSegment) {
      if (child.items.length === 0) {
        return child.link ? [{ text: child.text, link: child.link }] : []
      }

      return [buildSidebarDirectoryItem(child)]
    }

    return [buildSidebarDirectoryItem(child, [activeSegment, ...remainingSegments])]
  })
}

function collectStudyDirectories(node, currentRelativeDir = 'study') {
  const directories = [currentRelativeDir]

  for (const child of node.items) {
    if (child.type !== 'dir') {
      continue
    }

    directories.push(...collectStudyDirectories(child, path.posix.join(currentRelativeDir, child.slug)))
  }

  return directories
}

function buildStudySidebar() {
  const studyTree = buildStudyTree(studyDir)
  const directories = collectStudyDirectories(studyTree)

  return Object.fromEntries(
    directories.map((relativeDir) => {
      const key = relativeDir === 'study' ? '/study/' : `/${relativeDir}/`
      const activeSegments = relativeDir === 'study' ? [] : relativeDir.split('/').slice(1)

      return [
        key,
        [
          {
            text: studyTree.text,
            link: studyTree.link,
            items: buildSidebarItems(studyTree, activeSegments)
          }
        ]
      ]
    })
  )
}

const studySidebar = buildStudySidebar()

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
  base: process.env.BASE_URL || '/',
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
      { text: '首页', link: '/' }
    ],

    sidebar: studySidebar,

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
