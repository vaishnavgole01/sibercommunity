import urllib.request
import json

ANON_KEY = 'sb_publishable_ROMRZ0NNpRrWPixisk6qFg_jZ7BZQ0A'
BASE_URL = 'https://agvtmkjkzcubqpfamday.supabase.co/rest/v1'
HEADERS = {
    'apikey': ANON_KEY,
    'Authorization': f'Bearer {ANON_KEY}',
    'Accept': 'application/json',
}

candidates = [
    'profiles',
    'user_interests',
    'user_skills',
    'posts',
    'communities',
    'likes',
    'comments',
    'bookmarks',
    'follows',
    'followers',
    'notifications',
    'user_profiles',
    'user_communities',
    'community_members',
    'profiles_view',
    'posts_view',
]

for table in candidates:
    url = f'{BASE_URL}/{table}?select=*&limit=1'
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read().decode()
            print(f'TABLE {table}: OK {r.status}')
            print(data)
    except urllib.error.HTTPError as e:
        print(f'TABLE {table}: HTTP {e.code} {e.reason}')
    except Exception as exc:
        print(f'TABLE {table}: ERROR {exc}')
