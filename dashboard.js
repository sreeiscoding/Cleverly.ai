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

    sidebarBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            sidebarBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            // Remove active class from start button if it has it
            if (startButton) {
                startButton.classList.remove('active');
            }

            // When any sidebar button is clicked, disable the 8 links again
            document.querySelectorAll('.sidebar-btn[data-initial-disabled]').forEach(btnToDisable => {
                btnToDisable.setAttribute('data-initial-disabled', 'true');
            });

            const feature = this.dataset.feature;
            console.log('Selected feature:', feature);

            if (feature === 'main') {
                showContentArea('main');
            } else {
                // For other 8 links, show popup
                const customPopup = document.getElementById('custom-popup');
                const popupTitle = document.getElementById('popup-title');
                const popupDescription = document.getElementById('popup-description');
                
                popupTitle.textContent = this.querySelector('h4').textContent;
                popupDescription.textContent = this.querySelector('p').textContent;
                customPopup.style.display = 'flex';
                
                // Ensure upload tab is hidden when a sidebar button is clicked
                const uploadTabContent = document.getElementById('upload-tab-content');
                if (uploadTabContent) {
                    uploadTabContent.style.display = 'none';
                }
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

            processNotesBtn.addEventListener('click', async function() {
                if (notesFileInput.files && notesFileInput.files.length > 0) {
                    const file = notesFileInput.files[0];
                    console.log('Processing file:', file.name);
                    // Here you would typically send the file to the backend
                    // For now, we'll just show an alert
                    alert(`File "${file.name}" is being processed!`);
                    // You might want to add a loading state here
                } else {
                    alert('Please select a file first.');
                }
            });
        });
    }
});
