import urllib.request
import urllib.error

BASE = 'https://agvtmkjkzcubqpfamday.supabase.co/rest/v1'
HEADERS = {
    'apikey': 'sb_publishable_ROMRZ0NNpRrWPixisk6qFg_jZ7BZQ0A',
    'Authorization': 'Bearer sb_publishable_ROMRrWPixisk6qFg_jZ7BZQ0A',
    'Accept': 'application/json',
}

tables = ['communities', 'community_members']

for t in tables:
    try:
        req = urllib.request.Request(f'{BASE}/{t}?select=*&limit=1', headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as r:
            print('OK', t, r.status, r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print('HTTPERROR', t, e.code, body)
    except Exception as e:
        print('ERROR', t, e)
