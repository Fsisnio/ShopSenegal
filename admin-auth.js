/**
 * Authentification admin ShopSenegal via Supabase Auth.
 * - Connexion : signInWithPassword (email + mot de passe)
 * - Autorisation : email présent dans public.admin_users (RLS)
 * - Session persistée (localStorage, clé shopsenegal-admin-auth)
 */
(function () {
  const AUTH_STORAGE_KEY = "shopsenegal-admin-auth";

  let authClient = null;
  let currentUser = null;

  function getConfig() {
    const cfg = window.SUPABASE_CONFIG || {};
    const url = typeof cfg.url === "string" ? cfg.url.trim() : "";
    const anonKey = typeof cfg.anonKey === "string" ? cfg.anonKey.trim() : "";
    return { url, anonKey, ok: Boolean(url && anonKey) };
  }

  function createAuthClient() {
    const { url, anonKey, ok } = getConfig();
    if (!ok || !window.supabase?.createClient) return null;
    return window.supabase.createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: AUTH_STORAGE_KEY
      }
    });
  }

  function mapAuthError(error) {
    const msg = (error?.message || "").toLowerCase();
    if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
      return "Email ou mot de passe incorrect.";
    }
    if (msg.includes("email not confirmed")) {
      return "Confirmez votre email dans Supabase Auth avant de vous connecter.";
    }
    if (msg.includes("too many requests")) {
      return "Trop de tentatives. Réessayez dans quelques minutes.";
    }
    return error?.message || "Connexion impossible.";
  }

  async function verifyAdminAllowlist(client) {
    const { data, error } = await client.from("admin_users").select("email").maybeSingle();
    if (error) {
      console.warn("AdminAuth allowlist:", error);
      throw new Error(
        "Impossible de vérifier les droits admin (table admin_users / migration SQL)."
      );
    }
    return Boolean(data?.email);
  }

  async function init() {
    const { ok } = getConfig();
    if (!ok) {
      authClient = null;
      currentUser = null;
      return { ok: false, reason: "supabase_not_configured" };
    }
    authClient = createAuthClient();
    const { data, error } = await authClient.auth.getSession();
    if (error) {
      console.warn("AdminAuth getSession:", error);
      currentUser = null;
      return { ok: false, reason: "session_error" };
    }
    const user = data?.session?.user ?? null;
    if (!user?.email) {
      currentUser = null;
      return { ok: false, reason: "no_session" };
    }
    try {
      const allowed = await verifyAdminAllowlist(authClient);
      if (!allowed) {
        await authClient.auth.signOut();
        currentUser = null;
        return { ok: false, reason: "not_admin" };
      }
      currentUser = user;
      return { ok: true, user };
    } catch (err) {
      await authClient.auth.signOut();
      currentUser = null;
      return { ok: false, reason: "allowlist_error", message: err?.message };
    }
  }

  async function login(email, password) {
    const { ok } = getConfig();
    if (!ok) {
      return {
        ok: false,
        error:
          "Supabase non configuré. Définissez SUPABASE_URL et SUPABASE_ANON_KEY sur le serveur."
      };
    }
    authClient = createAuthClient();
    const trimmedEmail = String(email || "").trim().toLowerCase();
    const pwd = String(password || "");
    if (!trimmedEmail || !pwd) {
      return { ok: false, error: "Renseignez l'email et le mot de passe." };
    }

    const { data, error } = await authClient.auth.signInWithPassword({
      email: trimmedEmail,
      password: pwd
    });
    if (error) {
      return { ok: false, error: mapAuthError(error) };
    }

    const user = data?.user;
    if (!user?.email) {
      await authClient.auth.signOut();
      return { ok: false, error: "Session invalide après connexion." };
    }

    try {
      const allowed = await verifyAdminAllowlist(authClient);
      if (!allowed) {
        await authClient.auth.signOut();
        currentUser = null;
        return {
          ok: false,
          error:
            "Ce compte n'est pas autorisé pour l'administration. Ajoutez l'email dans la table admin_users (Supabase)."
        };
      }
      currentUser = user;
      return { ok: true, user };
    } catch (err) {
      await authClient.auth.signOut();
      currentUser = null;
      return { ok: false, error: err?.message || "Vérification admin échouée." };
    }
  }

  async function logout() {
    if (authClient) {
      await authClient.auth.signOut();
    }
    authClient = null;
    currentUser = null;
  }

  function isAuthed() {
    return Boolean(currentUser?.email);
  }

  function getUserEmail() {
    return currentUser?.email || "";
  }

  function getClient() {
    return isAuthed() ? authClient : null;
  }

  window.ShopAdminAuth = {
    init,
    login,
    logout,
    isAuthed,
    getUserEmail,
    getClient,
    isConfigured: () => getConfig().ok
  };
})();
