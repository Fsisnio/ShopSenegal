/**
 * Affichage « Mon compte parrainage » (index + page parrainage.html).
 */
const ShopReferralAccount = (() => {
  const SITE_URL = "https://www.shop-senegal.com";

  function formatFcfa(amount) {
    if (window.ShopPricing?.formatFcfa) return window.ShopPricing.formatFcfa(amount);
    return `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
  }

  function rulesHtml() {
    const p = window.ShopPricing || {};
    const creditThreshold = (p.THRESHOLD_CREDIT ?? 5500).toLocaleString("fr-FR");
    const deliveryThreshold = (p.THRESHOLD_DELIVERY_DISCOUNT ?? 20000).toLocaleString("fr-FR");
    const creditAmount = p.CREDIT_AMOUNT ?? 300;
    return `
      <ul class="referral-rules">
        <li>Partagez votre code : à partir de <strong>${creditThreshold} FCFA</strong> de courses, vous et votre filleul recevez <strong>${creditAmount} FCFA</strong> chacun.</li>
        <li>À partir de <strong>${deliveryThreshold} FCFA</strong>, votre filleul bénéficie de <strong>−50 %</strong> sur la livraison.</li>
        <li>Votre crédit est déduit automatiquement lorsque votre commande est marquée <strong>payée</strong>.</li>
      </ul>
    `;
  }

  function buildInviteMessage(user) {
    const p = window.ShopPricing || {};
    const code = user.referralCode || "";
    const creditThreshold = (p.THRESHOLD_CREDIT ?? 5500).toLocaleString("fr-FR");
    const deliveryThreshold = (p.THRESHOLD_DELIVERY_DISCOUNT ?? 20000).toLocaleString("fr-FR");
    const creditAmount = p.CREDIT_AMOUNT ?? 300;
    const session = window.ShopData?.getClientSession?.();
    const firstName = session?.fullName?.trim().split(/\s+/)[0] || "";
    const greeting = firstName ? `Bonjour ! C'est ${firstName}.` : "Bonjour !";

    return [
      greeting,
      "",
      "Je vous invite sur ShopSenegal pour vos courses à Thiès 🛒",
      "",
      `🎁 Mon code parrain : ${code}`,
      `🌐 Site : ${SITE_URL}`,
      "",
      "Entrez ce code au checkout lors de votre commande :",
      `• +${creditAmount} FCFA pour vous et moi dès ${creditThreshold} FCFA de courses`,
      `• −50 % sur la livraison pour vous dès ${deliveryThreshold} FCFA`,
      "",
      "Inscrivez-vous et commandez sur ShopSenegal — Experience Teranga !"
    ].join("\n");
  }

  function whatsAppShareUrl(message) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  async function copyText(text, button, okLabel, defaultLabel) {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = okLabel;
      setTimeout(() => {
        button.textContent = defaultLabel;
      }, 2000);
    } catch {
      button.textContent = "Copie impossible";
    }
  }

  async function shareInvite(user, button) {
    const message = buildInviteMessage(user);
    if (!message.trim()) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "ShopSenegal — Parrainage",
          text: message,
          url: SITE_URL
        });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }

    window.open(whatsAppShareUrl(message), "_blank", "noopener,noreferrer");
    if (button) {
      const prev = button.textContent;
      button.textContent = "WhatsApp ouvert…";
      setTimeout(() => {
        button.textContent = prev;
      }, 2000);
    }
  }

  function wireInviteActions(panel, user) {
    const inviteBtn = panel.querySelector("#invite-referral-friend");
    const copyInviteBtn = panel.querySelector("#copy-referral-invite");

    inviteBtn?.addEventListener("click", () => shareInvite(user, inviteBtn));
    copyInviteBtn?.addEventListener("click", async () => {
      const message = buildInviteMessage(user);
      if (!message.trim()) return;
      await copyText(message, copyInviteBtn, "Message copié !", "Copier le message");
    });
  }

  function renderGuest(panel) {
    panel.innerHTML = `
      <p class="muted">Connectez-vous avec votre numéro de téléphone pour voir votre code parrain et votre solde.</p>
      <div class="referral-account__actions">
        <a class="btn-link" href="login.html">Se connecter</a>
        <a class="btn-link btn-link--ghost" href="register.html">Créer un compte</a>
      </div>
      ${rulesHtml()}
    `;
  }

  function renderUser(panel, user) {
    const credit = user.referralCreditFcfa || 0;
    panel.innerHTML = `
      <div class="referral-account__grid">
        <div class="referral-account__stat">
          <span class="referral-account__label">Votre code parrain</span>
          <strong class="referral-account__code" id="referral-code-display">${user.referralCode || "—"}</strong>
          <button type="button" class="table-btn" id="copy-referral-code">Copier le code</button>
        </div>
        <div class="referral-account__stat referral-account__stat--balance">
          <span class="referral-account__label">Solde crédit parrainage</span>
          <strong class="referral-account__balance">${formatFcfa(credit)}</strong>
          <p class="muted">Utilisé automatiquement quand votre commande est payée.</p>
        </div>
      </div>
      <div class="referral-account__invite">
        <h3>Inviter des amis</h3>
        <p class="muted">Partagez ShopSenegal avec un message prêt à envoyer, incluant votre code parrain.</p>
        <div class="referral-account__actions">
          <button type="button" class="btn-link" id="invite-referral-friend">Inviter un ami</button>
          <button type="button" class="table-btn" id="copy-referral-invite">Copier le message</button>
        </div>
      </div>
      ${rulesHtml()}
      <div class="referral-account__actions">
        <a class="btn-link" href="index.html#commande">Commander maintenant</a>
      </div>
    `;

    const copyBtn = panel.querySelector("#copy-referral-code");
    copyBtn?.addEventListener("click", async () => {
      const code = user.referralCode || "";
      if (!code) return;
      await copyText(code, copyBtn, "Code copié !", "Copier le code");
    });

    wireInviteActions(panel, user);
  }

  async function renderInto(panelEl) {
    if (!panelEl) return null;
    const session = window.ShopData?.getClientSession?.();
    if (!session?.phone) {
      renderGuest(panelEl);
      return null;
    }
    const user = await window.ShopData.getUserByPhone(session.phone);
    if (!user?.referralCode) {
      panelEl.innerHTML = `
        <p class="muted">Compte trouvé, mais aucun code parrain n'est encore associé à votre profil.</p>
        <div class="referral-account__actions">
          <a class="btn-link" href="register.html">Contacter le support / réinscription</a>
        </div>
        ${rulesHtml()}
      `;
      return user;
    }
    renderUser(panelEl, user);
    return user;
  }

  return { renderInto, formatFcfa, buildInviteMessage };
})();

window.ShopReferralAccount = ShopReferralAccount;
