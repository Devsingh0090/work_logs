document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('companyForm');
    const tableBody = document.querySelector('#companyTable tbody');
    const formMessage = document.getElementById('companyMessage') || document.getElementById('formMessage');

    function fetchCompanies() {
        fetch('/Work_logs/api/companies')
            .then(res => res.json())
            .then(data => {
                tableBody.innerHTML = '';
                // Filter out deleted companies
                const activeCompanies = data.filter(company => company.operation !== 'delete');
                activeCompanies.forEach(company => addCompanyRow(company));
                // Set S. No. after all rows are added
                Array.from(tableBody.children).forEach((row, idx) => {
                    row.children[0].textContent = idx + 1;
                });

                // Show "No companies found" if there are none
                if (activeCompanies.length === 0) {
                    const noDataRow = document.createElement('tr');
                    noDataRow.innerHTML = '<td colspan="13" style="text-align:center">No companies found</td>';
                    tableBody.appendChild(noDataRow);
                }
            });
    }

    function addCompanyRow(company) {
        const row = document.createElement('tr');
        const isDeleted = company.operation && company.operation.toLowerCase() === 'delete';

        if (isDeleted) {
            row.style.opacity = '0.5';
            row.style.pointerEvents = 'none';
            row.style.background = '#f8d7da';
        }

        row.innerHTML = `
                        <td></td> <!-- S. No. will be set after row is added -->
                        <td>${company.id}</td>
                        <td>${company.company_name}</td>
                        <td>${company.address || ''}</td>
                        <td>${company.contact_no || ''}</td>
                        <td>${company.email || ''}</td>
                        <td>${company.web_url || ''}</td>
                        <td>${company.city || ''}</td>
                        <td>${company.state || ''}</td>
                        <td>${company.logged_user || ''}</td>
                        <td>${company.datetime || ''}</td>
                        <td>${company.operation || ''}</td>
                        <td style="display:flex; gap:8px;">
                            ${isDeleted
                ? '<span style="color:#c62828;font-weight:bold;">Deleted</span>'
                : `<button class="edit-btn" style="background:#2196F3; color:#fff; border:none; border-radius:8px; font-size:1em; font-weight:600; padding:7px 16px; display:flex; align-items:center; gap:6px; cursor:pointer; box-shadow:0 1px 4px rgba(33,150,243,0.08);">
                                    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='white' viewBox='0 0 16 16' style='margin-right:5px;'><path d='M15.502 1.94a.5.5 0 0 1 0 .706l-1.439 1.439-2.121-2.122 1.439-1.439a.5.5 0 0 1 .707 0l1.414 1.415zm-2.561 2.561-2.122-2.122-8.486 8.486a.5.5 0 0 0-.121.196l-1 3a.5.5 0 0 0 .636.636l3-1a.5.5 0 0 0 .196-.12l8.486-8.486z'/></svg>
                                    Edit
                                </button>
                                <button class="delete-btn" style="background:#F44336; color:#fff; border:none; border-radius:8px; font-size:1em; font-weight:600; padding:7px 16px; display:flex; align-items:center; gap:6px; cursor:pointer; box-shadow:0 1px 4px rgba(244,67,54,0.08);">
                                    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='white' viewBox='0 0 16 16' style='margin-right:5px;'><path d='M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5.5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6zm3 .5a.5.5 0 0 1 .5-.5.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6zm-7-1A.5.5 0 0 1 4.5 5h7a.5.5 0 0 1 .5.5v7a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-7zM2.5 3a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5V4h-11V3zm3.5-1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1h-4V2z'/></svg>
                                    Delete
                                </button>`
            }
                        </td>
                `;
        const editBtn = row.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.onclick = function () {
                openEditModal(company);
            };
        }
        const deleteBtn = row.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.onclick = function () {
                if (confirm('Delete this company?')) {
                    fetch(`/Work_logs/api/companies/${company.id}`, { method: 'DELETE' })
                        .then(res => {
                            if (!res.ok) {
                                return res.json().then(err => {
                                    console.error('Error deleting company:', err);
                                    alert('Failed to delete company. Please try again.');
                                    throw new Error('Failed to delete company');
                                });
                            }
                            return res.json();
                        })
                        .then(() => fetchCompanies())
                        .catch(err => console.error('Delete error:', err));
                }
            };
        }
        tableBody.appendChild(row);
    }

    form.onsubmit = function (e) {
        e.preventDefault();
        const formData = Object.fromEntries(new FormData(form).entries());
        formData.contact_no = formData.contact_no || document.getElementById('contact_no')?.value || '';
        formData.email = formData.email || document.getElementById('email')?.value || '';
        formData.web_url = formData.web_url || document.getElementById('web_url')?.value || '';
        const requiredFields = ['company_name', 'address', 'city', 'state', 'contact_no', 'email', 'web_url'];
        const missing = requiredFields.filter(f => !(formData[f] && formData[f].trim()));
        if (missing.length > 0) {
            alert('Please fill all required fields.');
            form[missing[0]].focus();
            return;
        }
        // Duplicate Client Name check
        const enteredName = (formData.company_name || '').trim().toLowerCase();
        const rows = Array.from(document.querySelectorAll('#companyTable tbody tr'));
        const duplicate = rows.some(row => {
            const nameCell = row.children[2];
            return nameCell && nameCell.textContent.trim().toLowerCase() === enteredName;
        });
        if (duplicate) {
            alert('Client Name already exists.');
            form.company_name.focus();
            return;
        }
        // Email validation
        const email = (formData.email || '').trim();
        if (email && !/^([a-zA-Z0-9_\-.]+)@([a-zA-Z0-9_\-.]+)\.([a-zA-Z]{2,})$/.test(email)) {
            alert('Please enter a valid Email ID.');
            form.email.focus();
            return;
        }
        // URL validation
        const webUrl = (formData.web_url || '').trim();
        if (webUrl) {
            try {
                new URL(webUrl);
            } catch (err) {
                alert('Please enter a valid Website / URL.');
                form.web_url.focus();
                return;
            }
        }
        fetch('/Work_logs/api/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
            .then(data => {
                alert('Client added successfully!');
                form.reset();
                fetchCompanies();
            })
            .catch(() => {
                alert('Error adding company.');
            });
    };

    function openEditModal(company) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h3>Edit Client</h3>
                <form id="editCompanyForm">
                    <div style="display: flex; gap: 16px; margin-bottom: 12px;">
                        <div style="flex:1; display:flex; flex-direction:column;">
                            <label>Client Name</label>
                            <input type="text" name="company_name" value="${company.company_name}" required>
                        </div>
                        <div style="flex:1; display:flex; flex-direction:column;">
                            <label>Address</label>
                            <input type="text" name="address" value="${company.address || ''}">
                        </div>
                    </div>
                    <div style="display: flex; gap: 16px; margin-bottom: 12px;">
                        <div style="flex:1; display:flex; flex-direction:column;">
                            <label>City</label>
                            <input type="text" name="city" value="${company.city || ''}">
                        </div>
                        <div style="flex:1; display:flex; flex-direction:column;">
                            <label>State</label>
                            <input type="text" name="state" value="${company.state || ''}">
                        </div>
                    </div>
                    <div style="display: flex; gap: 16px; margin-bottom: 12px;">
                        <div style="flex:1; display:flex; flex-direction:column;">
                            <label>Contact No.</label>
                            <input type="tel" id="edit_contact_no" name="contact_no" value="${company.contact_no || ''}">
                        </div>
                        <div style="flex:1; display:flex; flex-direction:column;">
                            <label>Email ID</label>
                            <input type="email" id="edit_email" name="email" value="${company.email || ''}">
                        </div>
                    </div>
                    <div style="display:flex; gap:16px; margin-bottom:12px;">
                        <div style="flex:1; display:flex; flex-direction:column;">
                            <label>Website / URL</label>
                            <input type="url" id="edit_web_url" name="web_url" value="${company.web_url || ''}">
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:12px;">
                        <button type="button" id="clearEditCompanyBtn" style="background:#f5f5f5; color:#333; border:1px solid #ddd; border-radius:8px; font-weight:600; padding:8px 18px; font-size:1em; cursor:pointer;">Clear</button>
                        <button type="submit" style="background:#2196F3; color:#fff; border:none; border-radius:8px; font-weight:600; padding:8px 18px; font-size:1em; cursor:pointer;">Save</button>
                    </div>
                </form>
            </div>
        `;
        // Append modal and ensure it sits above other stacked elements
        document.body.appendChild(modal);
        // Force high z-index in case of stacking context issues
        modal.style.zIndex = '30000';
        const inner = modal.querySelector('.modal-content');
        if (inner) inner.style.zIndex = '30001';
        modal.querySelector('.close').onclick = function () {
            modal.remove();
        };
        modal.querySelector('#editCompanyForm').onsubmit = function (e) {
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(this).entries());
            formData.contact_no = formData.contact_no || modal.querySelector('#edit_contact_no')?.value || '';
            formData.email = formData.email || modal.querySelector('#edit_email')?.value || '';
            formData.web_url = formData.web_url || modal.querySelector('#edit_web_url')?.value || '';
            // Required fields validation
            const requiredFields = ['company_name', 'address', 'city', 'state', 'contact_no', 'email', 'web_url'];
            const missing = requiredFields.filter(f => !(formData[f] && formData[f].trim()));
            if (missing.length > 0) {
                alert('Please fill all required fields.');
                this[missing[0]].focus();
                return;
            }
            // Email validation
            const email = (formData.email || '').trim();
            if (email && !/^([a-zA-Z0-9_\-.]+)@([a-zA-Z0-9_\-.]+)\.([a-zA-Z]{2,})$/.test(email)) {
                alert('Please enter a valid Email ID.');
                modal.querySelector('#edit_email').focus();
                return;
            }
            // URL validation
            const webUrl = (formData.web_url || '').trim();
            if (webUrl) {
                try {
                    new URL(webUrl);
                } catch (err) {
                    alert('Please enter a valid Website / URL.');
                    modal.querySelector('#edit_web_url').focus();
                    return;
                }
            }
            fetch(`/Work_logs/api/companies/${company.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
                .then(res => res.json())
                .then(() => {
                    modal.remove();
                    fetchCompanies();
                });
        };
        // Clear button logic
        modal.querySelector('#clearEditCompanyBtn').onclick = function () {
            const form = modal.querySelector('#editCompanyForm');
            form.company_name.value = '';
            form.address.value = '';
            form.city.value = '';
            form.state.value = '';
            form.contact_no.value = '';
            form.email.value = '';
            modal.querySelector('#edit_web_url').value = '';
        };
    }

    fetchCompanies();
});
