#!/usr/bin/env node
/**
 * Génère les codes parrain pour les utilisateurs déjà inscrits sans code.
 *
 * Usage (depuis la racine du projet) :
 *   node scripts/backfill-referral-codes.mjs
 *
 * Variables requises dans .env :
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadDotenv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("Fichier .env introuvable. Copiez .env.example et renseignez Supabase.");
    process.exit(1);
  }
  for (const raw of fs.readFileSync(envPath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key) process.env[key] = val;
  }
}

function normalizePhone(value) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/[^\d+]/g, "")
    .replace(/^\+/, "");
}

function buildReferralCode(fullName, phone) {
  const tail = normalizePhone(phone).slice(-4).padStart(4, "0");
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("")
    .replace(/[^A-Z]/g, "");
  const prefix = (initials || "SS").slice(0, 3);
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}${tail}${rand}`;
}

async function supabaseFetch(url, key, resource, options = {}) {
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${resource}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "",
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(typeof data === "object" ? JSON.stringify(data) : String(data));
  }
  return data;
}

async function codeExists(url, key, code) {
  const rows = await supabaseFetch(
    url,
    key,
    `users?select=id&referral_code=eq.${encodeURIComponent(code)}&limit=1`
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function generateUniqueReferralCode(url, key, fullName, phone, userId) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = buildReferralCode(fullName, phone);
    if (!(await codeExists(url, key, code))) return code;
  }
  return `SS${String(userId).replace(/-/g, "").slice(-8).toUpperCase()}`;
}

async function main() {
  loadDotenv();
  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env");
    process.exit(1);
  }

  const users = await supabaseFetch(
    url,
    key,
    "users?select=id,full_name,phone,referral_code&referral_code=is.null&order=created_at.asc"
  );

  if (!Array.isArray(users) || users.length === 0) {
    console.log("Aucun utilisateur sans code parrain.");
    return;
  }

  console.log(`${users.length} utilisateur(s) à traiter…`);

  let updated = 0;
  for (const user of users) {
    const code = await generateUniqueReferralCode(
      url,
      key,
      user.full_name,
      user.phone,
      user.id
    );
    await supabaseFetch(url, key, `users?id=eq.${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ referral_code: code }),
      prefer: "return=minimal"
    });
    updated += 1;
    console.log(`  ${user.full_name || user.id} → ${code}`);
  }

  console.log(`Terminé : ${updated} code(s) parrain créé(s).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
