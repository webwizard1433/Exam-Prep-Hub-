document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const sideMenu = document.querySelector('.side-menu');

    if (menuToggle && sideMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sideMenu.classList.toggle('open');
            document.body.classList.toggle('menu-open');
        });

        document.addEventListener('click', (e) => {
            if (sideMenu.classList.contains('open') && !sideMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                sideMenu.classList.remove('open');
                document.body.classList.remove('menu-open');
            }
        });
    }

    // --- Resource Page Tab Logic ---
    const resourceTabs = document.querySelector('.resource-tabs');
    if (resourceTabs) {
        const tabLinks = resourceTabs.querySelectorAll('.resource-tab-link');
        const tabContents = document.querySelectorAll('.resource-tab-content');

        resourceTabs.addEventListener('click', (e) => {
            if (e.target.matches('.resource-tab-link')) {
                const tabId = e.target.dataset.tab;

                tabLinks.forEach(link => link.classList.remove('active'));
                e.target.classList.add('active');

                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(tabId).classList.add('active');
            }
        });
    }

    // --- Document Viewer Modal Logic ---
    const docViewerModal = document.getElementById('doc-viewer-modal');
    if (docViewerModal) {
        const closeDocViewerModal = document.getElementById('close-doc-viewer-modal');
        const docIframe = document.getElementById('doc-iframe');
        const mainContent = document.querySelector('.main-content'); // Use a broader container

        if (mainContent) {
            mainContent.addEventListener('click', (e) => {
                const docLink = e.target.closest('.doc-link');
                if (docLink) {
                    e.preventDefault();
                    const docUrl = docLink.dataset.docUrl;
                    if (docUrl && docIframe) {
                        docIframe.src = docUrl;
                        docViewerModal.classList.remove('hidden');
                    }
                }
            });
        }

        if (closeDocViewerModal) {
            closeDocViewerModal.addEventListener('click', () => {
                docViewerModal.classList.add('hidden');
                if (docIframe) docIframe.src = 'about:blank'; // Clear iframe to stop loading
            });
        }
    }

    // --- PYQ Papers Modal Logic ---
    const pyqPapersModal = document.getElementById('pyq-papers-modal');
    if (pyqPapersModal) {
        const closePyqPapersModal = document.getElementById('close-pyq-papers-modal');
        const pyqModalTitle = document.getElementById('pyq-modal-title');
        const pyqPapersList = document.getElementById('pyq-papers-list');
        const mainContent = document.querySelector('.main-content');

        // A mock database of papers. In a real app, this would come from a server.
        const papersData = {
            upsc: {
                '2023': [
                    { name: 'General Studies Paper I', url: '#' },
                    { name: 'CSAT Paper II', url: '#' }
                ],
                '2022': [
                    { name: 'General Studies Paper I', url: '#' },
                    { name: 'CSAT Paper II', url: '#' }
                ],
                // Add more years and papers as needed
            },
            cds: {
                '2023': [
                    { name: 'English', url: '#' },
                    { name: 'General Knowledge', url: '#' },
                    { name: 'Elementary Mathematics', url: '#' }
                ],
            },
            ssc: {
                '2023': [
                    { name: 'Tier-I Paper', url: '#' }
                ]
            },
            capf: {
                '2023': [
                    { name: 'Paper I: General Ability', url: '#' },
                    { name: 'Paper II: Essay & Comprehension', url: '#' }
                ]
            }
        };

        if (mainContent) {
            mainContent.addEventListener('click', (e) => {
                const pyqLink = e.target.closest('.pyq-link');
                if (pyqLink) {
                    e.preventDefault();
                    const year = pyqLink.dataset.year;
                    const examType = document.body.id || 'upsc'; // e.g., 'upsc', 'cds', etc.
                    const examName = examType.toUpperCase();

                    pyqModalTitle.textContent = `${examName} Papers - ${year}`;
                    pyqPapersList.innerHTML = ''; // Clear previous list

                    const papers = papersData[examType]?.[year] || [{ name: 'No papers found for this year.', url: '#' }];

                    papers.forEach(paper => {
                        const li = document.createElement('li');
                        li.className = 'resource-item';
                        li.innerHTML = `
                            <a href="${paper.url}" class="doc-link" data-doc-url="${paper.url}">
                                <div class="resource-item-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg></div>
                                <div class="resource-item-details"><h3>${paper.name}</h3></div>
                                <div class="resource-item-action">&rarr;</div>
                            </a>
                        `;
                        pyqPapersList.appendChild(li);
                    });

                    pyqPapersModal.classList.remove('hidden');
                }
            });
        }

        if (closePyqPapersModal) {
            closePyqPapersModal.addEventListener('click', () => {
                pyqPapersModal.classList.add('hidden');
            });
        }
    }
});