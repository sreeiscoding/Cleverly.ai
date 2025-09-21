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
                    option.textContent = upload.file_name || upload.name;
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
                                        <h4>${result.file_name}</h4>
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
                    const response = await fetch(`${API_BASE_URL}/upload/notes`, {
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

            // Function to fetch user folders
            async function fetchUserFolders() {
                try {
                    const response = await fetch(`${API_BASE_URL}/upload/folders`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        }
                    });

                    if (response.ok) {
                        const folders = await response.json();
                        return folders;
                    } else {
                        console.error('Failed to fetch folders:', response.statusText);
                        return [];
                    }
                } catch (error) {
                    console.error('Error fetching folders:', error);
                    return [];
                }
            }

            // Function to create a new folder
            async function createNewFolder(folderName, description = '', color = '#14807a') {
                try {
                    const response = await fetch(`${API_BASE_URL}/upload/folders`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        },
                        body: JSON.stringify({ name: folderName, description, color })
                    });

                    if (response.ok) {
                        const folder = await response.json();
                        return folder;
                    } else {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Failed to create folder');
                    }
                } catch (error) {
                    console.error('Error creating folder:', error);
                    throw error;
                }
            }

            // Function to add file to folder
            async function addFileToFolder(fileId, folderId) {
                try {
                    const response = await fetch(`${API_BASE_URL}/upload/folders/add-file`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        },
                        body: JSON.stringify({ noteId: fileId, folderId })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Failed to add file to folder');
                    }
                } catch (error) {
                    console.error('Error adding file to folder:', error);
                    throw error;
                }
            }

            // Function to get folder files
            async function getFolderFiles(folderId) {
                try {
                    const response = await fetch(`${API_BASE_URL}/upload/folders/${folderId}/files`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        return data.files || [];
                    } else {
                        console.error('Failed to fetch folder files:', response.statusText);
                        return [];
                    }
                } catch (error) {
                    console.error('Error fetching folder files:', error);
                    return [];
                }
            }

            // Function to populate Library tab with folders and files
            async function populateLibraryTab(files) {
                const tabContent = uploadTabContent.querySelector('#library-tab-content-right');
                if (!tabContent) return;

                // Get folders
                const folders = await fetchUserFolders();

                // Separate files with and without folders
                const filesInFolders = files.filter(file => file.folder_id);
                const filesWithoutFolders = files.filter(file => !file.folder_id);

                // Create Library tab content
                let content = `
                    <div class="library-header">
                        <button class="create-folder-btn">
                            <i class="fas fa-folder-plus"></i>
                            Create Folder
                        </button>
                    </div>
                `;

                // Folders section
                if (folders.length > 0) {
                    content += `
                        <div class="library-section">
                            <h4 class="section-title">
                                <i class="fas fa-folder"></i>
                                Folders (${folders.length})
                            </h4>
                            <div class="folders-grid">
                                ${folders.map(folder => `
                                    <div class="folder-item" data-folder-id="${folder.id}" data-folder-name="${folder.name}">
                                        <div class="folder-icon" style="background-color: ${folder.color}">
                                            <i class="fas fa-folder"></i>
                                        </div>
                                        <div class="folder-info">
                                            <span class="folder-name">${folder.name}</span>
                                            <span class="folder-count">${filesInFolders.filter(f => f.folder_id === folder.id).length} files</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                // Files section
                content += `
                    <div class="library-section">
                        <h4 class="section-title">
                            <i class="fas fa-file"></i>
                            Files (${filesWithoutFolders.length})
                        </h4>
                        <div class="files-list">
                `;

                if (filesWithoutFolders.length === 0) {
                    content += '<p class="no-files">No files in library.</p>';
                } else {
                    content += filesWithoutFolders.map(file => `
                        <div class="file-item" data-file-id="${file.id}" data-file-name="${file.file_name}" data-file-url="${file.url || ''}">
                            <i class="${getFileIconClass(file.file_type || file.type)}"></i>
                            <span class="file-name">${file.file_name || file.name}</span>
                            <span class="file-date">${new Date(file.created_at).toLocaleDateString()}</span>
                            <i class="move-to-folder fas fa-folder" data-file-id="${file.id}" data-file-name="${file.file_name}" title="Move to folder"></i>
                            <i class="favorite-star ${file.is_favorite ? 'fas fa-star' : 'far fa-star'}" data-file-id="${file.id}"></i>
                            <i class="delete-file fas fa-trash-alt" data-file-id="${file.id}" data-file-name="${file.file_name}"></i>
                        </div>
                    `).join('');
                }

                content += `
                        </div>
                    </div>
                `;

                tabContent.innerHTML = content;

                // Add event listeners
                addLibraryEventListeners(tabContent, files);
            }

            // Function to add event listeners for library tab
            function addLibraryEventListeners(tabContent, allFiles) {
                // Create folder button
                const createFolderBtn = tabContent.querySelector('.create-folder-btn');
                if (createFolderBtn) {
                    createFolderBtn.addEventListener('click', async () => {
                        const folderName = await showCreateFolderPopup('Create New Folder');
                        if (folderName && folderName.trim()) {
                            try {
                                await createNewFolder(folderName.trim());
                                showNotificationPopup(`Folder "${folderName}" created successfully!`, 'Folder Created', 'success');

                                // Refresh library
                                fetchUserUploads().then(uploads => {
                                    populateLibraryTab(uploads);
                                });
                            } catch (error) {
                                showNotificationPopup(error.message, 'Folder Creation Failed', 'error');
                            }
                        }
                    });
                }

                // Folder click handlers
                tabContent.querySelectorAll('.folder-item').forEach(folder => {
                    folder.addEventListener('click', async function() {
                        const folderId = this.dataset.folderId;
                        const folderName = this.dataset.folderName;

                        // Show folder contents in a popup or expand
                        const folderFiles = await getFolderFiles(folderId);

                        if (folderFiles.length === 0) {
                            showNotificationPopup(`Folder "${folderName}" is empty.`, 'Folder Contents', 'info');
                            return;
                        }

                        // Create folder contents popup
                        const popup = document.createElement('div');
                        popup.id = 'folder-popup';
                        popup.className = 'custom-popup';
                        popup.innerHTML = `
                            <div class="popup-content folder-popup-content">
                                <span class="close-button" id="folder-close">&times;</span>
                                <h2>Folder: ${folderName}</h2>
                                <div class="folder-files-list">
                                    ${folderFiles.map(file => `
                                        <div class="file-item" data-file-id="${file.id}" data-file-name="${file.file_name}">
                                            <i class="${getFileIconClass(file.file_type || file.type)}"></i>
                                            <span class="file-name">${file.file_name || file.name}</span>
                                            <span class="file-date">${new Date(file.created_at).toLocaleDateString()}</span>
                                            <button class="remove-from-folder-btn" data-file-id="${file.id}" data-file-name="${file.file_name}">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;

                        document.body.appendChild(popup);
                        popup.style.display = 'flex';

                        // Close button
                        popup.querySelector('#folder-close').addEventListener('click', () => {
                            document.body.removeChild(popup);
                        });

                        // Remove from folder buttons
                        popup.querySelectorAll('.remove-from-folder-btn').forEach(btn => {
                            btn.addEventListener('click', async function() {
                                const fileId = this.dataset.fileId;
                                const fileName = this.dataset.fileName;

                                const confirmed = await showConfirmationPopup(
                                    `Remove "${fileName}" from folder "${folderName}"?`,
                                    'Remove from Folder'
                                );

                                if (confirmed) {
                                    try {
                                        // Remove file from folder (set folder_id to null)
                                        await fetch(`${API_BASE_URL}/upload/notes/${fileId}`, {
                                            method: 'PATCH',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                            },
                                            body: JSON.stringify({ folder_id: null })
                                        });

                                        showNotificationPopup(`File removed from folder successfully!`, 'File Removed', 'success');
                                        document.body.removeChild(popup);

                                        // Refresh library
                                        fetchUserUploads().then(uploads => {
                                            populateLibraryTab(uploads);
                                        });
                                    } catch (error) {
                                        showNotificationPopup('Failed to remove file from folder.', 'Error', 'error');
                                    }
                                }
                            });
                        });

                        // File click in folder popup
                        popup.querySelectorAll('.file-item').forEach(item => {
                            item.addEventListener('click', function(e) {
                                if (!e.target.closest('.remove-from-folder-btn')) {
                                    const fileId = this.dataset.fileId;
                                    const fileName = this.dataset.fileName;

                                    // Select file for processing
                                    uploadTabContent.querySelectorAll('.file-item').forEach(i => i.classList.remove('selected'));
                                    this.classList.add('selected');

                                    processNotesBtn.disabled = false;
                                    processNotesBtn.textContent = `Process ${fileName}`;
                                    selectedFileForProcessing = { id: fileId, name: fileName };
                                }
                            });
                        });
                    });
                });

                // File item click handlers (for files not in folders)
                tabContent.querySelectorAll('.files-list .file-item').forEach(item => {
                    item.addEventListener('click', function(e) {
                        if (!e.target.closest('.favorite-star, .delete-file')) {
                            // Highlight selected file
                            tabContent.querySelectorAll('.file-item').forEach(i => i.classList.remove('selected'));
                            this.classList.add('selected');

                            // Store selected file info
                            const fileId = this.dataset.fileId;
                            const fileName = this.dataset.fileName;

                            // Enable process button if a file is selected
                            processNotesBtn.disabled = false;
                            processNotesBtn.textContent = `Process ${fileName}`;

                            // Store selected file for processing
                            selectedFileForProcessing = { id: fileId, name: fileName };
                        }
                    });
                });

                // Favorite star handlers
                tabContent.querySelectorAll('.favorite-star').forEach(star => {
                    star.addEventListener('click', async function(e) {
                        e.stopPropagation();

                        const fileId = this.dataset.fileId;
                        try {
                            const response = await fetch(`${API_BASE_URL}/upload/notes/${fileId}/favorite`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                }
                            });

                            if (response.ok) {
                                this.classList.toggle('fas');
                                this.classList.toggle('far');

                                // Refresh all tabs
                                fetchUserUploads().then(uploads => {
                                    populateTabContent('recent-tab-content-right', uploads.slice(0, 10));
                                    populateLibraryTab(uploads);
                                });

                                fetchFavoriteFiles().then(favorites => {
                                    populateTabContent('favorites-tab-content-right', favorites);
                                });
                            }
                        } catch (error) {
                            console.error('Error toggling favorite:', error);
                        }
                    });
                });

                // Move to folder handlers
                tabContent.querySelectorAll('.move-to-folder').forEach(moveBtn => {
                    moveBtn.addEventListener('click', async function(e) {
                        e.stopPropagation();

                        const fileId = this.dataset.fileId;
                        const fileName = this.dataset.fileName;

                        // Get available folders
                        const folders = await fetchUserFolders();

                        if (folders.length === 0) {
                            showNotificationPopup('No folders available. Create a folder first.', 'No Folders', 'info');
                            return;
                        }

                        // Create folder selection popup
                        const popup = document.createElement('div');
                        popup.id = 'folder-select-popup';
                        popup.className = 'custom-popup';
                        popup.innerHTML = `
                            <div class="popup-content">
                                <span class="close-button" id="folder-select-close">&times;</span>
                                <h2>Move "${fileName}" to Folder</h2>
                                <div class="folder-selection">
                                    ${folders.map(folder => `
                                        <div class="folder-option" data-folder-id="${folder.id}" data-folder-name="${folder.name}">
                                            <div class="folder-option-icon" style="background-color: ${folder.color}">
                                                <i class="fas fa-folder"></i>
                                            </div>
                                            <span class="folder-option-name">${folder.name}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;

                        document.body.appendChild(popup);
                        popup.style.display = 'flex';

                        // Handle folder selection
                        popup.querySelectorAll('.folder-option').forEach(option => {
                            option.addEventListener('click', async function() {
                                const folderId = this.dataset.folderId;
                                const folderName = this.dataset.folderName;

                                try {
                                    await addFileToFolder(fileId, folderId);
                                    showNotificationPopup(`File moved to "${folderName}" successfully!`, 'File Moved', 'success');
                                    document.body.removeChild(popup);

                                    // Refresh library
                                    fetchUserUploads().then(uploads => {
                                        populateLibraryTab(uploads);
                                    });
                                } catch (error) {
                                    showNotificationPopup('Failed to move file to folder.', 'Error', 'error');
                                }
                            });
                        });

                        // Close button
                        popup.querySelector('#folder-select-close').addEventListener('click', () => {
                            document.body.removeChild(popup);
                        });
                    });
                });

                // Delete handlers
                tabContent.querySelectorAll('.delete-file').forEach(deleteBtn => {
                    deleteBtn.addEventListener('click', async function(e) {
                        e.stopPropagation();

                        const fileId = this.dataset.fileId;
                        const fileName = this.dataset.fileName;

                        const confirmed = await showConfirmationPopup(
                            `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
                            'Confirm Delete'
                        );

                        if (!confirmed) return;

                        try {
                            const response = await fetch(`${API_BASE_URL}/upload/notes/${fileId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                }
                            });

                            if (response.ok) {
                                showNotificationPopup(`File "${fileName}" has been deleted successfully.`, 'File Deleted', 'success');

                                // Refresh all tabs
                                fetchUserUploads().then(uploads => {
                                    populateTabContent('recent-tab-content-right', uploads.slice(0, 10));
                                    populateLibraryTab(uploads);
                                });

                                fetchFavoriteFiles().then(favorites => {
                                    populateTabContent('favorites-tab-content-right', favorites);
                                });
                            } else {
                                const errorData = await response.json();
                                showNotificationPopup(`Failed to delete file: ${errorData.message || 'Unknown error'}`, 'Delete Failed', 'error');
                            }
                        } catch (error) {
                            console.error('Error deleting file:', error);
                            showNotificationPopup('Failed to delete file. Please try again.', 'Delete Error', 'error');
                        }
                    });
                });
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
                    <div class="file-item" data-file-id="${file.id}" data-file-name="${file.file_name}" data-file-url="${file.url || ''}">
                        <i class="${getFileIconClass(file.file_type || file.type)}"></i>
                        <span class="file-name">${file.file_name || file.name}</span>
                        <span class="file-date">${new Date(file.created_at).toLocaleDateString()}</span>
                        <i class="favorite-star ${file.is_favorite ? 'fas fa-star' : 'far fa-star'}" data-file-id="${file.id}"></i>
                        <i class="delete-file fas fa-trash-alt" data-file-id="${file.id}" data-file-name="${file.file_name}"></i>
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

                // Add click handlers for favorite stars
                tabContent.querySelectorAll('.favorite-star').forEach(star => {
                    star.addEventListener('click', async function(e) {
                        e.stopPropagation(); // Prevent triggering file item click

                        const fileId = this.dataset.fileId;
                        const isCurrentlyFavorite = this.classList.contains('fas');

                        try {
                            const response = await fetch(`${API_BASE_URL}/upload/notes/${fileId}/favorite`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                }
                            });

                            if (response.ok) {
                                // Toggle the star appearance
                                this.classList.toggle('fas');
                                this.classList.toggle('far');

                                // Refresh all tabs to show updated favorite status
                                fetchUserUploads().then(uploads => {
                                    populateTabContent('recent-tab-content-right', uploads.slice(0, 10));
                                    populateTabContent('library-tab-content-right', uploads);
                                });

                                fetchFavoriteFiles().then(favorites => {
                                    populateTabContent('favorites-tab-content-right', favorites);
                                });
                            } else {
                                console.error('Failed to toggle favorite');
                            }
                        } catch (error) {
                            console.error('Error toggling favorite:', error);
                        }
                    });
                });

                // Add click handlers for delete buttons
                tabContent.querySelectorAll('.delete-file').forEach(deleteBtn => {
                    deleteBtn.addEventListener('click', async function(e) {
                        e.stopPropagation(); // Prevent triggering file item click

                        const fileId = this.dataset.fileId;
                        const fileName = this.dataset.fileName;

                        // Show custom confirmation dialog
                        const confirmed = await showConfirmationPopup(
                            `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
                            'Confirm Delete'
                        );

                        if (!confirmed) {
                            return;
                        }

                        try {
                            const response = await fetch(`${API_BASE_URL}/upload/notes/${fileId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                }
                            });

                            if (response.ok) {
                                // Show success notification
                                showNotificationPopup(`File "${fileName}" has been deleted successfully.`, 'File Deleted', 'success');

                                // Refresh all tabs to remove the deleted file
                                fetchUserUploads().then(uploads => {
                                    populateTabContent('recent-tab-content-right', uploads.slice(0, 10));
                                    populateTabContent('library-tab-content-right', uploads);
                                });

                                fetchFavoriteFiles().then(favorites => {
                                    populateTabContent('favorites-tab-content-right', favorites);
                                });
                            } else {
                                const errorData = await response.json();
                                showNotificationPopup(`Failed to delete file: ${errorData.message || 'Unknown error'}`, 'Delete Failed', 'error');
                            }
                        } catch (error) {
                            console.error('Error deleting file:', error);
                            showNotificationPopup('Failed to delete file. Please try again.', 'Delete Error', 'error');
                        }
                    });
                });
            }

            // Load initial data for tabs
            fetchUserUploads().then(uploads => {
                populateTabContent('recent-tab-content-right', uploads.slice(0, 10)); // Recent 10
                populateLibraryTab(uploads); // Special handling for library with folders
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

            // Function to show custom confirmation popup
            function showConfirmationPopup(message, title = 'Confirm Action') {
                return new Promise((resolve) => {
                    // Create confirmation popup elements
                    const confirmPopup = document.createElement('div');
                    confirmPopup.id = 'confirm-popup';
                    confirmPopup.className = 'custom-popup';
                    confirmPopup.innerHTML = `
                        <div class="popup-content">
                            <span class="close-button" id="confirm-close">&times;</span>
                            <h2 id="confirm-title">${title}</h2>
                            <p id="confirm-description">${message}</p>
                            <div class="confirm-buttons">
                                <button class="confirm-btn confirm-yes">Yes, Delete</button>
                                <button class="confirm-btn confirm-no">Cancel</button>
                            </div>
                        </div>
                    `;

                    document.body.appendChild(confirmPopup);

                    // Handle button clicks
                    const yesBtn = confirmPopup.querySelector('.confirm-yes');
                    const noBtn = confirmPopup.querySelector('.confirm-no');
                    const closeBtn = confirmPopup.querySelector('#confirm-close');

                    const cleanup = () => {
                        document.body.removeChild(confirmPopup);
                    };

                    yesBtn.addEventListener('click', () => {
                        cleanup();
                        resolve(true);
                    });

                    noBtn.addEventListener('click', () => {
                        cleanup();
                        resolve(false);
                    });

                    closeBtn.addEventListener('click', () => {
                        cleanup();
                        resolve(false);
                    });

                    // Show popup
                    confirmPopup.style.display = 'flex';
                });
            }

            // Function to show custom create folder popup
            function showCreateFolderPopup(title = 'Create New Folder') {
                return new Promise((resolve) => {
                    // Create folder creation popup elements
                    const createPopup = document.createElement('div');
                    createPopup.id = 'create-folder-popup';
                    createPopup.className = 'custom-popup';
                    createPopup.innerHTML = `
                        <div class="popup-content">
                            <span class="close-button" id="create-close">&times;</span>
                            <h2>${title}</h2>
                            <div class="input-group">
                                <label for="folder-name-input">Folder Name:</label>
                                <input type="text" id="folder-name-input" placeholder="Enter folder name..." maxlength="50">
                            </div>
                            <div class="create-buttons">
                                <button class="create-btn create-folder-btn">Create Folder</button>
                                <button class="create-btn cancel-btn">Cancel</button>
                            </div>
                        </div>
                    `;

                    document.body.appendChild(createPopup);

                    // Get input element
                    const input = createPopup.querySelector('#folder-name-input');
                    const createBtn = createPopup.querySelector('.create-folder-btn');
                    const cancelBtn = createPopup.querySelector('.cancel-btn');
                    const closeBtn = createPopup.querySelector('#create-close');

                    const cleanup = () => {
                        document.body.removeChild(createPopup);
                    };

                    // Handle input enter key
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            const folderName = input.value.trim();
                            if (folderName) {
                                cleanup();
                                resolve(folderName);
                            }
                        }
                    });

                    // Focus input
                    setTimeout(() => input.focus(), 100);

                    createBtn.addEventListener('click', () => {
                        const folderName = input.value.trim();
                        if (folderName) {
                            cleanup();
                            resolve(folderName);
                        } else {
                            input.focus();
                            input.style.borderColor = '#dc3545';
                            setTimeout(() => input.style.borderColor = '#ddd', 1000);
                        }
                    });

                    cancelBtn.addEventListener('click', () => {
                        cleanup();
                        resolve(null);
                    });

                    closeBtn.addEventListener('click', () => {
                        cleanup();
                        resolve(null);
                    });

                    // Show popup
                    createPopup.style.display = 'flex';
                });
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
