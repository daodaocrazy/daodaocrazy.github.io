#!/usr/bin/env python3
import os
import re

def fix_file(file_path):
    """修复 Markdown 文件中的本地路径图片引用"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 匹配本地 Windows 路径的图片引用，如 ![img](C:\... 或 ![img](\Users\...)
    # 我们将这些替换为文本描述或者直接移除
    # 模式：![.*]\([A-Za-z]:\\.*\) 或 ![.*]\(\\.*\)
    content = re.sub(r'!\[([^\]]*)\]\([A-Za-z]:\\[^)]+\)', r'[\1 (本地图片)]', content)
    content = re.sub(r'!\[([^\]]*)\]\(\\[^)]+\)', r'[\1 (本地图片)]', content)
    
    # 同时处理反斜杠转义问题，比如 import 语句中的 \Users\... 会导致 JS 错误
    # 我们把单独的 \ 替换为 /
    # 但这里主要是处理上面的情况
    
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
