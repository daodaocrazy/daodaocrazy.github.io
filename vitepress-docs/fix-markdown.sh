#!/bin/bash

# 批量修复 Markdown 文件中的 HTML 语法问题
# 主要问题是反引号(`)被错误解析为 HTML 标签

find docs/study -name "*.md" -type f | while read file; do
  # 修复被错误解析的 HTML 标签
  # 例如: `xxx` 在某些情况下会被误解析
  sed -i 's/<\/code><code>//g' "$file"
  sed -i 's/<code><\/code>//g' "$file"
  sed -i 's/<\/strong><strong>//g' "$file"
  sed -i 's/<strong><\/strong>//g' "$file"

  # 移除空标签
  sed -i 's/<code><\/code>//g' "$file"
  sed -i 's/<span><\/span>//g' "$file"
  sed -i 's/<p><\/p>//g' "$file"
  sed -i 's/<div><\/div>//g' "$file"

  # 清理 HTML 实体
  sed -i 's/&amp;/\&/g' "$file"
  sed -i 's/&lt;/</g' "$file"
  sed -i 's/&gt;/>/g' "$file"

  echo "Processed: $file"
done

echo "Done!"
