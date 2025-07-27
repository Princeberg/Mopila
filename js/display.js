// Création du système de notifications
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
        z-index: 1000;
        transform: translateX(150%);
        transition: transform 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 300px;
      }
      .uber-notification.success {
        background: #00a650; /* Vert Uber */
      }
      .uber-notification.error {
        background: #e62143; /* Rouge Uber */
      }
      .uber-notification.warning {
        background: #ff9900; /* Orange Uber */
      }
      .uber-notification.visible {
        transform: translateX(0);
      }
      .uber-notification i {
        font-size: 20px;
      }
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

// Style Uber pour les cartes de chauffeurs
function applyUberCardStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .swiper-slide {
      width: 300px;
      margin-right: 15px;
    }
    .driver-card {
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      border: 1px solid #f0f0f0;
    }
    .driver-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    .driver-img-container {
      position: relative;
      height: 180px;
      overflow: hidden;
    }
    .driver-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
    }
    .driver-card:hover .driver-img {
      transform: scale(1.05);
    }
    .driver-profile-thumb {
      position: absolute;
      top: 10px;
      left: 10px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 5px rgba(0,0,0,0.2);
      object-fit: cover;
      z-index: 2;
    }
    .driver-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: white;
    }
    .badge-confort {
      background-color: rgba(31, 186, 214, 0.9);
    }
    .driver-info {
      padding: 15px;
    }
    .driver-name {
      font-size: 18px;
      margin-bottom: 5px;
      color: #000;
      font-weight: 700;
    }
    .driver-status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .status-available {
      background-color: rgba(0, 166, 80, 0.15);
      color: #00a650;
    }
    .status-unavailable {
      background-color: rgba(230, 33, 67, 0.15);
      color: #e62143;
    }
    .driver-detail {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      color: #555;
      font-size: 14px;
    }
    .driver-detail i {
      margin-right: 8px;
      color: #1fbad6;
      width: 16px;
      text-align: center;
    }
    .driver-price {
      font-size: 18px;
      font-weight: 700;
      color: #000;
      margin: 15px 0;
    }
    .driver-price span {
      font-size: 14px;
      font-weight: 500;
      color: #777;
    }
    .driver-actions {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }
    .btn {
      padding: 10px 15px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
      flex: 1;
    }
    .btn-contact {
      background: #000;
      color: white;
    }
    .btn:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }
    
.driver-matricule {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
  `;
  document.head.appendChild(style);
}

// Chargement des chauffeurs
async function loadDrivers(zone = null) {
  const container = document.querySelector('.swiper-wrapper');
  container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Chargement des chauffeurs...</div>';

  try {
    let query = window.supabase
      .from('Drivers')
      .select('*')
      .eq('Account_Status', 'Active')
      .neq('statut', 'non disponible');

    if (zone) {
      query = query.ilike('Zones', `%${zone}%`);
    }

    const { data: drivers, error: driverError } = await query;
    const { data: cars, error: carError } = await window.supabase.from('Cars').select('*');

    if (driverError || carError) {
      showNotification("Erreur de chargement des données", "error");
      console.error(driverError || carError);
      return;
    }

    if (!drivers || drivers.length === 0) {
      container.innerHTML = '<div class="no-drivers">Aucun chauffeur disponible dans cette zone</div>';
      return;
    }

    container.innerHTML = '';

    drivers.forEach(driver => {
      const car = cars.find(c => c.Driver_id === driver.id);
      const card = createDriverCard(driver, car);
      container.appendChild(card);
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    showNotification("Erreur inattendue lors du chargement", "error");
  }
}

function createDriverCard(driver, car) {
  const card = document.createElement('div');
  card.className = 'swiper-slide';
  card.innerHTML = `
    <div class="driver-card">
      <div class="driver-img-container">
        <img src="${car?.PictureLink || 'default-car.jpg'}" alt="Car Image" class="driver-img">
        <img src="${driver.PictureLink || 'default-driver.jpg'}" alt="${driver.Pseudo}" class="driver-profile-thumb">
        ${car?.Matricule ? `<span class="driver-matricule">${car.Matricule}</span>` : ''}
        <span class="driver-badge badge-confort">${car?.Type || 'STANDARD'}</span>
      </div>
      <div class="driver-info">
        <h3 class="driver-name">${driver.Pseudo}</h3>
        <span class="driver-status ${driver.statut === 'Disponible' ? 'status-available' : 'status-unavailable'}">
          ${driver.statut}
        </span>

        <div class="driver-detail">
          <i class="fas fa-map-marker-alt"></i>
          <span>${driver.Zones || 'Zone non spécifiée'}</span>
        </div>

        <div class="driver-detail">
          <i class="fas fa-car"></i>
          <span>${car ? `${car.Mark} ${car.Model} (${car.Year})` : 'Véhicule non renseigné'}</span>
        </div>

        <div class="driver-detail">
          <i class="fas fa-palette"></i>
          <span>${car?.Couleur || ''}</span>
        </div>

        <div class="driver-price">
          ${driver.Price_Min || '0'} - ${driver.Price_Max || '0'} FCFA <span>/ course</span>
        </div>

        <div class="driver-actions">
  ${driver.statut === 'Hors Ligne' ? `
    <button class="btn btn-contact disabled" disabled>
      <i class="fas fa-phone-slash"></i> Hors ligne
    </button>
  ` : `
    <a href="tel:${driver.PhoneNumber}" class="btn btn-contact">
      <i class="fas fa-phone-alt"></i> Appeler
    </a>
  `}
</div>
      </div>
    </div>
  `;
  return card;
}

// Initialisation
window.addEventListener('DOMContentLoaded', () => {
  createNotificationSystem();
  applyUberCardStyles();
  loadDrivers();

  // Gestion des filtres
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadDrivers(btn.dataset.zone);
      showNotification(`Filtre appliqué: ${btn.textContent}`, "success");
    });
  });
  
});