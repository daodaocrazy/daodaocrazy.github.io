import sys, json
data = json.load(sys.stdin)
if 'data' in data and data['data']:
    d = data['data']
    print('keys:', list(d.keys())[:80])
    for k in d:
        v = d[k]
        if isinstance(v, list):
            print(f'  {k}: list of {len(v)}')
            if v and isinstance(v[0], dict):
                print(f'    first keys: {list(v[0].keys())[:30]}')
                # print first item
                first = v[0]
                for fk in list(first.keys())[:20]:
                    fv = first[fk]
                    if isinstance(fv, str):
                        print(f'      {fk}: {fv[:80]}')
                    elif isinstance(fv, (int, float, bool)):
                        print(f'      {fk}: {fv}')
                    elif isinstance(fv, dict):
                        print(f'      {fk}: dict({list(fv.keys())[:10]})')
        elif isinstance(v, dict):
            print(f'  {k}: dict keys: {list(v.keys())[:30]}')
        elif isinstance(v, str):
            print(f'  {k}: {v[:100]}')
        else:
            print(f'  {k}: {v}')
else:
    print(json.dumps(data, ensure_ascii=False, indent=2)[:3000])
