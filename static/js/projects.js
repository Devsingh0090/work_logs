document.addEventListener('DOMContentLoaded', function () {
    const companySelect = document.getElementById('project_company');
    const employeeSelect = document.getElementById('assign_employee');
    const assignedList = document.getElementById('assignedList');
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    const projectForm = document.getElementById('projectForm');

    // enforce max length 30 for project name in add form
    const projectNameEl = document.getElementById('project_name');
    if (projectNameEl) {
        projectNameEl.maxLength = 30;
        projectNameEl.addEventListener('input', function () {
            if (this.value && this.value.length > 30) this.value = this.value.slice(0, 30);
        });
    }

    // helper to enforce maxlength 50 on given element IDs (truncates pasted input)
    function enforceMax50(ids) {
        (ids || []).forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            try { el.maxLength = 50; } catch (e) { }
            el.addEventListener('input', function () { if (this.value && this.value.length > 50) this.value = this.value.slice(0, 50); });
        });
    }

    // attempt to enforce on any existing elements (some are created dynamically)
    enforceMax50(['wt_name', 'wt_module_input', 'add_wt_only_name', 'moduleNameInput']);

    let assigned = [];
    window.companiesMap = window.companiesMap || {}; // id -> company_name
    window.operatorsMap = window.operatorsMap || {}; // id -> "OPRxxx - Name"
    window.operatorsByCode = window.operatorsByCode || {}; // operator_id (code) -> label
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

    function loadCompanies() {
        fetch('/Work_logs/api/companies')
            .then(res => res.json())
            .then(data => {
                companySelect.innerHTML = '<option value="">-- Select Client --</option>';
                window.companiesMap = {};
                data.forEach(c => {
                    window.companiesMap[c.id] = c.company_name;
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.company_name;
                    companySelect.appendChild(opt);
                });
            }).catch(() => { });
    }

    function loadEmployees() {
        fetch('/Work_logs/api/operators')
            .then(res => res.json())
            .then(list => {
                employeeSelect.innerHTML = '';
                window.operatorsMap = {};
                window.operatorsByCode = window.operatorsByCode || {};
                list.forEach(o => {
                    const label = `${o.operator_id} - ${o.name}`;
                    window.operatorsMap[o.id] = label;
                    window.operatorsByCode[o.operator_id] = label;
                    const opt = document.createElement('option');
                    opt.value = o.id;
                    opt.textContent = label;
                    employeeSelect.appendChild(opt);
                });
            }).catch(() => { });
    }

    function renderAssigned() {
        assignedList.innerHTML = '';
        assigned.forEach(id => {
            const span = document.createElement('span');
            span.className = 'assigned-pill';
            span.textContent = id.label;
            const rem = document.createElement('span');
            rem.className = 'remove';
            rem.textContent = '×';
            rem.onclick = () => { assigned = assigned.filter(a => a.value != id.value); renderAssigned(); };
            span.appendChild(rem);
            assignedList.appendChild(span);
        });
    }

    addEmployeeBtn.onclick = function () {
        const opt = employeeSelect.selectedOptions[0];
        if (!opt) return;
        const val = opt.value;
        const label = opt.textContent;
        if (assigned.some(a => a.value == val)) return;
        assigned.push({ value: val, label });
        renderAssigned();
    };

    projectForm.onsubmit = function (e) {
        e.preventDefault();
        const payload = {
            project_name: document.getElementById('project_name').value,
            company_id: document.getElementById('project_company').value || null,
            description: document.getElementById('project_description').value || '',
            assigned_employees: assigned.map(a => a.value)
        };
        // client-side duplicate check (case-insensitive)
        if (window.projectNames && window.projectNames.includes((payload.project_name || '').toLowerCase())) {
            return alert('Project with this name already exists');
        }
        fetch('/Work_logs/api/projects', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        }).then(r => r.json()).then(res => {
            if (res.error) alert(res.error); else { alert('Project created'); projectForm.reset(); assigned = []; renderAssigned(); }
        }).catch(err => { alert('Error creating project'); });
    };

    window.loadProjects = function () {
        fetch('/Work_logs/api/projects')
            .then(res => res.json())
            .then(async list => {
                // expose project names for client-side duplicate checks
                try { window.projectNames = (list || []).map(p => (p.project_name || '').toLowerCase()); } catch (e) { window.projectNames = []; }
                const tbody = document.getElementById('projectsTableBody');
                tbody.innerHTML = '';
                const op = await getCurrentOperator();
                const opDbId = op ? op.id : null;
                const opCode = op ? op.operator_id : null;
                function isAssignedToCurrent(p) {
                    try {
                        const ae = p.assigned_employees || [];
                        if (Array.isArray(ae)) {
                            if (opDbId != null && (ae.includes(opDbId) || ae.includes(String(opDbId)) || ae.includes(Number(opDbId)))) return true;
                            if (opCode != null && (ae.includes(opCode) || ae.includes(String(opCode)))) return true;
                            return false;
                        }
                        if (typeof ae === 'string') {
                            const arr = ae.split(',').map(s => s.trim()).filter(Boolean);
                            if (opDbId != null && arr.includes(String(opDbId))) return true;
                            if (opCode != null && arr.includes(String(opCode))) return true;
                        }
                    } catch (e) { }
                    return false;
                }
                // Projects List tab should show all projects (no filtering)
                const finalList = list || [];
                finalList.forEach((p, idx) => {
                    const tr = document.createElement('tr');
                    const companyName = p.company_id ? (window.companiesMap[p.company_id] || p.company_id) : '';
                    const assignedNames = (p.assigned_employees || []).map(id => window.operatorsMap[id] || id).join(', ');
                    const loggedUserLabel = p.logged_user ? (window.operatorsByCode[p.logged_user] || p.logged_user) : '';
                    const operation = p.operation || '';
                    tr.innerHTML = `
                            <td>${idx + 1}</td>
                            <td>${p.project_name}</td>
                            <td>${companyName}</td>
                            <td>${assignedNames}</td>
                            <td>${loggedUserLabel}</td>
                            <td>${operation}</td>
                            <td style="display:flex; gap:8px;">
                              <button class="action-btn" style="background:#4f46e5; color:white;" onclick="viewProjectStats(${p.id}, '${p.project_name.replace(/'/g, "\\'")}')">View</button>
                              <button class="action-btn edit-btn" onclick="editProject(${p.id})">Edit</button>
                              <button class="action-btn delete-btn" onclick="deleteProject(${p.id})">Delete</button>
                            </td>
                        `;
                    tbody.appendChild(tr);
                });
            }).catch(() => { });
    };

    loadCompanies();
    loadEmployees();
    loadWorkTypes();
});

