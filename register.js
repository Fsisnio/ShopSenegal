const registerForm = document.getElementById("register-form");
const registerStatus = document.getElementById("register-status");
const fullNameInput = document.getElementById("full-name");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const addressInput = document.getElementById("address");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");

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
    registerStatus.textContent = "Remplissez le nom, le telephone et l'adresse.";
    return;
  }

  if (password.length < 6) {
    registerStatus.textContent = "Le mot de passe doit contenir au moins 6 caracteres.";
    return;
  }

  if (password !== confirmPassword) {
    registerStatus.textContent = "Les mots de passe ne correspondent pas.";
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
      registerStatus.textContent =
        "Ce numero ou email est deja inscrit. Essayez un autre compte.";
    } else if (result.reason === "db_error") {
      registerStatus.textContent =
        "Erreur base de donnees (Supabase). Verifiez la table users, les migrations et les politiques RLS. Details en console (F12).";
      if (result.message) console.warn("Inscription Supabase:", result.message);
    } else {
      registerStatus.textContent = "Impossible de finaliser l'inscription. Reessayez plus tard.";
    }
    return;
  }

  registerStatus.textContent =
    window.ShopData?.isSupabaseConfigured?.()
      ? "Inscription enregistree en base. Vous pouvez maintenant passer commande depuis l'accueil."
      : "Compte cree sur cet appareil uniquement : configurez Supabase pour synchroniser.";
  registerForm.reset();
});
