#!/usr/bin/env python3
import os
import re

def fix_file(file_path):
    """修复 Markdown 文件中的 Vue 插值表达式问题"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 转义 {{ 为 { { 或者用 v-pre 更合适，但我们用更简单的方法：
    # 直接转义所有的 { 为 &#123; 或者用 HTML 注释包裹
    # 这里我们采用最简单的方法：把 {{ 替换为 { {
    content = content.replace('{{', '&#123;&#123;')
    content = content.replace('}}', '&#125;&#125;')
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {file_path}")
        return True
    return False

def process_directory(directory):
    """递归处理目录中的所有 Markdown 文件"""
    updated_count = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                if fix_file(file_path):
                    updated_count += 1
    return updated_count

if __name__ == "__main__":
    target_dir = "vitepress-docs/docs"
    print(f"Processing Markdown files in {target_dir}...")
    updated = process_directory(target_dir)
    print(f"Total files updated: {updated}")
