document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const sideMenu = document.querySelector('.side-menu');
    const logoutButton = document.getElementById('logout-button');
    const profileButton = document.getElementById('profile-button');
    const profileModal = document.getElementById('profile-modal');
    const closeModalButton = document.getElementById('close-modal-button');

    const changePasswordBtn = document.getElementById('change-password-btn');
    const changePasswordModal = document.getElementById('change-password-modal');
    const closeChangePasswordModal = document.getElementById('close-change-password-modal');
    const changePasswordForm = document.getElementById('change-password-form');

    const typingTestBtn = document.getElementById('typing-test-btn');
    const typingTestModal = document.getElementById('typing-test-modal');
    const closeTypingModal = document.getElementById('close-typing-modal');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const typingIframe = document.getElementById('typing-iframe');

    const profileNameSpan = document.getElementById('profile-name');
    const profileEmailSpan = document.getElementById('profile-email');

    // --- Profile Page Logic ---
    if (document.getElementById('profile-view-mode')) {
        let currentUserId = null;

        const fetchProfileData = async () => {
            const userEmail = localStorage.getItem('userEmail');
            if (!userEmail) {
                alert('Could not find user session. Please log in again.');
                window.location.href = '/login.html';
                return;
            }

            try {
                const response = await fetch(`/api/user?email=${encodeURIComponent(userEmail)}`);
                const user = await response.json();

                if (!response.ok) throw new Error(user.message);

                document.getElementById('profile-name-page').textContent = user.name;
                document.getElementById('profile-email-page').textContent = user.email;
                currentUserId = user._id; // Store the user's ID

            } catch (error) {
                console.error('Failed to fetch profile data:', error);
                alert(`Error: ${error.message}`);
            }
        };

        const switchToEditMode = () => {
            const viewMode = document.getElementById('profile-view-mode');
            const name = document.getElementById('profile-name-page').textContent;
            const email = document.getElementById('profile-email-page').textContent;

            viewMode.innerHTML = `
                <p><strong>Name:</strong> <input type="text" id="edit-name" class="edit-input" value="${name}"></p>
                <p><strong>Email:</strong> <input type="email" id="edit-email" class="edit-input" value="${email}"></p>
                <div class="profile-actions">
                    <button id="save-profile-btn" class="btn-action btn-save">Save Changes</button>
                    <button id="cancel-edit-btn" class="btn-action btn-secondary">Cancel</button>
                </div>
            `;

            document.getElementById('save-profile-btn').addEventListener('click', saveProfileChanges);
            document.getElementById('cancel-edit-btn').addEventListener('click', fetchProfileData); // Re-fetch to cancel
        };

        const saveProfileChanges = async () => {
            const newName = document.getElementById('edit-name').value;
            const newEmail = document.getElementById('edit-email').value;

            if (!currentUserId) {
                alert('User session error. Cannot save changes.');
                return;
            }

            try {
                const response = await fetch(`/api/users/${currentUserId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName, email: newEmail })
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                alert('Profile updated successfully!');
                localStorage.setItem('userName', newName); // Update localStorage
                localStorage.setItem('userEmail', newEmail);
                window.location.reload(); // Reload the page to show updated view

            } catch (error) {
                console.error('Failed to save profile changes:', error);
                alert(`Error: ${error.message}`);
            }
        };

        document.getElementById('edit-profile-btn').addEventListener('click', switchToEditMode);

        // Also make the change password button on this page work
        const changePasswordBtnPage = document.getElementById('change-password-btn-page');
        // Re-select the modal here to ensure it's found on the profile page
        const changePasswordModalOnProfilePage = document.getElementById('change-password-modal');

        if (changePasswordBtnPage) {
            changePasswordBtnPage.addEventListener('click', () => {
                if (changePasswordModalOnProfilePage) changePasswordModalOnProfilePage.classList.remove('hidden');
            });
        }

        fetchProfileData(); // Initial fetch when page loads
    }

    if (menuToggle && sideMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from closing the menu immediately
            sideMenu.classList.toggle('open');
            document.body.classList.toggle('menu-open');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (sideMenu.classList.contains('open') && !sideMenu.contains(e.target)) {
                sideMenu.classList.remove('open');
                document.body.classList.remove('menu-open');
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            console.log('Logging out...');
            // Clear user data from storage
            localStorage.removeItem('userName');
            window.location.href = '/login.html';
        });
    }

    // --- Profile Modal Logic ---
    if (profileButton && profileModal) {
        profileButton.addEventListener('click', () => {
            // Populate modal with user data from localStorage
            const userName = localStorage.getItem('userName');
            const userEmail = localStorage.getItem('userEmail'); // Assuming you also store email

            if (profileNameSpan) profileNameSpan.textContent = userName || 'N/A';
            if (profileEmailSpan) profileEmailSpan.textContent = userEmail || 'N/A';

            profileModal.classList.remove('hidden');
        });
    }

    if (closeModalButton && profileModal) {
        closeModalButton.addEventListener('click', () => {
            profileModal.classList.add('hidden');
        });
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) profileModal.classList.add('hidden');
        });
    }

    // --- Change Password Modal Logic ---
    if (changePasswordBtn && changePasswordModal) {
        changePasswordBtn.addEventListener('click', () => {
            profileModal.classList.add('hidden'); // Hide the profile modal
            changePasswordModal.classList.remove('hidden'); // Show the change password modal
        });
    }

    if (closeChangePasswordModal && changePasswordModal) {
        closeChangePasswordModal.addEventListener('click', () => {
            changePasswordModal.classList.add('hidden');
        });
        changePasswordModal.addEventListener('click', (e) => {
            if (e.target === changePasswordModal) {
                changePasswordModal.classList.add('hidden');
            }
        });
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldPassword = document.getElementById('old-password').value;
            const newPassword = document.getElementById('new-password').value;
            const userEmail = localStorage.getItem('userEmail');

            try {
                const response = await fetch('/api/user/change-password', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail, oldPassword, newPassword })
                });

                const result = await response.json();
                alert(result.message);

                if (response.ok) {
                    changePasswordModal.classList.add('hidden');
                    changePasswordForm.reset();
                }
            } catch (error) {
                console.error('Error changing password:', error);
                alert('An error occurred. Please try again.');
            }
        });
    }

    // --- Typing Test Modal Logic ---
    if (typingTestBtn && typingTestModal) {
        typingTestBtn.addEventListener('click', () => {
            // Set the iframe src only when the modal is opened to save resources
            if (typingIframe.src === 'about:blank') {
                typingIframe.src = typingIframe.dataset.src;
            }
            typingTestModal.classList.remove('hidden');
        });
    }

    if (closeTypingModal && typingTestModal) {
        closeTypingModal.addEventListener('click', () => {
            typingTestModal.classList.add('hidden');
        });
    }

    // Fullscreen logic for Typing Test modal
    if (fullscreenBtn && typingTestModal) {
        fullscreenBtn.addEventListener('click', () => {
            const iframeContainer = typingTestModal.querySelector('.iframe-container');
            if (!document.fullscreenElement) {
                iframeContainer.requestFullscreen().catch(err => {
                    alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }

    // Update fullscreen button icon on change
    document.addEventListener('fullscreenchange', () => {
        if (fullscreenBtn && document.fullscreenElement) {
            fullscreenBtn.textContent = 'Exit Fullscreen';
        } else if (fullscreenBtn) {
            fullscreenBtn.textContent = 'Fullscreen';
        }
    });
});