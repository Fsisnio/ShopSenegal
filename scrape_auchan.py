#!/usr/bin/env python3
"""Fetch product cards from auchan.sn listing pages and enrich from product detail pages."""

from __future__ import annotations

import argparse
import html as html_lib
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE = "https://www.auchan.sn"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

SAMPLE_LIST_URLS = (
    f"{BASE}/promotions",
    f"{BASE}/nouveaux-produits",
)

PLAN_DU_SITE = f"{BASE}/plan-du-site"

RETAILER_BRANDS = frozenset(
    {"auchan", "auchan drive", "auchan drive sénégal", "easyshopping", "easy shopping"}
)


def fetch(url: str) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "fr-SN,fr;q=0.9"})
    with urlopen(req, timeout=45) as r:
        charset = r.headers.get_content_charset() or "utf-8"
        return r.read().decode(charset, "replace")


def strip_html(text: str) -> str:
    if not text:
        return ""
    t = re.sub(r"<[^>]+>", " ", text)
    t = html_lib.unescape(t)
    return re.sub(r"\s+", " ", t).strip()


_tag_re = re.compile(r"<[^>]+>")


def clean_cell(text: str) -> str:
    if not text:
        return ""
    t = _tag_re.sub(" ", html_lib.unescape(text))
    t = re.sub(r"\s+", " ", t)
    return t.replace("\xa0", " ").strip()


def guess_brand(name: str, schema_brand: str | None) -> str:
    if schema_brand:
        b = clean_cell(schema_brand)
        if b and b.lower() not in RETAILER_BRANDS:
            return b
    stripped = name.strip()
    # Premier mot entièrement en majuscules (≥4 lettres). Évite BAD, VIP, etc.
    m = re.match(r"^([A-Z0-9À-Ü]{4,})\b", stripped)
    if m:
        return m.group(1).title()
    return ""


def extract_product_json(html: str) -> dict[str, Any] | None:
    m = re.search(r'data-product="(\{.+\})"\s*>\s*<div class="elementor-section', html, re.DOTALL)
    if m:
        try:
            return json.loads(html_lib.unescape(m.group(1)))
        except json.JSONDecodeError:
            pass
    anchor = html.find('data-product="')
    if anchor < 0:
        return None
    brace = html.find("{", anchor)
    if brace < 0:
        return None
    depth = 0
    for k in range(brace, min(len(html), brace + 2_500_000)):
        c = html[k]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                blob = html[brace : k + 1]
                try:
                    return json.loads(html_lib.unescape(blob))
                except json.JSONDecodeError:
                    return None
    return None


def ld_json_product(html: str) -> tuple[str | None, str | None, str | None]:
    blocks = re.findall(
        r'<script type="application/ld\+json"[^>]*>(.*?)</script>', html, re.IGNORECASE | re.DOTALL
    )
    for raw in blocks:
        raw = raw.strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and data.get("@type") == "Product":
            brand = None
            b = data.get("brand")
            if isinstance(b, dict):
                brand = b.get("name")
            elif isinstance(b, str):
                brand = b
            desc = data.get("description") or data.get("name")
            return data.get("name"), strip_html(desc) if desc else None, brand
    return None, None, None


def category_from_product_url(product_url: str) -> str:
    try:
        path = product_url.replace(BASE + "/", "").split("?")[0]
        seg = path.split("/")[0] if "/" in path else path
        if seg.isdigit() or not seg:
            return ""
        return seg.replace("-", " ").replace("_", " ").title()
    except Exception:
        return ""


def parse_listing_article(opening_tag: str, body: str) -> dict[str, Any] | None:
    url_m = re.search(r'href="(https://www\.auchan\.sn[^"]+\.html)"', body)
    if not url_m:
        url_m = re.search(r'href="(https://www\.auchan\.sn[^"]+\.html)"', opening_tag + body)
    if not url_m:
        return None
    product_url = html_lib.unescape(url_m.group(1))

    img_m = re.search(r'data-full-size-image-url="([^"]+)"', body) or re.search(
        r'<img[^>]+src="([^"]+)"[^>]*>', body
    )
    image_url = html_lib.unescape(img_m.group(1)) if img_m else ""

    title_m = re.search(
        r'<h[23][^>]*class="[^"]*product-title[^"]*"[^>]*>\s*<a[^>]*>(.*?)</a>',
        body,
        re.DOTALL | re.IGNORECASE,
    )
    name = clean_cell(title_m.group(1)) if title_m else ""

    price_m = re.search(
        r'<span[^>]*itemprop="price"[^>]*>([^<]+)', body, re.IGNORECASE
    ) or re.search(r'<span[^>]*class="[^"]*price[^"]*has-discount[^"]*"[^>]*>([^<]+)', body, re.IGNORECASE)
    alt_price = re.search(
        r'<span[^>]*class="[^"]*price\b[^"]*"[^>]*>([^<]+)</span>', body, re.IGNORECASE
    )
    price = clean_cell(price_m.group(1) if price_m else (alt_price.group(1) if alt_price else ""))

    reg_m = re.search(r'<span[^>]*class="[^"]*regular-price[^"]*"[^>]*>([^<]+)<', body, re.IGNORECASE)
    regular = clean_cell(reg_m.group(1)) if reg_m else ""

    raw_notifs = re.findall(r'class="[^"]*miniature-notif[^"]*"[^>]*>([\s\S]*?)</div>', body, re.IGNORECASE)
    prom_parts: list[str] = []
    for chunk in raw_notifs:
        t = clean_cell(chunk)
        if not t:
            continue
        if "limited to" in t.lower():
            continue
        prom_parts.append(t)
    promotion = " · ".join(dict.fromkeys(prom_parts))

    slug_cat = category_from_product_url(product_url)

    return {
        "productName": name,
        "price": price,
        "promotion": promotion,
        "category": slug_cat,
        "imageUrl": image_url,
        "productUrl": product_url,
        "regularPrice": regular,
    }


