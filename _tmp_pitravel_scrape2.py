import sys, re
content = sys.stdin.read()
# 找具体的 URL 组装逻辑和 host
keywords = [r'api/data', r'ci\.pitravel', r'post.*journey', r'get.*journey', 
            r'ticket', r'context_', r'/journey/', r'req\.url', r'url:']
for kw in keywords:
    matches = re.findall(kw + r'.{0,150}', content, re.IGNORECASE)
    print(f"\n=== {kw} ===")
    for m in set(matches[:10]):
        print(" ", m[:200])

# 尝试提取 ticket 相关的逻辑
print("\n\n=== TICKET / AUTH ===")
ticket_matches = re.findall(r'[^;{}]{0,50}ticket[^;{}]{0,150}', content, re.IGNORECASE)
for m in set(ticket_matches[:15]):
    print(" ", m[:200])
