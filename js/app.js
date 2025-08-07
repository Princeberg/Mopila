let deferredPrompt = null;

const installScreen = document.getElementById('install-screen');
const installBtn = document.getElementById('install-btn');
const installTitle = document.getElementById('install-title');
const installMessage = document.getElementById('install-message');

// 💬 Fonction utilitaire pour afficher des popups
function showPopup(message, type = 'info') {
  const popup = document.createElement('div');
  popup.textContent = message;
  popup.style.position = 'fixed';
  popup.style.bottom = '2rem';
  popup.style.left = '50%';
  popup.style.transform = 'translateX(-50%)';
  popup.style.background = type === 'success' ? '#00c853' :
                          type === 'danger' ? '#d32f2f' : 
                          type === 'warning' ? '#ffa000' : '#333';
  popup.style.color = 'white';
  popup.style.padding = '1rem 2rem';
  popup.style.borderRadius = '20px';
  popup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  popup.style.zIndex = 10000;
  popup.style.transition = 'opacity 0.5s ease';
  popup.style.opacity = '1';
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.style.opacity = '0';
    setTimeout(() => popup.remove(), 500);
  }, 3000);
}

// // Enregistrer le service worker
// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker.register('/sw.js')
//     .then(reg => showPopup("✅ Service Worker actif", 'success'))
//     .catch(err => showPopup("❌ Erreur Service Worker", 'danger'));
// }

// Détecter si l'app est en mode standalone (installée)
const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

// Détecter iOS
const isIOS = () => {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

// Forcer l'installation si l'app n'est pas installée
window.addEventListener('DOMContentLoaded', () => {
  if (isInStandaloneMode()) {
    installScreen.style.display = 'none';
    return;
  }

  if (isIOS()) {
    installTitle.textContent = "Ajouter MOPILA à l'écran d'accueil";
    installMessage.innerHTML = `
      Sur iPhone/iPad, cliquez sur <strong>Partager</strong> puis "Sur l'écran d'accueil"
      pour installer l'application.`;
    installScreen.style.display = 'flex';
    installBtn.style.display = 'none';
    showPopup("📱 Installez l'application manuellement sur iOS", 'warning');
  }
});

// Gérer le prompt natif Android
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  if (!isInStandaloneMode() && !isIOS()) {
    installScreen.style.display = 'flex';
    installBtn.style.display = 'inline-block';
    showPopup("📲 Installez l'application pour continuer", 'info');
  }
});

// Cliquer sur "Installer maintenant"
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === 'accepted') {
    showPopup("✅ Application installée avec succès", 'success');
    installScreen.style.display = 'none';
  } else {
    installMessage.innerHTML = `<strong>❌ Vous devez installer l'application pour continuer.</strong>`;
    installBtn.style.display = 'none';
    showPopup("⚠️ Vous devez installer l'application pour continuer", 'danger');
  }

  deferredPrompt = null;
});