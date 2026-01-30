// Dashboard JS: Optimized for maximum speed
// Uses consolidated /api/dashboard_summary to eliminate multiple round-trips

async function fetchJson(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('bad');
    return await r.json();
  } catch (e) {
    return null;
  }
}

async function loadDashboard() {
  const loader = document.getElementById('loadingOverlay');
  if (loader) loader.style.display = 'flex';

  // Use the high-performance consolidated endpoint
  const data = await fetchJson('/Work_logs/api/dashboard_summary');
  if (!data || !data.success) {
    console.error('[DASHBOARD] Failed to load summary data');
    if (loader) loader.style.display = 'none';
    return;
  }

  const { stats, recent_work, holidays, is_super } = data;

  // Helper to format minutes to "Xh Ym"
  const formatDuration = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Update Stat Cards
  document.getElementById('card_projects').textContent = stats.projects;
  document.getElementById('card_total_days').textContent = stats.total_days;
  document.getElementById('card_total_hours').textContent = formatDuration(stats.total_minutes);
  document.getElementById('card_today_hours').textContent = formatDuration(stats.today_minutes);

  // --- Activity Overview Chart ---
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString());
  }

  // Activity counts per day
  const activityData = labels.map(l => {
    return recent_work.filter(e => new Date(e.date).toLocaleDateString() === l).length;
  });

  const actCtx = document.getElementById('activityChart').getContext('2d');
  if (window._activityChart) window._activityChart.destroy();
  window._activityChart = new Chart(actCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Work Logs',
        data: activityData,
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1 } },
        x: { grid: { display: false } }
      }
    }
  });

  // --- Project Distribution Chart ---
  const projectDistribution = data.project_distribution || {};
  const projectLabels = Object.keys(projectDistribution);
  const projectPoints = Object.values(projectDistribution).map(min => (min / 60).toFixed(1)); // Display in hours

  const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#0ea5e9'];
  const statusCtx = document.getElementById('statusChart').getContext('2d');
  if (window._statusChart) window._statusChart.destroy();
  window._statusChart = new Chart(statusCtx, {
    type: 'doughnut',
    data: {
      labels: projectLabels.length ? projectLabels : ['No assigned projects'],
      datasets: [{
        data: projectPoints.length && projectPoints.some(v => v > 0) ? projectPoints : [1],
        backgroundColor: projectPoints.length ? colors.slice(0, projectLabels.length) : ['#e2e8f0'],
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, boxWidth: 8, padding: 15, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: function (item) {
              return `${item.label}: ${item.raw} hrs`;
            }
          }
        }
      }
    }
  });

  // --- Recent Activities Table ---
  const recentTBody = document.querySelector('#recentActivitiesTable tbody');
  recentTBody.innerHTML = '';
  if (recent_work.length === 0) {
    recentTBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:12px; color:#94a3b8;">No recent activity</td></tr>';
  } else {
    recent_work.forEach(r => {
      const tr = document.createElement('tr');
      const timeStr = new Date(r.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      tr.innerHTML = `<td>${timeStr}</td><td style="font-weight:600;">${r.work_type}</td><td>${r.project_name || ''}</td>`;
      recentTBody.appendChild(tr);
    });
  }

  // --- Upcoming Holidays ---
  const holidayList = document.getElementById('upcomingHolidaysList');
  holidayList.innerHTML = '';
  if (holidays.length === 0) {
    holidayList.innerHTML = '<div style="color:#94a3b8; font-style:italic;">No upcoming holidays</div>';
  } else {
    holidays.forEach(h => {
      const item = document.createElement('div');
      item.className = 'holiday-item';
      const d = new Date(h.date);
      item.innerHTML = `
        <div class="holiday-date">
          <div class="holiday-month">${d.toLocaleString('default', { month: 'short' })}</div>
          <div class="holiday-day-num">${d.getDate()}</div>
        </div>
        <div>
          <div class="holiday-info-title">${h.description}</div>
          <div class="holiday-info-desc">${d.toLocaleDateString(undefined, { weekday: 'long' })}</div>
        </div>`;
      holidayList.appendChild(item);
    });
  }
  if (loader) loader.style.display = 'none';
}