// Work Types management
function loadWorkTypes() {
    fetch('/Work_logs/api/work_types')
        .then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t) }); return r.json(); })
        .then(list => {
            // also fetch modules and then render only work-types that have modules
            fetch('/Work_logs/api/modules').then(rm => { if (!rm.ok) return rm.text().then(t => { throw new Error(t) }); return rm.json(); }).then(mods => {
                const modsByWT = {};
                (mods || []).forEach(m => { if (!modsByWT[m.work_type_id]) modsByWT[m.work_type_id] = []; modsByWT[m.work_type_id].push(m.name); });
                // expose modules by work-type for client-side duplicate checks
                window.modulesByWorkType = modsByWT;
                // populate table (only work types that have modules)
                const body = document.getElementById('workTypesBody');
                if (body) {
                    body.innerHTML = '';
                    let idx = 0;
                    (list || []).forEach((w) => {
                        const modulesFor = modsByWT[w.id] || [];
                        if (modulesFor.length === 0) return; // skip work-types without modules
                        idx++;
                        const tr = document.createElement('tr');
                        const modules = modulesFor.join(', ');
                        tr.innerHTML = `<td>${idx}</td><td>${w.name}</td><td>${modules}</td><td style="display:flex;gap:8px;"><button class="action-btn" onclick="editWorkType(${w.id})">Edit</button><button class="action-btn" onclick="deleteWorkType(${w.id})">Delete</button></td>`;
                        body.appendChild(tr);
                    });
                }
                // populate modules work type select if present (keep all work types selectable)
                const modulesSelect = document.getElementById('modulesWorkTypeSelect');
                if (modulesSelect) {
                    modulesSelect.innerHTML = '<option value="">-- Select Work Type --</option>' + (list || []).map(w => `<option value="${w.id}">${w.name}</option>`).join('');
                }
                // expose work type names for duplicate checks
                window.workTypeNames = (list || []).map(w => (w.name || '').toLowerCase());
            }).catch(err => { console.warn('failed to load modules', err); });

            // attach create form handlers
            const form = document.getElementById('workTypeForm');
            if (form) {
                const modulesInput = document.getElementById('wt_module_input');
                const addBtn = document.getElementById('wt_add_module');
                const modulesList = document.getElementById('wt_modules_list');
                let modules = [];
                function renderModules() {
                    modulesList.innerHTML = '';
                    modules.forEach((m, i) => {
                        const span = document.createElement('span'); span.className = 'assigned-pill'; span.textContent = m;
                        const rem = document.createElement('span'); rem.className = 'remove'; rem.textContent = '×'; rem.onclick = () => { modules.splice(i, 1); renderModules(); };
                        span.appendChild(rem); modulesList.appendChild(span);
                    });
                }
                addBtn.onclick = () => {
                    const v = modulesInput.value && modulesInput.value.trim(); if (!v) return;
                    // prevent duplicate module names in the create form (case-insensitive)
                    if (modules.some(m => m.toLowerCase() === v.toLowerCase())) { alert('Module already added'); modulesInput.value = ''; return; }
                    modules.push(v); modulesInput.value = ''; renderModules();
                };
                form.onsubmit = function (e) {
                    e.preventDefault();
                    const name = document.getElementById('wt_name').value.trim();
                    if (!name) return alert('Work Type name required');
                    // prevent duplicate work type names (client-side check)
                    if (window.workTypeNames && window.workTypeNames.includes(name.toLowerCase())) { return alert('Work Type with this name already exists'); }
                    fetch('/Work_logs/api/work_types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, modules }) })
                        .then(r => { if (!r.ok) return r.json().then(x => { throw new Error(x.error || 'Create failed') }); return r.json(); })
                        .then(res => { alert('Created'); document.getElementById('wt_name').value = ''; modules = []; renderModules(); loadWorkTypes(); })
                        .catch(err => { alert('Error: ' + (err.message || err)); console.error(err); });
                };
            }

        }).then(() => {
            try { window.dispatchEvent(new Event('worktypes:changed')); } catch (e) { }
        }).catch(err => { console.warn('work types load failed', err); });
}

