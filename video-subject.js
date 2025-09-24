document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const exam = params.get('exam');
    const subject = params.get('subject');

    if (!exam || !subject) {
        document.getElementById('subject-title').textContent = 'Error: Missing exam or subject information.';
        return;
    }

    // --- Update Page Titles and Links ---
    const subjectTitleCase = subject.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    document.title = `${exam.toUpperCase()} ${subjectTitleCase} Videos - Exam Prep Hub`;
    document.getElementById('subject-title').textContent = `${exam.toUpperCase()} - ${subjectTitleCase} Videos`;
    document.getElementById('subject-description').textContent = `Curated video lectures to master ${subjectTitleCase} for the ${exam.toUpperCase()} exam.`;
    document.getElementById('video-section-title').textContent = `${subjectTitleCase} Lectures`;

    const backButton = document.getElementById('back-to-resources');
    backButton.href = `${exam}-resources.html`;
    backButton.querySelector('span').textContent = `Back to ${exam.toUpperCase()} Resources`;


    // --- Fetch and Display Videos ---
    const fetchVideos = async () => {
        try {
            // We'll need to enhance the /api/content endpoint to filter by exam and title/subject
            // For now, let's assume an endpoint like: /api/content?exam=upsc&type=video&search=Polity
            const response = await fetch(`/api/content?exam=${exam}&type=video&search=${encodeURIComponent(subjectTitleCase)}&limit=0`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch videos.');
            }

            const videoGrid = document.getElementById('video-grid');
            videoGrid.innerHTML = ''; // Clear loading state

            if (data.content.length === 0) {
                videoGrid.innerHTML = '<p>No videos found for this subject yet.</p>';
                return;
            }

            data.content.forEach(video => {
                const videoLink = document.createElement('a');
                videoLink.href = video.url;
                videoLink.className = 'doc-link'; // Or your video item class
                videoLink.target = '_blank'; // Open in new tab

                const videoThumbnail = document.createElement('div');
                videoThumbnail.className = 'video-thumbnail';
                // Extract the "Video X" part from the title
                const videoNumberTitle = video.title.split(' - ').pop();
                videoThumbnail.innerHTML = `<p>${videoNumberTitle}</p>`;

                videoLink.appendChild(videoThumbnail);
                videoGrid.appendChild(videoLink);
            });

        } catch (error) {
            document.getElementById('video-grid').innerHTML = `<p class="error-message">Could not load videos: ${error.message}</p>`;
        }
    };

    fetchVideos();
});