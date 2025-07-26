async function loadDriversByZone(zone) {
  const container = document.querySelector('.swiper-wrapper');
  container.innerHTML = '<p>Chargement...</p>';

  try {
    let query = window.supabase
      .from('Drivers')
      .select('*')
      .eq('Account_Status', 'Active')
      .neq('statut', 'non disponible');

    if (zone && zone !== 'all' && zone !== 'Disponible') {
      query = query.ilike('Zones', `%${zone}%`);
    }

    if (zone === 'Disponible') {
      query = query.eq('statut', 'Disponible');
    }

    const { data: drivers, error: driverError } = await query;
    const { data: cars, error: carError } = await window.supabase.from('Cars').select('*');

    if (driverError || carError) {
      container.innerHTML = `<p style="color:red;">Erreur lors du chargement.</p>`;
      console.error(driverError || carError);
      return;
    }

    if (!drivers || drivers.length === 0) {
      container.innerHTML = '<p>Aucun chauffeur trouvé.</p>';
      return;
    }

    container.innerHTML = '';
    drivers.forEach(driver => {
      const car = cars.find(c => c.Driver_id === driver.id);
      const card = document.createElement('div');
      card.className = 'swiper-slide';
      card.innerHTML = `
        <div class="driver-card">
          <div class="driver-img-container">
            <img src="${car?.PictureLink || 'default-car.jpg'}" alt="Car Image" class="driver-img">
            <img src="${driver.PictureLink}" alt="${driver.Pseudo}" class="driver-profile-thumb">
            <span class="driver-badge badge-confort">${car?.Type || ''}</span>
          </div>
          <div class="driver-info">
            <h3 class="driver-name">${driver.Pseudo}</h3>
            <span class="driver-status ${driver.statut === 'Disponible' ? 'status-available' : 'status-unavailable'}">${driver.statut}</span>
            <div class="driver-detail"><i class="fas fa-map-marker-alt"></i><span>${driver.Zones}</span></div>
            <div class="driver-detail"><i class="fas fa-car"></i><span>${car ? `${car.Mark} ${car.Model} - ${car.Year}` : 'Véhicule non renseigné'}</span></div>
            <div class="driver-detail"><i class="fas fa-id-card"></i><span>${car ? `Matricule: ${car.Matricule}` : ''}</span></div>
            <div class="driver-price">${driver.Price_Min} - ${driver.Price_Max} FCFA <span>/ course</span></div>
            <div class="driver-actions">
              <a href="tel:${driver.PhoneNumber}" class="btn btn-contact"><i class="fas fa-phone-alt"></i> Appeler</a>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color:red;">Erreur inattendue.</p>`;
  }
}
