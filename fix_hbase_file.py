#!/usr/bin/env python3

file_path = "/workspace/vitepress-docs/docs/study/BigData/HBase/HBase学习笔记.md"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 转义 HTML 标签
content = content.replace('<html>', '&lt;html&gt;')
content = content.replace('</html>', '&lt;/html&gt;')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("HBase file fixed!")
