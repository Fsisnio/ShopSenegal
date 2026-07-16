const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const phoneInput = document.getElementById("phone");
const passwordInput = document.getElementById("password");

function isPublicProduction() {
  return Boolean(window.ShopSite?.isPublicProduction?.());
}

function publicLoginFeedback(type, title) {
  if (type === "success") {
    return {
      title: "Connexion réussie",
      message: "Bienvenue ! Redirection vers votre espace ShopSenegal…"
    };
  }
  if (type === "warn") {
    const hints = {
      "Formulaire incomplet": "Indiquez votre téléphone et votre mot de passe.",
      "Mot de passe incorrect": "Le mot de passe ne correspond pas à ce compte.",
      "Compte introuvable": "Aucun compte avec ce numéro. Créez un compte ou vérifiez le numéro."
    };
    if (hints[title]) return { title, message: hints[title] };
  }
  return {
    title: title || "Connexion impossible",
    message:
      "Nous n'avons pas pu vous connecter. Réessayez ou contactez-nous sur WhatsApp au " +
      (window.ShopContact?.display || "+221 76 622 66 01") +
      "."
  };
}

function notify(type, title, message) {
  const prod = isPublicProduction();
  const pub = prod ? publicLoginFeedback(type, title) : { title, message };
  const display =
    prod && type === "success" && message ? { title: pub.title, message } : pub;

  if (loginStatus) {
    if (prod) {
      loginStatus.classList.add("login-status--prod-hidden");
      loginStatus.textContent = "";
    } else {
      loginStatus.classList.remove("login-status--prod-hidden");
      loginStatus.textContent = message;
    }
  }

  if (!window.ShopFeedback) return;
  if (type === "success") window.ShopFeedback.success(display.title, display.message);
  else if (type === "error") window.ShopFeedback.error(display.title, display.message);
  else window.ShopFeedback.warn(display.title, display.message);
}

function normalizePhone(value) {
  return value.replace(/\s+/g, "");
}

function getRedirectTarget() {
  try {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && /^[a-z0-9./_-]+(?:\.html)?(?:#[\w-]+)?$/i.test(next) && !next.includes("..")) {
      return next.includes(".html") ? next : `${next}.html`;
    }
  } catch {
    /** Non bloquant **/
  }
  return "index.html";
}

function initLoginNotice() {
  if (!loginStatus || isPublicProduction()) return;
  if (!window.ShopData?.isSupabaseConfigured) return;
  if (!window.ShopData.isSupabaseConfigured()) {
    loginStatus.textContent =
      "Supabase non configuré : la connexion reste uniquement sur ce navigateur.";
  }
}

initLoginNotice();

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const phone = normalizePhone(phoneInput.value.trim());
  const password = passwordInput.value;

  if (!phone || !password) {
    notify(
      "warn",
      "Formulaire incomplet",
      "Indiquez votre numéro de téléphone et votre mot de passe."
    );
    return;
  }

  const result = await window.ShopData.loginUser(phone, password);
  if (!result.ok) {
    if (result.reason === "not_found") {
      notify(
        "warn",
        "Compte introuvable",
        "Aucun compte avec ce numéro. Créez un compte ou vérifiez le numéro saisi."
      );
    } else if (result.reason === "wrong_password") {
      notify(
        "warn",
        "Mot de passe incorrect",
        "Le mot de passe ne correspond pas. Réessayez ou contactez le support."
      );
    } else {
      notify(
        "error",
        "Connexion échouée",
        "Impossible de vous connecter pour le moment. Réessayez dans quelques instants."
      );
    }
    return;
  }

  window.ShopData.setClientSession?.({
    userId: result.user.userId,
    fullName: result.user.fullName,
    phone: result.user.phone,
    address: result.user.address
  });

  notify("success", "Connexion réussie", "");
  loginForm.reset();

  const target = getRedirectTarget();
  window.setTimeout(() => {
    window.location.assign(target);
  }, 900);
});
