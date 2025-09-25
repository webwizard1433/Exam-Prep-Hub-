document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---

    // Student View Toggling
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');

    // Student Forms
    const studentLoginForm = loginView.querySelector('form');
    const studentRegisterForm = registerView.querySelector('form');

    const passwordInput = document.getElementById('register-password');
    const strengthIndicator = document.getElementById('password-strength');
    const strengthCriteria = {
        length: document.getElementById('length'),
        uppercase: document.getElementById('uppercase'),
        number: document.getElementById('number'),
    };


    // --- Student View Toggling Logic ---
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginView.classList.remove('active');
            registerView.classList.add('active');
        });
    }
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerView.classList.remove('active');
            loginView.classList.add('active');
        });
    }

    // --- Show/Hide Password Logic ---
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');

    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const inputGroup = icon.parentElement;
            const passwordInput = inputGroup.querySelector('input[type="password"], input[type="text"]');
            if (!passwordInput) {
                return; // Safety check
            }
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.add('visible');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('visible');
            }
        });
    });

    // --- Password Strength Validation Logic ---
    // This logic is not used in the new design but can be re-integrated if needed.
    // For simplicity, it's removed from the active flow.

    // --- Registration Form Submission ---
    studentRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }
        // Basic password validation can be added here if desired

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(`Success: ${result.message}`);
                // Switch to the login view
                showLoginLink.click();
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Registration failed. Please try again later.');
        }
    });

    // --- Login Form Submission ---
    studentLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const result = await response.json();

            if (response.ok) {
                // Save user's name to localStorage for the home page
                localStorage.setItem('userName', result.user.name);
                localStorage.setItem('userEmail', email); // Store email as well
                // Login successful, redirect to the home page
                window.location.href = '/upsc.html'; // Corrected redirect to the main exam page
            } else {
                // Show error message
                alert(`Error: ${result.message}`);
            }

        } catch (error) {
            console.error('Login failed:', error);
            alert('Login failed. Please try again later.');
        }
    });

    // --- Modal Logic (Forgot Password & Admin) ---
    const forgotPasswordLinks = document.querySelectorAll('.forgot-password-link');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');

    const openModal = (modal) => {
        if (modal) modal.classList.remove('hidden');
    };

    const closeModal = (modal) => {
        if (modal) {
            modal.classList.add('hidden');
            modal.querySelector('form')?.reset();
        }
    };

    const forgotPasswordForm = forgotPasswordModal.querySelector('form');
    const resetEmailInput = document.getElementById('reset-email');

    forgotPasswordLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(forgotPasswordModal);
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => closeModal(modal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });

    forgotPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert(`Password reset link sent to ${resetEmailInput.value}! (simulation)`);
        closeModal(forgotPasswordModal);
    });
});