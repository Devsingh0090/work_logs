document.addEventListener('DOMContentLoaded', function() {
  const projectSelect = document.getElementById('issueProject');
  const responsibleInput = document.getElementById('responsibleInput');
  const addResponsibleBtn = document.getElementById('addResponsible');
  const responsibleListDiv = document.getElementById('responsibleList');
  const solvedSelect = document.getElementById('solvedSelect');
  const addSolvedBtn = document.getElementById('addSolved');
  const solvedListDiv = document.getElementById('solvedList');
  const issueForm = document.getElementById('issueForm');
  const issuesTableBody = document.querySelector('#issuesTable tbody');

  const responsible = [];
  const solved = [];
  const projectsMap = {};
  const operatorsMap = {};

  async function fetchProjects() {
    try {
      const res = await fetch('/Work_logs/api/projects');
      if (!res.ok) return;
      const data = await res.json();
      projectSelect.innerHTML = '<option value="">-- none --</option>' + data.map(p => `<option value="${p.id}">${p.project_name || p.company_name || p.name || p.id}</option>`).join('');
      data.forEach(p => { projectsMap[p.id] = p.project_name || p.company_name || p.name || (p.id+''); });
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchOperators() {
    try {
      const res = await fetch('/Work_logs/api/operators');
      if (!res.ok) return;
      const data = await res.json();
      // populate solvedSelect
      solvedSelect.innerHTML = data.map(o => `<option value="${o.id}">${o.name}</option>`).join('');
      data.forEach(o => { operatorsMap[o.id] = o.name; });
    } catch (e) {
      console.error(e);
    }
  }

  function renderPills(list, container) {
    container.innerHTML = '';
    list.forEach((name, idx) => {
      const span = document.createElement('span');
      span.className = 'pill';
      span.textContent = name;
      const rem = document.createElement('button');
      rem.className = 'pill-rem';
      rem.textContent = '×';
      rem.addEventListener('click', () => {
        list.splice(idx,1);
        renderPills(list, container);
      });
      span.appendChild(rem);
      container.appendChild(span);
    });
  }

  addResponsibleBtn.addEventListener('click', () => {
    const v = responsibleInput.value && responsibleInput.value.trim();
    if (!v) return;
    responsible.push(v);
    responsibleInput.value = '';
    renderPills(responsible, responsibleListDiv);
  });
  addSolvedBtn.addEventListener('click', () => {
    const opt = solvedSelect.options[solvedSelect.selectedIndex];
    if (!opt || !opt.value) return;
    const name = opt.text;
    if (!solved.includes(name)) {
      solved.push(name);
      renderPills(solved, solvedListDiv);
    }
    // reset select to placeholder
    solvedSelect.selectedIndex = 0;
  });

  issueForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // enforce required fields: project, at least one responsible, at least one solved, start and deadline
    const projectVal = document.getElementById('issueProject').value;
    const startTimeVal = document.getElementById('issueStartTime').value;
    const deadlineVal = document.getElementById('issueDeadline').value;
    if (!projectVal) return alert('Project is required');
    if (!responsible || responsible.length === 0) return alert('Add at least one Responsible Person');
    if (!solved || solved.length === 0) return alert('Add at least one Solved Person');
    if (!startTimeVal) return alert('Start date/time is required');
    if (!deadlineVal) return alert('Deadline date/time is required');

    const payload = {
      project_id: projectVal,
      date: document.getElementById('issueDate').value,
      problem_description: document.getElementById('problemDescription').value,
      responsible_persons: responsible,
      solved_persons: solved,
      start_time: startTimeVal,
      deadline: deadlineVal,
      status: document.getElementById('issueStatus').value || 'pending'
    };
    try {
      console.log('Submitting issue payload (required enforced):', payload);
      const res = await fetch('/Work_logs/api/issues', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (res.ok) {
        issueForm.reset();
        responsible.length=0; solved.length=0;
        renderPills(responsible, responsibleListDiv);
        renderPills(solved, solvedListDiv);
        fetchIssues();
      } else {
        const txt = await res.text();
        alert('Error: '+txt);
      }
    } catch (e) { console.error(e); }
  });

  async function fetchIssues() {
    try {
      const res = await fetch('/Work_logs/api/issues');
      if (!res.ok) return;
      const data = await res.json();
      renderIssues(data);
    } catch (e) { console.error(e); }
  }

  function renderIssues(list) {
    issuesTableBody.innerHTML = '';
    list.forEach((it, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx+1}</td>
        <td>${it.project_id ? (projectsMap[it.project_id] || it.project_id) : '-'}</td>
        <td>${it.date || '-'}</td>
        <td>${escapeHtml(it.problem_description)}</td>
        <td>${(it.responsible_persons || []).join(', ')}</td>
        <td>${(it.solved_persons || []).join(', ')}</td>
          <td>${it.start_time || '-'}</td>
          <td>${it.deadline || '-'}</td>
          <td><span class="status-badge ${statusClass(it.status)} small" data-id="${it.id}" data-status="${it.status}">${formatStatus(it.status)}</span></td>
            <td><div class="action-cell"><button class="btn btn-sm btn-primary btn-edit" data-id="${it.id}" data-solved="${encodeURIComponent(JSON.stringify(it.solved_persons||[]))}" data-deadline="${encodeURIComponent(it.deadline||'')}">Edit</button></div></td>
      `;
      issuesTableBody.appendChild(tr);
    });
        // status badge click handlers (delegation)
      document.querySelectorAll('.status-badge').forEach(b => b.addEventListener('click', async (ev) => {
        const el = ev.currentTarget;
        const id = el.dataset.id;
        const cur = (el.dataset.status || '').toLowerCase();
        let next = null;
        if (cur === 'pending' || !cur) next = 'in-progress';
        else if (cur === 'in-progress') next = 'complete';
        else if (cur === 'complete') {
          alert('Issue already complete');
          return;
        }

        try {
          const res = await fetch('/Work_logs/api/issues/' + id, {
            method: 'PUT', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ status: next })
          });
          if (res.ok) {
            el.dataset.status = next;
            el.classList.remove('status-pending','status-in-progress','status-complete');
            el.classList.add(statusClass(next));
            el.textContent = formatStatus(next);
            if (next === 'complete') alert('Issue marked complete');
          } else {
            const txt = await res.text();
            alert('Failed to update status: ' + txt);
          }
        } catch (e) { console.error(e); alert('Error updating status'); }
      }));
    // edit button handlers
    document.querySelectorAll('.btn-edit').forEach(b=> b.addEventListener('click', (ev)=>{
      const btn = ev.currentTarget;
      const id = btn.dataset.id;
      const solvedJson = decodeURIComponent(btn.dataset.solved || '[]');
      let solvedArr = [];
      try { solvedArr = JSON.parse(solvedJson); } catch(e){ solvedArr = []; }
      const deadline = decodeURIComponent(btn.dataset.deadline || '');
      openEditModal(id, solvedArr, deadline);
    }));
  }

  function statusClass(status) {
    if (!status) return 'status-pending';
    const s = String(status).toLowerCase();
    if (s === 'pending') return 'status-pending';
    if (s === 'in-progress' || s === 'in progress') return 'status-in-progress';
    if (s === 'complete' || s === 'completed') return 'status-complete';
    return 'status-pending';
  }

  function formatStatus(status) {
    if (!status) return 'Pending';
    const s = String(status).toLowerCase();
    if (s === 'pending') return 'Pending';
    if (s === 'in-progress' || s === 'in progress') return 'In-Progress';
    if (s === 'complete' || s === 'completed') return 'Complete';
    // fallback capitalize
    return String(status).charAt(0).toUpperCase() + String(status).slice(1);
  }

  function escapeHtml(s){ if(!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // init
  fetchProjects();
  fetchOperators();
  fetchIssues();

  // datetime placeholder toggles
  function updateDtPlaceholder(input) {
    const span = input.parentElement.querySelector('.dt-placeholder');
    if (!span) return;
    if (input.value) {
      input.setAttribute('data-hasvalue','true');
      span.style.opacity = '0';
      span.style.visibility = 'hidden';
    } else {
      input.removeAttribute('data-hasvalue');
      span.style.opacity = '1';
      span.style.visibility = 'visible';
    }
  }

  ['issueStartTime','issueDeadline'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    // set initial state
    updateDtPlaceholder(el);
    el.addEventListener('input', () => updateDtPlaceholder(el));
    el.addEventListener('change', () => updateDtPlaceholder(el));
    el.addEventListener('focus', () => updateDtPlaceholder(el));
    el.addEventListener('blur', () => updateDtPlaceholder(el));
  });

  // --- Edit modal logic ---
  const editModal = document.getElementById('editIssueModal');
  const modalSolvedSelect = document.getElementById('modalSolvedSelect');
  const modalAddSolved = document.getElementById('modalAddSolved');
  const modalSolvedList = document.getElementById('modalSolvedList');
  const modalDeadline = document.getElementById('modalDeadline');
  const modalCancel = document.getElementById('modalCancel');
  const modalSave = document.getElementById('modalSave');
  let modalWorkingSolved = [];
  let currentEditId = null;

  // populate modal operator select when operatorsMap available
  function populateModalOperators() {
    if (!modalSolvedSelect) return;
    modalSolvedSelect.innerHTML = '<option value="">-- Select employee --</option>' + Object.keys(operatorsMap).map(id=>`<option value="${operatorsMap[id]}">${operatorsMap[id]}</option>`).join('');
  }

  function openEditModal(id, solvedArr, deadline) {
    currentEditId = id;
    modalWorkingSolved = Array.isArray(solvedArr) ? solvedArr.slice() : [];
    renderPills(modalWorkingSolved, modalSolvedList);
    modalDeadline.value = deadline || '';
    populateModalOperators();
    editModal.style.display = 'block';
    editModal.setAttribute('aria-hidden','false');
  }

  function closeEditModal() {
    editModal.style.display = 'none';
    editModal.setAttribute('aria-hidden','true');
    currentEditId = null;
    modalWorkingSolved = [];
    modalSolvedList.innerHTML = '';
  }

  modalAddSolved.addEventListener('click', ()=>{
    const name = modalSolvedSelect.value && modalSolvedSelect.value.trim();
    if (!name) return;
    if (!modalWorkingSolved.includes(name)) modalWorkingSolved.push(name);
    renderPills(modalWorkingSolved, modalSolvedList);
    modalSolvedSelect.selectedIndex = 0;
  });

  modalCancel.addEventListener('click', ()=> closeEditModal());

  modalSave.addEventListener('click', async ()=>{
    if (!currentEditId) return;
    // require at least one solved person and deadline when saving from modal
    if (!modalWorkingSolved || modalWorkingSolved.length === 0) return alert('Add at least one Solved Person');
    if (!modalDeadline || !modalDeadline.value) return alert('Deadline is required');
    const payload = {
      solved_persons: modalWorkingSolved,
      deadline: modalDeadline.value
    };
    try {
      const res = await fetch('/Work_logs/api/issues/' + currentEditId, {
        method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      if (res.ok) {
        closeEditModal();
        fetchIssues();
      } else {
        const txt = await res.text();
        alert('Failed to save: ' + txt);
      }
    } catch (e) { console.error(e); alert('Error saving issue'); }
  });

  // close modal when clicking backdrop
  document.addEventListener('click', (ev)=>{
    if (!editModal) return;
    if (ev.target.classList && ev.target.classList.contains('modal-backdrop')) closeEditModal();
  });
});
