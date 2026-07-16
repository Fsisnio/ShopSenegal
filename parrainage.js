/**
 * Page « Mon compte parrainage ».
 */
async function initParrainagePage() {
  const panel = document.getElementById("referral-account-panel");
  await window.ShopReferralAccount?.renderInto(panel);
}

initParrainagePage();
