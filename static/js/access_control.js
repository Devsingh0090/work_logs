document.addEventListener('DOMContentLoaded', async () => {
    // Mapping from permission id to path fragment(s)
    const mapping = {
        dashboard: ['/Work_logs/index', '/Work_logs/index.html'],
        admin_dashboard: ['/Work_logs/admin_dashboard', '/Work_logs/admin_dashboard.html'],
        users: ['/Work_logs/operator_details', '/Work_logs/operator_details.html'],
        company_details: ['/Work_logs/company_details', '/Work_logs/company_details.html'],
        projects: ['/Work_logs/projects', '/Work_logs/projects.html'],
        work_entries: ['/Work_logs/work_entries', '/Work_logs/work_entries.html'],
        reports: ['/Work_logs/reports/work_entries', '/Work_logs/reports/issues', '/Work_logs/reports/work_entries.html', '/Work_logs/reports/issues.html', '/Work_logs/reports/tea_coffee', '/Work_logs/reports/company_expense', '/Work_logs/reports/tea_coffee.html', '/Work_logs/reports/company_expense.html'],
        issues: ['/Work_logs/issues', '/Work_logs/issues.html'],
        meetings: ['/Work_logs/meetings', '/Work_logs/meetings.html'],
        holidays: ['/Work_logs/holidays', '/Work_logs/holidays.html'],
        tea_coffee: ['/Work_logs/tea_coffee', '/Work_logs/tea_coffee.html'],
        company_expense: ['/Work_logs/company_expense', '/Work_logs/company_expense.html']
    };

    function applyPermissions(perms) {
        if (!perms) return;
        const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
        sidebarLinks.forEach(a => {
            const onclickAttr = (a.getAttribute('onclick') || '').toString().toLowerCase();
            const text = (a.textContent || '').toString().toLowerCase();
            const href = a.getAttribute('href') || '';

            if (onclickAttr.includes('logout') || text.includes('logout')) {
                a.style.display = '';
                return;
            }

            let allowed = false;
            // logic for reports
            if (href.indexOf('/Work_logs/reports/') !== -1 && perms.indexOf('reports') !== -1) {
                allowed = true;
            }
            if (!allowed) {
                for (const p of perms) {
                    const paths = mapping[p];
                    if (!paths) continue;
                    for (const path of paths) {
                        if (href.indexOf(path) !== -1) {
                            allowed = true;
                            break;
                        }
                    }
                    if (allowed) break;
                }
            }
            a.style.display = allowed ? '' : 'none';
        });

        // Hide in-page tabs
        const tabMap = { 'tabRoleAccess': 'users' };
        Object.keys(tabMap).forEach(tabId => {
            const el = document.getElementById(tabId);
            if (el && perms.indexOf(tabMap[tabId]) === -1) el.style.display = 'none';
        });

        // Hide parent menus
        const submenuUls = document.querySelectorAll('.sub-master-data-menu');
        submenuUls.forEach(ul => {
            const parentLi = ul.closest('li');
            const parentAnchor = parentLi ? parentLi.querySelector('a.has-submenu') : null;
            if (parentAnchor) {
                const anyVisible = Array.from(ul.querySelectorAll('a')).some(a => a.style.display !== 'none');
                parentAnchor.style.display = anyVisible ? '' : 'none';
                if (parentLi) parentLi.style.display = anyVisible ? '' : 'none';
            }
        });

        // Show the sidebar menu now that permissions are applied
        const sidebarMenus = document.querySelectorAll('.sidebar-menu');
        sidebarMenus.forEach(menu => menu.style.display = 'block');
        document.documentElement.classList.add('acl-ready');
    }

    // 1. Optimistic UI: Check cache immediately
    try {
        const cached = localStorage.getItem('swl_user_perms');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && Array.isArray(parsed)) {
                applyPermissions(parsed);
            }
        }
    } catch (e) {
        console.warn('Error reading permission cache', e);
    }

    // 2. Network Fetch (revalidate)
    try {
        const res = await fetch('/Work_logs/api/me');
        const data = await res.json();

        if (!data || data.success === false) {
            // Only redirect if we have no cache or if api explicitly fails? 
            // Better to be safe: valid session check. 
            // If API says not logged in, we must redirect even if we have cache.
            window.location.href = '/Work_logs/login';
            return;
        }

        const perms = data.permissions || [];

        // Update cache
        localStorage.setItem('swl_user_perms', JSON.stringify(perms));

        // Re-apply to ensure sync
        applyPermissions(perms);

    } catch (err) {
        console.error('access_control error', err);
        // If network fails but we had cache, we might let them stay on page?
        // Default behavior: redirect to login if we can't verify identity
        // But for "time to interactivity", we might have already shown the UI.
        // If this is a network error (offline), maybe don't redirect?
        // For now, keep original behavior safe: if fetch fails catastrophe, login.
        // CHECK: If we already rendered from cache, we might just show a toast?
        // Stick to safe default: if we can't verify session, go to login.
        // However, if it's just a network glitch, flushing them is annoying.
        // Let's rely on the fact that if data.success is false (session invalid), we redirect.
        // If fetch throws (network error), we might barely survive on cache strictly for display, 
        // but app won't work. Redirecting is safer for security.
        window.location.href = '/Work_logs/login';
    }
});

// Safety: if JS fails early, reveal logout so user can still sign out
try {
    // quick immediate attempt to show logout anchors (best-effort)
    var links = document.querySelectorAll && document.querySelectorAll('.sidebar-menu a');
    if (links && links.length) {
        links.forEach(function (a) {
            try {
                var onclickAttr = (a.getAttribute('onclick') || '').toString().toLowerCase();
                var text = (a.textContent || '').toString().toLowerCase();
                if (onclickAttr.includes('logout') || text.includes('logout')) {
                    a.style.display = '';
                }
            } catch (e) { }
        });
    }
} catch (e) { }
