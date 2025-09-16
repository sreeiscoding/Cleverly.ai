const API_BASE_URL = 'http://localhost:4000'; // Ensure this matches your backend URL

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

    // Sidebar button interactivity (existing code)
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    const customPopup = document.getElementById('custom-popup');
    const popupTitle = document.getElementById('popup-title');
    const popupDescription = document.getElementById('popup-description');
    const closeButton = document.querySelector('.close-button');

    sidebarBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            sidebarBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const featureName = this.querySelector('h4').textContent;
            const featureDescription = this.querySelector('p').textContent;
            console.log('Selected feature:', featureName);
            console.log('Feature description:', featureDescription);

            popupTitle.textContent = featureName;
            popupDescription.textContent = featureDescription;
            customPopup.style.display = 'flex';
        });
    });

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
});