window.editWorkType = function (id) {
    fetch(`/Work_logs/api/work_types/${id}`).then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t) }); return r.json(); }).then(w => {
        const modal = document.createElement('div'); modal.className = 'modal'; modal.innerHTML = `<div class="modal-content"><h3>Edit Work Type</h3><form id="editWTForm"><label>Name</label><input id="edit_wt_name" maxlength="50" value="${w.name || ''}" /><label>Modules</label><div id="edit_wt_modules"></div><div style="display:flex;gap:8px;margin-top:12px;"><input id="edit_wt_module_input" maxlength="50" placeholder="module" /><button id="edit_wt_add" type="button">Add</button></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;"><button type="button" id="cancelWT" class="btn-secondary">Cancel</button><button type="submit" class="btn-primary">Save</button></div></form></div>`;
        document.body.appendChild(modal);

        // enforce maxlength on modal inputs
        (function () {
            const nameEl = modal.querySelector('#edit_wt_name');
            if (nameEl) { nameEl.maxLength = 50; nameEl.addEventListener('input', function () { if (this.value && this.value.length > 50) this.value = this.value.slice(0, 50); }); }
            const modEl = modal.querySelector('#edit_wt_module_input');
            if (modEl) { modEl.maxLength = 50; modEl.addEventListener('input', function () { if (this.value && this.value.length > 50) this.value = this.value.slice(0, 50); }); }
        })();
        const modulesDiv = modal.querySelector('#edit_wt_modules');
        let modules = w.modules || [];
        function render() { modulesDiv.innerHTML = ''; modules.forEach((m, i) => { const span = document.createElement('span'); span.className = 'assigned-pill'; span.textContent = m; const rem = document.createElement('span'); rem.className = 'remove'; rem.textContent = '×'; rem.onclick = () => { modules.splice(i, 1); render(); }; span.appendChild(rem); modulesDiv.appendChild(span); }); }
        render();
        modal.querySelector('#edit_wt_add').onclick = () => {
            const v = modal.querySelector('#edit_wt_module_input').value.trim();
            if (!v) return;
            // prevent duplicate modules (case-insensitive)
            if (modules.some(m => (m || '').toLowerCase() === v.toLowerCase())) { modal.querySelector('#edit_wt_module_input').value = ''; return alert('Module already added'); }
            modules.push(v);
            modal.querySelector('#edit_wt_module_input').value = '';
            render();
        };
        modal.querySelector('#cancelWT').onclick = () => document.body.removeChild(modal);
        modal.querySelector('#editWTForm').onsubmit = function (e) { e.preventDefault(); const name = modal.querySelector('#edit_wt_name').value.trim(); fetch(`/Work_logs/api/work_types/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, modules }) }).then(r => r.json()).then(res => { alert('Updated'); document.body.removeChild(modal); loadWorkTypes(); }).catch(err => { alert('Error'); console.error(err); }); };
    }).catch(err => { alert('Could not load work type'); console.error(err); });
};

window.deleteWorkType = function (id) { if (!confirm('Delete this work type?')) return; fetch(`/Work_logs/api/work_types/${id}`, { method: 'DELETE' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(() => { alert('Deleted'); loadWorkTypes(); }).catch(err => { alert('Error deleting'); console.error(err); }); };

// Simple modal to add only work type name (no modules)
window.openAddWorkTypeOnly = function () {
    const modal = document.createElement('div'); modal.className = 'modal';
    modal.innerHTML = `
            <div class="modal-content">
                <h3>Add Work Type</h3>
                <form id="addWTOnlyForm">
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <label>Name</label>
                        <input id="add_wt_only_name" maxlength="50" />
                        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                            <button type="button" id="cancelAddWTOnly" class="btn-secondary">Cancel</button>
                            <button type="submit" class="btn-primary">Create</button>
                        </div>
                    </div>
                </form>
            </div>`;
    document.body.appendChild(modal);
    // enforce maxlength on single-name modal
    (function () { const el = modal.querySelector('#add_wt_only_name'); if (el) { el.maxLength = 50; el.addEventListener('input', function () { if (this.value && this.value.length > 50) this.value = this.value.slice(0, 50); }); } })();
    modal.querySelector('#cancelAddWTOnly').onclick = () => document.body.removeChild(modal);
    modal.querySelector('#addWTOnlyForm').onsubmit = function (e) {
        e.preventDefault();
        const name = modal.querySelector('#add_wt_only_name').value && modal.querySelector('#add_wt_only_name').value.trim();
        if (!name) return alert('Name required');
        if (window.workTypeNames && window.workTypeNames.includes(name.toLowerCase())) { return alert('Work Type with this name already exists'); }
        fetch('/Work_logs/api/work_types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, modules: [] }) })
            .then(r => { if (!r.ok) return r.json().then(x => { throw new Error(x.error || 'Create failed') }); return r.json(); })
            .then(res => { alert('Work Type created'); document.body.removeChild(modal); loadWorkTypes(); })
            .catch(err => { alert('Error creating: ' + (err.message || err)); console.error(err); });
    };
};

// Modules management UI handlers
// Modules management UI handlers
function loadModulesForWorkType(/* wtId - ignored; show all modules */) {
    const listDiv = document.getElementById('modulesListDiv');
    if (!listDiv) return;
    // Hide modules list under Add Modules area — keep it empty
    listDiv.innerHTML = '';
}

document.addEventListener('DOMContentLoaded', function () {
    const modulesSelect = document.getElementById('modulesWorkTypeSelect');
    const addModuleBtn = document.getElementById('addModuleBtn');
    const moduleNameInput = document.getElementById('moduleNameInput');
    if (moduleNameInput) { moduleNameInput.maxLength = 50; moduleNameInput.addEventListener('input', function () { if (this.value && this.value.length > 50) this.value = this.value.slice(0, 50); }); }
    // Do not auto-filter modules when selecting a work type; list shows all modules
    if (addModuleBtn) {
        addModuleBtn.addEventListener('click', function () {
            const wt = modulesSelect ? modulesSelect.value : null;
            const name = moduleNameInput ? (moduleNameInput.value || '').trim() : '';
            if (!wt) return alert('Select Work Type first');
            if (!name) return alert('Enter module name');
            // client-side duplicate check against loaded modules for this work type
            if (window.modulesByWorkType && window.modulesByWorkType[wt]) {
                const exists = window.modulesByWorkType[wt].some(m => (m || '').toLowerCase() === name.toLowerCase());
                if (exists) { return alert('Module with this name already exists for selected Work Type'); }
            }
            fetch('/Work_logs/api/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ work_type_id: wt, name }) })
                .then(r => { if (!r.ok) return r.json().then(x => { throw new Error(x.error || 'Create failed') }); return r.json(); })
                .then(res => { moduleNameInput.value = ''; if (typeof loadWorkTypes === 'function') loadWorkTypes(); })
                .catch(err => { alert('Error creating module: ' + (err.message || err)); console.error(err); });
        });
    }
    // Initial load: show all modules
    loadModulesForWorkType();
});

// Edit project modal and update
window.editProject = function (projectId) {
    console.log('editProject fetch', projectId, `/Work_logs/api/projects/${projectId}`);
    fetch(`/Work_logs/api/projects/${projectId}`)
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(p => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Edit Project</h3>
                    <form id="editProjectForm">
                        <div style="display:grid; gap:12px;">
                                            <label>Project Name *</label>
                                            <input type="text" name="project_name" id="edit_project_name" value="${(p.project_name || '').replace(/"/g, '&quot;').substring(0, 50)}" maxlength="50" required />
                            <label>Client (optional)</label>
                            <select id="edit_project_company">
                                <option value="">-- Select C --</option>
                            </select>
                            <label>Description</label>
                            <input type="text" id="edit_project_description" name="description" value="${p.description || ''}" />
                            <label>Assign Employee (one by one)</label>
                            <div style="display:flex; gap:8px; align-items:center;">
                                <select id="edit_assign_employee" style="flex:1"></select>
                                <button type="button" id="editAddEmployeeBtn" class="btn-primary">Add</button>
                            </div>
                            <div id="editAssignedList" style="margin-top:8px;"></div>
                        </div>
                        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:12px;">
                            <button type="button" id="cancelEditBtn" class="btn-secondary">Cancel</button>
                            <button type="submit" class="btn-primary">Save</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            // enforce maxlength for edit modal project name and prevent typing beyond 30
            const editNameEl = modal.querySelector('#edit_project_name');
            if (editNameEl) {
                editNameEl.maxLength = 50;
                editNameEl.addEventListener('input', function () {
                    if (this.value && this.value.length > 30) this.value = this.value.slice(0, 30);
                });
            }

            // populate companies
            const editCompany = modal.querySelector('#edit_project_company');
            Object.keys(window.companiesMap).forEach(id => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = window.companiesMap[id];
                if (String(id) === String(p.company_id)) opt.selected = true;
                editCompany.appendChild(opt);
            });

            // populate employees
            const editEmployeeSelect = modal.querySelector('#edit_assign_employee');
            Object.keys(window.operatorsMap).forEach(id => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = window.operatorsMap[id];
                editEmployeeSelect.appendChild(opt);
            });

            // assigned list
            let editAssigned = (p.assigned_employees || []).map(a => ({ value: a, label: window.operatorsMap[a] || a }));
            const editAssignedList = modal.querySelector('#editAssignedList');
            function renderEditAssigned() {
                editAssignedList.innerHTML = '';
                editAssigned.forEach(item => {
                    const span = document.createElement('span');
                    span.className = 'assigned-pill';
                    span.textContent = item.label;
                    const rem = document.createElement('span');
                    rem.className = 'remove';
                    rem.textContent = '×';
                    rem.onclick = () => { editAssigned = editAssigned.filter(e => e.value != item.value); renderEditAssigned(); };
                    span.appendChild(rem);
                    editAssignedList.appendChild(span);
                });
            }
            renderEditAssigned();

            modal.querySelector('#editAddEmployeeBtn').onclick = function () {
                const opt = editEmployeeSelect.selectedOptions[0];
                if (!opt) return;
                const val = opt.value;
                const label = opt.textContent;
                if (editAssigned.some(a => a.value == val)) return;
                editAssigned.push({ value: val, label });
                renderEditAssigned();
            };

            modal.querySelector('#cancelEditBtn').onclick = function () { document.body.removeChild(modal); };

            modal.querySelector('#editProjectForm').onsubmit = function (e) {
                e.preventDefault();
                const newName = modal.querySelector('#edit_project_name').value && modal.querySelector('#edit_project_name').value.trim();
                // client-side duplicate check (allow same name as current project)
                if (newName && window.projectNames && window.projectNames.includes(newName.toLowerCase()) && newName.toLowerCase() !== (p.project_name || '').toLowerCase()) {
                    return alert('Another project with this name already exists');
                }
                const payload = {
                    project_name: newName,
                    company_id: modal.querySelector('#edit_project_company').value || null,
                    description: modal.querySelector('#edit_project_description').value || '',
                    assigned_employees: editAssigned.map(a => a.value)
                };
                fetch(`/Work_logs/api/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                    .then(r => r.json())
                    .then(res => {
                        if (res.error) alert(res.error); else { alert('Project updated'); document.body.removeChild(modal); if (typeof loadProjects === 'function') loadProjects(); }
                    }).catch(() => { alert('Error updating project'); });
            };
        }).catch(err => { console.error('editProject error', err); alert('Error loading project: ' + (err.message || err)); });
};

