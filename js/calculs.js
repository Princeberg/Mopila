import L from 'leaflet';

const cache = {};
const brazzavilleKeywords = [
  'makélékélé',
  'poto-poto',
  'bacongo',
  'madibou',
  'moungali',
  'talangaï',
  'ouenzé',
  'djiri',
  'kintélé'
];

function cleanString(str) {
  return (str || '').toLowerCase().trim();
}

function isInBrazzaville(place) {
  const props = place.properties || {};
  const city = cleanString(props.city || props.town || props.village);
  const state = cleanString(props.state || '');
  const district = cleanString(props.district || props.suburb || props.neighbourhood);
  const country = cleanString(props.country || '');

  return [city, state, district, country].some(val =>
    brazzavilleKeywords.some(k => val.includes(k))
  );
}

function cleanQuery(input) {
  let cleaned = input.replace(/\s*\(.*?\)\s*/g, '');
  if (!cleaned.toLowerCase().includes('brazzaville')) {
    cleaned += ', Brazzaville';
  }
  return cleaned.trim();
}

function formatDisplayName(place) {
  const p = place.properties || {};
  const name = p.name || '';
  const street = p.street || '';
  const housenumber = p.housenumber || '';
  let district = p.district || p.suburb || p.neighbourhood || '';
  let city = p.city || p.town || p.village || '';

  district = district.trim();
  city = city.trim();

  const parts = [];
  if (name) parts.push(name);
  if (housenumber || street) parts.push(`${housenumber} ${street}`.trim());
  if (district && district.toLowerCase() !== name.toLowerCase()) parts.push(district);
  else if (city && city.toLowerCase() !== name.toLowerCase()) parts.push(city);

  return parts.filter(Boolean).join(', ');
}

