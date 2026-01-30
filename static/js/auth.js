// Authentication related functions

// Logout function
function logout() {
    console.log("[DEBUG] Logout function called");
    fetch('/Work_logs/api/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'  // Include cookies in the request
    })
        .then(response => {
            console.log("[DEBUG] Logout response received:", response);
            return response.json();
        })
        .then(data => {
            console.log("[DEBUG] Logout data:", data);
            if (data.success) {
                console.log("[DEBUG] Logout successful, redirecting to:", data.redirect_url);
                // Force a complete page reload and redirect
                window.location.replace(data.redirect_url);
                // If the above doesn't work, try forcing a reload
                setTimeout(() => {
                    window.location.href = data.redirect_url;
                    window.location.reload(true);
                }, 100);
            }
        })
        .catch(error => {
            console.error('[DEBUG] Logout failed:', error);
            // Even if there's an error, check for equipment_booking_only in session first
            fetch('/Work_logs/api/check_equipment_booking_only')
                .then(response => response.json())
                .then(data => {
                    if (data.equipment_booking_only) {
                        window.location.replace('/Work_logs/equipment_booking_login');
                    } else {
                        window.location.replace('/Work_logs/login');
                    }
                })
                .catch(err => {
                    // If that fails too, default to main login
                    window.location.replace('/Work_logs/login');
                });
        });
}



// Password visibility toggle function
function togglePasswordVisibility(passwordFieldId, toggleElementId) {
    const passwordField = document.getElementById(passwordFieldId);
    const toggleElement = document.getElementById(toggleElementId);
    const eyeIcon = toggleElement.querySelector('svg');

    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        // Change to eye-off icon
        eyeIcon.innerHTML = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><path d="M2.85 2.85l18.3 18.3"/>';
    } else {
        passwordField.type = 'password';
        // Change back to eye icon
        eyeIcon.innerHTML = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>';
    }
}




document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, setting up login handlers'); // Debug log

    // Forgot password modal logic
    var forgotLink = document.getElementById('forgot-password-link');
    if (forgotLink) {
        forgotLink.onclick = function (e) {
            e.preventDefault();
            // Clear login form fields when navigating to forgot password
            var loginUser = document.getElementById('login-username');
            var loginPass = document.getElementById('login-password');
            if (loginUser) loginUser.value = '';
            if (loginPass) loginPass.value = '';
            var modal = document.getElementById('forgot-password-modal');
            if (modal) modal.style.display = 'flex';
            var fpUser = document.getElementById('fp-userid');
            if (fpUser) fpUser.focus();
        };
    }
    var closeForgotModal = document.getElementById('close-forgot-modal');
    if (closeForgotModal) {
        closeForgotModal.onclick = function () {
            var modal = document.getElementById('forgot-password-modal');
            if (modal) modal.style.display = 'none';
            var loginUser = document.getElementById('login-username');
            var loginPass = document.getElementById('login-password');
            if (loginUser) loginUser.value = '';
            if (loginPass) loginPass.value = '';
            // Clear forgot password modal fields
            var fpUser = document.getElementById('fp-userid');
            var fpEmail = document.getElementById('fp-email');
            var fpName = document.getElementById('fp-name');
            var fpRole = document.getElementById('fp-role');
            var fpPass = document.getElementById('fp-password');
            var fpPass2 = document.getElementById('fp-password2');
            if (fpUser) fpUser.value = '';
            if (fpEmail) fpEmail.value = '';
            if (fpName) fpName.value = '';
            if (fpRole) fpRole.value = '';
            if (fpPass) fpPass.value = '';
            if (fpPass2) fpPass2.value = '';
        };
    }
    // The forgot password logic is now handled in main.js. Do not override it here.
    // Redirect to login if path is /Work_logs/ or /Work_logs
    (function () {
        const path = window.location.pathname.replace(/\/$/, '');
        if (path === '/Work_logs' || path === '/Work_logs/') {
            // Use history.replaceState to hide .html extension
            window.location.replace('/Work_logs/login');
        }
        // If user lands on /Work_logs/static/login.html, remove .html from URL
        if (window.location.pathname.endsWith('/static/login.html')) {
            const newUrl = window.location.pathname.replace(/\.html$/, '') + window.location.search + window.location.hash;
            window.history.replaceState({}, '', newUrl);
        }
    })();


    // Real login logic
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Found login form, attaching handler'); // Debug log
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Login form submitted via JavaScript (event listener)'); // Debug log
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            console.log('Login attempt for:', username); // Debug log
            const container = document.getElementById('login-container');
            let msg = document.querySelector('.auth-error, .auth-success');
            if (msg && msg.parentNode) msg.parentNode.removeChild(msg);
            try {
                console.log('Sending fetch request to /Work_logs/api/login'); // Debug log
                const res = await fetch('/Work_logs/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                console.log('Login response received:', data); // Debug log
                if (res.ok && data.success) {
                    // console.log('Login successful, showing success message'); // Debug log
                    // const div = document.createElement('div');
                    // div.className = 'auth-success';
                    // div.innerHTML = '<b>Successful! Redirecting...</b>';
                    // container.insertBefore(div, container.children[2]);
                    // User info persistence removed to comply with "no local storage" requirement
                    // The /api/me and /api/dashboard_summary endpoints now handle this server-side


                    setTimeout(() => {
                        // Clear login form fields before redirecting
                        document.getElementById('login-username').value = '';
                        document.getElementById('login-password').value = '';
                        console.log('Redirecting to /Work_logs/index'); // Debug log
                        window.location.href = '/Work_logs/index';
                    }, 1200);
                } else {
                    console.log('Login failed:', data.message); // Debug log
                    const div = document.createElement('div');
                    div.className = 'auth-error';
                    div.innerHTML = `<b>${data.message || 'Invalid username or password.'}</b>`;
                    container.insertBefore(div, container.children[2]);
                    // Automatically remove error after 3 seconds
                    setTimeout(() => {
                        if (div && div.parentNode) {
                            div.parentNode.removeChild(div);
                        }
                    }, 3000);
                }
            } catch (err) {
                console.error('Login network error:', err); // Debug log
                const div = document.createElement('div');
                div.className = 'auth-error';
                div.innerHTML = '<b>Network error. Please try again.</b>';
                container.insertBefore(div, container.children[2]);
            }
        });
    } else {
        console.error('Login form not found!'); // Debug log
    }
    console.log('Login handler attached to form'); // Debug log
});

