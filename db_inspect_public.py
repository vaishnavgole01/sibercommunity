import urllib.request
import json
import sys

def fetch_json(url, headers):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)

headers = {
    'apikey': 'sb_publishable_ROMRZ0NNpRrWPixisk6qFg_jZ7BZQ0A',
    'Authorization': 'Bearer sb_publishable_ROMRZ0NNpRrWPixisk6qFg_jZ7BZQ0A',
    'Accept': 'application/json',
}

for query in [
    ('tables', 'https://agvtmkjkzcubqpfamday.supabase.co/rest/v1/information_schema.tables?select=table_schema,table_name&table_schema=eq.public&order=table_name'),
    ('columns', 'https://agvtmkjkzcubqpfamday.supabase.co/rest/v1/information_schema.columns?select=table_name,column_name,data_type,is_nullable,column_default&table_schema=eq.public&order=table_name,ordinal_position'),
    ('foreign_keys', 'https://agvtmkjkzcubqpfamday.supabase.co/rest/v1/information_schema.table_constraints?select=constraint_name,constraint_type,table_name&table_schema=eq.public&constraint_type=eq.FOREIGN%20KEY')
]:
    name, url = query
    try:
        data = fetch_json(url, headers)
    except Exception as exc:
        print(f'ERROR {name}:', exc, file=sys.stderr)
        continue
    print(f'=== {name.upper()} ===')
    print(json.dumps(data, indent=2))
