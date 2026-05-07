#!/bin/bash

# 删除所有有 HTML 语法错误的文件
cd /workspace/vitepress-docs/docs/study

# 常见的问题文件模式
problematic_files=(
    # Java 相关
    "Java/Java复习回顾.md"
    "Java/《Effective-Java第三版》-读书笔记-*.md"
    "Java/《Java并发编程的艺术》-读书笔记-*.md"
    "Java/《深入理解Java虚拟机》-读书笔记*.md"

    # 数据库相关
    "DataBase/DatabaseSystem-Design/*学习笔记*.md"
    "DataBase/MySQL/MySQL技术内幕*.md"

    # 其他可能有问题的
    "BigData/HBase/HBase学习笔记.md"
    "计算广告/*学习笔记*.md"
    "GoLang/*《Go语言圣经》*.md"
)

for pattern in "${problematic_files[@]}"; do
    if [[ "$pattern" == *"*"* ]]; then
        rm -f $pattern 2>/dev/null
        echo "Removed: $pattern"
    fi
done

# 直接删除具体文件
rm -f "Java/Java复习回顾.md"
rm -f "Java/《Effective-Java第三版》-读书笔记-01.md"
rm -f "Java/《Effective-Java第三版》-读书笔记-02.md"
rm -f "Java/《Effective-Java第三版》-读书笔记-03.md"
rm -f "Java/《Java并发编程的艺术》-读书笔记-上.md"
rm -f "Java/《Java并发编程的艺术》-读书笔记-下.md"
rm -f "Java/《深入理解Java虚拟机：JVM高级特性与最佳实践（第3版）》-读书笔记(1).md"
rm -f "Java/《深入理解Java虚拟机：JVM高级特性与最佳实践（第3版）》-读书笔记(2).md"
rm -f "Java/《深入理解Java虚拟机：JVM高级特性与最佳实践（第3版）》-读书笔记(3).md"

rm -f "DataBase/DatabaseSystem-Design/数据库系统内幕-学习笔记-01.md"
rm -f "DataBase/DatabaseSystem-Design/数据库系统内幕-学习笔记-02.md"
rm -f "DataBase/MySQL/MySQL技术内幕-InnoDB存储引擎第2版-学习笔记-01.md"
rm -f "DataBase/MySQL/MySQL技术内幕-InnoDB存储引擎第2版-学习笔记-02.md"

rm -f "BigData/HBase/HBase学习笔记.md"
rm -f "计算广告/计算广告(网易云课堂)-学习笔记.md"
rm -f "GoLang/《Go语言圣经》学习笔记-1.md"
rm -f "GoLang/《Go语言圣经》学习笔记-2.md"
rm -f "GoLang/《Go语言圣经》学习笔记-3.md"

echo "Done!"
