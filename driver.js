import { supabase } from '../Api/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  createNotificationSystem();
  setupLogout();
  setupHelpButton();
  setupRealTimeClock();
  setupAutoRefresh();

  let driverData = null;
  try {
    driverData = JSON.parse(localStorage.getItem('driver'));
    console.log("Driver data from localStorage:", driverData);
  } catch (e) {
    console.warn("Erreur lors de la lecture du driver dans localStorage", e);
    driverData = null;
  }

  if (!driverData || !driverData.id) {
    showNotification("Veuillez vous connecter", "error");
    setTimeout(() => window.location.href = 'login.html', 2000);
    return;
  }
  const driverId = driverData.id;

  // Fetch driver info and display
  await loadAndDisplayDriverInfo(driverId);

  // Load and display pinned orders
  await loadPinnedOrders(driverId);
});

async function loadAndDisplayDriverInfo(driverId) {
  try {
    const { data: driver, error } = await supabase
      .from('Drivers')
      .select('Pseudo, PictureLink')
      .eq('id', driverId)
      .single();

    if (error) throw error;

    // Display pseudo and picture
    const pseudoEls = document.querySelectorAll('.driver-name');
    pseudoEls.forEach(el => el.textContent = driver.Pseudo || 'Chauffeur');

    const avatarEls = document.querySelectorAll('.driver-avatar');
    avatarEls.forEach(el => {
      el.src = driver.PictureLink || 'https://mdtcifra.ru/wp-content/uploads/2021/05/no-photo.png';
      el.alt = `Photo de ${driver.Pseudo || 'chauffeur'}`;
    });

  } catch (error) {
    showNotification("Erreur lors du chargement des infos du chauffeur", "error");
    console.error(error);
  }
}

async function loadPinnedOrders(driverId) {
  try {
    const { data: orders, error } = await supabase
      .from('Orders')
      .select('*')
      .eq('Statut', 'pinned');

    if (error) throw error;

    const container = document.getElementById('orders-container');

    if (!orders || orders.length === 0) {
      container.innerHTML = '<p>Aucune commande disponible pour le moment.</p>';
      return;
    }

    renderOrderSwiper(orders, driverId);
  } catch (error) {
    showNotification("Erreur lors du chargement des commandes", "error");
    console.error(error);
  }
}

function renderOrderSwiper(orders, driverId) {
  const container = document.getElementById('orders-container');
  container.innerHTML = ''; // Clear previous

  // Wrapper div with swiper-wrapper class
  const swiperWrapper = document.createElement('div');
  swiperWrapper.className = 'swiper-wrapper';

  orders.forEach(order => {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';

    slide.innerHTML = `
      <div class="order-card">
        <h3>Point de départ : <span>${order.Start}</span></h3>
        <h3>Point d'arrivée : <span>${order.End}</span></h3>
        <h4>Tarif de la course : <span>${order.Price}</span></h4>
        <button class="btn btn-accept" data-order-id="${order.id}" data-phone="${order.PhoneNumber}">Accepter</button>
      </div>
    `;

    swiperWrapper.appendChild(slide);
  });

  container.appendChild(swiperWrapper);

  addSwiperStyles();

  simpleSwiper(swiperWrapper);

  container.querySelectorAll('.btn-accept').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.dataset.orderId;
      const phone = btn.dataset.phone;
      acceptOrder(orderId, driverId, phone);
    });
  });
}

