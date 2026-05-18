import fs from 'node:fs'
import path from 'node:path'

const [siteRootArg, publicOriginArg = 'https://daodaocrazy.github.io'] = process.argv.slice(2)

if (!siteRootArg) {
  throw new Error('Site root path is required')
}

const siteRoot = path.resolve(siteRootArg)
const previewRoot = path.join(siteRoot, 'preview')

fs.mkdirSync(previewRoot, { recursive: true })

const previewItems = fs.readdirSync(previewRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const previewDir = path.join(previewRoot, entry.name)
    const metadataPath = path.join(previewDir, '_preview.json')
    const metadata = fs.existsSync(metadataPath)
      ? JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
      : {
          branch: entry.name,
          slug: entry.name,
          deployedAt: null,
          url: `${publicOriginArg.replace(/\/$/, '')}/preview/${entry.name}/`
        }

    return metadata
  })
  .sort((left, right) => {
    const leftTime = left.deployedAt ? Date.parse(left.deployedAt) : 0
    const rightTime = right.deployedAt ? Date.parse(right.deployedAt) : 0
    return rightTime - leftTime
  })

const html = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview Environments</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: "SF Mono", "JetBrains Mono", monospace;
        background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
        color: #e5eef7;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 32px;
      }

      main {
        width: min(960px, 100%);
        background: rgba(15, 23, 42, 0.82);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.35);
      }

      h1 {
        margin-top: 0;
        font-size: clamp(28px, 4vw, 40px);
      }

      p {
        color: #cbd5e1;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 24px 0 0;
        display: grid;
        gap: 12px;
      }

      li {
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 16px;
        padding: 16px 18px;
        background: rgba(30, 41, 59, 0.72);
      }

      a {
        color: #7dd3fc;
        text-decoration: none;
      }

      small {
        display: block;
        margin-top: 6px;
        color: #94a3b8;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Preview Environments</h1>
      <p>当前 GitHub Pages 上保留的 feature 分支预览环境列表。</p>
      <ul>
        ${previewItems.length > 0
          ? previewItems.map((item) => `<li><a href="${item.url}">${item.branch}</a><small>${item.deployedAt ? `deployed at ${item.deployedAt}` : 'deployment time unavailable'}</small></li>`).join('')
          : '<li>暂无可用预览环境。</li>'}
      </ul>
    </main>
  </body>
</html>
`

fs.writeFileSync(path.join(previewRoot, 'index.html'), html)
fs.writeFileSync(path.join(previewRoot, 'manifest.json'), `${JSON.stringify(previewItems, null, 2)}\n`)
