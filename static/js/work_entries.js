document.addEventListener('DOMContentLoaded', function () {
    const tbody = document.getElementById('workEntriesBody');
    // Tab switching for Work Entries
    const tabAdd = document.getElementById('tabAddEntry');
    const tabAll = document.getElementById('tabAllEntries');
    const tabSummary = document.getElementById('tabSummary');
    const addTab = document.getElementById('addEntryTab');
    const allTab = document.getElementById('allEntriesTab');
    const summaryTab = document.getElementById('summaryTab');
    if (tabAdd && tabAll && tabSummary && addTab && allTab && summaryTab) {
        tabAdd.onclick = function () { tabAdd.classList.add('active'); tabAll.classList.remove('active'); tabSummary.classList.remove('active'); addTab.style.display = 'block'; allTab.style.display = 'none'; summaryTab.style.display = 'none'; };
        tabAll.onclick = function () { tabAll.classList.add('active'); tabAdd.classList.remove('active'); tabSummary.classList.remove('active'); addTab.style.display = 'none'; allTab.style.display = 'block'; summaryTab.style.display = 'none'; loadWorkEntries(); };
        tabSummary.onclick = function () { tabSummary.classList.add('active'); tabAdd.classList.remove('active'); tabAll.classList.remove('active'); addTab.style.display = 'none'; allTab.style.display = 'none'; summaryTab.style.display = 'block'; };
    }
    const filterStart = document.getElementById('filter_start');
    const filterEnd = document.getElementById('filter_end');
    const filterApply = document.getElementById('filterApply');
    const filterClear = document.getElementById('filterClear');
    const inlineForm = document.getElementById('workEntryInlineForm');
    const inlineDate = document.getElementById('inline_date');
    const inlineType = document.getElementById('inline_type');
    const inlineDesc = document.getElementById('inline_desc');
    const inlineSkills = document.getElementById('inline_skills');
    const inlineStart = document.getElementById('inline_start');
    const inlineEnd = document.getElementById('inline_end');
    const inlineProject = document.getElementById('inline_project');
    const inlineDurationDisplay = document.getElementById('inline_duration_display');
    let projectsList = [];
    let workTypesList = [];
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

    function formatDurationFromMinutes(m) {
        if (m === null || m === undefined) return null;
        const mm = parseInt(m, 10);
        if (isNaN(mm)) return null;
        const h = Math.floor(mm / 60);
        const rem = mm % 60;
        if (h > 0) return `${h}h ${rem}m`;
        return `${rem}m`;
    }

    function computeDurationMinutes(start, end) {
        if (!start || !end) return null;
        // start/end like HH:MM
        try {
            const [sh, sm] = start.split(':').map(x => parseInt(x, 10));
            const [eh, em] = end.split(':').map(x => parseInt(x, 10));
            let s = sh * 60 + sm;
            let e = eh * 60 + em;
            let diff = e - s;
            if (diff < 0) diff += 24 * 60;
            return diff;
        } catch (e) { return null; }
    }

    function updateInlineDurationDisplay() {
        const m = computeDurationMinutes(inlineStart.value, inlineEnd.value);
        inlineDurationDisplay.textContent = m != null ? formatDurationFromMinutes(m) : '';
    }

    // show/hide inline module select depending on selected work type
    const inlineModuleGroup = document.getElementById('inline_module_group');
    const inlineModule = document.getElementById('inline_module');
    function updateInlineModuleSelect() {
        if (!inlineType) return;
        const opt = inlineType.selectedOptions[0];
        if (!opt) { if (inlineModuleGroup) inlineModuleGroup.style.display = 'none'; return; }
        const wtId = opt.dataset ? (opt.dataset.id ? parseInt(opt.dataset.id, 10) : null) : null;
        const wt = workTypesList.find(x => (wtId && x.id === wtId) || x.name === opt.value);
        if (wt && wt.modules && wt.modules.length > 0) {
            if (inlineModule) {
                inlineModule.innerHTML = '<option value="">-- Select Module --</option>' + wt.modules.map(m => `<option value="${m}">${m}</option>`).join('');
            }
            if (inlineModuleGroup) inlineModuleGroup.style.display = 'block';
        } else {
            if (inlineModuleGroup) inlineModuleGroup.style.display = 'none';
        }
    }

    function fetchProjects() {
        // userId retrieval from localStorage removed to comply with "no local storage" requirement.
        // The backend now automatically uses the session user if no assigned_to param is provided.
        let url = '/Work_logs/api/projects';
        fetch(url)
            .then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t) }); return r.json(); })
            .then(async list => {
                projectsList = list || [];
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
                const finalList = (op ? projectsList.filter(p => isAssignedToCurrent(p)) : []);
                if (inlineProject) {
                    inlineProject.innerHTML = '<option value="">-- none --</option>' + finalList.map(p => `<option value="${p.id}">${p.project_name}</option>`).join('');
                }
            }).catch(err => { console.warn('Could not load projects', err); });
    }

    // Helper: get today's date and date N days ago as YYYY-MM-DD
    function formatDateYYYYMMDD(d) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function setInlineDateDefaults() {
        if (!inlineDate) return;
        const today = new Date();
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(today.getDate() - 3);
        inlineDate.value = formatDateYYYYMMDD(today);
        inlineDate.max = formatDateYYYYMMDD(today);
        inlineDate.min = formatDateYYYYMMDD(threeDaysAgo);
    }

    function fetchWorkTypes() {
        fetch('/Work_logs/api/work_types')
            .then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t) }); return r.json(); })
            .then(list => {
                workTypesList = list || [];
                if (inlineType) {
                    inlineType.innerHTML = '<option value="">-- Select Work Type --</option>' + workTypesList.map(w => `<option value="${w.name}" data-id="${w.id}">${w.name}</option>`).join('');
                }
            }).catch(err => { console.warn('Could not load work types', err); });
    }

    function fetchEntries(opts) {
        opts = opts || {};
        const params = new URLSearchParams();
        const s = opts.start || (filterStart ? filterStart.value : '');
        const e = opts.end || (filterEnd ? filterEnd.value : '');
        if (s) params.append('start', s);
        if (e) params.append('end', e);
        const url = '/Work_logs/api/work_entries' + (params.toString() ? ('?' + params.toString()) : '');
        fetch(url)
            .then(r => {
                if (!r.ok) return r.text().then(t => { throw new Error('Server: ' + t); });
                return r.json()
            }).then(list => {
                tbody.innerHTML = '';
                list.forEach((e, idx) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                                                <td>${idx + 1}</td>
                                                <td>${e.date || ''}</td>
                                                <td>${e.work_type || ''}</td>
                                                <td>${e.module || ''}</td>
                                                <td>${e.project_name || ''}</td>
                                                <td>${e.duration ? `<span class="duration-badge">${e.duration}</span>` : ''}</td>
                                                <td class="truncate-cell" title="${(e.description || '').replace(/"/g, '&quot;')}">${(e.description || '').substring(0, 60)}${(e.description || '').length > 60 ? '...' : ''}</td>
                                                <td>${e.skills_learned || ''}</td>
                                                <td>${e.start_time || ''}</td>
                                                <td>${e.end_time || ''}</td>
                                                <td style="display:flex; gap:8px;">
                                                    <button class="action-btn edit-btn" onclick="editWorkEntry(${e.id})">Edit</button>
                                                    <button class="action-btn delete-btn" onclick="deleteWorkEntry(${e.id})">Delete</button>
                                                </td>
                                        `;
                    tbody.appendChild(tr);
                });
            }).catch(err => { console.error(err); alert('Error loading work entries: ' + (err.message || err)); });
    }

    // Inline add form submission
    if (inlineForm) {
        // set default and limits for inline date picker
        setInlineDateDefaults();
        // update duration when times change
        if (inlineStart) inlineStart.addEventListener('change', updateInlineDurationDisplay);
        if (inlineEnd) inlineEnd.addEventListener('change', updateInlineDurationDisplay);
        if (inlineType) inlineType.addEventListener('change', updateInlineModuleSelect);

        inlineForm.addEventListener('submit', function (e) {
            e.preventDefault();
            // validation: require date, work type, start and end times
            if (!inlineDate || !inlineDate.value) return alert('Date is required');
            if (!inlineType || !inlineType.value) return alert('Work Type is required');
            if (!inlineStart || !inlineStart.value || !inlineEnd || !inlineEnd.value) return alert('Start and End time are required');
            // ensure duration can be computed
            const inlineDuration = computeDurationMinutes(inlineStart.value, inlineEnd.value);
            if (inlineDuration === null) return alert('Invalid start/end times');
            const payload = {
                date: inlineDate.value,
                work_type: inlineType.value,
                module: (inlineModule && inlineModuleGroup && inlineModuleGroup.style.display !== 'none') ? (inlineModule.value || null) : null,
                description: inlineDesc.value,
                skills_learned: inlineSkills.value,
                start_time: inlineStart.value,
                end_time: inlineEnd.value,
                project_id: inlineProject ? (inlineProject.value || null) : null
            };
            fetch('/Work_logs/api/work_entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                .then(r => {
                    if (!r.ok) return r.json().then(x => { throw new Error(x.error || 'Create failed') });
                    return r.json();
                })
                .then(res => {
                    // clear form
                    inlineForm.reset();
                    if (inlineDurationDisplay) inlineDurationDisplay.textContent = '';
                    fetchEntries();
                }).catch(err => { alert('Error creating entry: ' + (err.message || err)); console.error(err); });
        });
    }

    // refresh work types when other modules change them
    window.addEventListener('worktypes:changed', function () { fetchWorkTypes(); });

    // Filter controls
    if (filterApply) filterApply.addEventListener('click', function () { fetchEntries(); });
    if (filterClear) filterClear.addEventListener('click', function () { if (filterStart) filterStart.value = ''; if (filterEnd) filterEnd.value = ''; fetchEntries(); });

    window.openModal = function (entry) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content work-entry">
                <h3>${entry ? 'Edit Work' : 'Add Work'}</h3>
                <form id="workEntryForm" class="form-modal">
                    <div class="form-group">
                        <label>Date</label>
                        <input type="date" name="date" id="we_date" value="${entry ? entry.date : ''}" required />
                    </div>
                                        <div class="form-group">
                                                <label>Work Type</label>
                                                <select name="work_type" id="we_type" required>
                                                    <option value="">-- Select Work Type --</option>
                                                </select>
                                        </div>
                                        <div class="form-group" id="we_module_group" style="display:none;">
                                                <label>Module</label>
                                                <select id="we_module">
                                                    <option value="">-- Select Module --</option>
                                                </select>
                                        </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="we_desc">${entry ? (entry.description || '') : ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Skills Learned</label>
                        <input type="text" id="we_skills" value="${entry ? (entry.skills_learned || '') : ''}" />
                    </div>
                    <div class="form-group">
                        <label>Project (optional)</label>
                        <select id="we_project">
                          <option value="">-- none --</option>
                        </select>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <div style="flex:1">
                            <label>Start Time</label>
                            <input type="time" id="we_start" value="${entry ? (entry.start_time || '') : ''}" />
                        </div>
                        <div style="flex:1">
                            <label>End Time</label>
                            <input type="time" id="we_end" value="${entry ? (entry.end_time || '') : ''}" />
                        </div>
                    </div>
                    <div style="margin-top:8px; font-weight:600;" id="modal_duration_display">${entry && entry.duration ? entry.duration : ''}</div>
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
                        <button type="submit" class="btn-primary save">Save</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        // populate project select from cached projectsList
        const weProject = modal.querySelector('#we_project');
        // populate work type select
        const weType = modal.querySelector('#we_type');
        if (weType) {
            weType.innerHTML = '<option value="">-- Select Work Type --</option>' + (workTypesList || []).map(w => `<option value="${w.name}" data-id="${w.id}">${w.name}</option>`).join('');
            if (entry && entry.work_type) try { weType.value = entry.work_type } catch (e) { }
        }
        if (weProject && projectsList.length) {
            (async function(){
                const op = await getCurrentOperator();
                const opDbId = op ? op.id : null;
                const opCode = op ? op.operator_id : null;
                function isAssigned(p){
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
                    } catch(e){}
                    return false;
                }
                const finalList = (op ? projectsList.filter(p => isAssigned(p)) : []);
                weProject.innerHTML = '<option value="">-- none --</option>' + (finalList || projectsList).map(p => `<option value="${p.id}">${p.project_name}</option>`).join('');
            })();
        }
        // set selected project if editing
        if (entry && entry.project_id && weProject) {
            try { weProject.value = entry.project_id } catch (e) { }
        }
        // module group handling
        const weModuleGroup = modal.querySelector('#we_module_group');
        const weModule = modal.querySelector('#we_module');
        function updateModalModuleSelect() {
            const opt = weType.selectedOptions[0];
            if (!opt) { if (weModuleGroup) weModuleGroup.style.display = 'none'; return; }
            const wtId = opt.dataset ? (opt.dataset.id ? parseInt(opt.dataset.id, 10) : null) : null;
            const wt = workTypesList.find(x => (wtId && x.id === wtId) || x.name === opt.value);
            if (wt && wt.modules && wt.modules.length > 0) {
                weModule.innerHTML = '<option value="">-- Select Module --</option>' + wt.modules.map(m => `<option value="${m}">${m}</option>`).join('');
                if (entry && entry.module) try { weModule.value = entry.module } catch (e) { }
                weModuleGroup.style.display = 'block';
            } else {
                weModuleGroup.style.display = 'none';
            }
        }
        if (weType) weType.addEventListener('change', updateModalModuleSelect);
        // initialize modal module select
        updateModalModuleSelect();
        // set modal date default and limits: max = today, min = today-3
        const weDate = modal.querySelector('#we_date');
        if (weDate) {
            const today = new Date();
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(today.getDate() - 3);
            const maxv = formatDateYYYYMMDD(today);
            const minv = formatDateYYYYMMDD(threeDaysAgo);
            weDate.max = maxv;
            weDate.min = minv;
            if (!weDate.value) weDate.value = maxv;
        }
        // wire modal time inputs to update duration display
        const modalStart = modal.querySelector('#we_start');
        const modalEnd = modal.querySelector('#we_end');
        const modalDuration = modal.querySelector('#modal_duration_display');
        function updateModalDuration() {
            const m = computeDurationMinutes(modalStart.value, modalEnd.value);
            modalDuration.textContent = m != null ? formatDurationFromMinutes(m) : '';
        }
        if (modalStart) modalStart.addEventListener('change', updateModalDuration);
        if (modalEnd) modalEnd.addEventListener('change', updateModalDuration);
        modal.querySelector('#cancelBtn').onclick = () => document.body.removeChild(modal);
        modal.querySelector('#workEntryForm').onsubmit = function (e) {
            e.preventDefault();
            // validation: require date, work type, start and end times in modal
            const modalDate = modal.querySelector('#we_date');
            const modalType = modal.querySelector('#we_type');
            const modalStartEl = modal.querySelector('#we_start');
            const modalEndEl = modal.querySelector('#we_end');
            if (!modalDate || !modalDate.value) return alert('Date is required');
            if (!modalType || !modalType.value) return alert('Work Type is required');
            if (!modalStartEl || !modalStartEl.value || !modalEndEl || !modalEndEl.value) return alert('Start and End time are required');
            const modalDur = computeDurationMinutes(modalStartEl.value, modalEndEl.value);
            if (modalDur === null) return alert('Invalid start/end times');
            const payload = {
                date: modal.querySelector('#we_date').value,
                work_type: modal.querySelector('#we_type').value,
                module: (modal.querySelector('#we_module') && modal.querySelector('#we_module_group') && modal.querySelector('#we_module_group').style.display !== 'none') ? (modal.querySelector('#we_module').value || null) : null,
                description: modal.querySelector('#we_desc').value,
                skills_learned: modal.querySelector('#we_skills').value,
                start_time: modal.querySelector('#we_start').value,
                end_time: modal.querySelector('#we_end').value,
                project_id: modal.querySelector('#we_project') ? (modal.querySelector('#we_project').value || null) : null
            };
            if (entry) {
                fetch(`/Work_logs/api/work_entries/${entry.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                    .then(r => { if (!r.ok) return r.text().then(t => { throw new Error('Server: ' + t) }); return r.json(); })
                    .then(res => { document.body.removeChild(modal); fetchEntries(); })
                    .catch(err => { alert('Error updating: ' + (err.message || err)); console.error(err); });
            } else {
                fetch('/Work_logs/api/work_entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                    .then(r => { if (!r.ok) return r.text().then(t => { throw new Error('Server: ' + t) }); return r.json(); })
                    .then(res => { document.body.removeChild(modal); fetchEntries(); })
                    .catch(err => { alert('Error creating: ' + (err.message || err)); console.error(err); });
            }
        };
    };

    window.editWorkEntry = function (id) {
        fetch(`/Work_logs/api/work_entries/${id}`).then(r => { if (!r.ok) return r.text().then(t => { throw new Error('Server: ' + t) }); return r.json(); }).then(entry => {
            openModal(entry);
        }).catch(err => { alert('Error loading entry: ' + (err.message || err)); console.error(err); });
    };

    window.deleteWorkEntry = function (id) {
        if (!confirm('Delete this entry?')) return;
        fetch(`/Work_logs/api/work_entries/${id}`, { method: 'DELETE' })
            .then(r => { if (!r.ok) return r.text().then(t => { throw new Error('Server: ' + t) }); return r.json(); })
            .then(res => { fetchEntries(); })
            .catch(err => { alert('Error deleting: ' + (err.message || err)); console.error(err); });
    };

    fetchProjects();
    fetchWorkTypes();
    fetchEntries();
});
