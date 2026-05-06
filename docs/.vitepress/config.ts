import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Daodaocrazy的个人MD笔记',
  description: 'Daodaocrazy的个人学习笔记集合',
  
  markdown: {
    lineNumbers: true,
  },

  vite: {
    plugins: [
      {
        name: 'disable-vue-for-md',
        enforce: 'pre',
        configResolved(config) {
          // Find the Vue plugin and modify it to exclude .md files
          const vuePluginIndex = config.plugins.findIndex(
            p => p && typeof p === 'object' && 'name' in p && p.name === 'vite:vue'
          );
          
          if (vuePluginIndex !== -1) {
            const vuePlugin = config.plugins[vuePluginIndex] as any;
            
            // Override the plugin's transform method to skip .md files
            const originalTransform = vuePlugin.transform;
            vuePlugin.transform = function(code: string, id: string, options?: any) {
              if (id.endsWith('.md')) {
                return null;
              }
              return originalTransform.call(this, code, id, options);
            };
          }
        }
      }
    ]
  },

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: 'GitHub', link: 'https://github.com/daodaocrazy/daodaocrazy.github.io' }
    ],
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/daodaocrazy/daodaocrazy.github.io' }
    ],
    
    search: {
      provider: 'local'
    },
    
    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2024 Daodaocrazy'
    }
  }
})