// Forgot password form submission handler
document.addEventListener('DOMContentLoaded', function () {
    // Add forgot password form handler
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            e.stopPropagation();
            // Remove previous messages
            let msg = document.querySelector('#forgot-password-modal .auth-error, #forgot-password-modal .auth-success');
            if (msg && msg.parentNode) msg.parentNode.removeChild(msg);

            const userid = document.getElementById('fp-userid').value.trim();
            const email = document.getElementById('fp-email').value.trim();
            const name = document.getElementById('fp-name').value.trim();
            const role = document.getElementById('fp-role').value.trim();
            const password = document.getElementById('fp-password').value;
            const password2 = document.getElementById('fp-password2').value;

            if (password !== password2) {
                const div = document.createElement('div');
                div.className = 'auth-error';
                div.innerHTML = '<b>Passwords do not match.</b>';
                forgotPasswordForm.parentNode.insertBefore(div, forgotPasswordForm);
                setTimeout(() => { if (div && div.parentNode) div.parentNode.removeChild(div); }, 3000);
                return;
            }

            try {
                const res = await fetch('/Work_logs/api/forgot_password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userid, email, name, role, password })
                });
                const data = await res.json();
                const div = document.createElement('div');
                div.className = data.success ? 'auth-success' : 'auth-error';
                div.innerHTML = `<b>${data.message || (data.success ? 'Password updated.' : 'Error updating password.')}</b>`;
                forgotPasswordForm.parentNode.insertBefore(div, forgotPasswordForm);
                if (data.success) {
                    setTimeout(() => {
                        document.getElementById('forgot-password-modal').style.display = 'none';
                        // Optionally clear fields
                        document.getElementById('fp-userid').value = '';
                        document.getElementById('fp-email').value = '';
                        document.getElementById('fp-name').value = '';
                        document.getElementById('fp-role').value = '';
                        document.getElementById('fp-password').value = '';
                        document.getElementById('fp-password2').value = '';
                        if (div && div.parentNode) div.parentNode.removeChild(div);
                    }, 1500);
                } else {
                    setTimeout(() => { if (div && div.parentNode) div.parentNode.removeChild(div); }, 3000);
                }
            } catch (err) {
                const div = document.createElement('div');
                div.className = 'auth-error';
                div.innerHTML = '<b>Network error. Please try again.</b>';
                forgotPasswordForm.parentNode.insertBefore(div, forgotPasswordForm);
                setTimeout(() => { if (div && div.parentNode) div.parentNode.removeChild(div); }, 3000);
            }
        });
    }

});


