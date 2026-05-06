const driversRoot = document.getElementById("drivers-root");

async function initDriversPage() {
  const drivers = await window.ShopData.getDrivers();
  driversRoot.innerHTML = "";
  drivers.forEach((driver) => {
    const card = document.createElement("article");
    card.className = "person-card";
    card.innerHTML = `
      <img class="person-photo" src="${driver.photo}" alt="Photo de ${driver.firstName} ${driver.lastName}" />
      <h3>Nom: ${driver.lastName}</h3>
      <p>Prenom: ${driver.firstName}</p>
      <p class="person-zone">Zone: ${driver.zone}</p>
    `;
    driversRoot.appendChild(card);
  });
}

initDriversPage();
