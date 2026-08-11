import urllib.request
import json

ANON_KEY = 'sb_publishable_ROMRZ0NNpRrWPixisk6qFg_jZ7BZQ0A'
HEADERS = {
    'apikey': ANON_KEY,
    'Authorization': f'Bearer {ANON_KEY}',
    'Accept': 'application/json',
}

fields = [
    'id,full_name,username,avatar_url,onboarding_completed',
    'id,gender,dob,role,projects_completed,certifications,leetcode_username,hackerrank_username',
    'id,user_id,interest',
    'id,user_id,skill',
]

for cols in fields:
    url = f'https://agvtmkjkzcubqpfamday.supabase.co/rest/v1/profiles?select={cols}&limit=1'
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read().decode()
            print('OK', cols, r.status, data)
    except urllib.error.HTTPError as e:
        print('HTTP', cols, e.code, e.read().decode())
    except Exception as exc:
        print('ERR', cols, exc)
