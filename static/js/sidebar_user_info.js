// Add user information to sidebar for all pages
// Optimized version (No localStorage, Single API call)

document.addEventListener('DOMContentLoaded', function () {
  const sidebarHeader = document.querySelector('.sidebar-header');
  if (!sidebarHeader) return;

  // Check if elements already exist (prevent duplicate runs)
  if (document.getElementById('sidebarUserName') || document.getElementById('sidebarUserId')) return;

  fetchUserInfo();

  function fetchUserInfo() {
    // Optimized: Use the unified endpoint that returns everything in one network burst
    fetch('/Work_logs/api/me', { credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error('Auth failed');
        return response.json();
      })
      .then(data => {
        if (data.success && data.user) {
          addUserInfoToSidebar(data.user.name, data.user.operator_id);
        }
      })
      .catch(error => {
        console.error('[DEBUG] Sidebar user info error:', error);
      });
  }

  function addUserInfoToSidebar(name, id) {
    if (!name && !id) return;

    let wrapper = sidebarHeader.querySelector('.sidebar-info-wrapper');
    const h3Element = sidebarHeader.querySelector('h3');

    // Create container if it doesn't exist
    if (!wrapper && h3Element) {
      wrapper = document.createElement('div');
      wrapper.className = 'sidebar-info-wrapper';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.justifyContent = 'center';
      h3Element.parentNode.insertBefore(wrapper, h3Element);
      wrapper.appendChild(h3Element);
    } else if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'sidebar-info-wrapper';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      sidebarHeader.appendChild(wrapper);
    }

    // Name element
    const userNameEl = document.createElement('div');
    userNameEl.id = 'sidebarUserName';
    userNameEl.style.fontWeight = '500';
    userNameEl.style.color = '#60a5fa';
    userNameEl.style.fontSize = '0.95rem';
    userNameEl.style.marginTop = '4px';
    userNameEl.style.lineHeight = '1.2';
    userNameEl.textContent = name;

    // ID element
    const userIdEl = document.createElement('div');
    userIdEl.id = 'sidebarUserId';
    userIdEl.style.fontSize = '0.85rem';
    userIdEl.style.color = '#94a3b8';
    userIdEl.style.marginTop = '2px';
    userIdEl.style.lineHeight = '1.2';
    userIdEl.textContent = id;

    wrapper.appendChild(userNameEl);
    wrapper.appendChild(userIdEl);
  }
});
