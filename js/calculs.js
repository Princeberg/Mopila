// === calculs.js ===

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

  if ([city, state, district, country].some(val => brazzavilleKeywords.some(k => val.includes(k)))) {
    return true;
  }
  return false;
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
    const features = (json.features || [])
      .filter(isInBrazzaville); 

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

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
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

async function updatePriceFromAddresses(startAddress, endAddress) {
  if (!startAddress || !endAddress) return { price: 0, error: 'Champs manquants' };

  const start = await geocode(startAddress);
  if (!start) return { price: 0, error: `Lieu de départ "${startAddress}" non trouvé ou hors Brazzaville.` };

  const end = await geocode(endAddress);
  if (!end) return { price: 0, error: `Lieu d'arrivée "${endAddress}" non trouvé ou hors Brazzaville.` };

  const distance = calculateDistance(start.lat, start.lon, end.lat, end.lon);
  if (distance <= 0) return { price: 0, error: 'Distance non valide' };

  return { price: calculatePrice(distance), distance };
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function attachAutocomplete(inputEl, suggestionsEl, errorEl) {
  inputEl.addEventListener(
    'input',
    debounce(async () => {
      const val = inputEl.value.trim();
      if (val.length < 3) {
        suggestionsEl.innerHTML = '';
        suggestionsEl.classList.add('d-none');
        return;
      }

      const features = await suggest(val);

      // Filtrer doublons par label
      const seenLabels = new Set();
      const uniqueFeatures = features.filter(feature => {
        const label = formatDisplayName(feature);
        if (seenLabels.has(label)) return false;
        seenLabels.add(label);
        return true;
      });

      suggestionsEl.innerHTML = '';
      if (uniqueFeatures.length === 0) {
        errorEl.textContent = 'Aucun résultat trouvé à Brazzaville';
        suggestionsEl.classList.add('d-none');
        return;
      }

      errorEl.textContent = '';
      uniqueFeatures.forEach((feature) => {
        const label = formatDisplayName(feature);
        const div = document.createElement('div');
        div.textContent = label;
        div.tabIndex = 0;
        div.className = 'suggestion-item p-2';
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => {
          inputEl.value = label;
          suggestionsEl.innerHTML = '';
          suggestionsEl.classList.add('d-none');
          inputEl.dispatchEvent(new Event('change'));
        });
        suggestionsEl.appendChild(div);
      });

      suggestionsEl.classList.remove('d-none');
    }, 300)
  );

  inputEl.addEventListener('blur', () => {
    setTimeout(() => {
      suggestionsEl.classList.add('d-none');
    }, 200);
  });
}



function createOrderPopup({ start, end, price }, onConfirm) {
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

  // === Ajout des infos trajet et prix ===
  const summary = document.createElement('div');
  summary.innerHTML = `
    <p style="margin: 0 0 10px;"><strong>Départ :</strong> ${start}</p>
    <p style="margin: 0 0 10px;"><strong>Arrivée :</strong> ${end}</p>
    <p style="margin: 0 0 20px;"><strong>Prix :</strong> ${price}</p>
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
  popup.appendChild(summary); // ✨ Infos Départ / Arrivée / Prix
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


const startInput = document.getElementById('start');
const endInput = document.getElementById('end');
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

  createOrderPopup(
    { start, end, price },
    ({ name, phone }) => {
      showNotification(`Commande confirmée pour ${name}, téléphone ${phone}`, 'success', 6000);
      console.log('Commande:', {
        start,
        end,
        price,
        clientName: name,
        clientPhone: phone,
      });
    }
  );
});

