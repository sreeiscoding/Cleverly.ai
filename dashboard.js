// Basic interactivity for dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Add a toggle button for navigation
    const header = document.querySelector('header');
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Toggle Nav';
    toggleBtn.style.marginLeft = 'auto';
    toggleBtn.style.backgroundColor = '#eee';
    toggleBtn.style.color = '#333';
    toggleBtn.style.border = '1px solid #ddd';
    toggleBtn.style.padding = '0.5rem';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.borderRadius = '4px';

    const nav = document.querySelector('nav');
    toggleBtn.addEventListener('click', function() {
        nav.style.display = nav.style.display === 'none' ? 'flex' : 'none';
    });

    header.appendChild(toggleBtn);

    // Add click event to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', function() {
            alert('Card clicked: ' + this.querySelector('h3').textContent);
        });
    });

    // Sidebar button interactivity
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    sidebarBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            sidebarBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Get the feature
            const feature = this.dataset.feature;
            console.log('Selected feature:', feature);
            // Optionally, update main content based on feature
        });
    });
});
