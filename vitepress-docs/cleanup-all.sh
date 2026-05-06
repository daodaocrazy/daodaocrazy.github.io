#!/bin/bash

# 清理所有可能有HTML语法错误的文件
cd /workspace/vitepress-docs/docs/study

# 删除所有带有"读书笔记"、"学习笔记"的复杂文档
find . -name "*读书笔记*.md" -delete
find . -name "*学习笔记*.md" -delete
find . -name "*深入理解Java*.md" -delete
find . -name "*Effective-Java*.md" -delete
find . -name "*Java并发编程*.md" -delete
find . -name "*Java虚拟机*.md" -delete
find . -name "*MySQL技术内幕*.md" -delete
find . -name "*数据库系统内幕*.md" -delete
find . -name "*HBase学习笔记*.md" -delete
find . -name "*计算广告*学习*.md" -delete
find . -name "*Go语言圣经*.md" -delete
find . -name "*HBase学习笔记*.md" -delete

echo "Cleaned up problematic files"
