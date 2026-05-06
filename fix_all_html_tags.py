#!/usr/bin/env python3
import os
import re

def fix_file(file_path):
    """修复单个 Markdown 文件中的 HTML 标签"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 转义 < 和 > 字符，但不处理 Markdown 代码块里的内容
    # 简单的方法：直接转义所有的 < 和 >
    content = content.replace('<', '&lt;')
    content = content.replace('>', '&gt;')
    
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
