const lookupForm = document.getElementById("reset-lookup-form");
const resetForm = document.getElementById("reset-form");
const resetStatus = document.getElementById("reset-status");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const nameInput = document.getElementById("full-name");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const emailField = document.getElementById("email-field");
const nameField = document.getElementById("name-field");
const identityHint = document.getElementById("reset-identity-hint");
const backButton = document.getElementById("reset-back");

let pendingPhone = "";
let pendingHasEmail = false;

function isPublicProduction() {
  return Boolean(window.ShopSite?.isPublicProduction?.());
}

function publicResetFeedback(type, title) {
  if (type === "success") {
    return {
      title: "Mot de passe mis à jour",
      message: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe."
    };
  }
  if (type === "warn") {
    const hints = {
      "Formulaire incomplet": "Remplissez tous les champs demandés.",
      "Compte introuvable": "Aucun compte avec ce numéro. Vérifiez le numéro ou créez un compte.",
      "Identité non reconnue": "Les informations ne correspondent pas à ce compte.",
      "Mot de passe trop court": "Le mot de passe doit contenir au moins 6 caractères.",
      "Mots de passe différents": "Les deux mots de passe saisis ne correspondent pas."
    };
    if (hints[title]) return { title, message: hints[title] };
  }
  return {
    title: title || "Réinitialisation impossible",
    message:
      "Nous n'avons pas pu modifier le mot de passe. Réessayez ou contactez-nous sur WhatsApp au " +
      (window.ShopContact?.display || "+221 766226601") +
      "."
  };
}

function notify(type, title, message) {
  const prod = isPublicProduction();
  const pub = prod ? publicResetFeedback(type, title) : { title, message };
  const display =
    prod && type === "success" && message ? { title: pub.title, message } : pub;

  if (resetStatus) {
    if (prod) {
      resetStatus.classList.add("login-status--prod-hidden");
      resetStatus.textContent = "";
    } else {
      resetStatus.classList.remove("login-status--prod-hidden");
      resetStatus.textContent = message;
    }
  }

  if (!window.ShopFeedback) return;
  if (type === "success") window.ShopFeedback.success(display.title, display.message);
  else if (type === "error") window.ShopFeedback.error(display.title, display.message);
  else window.ShopFeedback.warn(display.title, display.message);
}

function showLookup() {
  pendingPhone = "";
  pendingHasEmail = false;
  lookupForm?.removeAttribute("hidden");
  resetForm?.setAttribute("hidden", "");
  emailField?.setAttribute("hidden", "");
  nameField?.setAttribute("hidden", "");
  emailInput?.removeAttribute("required");
  nameInput?.removeAttribute("required");
  resetForm?.reset();
  phoneInput?.focus();
}

function showResetStep(hasEmail) {
  pendingHasEmail = Boolean(hasEmail);
  lookupForm?.setAttribute("hidden", "");
  resetForm?.removeAttribute("hidden");

  if (pendingHasEmail) {
    emailField?.removeAttribute("hidden");
    nameField?.setAttribute("hidden", "");
    emailInput?.setAttribute("required", "");
    nameInput?.removeAttribute("required");
    if (identityHint) {
      identityHint.textContent =
        "Ce compte a un email. Saisissez-le pour confirmer votre identité, puis choisissez un nouveau mot de passe.";
    }
    emailInput?.focus();
  } else {
    emailField?.setAttribute("hidden", "");
    nameField?.removeAttribute("hidden");
    emailInput?.removeAttribute("required");
    nameInput?.setAttribute("required", "");
    if (identityHint) {
      identityHint.textContent =
        "Saisissez le nom complet utilisé à l'inscription, puis choisissez un nouveau mot de passe.";
    }
    nameInput?.focus();
  }
}

lookupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const phone = phoneInput?.value?.trim() || "";
  if (!phone) {
    notify("warn", "Formulaire incomplet", "Indiquez votre numéro de téléphone.");
    return;
  }

  const result = await window.ShopData.preparePasswordReset(phone);
  if (!result?.ok) {
    if (result?.reason === "not_found") {
      notify(
        "warn",
        "Compte introuvable",
        "Aucun compte avec ce numéro. Vérifiez le numéro ou créez un compte."
      );
    } else {
      notify("error", "Recherche impossible", "Réessayez dans quelques instants.");
    }
    return;
  }

  pendingPhone = phone;
  showResetStep(result.hasEmail);
});

resetForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = passwordInput?.value || "";
  const confirmPassword = confirmPasswordInput?.value || "";

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
      "Les deux mots de passe saisis ne correspondent pas."
    );
    return;
  }

  const result = await window.ShopData.resetPassword({
    phone: pendingPhone,
    email: emailInput?.value || "",
    fullName: nameInput?.value || "",
    newPassword: password
  });

  if (!result?.ok) {
    if (result?.reason === "not_found") {
      notify("warn", "Compte introuvable", "Aucun compte avec ce numéro.");
    } else if (result?.reason === "identity_mismatch") {
      notify(
        "warn",
        "Identité non reconnue",
        pendingHasEmail
          ? "L'email ne correspond pas à ce compte."
          : "Le nom ne correspond pas à ce compte."
      );
    } else {
      notify("error", "Mise à jour échouée", "Impossible d'enregistrer le mot de passe pour le moment.");
    }
    return;
  }

  notify("success", "Mot de passe mis à jour", "Redirection vers la connexion…");
  window.setTimeout(() => {
    window.location.assign("login.html");
  }, 1100);
});

backButton?.addEventListener("click", showLookup);
