import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    {
      name: 'configure-vue-plugin',
      enforce: 'pre',
      configResolved(config) {
        const vuePlugin = config.plugins.find(p => p.name === 'vite:vue') as any
        if (vuePlugin && vuePlugin.config) {
          // 直接修改 Vue 插件的配置，排除所有 .md 文件
          const originalConfig = vuePlugin.config
          vuePlugin.config = (config, env) => {
            const result = originalConfig.call(vuePlugin, config, env)
            if (result && result.vue) {
              // 确保 md 文件不会被处理
              result.vue.include = result.vue.include || []
              if (!Array.isArray(result.vue.include)) {
                result.vue.include = [result.vue.include]
              }
              // 添加 exclude
              result.vue.exclude = result.vue.exclude || []
              if (!Array.isArray(result.vue.exclude)) {
                result.vue.exclude = [result.vue.exclude]
              }
              // 排除所有 md 文件
              result.vue.exclude.push(/\.md$/)
            }
            return result
          }
        }
      }
    }
  ]
})
