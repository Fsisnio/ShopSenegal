# PayDunya — intégration ShopSenegal

Le site est statique : les clés **Maître / Privée / Token** PayDunya ne peuvent pas être placées dans le navigateur. L’integration repose sur **deux Edge Functions Supabase** qui appellent l’API [PayDunya Checkout (PAR)](https://developers.paydunya.com/doc/EN/http_json).

## 1. Schéma base de données

Exécutez la migration qui ajoute `paydunya_invoice_token` et `estimated_total_fcfa` :

```bash
supabase db push
```

Ou appliquez le fichier `supabase/migrations/20250523100000_paydunya_order_fields.sql` dans le SQL Editor Supabase.

## 2. Déployer les fonctions

```bash
cd /chemin/vers/Shop_Senegal
supabase link --project-ref VOTRE_REF
supabase functions deploy paydunya-checkout --no-verify-jwt
supabase functions deploy paydunya-ipn --no-verify-jwt
```

Les entrées `[functions.paydunya-checkout]` / `paydunya-ipn` avec `verify_jwt = false` sont déjà définies dans `supabase/config.toml`.

## 3. Secrets Edge Functions

Dans le tableau de bord Supabase → Edge Functions → Secrets (ou CLI `supabase secrets set`) :

| Secret | Description |
|--------|--------------|
| `PAYDUNYA_MASTER_KEY` | Clé maître (interface PayDunya) |
| `PAYDUNYA_PRIVATE_KEY` | Clé privée |
| `PAYDUNYA_TOKEN` | Token application |
| `PAYDUNYA_SANDBOX` | `true` (sandbox) ou `false` (production) |
| `SUPABASE_URL` | URL du projet (souvent injectée automatiquement) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé « service_role » pour lire/mettre à jour les commandes |
| `SITE_PUBLIC_URL` | URL publique du site, ex `https://votredomaine.sn` |
| `PAYDUNYA_CHECKOUT_SECRET` | _(recommandé)_ chaîne secrète partagée ; la même valeur doit être renseignée côté client (voir §4) |
| `STORE_NAME_PAYDUNYA` | _(optionnel)_ nom affiché sur la page Paydunya |

Le **callback IPN** est fixé automatiquement vers :

`https://VOTRE_REF.supabase.co/functions/v1/paydunya-ipn`

La **page de retour** après paiement est : `{SITE_PUBLIC_URL}/payment-return.html`  
Annulation : `{SITE_PUBLIC_URL}/index.html#commande`

Vous pouvez surcharger avec `PAYDUNYA_RETURN_URL` et `PAYDUNYA_CANCEL_URL` si besoin.

Les URLs **retour** et **annulation** envoyées à Paydunya incluent **`?order=<id_commande>`** (avant `#fragment` s’il y en a). La page **`payment-return.html`** interroge Supabase (polling + `anon`) jusqu’à **`Paye`** ou **`Annule`**, puis prépare WhatsApp/SMS. Paydunya peut aussi passer **`token=`** dans l’URL ; la même page retrouve la commande via **`paydunya_invoice_token`**.

### Flux résumé

1. **`script.js`** enregistre la commande (`payment_status` **En attente** pour ce mode) puis appelle **`paydunya-checkout`**.
2. **IPN (`paydunya-ipn`)** appelle **`confirm`** puis aligne **`payment_status`** (**Paye**, **En attente**, **Annule**) selon Paydunya.
3. Retour client : **`payment-return.html?order=o-…`**.

| `payment_status` | Cas |
| --- | --- |
| **En attente** | Facture pending ou flux IPN incomplet |
| **Paye** | **`completed`** / **`paid`** (confirm PAR) |
| **Annule** | **`cancelled`** / **`failed`** / équivalents |

Après mise à jour du code, redéployez :  
`supabase functions deploy paydunya-checkout paydunya-ipn --no-verify-jwt`

## 4. Côté navigateur (`paydunya-config.js`)

Une fois déployées les fonctions, configurez :

```js
localStorage.setItem(
  'shopsenegal.paydunya.checkoutFnUrl',
  'https://VOTRE_REF.supabase.co/functions/v1/paydunya-checkout'
);
localStorage.setItem('shopsenegal.paydunya.checkoutSecret', 'LA_MEME_SECRETE_QUE_PAYDUNYA_CHECKOUT_SECRET');
```

Ou renseignez directement dans `paydunya-config.js` ou une méta facultative :

```html
<meta name="shopsenegal-paydunya-checkout-url" content="https://VOTRE_REF.supabase.co/functions/v1/paydunya-checkout" />
```

_(Évitez de committer vos URLs et secrets réels.)_

Le front doit aussi charger **`supabase-config.js`** (URL projet + **clé anon**) : enregistrement des commandes, appel à `paydunya-checkout` et **polling** sur `payment-return.html`.

## 5. Montant à payer

Pour le mode Paydunya, chaque ligne de la liste doit avoir un **prix unitaire (FCFA)** rempli (« Montant (optionnel) » dans le formulaire). Le serveur calcule : Σ (quantité × prix unitaire), arrondi en entier.

---

En cas de doute IPN : la function appelle **`checkout-invoice/confirm/[token]`** et met **`payment_status`** à **Paye** si le statut correspond à un paiement réussi (`completed`, `paid`, …), **Annule** si abandonné ou refusé, **En attente** si **pending**.
