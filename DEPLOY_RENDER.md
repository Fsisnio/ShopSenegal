# Deploy ShopSenegal on Render

## Option 1: Fast deploy from Render dashboard

1. Push code to GitHub (already done).
2. Open [Render Dashboard](https://dashboard.render.com/).
3. Click **New** → **Blueprint**.
4. Select your repository `Fsisnio/ShopSenegal`.
5. Render detects `render.yaml`.
6. Confirm deploy.

## Option 2: Manual Web Service (without Blueprint)

1. In Render: **New** → **Web Service**.
2. Connect repo `Fsisnio/ShopSenegal`.
3. Environment: **Docker**.
4. Instance type: Free (or your plan).
5. Deploy.

## Variables d'environnement (obligatoire pour Pay en ligne Paydunya)

Le site Docker génère au démarrage le fichier **`runtime-env.js`** à partir du conteneur. Sans ces variables sur le service Render, **`SUPABASE_CONFIG`** reste vide : la commande ne part pas dans Supabase et **« Continuer vers le paiement sécurisé »** reste sans redirection.

Dans Render → votre service **`shopsenegal`** → **Environment** :

| Variable | Exemple |
| -------- | ------- |
| `SUPABASE_URL` | `https://VOTRE_REF.supabase.co` |
| `SUPABASE_ANON_KEY` | **clé anon** du projet Supabase |
| `PAYDUNYA_CHECKOUT_FN_URL` | `https://VOTRE_REF.supabase.co/functions/v1/paydunya-checkout` |

Optionnel (si votre Edge Function exige une entête secret côté client) :

| `PAYDUNYA_CHECKOUT_SECRET` | Même valeur que le secret **`PAYDUNYA_CHECKOUT_SECRET`** défini dans Supabase pour la fonction checkout |

Voir aussi **`PAYDUNYA.md`** pour déployer les fonctions (`paydunya-checkout`, `paydunya-ipn`) et **`SITE_PUBLIC_URL`** côté Supabase.

Après changement des variables : **manual deploy** ou redémarrage du service pour régénérer `runtime-env.js`.

## Fallback navigateur (hors Docker / dev local)

Alternative compatible avec **`supabase-config.js`** :

```js
localStorage.setItem("shopsenegal.supabase.url", "https://YOUR-PROJECT.supabase.co");
localStorage.setItem("shopsenegal.supabase.anonKey", "YOUR_ANON_KEY");
location.reload();
```

Pour Paydunya seulement :

```js
localStorage.setItem(
  "shopsenegal.paydunya.checkoutFnUrl",
  "https://YOUR_REF.supabase.co/functions/v1/paydunya-checkout"
);
```

Voir **`SUPABASE_SETUP.md`** pour plus de détail.

## Supabase hors Paydunya

Sans Supabase, l’application continue de fonctionner avec le stockage **local uniquement**.
