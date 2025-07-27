// Logout function
        function setupLogout() {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    localStorage.removeItem('driver');
                    window.location.href = 'login.html';
                });
            }
        }

        // Delete account function
        function setupDeleteAccount(driverId) {
            const deleteBtn = document.getElementById('delete-account-btn');
            if (!deleteBtn) return;

            deleteBtn.addEventListener('click', async () => {
                if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible.")) {
                    return;
                }

                try {
                    // First delete associated cars
                    const { error: carError } = await supabase
                        .from('Cars')
                        .delete()
                        .eq('Driver_id', driverId);

                    if (carError) throw carError;

                    // Then delete the driver
                    const { error: driverError } = await supabase
                        .from('Drivers')
                        .delete()
                        .eq('id', driverId);

                    if (driverError) throw driverError;

                    localStorage.removeItem('driver');
                    showNotification("Compte supprimé avec succès", "success");
                    setTimeout(() => window.location.href = 'login.html', 1500);

                } catch (error) {
                    showNotification("Erreur lors de la suppression du compte", "error");
                    console.error("Delete account error:", error);
                }
            });
        }

        // Setup help button (WhatsApp)
        function setupHelpButton() {
            const helpBtn = document.getElementById('help-btn');
            if (helpBtn) {
                helpBtn.addEventListener('click', () => {
                    window.open('https://wa.me/89604663774', '_blank'); 
                });
            }
        }

        // Real-time clock
        function setupRealTimeClock() {
            function updateClock() {
                const now = new Date();
                const dateStr = now.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
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
            setInterval(updateClock, 60000); // Update every minute
        }

        document.addEventListener('DOMContentLoaded', async () => {
            createNotificationSystem();
            setupLogout();
            setupHelpButton();
            setupRealTimeClock();

            let driverData = null;
            try {
                driverData = JSON.parse(localStorage.getItem('driver'));
                console.log("Driver data from localStorage:", driverData);
            } catch (e) {
                console.warn("Erreur lors de la lecture du driver dans localStorage", e);
                driverData = null;
            }

            // Vérifie la présence de driver valide
            if (!driverData || !driverData.id) {
                showNotification("Veuillez vous connecter", "error");
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }

            const driverId = driverData.id;
            setupDeleteAccount(driverId);

            try {
                // Récupère les infos à jour du chauffeur
                const { data: driver, error: driverError } = await supabase
                    .from('Drivers')
                    .select('*')
                    .eq('id', driverId)
                    .single();

                if (driverError) {
                    showNotification("Erreur lors du chargement des données", "error");
                    console.error(driverError);
                    return;
                }
                if (!driver) {
                    showNotification("Chauffeur introuvable", "error");
                    console.error("Driver non trouvé dans la base");
                    return;
                }

                // Bloque si compte "Not Active"
                if (driver.Account_statuts && driver.Account_statuts.toLowerCase() === "not active") {
                    document.body.innerHTML = `
                        <div class="account-blocked">
                            <h2>Votre compte est bloqué</h2>
                            <p>Écrivez-nous pour demander un déblocage.</p>
                            <a href="mailto:contact@mopila.com" class="btn btn-contact">Nous contacter</a>
                        </div>
                    `;
                    return;
                }

                // Récupère les voitures associées
                const { data: cars, error: carError } = await supabase
                    .from('Cars')
                    .select('*')
                    .eq('Driver_id', driverId);

                if (carError) {
                    showNotification("Erreur lors du chargement du véhicule", "error");
                    console.error(carError);
                    return;
                }

                const car = cars && cars.length > 0 ? cars[0] : null;

                // Mise à jour de l'interface avec les données récupérées
                updateDriverUI(driver, car);

                // Initialisation des boutons/toggles de statut
                setupStatusToggle(driver, driverId);
                setupStatusButtons(driver, driverId);

            } catch (error) {
                showNotification("Une erreur inattendue est survenue", "error");
                console.error("Unexpected error:", error);
            }
        });


        // --- Fonctions utilitaires ---

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
                    .uber-notification.success { background: #00a650; }
                    .uber-notification.error { background: #e62143; }
                    .uber-notification.warning { background: #ff9900; }
                    .uber-notification.visible { transform: translateX(0); }
                    .uber-notification i { font-size: 20px; }

                    .account-blocked {
                        text-align: center;
                        padding: 50px 20px;
                        max-width: 500px;
                        margin: 0 auto;
                    }
                    .account-blocked h2 {
                        color: #e62143;
                        margin-bottom: 20px;
                    }

                    /* Statuts couleurs */
                    .status-text {
                        font-weight: bold;
                        padding: 6px 12px;
                        border-radius: 20px;
                        display: inline-block;
                        color: white;
                        min-width: 100px;
                        text-align: center;
                    }
                    .status-available { background-color: #00a650; }
                    .status-busy { background-color: #ff9900; }
                    .status-offline { background-color: #6c757d; }

                    /* Boutons de statut */
                    .btn-status {
                        margin: 0 5px 10px 0;
                        padding: 8px 15px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                    }
                    .btn-status:hover {
                        opacity: 0.85;
                    }
                    .btn-warning {
                        background-color: #ff9900;
                        color: white;
                    }
                    .btn-danger {
                        background-color: #dc3545;
                        color: white;
                    }
                    .btn-status:not(.btn-warning):not(.btn-danger) {
                        background-color: #007bff;
                        color: white;
                    }

                    /* Zones et tarifs en lecture seule */
                    .read-only {
                        background-color: #f8f9fa;
                        border: 1px solid #ced4da;
                        cursor: not-allowed;
                    }

                    /* Area tags */
                    .area-tag {
                        display: inline-block;
                        padding: 6px 12px;
                        background-color: #e9ecef;
                        border-radius: 20px;
                        margin: 0 5px 5px 0;
                        font-size: 0.9em;
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

        function updateDriverUI(driver, car) {
            // Nom chauffeur dans plusieurs éléments
            const driverNameElems = document.querySelectorAll('.driver-name, .user-menu span');
            driverNameElems.forEach(el => {
                el.textContent = driver.Pseudo || 'Chauffeur';
            });

            // Photo profil
            const avatarUrl = driver.PictureLink || 'https://mdtcifra.ru/wp-content/uploads/2021/05/no-photo.png';
            document.querySelectorAll('img.driver-avatar, .user-menu img').forEach(img => {
                img.src = avatarUrl;
            });

            // Update today rides count
            if (driver.Total_Courses) {
                document.getElementById('today-rides').textContent = driver.Total_Courses;
            }

            // Zones desservies (read-only)
            const zones = driver.Zones ? driver.Zones.split(',').map(z => z.trim()).filter(z => z.length) : [];
            const areasGrid = document.querySelector('.areas-grid');
            if (areasGrid) {
                areasGrid.innerHTML = '';
                zones.forEach(zone => {
                    const tag = document.createElement('div');
                    tag.className = 'area-tag read-only';
                    tag.textContent = zone;
                    areasGrid.appendChild(tag);
                });
            }

            // Infos véhicule
            const carModelInput = document.getElementById('car-model');
            if (carModelInput) {
                carModelInput.value = car ? `${car.Mark} ${car.Model} - ${car.Year}` : '';
                carModelInput.classList.add('read-only');
            }

            // Prix minimum et maximum (read-only)
            const priceMinInput = document.getElementById('price-min');
            if (priceMinInput) {
                priceMinInput.value = driver.Price_Min || '0';
                priceMinInput.classList.add('read-only');
            }

            const priceMaxInput = document.getElementById('price-max');
            if (priceMaxInput) {
                priceMaxInput.value = driver.Price_Max || '0';
                priceMaxInput.classList.add('read-only');
            }

            // Statut affichage
            updateStatusLabel(driver.statut || 'Hors Ligne');
        }

        function setupStatusToggle(driver, driverId) {
            const toggle = document.getElementById('availability-toggle');
            if (!toggle) return;

            toggle.checked = driver.statut === 'Disponible';

            toggle.addEventListener('change', async () => {
                const newStatus = toggle.checked ? 'Disponible' : 'Hors Ligne';

                try {
                    const { error } = await supabase
                        .from('Drivers')
                        .update({ statut: newStatus })
                        .eq('id', driverId);

                    if (error) throw error;

                    updateStatusLabel(newStatus);
                    driver.statut = newStatus;
                    localStorage.setItem('driver', JSON.stringify(driver));
                    showNotification("Statut mis à jour", "success");

                } catch (error) {
                    toggle.checked = !toggle.checked; // revert UI toggle
                    showNotification("Erreur lors de la mise à jour", "error");
                    console.error(error);
                }
            });
        }

        function setupStatusButtons(driver, driverId) {
            const statutOptions = ['Disponible', 'En course', 'Hors Ligne'];
            const toggleContainer = document.querySelector('.status-buttons');
            if (!toggleContainer) return;

            toggleContainer.innerHTML = ''; // Reset

            statutOptions.forEach(status => {
                const btn = document.createElement('button');
                btn.textContent = status;
                btn.className = `btn-status ${status === 'En course' ? 'btn-warning' : status === 'Hors Ligne' ? 'btn-danger' : ''}`;

                btn.addEventListener('click', async () => {
                    try {
                        const updates = { statut: status };
                        
                        // Add +1 to Total_Courses when status changes to "En course"
                        if (status === 'En course') {
                            updates.Total_Courses = (driver.Total_Courses || 0) + 1;
                        }

                        const { error } = await supabase
                            .from('Drivers')
                            .update(updates)
                            .eq('id', driverId);

                        if (error) throw error;

                        driver.statut = status;
                        if (status === 'En course') {
                            driver.Total_Courses = updates.Total_Courses;
                            document.getElementById('today-rides').textContent = updates.Total_Courses;
                        }
                        
                        localStorage.setItem('driver', JSON.stringify(driver));
                        updateStatusLabel(status);
                        showNotification("Statut mis à jour", "success");

                    } catch (error) {
                        showNotification("Erreur lors de la mise à jour", "error");
                        console.error(error);
                    }
                });

                toggleContainer.appendChild(btn);
            });
        }

        function updateStatusLabel(status) {
            const statusText = document.getElementById('status-text');
            if (!statusText) return;

            statusText.textContent = status;
            statusText.className = 'status-text'; // Reset

            if (status === 'Disponible') {
                statusText.classList.add('status-available');
            } else if (status === 'En course') {
                statusText.classList.add('status-busy');
            } else if (status === 'Hors Ligne') {
                statusText.classList.add('status-offline');
            }
        }

        