# Vue随记

> 最近做毕设，后端Springboot+Flink已经将SlopeOne推荐算法整合完毕了，需要先做一下前端，决定用比较熟的Vue。=> 之后毕设要是结束，有时间整理的话，会把项目开源到github上。
>
> 这里再开个随记markdown笔记文件。

## 1.Vue模版

> 同学做作业的时候，偶然发现了一个Vue模版，我觉得挺不错的，分享一下。

1. [VSCode一键生成.vue模版](https://zhuanlan.zhihu.com/p/136906175)

   ```vue
   &lt;template>
   &lt;div>
     &lt;PageHeaderLayout>
   
     &lt;/PageHeaderLayout>
     &lt;/div>
   &lt;/template>
   
   &lt;script>
     // 这里可以导入其他文件（比如：组件，工具js，第三方插件js，json文件，图片文件等等）
     import PageHeaderLayout from '@/layouts/PageHeaderLayout'
     import ApeDrawer from '@/components/ApeDrawer'
     import ModalDialog from '@/components/ModalDialog'
     import ApeUploader from '@/components/ApeUploader'
     import ApeEditor from '@/components/ApeEditor' 
     import &#123; mapGetters &#125; from 'vuex'
   
     export default &#123;
       components: &#123;
         PageHeaderLayout,
         ApeDrawer,
         ModalDialog,
         ApeUploader,
         ApeEditor
       &#125;,
       // 定义属性
       data() &#123;
         return &#123;
   
         &#125;
       &#125;,
       // 计算属性，会监听依赖属性值随之变化
       computed: &#123;
         ...mapGetters(['userPermissions','buttonType'])
       &#125;,
       // 监控data中的数据变化
       watch: &#123;&#125;,
       // 方法集合
       methods: &#123;
   
       &#125;,
       // 生命周期 - 创建完成（可以访问当前this实例）
       created() &#123;
   
       &#125;,
       // 生命周期 - 挂载完成（可以访问DOM元素）
       mounted() &#123;
   
       &#125;,
       beforeCreate() &#123;&#125;, // 生命周期 - 创建之前
       beforeMount() &#123;&#125;, // 生命周期 - 挂载之前
       beforeUpdate() &#123;&#125;, // 生命周期 - 更新之前
       updated() &#123;&#125;, // 生命周期 - 更新之后
       beforeDestroy() &#123;&#125;, // 生命周期 - 销毁之前
       destroyed() &#123;&#125;, // 生命周期 - 销毁完成
       activated() &#123;&#125;, // 如果页面有keep-alive缓存功能，这个函数会触发
     &#125;
   &lt;/script>
   
   &lt;style lang='stylus' scoped>
   
   &lt;/style>
   ```

   

