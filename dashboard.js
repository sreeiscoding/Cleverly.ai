const API_BASE_URL = 'http://localhost:4000'; // Ensure this matches your backend URL

// Helper function to get file icon class based on file type
function getFileIconClass(fileType) {
    if (fileType.includes('pdf')) {
        return 'fas fa-file-pdf';
    } else if (fileType.includes('word') || fileType.includes('docx')) {
        return 'fas fa-file-word';
    } else if (fileType.includes('text')) {
        return 'fas fa-file-alt';
    } else {
        return 'fas fa-file'; // Generic file icon
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const authToken = localStorage.getItem('authToken');
    const userProfileName = document.querySelector('.user-info h4');
    const userProfileRole = document.querySelector('.user-info p');
    const authStatusSpan = document.querySelector('.user-info h4 .auth-status');
    if (userProfileName) {
        userProfileName.textContent = 'Loading...';
    }
    const logoutButton = document.querySelector('.navbar-logout-btn');
    if (userProfileRole) {
        userProfileRole.textContent = 'Loading...';
    }
    if (authStatusSpan) {
        authStatusSpan.textContent = 'Checking...';
    }

    // 1. Check for authToken and redirect if not present
    if (!authToken) {
        console.log('No auth token found, redirecting to signin.html');
        window.location.href = 'signin.html';
        return; // Stop further execution
    }

    // 2. Fetch User Data
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            // If token is invalid or expired, clear it and redirect to login
            console.error('Failed to fetch user data:', response.statusText);
            localStorage.removeItem('authToken');
            localStorage.removeItem('accountType');
            window.location.href = 'signin.html';
            return;
        }

        const data = await response.json();
        const user = data.user;
        console.log('Fetched user data:', user);

        // 3. Populating User UI
        if (userProfileName && userProfileRole) {
            userProfileName.textContent = user.name || user.email;
            const userAccountType = user.account_type || 'User';
            const userPlan = user.plan || 'Free Plan';
            userProfileRole.textContent = `${userAccountType} | ${userPlan}`;
            if (authStatusSpan) {
                authStatusSpan.textContent = 'Authenticated';
            }
        }

    } catch (error) {
        console.error('Network error or failed to fetch user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('accountType');
        window.location.href = 'signin.html';
        return;
    }

    // Function to show a specific content area and hide others
    function showContentArea(feature) {
        document.querySelectorAll('.content-area').forEach(area => {
            area.style.display = 'none';
        });
        const targetArea = document.getElementById(`${feature}-content-area`);
        if (targetArea) {
            targetArea.style.display = 'block';
            // Ensure popup is hidden if a content area is found
            const customPopup = document.getElementById('custom-popup');
            if (customPopup) {
                customPopup.style.display = 'none';
            }
        } else {
            // Fallback for features without a dedicated content area, show popup
            // But explicitly prevent for 'main'
            if (feature === 'main') {
                const customPopup = document.getElementById('custom-popup');
                if (customPopup) {
                    customPopup.style.display = 'none';
                }
                return; // Do not show popup for 'main'
            }

            const customPopup = document.getElementById('custom-popup');
            const popupTitle = document.getElementById('popup-title');
            const popupDescription = document.getElementById('popup-description');
            const clickedBtn = document.querySelector(`.sidebar-btn[data-feature="${feature}"]`);
            if (clickedBtn) {
                popupTitle.textContent = clickedBtn.querySelector('h4').textContent;
                popupDescription.textContent = clickedBtn.querySelector('p').textContent;
                customPopup.style.display = 'flex';
            }
        }
    }

    // Sidebar button interactivity
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    const customPopup = document.getElementById('custom-popup'); // Define customPopup here
    const popupTitle = document.getElementById('popup-title');
    const popupDescription = document.getElementById('popup-description');
    const closeButton = document.querySelector('.close-button');

    // Function to populate file selects
    async function populateFileSelects() {
        const uploads = await fetchUserUploads();
        const selects = [
            'smart-summary-file-select',
            'mind-map-file-select',
            'study-guide-file-select',
            'flashcards-file-select',
            'key-points-file-select',
            'concept-map-file-select'
        ];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Choose a file...</option>';
                uploads.forEach(upload => {
                    const option = document.createElement('option');
                    option.value = upload.id;
                    option.textContent = upload.filename || upload.name;
                    select.appendChild(option);
                });
            }
        
            // Feature button event listeners
            document.addEventListener('DOMContentLoaded', function() {
                // Smart Summary
                const smartSummaryBtn = document.getElementById('generate-smart-summary-btn');
                if (smartSummaryBtn) {
                    smartSummaryBtn.addEventListener('click', async function() {
                        const fileSelect = document.getElementById('smart-summary-file-select');
                        const fileId = fileSelect.value;
                        if (!fileId) {
                            alert('Please select a file first.');
                            return;
                        }
        
                        this.disabled = true;
                        this.textContent = 'Generating...';
        
                        try {
                            // First, get file content (assuming we have an endpoint to get file content)
                            const fileResponse = await fetch(`${API_BASE_URL}/upload/${fileId}/download`, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                            });
        
                            if (!fileResponse.ok) throw new Error('Failed to fetch file content');
        
                            const fileContent = await fileResponse.text();
        
                            // Then summarize
                            const response = await fetch(`${API_BASE_URL}/ai/summarize`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                },
                                body: JSON.stringify({ text: fileContent })
                            });
        
                            const result = await response.json();
                            if (response.ok) {
                                document.getElementById('smart-summary-results').innerHTML = `<pre>${result.summary}</pre>`;
                            } else {
                                throw new Error(result.message || 'Failed to generate summary');
                            }
                        } catch (error) {
                            console.error('Smart Summary error:', error);
                            document.getElementById('smart-summary-results').innerHTML = `<p>Error: ${error.message}</p>`;
                        } finally {
                            this.disabled = false;
                            this.textContent = 'Generate Summary';
                        }
                    });
                }
        
                // Mind Map
                const mindMapBtn = document.getElementById('generate-mind-map-btn');
                if (mindMapBtn) {
                    mindMapBtn.addEventListener('click', async function() {
                        const fileSelect = document.getElementById('mind-map-file-select');
                        const fileId = fileSelect.value;
                        if (!fileId) {
                            alert('Please select a file first.');
                            return;
                        }
        
                        this.disabled = true;
                        this.textContent = 'Generating...';
        
                        try {
                            const response = await fetch(`${API_BASE_URL}/notes-breakdown/mind-map`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                },
                                body: JSON.stringify({ fileId })
                            });
        
                            const result = await response.json();
                            if (response.ok) {
                                document.getElementById('mind-map-results').innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
                            } else {
                                throw new Error(result.message || 'Failed to generate mind map');
                            }
                        } catch (error) {
                            console.error('Mind Map error:', error);
                            document.getElementById('mind-map-results').innerHTML = `<p>Error: ${error.message}</p>`;
                        } finally {
                            this.disabled = false;
                            this.textContent = 'Generate Mind Map';
                        }
                    });
                }
        
                // Study Guide
                const studyGuideBtn = document.getElementById('generate-study-guide-btn');
                if (studyGuideBtn) {
                    studyGuideBtn.addEventListener('click', async function() {
                        const fileSelect = document.getElementById('study-guide-file-select');
                        const fileId = fileSelect.value;
                        if (!fileId) {
                            alert('Please select a file first.');
                            return;
                        }
        
                        this.disabled = true;
                        this.textContent = 'Generating...';
        
                        try {
                            const response = await fetch(`${API_BASE_URL}/notes-breakdown/study-guide`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                },
                                body: JSON.stringify({ fileId })
                            });
        
                            const result = await response.json();
                            if (response.ok) {
                                document.getElementById('study-guide-results').innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
                            } else {
                                throw new Error(result.message || 'Failed to generate study guide');
                            }
                        } catch (error) {
                            console.error('Study Guide error:', error);
                            document.getElementById('study-guide-results').innerHTML = `<p>Error: ${error.message}</p>`;
                        } finally {
                            this.disabled = false;
                            this.textContent = 'Generate Study Guide';
                        }
                    });
                }
        
                // Flashcards
                const flashcardsBtn = document.getElementById('generate-flashcards-btn');
                if (flashcardsBtn) {
                    flashcardsBtn.addEventListener('click', async function() {
                        const fileSelect = document.getElementById('flashcards-file-select');
                        const fileId = fileSelect.value;
                        if (!fileId) {
                            alert('Please select a file first.');
                            return;
                        }
        
                        this.disabled = true;
                        this.textContent = 'Generating...';
        
                        try {
                            const response = await fetch(`${API_BASE_URL}/notes-breakdown/flashcards`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                },
                                body: JSON.stringify({ fileId })
                            });
        
                            const result = await response.json();
                            if (response.ok) {
                                document.getElementById('flashcards-results').innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
                            } else {
                                throw new Error(result.message || 'Failed to generate flashcards');
                            }
                        } catch (error) {
                            console.error('Flashcards error:', error);
                            document.getElementById('flashcards-results').innerHTML = `<p>Error: ${error.message}</p>`;
                        } finally {
                            this.disabled = false;
                            this.textContent = 'Generate Flashcards';
                        }
                    });
                }
        
                // Key Points
                const keyPointsBtn = document.getElementById('generate-key-points-btn');
                if (keyPointsBtn) {
                    keyPointsBtn.addEventListener('click', async function() {
                        const fileSelect = document.getElementById('key-points-file-select');
                        const fileId = fileSelect.value;
                        if (!fileId) {
                            alert('Please select a file first.');
                            return;
                        }
        
                        this.disabled = true;
                        this.textContent = 'Extracting...';
        
                        try {
                            const response = await fetch(`${API_BASE_URL}/notes-breakdown/key-points`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                },
                                body: JSON.stringify({ fileId })
                            });
        
                            const result = await response.json();
                            if (response.ok) {
                                document.getElementById('key-points-results').innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
                            } else {
                                throw new Error(result.message || 'Failed to extract key points');
                            }
                        } catch (error) {
                            console.error('Key Points error:', error);
                            document.getElementById('key-points-results').innerHTML = `<p>Error: ${error.message}</p>`;
                        } finally {
                            this.disabled = false;
                            this.textContent = 'Extract Key Points';
                        }
                    });
                }
        
                // Concept Map
                const conceptMapBtn = document.getElementById('generate-concept-map-btn');
                if (conceptMapBtn) {
                    conceptMapBtn.addEventListener('click', async function() {
                        const fileSelect = document.getElementById('concept-map-file-select');
                        const fileId = fileSelect.value;
                        if (!fileId) {
                            alert('Please select a file first.');
                            return;
                        }
        
                        this.disabled = true;
                        this.textContent = 'Generating...';
        
                        try {
                            const response = await fetch(`${API_BASE_URL}/notes-breakdown/concept-map`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                },
                                body: JSON.stringify({ fileId })
                            });
        
                            const result = await response.json();
                            if (response.ok) {
                                document.getElementById('concept-map-results').innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
                            } else {
                                throw new Error(result.message || 'Failed to generate concept map');
                            }
                        } catch (error) {
                            console.error('Concept Map error:', error);
                            document.getElementById('concept-map-results').innerHTML = `<p>Error: ${error.message}</p>`;
                        } finally {
                            this.disabled = false;
                            this.textContent = 'Generate Concept Map';
                        }
                    });
                }
        
                // Search Notes
                const searchNotesBtn = document.getElementById('search-notes-btn');
                if (searchNotesBtn) {
                    searchNotesBtn.addEventListener('click', async function() {
                        const query = document.getElementById('search-notes-input').value.trim();
                        if (!query) {
                            alert('Please enter a search query.');
                            return;
                        }
        
                        this.disabled = true;
                        this.textContent = 'Searching...';
        
                        try {
                            const response = await fetch(`${API_BASE_URL}/upload/notes/search?q=${encodeURIComponent(query)}`, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                            });
        
                            const results = await response.json();
                            if (response.ok) {
                                const resultsHtml = results.map(result => `
                                    <div class="search-result">
                                        <h4>${result.filename}</h4>
                                        <p>${result.snippet || 'No preview available'}</p>
                                    </div>
                                `).join('');
                                document.getElementById('search-notes-results').innerHTML = resultsHtml || '<p>No results found.</p>';
                            } else {
                                throw new Error(results.message || 'Search failed');
                            }
                        } catch (error) {
                            console.error('Search error:', error);
                            document.getElementById('search-notes-results').innerHTML = `<p>Error: ${error.message}</p>`;
                        } finally {
                            this.disabled = false;
                            this.textContent = 'Search';
                        }
                    });
                }
        
                // Statistics
                const statisticsArea = document.getElementById('statistics-results');
                if (statisticsArea) {
                    // Load statistics on page load or when statistics tab is shown
                    fetch(`${API_BASE_URL}/notes-breakdown/stats/summary`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                    })
                    .then(response => response.json())
                    .then(stats => {
                        statisticsArea.innerHTML = `
                            <div class="stats-grid">
                                <div class="stat-item"><h3>Total Files</h3><p>${stats.totalFiles || 0}</p></div>
                                <div class="stat-item"><h3>Processed Files</h3><p>${stats.processedFiles || 0}</p></div>
                                <div class="stat-item"><h3>Mind Maps Generated</h3><p>${stats.mindMaps || 0}</p></div>
                                <div class="stat-item"><h3>Study Guides Created</h3><p>${stats.studyGuides || 0}</p></div>
                            </div>
                        `;
                    })
                    .catch(error => {
                        console.error('Statistics error:', error);
                        statisticsArea.innerHTML = '<p>Failed to load statistics.</p>';
                    });
                }
            });
        });
    }

    // Call populateFileSelects when DOM is loaded
    populateFileSelects();

    sidebarBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Prevent clicking if disabled
            if (this.hasAttribute('data-initial-disabled')) {
                return;
            }

            sidebarBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            // Remove active class from start button if it has it
            if (startButton) {
                startButton.classList.remove('active');
            }

            // When any sidebar button is clicked, disable the 8 links again
            document.querySelectorAll('.sidebar-btn:not([data-feature="main"])').forEach(btnToDisable => {
                btnToDisable.setAttribute('data-initial-disabled', 'true');
            });

            const feature = this.dataset.feature;
            console.log('Selected feature:', feature);

            if (feature === 'main') {
                showContentArea('main');
            } else if (feature === 'search-notes' || feature === 'statistics') {
                // For search and statistics, show content area directly
                showContentArea(feature);
            } else {
                // For other features, show content area with file selection
                showContentArea(feature);
            }
        });
    });

    // Initial setup: Disable the 8 sidebar links
    document.querySelectorAll('.sidebar-btn[data-initial-disabled="true"]').forEach(btn => {
        btn.setAttribute('data-initial-disabled', 'true');
    });

    // Set 'Main' as default active tab and show its content on load
    const defaultActiveButton = document.querySelector('.sidebar-btn.active');
    if (defaultActiveButton) {
        showContentArea(defaultActiveButton.dataset.feature);
    } else {
        // If no default active button is set in HTML, activate 'Main'
        const mainButton = document.querySelector('.sidebar-btn[data-feature="main"]');
        if (mainButton) {
            mainButton.classList.add('active');
            showContentArea('main');
        }
    }

    closeButton.addEventListener('click', function() {
        customPopup.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target === customPopup) {
            customPopup.style.display = 'none';
        }
    });

    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('click', function() {
            alert('Feature card clicked: ' + this.querySelector('h3').textContent);
        });
    });

    // 4. Logout Functionality
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            console.log('Logout button clicked, clearing token and redirecting.');
            localStorage.removeItem('authToken');
            localStorage.removeItem('accountType');
            window.location.href = 'signin.html';
        });
    }

    // 5. "Start" button functionality for file upload
    const startButton = document.querySelector('.navbar-start-btn');
    const workspace = document.getElementById('workspace');

    if (startButton && workspace) {
        startButton.addEventListener('click', function() {
            // Hide all existing content areas
            document.querySelectorAll('.content-area').forEach(area => {
                area.style.display = 'none';
            });
            // Hide the custom popup if it's visible
            const customPopup = document.getElementById('custom-popup');
            if (customPopup) {
                customPopup.style.display = 'none';
            }

            // Remove any previously created upload tab to avoid duplicates
            const existingUploadTab = document.getElementById('upload-tab-content');
            if (existingUploadTab) {
                existingUploadTab.remove();
            }

            // Deactivate all sidebar buttons
            sidebarBtns.forEach(b => b.classList.remove('active'));
            // Activate the start button
            startButton.classList.add('active');

            // Enable the 8 sidebar links
            document.querySelectorAll('.sidebar-btn[data-initial-disabled]').forEach(btnToEnable => {
                btnToEnable.removeAttribute('data-initial-disabled');
            });

            // Create the new upload tab content
            const uploadTabContent = document.createElement('div');
            uploadTabContent.id = 'upload-tab-content';
            uploadTabContent.classList.add('content-area'); // Use content-area class for styling consistency
            uploadTabContent.style.display = 'block'; // Make it visible

            uploadTabContent.innerHTML = `
                <div class="upload-wrapper">
                    <div class="upload-container">
                        <h2>Upload Your Notes</h2>
                        <p>Select a file to upload or drag and drop it here.</p>
                        <div class="file-upload-section">
                            <div class="file-upload-area" id="drop-zone">
                                <div class="drop-zone-content">
                                    <i class="fas fa-cloud-upload-alt upload-icon"></i>
                                    <p>Drag & Drop your file here or</p>
                                    <input type="file" id="notes-file-input" accept=".pdf,.docx,.txt" style="display: none;">
                                    <label for="notes-file-input" class="upload-button">
                                        Choose File
                                    </label>
                                </div>
                            </div>
                            <div class="file-preview-area" id="file-preview-area" style="display: none;">
                                <div class="file-info">
                                    <i id="file-icon" class="file-icon"></i>
                                    <div class="file-details">
                                        <span id="preview-file-name" class="preview-file-name"></span>
                                        <span id="preview-file-type" class="preview-file-type"></span>
                                        <span id="preview-file-size" class="preview-file-size"></span>
                                    </div>
                                </div>
                                <button id="remove-file-btn" class="remove-file-button"><i class="fas fa-times"></i></button>
                            </div>
                        </div>
                        <button id="process-notes-btn" class="process-button" disabled>Process Notes</button>
                    </div>
                    <div class="upload-tabs-right">
                        <div class="tab-links-right">
                            <button class="tab-link-right active" data-tab-right="recent">Recent</button>
                            <button class="tab-link-right" data-tab-right="favorites">Favorites</button>
                            <button class="tab-link-right" data-tab-right="library">Library</button>
                        </div>
                        <div class="tab-content-area-right">
                            <div id="recent-tab-content-right" class="tab-pane-right active">
                                <p>No recent files.</p>
                            </div>
                            <div id="favorites-tab-content-right" class="tab-pane-right">
                                <p>No favorite files.</p>
                            </div>
                            <div id="library-tab-content-right" class="tab-pane-right">
                                <p>Your library is empty.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            workspace.appendChild(uploadTabContent);

            const notesFileInput = uploadTabContent.querySelector('#notes-file-input');
            const processNotesBtn = uploadTabContent.querySelector('#process-notes-btn');
            const dropZone = uploadTabContent.querySelector('#drop-zone');
            const fileUploadArea = uploadTabContent.querySelector('.file-upload-area');
            const filePreviewArea = uploadTabContent.querySelector('#file-preview-area');
            const fileIcon = uploadTabContent.querySelector('#file-icon');
            const previewFileName = uploadTabContent.querySelector('#preview-file-name');
            const previewFileType = uploadTabContent.querySelector('#preview-file-type');
            const previewFileSize = uploadTabContent.querySelector('#preview-file-size');
            const removeFileBtn = uploadTabContent.querySelector('#remove-file-btn');

            // Tab functionality for right sidebar
            const tabLinksRight = uploadTabContent.querySelectorAll('.tab-link-right');
            const tabPanesRight = uploadTabContent.querySelectorAll('.tab-pane-right');

            tabLinksRight.forEach(link => {
                link.addEventListener('click', function() {
                    tabLinksRight.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');

                    tabPanesRight.forEach(pane => pane.classList.remove('active'));
                    const targetTab = this.dataset.tabRight;
                    uploadTabContent.querySelector(`#${targetTab}-tab-content-right`).classList.add('active');
                });
            });

            // Function to format file size
            function formatFileSize(bytes) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            }

            // Function to handle file selection and update UI
            function handleFileSelection(file) {
                if (file) {
                    fileUploadArea.style.display = 'none';
                    filePreviewArea.style.display = 'flex';

                    fileIcon.className = `file-icon ${getFileIconClass(file.type)}`;
                    previewFileName.textContent = file.name;
                    previewFileType.textContent = file.type || 'Unknown Type';
                    previewFileSize.textContent = formatFileSize(file.size);
                    processNotesBtn.disabled = false;

                    // Assign the file to the input for consistent processing
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    notesFileInput.files = dataTransfer.files;
                } else {
                    fileUploadArea.style.display = 'flex';
                    filePreviewArea.style.display = 'none';

                    fileIcon.className = 'file-icon';
                    previewFileName.textContent = '';
                    previewFileType.textContent = '';
                    previewFileSize.textContent = '';
                    processNotesBtn.disabled = true;
                    notesFileInput.value = ''; // Clear the input
                }
            }

            notesFileInput.addEventListener('change', function() {
                handleFileSelection(this.files[0]);
            });

            // Drag and drop functionality
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });

            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');

                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handleFileSelection(files[0]);
                }
            });

            removeFileBtn.addEventListener('click', function() {
                handleFileSelection(null); // Clear the selected file
            });

            // Function to fetch user uploads
            async function fetchUserUploads() {
                try {
                    const response = await fetch(`${API_BASE_URL}/upload/user/uploads`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        }
                    });

                    if (response.ok) {
                        const uploads = await response.json();
                        return uploads;
                    } else {
                        console.error('Failed to fetch uploads:', response.statusText);
                        return [];
                    }
                } catch (error) {
                    console.error('Error fetching uploads:', error);
                    return [];
                }
            }

            // Function to fetch favorite files
            async function fetchFavoriteFiles() {
                try {
                    const response = await fetch(`${API_BASE_URL}/upload/favorites`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        }
                    });

                    if (response.ok) {
                        const favorites = await response.json();
                        return favorites;
                    } else {
                        console.error('Failed to fetch favorites:', response.statusText);
                        return [];
                    }
                } catch (error) {
                    console.error('Error fetching favorites:', error);
                    return [];
                }
            }

            // Function to populate tab content
            function populateTabContent(tabId, files) {
                const tabContent = uploadTabContent.querySelector(`#${tabId}`);
                if (!tabContent) return;

                if (files.length === 0) {
                    tabContent.innerHTML = '<p>No files found.</p>';
                    return;
                }

                const fileList = files.map(file => `
                    <div class="file-item" data-file-id="${file.id}" data-file-name="${file.filename}" data-file-url="${file.url || ''}">
                        <i class="${getFileIconClass(file.filetype || file.type)}"></i>
                        <span class="file-name">${file.filename || file.name}</span>
                        <span class="file-date">${new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                `).join('');

                tabContent.innerHTML = fileList;

                // Add click handlers for file items
                tabContent.querySelectorAll('.file-item').forEach(item => {
                    item.addEventListener('click', function() {
                        // Highlight selected file
                        tabContent.querySelectorAll('.file-item').forEach(i => i.classList.remove('selected'));
                        this.classList.add('selected');

                        // Store selected file info
                        const fileId = this.dataset.fileId;
                        const fileName = this.dataset.fileName;
                        const fileUrl = this.dataset.fileUrl;

                        // Enable process button if a file is selected
                        processNotesBtn.disabled = false;
                        processNotesBtn.textContent = `Process ${fileName}`;

                        // Store selected file for processing
                        selectedFileForProcessing = { id: fileId, name: fileName, url: fileUrl };
                    });
                });
            }

            // Load initial data for tabs
            fetchUserUploads().then(uploads => {
                populateTabContent('recent-tab-content-right', uploads.slice(0, 10)); // Recent 10
                populateTabContent('library-tab-content-right', uploads); // All for library
            });

            fetchFavoriteFiles().then(favorites => {
                populateTabContent('favorites-tab-content-right', favorites);
            });

            let selectedFileForProcessing = null;

            // Function to show custom notification popup
            function showNotificationPopup(message, title = 'Success!', type = 'success') {
                const customPopup = document.getElementById('custom-popup');
                const popupTitle = document.getElementById('popup-title');
                const popupDescription = document.getElementById('popup-description');

                // Remove previous type classes
                popupTitle.classList.remove('success', 'error', 'info');
                // Add current type class
                popupTitle.classList.add(type);

                popupTitle.textContent = title;
                popupDescription.textContent = message;
                customPopup.style.display = 'flex';

                // Auto-hide after 4 seconds for success, 5 seconds for errors
                const hideDelay = type === 'error' ? 5000 : 4000;
                setTimeout(() => {
                    customPopup.style.display = 'none';
                }, hideDelay);
            }

            processNotesBtn.addEventListener('click', async function() {
                if (selectedFileForProcessing) {
                    const file = selectedFileForProcessing;
                    console.log('Processing existing file:', file.name);

                    // Show loading state
                    processNotesBtn.disabled = true;
                    processNotesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

                    try {
                        // For existing files, we might need to process via notesBreakdown
                        // Assuming we call /notesBreakdown/process-upload with file ID
                        const response = await fetch(`${API_BASE_URL}/notes-breakdown/process-upload`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                            },
                            body: JSON.stringify({ fileId: file.id })
                        });

                        const result = await response.json();

                        if (response.ok) {
                            console.log('Processing successful:', result);
                            showNotificationPopup(`File "${file.name}" is being processed! AI analysis will be available shortly.`, 'Processing Started!', 'success');

                            // Clear selection
                            selectedFileForProcessing = null;
                            processNotesBtn.disabled = true;
                            processNotesBtn.textContent = 'Process Notes';

                            // Remove selection highlight
                            uploadTabContent.querySelectorAll('.file-item.selected').forEach(item => item.classList.remove('selected'));
                        } else {
                            console.error('Processing failed:', result);
                            showNotificationPopup(`Processing failed: ${result.message || 'Unknown error'}`, 'Processing Failed', 'error');
                        }
                    } catch (error) {
                        console.error('Processing error:', error);
                        showNotificationPopup('Processing failed. Please try again.', 'Processing Error', 'error');
                    } finally {
                        // Reset button state
                        processNotesBtn.disabled = false;
                        processNotesBtn.innerHTML = 'Process Notes';
                    }
                } else if (notesFileInput.files && notesFileInput.files.length > 0) {
                    const file = notesFileInput.files[0];
                    console.log('Uploading new file:', file.name);

                    // Show loading state
                    processNotesBtn.disabled = true;
                    processNotesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

                    try {
                        // Create FormData for file upload
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('title', file.name); // Use filename as title

                        // Send file to backend
                        const response = await fetch(`${API_BASE_URL}/upload/notes`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                            },
                            body: formData
                        });

                        const result = await response.json();

                        if (response.ok) {
                            console.log('Upload successful:', result);
                            showNotificationPopup(`File "${file.name}" has been uploaded successfully to the database! AI analysis will be available shortly.`, 'Upload Successful!', 'success');

                            // Clear the file input and reset UI
                            handleFileSelection(null);

                            // Refresh the file lists
                            fetchUserUploads().then(uploads => {
                                populateTabContent('recent-tab-content-right', uploads.slice(0, 10));
                                populateTabContent('library-tab-content-right', uploads);
                            });

                            fetchFavoriteFiles().then(favorites => {
                                populateTabContent('favorites-tab-content-right', favorites);
                            });
                        } else {
                            console.error('Upload failed:', result);
                            showNotificationPopup(`Upload failed: ${result.message || 'Unknown error'}`, 'Upload Failed', 'error');
                        }
                    } catch (error) {
                        console.error('Upload error:', error);
                        showNotificationPopup('Upload failed. Please check your connection and try again.', 'Upload Error', 'error');
                    } finally {
                        // Reset button state
                        processNotesBtn.disabled = false;
                        processNotesBtn.innerHTML = 'Process Notes';
                    }
                } else {
                    showNotificationPopup('Please select a file first by choosing from the tabs or uploading a new file.', 'No File Selected', 'info');
                }
            });
        });
    }
});
