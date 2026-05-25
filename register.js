const registerForm = document.getElementById("register-form");
const registerStatus = document.getElementById("register-status");
const fullNameInput = document.getElementById("full-name");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const addressInput = document.getElementById("address");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");

function notify(type, title, message) {
  if (registerStatus) registerStatus.textContent = message;
  if (!window.ShopFeedback) return;
  if (type === "success") window.ShopFeedback.success(title, message);
  else if (type === "error") window.ShopFeedback.error(title, message);
  else window.ShopFeedback.warn(title, message);
}

function normalizePhone(value) {
  return value.replace(/\s+/g, "");
}

function initRegisterNotice() {
  if (!registerStatus || !window.ShopData?.isSupabaseConfigured) return;
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

  const inDb = window.ShopData?.isSupabaseConfigured?.();
  notify(
    "success",
    "Inscription réussie",
    inDb
      ? "Votre compte est enregistré. Vous pouvez maintenant passer commande depuis l'accueil."
      : "Compte créé sur cet appareil uniquement. Configurez Supabase sur le serveur pour synchroniser avec la base."
  );
  registerForm.reset();
});
