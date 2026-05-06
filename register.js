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

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fullName = fullNameInput.value.trim();
  const phone = normalizePhone(phoneInput.value.trim());
  const email = emailInput.value.trim();
  const address = addressInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

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
    registerStatus.textContent =
      "Ce numero ou email est deja inscrit. Essayez un autre.";
    return;
  }

  registerStatus.textContent = "Inscription reussie. Vous pouvez maintenant commander.";
  registerForm.reset();
});
