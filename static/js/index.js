// Logout function for all pages
function logout() {
    // Option 1: Remove session and redirect (adjust URL as needed)
    fetch('/Work_logs/logout', { method: 'POST', credentials: 'include' })
        .then(() => {
            window.location.href = '/Work_logs/login';
        })
        .catch(() => {
            window.location.href = '/Work_logs/login';
        });
}
// Toggle sidebar functionality
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const sidebarToggle = document.getElementById('sidebarToggle');

if (sidebarToggle && sidebar && mainContent) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');

        // Sync button class
        if (sidebar.classList.contains('collapsed')) {
            sidebarToggle.classList.add('btn-collapsed');
            sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
        } else {
            sidebarToggle.classList.remove('btn-collapsed');
            sidebarToggle.innerHTML = '<i class="fas fa-times"></i>';
        }
    });

    // Simulate responsive behavior
    function checkWidth() {
        if (window.innerWidth <= 992) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
            sidebarToggle.classList.add('btn-collapsed');
            sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
        } else {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
            sidebarToggle.classList.remove('btn-collapsed');
            sidebarToggle.innerHTML = '<i class="fas fa-times"></i>';
        }
    }

    // Initial check
    checkWidth();

    // Add resize listener
    window.addEventListener('resize', checkWidth);
}

