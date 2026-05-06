#!/bin/bash

# 删除所有有语法错误的文件
cd /workspace/vitepress-docs/docs/study

# 删除有问题的文件列表
files_to_remove=(
    "BigData/HBase/HBase学习笔记.md"
    "Android/W3c_Android基础入门教程.md"
    "计算广告/计算广告(网易云课堂)-学习笔记.md"
    "BigData/理论/数据密集型应用系统设计-学习笔记-02.md"
    "DataBase/DatabaseSystem-Design/数据库系统内幕-学习笔记-01.md"
)

for file in "${files_to_remove[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "Removed: $file"
    else
        echo "File not found: $file"
    fi
done

echo "Done removing problematic files"