function addSwiperStyles() {
  if (document.getElementById('swiper-styles')) return;

  const style = document.createElement('style');
  style.id = 'swiper-styles';
  style.textContent = `
    #orders-container {
      max-width: 400px;
      margin: 30px auto;
      position: relative;
      overflow: hidden;
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
      background: #fff; /* keep light bg */
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .swiper-wrapper {
      display: flex;
      transition: transform 0.8s ease-in-out;
      will-change: transform;
    }
    .swiper-slide {
      min-width: 100%;
      padding: 20px;
      box-sizing: border-box;
      animation: fadeInSlide 0.8s ease forwards;
    }
    @keyframes fadeInSlide {
      from { opacity: 0; transform: translateX(50px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .order-card h3, .order-card h4 {
      margin: 8px 0;
      font-weight: 600;
    }
    .order-card span {
      font-weight: 400;
      color: #555;
    }
    .btn-accept {
      margin-top: 15px;
      padding: 12px 25px;
      background-color: #00a650;
      color: white;
      font-weight: 700;
      border: none;
      border-radius: 30px;
      cursor: pointer;
      transition: background-color 0.3s ease;
      width: 100%;
      box-shadow: 0 5px 15px rgba(0,166,80,0.4);
    }
    .btn-accept:hover {
      background-color: #007a38;
    }
  `;
  document.head.appendChild(style);
}

function simpleSwiper(wrapper) {
  let currentIndex = 0;
  const slides = wrapper.querySelectorAll('.swiper-slide');
  if (slides.length <= 1) return;

  setInterval(() => {
    currentIndex = (currentIndex + 1) % slides.length;
    const offset = -currentIndex * 100;
    wrapper.style.transform = `translateX(${offset}%)`;
  }, 5000);
}

async function acceptOrder(orderId, driverId, phoneNumber) {
  try {
    showNotification("Acceptation de la commande...", "success");

    const { error: orderError } = await supabase
      .from('Orders')
      .update({ Statut: 'Accepted' })
      .eq('id', orderId);

    if (orderError) throw orderError;

    const { data: orderData, error: fetchOrderError } = await supabase
      .from('Orders')
      .select('Price')
      .eq('id', orderId)
      .single();

    if (fetchOrderError) throw fetchOrderError;
    if (!orderData) throw new Error("Commande introuvable après acceptation.");

    const price = parseFloat(orderData.Price);
    if (isNaN(price)) throw new Error("Prix invalide.");

    const agencyRevenue = price * 0.05;

    const { error: insertCourseError } = await supabase
      .from('Courses')
      .insert([{
        Order_id: orderId,
        Driver_id: driverId,
        Revenu: agencyRevenue.toFixed(2),
      }]);

    if (insertCourseError) throw insertCourseError;

    window.open(`tel:${phoneNumber}`, '_self');

    showNotification("Commande acceptée !", "success");

    // Reload orders after 2 seconds
    setTimeout(() => loadPinnedOrders(driverId), 2000);

  } catch (error) {
    showNotification("Erreur lors de l'acceptation", "error");
    console.error(error);
  }
}

function createNotificationSystem() {
  if (!document.getElementById('uber-notification')) {
    const notification = document.createElement('div');
    notification.id = 'uber-notification';
    notification.className = 'uber-notification hidden';
    document.body.appendChild(notification);

    const style = document.createElement('style');
    style.textContent = `
      .uber-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        transform: translateX(150%);
        transition: transform 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 300px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
      .uber-notification.success { background: #00a650; }
      .uber-notification.error { background: #e62143; }
      .uber-notification.visible { transform: translateX(0); }
      .uber-notification i { font-size: 20px; }
    `;
    document.head.appendChild(style);
  }
}

function showNotification(message, type) {
  const notification = document.getElementById('uber-notification');
  notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      ${message}
  `;
  notification.className = `uber-notification ${type} visible`;

  setTimeout(() => {
    notification.classList.remove('visible');
  }, 5000);
}

function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('driver');
      window.location.href = 'login.html';
    });
  }
}

function setupHelpButton() {
  const helpBtn = document.getElementById('help-btn');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      window.open('https://wa.me/89604663774', '_blank');
    });
  }
}

function setupRealTimeClock() {
  function updateClock() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const clockElement = document.getElementById('real-time-clock');
    if (clockElement) {
      clockElement.innerHTML = `
          <div>${dateStr}</div>
          <div>${timeStr}</div>
      `;
    }
  }

  updateClock();
  setInterval(updateClock, 60000);
}

function setupAutoRefresh() {
  setInterval(() => {
    location.reload();
  }, 300000); // every 5 minutes
}
