document.addEventListener('DOMContentLoaded', function () {
  console.log('[REPORTS JS] Page loaded, initializing...');
  const tbody = document.getElementById('reportsAllBody');
  const meetingsTbody = document.getElementById('reportsMeetingsBody');
  if (!tbody) {
    console.error('[REPORTS JS] Error: reportsAllBody element not found!');
    return;
  }
  function render(list) {
    console.log('[REPORTS JS] Rendering', list.length, 'entries');
    tbody.innerHTML = '';
    if (!list || list.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No records</td></tr>'; return; }
    list.forEach((it, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx + 1}</td><td>${it.date || ''}</td><td>${it.logged_user || ''}</td><td>${it.work_type || ''}</td><td>${it.module || ''}</td><td>${it.duration_minutes || ''}</td><td class="truncate-cell" title="${(it.description || '').replace(/"/g, '&quot;')}">${(it.description || '')}</td>`;
      tbody.appendChild(tr);
    });
    console.log('[REPORTS JS] Render complete');
  }

  function renderMeetings(list) {
    if (!meetingsTbody) return;
    console.log('[REPORTS JS] Rendering meetings', list.length);
    meetingsTbody.innerHTML = '';
    if (!list || list.length === 0) { meetingsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No records</td></tr>'; return; }
    list.forEach((it, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx + 1}</td><td>${it.meeting_date || it.date || ''}</td><td>${it.logged_user || ''}</td><td>${it.meeting_type || ''}</td><td>${it.project_name || it.project_id || ''}</td><td>${it.duration_minutes || ''}</td><td class="truncate-cell" title="${(it.discussion_summary || '').replace(/"/g, '&quot;')}">${(it.discussion_summary || '')}</td>`;
      meetingsTbody.appendChild(tr);
    });
    console.log('[REPORTS JS] Meetings render complete');
  }

  window.loadReportsAll = function () {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'flex';

    console.log('[REPORTS JS] Fetching data from /Work_logs/api/reports/work_entries and /Work_logs/api/reports/meetings');
    fetch('/Work_logs/api/reports/work_entries')
      .then(r => { console.log('[REPORTS JS] Work entries response status:', r.status); return r.json(); })
      .then(list => { console.log('[REPORTS JS] Work entries received:', list); render(list); })
      .catch(err => { console.error('[REPORTS JS] Error fetching work entries:', err); tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Error loading</td></tr>'; })
      .finally(() => {
        // fetch meetings regardless of work entries result
        fetch('/Work_logs/api/reports/meetings')
          .then(r => { console.log('[REPORTS JS] Meetings response status:', r.status); return r.json(); })
          .then(list => { console.log('[REPORTS JS] Meetings received:', list); renderMeetings(list); })
          .catch(err => { console.error('[REPORTS JS] Error fetching meetings:', err); if (meetingsTbody) meetingsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Error loading</td></tr>'; })
          .finally(() => {
            if (loader) loader.style.display = 'none';
          });
      });
  };

  if (typeof loadReportsAll === 'function') {
    console.log('[REPORTS JS] Calling loadReportsAll...');
    loadReportsAll();
  }
});
