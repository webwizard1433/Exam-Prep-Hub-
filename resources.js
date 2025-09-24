document.addEventListener('DOMContentLoaded', () => {
    // --- Tab Switching Logic ---
    const tabs = document.querySelectorAll('.resource-tab-link');
    const tabContents = document.querySelectorAll('.resource-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and content
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to the clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.getElementById(tab.dataset.tab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // --- Document Viewer Modal Logic ---
    const docViewerModal = document.getElementById('doc-viewer-modal');
    const closeDocViewerBtn = document.getElementById('close-doc-viewer-modal');
    const docIframe = document.getElementById('doc-iframe');

    if (closeDocViewerBtn) {
        closeDocViewerBtn.addEventListener('click', () => {
            docViewerModal.classList.add('hidden');
            docIframe.src = 'about:blank'; // Clear iframe to stop loading
        });
    }

    // --- Event Delegation for all '.doc-link' clicks ---
    // This single listener handles clicks on existing and future doc links.
    document.addEventListener('click', (event) => {
        // Find the closest ancestor which is a .doc-link
        const docLink = event.target.closest('.doc-link');

        if (docLink) {
            event.preventDefault(); // Prevent default link behavior
            const docUrl = docLink.dataset.docUrl;

            if (docUrl && !docUrl.startsWith('path/to/')) {
                docIframe.src = docUrl;
                docViewerModal.classList.remove('hidden');
            } else {
                // This alert can be removed if you don't want a popup for unavailable docs.
                alert('Document not available yet.');
            }
        }
    });

    // --- PYQ Papers Modal Logic ---
    const pyqModal = document.getElementById('pyq-papers-modal');
    const closePyqModalBtn = document.getElementById('close-pyq-papers-modal');
    const pyqLinks = document.querySelectorAll('.pyq-link');
    const pyqModalTitle = document.getElementById('pyq-modal-title');
    const pyqPapersList = document.getElementById('pyq-papers-list');

    pyqLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const year = link.dataset.year;
            pyqModalTitle.textContent = `Previous Year Papers - ${year}`;
            
            // --- Mock Data for PYQ papers ---
            // In a real application, you would fetch this from an API
            pyqPapersList.innerHTML = `
                <li class="resource-item"><a href="#" class="doc-link" data-doc-url="path/to/pyq-${year}-gs1.pdf">General Studies Paper I</a></li>
                <li class="resource-item"><a href="#" class="doc-link" data-doc-url="path/to/pyq-${year}-gs2.pdf">General Studies Paper II (CSAT)</a></li>
            `;
            pyqModal.classList.remove('hidden');
        });
    });

    if (closePyqModalBtn) {
        closePyqModalBtn.addEventListener('click', () => {
            pyqModal.classList.add('hidden');
        });
    }

    // Close modals when clicking on the overlay
    [docViewerModal, pyqModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        }
    });
});