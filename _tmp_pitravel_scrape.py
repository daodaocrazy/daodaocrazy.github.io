import sys, re
content = sys.stdin.read()
patterns = [
    r'journey[^\"\x27\\s]{0,100}',
    r'/api/[^\"\x27\\s)]{0,80}',
    r'ci\.pitravel[^\"\x27\\s]{0,80}',
    r'detail[^\"\x27\\s]{0,80}',
]
for p in patterns:
    matches = re.findall(p, content)
    print(f"=== {p[:30]} ===")
    for m in set(matches[:15]):
        print("  ", m[:100])
    print()
