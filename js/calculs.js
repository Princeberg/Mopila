import { places } from './places.js';
import { createOrder } from './order.js';

const startSelect = document.getElementById("start");
const endSelect = document.getElementById("end");
const priceInput = document.getElementById("price");
const orderButton = document.querySelector("button[onclick='openPopup()']");
const clientNameInput = document.getElementById("clientName");
const clientPhoneInput = document.getElementById("clientPhone");

// Populate dropdowns
places.forEach(place => {
  const value = JSON.stringify([place.lat, place.lon]);
  startSelect.appendChild(new Option(place.name, value));
  endSelect.appendChild(new Option(place.name, value));
});

// Calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Round price to nearest 100
function roundToNextHundred(number) {
  return Math.ceil(number / 100) * 100;
}

// Update price based on selected points
function updatePrice() {
  if (!startSelect.value || !endSelect.value) {
    priceInput.value = "";
    orderButton.disabled = true;
    return;
  }

  if (startSelect.value === endSelect.value) {
    priceInput.value = "0 FCFA";
    showPopup("Le point de départ et d'arrivée doivent être différents.", "error");
    orderButton.disabled = true;
    return;
  }

  const startCoords = JSON.parse(startSelect.value);
  const endCoords = JSON.parse(endSelect.value);
  const distance = calculateDistance(...startCoords, ...endCoords);

  const baseFare = 1300;
  const pricePerKm = 150;
  const total = baseFare + distance * pricePerKm;
  const roundedPrice = roundToNextHundred(total);

  priceInput.value = `${roundedPrice} FCFA`;
  orderButton.disabled = roundedPrice === 0;
}

startSelect.addEventListener("change", updatePrice);
endSelect.addEventListener("change", updatePrice);

// Show booking popup
window.openPopup = function () {
  if (!priceInput.value || priceInput.value === "0 FCFA") {
    showPopup("Veuillez sélectionner des points valides.", "error");
    return;
  }
  document.getElementById("popup").style.display = "block";
};

// Close booking popup
window.closePopup = function () {
  document.getElementById("popup").style.display = "none";
};

// Submit order to Supabase
window.submitOrder = async function () {
  const name = clientNameInput.value.trim();
  const phone = clientPhoneInput.value.trim();

  if (!name || !phone) {
    showPopup("Veuillez entrer votre nom et téléphone.", "error");
    return;
  }

  const startName = startSelect.options[startSelect.selectedIndex].text;
  const endName = endSelect.options[endSelect.selectedIndex].text;
  const price = priceInput.value;

  const { success, error } = await createOrder({
    start: startName,
    end: endName,
    price,
    client: name,
    phoneNumber: phone,
  });

  if (success) {
    showPopup(`Merci ${name}, votre course est enregistrée !`, "success");
    closePopup();

    // Reset form fields after successful submission
    clientNameInput.value = "";
    clientPhoneInput.value = "";
    startSelect.selectedIndex = 0;
    endSelect.selectedIndex = 0;
    priceInput.value = "";
    orderButton.disabled = true;
  } else {
    showPopup("Erreur lors de l'enregistrement. Réessayez.", "error");
    console.error("Order error:", error);
  }
};

// Toast popup function
function showPopup(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `popup-toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 50);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
