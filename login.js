document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    // Tabs
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    // Student Forms
    const studentLoginForm = document.getElementById('student-login');
    const studentRegisterForm = document.getElementById('student-register');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    
    // Password Strength
    const passwordInput = document.getElementById('register-password');
    const strengthIndicator = document.getElementById('password-strength');
    const strengthCriteria = {
        length: document.getElementById('length'),
        uppercase: document.getElementById('uppercase'),
        number: document.getElementById('number')
    };

    // Admin Forms
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminLogoutButton = document.getElementById('admin-logout-button');


    // --- Tab Switching Logic ---
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Deactivate all tabs
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Activate the clicked tab and its content
            link.classList.add('active');
            const tabId = link.dataset.tab;
            document.getElementById(tabId).classList.add('active');

            // Ensure student register form is hidden when switching tabs
            studentRegisterForm.classList.remove('active');
        });
    });

    // --- Student Login/Register Toggle Logic ---
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Reset form fields and validation state when switching
        studentRegisterForm.querySelector('form')?.reset();
        strengthIndicator.classList.add('password-strength-hidden');
        Object.values(strengthCriteria).forEach(el => el.classList.remove('valid')); // Reset validation
        document.querySelector('.tab-header').style.display = 'none'; // Hide the entire tab header

        studentLoginForm.classList.remove('active');
        studentRegisterForm.classList.add('active');
        // The .active class already handles display, so no need for inline style.
        // studentRegisterForm.style.display = 'block'; 
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        studentRegisterForm.classList.remove('active');
        // studentRegisterForm.style.display = 'none'; // This is handled by the 'active' class
        document.querySelector('.tab-header').style.display = 'flex'; // Show the tab header again
        studentLoginForm.classList.add('active');
    });

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

    passwordInput.addEventListener('focus', () => {
        strengthIndicator.classList.remove('password-strength-hidden');
    });

    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;

        // Check for length (at least 8 characters)
        if (password.length >= 8) {
            strengthCriteria.length.classList.add('valid');
        } else {
            strengthCriteria.length.classList.remove('valid');
        }

        // Check for uppercase letter
        if (/[A-Z]/.test(password)) {
            strengthCriteria.uppercase.classList.add('valid');
        } else {
            strengthCriteria.uppercase.classList.remove('valid');
        }

        // Check for number
        if (/\d/.test(password)) {
            strengthCriteria.number.classList.add('valid');
        } else {
            strengthCriteria.number.classList.remove('valid');
        }
    });

    // --- Registration Form Submission ---
    studentRegisterForm.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = passwordInput.value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        const allCriteriaMet = strengthCriteria.length.classList.contains('valid') && 
                               strengthCriteria.uppercase.classList.contains('valid') && 
                               strengthCriteria.number.classList.contains('valid');

        if (allCriteriaMet) {
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
                    // Optionally, redirect to login or show a success message in the UI
                    showLoginLink.click();
                } else {
                    alert(`Error: ${result.message}`);
                }
            } catch (error) {
                console.error('Registration failed:', error);
                alert('Registration failed. Please try again later.');
            }
        } else {
            alert("Please ensure your password meets all the requirements.");
        }
    });

    // --- Login Form Submission ---
    studentLoginForm.querySelector('form').addEventListener('submit', async (e) => {
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
                localStorage.setItem('userName', result.user.name); // This line was correct, let's ensure the server response is handled right.
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

    // --- Admin Login Form Submission ---
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('admin-password').value;
            
            try {
                const response = await fetch('/api/admin-login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ password }),
                });

                const result = await response.json();

                if (response.ok) {
                    window.location.href = '/admin.html';
                } else {
                    alert(`Error: ${result.message}`);
                }

            } catch (error) {
                console.error('Admin login error:', error);
                alert('An error occurred during admin login.');
            }
        });
    }

    // --- Admin Logout ---
    if (adminLogoutButton) {
        adminLogoutButton.addEventListener('click', () => {
            window.location.href = '/login.html'; // Or admin-login.html
        });
    }

    // --- Admin Dashboard Logic ---
    // Check if we are on the admin page by looking for a unique element
    if (document.querySelector('.admin-main')) {
        const fetchAndDisplayUsers = async () => {
            try {
                const response = await fetch('/api/users');
                const users = await response.json();
                if (!response.ok) {
                    throw new Error(users.message || 'Failed to fetch users.');
                }

                // Update the "Total Users" stat card
                const totalUsersStat = document.querySelector('.stat-card .stat-number');
                if (totalUsersStat) {
                    totalUsersStat.textContent = users.length;
                }

                const userTableBody = document.getElementById('user-table-body');
                
                if (userTableBody) {
                    userTableBody.innerHTML = ''; // Clear existing rows
                    users.forEach(user => {
                        const row = document.createElement('tr');
                        const registrationDate = new Date(user.createdAt).toLocaleDateString();
                        row.innerHTML = `
                            <td data-field="name" data-original-value="${user.name}">${user.name}</td>
                            <td data-field="email" data-original-value="${user.email}">${user.email}</td>
                            <td>${registrationDate}</td>
                            <td class="actions">
                                <button class="btn-action btn-edit" data-id="${user._id}">Edit</button>
                            </td>
                        `;
                        userTableBody.appendChild(row);
                    });
                }
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        const userTableBody = document.getElementById('user-table-body');
        if (userTableBody) {
            userTableBody.addEventListener('click', async (e) => {
                try {
                    const target = e.target;

                    // Handle Edit Button Click
                    if (target.classList.contains('btn-edit')) {
                        const row = target.closest('tr');
                        const nameCell = row.querySelector('td[data-field="name"]');
                        const emailCell = row.querySelector('td[data-field="email"]');

                        // Add a class to the input for easier selection
                        nameCell.innerHTML = `<input type="text" class="edit-input" value="${nameCell.textContent.trim()}">`;
                        emailCell.innerHTML = `<input type="email" class="edit-input" value="${emailCell.textContent.trim()}">`;

                        target.textContent = 'Save';
                        target.classList.remove('btn-edit');
                        target.classList.add('btn-save');

                        // Add a cancel button
                        const cancelBtn = document.createElement('button');
                        cancelBtn.textContent = 'Cancel';
                        cancelBtn.className = 'btn-action btn-cancel';
                        target.parentElement.appendChild(cancelBtn);
                    }

                    // Handle Save Button Click
                    else if (target.classList.contains('btn-save')) {
                        const row = target.closest('tr');
                        const userId = target.dataset.id;
                        const newName = row.querySelector('td[data-field="name"] input').value;
                        const newEmail = row.querySelector('td[data-field="email"] input').value;

                        const response = await fetch(`/api/users/${userId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newName, email: newEmail })
                        });

                        if (!response.ok) {
                            const errorResult = await response.json();
                            throw new Error(errorResult.message || 'Failed to update user.');
                        }

                        alert('User updated successfully!');
                        fetchAndDisplayUsers(); // Refresh the table
                    }
                    // Handle Cancel Button Click
                    else if (target.classList.contains('btn-cancel')) {
                        const row = target.closest('tr');
                        const nameCell = row.querySelector('td[data-field="name"]');
                        const emailCell = row.querySelector('td[data-field="email"]');

                        // Revert to original values stored in data attributes
                        nameCell.textContent = nameCell.dataset.originalValue;
                        emailCell.textContent = emailCell.dataset.originalValue;

                        // Refresh the row to restore the 'Edit' button
                        fetchAndDisplayUsers();
                    }
                } catch (error) {
                    console.error('Error during user action:', error);
                    alert(`An error occurred: ${error.message}`);
                }
            });
        }

        fetchAndDisplayUsers();
    }

    // --- Forgot Password Modal Logic ---
    const forgotPasswordLinks = document.querySelectorAll('.forgot-password-link');
    const modal = document.getElementById('forgot-password-modal');
    const closeModalBtn = modal.querySelector('.close-modal');
    const modalForm = modal.querySelector('form');
    const resetEmailInput = document.getElementById('reset-email');

    const openModal = () => {
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
        modalForm.reset(); // Reset the modal form when closing
    };

    forgotPasswordLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    });

    closeModalBtn.addEventListener('click', closeModal);
    // Also close modal if user clicks on the overlay
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    modalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert(`Password reset link sent to ${resetEmailInput.value}! (simulation)`);
        closeModal();
    });
});