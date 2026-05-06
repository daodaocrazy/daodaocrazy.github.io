#!/usr/bin/env python3
import os
import re

def fix_file(file_path):
    """转义 Markdown 文件中可能被误认为 JS 对象或 Vue 模板的单 {}"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 转义单独的 { 和 }
    # 我们需要避免转义已经转义的或者在代码块/代码行里的
    # 这里先处理非代码块里的内容，但简单的方法是把 { 替换为 &#123;，} 替换为 &#125;
    # 或者只替换不在 {{ 和 }} 里的？
    # 或者我们可以先把 { 替换为 &#123;，} 替换为 &#125;
    content = re.sub(r'(?<!\{)\{(?![\{])', '&#123;', content)
    content = re.sub(r'(?<!\})\}(?![\}])', '&#125;', content)
    
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
