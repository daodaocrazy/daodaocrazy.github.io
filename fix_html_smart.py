#!/usr/bin/env python3
import os
import re

def fix_file(file_path):
    """智能修复 Markdown 文件中的孤立 HTML 标签"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 修复常见的孤立标签
    # 修复 <html> 标签
    content = re.sub(r'<html([^>]*)>', r'&lt;html\1&gt;', content)
    content = re.sub(r'</html>', r'&lt;/html&gt;', content)
    
    # 修复其他可能的问题标签
    #content = re.sub(r'<(\w+)([^>]*)>', r'&lt;\1\2&gt;', content)
    
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
