# Authentification administrateur (Supabase Auth)

L’admin (`enangon_Admin.html`) utilise **Supabase Auth** (email + mot de passe), pas un mot de passe codé dans le JavaScript.

## Prérequis

- Projet Supabase avec `SUPABASE_URL` et `SUPABASE_ANON_KEY` configurés sur Render (voir `DEPLOY_RENDER.md`).
- Migration SQL appliquée : `supabase/migrations/20260613100000_admin_auth.sql`

## 1. Appliquer la migration

Dans **Supabase → SQL Editor**, exécutez le fichier de migration (table `admin_users` + email autorisé par défaut).

Ou en CLI :

```bash
supabase db push
```

## 2. Créer l’utilisateur Auth

1. **Supabase Dashboard → Authentication → Users**
2. **Add user → Create new user**
3. Email : `faladespero1@gmail.com` (ou votre email admin)
4. Mot de passe : choisissez un mot de passe fort (ex. celui que vous utilisiez déjà)
5. Cochez **Auto Confirm User** (ou désactivez « Confirm email » dans Auth settings)

## 3. Autoriser l’email dans `admin_users`

La migration insère déjà `faladespero1@gmail.com`. Pour un autre compte :

```sql
insert into public.admin_users (email, full_name)
values ('votre.email@exemple.com', 'Nom Admin')
on conflict (email) do nothing;
```

L’email doit **correspondre** à celui du compte Supabase Auth.

## 4. Se connecter

- URL : `https://votredomaine.sn/enangon_Admin.html`
- Email + mot de passe du compte **Authentication** (pas le hash dans le code)

## Fonctionnement technique

| Étape | Détail |
|--------|--------|
| Connexion | `signInWithPassword` via `admin-auth.js` |
| Autorisation | Lecture de `admin_users` (RLS : l’utilisateur ne voit que sa ligne) |
| Session | JWT Supabase persisté (`shopsenegal-admin-auth`) |
| API admin | `app-data.js` utilise le client authentifié quand la session est active |

## Dépannage

| Message | Action |
|---------|--------|
| Supabase non configuré | Vérifier `SUPABASE_URL` / `SUPABASE_ANON_KEY` sur Render + redéploiement |
| Email ou mot de passe incorrect | Vérifier le user dans Authentication → Users |
| Compte non autorisé | Ajouter l’email dans `admin_users` |
| Confirmez votre email | Activer **Auto Confirm** ou confirmer l’email utilisateur |
| Table admin_users | Exécuter la migration `20260613100000_admin_auth.sql` |

## Sécurité

- Les mots de passe ne sont **jamais** stockés dans le dépôt.
- Seuls les emails listés dans `admin_users` accèdent au back-office après connexion Auth.
- Pour renforcer : durcir les politiques RLS sur `orders`, `products`, etc. (lecture publique limitée, écriture admin authentifiée).
