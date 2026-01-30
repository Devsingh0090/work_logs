document.addEventListener('DOMContentLoaded', function () {
  console.log('[REPORTS TEA/COFFEE JS] Init');
  const tbody = document.getElementById('reportsTeaCoffeeBody');
  if (!tbody) { console.error('[REPORTS TEA/COFFEE JS] reportsTeaCoffeeBody not found'); return; }
  let allData = [];

  function render(list) {
    tbody.innerHTML = '';
    if (!list || list.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No records</td></tr>'; return; }
    list.forEach((it, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx + 1}</td><td>${it.date || ''}</td><td>${it.logged_user || ''}</td><td>${it.time_of_day || ''}</td><td>${it.qty || ''}</td><td>${it.price || ''}</td>`;
      tbody.appendChild(tr);
    });
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

  function updateSummary(list) {
    // total days = distinct dates
    const daysSet = new Set();
    let totalQty = 0;
    let totalPrice = 0;
    (list || []).forEach(r => {
      if (r.date) daysSet.add(r.date);
      const q = parseFloat(r.qty) || 0;
      const p = parseFloat(r.price) || 0;
      totalQty += q;
      totalPrice += p;
    });
    const daysEl = document.getElementById('tc_total_days');
    const qtyEl = document.getElementById('tc_total_qty');
    const priceEl = document.getElementById('tc_total_price');
    if (daysEl) daysEl.textContent = daysSet.size;
    if (qtyEl) qtyEl.textContent = totalQty;
    if (priceEl) priceEl.textContent = totalPrice.toFixed(2);
  }

  function load() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'flex';
    fetch('/Work_logs/api/reports/tea_coffee')
      .then(r => r.json())
      .then(list => { allData = list || []; filterData(); })
      .catch(err => { console.error('[REPORTS TEA/COFFEE JS] Error loading', err); tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Error loading</td></tr>'; })
      .finally(() => { if (loader) loader.style.display = 'none'; });
  }

  const applyBtn = document.getElementById('applyFiltersBtn');
  const resetBtn = document.getElementById('resetFiltersBtn');
  if (applyBtn) applyBtn.addEventListener('click', filterData);
  if (resetBtn) resetBtn.addEventListener('click', resetFilters);

  load();
});
