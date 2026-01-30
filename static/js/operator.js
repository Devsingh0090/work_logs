// =============================================================================
// OPERATORS MASTER FUNCTIONS
// =============================================================================
let currentEditingId = null;
let currentEditingType = null;

function loadOperators() {
    fetch('/Work_logs/api/operators')
        .then(res => res.json())
        .then(operators => {
            populateOperatorsTable(operators);
        })
        .catch(err => {
            console.error('Error loading operators:', err);
            showMessage('Error loading operators', 'error');
        });
}

function populateOperatorsTable(operators) {
    const tbody = document.getElementById('operatorsTableBody');
    tbody.innerHTML = '';
    // Show message when no operators are available
    if (operators.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="11" style="text-align:center">No operators found.</td>`;
        tbody.appendChild(row);
        return;
    }
    let visibleIdx = 0;
    operators.forEach((operator, idx) => {
        // Skip deleted operators in display
        if (operator.operation === 'delete') {
            return;
        }
        let displayRole = operator.role === 'Staff' ? 'Operator' : operator.role;
        let roleClass = `role-${displayRole.toLowerCase()}`;
        const allowedRoles = ['admin', 'operator', 'manager'];
        if (!allowedRoles.includes(displayRole.toLowerCase())) {
            roleClass = 'role-other';
        }
        // Format date/time
        let dateTime = '-';
        if (operator.created_at) {
            try {
                let dt = operator.created_at;
                if (typeof dt === 'string') {
                    dt = dt.replace('T', ' ').replace(/\..*$/, '').replace('Z', '');
                }
                dateTime = dt;
            } catch (e) {
                dateTime = operator.created_at;
            }
        }
        const loggedUser = operator.logged_user || '-';
        let operationDisplay = '';
        if (operator.operation === 'Add') {
            operationDisplay = 'Added';
        } else if (operator.operation === 'Update') {
            operationDisplay = 'Updated';
        } else if (operator.operation === 'delete') {
            operationDisplay = 'Deleted';
        } else {
            operationDisplay = operator.operation || '';
        }
        visibleIdx++;
        const row = document.createElement('tr');
        const joiningDateDisplay = operator.joining_date ? (operator.joining_date.split ? operator.joining_date.split('T')[0] : operator.joining_date) : '-';
        const skillsDisplay = operator.skills ? operator.skills : '-';
        row.innerHTML = `
                <td>${visibleIdx}</td>
                <td>${operator.operator_id}</td>
                <td>${operator.name}</td>
                <td>${operator.email}</td>
                <td>${joiningDateDisplay}</td>
                <td>${skillsDisplay}</td>
                <td><span class="badge ${roleClass}">${displayRole}</span></td>
                <td>${dateTime}</td>
                <td>${loggedUser}</td>
                <td>${operationDisplay}</td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button class="action-btn edit-btn chemical-action-btn" onclick="editOperator(${operator.id})" title="Edit"><i class="fas fa-pencil-alt"></i> Edit</button>
                        <button class="action-btn delete-btn chemical-action-btn" onclick="deleteOperator(${operator.id})" title="Delete"><i class="fas fa-trash-alt"></i> Delete</button>
                    </div>
                </td>
            `;
        tbody.appendChild(row);
        // End of foreach loop
    });
}

function addOperator() {
    const form = document.getElementById('operatorForm');
    const formData = new FormData(form);
    const operatorData = {
        operator_id: formData.get('operator_id'),
        name: formData.get('name'),
        email: formData.get('email'),
        joining_date: formData.get('joining_date'),
        skills: formData.get('skills'),
        password: formData.get('password'),
        role: formData.get('role'),
        operation: 'Add'
    };
    fetch('/Work_logs/api/operators', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(operatorData)
    })
        .then(res => res.json())
        .then(data => {
            // Always show message in operator section
            showSection('operators');
            setTimeout(() => {
                if (data.error) {
                    showMessage(data.error, 'error');
                } else {
                    showMessage('Operator added successfully!', 'success');
                    clearOperatorForm();
                    // refreshAllMasterDataAndRender();
                    loadOperators();
                }
            }, 100);
        })
        .catch(err => {
            showSection('operators');
            setTimeout(() => {
                console.error('Error adding operator:', err);
                showMessage('Error adding operator', 'error');
            }, 100);
        });
}

// Modal logic for Operator Edit
let currentEditingOperatorId = null;

function openOperatorEditModal(operator) {
    document.getElementById('edit_operator_role').value = operator.role;
    document.getElementById('edit_operator_id').value = operator.operator_id;
    document.getElementById('edit_operator_name').value = operator.name;
    document.getElementById('edit_operator_email').value = operator.email;
    document.getElementById('edit_operator_joining_date').value = operator.joining_date ? (operator.joining_date.split ? operator.joining_date.split('T')[0] : operator.joining_date) : '';
    document.getElementById('edit_operator_skills').value = operator.skills || '';
    document.getElementById('edit_operator_password').value = '';
    document.getElementById('edit_operator_password').placeholder = 'Leave blank to keep current password';
    currentEditingOperatorId = operator.id;
    document.getElementById('operatorEditModal').style.display = 'flex';
}

function closeOperatorEditModal() {
    document.getElementById('operatorEditModal').style.display = 'none';
    currentEditingOperatorId = null;
}

document.getElementById('operatorEditForm').onsubmit = function (e) {
    e.preventDefault();
    if (!currentEditingOperatorId) return;
    const role = document.getElementById('edit_operator_role').value;
    const operator_id = document.getElementById('edit_operator_id').value;
    const name = document.getElementById('edit_operator_name').value;
    const email = document.getElementById('edit_operator_email').value;
    const password = document.getElementById('edit_operator_password').value;
    const data = { role, operator_id, name, email, operation: 'Update' };
    const editJoiningDate = document.getElementById('edit_operator_joining_date').value;
    const editSkills = document.getElementById('edit_operator_skills').value;
    if (editJoiningDate) data.joining_date = editJoiningDate;
    if (editSkills) data.skills = editSkills;
    if (password) data.password = password;
    fetch(`/Work_logs/api/operators/${currentEditingOperatorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(result => {
            if (result.error) {
                alert('Error: ' + result.error);
            } else {
                alert('Operator updated successfully!');
                closeOperatorEditModal();
                // refreshAllMasterDataAndRender();
                loadOperators();
            }
        })
        .catch(err => {
            alert('Error updating operator');
            closeOperatorEditModal();
        });
};

// Patch editOperator to use modal
function editOperator(id) {
    fetch(`/Work_logs/api/operators/${id}`)
        .then(res => res.json())
        .then(operator => {
            openOperatorEditModal(operator);
        })
        .catch(err => {
            console.error('Error loading operator:', err);
            showMessage('Error loading operator', 'error');
        });
}

function updateOperator(id) {
    const form = document.getElementById('operatorForm');
    const formData = new FormData(form);
    const operatorData = {
        operator_id: formData.get('operator_id'),
        name: formData.get('name'),
        email: formData.get('email'),
        joining_date: formData.get('joining_date'),
        skills: formData.get('skills'),
        role: formData.get('role'),
        operation: 'Update'
    };
    const password = formData.get('password');
    if (password) {
        operatorData.password = password;
    }
    fetch(`/Work_logs/api/operators/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(operatorData)
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert('Error: ' + data.error);
            } else {
                alert('User updated successfully!');
                clearOperatorForm();
                // refreshAllMasterDataAndRender();
                loadOperators();
            }
        })
        .catch(err => {
            console.error('Error updating user:', err);
            alert('Error updating user');
        });
}

function deleteOperator(id) {
    if (confirm('Are you sure you want to delete this operator?')) {
        fetch(`/Work_logs/api/operators/${id}`, {
            method: 'DELETE'
        })
            .then(res => res.json())
            .then(data => {
                showSection('operators');
                if (data && data.error) {
                    showExcelStatus('error', data.error, 'operators');
                } else {
                    alert('Operator deleted successfully!');
                }
                setTimeout(() => {
                    loadOperators();
                }, 100);
            })
            .catch(err => {
                showSection('operators');
                showExcelStatus('error', 'Error deleting operator', 'operators');
                setTimeout(() => {
                    console.error('Error deleting user:', err);
                    loadOperators();
                }, 100);
            });
    }
}

function clearOperatorForm() {
    const form = document.getElementById('operatorForm');
    form.reset();
    currentEditingId = null;
    currentEditingType = null;
    // Clear Operator ID existence message
    const msgDiv = document.getElementById('operatorIdExistsMsg');
    if (msgDiv) {
        msgDiv.textContent = '';
        msgDiv.style.color = '';
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Add';
    document.getElementById('operator_password').placeholder = 'Enter password';
}
const operatorForm = document.getElementById('operatorForm');
if (operatorForm) {
    // Event listener will be added at the end of this function
}
// Real-time Operator ID existence check
const operatorIdInput = document.getElementById('operator_id');
if (operatorIdInput) {
    let msgDiv = document.getElementById('operatorIdExistsMsg');
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'operatorIdExistsMsg';
        msgDiv.style.marginTop = '4px';
        msgDiv.style.fontSize = '0.98em';
        msgDiv.style.fontWeight = '500';
        operatorIdInput.parentNode.appendChild(msgDiv);
    }
    operatorIdInput.addEventListener('input', function () {
        const code = operatorIdInput.value.trim();
        if (code.length < 3) {
            msgDiv.textContent = '';
            msgDiv.style.color = '';
            return;
        }
        fetch(`/Work_logs/api/operators`)
            .then(res => res.json())
            .then(operators => {
                const exists = operators.some(op => op.operator_id && op.operator_id.toLowerCase() === code.toLowerCase());
                if (exists) {
                    msgDiv.textContent = 'Operator ID already exists';
                    msgDiv.style.color = '#c62828';
                } else {
                    msgDiv.textContent = 'Operator ID available';
                    msgDiv.style.color = '#388e3c';
                }
            })
            .catch(() => {
                msgDiv.textContent = '';
                msgDiv.style.color = '';
            });
    });
}
operatorForm.addEventListener('submit', function (e) {
    e.preventDefault();
    currentEditingId && currentEditingType === 'operator'
        ? updateOperator(currentEditingId)
        : addOperator();
    // Clear Operator ID existence message after add
    const msgDiv = document.getElementById('operatorIdExistsMsg');
    if (msgDiv) {
        msgDiv.textContent = '';
        msgDiv.style.color = '';
    }
});

function downloadOperatorsExcel() {
    window.open('/Work_logs/api/operators/download-excel', '_blank');
}

function uploadOperatorsExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    showExcelStatus('info', 'Uploading Operators Excel file...', 'operators');

    fetch('/Work_logs/api/operators/upload-excel', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                let errorMsg = data.error;
                if (errorMsg.includes('1062') && errorMsg.includes('Duplicate entry')) {
                    errorMsg = 'Operator ID already exists. Please use a unique Operator ID.';
                }
                showExcelStatus('error', errorMsg, 'operators');
                alert('Upload error: ' + errorMsg);
            } else {
                // Remove any previous status message instantly
                const statusDiv = document.querySelector('#operators-section .excel-status');
                if (statusDiv) statusDiv.remove();

                // Build success message like Courts/Games
                let successMsg = 'Upload successful! ';
                if (typeof data.added !== 'undefined' && typeof data.updated !== 'undefined') {
                    successMsg += `Excel upload completed. Added: ${data.added}, Updated: ${data.updated}`;
                } else if (data.message) {
                    successMsg += data.message;
                } else {
                    successMsg += 'Operators updated.';
                }
                alert(successMsg);

                // Row-level errors (first 5 + count)
                if (data.errors && data.errors.length > 0) {
                    const shownErrors = data.errors.slice(0, 5).join('\n');
                    const moreCount = data.errors.length - 5;
                    let errMsg = 'Some rows had errors:\n' + shownErrors;
                    if (moreCount > 0) errMsg += `\n...and ${moreCount} more.`;
                    alert(errMsg);
                }

                loadOperators(); // Refresh the table
            }
        })
        .catch(error => {
            showExcelStatus('error', 'Upload failed: ' + error.message, 'operators');
            alert('Upload failed: ' + error.message);
        });

    // Clear the file input
    event.target.value = '';
}

// Template download function
function downloadTemplate(templateName) {
    window.open(`/Work_logs/api/templates/${templateName}`, '_blank');
}

function togglePasswordVisibility(passwordFieldId, toggleElementId) {
    const passwordField = document.getElementById(passwordFieldId);
    const toggleElement = document.getElementById(toggleElementId);
    const eyeIcon = toggleElement.querySelector('svg');

    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        // Change to eye-off icon
        eyeIcon.innerHTML = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><path d="M2.85 2.85l18.3 18.3"/>';
    } else {
        passwordField.type = 'password';
        // Change back to eye icon
        eyeIcon.innerHTML = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>';
    }
}

function showSection(section) {
    // Clear all messages when switching sections
    clearAllMessages();

    const sections = ['games', 'spots', 'rental_items', 'operators', 'transactions', 'gst', 'items_master'];
    sections.forEach(s => {
        const sectionElement = document.getElementById(`${s}-section`);
        if (sectionElement) {
            sectionElement.style.display = (s === section) ? 'block' : 'none';
        }
    });

    // Update active button
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === section) {
            btn.classList.add('active');
        }
    });
    // Load appropriate data

    function clearAllMessages() {
        const messageIds = [
            'gameMessage',
            'courtMessage',
            'itemMessage',
            'operatorMessage',
            'gamesGstMessage',
            'itemsGstMessage',
            'gst-error-msg',
            'gst-error-msg-games',
            'globalMessage',
            'itemNameMessage'
        ];

        messageIds.forEach(id => {
            const msgDiv = document.getElementById(id);
            if (msgDiv) {
                msgDiv.style.display = 'none';
                msgDiv.style.opacity = '0';
                msgDiv.textContent = '';
            }
        });
    }


    // Patch showSection to also load summary for transactions
    const origShowSection = window.showSection;
    window.showSection = function (section) {
        origShowSection(section);
        if (section === 'transactions') {
            loadTransactionsSummary();
        }
    };
}

function showMessage(message, type = 'success') {
    // Map of section to message div id
    const sectionMessageMap = {
        'games-section': 'gameMessage',
        'spots-section': 'courtMessage',
        'rental_items-section': 'itemMessage',
        'operators-section': 'operatorMessage',
        'gst-section': 'gamesGstMessage',
        // For items GST, handled below
    };

    // Find the visible section
    // Patch: Always use operatorMessage if operators-section is visible or just activated
    let msgDivId = null;
    const operatorsSection = document.getElementById('operators-section');
    if (operatorsSection && operatorsSection.style.display !== 'none') {
        msgDivId = 'operatorMessage';
    } else {
        const visibleSection = document.querySelector('.section:not([style*="display: none"])');
        if (visibleSection) {
            msgDivId = sectionMessageMap[visibleSection.id];
            // Special case for GST tabs
            if (visibleSection.id === 'gst-section') {
                const itemsGstTab = document.getElementById('gstItemsContent');
                if (itemsGstTab && itemsGstTab.style.display !== 'none') {
                    msgDivId = 'itemsGstMessage';
                }
            }
        }
    }
    // Custom: Show GST error above Add GST button in Games GST tab
    if (type === 'error' && document.getElementById('gst-section')?.style.display !== 'none') {
        // Only show for Games GST errors
        const gamesGstErrorDiv = document.getElementById('gst-error-msg-games');
        if (gamesGstErrorDiv) {
            // Show only the short message
            let shortMsg = message;
            if (shortMsg.includes('GST entry for this game already exists')) {
                shortMsg = 'GST entry for this game already exists';
            }
            gamesGstErrorDiv.textContent = shortMsg;
            gamesGstErrorDiv.style.display = 'block';
            gamesGstErrorDiv.style.background = '#ffebee';
            gamesGstErrorDiv.style.color = '#c62828';
            gamesGstErrorDiv.style.border = '1.5px solid #c62828';
            gamesGstErrorDiv.style.padding = '12px 24px';
            gamesGstErrorDiv.style.borderRadius = '7px';
            gamesGstErrorDiv.style.fontSize = '1.13em';
            gamesGstErrorDiv.style.fontWeight = '500';
            gamesGstErrorDiv.style.textAlign = 'center';
            gamesGstErrorDiv.style.margin = '8px auto 0 auto';
            setTimeout(() => {
                gamesGstErrorDiv.style.opacity = '1';
            }, 10);
            setTimeout(() => {
                gamesGstErrorDiv.style.opacity = '0';
                setTimeout(() => { gamesGstErrorDiv.style.display = 'none'; }, 300);
            }, 4000);
            return;
        }
    }
    // ...existing code...
    if (msgDivId) {
        const msgDiv = document.getElementById(msgDivId);
        if (msgDiv) {
            msgDiv.textContent = message;
            msgDiv.style.display = 'block';
            msgDiv.className = type === 'error' ? 'gst-error-msg' : 'message success';
            msgDiv.style.opacity = '1';

            // Auto-remove messages for all sections
            const autoRemoveDelay = type === 'error' ? 4000 : 3000; // Error messages stay longer
            setTimeout(() => {
                msgDiv.style.opacity = '0';
                setTimeout(() => {
                    msgDiv.style.display = 'none';
                    msgDiv.textContent = ''; // Clear text content
                }, 300);
            }, autoRemoveDelay);

            return;
        }
    }
    // GST error message fallback
    if (document.getElementById('gst-error-msg')) {
        const gstErrDiv = document.getElementById('gst-error-msg');
        gstErrDiv.textContent = message;
        gstErrDiv.style.display = 'block';
        gstErrDiv.className = type === 'error' ? 'gst-error-msg' : 'message success';
        gstErrDiv.style.opacity = '1';

        // Auto-remove GST messages
        const autoRemoveDelay = type === 'error' ? 4000 : 3000;
        setTimeout(() => {
            gstErrDiv.style.opacity = '0';
            setTimeout(() => {
                gstErrDiv.style.display = 'none';
                gstErrDiv.textContent = ''; // Clear text content
            }, 300);
        }, autoRemoveDelay);

        return;
    }

    // Fallback: Use the global message area
    const globalMessage = document.getElementById('globalMessage');
    if (!globalMessage) return;
    globalMessage.textContent = message;
    globalMessage.className = '';
    globalMessage.style.display = 'block';
    globalMessage.style.opacity = '0';
    globalMessage.style.transition = 'all 0.3s ease';
    globalMessage.style.background = type === 'error' ? '#ffebee' : '#e3f2fd';
    globalMessage.style.color = type === 'error' ? '#c62828' : '#1976d2';
    globalMessage.style.border = type === 'error' ? '1.5px solid #c62828' : 'none';
    setTimeout(() => {
        globalMessage.style.opacity = '1';
        globalMessage.style.transform = 'translateY(0)';
    }, 10);
    setTimeout(() => {
        globalMessage.style.opacity = '0';
        globalMessage.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            globalMessage.style.display = 'none';
            globalMessage.textContent = '';
            globalMessage.style.transform = 'translateY(0)';
        }, 300);
    }, 4000);
}

function refreshAllMasterDataAndRender() {
    fetch('/Work_logs/api/all-data')
        .then(res => res.json())
        .then(data => {
            window.masterData = data;
            // Find the active section using data-section
            const activeSectionBtn = document.querySelector('.nav-btn.active');
            const section = activeSectionBtn ? activeSectionBtn.dataset.section : null;
            if (section === 'games') {
                populateGamesTable(window.masterData.games || []);
            } else if (section === 'spots') {
                populateSpotsTable(window.masterData.spots || []);
            } else if (section === 'rental_items') {
                populateRentalItemsTable(window.masterData.rental_items || []);
            } else if (section === 'operators') {
                populateOperatorsTable(window.masterData.operators || []);
            }
        });
}

function showExcelStatus(type, message, section) {
    // Remove any existing status messages for this section
    const existingStatus = document.querySelector(`#${section}-section .excel-status`);
    if (existingStatus) {
        existingStatus.remove();
    }

    // Create new status message
    const statusDiv = document.createElement('div');
    statusDiv.className = `excel-status ${type}`;
    statusDiv.textContent = message;

    // Insert the status message at the top of the section
    const sectionElement = document.getElementById(`${section}-section`);
    if (sectionElement) {
        sectionElement.insertBefore(statusDiv, sectionElement.children[1]);

        // Auto-remove all messages (success/info/error) after 5 seconds
        if (type === 'success' || type === 'info' || type === 'error') {
            setTimeout(() => {
                if (statusDiv.parentNode) {
                    statusDiv.remove();
                }
            }, 5000);
        }
    }
}
// -------------------- Role management functions --------------------
function getAvailablePages() {
    return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'admin_dashboard', label: 'Admin Dashboard' },
        { id: 'users', label: 'Users' },
        { id: 'company_details', label: 'Company Details' },
        { id: 'projects', label: 'Projects' },
        { id: 'work_entries', label: 'Work Entries' },
        { id: 'reports', label: 'Reports' },
        { id: 'issues', label: 'Issues' },
        { id: 'holidays', label: 'Holidays' },
        { id: 'tea_coffee', label: 'Tea/Coffee' },
        { id: 'meetings', label: 'Meetings' },
        { id: 'company_expense', label: 'Expenses' }
    ];
}

function renderRolePermissionsCheckboxes(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const pages = getAvailablePages();
    pages.forEach(p => {
        const wrapper = document.createElement('label');
        wrapper.className = 'role-perm-label';
        wrapper.innerHTML = `<input class="role-perm-checkbox" type="checkbox" name="permission_checkbox" value="${p.id}"> <span class="role-perm-label-text">${p.label}</span>`;
        container.appendChild(wrapper);
        // ensure change updates select-all state
        const cb = wrapper.querySelector('input[type="checkbox"]');
        if (cb) {
            cb.addEventListener('change', () => updateSelectAllState());
        }
    });
    // wire select all checkbox
    const selectAll = document.getElementById('roleSelectAll');
    if (selectAll) {
        selectAll.checked = false;
        selectAll.removeEventListener && selectAll.removeEventListener('change', selectAll._handler);
        selectAll._handler = function () { toggleSelectAllPermissions(this.checked); };
        selectAll.addEventListener('change', selectAll._handler);
    }
}

function toggleSelectAllPermissions(checked) {
    const boxes = document.querySelectorAll('#rolePermissionsList input[type=checkbox]');
    boxes.forEach(b => b.checked = checked);
}

function updateSelectAllState() {
    const boxes = Array.from(document.querySelectorAll('#rolePermissionsList input[type=checkbox]'));
    if (boxes.length === 0) return;
    const allChecked = boxes.every(b => b.checked);
    const selectAll = document.getElementById('roleSelectAll');
    if (selectAll) selectAll.checked = allChecked;
}

function loadRoles() {
    fetch('/Work_logs/api/roles')
        .then(res => res.json())
        .then(roles => {
            const arr = roles || [];
            populateRolesTable(arr);
            populateRoleSelects(arr);
        })
        .catch(err => console.error('Error loading roles:', err));
}

function populateRoleSelects(roles) {
    // roles: array of {id, name, permissions}
    const addSelect = document.getElementById('operator_role');
    const editSelect = document.getElementById('edit_operator_role');
    if (!addSelect && !editSelect) return;
    const optionsHtml = ['<option value="">-- Select role --</option>'];
    (roles || []).forEach(r => {
        const safeName = r.name || '';
        optionsHtml.push(`<option value="${safeName}">${safeName}</option>`);
    });
    if (addSelect) addSelect.innerHTML = optionsHtml.join('');
    if (editSelect) editSelect.innerHTML = optionsHtml.join('');
}

function populateRolesTable(roles) {
    const tbody = document.getElementById('rolesTableBody');
    tbody.innerHTML = '';
    if (!roles || roles.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4" style="text-align:center">No roles defined.</td>';
        tbody.appendChild(tr);
        return;
    }
    roles.forEach((role, idx) => {
        const perms = (role.permissions || []).map(p => `<span class="small-badge">${p}</span>`).join(' ');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${role.name}</td>
            <td>${perms}</td>
            <td>
                <div style="display:flex;gap:8px;">
                    <button class="action-btn edit-btn" onclick="editRole(${role.id})">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteRole(${role.id})">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function clearRoleForm() {
    const form = document.getElementById('roleForm');
    if (!form) return;
    form.reset();
    // Uncheck checkboxes
    const boxes = document.querySelectorAll('#rolePermissionsList input[type=checkbox]');
    boxes.forEach(b => b.checked = false);
    const selectAll = document.getElementById('roleSelectAll');
    if (selectAll) selectAll.checked = false;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Add Role';
    form.dataset.editing = '';
}

function addRole() {
    const name = document.getElementById('role_name').value.trim();
    if (!name) return alert('Role name is required');
    const boxes = document.querySelectorAll('#rolePermissionsList input[type=checkbox]:checked');
    const permissions = Array.from(boxes).map(b => b.value);
    fetch('/Work_logs/api/roles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, permissions })
    }).then(res => res.json())
        .then(data => {
            if (data.error) return alert('Error: ' + data.error);
            clearRoleForm();
            loadRoles();
            showMessage('Role created', 'success');
        }).catch(err => { console.error(err); alert('Error creating role'); });
}

function editRole(id) {
    fetch(`/Work_logs/api/roles/${id}`).then(r => r.json()).then(role => {
        if (!role) return alert('Role not found');
        document.getElementById('role_name').value = role.name;
        const boxes = document.querySelectorAll('#rolePermissionsList input[type=checkbox]');
        boxes.forEach(b => b.checked = (role.permissions || []).includes(b.value));
        // update select all state after setting boxes
        setTimeout(() => updateSelectAllState(), 10);
        // clear any user_type references (field removed)
        const form = document.getElementById('roleForm');
        if (form) {
            form.dataset.editing = id;
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Save Changes';
        }
    }).catch(err => { console.error(err); alert('Error loading role'); });
}

function updateRole(id) {
    const name = document.getElementById('role_name').value.trim();
    if (!name) return alert('Role name is required');
    const boxes = document.querySelectorAll('#rolePermissionsList input[type=checkbox]:checked');
    const permissions = Array.from(boxes).map(b => b.value);
    fetch(`/Work_logs/api/roles/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, permissions }) })
        .then(r => r.json()).then(data => {
            if (data.error) return alert('Error: ' + data.error);
            clearRoleForm();
            loadRoles();
            showMessage('Role updated', 'success');
        }).catch(err => { console.error(err); alert('Error updating role'); });
}

function deleteRole(id) {
    if (!confirm('Delete this role?')) return;
    fetch(`/Work_logs/api/roles/${id}`, { method: 'DELETE' })
        .then(r => r.json()).then(data => {
            if (data.error) return alert('Error: ' + data.error);
            loadRoles();
            showMessage('Role deleted', 'success');
        }).catch(err => { console.error(err); alert('Error deleting role'); });
}
document.addEventListener('DOMContentLoaded', () => {
    // Now main.js is loaded, safe to call:
    // refreshAllMasterDataAndRender();
    loadOperators();

    // Tab switching logic
    const tabDataEntry = document.getElementById('tabDataEntry');
    const tabInventoryView = document.getElementById('tabInventoryView');
    const dataEntryTab = document.getElementById('dataEntryTab');
    const inventoryViewTab = document.getElementById('inventoryViewTab');

    if (tabDataEntry && tabInventoryView && dataEntryTab && inventoryViewTab) {
        tabDataEntry.onclick = function () {
            tabDataEntry.classList.add('active');
            tabInventoryView.classList.remove('active');
            // Ensure Role Access tab is deactivated when switching
            const tabRoleAccess = document.getElementById('tabRoleAccess');
            const roleAccessTab = document.getElementById('roleAccessTab');
            if (tabRoleAccess && roleAccessTab) {
                tabRoleAccess.classList.remove('active');
                roleAccessTab.style.display = 'none';
            }
            dataEntryTab.style.display = 'block';
            inventoryViewTab.style.display = 'none';
        };

        tabInventoryView.onclick = function () {
            tabInventoryView.classList.add('active');
            tabDataEntry.classList.remove('active');
            // Ensure Role Access tab is deactivated when switching
            const tabRoleAccess = document.getElementById('tabRoleAccess');
            const roleAccessTab = document.getElementById('roleAccessTab');
            if (tabRoleAccess && roleAccessTab) {
                tabRoleAccess.classList.remove('active');
                roleAccessTab.style.display = 'none';
            }
            dataEntryTab.style.display = 'none';
            inventoryViewTab.style.display = 'block';
        };
        // Role Access tab wiring
        const tabRoleAccess = document.getElementById('tabRoleAccess');
        const roleAccessTab = document.getElementById('roleAccessTab');
        if (tabRoleAccess && roleAccessTab) {
            tabRoleAccess.onclick = function () {
                // remove active from others
                tabRoleAccess.classList.add('active');
                tabDataEntry.classList.remove('active');
                tabInventoryView.classList.remove('active');
                dataEntryTab.style.display = 'none';
                inventoryViewTab.style.display = 'none';
                roleAccessTab.style.display = 'block';
                // render checkboxes and load roles
                renderRolePermissionsCheckboxes('rolePermissionsList');
                loadRoles();
            };
        }
    }

    // Search functionality
    const operatorFilterInput = document.getElementById('operatorFilterInput');
    if (operatorFilterInput) {
        operatorFilterInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            const tableRows = document.querySelectorAll('#operatorsTableBody tr');

            tableRows.forEach(row => {
                const cells = row.getElementsByTagName('td');
                let found = false;

                // Search in User ID (column 1) and Name (column 2)
                if (cells.length > 2) {
                    const userId = cells[1].textContent.toLowerCase();
                    const userName = cells[2].textContent.toLowerCase();

                    if (userId.includes(searchTerm) || userName.includes(searchTerm)) {
                        found = true;
                    }
                }

                row.style.display = found ? '' : 'none';
            });
        });
    }
    // Role form submit
    const roleForm = document.getElementById('roleForm');
    if (roleForm) {
        roleForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const editing = roleForm.dataset.editing;
            if (editing && editing.length) {
                updateRole(editing);
            } else {
                addRole();
            }
        });
    }
    // Pre-render role permissions checkboxes so they're ready
    renderRolePermissionsCheckboxes('rolePermissionsList');
    // Load roles on page load so Add/Edit role selects are populated
    loadRoles();
});
