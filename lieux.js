const placesRoot = document.getElementById("places-root");

async function initPlacesPage() {
  const places = await window.ShopData.getPlaces();
  placesRoot.innerHTML = "";

  if (places.length === 0) {
    placesRoot.innerHTML =
      '<p class="muted">Aucun marché de Thiès configuré pour le moment.</p>';
    return;
  }

  const intro = document.createElement("p");
  intro.className = "muted";
  intro.style.marginBottom = "1rem";
  intro.textContent = `${places.length} marché(s) et lieu(x) d'emplette à Thiès.`;
  placesRoot.appendChild(intro);

  places.forEach((place) => {
    const item = document.createElement("article");
    item.className = "place-item";
    item.innerHTML = `
      <strong>${place.name}</strong>
      <p>Thiès — ${place.area || "Sénégal"}</p>
    `;
    placesRoot.appendChild(item);
  });
}

initPlacesPage();
