const registerForm = document.getElementById("register-form");
const registerStatus = document.getElementById("register-status");
const fullNameInput = document.getElementById("full-name");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const addressInput = document.getElementById("address");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");

function isPublicProduction() {
  return Boolean(window.ShopSite?.isPublicProduction?.());
}

function publicRegisterFeedback(type, title) {
  if (type === "success") {
    return {
      title: "Inscription réussie",
      message:
        "Votre compte est créé. Vous pouvez maintenant passer commande depuis l'accueil ShopSenegal."
    };
  }
  if (type === "warn") {
    const hints = {
      "Formulaire incomplet": "Remplissez le nom, le téléphone et l'adresse.",
      "Mot de passe trop court": "Le mot de passe doit contenir au moins 6 caractères.",
      "Mots de passe différents": "Les deux mots de passe saisis ne correspondent pas."
    };
    if (hints[title]) return { title, message: hints[title] };
  }
  if (title === "Inscription refusée") {
    return {
      title,
      message: "Ce numéro ou cet email est déjà utilisé. Essayez avec d'autres coordonnées."
    };
  }
  return {
    title: title || "Inscription impossible",
    message:
      "Nous n'avons pas pu créer votre compte. Réessayez ou contactez-nous sur WhatsApp au " +
        (window.ShopContact?.display || "+221 76 622 66 01") +
        "."
  };
}

function notify(type, title, message) {
  const prod = isPublicProduction();
  const pub = prod ? publicRegisterFeedback(type, title) : { title, message };

  if (registerStatus) {
    if (prod) {
      registerStatus.classList.add("register-status--prod-hidden");
      registerStatus.textContent = "";
    } else {
      registerStatus.classList.remove("register-status--prod-hidden");
      registerStatus.textContent = message;
    }
  }

  if (!window.ShopFeedback) return;
  if (type === "success") window.ShopFeedback.success(pub.title, pub.message);
  else if (type === "error") window.ShopFeedback.error(pub.title, pub.message);
  else window.ShopFeedback.warn(pub.title, pub.message);
}

function normalizePhone(value) {
  return value.replace(/\s+/g, "");
}

function initRegisterNotice() {
  if (!registerStatus || isPublicProduction()) return;
  if (!window.ShopData?.isSupabaseConfigured) return;
  if (!window.ShopData.isSupabaseConfigured()) {
    registerStatus.textContent =
      "Supabase non configure : l'inscription reste uniquement sur ce navigateur. Renseignez supabase-config.js pour envoyer les comptes en base.";
  }
}

initRegisterNotice();

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fullName = fullNameInput.value.trim();
  const phone = normalizePhone(phoneInput.value.trim());
  const email = emailInput.value.trim();
  const address = addressInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!fullName || !phone || !address) {
    notify(
      "warn",
      "Formulaire incomplet",
      "Remplissez le nom, le téléphone et l'adresse pour créer votre compte."
    );
    return;
  }

  if (password.length < 6) {
    notify(
      "warn",
      "Mot de passe trop court",
      "Le mot de passe doit contenir au moins 6 caractères."
    );
    return;
  }

  if (password !== confirmPassword) {
    notify(
      "warn",
      "Mots de passe différents",
      "Les deux mots de passe saisis ne correspondent pas. Vérifiez et réessayez."
    );
    return;
  }

  const payload = {
    id: `u-${Date.now()}`,
    fullName,
    phone,
    email,
    address,
    password,
    createdAt: new Date().toISOString()
  };

  const result = await window.ShopData.registerUser(payload);
  if (!result.ok) {
    if (result.reason === "exists") {
      notify(
        "error",
        "Inscription refusée",
        "Ce numéro ou cet email est déjà inscrit. Utilisez un autre compte ou connectez-vous."
      );
    } else if (result.reason === "db_error") {
      if (result.message) console.warn("Inscription Supabase:", result.message);
      notify(
        "error",
        "Erreur base de données",
        "Impossible d'enregistrer le compte dans Supabase. Vérifiez la table users et les politiques RLS, puis réessayez."
      );
    } else {
      notify(
        "error",
        "Inscription échouée",
        "Impossible de finaliser l'inscription pour le moment. Réessayez dans quelques instants."
      );
    }
    return;
  }

  notify("success", "Inscription réussie", "");
  window.ShopData.setClientSession?.({
    userId: payload.id,
    fullName: payload.fullName,
    phone: payload.phone,
    address: payload.address
  });
  registerForm.reset();
});
