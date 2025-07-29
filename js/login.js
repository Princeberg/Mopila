import { supabase } from '../Api/supabase.js';

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

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
        background: #00a650;
      }
      .uber-notification.error {
        background: #e62143;
      }
      .uber-notification.warning {
        background: #ff9900;
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

  const notification = document.getElementById('uber-notification');
  const accountNumberInput = document.getElementById('accountNumber');
  const accountNumber = accountNumberInput.value.trim();
  const submitBtn = this.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;

 
  function showNotification(message, type) {
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      ${message}
    `;
    notification.className = `uber-notification ${type} visible`;

    setTimeout(() => {
      notification.classList.remove('visible');
    }, 5000);
  }

  function disableSubmit(text) {
    submitBtn.innerHTML = text;
    submitBtn.disabled = true;
  }

  function enableSubmit() {
    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
  }

  if (!accountNumber) {
    showNotification("Veuillez entrer votre numéro de compte.", "error");
    enableSubmit();
    accountNumberInput.focus();
    return;
  }

  disableSubmit('<i class="fas fa-spinner fa-spin"></i> Connexion...');

  try {
    console.log("Recherche du compte:", accountNumber);

    const { data, error } = await supabase
      .from('Drivers')
      .select('*')
      .eq('AccountNumber', accountNumber) 
      .single();

    if (error || !data) {
      console.log("Compte non trouvé ou erreur:", error);
      showNotification("Compte non trouvé.", "error");
      enableSubmit();
      accountNumberInput.focus();
      return;
    }
    
    localStorage.setItem('driver', JSON.stringify(data));

    showNotification("Connexion réussie! Redirection...", "success");

    setTimeout(() => {
      window.location.href = 'Driver.html';
    }, 1000);
  } catch (err) {
    console.error("Erreur lors de la connexion :", err);
    showNotification("Une erreur est survenue. Réessayez.", "error");
    enableSubmit();
    accountNumberInput.focus();
  }
});
