document.addEventListener('DOMContentLoaded', function () {
  console.log('[REPORTS ISSUES JS] Init');
  const tbody = document.getElementById('reportsIssuesBody');
  if (!tbody) {
    console.error('[REPORTS ISSUES JS] reportsIssuesBody not found');
    return;
  }
  let allIssuesData = [];

  function render(list) {
    tbody.innerHTML = '';
    if (!list || list.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No records</td></tr>'; return; }
    list.forEach((it, idx) => {
      const tr = document.createElement('tr');
      const responsible = (it.responsible_persons && Array.isArray(it.responsible_persons)) ? it.responsible_persons.join(', ') : (it.responsible_persons || '');
      tr.innerHTML = `<td>${idx + 1}</td><td>${it.date || ''}</td><td>${it.logged_user || ''}</td><td>${it.problem_description || ''}</td><td>${responsible}</td><td>${it.status || ''}</td><td>${it.problem_description || ''}</td>`;
      tbody.appendChild(tr);
    });
  }

  function populateFilterOptions() {
    const userSet = new Set();
    allIssuesData.forEach(row => { if (row.logged_user) userSet.add(row.logged_user); });
    const userSel = document.getElementById('filterUser');
    if (userSel) {
      userSel.innerHTML = '<option value="">All</option>' + Array.from(userSet).map(u => `<option value="${u}">${u}</option>`).join('');
    }
  }

  function filterIssuesData() {
    const start = document.getElementById('filterStartDate').value;
    const end = document.getElementById('filterEndDate').value;
    const user = document.getElementById('filterUser').value;
    let filtered = allIssuesData;
    if (start) filtered = filtered.filter(r => r.date && r.date >= start);
    if (end) filtered = filtered.filter(r => r.date && r.date <= end);
    if (user) filtered = filtered.filter(r => r.logged_user === user);
    render(filtered);
  }

  function resetFilters() {
    const s = document.getElementById('filterStartDate'); if (s) s.value = '';
    const e = document.getElementById('filterEndDate'); if (e) e.value = '';
    const u = document.getElementById('filterUser'); if (u) u.value = '';
    filterIssuesData();
  }

  function load() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'flex';
    fetch('/Work_logs/api/reports/issues')
      .then(r => r.json())
      .then(list => { allIssuesData = list || []; populateFilterOptions(); filterIssuesData(); })
      .catch(err => { console.error('[REPORTS ISSUES JS] Error loading', err); tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Error loading</td></tr>'; })
      .finally(() => { if (loader) loader.style.display = 'none'; });
  }

  // wire buttons
  const applyBtn = document.getElementById('applyFiltersBtn');
  const resetBtn = document.getElementById('resetFiltersBtn');
  if (applyBtn) applyBtn.addEventListener('click', filterIssuesData);
  if (resetBtn) resetBtn.addEventListener('click', resetFilters);

  load();
});
