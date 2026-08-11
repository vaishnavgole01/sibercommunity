import urllib.request
import json

ANON_KEY = 'sb_publishable_ROMRZ0NNpRrWPixisk6qFg_jZ7BZQ0A'
HEADERS = {
    'apikey': ANON_KEY,
    'Authorization': f'Bearer {ANON_KEY}',
    'Accept': 'application/json',
}

cols = [
    'id',
    'full_name',
    'username',
    'avatar_url',
    'onboarding_completed',
    'gender',
    'dob',
    'role',
    'projects_completed',
    'certifications',
    'leetcode_username',
    'hackerrank_username',
    'email',
    'created_at',
    'updated_at',
]

for col in cols:
    url = f'https://agvtmkjkzcubqpfamday.supabase.co/rest/v1/profiles?select={col}&limit=1'
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read().decode()
            print(f'OK {col} {r.status} {data}')
    except urllib.error.HTTPError as e:
        msg = e.read().decode()
        print(f'HTTP {col} {e.code} {msg}')
    except Exception as exc:
        print(f'ERR {col} {exc}')
