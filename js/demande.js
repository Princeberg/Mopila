// Ensure the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('RegisterForm');
  const whatsappInput = document.getElementById('whatsapp');

  if (!registerForm || !whatsappInput) {
    console.error('Form elements not found in DOM.');
    return;
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'notification hidden';
  document.body.appendChild(notification);

  // Inject notification styles
  const style = document.createElement('style');
  style.textContent = `
    .notification {
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
    }
    .notification.success {
      background: #00a650;
    }
    .notification.error {
      background: #e62143;
    }
    .notification.visible {
      transform: translateX(0);
    }
    .notification i {
      font-size: 20px;
    }
  `;
  document.head.appendChild(style);

  // Show notification
  function showNotification(message, isSuccess) {
    notification.innerHTML = `
      <i class="fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}"></i>
      ${message}
    `;
    notification.className = `notification ${isSuccess ? 'success' : 'error'} visible`;
    setTimeout(() => notification.classList.remove('visible'), 5000);
  }

  // Format WhatsApp input
  whatsappInput.addEventListener('input', function () {
    const numbers = this.value.replace(/\D/g, '');
    let formatted = '';

    if (numbers.length > 0) formatted = numbers.substring(0, 2);
    if (numbers.length > 2) formatted += ' ' + numbers.substring(2, 5);
    if (numbers.length > 5) formatted += ' ' + numbers.substring(5, 7);
    if (numbers.length > 7) formatted += ' ' + numbers.substring(7, 9);

    this.value = formatted;
  });

  // Form submit handler
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
    submitBtn.disabled = true;

    // Retrieve values
    const fullName = document.getElementById('fullName').value.trim();
    const age = document.getElementById('age').value.trim();
    const city = document.getElementById('city').value.trim();
    const countryCode = document.getElementById('countryCode').value;
    const rawWhatsapp = whatsappInput.value.trim().replace(/\D/g, '');
    const whatsapp = `${countryCode}${rawWhatsapp}`;

    // Validation
    if (!fullName || !age || !city || !whatsapp) {
      showNotification('Veuillez remplir tous les champs obligatoires.', false);
      return resetButton();
    }

    if (rawWhatsapp.length < 8) {
      showNotification('Le numéro WhatsApp doit contenir au moins 8 chiffres.', false);
      return resetButton();
    }

    // Insert into Supabase
    try {
      const { data, error } = await supabase
        .from('Requests')
        .insert([{
          full_name: fullName,
          age: parseInt(age),
          city,
          whatsapp,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      localStorage.setItem('last_demande', JSON.stringify(data[0]));
      showNotification('Votre demande a été enregistrée avec succès!', true);
      registerForm.reset();

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    } catch (err) {
      console.error('Erreur de soumission :', err);
      showNotification('Une erreur est survenue. Veuillez réessayer.', false);
    } finally {
      resetButton();
    }

    function resetButton() {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
});