window.deleteProject = function (projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    console.log('deleteProject', projectId, `/Work_logs/api/projects/${projectId}`);
    fetch(`/Work_logs/api/projects/${projectId}`, { method: 'DELETE' })
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(res => {
            if (res.error) alert(res.error); else { alert('Project deleted'); if (typeof loadProjects === 'function') loadProjects(); }
        }).catch(err => { console.error('deleteProject error', err); alert('Error deleting project: ' + (err.message || err)); });
};
window.viewProjectStats = function (projectId, projectName) {
    const modal = document.getElementById('statsModal');
    const title = document.getElementById('statsModalTitle');
    const totalContributors = document.getElementById('totalContributors');
    const totalEntries = document.getElementById('totalEntries');
    const totalDays = document.getElementById('totalDays');
    const totalHours = document.getElementById('totalHours');
    const tableBody = document.getElementById('statsTableBody');

    if (!modal || !tableBody) return;

    title.textContent = `Work Status: ${projectName}`;
    tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading...</td></tr>';
    modal.style.display = 'flex';

    fetch(`/Work_logs/api/projects/${projectId}/stats`)
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error(data.error);

            if (totalContributors) totalContributors.textContent = data.total_contributors || 0;
            if (totalEntries) totalEntries.textContent = data.project_total_entries || 0;
            if (totalDays) totalDays.textContent = data.project_total_days || 0;
            if (totalHours) totalHours.textContent = data.project_total_duration || '0m';
            tableBody.innerHTML = '';

            if (!data.user_stats || data.user_stats.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No work entries found for this project.</td></tr>';
                return;
            }

            data.user_stats.forEach(stat => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="font-weight:600;">${stat.user_name}</div>
                        <div style="font-size:0.8rem; color:#64748b;">ID: ${stat.operator_id}</div>
                    </td>
                    <td>${stat.days_worked} days</td>
                    <td><span class="badge" style="background:#eff6ff; color:#3b82f6;">${stat.total_duration}</span></td>
                    <td><div style="font-size:0.85rem; color:#475569; max-width:250px; white-space:normal; line-height:1.4;">${stat.work_dates_breakdown || ''}</div></td>
                `;
                tableBody.appendChild(tr);
            });
        })
        .catch(err => {
            console.error('Error fetching project stats:', err);
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Error: ${err.message}</td></tr>`;
        });
};
