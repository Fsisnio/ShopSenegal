# Vérifier l’inscription et la base en production

## 1. Côté site (sans accès projet)

Après avoir rempli **`supabase-config.js`** (URL + anon key du projet prod) :

1. Aller sur `register.html`, ouvrir la **console (F12) → Réseau**.
2. S’inscrire avec un numéro de test unique.
3. Vous devez voir une requête **`POST …/rest/v1/users`** avec statut **201** (ou 200 selon config).
4. Si **401** / **403** : politiques RLS ou clé anon incorrecte.
5. Si **400** avec message sur une colonne : schéma `public.users` pas aligné avec le code (voir `supabase-schema.sql`).

Sur la page, si le message indique **« Supabase non configure »**, les comptes vont seulement dans le **localStorage** du navigateur, pas en production.

## 2. Côté Supabase (production)

Dans le **dashboard** du projet concerné :

| Étape | Action |
|--------|--------|
| Table | **Table Editor** → `public.users` → vérifier qu’une nouvelle ligne apparaît après inscription. |
| SQL | Exécuter : `select id, full_name, phone, email, created_at from public.users order by created_at desc limit 20;` |
| RLS | **Authentication** n’est pas utilisée par ce flux ; la clé **anon** insert dans `users` grâce à la policy `public write users`. Si vous avez repris une autre stratégie RLS, l’INSERT peut être refusé. |
| Secrets | Pas de secrets serveur nécessaires **uniquement** pour l’inscription anon (contrairement à Paydunya avec service_role). |

## 3. Alignement schéma

La table doit au minimum refléter :

`id`, `full_name`, `phone` (unique), `email` (unique, nullable), `address`, `password`, `created_at`.

Si **`email`** est vide côté formulaire, l’application envoie **`null`** pour éviter plusieurs lignes avec `''` qui casseraient une contrainte **UNIQUE** sur PostgreSQL.

## 4. Sécurité

Les mots de passe sont encore stockés **en clair** dans cette maquette : prévoir **Supabase Auth** (ou hash côté serveur) avant une mise en ligne grand public sérieuse.
