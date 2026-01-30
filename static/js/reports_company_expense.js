document.addEventListener('DOMContentLoaded', function () {
  const tbody = document.getElementById('reportsExpensesBody');
  if (!tbody) return;
  let allData = [];

  function render(list) {
    tbody.innerHTML = '';
    if (!list || list.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No records</td></tr>'; return; }
    list.forEach((it, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx + 1}</td><td>${it.date || ''}</td><td>${it.description || ''}</td><td>${(it.price != null ? parseFloat(it.price).toFixed(2) : '')}</td>`;
      tbody.appendChild(tr);
    });
  }

  function updateSummary(list) {
    const days = new Set();
    let entries = 0;
    let amount = 0;
    (list || []).forEach(r => {
      if (r.date) days.add(r.date);
      entries += 1;
      amount += parseFloat(r.price) || 0;
    });
    const daysEl = document.getElementById('exp_total_days');
    const entriesEl = document.getElementById('exp_total_entries');
    const amountEl = document.getElementById('exp_total_amount');
    if (daysEl) daysEl.textContent = days.size;
    if (entriesEl) entriesEl.textContent = entries;
    if (amountEl) amountEl.textContent = amount.toFixed(2);
  }

  function filterData() {
    const start = document.getElementById('filterStartDate').value;
    const end = document.getElementById('filterEndDate').value;
    let filtered = allData;
    if (start) filtered = filtered.filter(r => r.date && r.date >= start);
    if (end) filtered = filtered.filter(r => r.date && r.date <= end);
    render(filtered);
    updateSummary(filtered);
  }

  function resetFilters() {
    const s = document.getElementById('filterStartDate'); if (s) s.value = '';
    const e = document.getElementById('filterEndDate'); if (e) e.value = '';
    filterData();
  }

  function load() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'flex';
    fetch('/Work_logs/api/company_expense')
      .then(r => r.json())
      .then(list => { allData = list || []; filterData(); })
      .catch(err => { console.error('Error loading expenses', err); tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Error loading</td></tr>'; })
      .finally(() => { if (loader) loader.style.display = 'none'; });
  }

  const applyBtn = document.getElementById('applyFiltersBtn');
  const resetBtn = document.getElementById('resetFiltersBtn');
  if (applyBtn) applyBtn.addEventListener('click', filterData);
  if (resetBtn) resetBtn.addEventListener('click', resetFilters);

  load();
});
