# Deploy ShopSenegal on Render

## Option 1: Fast deploy from Render dashboard

1. Push code to GitHub (already done).
2. Open [Render Dashboard](https://dashboard.render.com/).
3. Click **New** -> **Blueprint**.
4. Select your repository `Fsisnio/ShopSenegal`.
5. Render detects `render.yaml`.
6. Confirm deploy.

## Option 2: Manual Web Service (without Blueprint)

1. In Render: **New** -> **Web Service**.
2. Connect repo `Fsisnio/ShopSenegal`.
3. Environment: **Docker**.
4. Instance type: Free (or your plan).
5. Deploy.

## Supabase notes

The app works even without Supabase (local fallback).

For Supabase in production, set the keys in browser storage once:

```js
localStorage.setItem("shopsenegal.supabase.url", "https://YOUR-PROJECT.supabase.co");
localStorage.setItem("shopsenegal.supabase.anonKey", "YOUR_ANON_KEY");
location.reload();
```

Then app data flows to Supabase.