// --- Profile Management Logic ---
function initProfileManagement() {
  const profileDropdown = document.getElementById('profileDropdown');
  const profileMenu = document.getElementById('profileMenu');
  const btnOpenEditProfile = document.getElementById('btnOpenEditProfile');
  const btnOpenUpdatePassword = document.getElementById('btnOpenUpdatePassword');

  const editProfileModal = document.getElementById('editProfileModal');
  const updatePasswordModal = document.getElementById('updatePasswordModal');

  const btnCloseEditProfile = document.getElementById('btnCloseEditProfile');
  const btnCloseUpdatePassword = document.getElementById('btnCloseUpdatePassword');

  const editProfileForm = document.getElementById('editProfileForm');
  const updatePasswordForm = document.getElementById('updatePasswordForm');

  // Toggle Dropdown
  profileDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle('show');
  });

  // Close dropdown on outside click
  window.addEventListener('click', () => {
    profileMenu.classList.remove('show');
  });

  // Open Edit Profile
  btnOpenEditProfile.addEventListener('click', async (e) => {
    e.preventDefault();
    const resp = await fetch('/Work_logs/api/operator_details/current');
    const data = await resp.json();
    if (data.success) {
      document.getElementById('profile_name').value = data.name || '';
      document.getElementById('profile_email').value = data.email || '';
      document.getElementById('profile_skills').value = data.skills || '';
      if (data.joining_date) {
        document.getElementById('profile_joining_date').value = data.joining_date;
      }

      editProfileModal.classList.add('show');
    }
  });

  // Open Update Password
  btnOpenUpdatePassword.addEventListener('click', (e) => {
    e.preventDefault();
    updatePasswordModal.classList.add('show');
  });

  // Close Modals
  btnCloseEditProfile.addEventListener('click', () => editProfileModal.classList.remove('show'));
  btnCloseUpdatePassword.addEventListener('click', () => updatePasswordModal.classList.remove('show'));

  // Handle Profile Update
  editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('profile_name').value,
      email: document.getElementById('profile_email').value,
      skills: document.getElementById('profile_skills').value,
      joining_date: document.getElementById('profile_joining_date').value
    };

    const resp = await fetch('/Work_logs/api/me/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await resp.json();
    if (result.success) {
      alert('Profile updated successfully!');
      editProfileModal.classList.remove('show');
      location.reload(); // Refresh to show new name if needed
    } else {
      alert('Error: ' + (result.message || result.error));
    }
  });

  // Handle Password Update
  updatePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      current_password: document.getElementById('current_password').value,
      new_password: document.getElementById('new_password').value
    };

    const resp = await fetch('/Work_logs/api/me/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await resp.json();
    if (result.success) {
      alert('Password updated successfully!');
      updatePasswordModal.classList.remove('show');
      updatePasswordForm.reset();
    } else {
      alert('Error: ' + (result.message || result.error));
    }
  });
}

// --- Notification Management Logic ---
function initNotifications() {
  const notifContainer = document.getElementById('notificationContainer');
  const notifDropdown = document.getElementById('notificationDropdown');
  const notifBadge = document.getElementById('notificationBadge');
  const notifList = document.getElementById('notificationList');
  const notifCountText = document.getElementById('notifCountText');

  // Toggle Visibility
  notifContainer.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdown.classList.toggle('show');
    // Profile menu should close if open
    const profileMenu = document.getElementById('profileMenu');
    if (profileMenu) profileMenu.classList.remove('show');
  });

  // Close on outside click
  window.addEventListener('click', () => {
    notifDropdown.classList.remove('show');
  });

  async function loadNotifications() {
    try {
      const resp = await fetch('/Work_logs/api/me/notifications');
      const data = await resp.json();
      if (!data.success) throw new Error();

      const { projects, issues } = data;
      const total = projects.length + issues.length;

      // Update Badge
      if (total > 0) {
        notifBadge.textContent = total;
        notifBadge.style.display = 'block';
        notifCountText.textContent = `${total} New`;
      } else {
        notifBadge.style.display = 'none';
        notifCountText.textContent = `0 New`;
      }

      // Render Items
      notifList.innerHTML = '';
      if (total === 0) {
        notifList.innerHTML = '<div class="notif-empty">No new assignments or solved issues</div>';
        return;
      }

      // PROJECTS SECTION
      if (projects.length > 0) {
        const pHeading = document.createElement('div');
        pHeading.className = 'notif-section-title';
        pHeading.textContent = 'Assigned Projects';
        notifList.appendChild(pHeading);

        projects.forEach(p => {
          const item = document.createElement('div');
          item.className = 'notif-item project';
          item.innerHTML = `
            <div class="notif-icon-circle"><i class="fas fa-project-diagram"></i></div>
            <div class="notif-content">
              <div class="notif-title">${p.project_name}</div>
              <div class="notif-meta">You are assigned to this project</div>
            </div>`;
          notifList.appendChild(item);
        });
      }

      // ISSUES SECTION
      if (issues.length > 0) {
        const iHeading = document.createElement('div');
        iHeading.className = 'notif-section-title';
        iHeading.textContent = 'Solved Person in Issues';
        notifList.appendChild(iHeading);

        issues.forEach(i => {
          const item = document.createElement('div');
          item.className = 'notif-item issue';
          item.innerHTML = `
            <div class="notif-icon-circle"><i class="fas fa-bug"></i></div>
            <div class="notif-content">
              <div class="notif-title">${i.project_name}</div>
              <div class="notif-meta">${i.problem_description.substring(0, 40)}${i.problem_description.length > 40 ? '...' : ''}</div>
            </div>`;
          notifList.appendChild(item);
        });
      }
    } catch (e) {
      notifList.innerHTML = '<div class="notif-empty">Failed to load notifications</div>';
    }
  }

  loadNotifications();
}

document.addEventListener('DOMContentLoaded', function () {
  loadDashboard();
  initProfileManagement();
  initNotifications();
  const refreshBtn = document.getElementById('refreshDashboard');
  if (refreshBtn) refreshBtn.addEventListener('click', loadDashboard);
});
