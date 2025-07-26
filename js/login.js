document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const otpSection = document.getElementById('otpSection');
    const displayPhone = document.getElementById('displayPhone');
    const verifyBtn = document.getElementById('verifyBtn');
    const resendOtp = document.getElementById('resendOtp');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const countryCode = document.getElementById('countryCode').value;
        const phoneNumber = document.getElementById('phone').value;
        const fullNumber = countryCode + phoneNumber;
        
        // In a real app, you would send this to your backend for OTP generation
        console.log('Phone number submitted:', fullNumber);
        
        // Show OTP section
        displayPhone.textContent = fullNumber;
        loginForm.style.display = 'none';
        otpSection.style.display = 'block';
        
        // Auto-focus first OTP input
        const otpInputs = document.querySelectorAll('.otp-inputs input');
        if(otpInputs.length > 0) {
            otpInputs[0].focus();
        }
    });
    
    // Handle OTP input
    const otpInputs = document.querySelectorAll('.otp-inputs input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            if(this.value.length === 1) {
                if(index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if(e.key === 'Backspace' && this.value.length === 0) {
                if(index > 0) {
                    otpInputs[index - 1].focus();
                }
            }
        });
    });
    
    verifyBtn.addEventListener('click', function() {
        let otp = '';
        otpInputs.forEach(input => {
            otp += input.value;
        });
        
        if(otp.length === 6) {
            // In a real app, verify OTP with backend
            alert('OTP verified successfully! Redirecting to dashboard...');
            // window.location.href = 'driver-dashboard.html';
        } else {
            alert('Please enter a complete 6-digit OTP code');
        }
    });
    
    resendOtp.addEventListener('click', function(e) {
        e.preventDefault();
        alert('New OTP code sent to your phone number');
    });
});