def iter_product_articles(html: str):
    for m in re.finditer(
        r'<article\s+([^>]*class="[^"]*product-miniature[^"]*"[^>]*)>([\s\S]*?)</article>',
        html,
        re.IGNORECASE,
    ):
        yield m.group(1), m.group(2)


def discover_category_urls() -> list[str]:
    """Rayons listés sur le plan du site (IDs numériques + slug)."""
    try:
        page = fetch(PLAN_DU_SITE)
    except (HTTPError, URLError, OSError) as e:
        print(f"Impossible de lire {PLAN_DU_SITE}: {e}")
        return []
    pattern = r'href="(https://www\.auchan\.sn/\d+-[^"#\s]+)"'
    raw_urls = re.findall(pattern, page)
    urls = sorted({html_lib.unescape(u).rstrip("/") for u in raw_urls if ".html" not in u})
    return urls


def merge_listing_html_into_seen(html: str, seen: dict[str, dict[str, Any]]) -> int:
    added = 0
    for opening, body in iter_product_articles(html):
        row = parse_listing_article(opening, body)
        if row and row.get("productUrl") and row["productUrl"] not in seen:
            seen[row["productUrl"]] = row
            added += 1
    return added


def ingest_paginated_listing(
    seed_url: str,
    seen: dict[str, dict[str, Any]],
    *,
    listing_sleep: float,
    max_pages: int,
) -> int:
    """Récupère toutes les pages ?page=n pour une URL de liste / catégorie. Retourne le nombre de pages chargées."""
    base = seed_url.rstrip("/").split("?")[0]
    pages_loaded = 0
    for page in range(1, max_pages + 1):
        listing_url = base if page == 1 else f"{base}?page={page}"
        try:
            html = fetch(listing_url)
        except (HTTPError, URLError, OSError) as e:
            print(f"  skip page {page} {listing_url}: {e}")
            break
        n_cards = sum(1 for _ in iter_product_articles(html))
        if n_cards == 0:
            break
        merge_listing_html_into_seen(html, seen)
        pages_loaded = page
        if listing_sleep > 0:
            time.sleep(listing_sleep)
    return pages_loaded


def scrape_listings(
    urls: list[str],
    *,
    listing_sleep: float = 0.0,
    max_pages_per_listing: int = 500,
    log_prefix: str = "",
) -> list[dict[str, Any]]:
    seen: dict[str, dict[str, Any]] = {}
    total = len(urls)
    for i, url in enumerate(urls, start=1):
        label = url.replace(BASE + "/", "")
        ingest_paginated_listing(
            url,
            seen,
            listing_sleep=listing_sleep,
            max_pages=max_pages_per_listing,
        )
        if log_prefix and (i % 15 == 0 or i == total):
            print(f"{log_prefix}[{i}/{total}] {label}… → {len(seen)} produits uniques")
    return list(seen.values())


