# Configuration Supabase (ShopSenegal)

## 1) Creer les tables

Dans Supabase, allez dans **SQL Editor** puis executez le contenu de `supabase-schema.sql`.

## 2) Recuperer URL + Anon Key

Dans Supabase:
- **Project Settings** -> **API**
- Copiez:
  - `Project URL`
  - `anon public key`

## 3) Renseigner la configuration

Option rapide (depuis la console navigateur):

```js
localStorage.setItem("shopsenegal.supabase.url", "https://VOTRE-PROJET.supabase.co");
localStorage.setItem("shopsenegal.supabase.anonKey", "VOTRE_ANON_KEY");
location.reload();
```

## 4) Verifier

- Creer une commande depuis `index.html`
- Aller dans `enangon_Admin.html`
- Verifier que la commande apparait aussi dans les tables Supabase:
  - `orders`
  - `users`
  - `drivers`
  - `places`

## Notes

- Si la config Supabase est absente ou invalide, l'app continue en mode local (localStorage).
- Cette version est une integration front-end directe (MVP). Pour production, proteger les politiques RLS et utiliser une auth utilisateur.
