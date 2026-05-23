#!/usr/bin/env python3
"""
Charge le fichier .env à la racine du dépôt et teste :
  • DATABASE_URL  → connexion Postgres via le client psql (si installé)
  • ou SUPABASE_URL + SUPABASE_ANON_KEY → requête REST /rest/v1/users (sans mdp DB)

Usage : depuis la racine du projet —
  python3 scripts/verify_env_connection.py
"""
from __future__ import annotations

import json
import os
import pathlib
import subprocess
import sys
import urllib.error
import urllib.request


def load_dotenv(env_path: pathlib.Path) -> None:
    if not env_path.is_file():
        print(f'Fichier absent : {env_path}')
        sys.exit(1)
    for raw in env_path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, val = line.partition('=')
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key:
            # Toujours privilégier le fichier .env (évite qu'une variable vide dans le shell écrase le fichier)
            os.environ[key] = val


def strip_default(val: str) -> str | None:
    v = val.strip()
    return v if v else None


def try_psql(database_url: str) -> bool:
    try:
        sql = (
            "SELECT concat('db=', current_database(), ' user=', current_user) AS connection_info;\n"
            "SELECT count(*) AS public_users_count FROM public.users;\n"
        )
        r = subprocess.run(
            ['psql', database_url, '-v', 'ON_ERROR_STOP=1'],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
            input=sql,
        )
        if r.returncode != 0:
            print('psql a échoué :')
            print(r.stderr or r.stdout or '(pas de sortie)')
            return False
        print('Postgres OK (via DATABASE_URL) :')
        print((r.stdout or '').strip())
        return True
    except FileNotFoundError:
        print('psql introuvable. Installez le client PostgreSQL ou utilisez Supabase Dashboard → SQL.')
        print('Ou définissez seulement SUPABASE_URL + SUPABASE_ANON_KEY pour le test REST ci-dessous.')
        return False
    except subprocess.TimeoutExpired:
        print('Connexion Postgres : délai dépassé (réseau / firewall ?).')
        return False


def try_rest(api_base: str, anon_key: str) -> bool:
    api_base = api_base.rstrip('/')
    if not api_base.startswith('http'):
        print(
            'SUPABASE_URL doit commencer par https:// (project URL).\n'
            'Si vous avez une URI postgresql://…, utilisez DATABASE_URL dans .env pour psql.'
        )
        return False
    url = f'{api_base}/rest/v1/users?select=id&limit=1'
    req = urllib.request.Request(
        url,
        headers={
            'apikey': anon_key,
            'Authorization': f'Bearer {anon_key}',
            'Accept': 'application/json',
        },
        method='GET',
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            body = resp.read().decode()
            status = resp.status
    except urllib.error.HTTPError as e:
        print(f'REST : HTTP {e.code}')
        detail = e.read().decode(errors='replace')[:800]
        if detail.strip():
            print(detail.strip())
        if e.code == 401:
            print('→ Vérifiez SUPABASE_ANON_KEY (clé anon du projet).')
        return False
    except urllib.error.URLError as e:
        print(f'REST : erreur réseau / URL — {e.reason}')
        return False

    print(f'API Supabase OK (HTTP {status}) réponse brute /users?limit=1 :')
    try:
        data = json.loads(body)
        print(json.dumps(data, indent=2, ensure_ascii=False) if data else '(table vide ou tableau vide [])')
    except json.JSONDecodeError:
        print(body[:500])

    hint = "(si tableau vide sans erreur, la table existe mais n'a aucune ligne.)"
    if body.strip() == '[]':
        print(hint)

    return status == 200


def main() -> None:
    root = pathlib.Path(__file__).resolve().parents[1]
    load_dotenv(root / '.env')

    db_url = strip_default(os.environ.get('DATABASE_URL', ''))
    s_url = strip_default(os.environ.get('SUPABASE_URL', ''))
    anon = strip_default(os.environ.get('SUPABASE_ANON_KEY', ''))

    if db_url:
        print('Variable DATABASE_URL détectée → test Postgres (psql)…')
        ok = try_psql(db_url)
        sys.exit(0 if ok else 2)

    if s_url and anon:
        if not anon.startswith('eyJ'):
            print(
                'Note: la clé « anon » Supabase est en pratique un JWT long commençant par eyJ.'
                ' Copiez-la depuis Dashboard → Project Settings → API → anon (public).\n'
            )
        print('SUPABASE_URL + SUPABASE_ANON_KEY → test REST…')
        ok = try_rest(s_url, anon)
        sys.exit(0 if ok else 2)

    print(
        'Configurez votre .env à la racine avec au minimum :\n'
        '  • DATABASE_URL=postgresql://…  (pour psql), OU\n'
        '  • SUPABASE_URL=https://…..supabase.co  ET  SUPABASE_ANON_KEY=eyJhbG…\n\n'
        'Ne mettez pas une URI postgres dans SUPABASE_URL : ce champ est réservé à l’URL HTTPS du projet.'
    )
    sys.exit(1)


if __name__ == '__main__':
    main()
