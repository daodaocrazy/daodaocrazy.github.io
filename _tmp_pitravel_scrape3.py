import sys, re
content = sys.stdin.read()
# 找 apiHost 的定义
host_matches = re.findall(r'(apiHost|api\s*:)[^;{}]{0,200}', content)
for m in set(host_matches[:15]):
    print(m[:250])
    print("---")

# 找 WEB_JOURNEY_FOR_WEB 等常量定义
const_matches = re.findall(r'WEB[^"\x27,){]{0,150}', content)
for m in set(const_matches[:20]):
    print(m[:200])
    print("===")

# 更完整的 API 路径定义
api_paths = re.findall(r'["\x27]/api/slytherin/v1/[^"\x27]+["\x27]', content)
for p in set(api_paths):
    print(p)
