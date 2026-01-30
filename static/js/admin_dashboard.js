// External Chart palette
const CHART_COLORS = [
    '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f43f5e', '#14b8a6', '#f97316', '#3b82f6'
];

async function fetchJson(url) {
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error('API fetch failed');
        return await r.json()
    } catch (e) {
        console.warn(`Fetch error for ${url}:`, e);
        return null
    }
}

async function loadAdminDashboard() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'flex';
    console.log('[ADMIN] Refreshing Dashboard Data...');

    // 1. Fetch data
    const projectsRaw = await fetchJson('/Work_logs/api/projects') || [];
    const workEntriesRaw = await fetchJson('/Work_logs/api/work_entries') || [];
    const teaRaw = await fetchJson('/Work_logs/api/tea_coffee') || [];
    const expensesRaw = await fetchJson('/Work_logs/api/company_expense') || [];
    const operators = await fetchJson('/Work_logs/api/operators') || [];

    // Populate User Dropdown if empty
    const userSelect = document.getElementById('filter_user');
    if (userSelect && userSelect.options.length <= 1) {
        operators.forEach(op => {
            const opt = document.createElement('option');
            opt.value = op.operator_id;
            opt.textContent = `${op.name} (${op.operator_id})`;
            userSelect.appendChild(opt);
        });
    }

    // 2. Apply Filters
    const fromDate = document.getElementById('filter_from_date').value;
    const toDate = document.getElementById('filter_to_date').value;
    const selectedUser = document.getElementById('filter_user').value;

    const filterByDateAndUser = (items, dateField) => {
        return items.filter(item => {
            const itemDate = (item[dateField] || '').split('T')[0];
            const matchesUser = !selectedUser || item.logged_user === selectedUser;
            const matchesFrom = !fromDate || itemDate >= fromDate;
            const matchesTo = !toDate || itemDate <= toDate;
            return matchesUser && matchesFrom && matchesTo;
        });
    };

    const workEntries = filterByDateAndUser(workEntriesRaw, 'date');
    const tea = filterByDateAndUser(teaRaw, 'date');
    const expenses = filterByDateAndUser(expensesRaw, 'date');
    const projects = projectsRaw; // Projects usually global, but could filter by creator if needed

    // 3. Update Stat Cards
    const teaTotal = tea.reduce((s, t) => s + (parseFloat(t.price) || 0), 0);
    const expTotal = expenses.reduce((s, e) => s + (parseFloat(e.price) || 0), 0);

    document.getElementById('card_projects').textContent = projects.length;
    document.getElementById('card_work_entries').textContent = workEntries.length;
    document.getElementById('card_tea_total').textContent = `₹${teaTotal.toLocaleString('en-IN')}`;
    document.getElementById('card_expenses').textContent = `₹${expTotal.toLocaleString('en-IN')}`;

    // 4. Daily Work Performance Chart (Line)
    const dailyCounts = {};
    workEntries.forEach(e => {
        const d = e.date || 'Unknown';
        dailyCounts[d] = (dailyCounts[d] || 0) + 1;
    });

    // Get sorted dates for X-axis
    let dates = Object.keys(dailyCounts).sort();
    if (dates.length > 10) dates = dates.slice(-10); // Show last 10 active days if too many

    const performanceData = dates.map(d => dailyCounts[d]);

    const actCtx = document.getElementById('activityChart').getContext('2d');
    if (window._adminActivityChart) window._adminActivityChart.destroy();
    window._adminActivityChart = new Chart(actCtx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Work Entries',
                data: performanceData,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#4f46e5',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });

    // 5. Work by Project Chart (Doughnut)
    const projectCounts = {};
    workEntries.forEach(e => {
        const pName = e.project_name || 'assigned';
        projectCounts[pName] = (projectCounts[pName] || 0) + 1;
    });

    const projectLabels = Object.keys(projectCounts);
    const projectData = Object.values(projectCounts);

    const statusCtx = document.getElementById('statusChart').getContext('2d');
    if (window._adminStatusChart) window._adminStatusChart.destroy();
    window._adminStatusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: projectLabels.length ? projectLabels : ['No Data'],
            datasets: [{
                data: projectData.length ? projectData : [1],
                backgroundColor: projectData.length ? CHART_COLORS.slice(0, projectLabels.length) : ['#f1f5f9'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 12 } } }
        }
    });

    // 6. Lead Projects List
    const topList = document.getElementById('topProjectsList');
    topList.innerHTML = '';
    projects.slice(0, 5).forEach(p => {
        const div = document.createElement('div');
        div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #f8fafc; font-size: 0.9rem;';
        div.innerHTML = `<span>${p.project_name}</span> <span class="badge" style="background:rgba(16, 185, 129, 0.1); color:#10b981;">Lead</span>`;
        topList.appendChild(div);
    });

    // 7. Recent Transactions Table
    const recentTBody = document.querySelector('#recentActivitiesTable tbody');
    recentTBody.innerHTML = '';
    const recentLogs = workEntries.slice(-8).reverse();
    if (recentLogs.length === 0) {
        recentTBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#94a3b8;">No records match filters</td></tr>';
    } else {
        recentLogs.forEach(r => {
            const tr = document.createElement('tr');
            const time = r.datetime ? new Date(r.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
            tr.innerHTML = `
                <td style="color:#64748b; font-size:0.85rem;">${r.date} ${time}</td>
                <td style="font-weight:600; color:#334155;">${r.work_type}</td>
                <td style="color:#64748b;">${r.project_name || r.logged_user}</td>
            `;
            recentTBody.appendChild(tr);
        });
    }
    if (loader) loader.style.display = 'none';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function () {
    loadAdminDashboard();

    const applyBtn = document.getElementById('applyFilters');
    if (applyBtn) applyBtn.addEventListener('click', loadAdminDashboard);

    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) resetBtn.addEventListener('click', () => {
        document.getElementById('filter_from_date').value = '';
        document.getElementById('filter_to_date').value = '';
        document.getElementById('filter_user').value = '';
        loadAdminDashboard();
    });

    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) refreshBtn.addEventListener('click', loadAdminDashboard);
});
