document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('expenseForm');
    const body = document.getElementById('expensesBody');

    function fmtDate(d) {
        const date = new Date(d);
        const y = date.getFullYear();
        const m = String(date.getMonth()+1).padStart(2,'0');
        const day = String(date.getDate()).padStart(2,'0');
        return `${y}-${m}-${day}`;
    }

    window.loadExpenses = function() {
        fetch('/Work_logs/api/company_expense')
            .then(r=>r.json())
            .then(list=>{
                body.innerHTML = '';
                if (!list || list.length === 0) {
                    body.innerHTML = '<tr><td colspan="4" style="text-align:center">No records.</td></tr>';
                    return;
                }
                                list.forEach((it, idx) => {
                                        const tr = document.createElement('tr');
                                        tr.innerHTML = `
                                                <td>${idx+1}</td>
                                                <td>${it.date || ''}</td>
                                                <td>${it.description || ''}</td>
                                                <td>${it.price != null ? it.price.toFixed(2) : ''}</td>
                                                <td>
                                                    <div style="display:flex;gap:8px;align-items:center;">
                                                        <button class="action-btn edit-btn" onclick="editExpense(${it.id})">Edit</button>
                                                        <button class="action-btn delete-btn" onclick="deleteExpense(${it.id})">Delete</button>
                                                    </div>
                                                </td>
                                        `;
                                        body.appendChild(tr);
                                });
            }).catch(err=>{ console.error('Error loading expenses', err); body.innerHTML = '<tr><td colspan="4" style="text-align:center">Error loading</td></tr>'; });
    };

    window.deleteExpense = function(id) {
        if (!confirm('Delete this expense?')) return;
        fetch(`/Work_logs/api/company_expense/${id}`, { method: 'DELETE' })
            .then(r=>r.json()).then(res=>{
                if (res && res.error) return alert('Error: '+res.error);
                loadExpenses();
                alert('Deleted');
            }).catch(err=>{ console.error(err); alert('Error deleting'); });
    };

    if (form) {
        form.addEventListener('submit', function(e){
            e.preventDefault();
            const date = document.getElementById('expense_date').value;
            const price = document.getElementById('expense_price').value;
            const desc = (document.getElementById('expense_desc').value || '').trim();
            if (!date || price === '') return alert('Date and price required');
            if (!desc) return alert('Description is required');
            fetch('/Work_logs/api/company_expense', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ date, price: parseFloat(price), description: desc }) })
                .then(r=>r.json()).then(res=>{
                    if (res && res.error) return alert('Error: '+res.error);
                    form.reset();
                    loadExpenses();
                    alert('Expense added');
                }).catch(err=>{ console.error(err); alert('Error adding'); });
        });
    }

    function hideEditTab() {
        const tabEdit = document.getElementById('tabExpenseEdit');
        const tabAdd = document.getElementById('tabAddExpense');
        const tabList = document.getElementById('tabExpenseList');
        const editTab = document.getElementById('expenseEditTab');
        const addTab = document.getElementById('expenseAddTab');
        const listTab = document.getElementById('expenseListTab');
        if (tabEdit) tabEdit.style.display = 'none';
        if (tabEdit) tabEdit.classList.remove('active');
        if (tabAdd) tabAdd.classList.remove('active');
        if (tabList) tabList.classList.add('active');
        if (editTab) editTab.style.display = 'none';
        if (listTab) listTab.style.display = 'block';
        if (addTab) addTab.style.display = 'none';
        const editForm = document.getElementById('expenseEditForm');
        if (editForm) editForm.dataset.editing = '';
    }

    // Edit flow (modal-based, similar to projects edit)
    window.editExpense = function(id) {
        fetch(`/Work_logs/api/company_expense/${id}`)
            .then(res => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(item => {
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>Edit Expense</h3>
                        <form id="editExpenseForm">
                            <div style="display:grid; gap:10px;">
                                <label>Date *</label>
                                <input type="date" id="modal_expense_date" value="${item.date ? (item.date.split('T')[0]) : ''}" required />
                                <label>Price *</label>
                                <input type="number" step="0.01" min="0" id="modal_expense_price" value="${item.price != null ? item.price : ''}" required />
                                <label>Description</label>
                                <input type="text" id="modal_expense_desc" value="${(item.description||'').replace(/"/g,'&quot;')}" />
                            </div>
                            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:12px;">
                                <button type="button" id="cancelEditExpense" class="btn-secondary">Cancel</button>
                                <button type="submit" class="btn-primary">Save</button>
                            </div>
                        </form>
                    </div>`;
                document.body.appendChild(modal);

                modal.querySelector('#cancelEditExpense').onclick = function() { document.body.removeChild(modal); };

                modal.querySelector('#editExpenseForm').onsubmit = function(e) {
                    e.preventDefault();
                    const date = modal.querySelector('#modal_expense_date').value;
                    const price = modal.querySelector('#modal_expense_price').value;
                    const desc = (modal.querySelector('#modal_expense_desc').value || '').trim();
                    if (!desc) return alert('Description is required');
                    fetch(`/Work_logs/api/company_expense/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ date, price: parseFloat(price), description: desc }) })
                        .then(r=>r.json()).then(res=>{
                            if (res && res.error) return alert('Error: '+res.error);
                            document.body.removeChild(modal);
                            if (typeof loadExpenses === 'function') loadExpenses();
                            alert('Expense updated');
                        }).catch(err=>{ console.error(err); alert('Error updating'); });
                };
            }).catch(err=>{ console.error('Error fetching expense for edit', err); alert('Error opening edit'); });
    };

    const editForm = document.getElementById('expenseEditForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e){
            e.preventDefault();
            const id = parseInt(editForm.dataset.editing, 10);
            if (!id) return alert('No expense selected');
            const date = document.getElementById('expense_date_edit').value;
            const price = document.getElementById('expense_price_edit').value;
            const desc = document.getElementById('expense_desc_edit').value;
            fetch(`/Work_logs/api/company_expense/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ date, price: parseFloat(price), description: desc }) })
                .then(r=>r.json()).then(res=>{
                    if (res && res.error) return alert('Error: '+res.error);
                    // close edit tab and return to list
                    hideEditTab();
                    loadExpenses();
                    alert('Expense updated');
                }).catch(err=>{ console.error(err); alert('Error updating'); });
        });
    }

    const cancelBtn = document.getElementById('expenseCancelEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', function(){
        hideEditTab();
    });

    // hide edit tab when main tabs are used
    const mainTabAdd = document.getElementById('tabAddExpense');
    const mainTabList = document.getElementById('tabExpenseList');
    if (mainTabAdd) {
        mainTabAdd.addEventListener('click', function(){
            hideEditTab();
            const addTab = document.getElementById('expenseAddTab');
            const listTab = document.getElementById('expenseListTab');
            if (addTab) addTab.style.display = 'block';
            if (listTab) listTab.style.display = 'none';
            mainTabAdd.classList.add('active');
            if (mainTabList) mainTabList.classList.remove('active');
        });
    }
    if (mainTabList) {
        mainTabList.addEventListener('click', function(){
            hideEditTab();
            const addTab = document.getElementById('expenseAddTab');
            const listTab = document.getElementById('expenseListTab');
            if (addTab) addTab.style.display = 'none';
            if (listTab) listTab.style.display = 'block';
            mainTabList.classList.add('active');
            if (mainTabAdd) mainTabAdd.classList.remove('active');
            if (typeof loadExpenses === 'function') loadExpenses();
        });
    }

    // set default date to today and ensure editable; restore on form reset
    const expenseDateEl = document.getElementById('expense_date');
    if (expenseDateEl) {
        expenseDateEl.value = fmtDate(new Date());
        expenseDateEl.removeAttribute('readonly');
        expenseDateEl.disabled = false;
        if (form) form.addEventListener('reset', function(){ expenseDateEl.value = fmtDate(new Date()); });
    }

    if (typeof loadExpenses === 'function') loadExpenses();
});
