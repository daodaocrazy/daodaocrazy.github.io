#!/usr/bin/env python3
import os
import re

def fix_markdown_file(file_path):
    """修复单个Markdown文件中的图片路径和链接路径"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 1. 修复图片路径
    # Docsify使用的是相对路径，可能指向 _media/ 目录
    # 例如: ![image](_media/image.png) 或 ![image](./_media/image.png)
    # 需要改为 VitePress 的 public 目录路径: ![image](/image.png)
    content = re.sub(r'!\[([^\]]*)\]\((\.?/?)_media/([^\)]+)\)', r'![\1](/\3)', content)
    
    # 2. 修复链接路径
    # Docsify 中链接通常是 #/path/to/file.md 或相对路径
    # 需要转换为 VitePress 的路由格式
    
    # a) 修复绝对路径链接 #/study/xxx.md -> /study/xxx
    content = re.sub(r'#/([^\)]+)\.md', r'/\1', content)
    # b) 修复不带 .md 的绝对路径链接 #/study/xxx -> /study/xxx
    content = re.sub(r'#/([^\)]+)(?!\.)', r'/\1', content)
    # c) 修复相对路径 ./xxx.md -> ./xxx
    content = re.sub(r'(\[.*?\])\((\.?/[^\)]+)\.md\)', r'\1(\2)', content)
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {file_path}")
        return True
    return False

def process_directory(directory):
    """递归处理目录中的所有Markdown文件"""
    updated_count = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                if fix_markdown_file(file_path):
                    updated_count += 1
    return updated_count

if __name__ == "__main__":
    target_dir = "vitepress-docs/docs"
    print(f"Processing Markdown files in {target_dir}...")
    updated = process_directory(target_dir)
    print(f"Total files updated: {updated}")