def enrich(rows: list[dict[str, Any]], pause: float) -> None:
    for row in rows:
        url = row["productUrl"]
        try:
            detail = fetch(url)
        except (HTTPError, URLError, OSError):
            row["brand"] = guess_brand(row["productName"], None)
            row["description"] = row["productName"] or ""
            row.pop("regularPrice", None)
            time.sleep(pause)
            continue
        data = extract_product_json(detail)
        ld_name, ld_desc, ld_brand = ld_json_product(detail)

        name = row["productName"] or ""
        cat = row["category"]
        promo = row["promotion"]
        img = row["imageUrl"]
        price_text = row.get("price") or ""

        brand = ""
        description = ""

        if data:
            name = strip_html(str(data.get("name") or name)) or name
            description = strip_html(
                str(data.get("description_short") or data.get("description") or "")
            )
            cat_fn = strip_html(str(data.get("category_name") or ""))
            if cat_fn:
                cat = cat_fn
            bn = ""
            mf = data.get("id_manufacturer")
            try:
                if mf and str(mf).isdigit() and int(str(mf)) > 0:
                    bn = str(data.get("manufacturer_name") or "")
            except ValueError:
                pass
            if bn:
                brand = strip_html(bn)
            if not price_text:
                price_raw = data.get("price")
                price_text = strip_html(str(price_raw)) if price_raw is not None else ""
            promo_bits = []
            if data.get("reduction"):
                try:
                    r = float(data["reduction"])
                    if r and r > 0:
                        promo_bits.append(f'-{data["reduction"]} CFA (réduction)')
                except (TypeError, ValueError):
                    pass
            if data.get("specific_prices"):
                promo_bits.append("Promo catalogue")
            if promo_bits and not promo:
                promo = " ".join(dict.fromkeys(promo_bits))

            cover = data.get("cover")
            if isinstance(cover, dict):
                large = cover.get("large") or {}
                lu = large.get("url") if isinstance(large, dict) else None
                if lu:
                    img = lu.replace("\\/", "/")

        if ld_name and not name:
            name = strip_html(ld_name)
        if not description and ld_desc:
            description = ld_desc
        if not brand:
            brand = guess_brand(name, ld_brand)

        row["productName"] = name
        row["price"] = price_text or row.get("price") or ""
        row["promotion"] = promo
        row["category"] = cat
        row["imageUrl"] = img
        row["brand"] = brand
        row["description"] = description or name

        if row.get("regularPrice"):
            if row["promotion"]:
                row["promotion"] = f'{row["promotion"]} (prix barré : {row["regularPrice"]})'
            elif row["price"]:
                row["promotion"] = f'Prix barré : {row["regularPrice"]}'

        row.pop("regularPrice", None)
        time.sleep(pause)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape Auchan.sn product listings into JSON (catalogue complet ou échantillon)."
    )
    parser.add_argument(
        "--mode",
        choices=("catalog", "sample"),
        default="catalog",
        help="catalog = tous les rayons du plan du site ; sample = promotions + nouveautés seulement",
    )
    parser.add_argument(
        "--urls",
        nargs="*",
        default=None,
        metavar="URL",
        help="Si fourni, n'utiliser que ces URLs de listes (avec pagination ?page=)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path(__file__).parent / "data" / "auchan-products.json",
        help="Output JSON path",
    )
    parser.add_argument("--limit", type=int, default=0, help="Plafond de produits après fusion (0 = tous)")
    parser.add_argument(
        "--enrich",
        action="store_true",
        help="Visite chaque fiche produit (description, catégorie catalogue…). Très lent sur le catalogue entier.",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.25,
        help="Pause entre requêtes de fiche produit (si --enrich)",
    )
    parser.add_argument(
        "--listing-sleep",
        type=float,
        default=0.0,
        help="Pause entre pages de listes / catégories (secondes)",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=500,
        help="Limite de sécurité de pages ?page= par rayon ou liste",
    )
    parser.add_argument(
        "--max-categories",
        type=int,
        default=0,
        help="Catalogue: n'ingérer que les N premiers rayons (0 = tous)",
    )
    args = parser.parse_args()

    if args.urls:
        sources = list(args.urls)
        browse_mode = "custom_urls"
    elif args.mode == "sample":
        sources = list(SAMPLE_LIST_URLS)
        browse_mode = "sample"
    else:
        sources = discover_category_urls()
        if args.max_categories > 0:
            sources = sources[: args.max_categories]
        browse_mode = "catalog"

    print(f"Mode {browse_mode}: {len(sources)} URL(s) de liste à parcourir…")
    rows = scrape_listings(
        sources,
        listing_sleep=args.listing_sleep,
        max_pages_per_listing=args.max_pages,
        log_prefix="  " if browse_mode == "catalog" else "",
    )
    print(f"Listes terminées: {len(rows)} produits uniques (cartes).")

    if args.limit > 0:
        rows = rows[: args.limit]

    if args.enrich:
        print(f"Enrichissement de {len(rows)} fiches produit (patientez)…")
        enrich(rows, args.sleep)
        payload = rows
    else:
        for row in rows:
            row.setdefault("brand", guess_brand(row["productName"], None))
            row.setdefault("description", row["productName"] or "")
            row.pop("regularPrice", None)
        payload = rows

    args.output.parent.mkdir(parents=True, exist_ok=True)
    bundle = {
        "source": BASE,
        "scrapedAt": datetime.now(timezone.utc).isoformat(),
        "browseMode": browse_mode,
        "listingSeedsCount": len(sources),
        "listingSeedsSample": sources[:8],
        "planDuSite": PLAN_DU_SITE if browse_mode == "catalog" else None,
        "enriched": bool(args.enrich),
        "products": sorted(payload, key=lambda r: r.get("productName") or ""),
    }
    args.output.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Écrit {len(payload)} produits dans {args.output}")
    if not args.enrich and len(payload) > 200:
        print("Astuce: pour descriptions / marques détaillées: relancez avec --enrich (long).")


if __name__ == "__main__":
    main()
