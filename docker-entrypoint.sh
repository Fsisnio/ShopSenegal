#!/bin/sh
# Génère runtime-env.js à partir des variables Render / Docker puis sert les fichiers statiques.
set -e
cd /app || exit 1
PORT="${PORT:-10000}"

python3 <<'PY'
import json
import os

payload = {
    "SUPABASE_URL": (os.environ.get("SUPABASE_URL") or "").strip(),
    "SUPABASE_ANON_KEY": (os.environ.get("SUPABASE_ANON_KEY") or "").strip(),
    "PAYDUNYA_CHECKOUT_FN_URL": (
        os.environ.get("PAYDUNYA_CHECKOUT_FN_URL") or os.environ.get("PAYDUNYA_CHECKOUT_URL") or ""
    ).strip(),
    "PAYDUNYA_CHECKOUT_SECRET": (os.environ.get("PAYDUNYA_CHECKOUT_SECRET") or "").strip(),
    "SHOPSENEGAL_PHONE_LOCAL": (os.environ.get("SHOPSENEGAL_PHONE_LOCAL") or "766565967").strip(),
}

with open("runtime-env.js", "w", encoding="utf-8") as f:
    f.write("window.SHOPSENEGAL_RUNTIME=")
    json.dump(payload, f, ensure_ascii=False)
    f.write(";\n")
PY

exec python3 -m http.server "$PORT" --bind 0.0.0.0
