const placesRoot = document.getElementById("places-root");

async function initPlacesPage() {
  const places = await window.ShopData.getPlaces();
  placesRoot.innerHTML = "";
  places.forEach((place) => {
    const item = document.createElement("article");
    item.className = "place-item";
    item.innerHTML = `
      <strong>${place.name}</strong>
      <p>Zone: ${place.area}</p>
    `;
    placesRoot.appendChild(item);
  });
}

initPlacesPage();