function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function readCache(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function suggest(inputValue) {
  if (!inputValue || inputValue.length < 3) return [];

  const query = cleanQuery(inputValue);
  if (cache[query]) return cache[query];

  const local = readCache(query);
  if (local) {
    cache[query] = local;
    return local;
  }

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=7&lang=fr`;
    const res = await fetch(url);
    const json = await res.json();
    const features = (json.features || []).filter(isInBrazzaville);

    cache[query] = features;
    saveCache(query, features);

    return features;
  } catch (e) {
    console.error('Erreur Photon:', e);
    return [];
  }
}

async function geocode(address) {
  const cleaned = cleanQuery(address);
  const suggestions = await suggest(cleaned);
  const place = suggestions[0];
  if (!place) return null;

  return {
    lat: place.geometry.coordinates[1],
    lon: place.geometry.coordinates[0],
    display_name: formatDisplayName(place),
  };
}

// Calcul distance à vol d'oiseau (en km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function roundToNextHundred(number) {
  return Math.ceil(number / 100) * 100;
}

function calculatePrice(distanceKm) {
  const baseFare = 1500;
  const pricePerKm = 150;
  return roundToNextHundred(baseFare + distanceKm * pricePerKm);
}

// Récupérer itinéraire OSRM avec durée et tracé
async function getRoute(start, end) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) {
      return null;
    }
    const route = json.routes[0];
    return {
      duration: route.duration, // en secondes
      distance: route.distance, // en mètres
      geometry: route.geometry, // GeoJSON LineString
    };
  } catch (e) {
    console.error('Erreur OSRM:', e);
    return null;
  }
}

async function updatePriceAndRouteFromAddresses(startAddress, endAddress) {
  if (!startAddress || !endAddress) return { price: 0, error: 'Champs manquants' };

  const start = await geocode(startAddress);
  if (!start) return { price: 0, error: `Lieu de départ "${startAddress}" non trouvé ou hors Brazzaville.` };

  const end = await geocode(endAddress);
  if (!end) return { price: 0, error: `Lieu d'arrivée "${endAddress}" non trouvé ou hors Brazzaville.` };

  const route = await getRoute(start, end);
  if (!route) return { price: 0, error: 'Impossible de calculer l’itinéraire.' };

  const distanceKm = route.distance / 1000;
  const durationMin = route.duration / 60;

  if (distanceKm <= 0) return { price: 0, error: 'Distance non valide' };

  return {
    price: calculatePrice(distanceKm),
    distance: distanceKm,
    duration: durationMin,
    geometry: route.geometry,
    start,
    end
  };
}

// --- Leaflet carte et tracé

let map;
let routeLayer;

function initMap(containerId = 'map') {
  if (map) return map; // init une seule fois
  map = L.map(containerId).setView([-4.269, 15.284], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  return map;
}

function drawRouteOnMap(geometry) {
  if (routeLayer) {
    map.removeLayer(routeLayer);
  }
  routeLayer = L.geoJSON(geometry, { style: { color: 'blue', weight: 5 } }).addTo(map);
  map.fitBounds(routeLayer.getBounds());
}

// Mise à jour UI (DOM) des infos tarif, distance, durée et tracé carte
async function onAddressesChanged(startAddress, endAddress) {
  const map = initMap('map');
  const result = await updatePriceAndRouteFromAddresses(startAddress, endAddress);

  const routeInfoSection = document.getElementById('route-info');
  const priceInfo = document.getElementById('price-info');
  const distanceInfo = document.getElementById('distance-info');
  const durationInfo = document.getElementById('duration-info');

  if (result.error) {
    routeInfoSection.classList.add('d-none');
    alert(result.error);
    return;
  }

  priceInfo.textContent = `Prix estimé : ${result.price} FCFA`;
  distanceInfo.textContent = `Distance : ${result.distance.toFixed(2)} km`;
  durationInfo.textContent = `Durée approximative : ${result.duration.toFixed(1)} min`;
  routeInfoSection.classList.remove('d-none');

  drawRouteOnMap(result.geometry);
}

// Fonction pratique pour attacher autocomplétion et écoute sur inputs (exemple)
function attachAutocomplete(startInput, endInput) {
  startInput.addEventListener('input', () => {
    if (startInput.value.trim() && endInput.value.trim()) {
      onAddressesChanged(startInput.value.trim(), endInput.value.trim());
    }
  });
  endInput.addEventListener('input', () => {
    if (startInput.value.trim() && endInput.value.trim()) {
      onAddressesChanged(startInput.value.trim(), endInput.value.trim());
    }
  });
}

export {
  suggest,
  geocode,
  updatePriceAndRouteFromAddresses,
  initMap,
  drawRouteOnMap,
  onAddressesChanged,
  attachAutocomplete
};





// ... [Garde intact tout le haut du fichier jusqu'à la fin du bloc attachAutocomplete(...)] ...

// ... AUTOCOMPLETE ALREADY PRESENT ...
// ... CONTINUE FROM createOrderPopup with `more` included and POST logic ...

function createOrderPopup({ start, end, price, more }, onConfirm) {
  const overlay = document.createElement('div');
  overlay.id = 'order-popup-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '10000';

  const popup = document.createElement('div');
  popup.id = 'order-popup';
  popup.style.backgroundColor = '#fff';
  popup.style.borderRadius = '12px';
  popup.style.padding = '24px';
  popup.style.width = '90%';
  popup.style.maxWidth = '400px';
  popup.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
  popup.style.fontFamily = "'Uber Move Text', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

  const title = document.createElement('h2');
  title.textContent = 'Confirmer la commande';
  title.style.marginBottom = '20px';
  title.style.fontWeight = '700';
  title.style.color = '#000';

  const summary = document.createElement('div');
  summary.innerHTML = `
    <p style="margin: 0 0 10px;"><strong>Départ :</strong> ${start}</p>
    <p style="margin: 0 0 10px;"><strong>Arrivée :</strong> ${end}</p>
    <p style="margin: 0 0 10px;"><strong>Description :</strong> ${more || 'Aucune'}</p>
    <p style="margin: 0 0 20px;"><strong>Estimation du prix :</strong> ${price}</p>
  `;
  summary.style.fontSize = '15px';
  summary.style.color = '#333';

  const inputName = document.createElement('input');
  inputName.type = 'text';
  inputName.placeholder = 'Nom du client';
  inputName.style.width = '100%';
  inputName.style.padding = '12px';
  inputName.style.marginBottom = '15px';
  inputName.style.border = '1px solid #ccc';
  inputName.style.borderRadius = '6px';
  inputName.style.fontSize = '16px';

  const inputPhone = document.createElement('input');
  inputPhone.type = 'tel';
  inputPhone.placeholder = 'Téléphone (+242...)';
  inputPhone.style.width = '100%';
  inputPhone.style.padding = '12px';
  inputPhone.style.marginBottom = '20px';
  inputPhone.style.border = '1px solid #ccc';
  inputPhone.style.borderRadius = '6px';
  inputPhone.style.fontSize = '16px';

  inputPhone.addEventListener('focus', () => {
    if (!inputPhone.value.startsWith('+242')) {
      inputPhone.value = '+242';
      setTimeout(() => inputPhone.setSelectionRange(inputPhone.value.length, inputPhone.value.length), 0);
    }
  });

  const btnConfirm = document.createElement('button');
  btnConfirm.textContent = 'Confirmer';
  btnConfirm.style.backgroundColor = '#000';
  btnConfirm.style.color = '#fff';
  btnConfirm.style.border = 'none';
  btnConfirm.style.borderRadius = '6px';
  btnConfirm.style.padding = '12px';
  btnConfirm.style.width = '100%';
  btnConfirm.style.fontSize = '16px';
  btnConfirm.style.fontWeight = '700';
  btnConfirm.style.cursor = 'pointer';
  btnConfirm.style.transition = 'background-color 0.3s ease';

  btnConfirm.addEventListener('mouseenter', () => {
    btnConfirm.style.backgroundColor = '#333';
  });
  btnConfirm.addEventListener('mouseleave', () => {
    btnConfirm.style.backgroundColor = '#000';
  });

  btnConfirm.addEventListener('click', () => {
    const name = inputName.value.trim();
    const phone = inputPhone.value.trim();

    if (!name) {
      alert('Veuillez saisir le nom du client.');
      return;
    }
    if (!phone || !phone.match(/^\+242\d{7,9}$/)) {
      alert('Veuillez saisir un numéro de téléphone valide commençant par +242.');
      return;
    }

    onConfirm({ name, phone });
    document.body.removeChild(overlay);
  });

  popup.appendChild(title);
  popup.appendChild(summary);
  popup.appendChild(inputName);
  popup.appendChild(inputPhone);
  popup.appendChild(btnConfirm);

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}


// === NOTIFICATIONS ===
const notificationContainer = document.getElementById('notification-container');

function showNotification(message, type = 'success', duration = 4000) {
  if (!notificationContainer) return;

  const popup = document.createElement('div');
  popup.className = 'popup-notification ' + (type === 'error' ? 'popup-error' : 'popup-success');
  popup.textContent = message;

  notificationContainer.appendChild(popup);

  setTimeout(() => {
    popup.style.animation = 'popupFadeOut 0.3s forwards';
    popup.addEventListener('animationend', () => {
      popup.remove();
    });
  }, duration);
}


// === GESTION DES ÉVÉNEMENTS ===
const startInput = document.getElementById('start');
const endInput = document.getElementById('end');
const moreInput = document.getElementById('more');
const priceInput = document.getElementById('price');
const orderBtn = document.getElementById('order-btn');
const errorStart = document.getElementById('error-start');
const errorEnd = document.getElementById('error-end');

const suggestionsStart = document.getElementById('suggestions-start');
const suggestionsEnd = document.getElementById('suggestions-end');

attachAutocomplete(startInput, suggestionsStart, errorStart);
attachAutocomplete(endInput, suggestionsEnd, errorEnd);

async function onInputChange() {
  errorStart.textContent = '';
  errorEnd.textContent = '';
  priceInput.value = '';
  orderBtn.disabled = true;

  const start = startInput.value.trim();
  const end = endInput.value.trim();

  if (start.length < 3 || end.length < 3) return;

  const result = await updatePriceFromAddresses(start, end);
  if (result.error) {
    if (result.error.toLowerCase().includes('départ')) {
      errorStart.textContent = result.error;
      showNotification(result.error, 'error');
    } else if (result.error.toLowerCase().includes('arrivée')) {
      errorEnd.textContent = result.error;
      showNotification(result.error, 'error');
    } else {
      showNotification(result.error, 'error');
    }
    orderBtn.disabled = true;
  } else {
    const priceStr = result.price.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' });
    priceInput.value = priceStr;
    orderBtn.disabled = false;
    showNotification(`Prix calculé : ${priceStr}`, 'success');
  }
}

startInput.addEventListener('change', onInputChange);
endInput.addEventListener('change', onInputChange);

orderBtn.addEventListener('click', () => {
  const start = startInput.value.trim();
  const end = endInput.value.trim();
  const price = priceInput.value.trim();
  const more = moreInput.value.trim();

  createOrderPopup({ start, end, price, more }, async ({ name, phone }) => {
    // Popup de confirmation réussie
    showNotification(`Commande confirmée pour ${name}`, 'success', 4000);

    // Envoi vers Supabase
    const result = await createOrder({
      start,
      end,
      more,
      price,
      client: name,
      phoneNumber: phone,
    });

    if (result.success) {
  showNotification('✅ Votre commande a bien été enregistrée. Un chauffeur vous contactera bientôt.', 'success', 8000);

  startInput.value = '';
  endInput.value = '';
  moreInput.value = '';
  priceInput.value = '';
} else {
  showNotification('❌ Erreur lors de l’enregistrement : ' + result.error, 'error', 6000);
}

  });
});



