document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('meetingForm');
  const meetingsTableBody = document.querySelector('#meetingsTable tbody');
  const projectSelect = document.getElementById('meetingProject');
  const projectsMap = {};
  let _cachedOperator = null;
  async function getCurrentOperator() {
    if (_cachedOperator !== null) return _cachedOperator;
    try {
      const res = await fetch('/Work_logs/api/me', { credentials: 'same-origin' });
      if (!res.ok) return null;
      const j = await res.json();
      const user = j && j.user ? j.user : null;
      const out = user ? { id: user.id || null, operator_id: user.operator_id || null } : null;
      _cachedOperator = out;
      return out;
    } catch (e) { return null; }
  }

  async function fetchProjects() {
    try {
      const res = await fetch('/Work_logs/api/projects');
      if (!res.ok) return;
      const data = await res.json();
      const op = await getCurrentOperator();
      const opDbId = op ? op.id : null;
      const opCode = op ? op.operator_id : null;
      function isAssigned(p){
        const ae = p.assigned_employees || [];
        if (Array.isArray(ae)) {
          if (opDbId != null && (ae.includes(opDbId) || ae.includes(String(opDbId)) || ae.includes(Number(opDbId)))) return true;
          if (opCode != null && (ae.includes(opCode) || ae.includes(String(opCode)))) return true;
          return false;
        }
        if (typeof ae === 'string') {
          const arr = ae.split(',').map(s=>s.trim()).filter(Boolean);
          if (opDbId != null && arr.includes(String(opDbId))) return true;
          if (opCode != null && arr.includes(String(opCode))) return true;
        }
        return false;
      }
      const finalList = (op ? (data.filter(p => isAssigned(p))) : []);
      projectSelect.innerHTML = '<option value="">None</option>' + (finalList || data).map(p => `<option value="${p.id}">${p.project_name || p.company_name || p.name || p.id}</option>`).join('');
      (finalList || data).forEach(p => { projectsMap[p.id] = p.project_name || p.company_name || p.name || (p.id+''); });
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchMeetings() {
    try {
      const params = new URLSearchParams();
      const start = document.getElementById('filter_start')?.value;
      const end = document.getElementById('filter_end')?.value;
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      const url = '/Work_logs/api/meetings' + (params.toString() ? ('?' + params.toString()) : '');
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      renderMeetings(data);
    } catch (e) {
      console.error(e);
    }
  }

  // date helpers
  function formatDateYYYYMMDD(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function setMeetingDateDefaults() {
    const meetingDate = document.getElementById('meetingDate');
    if (!meetingDate) return;
    const today = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);
    meetingDate.value = formatDateYYYYMMDD(today);
    meetingDate.max = formatDateYYYYMMDD(today);
    meetingDate.min = formatDateYYYYMMDD(threeDaysAgo);
  }

  function renderMeetings(list) {
    meetingsTableBody.innerHTML = '';
    list.forEach((m, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx+1}</td>
        <td>${m.meeting_type}</td>
        <td>${m.meeting_date}</td>
        <td>${m.project_id ? (projectsMap[m.project_id] || m.project_id) : '-'}</td>
        <td>${escapeHtml(m.discussion_summary)}</td>
        <td>${escapeHtml(m.action_points || '-')}</td>
        <td>${m.duration || (m.duration_minutes!=null ? m.duration_minutes + ' mins' : '-')}</td>
        <td><button class="btn btn-sm btn-danger btn-delete" data-id="${m.id}">Delete</button></td>
      `;
      meetingsTableBody.appendChild(tr);
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!confirm('Delete this meeting?')) return;
        const id = e.target.dataset.id;
        await fetch(`/Work_logs/api/meetings/${id}`, { method: 'DELETE' });
        fetchMeetings();
      });
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    // validate meeting date within allowed range
    const meetingDateEl = document.getElementById('meetingDate');
    if (meetingDateEl && meetingDateEl.value) {
      const val = meetingDateEl.value;
      if (meetingDateEl.min && val < meetingDateEl.min) return alert('Meeting date cannot be older than 3 days');
      if (meetingDateEl.max && val > meetingDateEl.max) return alert('Meeting date cannot be in the future');
    }
    const hoursVal = document.getElementById('meetingDurationHours').value;
    const minsVal = document.getElementById('meetingDurationMinutes').value;
    const hours = hoursVal ? parseInt(hoursVal, 10) : 0;
    const mins = minsVal ? parseInt(minsVal, 10) : 0;
    const duration_minutes = (hours || mins) ? (hours * 60 + mins) : null;
    // require duration
    if (duration_minutes === null) return alert('Meeting duration is required');

    const payload = {
      meeting_type: document.getElementById('meetingType').value,
      meeting_date: document.getElementById('meetingDate').value,
      project_id: document.getElementById('meetingProject').value || null,
      discussion_summary: document.getElementById('discussionSummary').value,
      action_points: document.getElementById('actionPoints').value,
      duration_minutes: duration_minutes
    };
    try {
      const res = await fetch('/Work_logs/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        form.reset();
        // ensure hours/mins cleared as well
        document.getElementById('meetingDurationHours').value = '';
        document.getElementById('meetingDurationMinutes').value = '';
        fetchMeetings();
      } else {
        const txt = await res.text();
        alert('Error: ' + txt);
      }
    } catch (e) {
      console.error(e);
    }
  });

  // Filter buttons
  document.getElementById('filterApply')?.addEventListener('click', function() {
    fetchMeetings();
  });
  document.getElementById('filterClear')?.addEventListener('click', function() {
    if (document.getElementById('filter_start')) document.getElementById('filter_start').value = '';
    if (document.getElementById('filter_end')) document.getElementById('filter_end').value = '';
    fetchMeetings();
  });

  // init
  fetchProjects();
  setMeetingDateDefaults();
  fetchMeetings();
});
