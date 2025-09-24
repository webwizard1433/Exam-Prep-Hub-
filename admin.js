document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const menuToggle = document.getElementById('menu-toggle');
    const sideMenu = document.querySelector('.side-menu');
    const logoutButton = document.getElementById('logout-button');

    // --- Logout Logic ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            // In a real app, you might invalidate a token on the server
            window.location.href = '/login.html';
        });
    }

    // --- Users Modal Logic ---
    // Nav Links
    const dashboardNavLink = document.getElementById('dashboard-nav-link');
    const usersNavLink = document.getElementById('users-nav-link');
    const contentNavLink = document.getElementById('content-nav-link');

    // Views
    const dashboardView = document.getElementById('dashboard-view');
    const usersView = document.getElementById('users-view');
    const contentView = document.getElementById('content-view');

    // Stat display elements
    const totalUsersStat = document.getElementById('stats-total-users');
    const activeExamsStat = document.getElementById('stats-active-exams');
    const contentUploadsStat = document.getElementById('stats-content-uploads');

    // State variables for sorting
    let currentContentSort = {
        sortBy: 'createdAt',
        sortOrder: 'desc'
    };

    // State for search
    let currentContentSearch = '';

    // Stat Cards
    const totalUsersCard = document.getElementById('stats-total-users')?.parentElement;
    const activeExamsCard = document.getElementById('stats-active-exams')?.parentElement;
    const contentUploadsCard = document.getElementById('stats-content-uploads')?.parentElement;
    const serverStatusCard = document.querySelector('.stat-status.online')?.parentElement;


    // --- Sidebar Menu Logic ---
    if (menuToggle && sideMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sideMenu.classList.toggle('open');
            document.body.classList.toggle('menu-open');
        });

        // Close menu when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (sideMenu.classList.contains('open') && !sideMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                sideMenu.classList.remove('open');
                document.body.classList.remove('menu-open');
            }
        });
    }

    // --- CSV Export Logic ---
    const downloadCSV = (csvContent, fileName) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportUsersToCSV = async () => {
        try {
            // Fetch all users without pagination for the export
            const response = await fetch('/api/users?limit=0'); // limit=0 can mean all
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to fetch users for export.');

            let csvContent = 'Name,Email,Registration Date\n';
            data.users.forEach(user => {
                const regDate = new Date(user.createdAt).toLocaleDateString();
                csvContent += `"${user.name}","${user.email}","${regDate}"\n`;
            });

            downloadCSV(csvContent, 'users-export.csv');
        } catch (error) {
            alert(`Error exporting users: ${error.message}`);
        }
    };

    const exportContentToCSV = async () => {
        try {
            // Fetch all content without pagination
            const response = await fetch('/api/content?limit=0');
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to fetch content for export.');

            let csvContent = 'Title,Type,Exam,URL,Date Added\n';
            data.content.forEach(item => {
                const addedDate = new Date(item.createdAt).toLocaleDateString();
                // Escape commas in title by wrapping in quotes
                const title = `"${item.title.replace(/"/g, '""')}"`;
                csvContent += `${title},${item.type},${item.exam},${item.url},${addedDate}\n`;
            });

            downloadCSV(csvContent, 'content-export.csv');
        } catch (error) {
            alert(`Error exporting content: ${error.message}`);
        }
    };

    const fetchAndDisplayUsers = async (page = 1, search = '') => {
        try {
            const query = new URLSearchParams({ page, limit: 10, search });
            const response = await fetch(`/api/users?${query.toString()}`);

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch users.');
            }

            const userTableBody = document.getElementById('user-table-body');
            if (userTableBody) {
                userTableBody.innerHTML = '';
                data.users.forEach(user => {
                    const row = document.createElement('tr');
                    const registrationDate = new Date(user.createdAt).toLocaleDateString();
                    row.innerHTML = `
                        <td data-field="name" data-original-value="${user.name}">${user.name}</td>
                        <td data-field="email" data-original-value="${user.email}">${user.email}</td>
                        <td>${registrationDate}</td>
                        <td class="actions">
                            <button class="btn-action btn-edit" data-id="${user._id}">Edit</button>
                            <button class="btn-action btn-delete" data-id="${user._id}">Delete</button>
                        </td>
                    `;
                    userTableBody.appendChild(row);
                });
            }
            // Pass the search query to the pagination handler
            const paginationFetchFunction = (newPage) => fetchAndDisplayUsers(newPage, search);
            renderPagination('users-pagination', data.totalPages, page, paginationFetchFunction);

        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const renderPagination = (containerId, totalPages, currentPage, fetchFunction) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        if (totalPages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Previous';
        prevBtn.className = 'pagination-btn';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => fetchFunction(currentPage - 1));
        container.appendChild(prevBtn);

        container.insertAdjacentHTML('beforeend', `<span> Page ${currentPage} of ${totalPages} </span>`);

        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.className = 'pagination-btn';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => fetchFunction(currentPage + 1));
        container.appendChild(nextBtn);
    };

    // --- View Switching Logic ---
    const switchView = (viewId) => {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId)?.classList.add('active');

        document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`.sidebar-nav .nav-link[data-view="${viewId}"]`)?.classList.add('active');

        const pageTitle = document.querySelector('.page-title');
        if (viewId === 'dashboard-view') pageTitle.textContent = 'Dashboard Overview';
        if (viewId === 'users-view') pageTitle.textContent = 'User Management';
        if (viewId === 'content-view') pageTitle.textContent = 'Content Management';
    };

    if (dashboardNavLink) {
        dashboardNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('dashboard-view');
        });
    }

    const usersModal = document.getElementById('users-modal');
    const closeUsersModal = document.getElementById('close-users-modal');

    if (usersNavLink) {
        usersNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            const usersModalContent = usersModal.querySelector('.modal-content');
            if (usersModalContent.children.length <= 1) { // Load content only once
                const template = document.getElementById('users-view-template');
                usersModalContent.appendChild(template.content.cloneNode(true));
                initializeUserViewListeners();
            }
            document.getElementById('user-search-input').value = ''; // Clear search on open
            fetchAndDisplayUsers();
            usersModal.classList.remove('hidden');
        });
    }

    if (closeUsersModal) {
        closeUsersModal.addEventListener('click', () => usersModal.classList.add('hidden'));
    }

    const initializeUserViewListeners = () => {
        const userSearchInput = document.getElementById('user-search-input');
        const userSearchBtn = document.getElementById('user-search-btn');
        const exportUsersBtn = document.getElementById('export-users-csv-btn');
        const addUserBtn = document.getElementById('add-user-btn');
        const userTableBody = document.getElementById('user-table-body');

        const handleUserSearch = () => {
            const searchTerm = userSearchInput.value;
            fetchAndDisplayUsers(1, searchTerm);
        };

        if (userSearchBtn) userSearchBtn.addEventListener('click', handleUserSearch);
        if (userSearchInput) userSearchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') handleUserSearch();
        });

        if (exportUsersBtn) exportUsersBtn.addEventListener('click', exportUsersToCSV);

        const addUserModal = document.getElementById('add-user-modal');
        if (addUserBtn && addUserModal) {
            addUserBtn.addEventListener('click', () => {
                addUserModal.classList.remove('hidden');
            });
        }

        if (userTableBody) {
            userTableBody.addEventListener('click', async (e) => {
                try {
                    const target = e.target;
                    const userId = target.dataset.id;

                    if (target.classList.contains('btn-edit')) {
                        const row = target.closest('tr');
                        const nameCell = row.querySelector('td[data-field="name"]');
                        const emailCell = row.querySelector('td[data-field="email"]');

                        nameCell.innerHTML = `<input type="text" class="edit-input" value="${nameCell.textContent.trim()}">`;
                        emailCell.innerHTML = `<input type="email" class="edit-input" value="${emailCell.textContent.trim()}">`;

                        target.textContent = 'Save';
                        target.classList.remove('btn-edit');
                        target.classList.add('btn-save');

                        const cancelBtn = document.createElement('button');
                        cancelBtn.textContent = 'Cancel';
                        cancelBtn.className = 'btn-action btn-cancel';
                        target.parentElement.insertBefore(cancelBtn, target.nextSibling);

                    } else if (target.classList.contains('btn-save')) {
                        const row = target.closest('tr');
                        const newName = row.querySelector('td[data-field="name"] input').value;
                        const newEmail = row.querySelector('td[data-field="email"] input').value;

                        const response = await fetch(`/api/users/${userId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newName, email: newEmail })
                        });

                        if (!response.ok) throw new Error('Failed to update user.');
                        alert('User updated successfully!');
                        fetchAndDisplayUsers(1, document.getElementById('user-search-input').value);

                    } else if (target.classList.contains('btn-cancel')) {
                        fetchAndDisplayUsers(1, document.getElementById('user-search-input').value);

                    } else if (target.classList.contains('btn-delete')) {
                        if (!confirm('Are you sure you want to delete this user?')) return;
                        const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
                        if (!response.ok) throw new Error('Failed to delete user.');
                        alert('User deleted successfully!');
                        fetchAndDisplayUsers(1, document.getElementById('user-search-input').value);
                    }
                } catch (error) {
                    console.error('Error during user action:', error);
                    alert(`An error occurred: ${error.message}`);
                }
            });
        }
    };

    // --- Add User Modal Logic (remains mostly the same) ---
    const addUserModal = document.getElementById('add-user-modal');
    const closeAddUserModal = document.getElementById('close-add-user-modal');
    const addUserForm = document.getElementById('add-user-form');

    if (closeAddUserModal && addUserModal) {
        closeAddUserModal.addEventListener('click', () => {
            addUserModal.classList.add('hidden');
            addUserForm.reset();
        });
    }
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('add-user-name').value;
            const email = document.getElementById('add-user-email').value;
            const password = document.getElementById('add-user-password').value;

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                const result = await response.json();
                alert(result.message);

                if (response.ok) {
                    addUserModal.classList.add('hidden');
                    addUserForm.reset();
                    fetchAndDisplayUsers(); // Refresh user list
                }
            } catch (error) {
                alert('Failed to add user.');
            }
        });
    }

    // --- Content Management Logic ---
    const fetchAndDisplayContent = async (page = 1, sortBy = currentContentSort.sortBy, sortOrder = currentContentSort.sortOrder, search = currentContentSearch) => {
        try {
            const query = new URLSearchParams({ page, limit: 10, sortBy, sortOrder, search });
            const response = await fetch(`/api/content?${query.toString()}`);

            currentContentSort = { sortBy, sortOrder }; // Update current sort state

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            const contentTableBody = document.getElementById('content-table-body');
            if (contentTableBody) {
                contentTableBody.innerHTML = '';
                data.content.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.title}</td>
                        <td>${item.type}</td>
                        <td>${item.exam}</td>
                        <td><a href="${item.url}" target="_blank">Link</a></td>
                        <td class="actions">
                            <button class="btn-action btn-edit" data-id="${item._id}" data-type="content">Edit</button>
                            <button class="btn-action btn-delete" data-id="${item._id}" data-type="content">Delete</button>
                        </td>
                    `;
                    contentTableBody.appendChild(row);
                });
            }
            renderPagination('content-pagination', data.totalPages, page, fetchAndDisplayContent);
        } catch (error) {
            console.error('Error fetching content:', error);
        }

        // Update sort indicators in table headers
        document.querySelectorAll('#content-modal .user-table th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === sortBy) {
                th.classList.add(`sort-${sortOrder}`);
            }
        });
    };

    const handleContentSort = (e) => { // This function is fine
        const newSortBy = e.target.dataset.sort;
        const newSortOrder = (currentContentSort.sortBy === newSortBy && currentContentSort.sortOrder === 'asc') ? 'desc' : 'asc';
        fetchAndDisplayContent(1, newSortBy, newSortOrder, currentContentSearch);
    };

    const contentModal = document.getElementById('content-modal');
    const closeContentModal = document.getElementById('close-content-modal');

    if (contentNavLink) {
        contentNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            const contentModalContent = contentModal.querySelector('.modal-content');
            if (contentModalContent.children.length <= 1) { // Load content only once
                const template = document.getElementById('content-view-template');
                contentModalContent.appendChild(template.content.cloneNode(true));
                initializeContentViewListeners();
            }
            document.getElementById('content-search-input').value = ''; // Clear search
            currentContentSearch = ''; // Reset search state
            fetchAndDisplayContent();
            contentModal.classList.remove('hidden');
        });
    }

    if (closeContentModal) {
        closeContentModal.addEventListener('click', () => contentModal.classList.add('hidden'));
    }

    const initializeContentViewListeners = () => {
        const contentSearchInput = document.getElementById('content-search-input');
        const contentSearchBtn = document.getElementById('content-search-btn');
        const exportContentBtn = document.getElementById('export-content-csv-btn');
        const bulkAddContentBtn = document.getElementById('bulk-add-content-btn');
        const addContentBtn = document.getElementById('add-content-btn');
        const contentTableBody = document.getElementById('content-table-body');

        const handleContentSearch = () => {
            currentContentSearch = contentSearchInput.value;
            fetchAndDisplayContent(1, currentContentSort.sortBy, currentContentSort.sortOrder, currentContentSearch);
        };

        if (contentSearchBtn) contentSearchBtn.addEventListener('click', handleContentSearch);
        if (contentSearchInput) contentSearchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') handleContentSearch();
        });

        if (exportContentBtn) exportContentBtn.addEventListener('click', exportContentToCSV);

        const bulkAddContentModal = document.getElementById('bulk-add-content-modal');
        if (bulkAddContentBtn) {
            bulkAddContentBtn.addEventListener('click', () => bulkAddContentModal.classList.remove('hidden'));
        }
        const closeBulkAddContentModal = document.getElementById('close-bulk-add-content-modal');
        if (closeBulkAddContentModal) {
            closeBulkAddContentModal.addEventListener('click', () => bulkAddContentModal.classList.add('hidden'));
        }

        if (addContentBtn) {
            addContentBtn.addEventListener('click', () => openContentFormModal());
        }

        if (contentTableBody) {
            contentTableBody.addEventListener('click', async (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                const contentId = target.dataset.id;
                if (target.classList.contains('btn-edit')) {
                    openContentFormModal(contentId);
                } else if (target.classList.contains('btn-delete')) {
                    if (!confirm('Are you sure you want to delete this content?')) return;
                    const response = await fetch(`/api/content/${contentId}`, { method: 'DELETE' });
                    if (response.ok) {
                        alert('Content deleted successfully.');
                        fetchAndDisplayContent();
                    } else alert('Failed to delete content.');
                }
            });
        }
    };

    // --- Unified Add/Edit Content Modal Logic ---
    const contentForm = document.getElementById('content-form');

    const openContentFormModal = async (contentId = null) => {
        contentForm.reset();
        const formTitle = document.getElementById('content-form-title');
        const formSubmitBtn = document.getElementById('content-form-submit-btn');
        const contentIdField = document.getElementById('content-id');

        if (contentId) {
            // --- EDIT MODE ---
            formTitle.textContent = 'Edit Content';
            formSubmitBtn.textContent = 'Save Changes';
            try {
                const response = await fetch(`/api/content/${contentId}`);
                if (!response.ok) throw new Error('Could not fetch content details.');
                const content = await response.json();

                contentIdField.value = content._id;
                document.getElementById('content-title').value = content.title;
                document.getElementById('content-type').value = content.type;
                document.getElementById('content-exam').value = content.exam;
                document.getElementById('content-url').value = content.url;

            } catch (error) {
                alert(error.message);
                return; // Don't open modal if fetch fails
            }
        } else {
            // --- ADD MODE ---
            formTitle.textContent = 'Add New Content';
            formSubmitBtn.textContent = 'Add Content';
            contentIdField.value = ''; // Clear the ID
        }
        contentFormModal.classList.remove('hidden');
    };

    const contentFormModal = document.getElementById('content-form-modal');
    const closeContentFormModal = document.getElementById('close-content-form-modal');
    if (closeContentFormModal) {
        closeContentFormModal.addEventListener('click', () => {
            contentFormModal.classList.add('hidden');
        });
    }

    // Event listener for form submission (handles both Add and Edit)
    if (contentForm) {
        contentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('content-id').value;
            const title = document.getElementById('content-title').value;
            const type = document.getElementById('content-type').value;
            const exam = document.getElementById('content-exam').value;
            const url = document.getElementById('content-url').value;

            const isEditing = !!id;
            const method = isEditing ? 'PUT' : 'POST';
            const endpoint = isEditing ? `/api/content/${id}` : '/api/content';

            try {
                const response = await fetch(endpoint, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, type, exam, url })
                });
                const result = await response.json();
                alert(result.message);

                if (response.ok) {
                    contentFormModal.classList.add('hidden');
                    fetchAndDisplayContent();
                    if (!isEditing) fetchDashboardStats(); // Refresh stats only on add
                }
            } catch (error) {
                alert(`Failed to ${isEditing ? 'update' : 'add'} content.`);
            }
        });
    };


    const bulkAddContentModal = document.getElementById('bulk-add-content-modal');
    const bulkAddContentForm = document.getElementById('bulk-add-content-form');
    if (bulkAddContentForm) {
        bulkAddContentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const bulkData = document.getElementById('bulk-content-data').value;
            const lines = bulkData.split('\n').filter(line => line.trim() !== '');

            const contentItems = lines.map(line => {
                const [title, type, exam, url] = line.split(',').map(item => item.trim());
                return { title, type, exam, url };
            });

            if (contentItems.length === 0) {
                alert('No content data provided.');
                return;
            }

            try {
                const response = await fetch('/api/content/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: contentItems })
                });
                const result = await response.json();
                alert(result.message);

                if (response.ok) {
                    bulkAddContentModal.classList.add('hidden');
                    bulkAddContentForm.reset();
                    fetchAndDisplayContent();
                    fetchDashboardStats();
                }
            } catch (error) {
                alert('Failed to add bulk content. Please check the format and try again.');
            }
        });
    }

    // --- Admin Profile & Password Change Modals ---
    const adminProfileBtn = document.getElementById('admin-profile-btn');
    const adminProfileModal = document.getElementById('admin-profile-modal');
    const closeAdminProfileModal = document.getElementById('close-admin-profile-modal');
    const adminChangePasswordBtn = document.getElementById('admin-change-password-btn');
    const adminChangePasswordModal = document.getElementById('admin-change-password-modal');
    const closeAdminChangePasswordModal = document.getElementById('close-admin-change-password-modal');
    const adminChangePasswordForm = document.getElementById('admin-change-password-form');

    if (adminProfileBtn) {
        adminProfileBtn.addEventListener('click', () => {
            if (adminProfileModal) adminProfileModal.classList.remove('hidden');
        });
    }

    if (closeAdminProfileModal) {
        closeAdminProfileModal.addEventListener('click', () => {
            if (adminProfileModal) adminProfileModal.classList.add('hidden');
        });
    }

    if (adminChangePasswordBtn) {
        adminChangePasswordBtn.addEventListener('click', () => {
            if (adminProfileModal) adminProfileModal.classList.add('hidden');
            if (adminChangePasswordModal) adminChangePasswordModal.classList.remove('hidden');
        });
    }

    if (closeAdminChangePasswordModal) {
        closeAdminChangePasswordModal.addEventListener('click', () => {
            if (adminChangePasswordModal) adminChangePasswordModal.classList.add('hidden');
        });
    }

    if (adminChangePasswordForm) {
        adminChangePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('admin-current-password').value;
            const newPassword = document.getElementById('admin-new-password').value;

            try {
                const response = await fetch('/api/admin/change-password', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const result = await response.json();
                alert(result.message);
                if (response.ok) {
                    adminChangePasswordModal.classList.add('hidden');
                    adminChangePasswordForm.reset();
                }
            } catch (error) { alert('An error occurred while changing the password.'); }
        });
    }

    // --- Stat Card Click Logic ---
    if (totalUsersCard) {
        totalUsersCard.style.cursor = 'pointer';
        totalUsersCard.addEventListener('click', () => {
            usersNavLink.click(); // Programmatically click the nav link
        });
    }

    if (contentUploadsCard) {
        contentUploadsCard.style.cursor = 'pointer';
        contentUploadsCard.addEventListener('click', () => {
            contentNavLink.click(); // Programmatically click the nav link
        });
    }

    if (activeExamsCard) {
        activeExamsCard.style.cursor = 'pointer';
        activeExamsCard.addEventListener('click', () => {
            window.location.href = '/home.html'; // Navigate to the home page to see exams
        });
    }

    if (serverStatusCard) {
        serverStatusCard.style.cursor = 'pointer';
        serverStatusCard.addEventListener('click', () => fetchDashboardStats()); // Refresh stats on click
    }


    const fetchDashboardStats = async () => {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            if (!response.ok) {
                throw new Error(stats.message || 'Failed to fetch dashboard stats.');
            }
            if (totalUsersStat) totalUsersStat.textContent = stats.totalUsers;
            if (activeExamsStat) activeExamsStat.textContent = stats.activeExams;
            if (contentUploadsStat) contentUploadsStat.textContent = stats.contentUploads;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    };
    // Initial fetch for the dashboard stats
    fetchDashboardStats();
});