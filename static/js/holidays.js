document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('holidayForm');
    const body = document.getElementById('holidaysBody');

    function loadHolidays() {
        const today = new Date().toISOString().split('T')[0];
        // Fetch holidays from API (includes recurring)
        fetch(`/Work_logs/api/holidays?start=${today}`)
            .then(r => r.json())
            .then(data => {
                body.innerHTML = '';
                const holidays = Array.isArray(data) ? data : [];

                if (holidays.length === 0) {
                    body.innerHTML = '<tr><td colspan="4" style="text-align:center">No upcoming holidays found.</td></tr>';
                    return;
                }

                // Sort by date ascending for upcoming view
                holidays.sort((a, b) => a.date.localeCompare(b.date));

                holidays.forEach((h, idx) => {
                    const tr = document.createElement('tr');

                    // Only show delete button for manual entries (ones with an ID)
                    let actions = '<span style="color:#94a3b8; font-size:0.85rem; font-style:italic;">System Generated</span>';
                    if (h.id) {
                        actions = `<button class="action-btn delete-btn" onclick="deleteHoliday(${h.id})"><i class="fas fa-trash"></i> Delete</button>`;
                    }

                    tr.innerHTML = `
                        <td>${idx + 1}</td>
                        <td><span style="font-weight:600; color:#1e293b;">${h.date}</span></td>
                        <td>${h.description || ''}</td>
                        <td>
                          <div style="display:flex;gap:8px;">
                            ${actions}
                          </div>
                        </td>
                    `;
                    body.appendChild(tr);
                });
            }).catch(err => {
                console.error('Error loading holidays', err);
                body.innerHTML = '<tr><td colspan="4" style="text-align:center">Error loading holidays</td></tr>';
            });
    }

    window.deleteHoliday = function (id) {
        if (!confirm('Are you sure you want to delete this manual holiday record?')) return;
        fetch(`/Work_logs/api/holidays/${id}`, { method: 'DELETE' })
            .then(r => r.json()).then(res => {
                if (res && res.error) return alert('Error: ' + res.error);
                loadHolidays();
                alert('Holiday deleted successfully');
            }).catch(err => { console.error(err); alert('Error deleting holiday'); });
    };

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const d = document.getElementById('holiday_date').value;
        const descEl = document.getElementById('holiday_desc');
        const desc = descEl ? (descEl.value || '').trim() : '';
        if (!d) return alert('Date is required');
        if (!desc) return alert('Description is required');

        fetch('/Work_logs/api/holidays', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: d, description: desc })
        })
            .then(r => r.json())
            .then(res => {
                if (res && res.error) return alert('Error: ' + res.error);
                form.reset();
                loadHolidays();
                alert('Holiday added successfully');
            }).catch(err => { console.error(err); alert('Error adding holiday'); });
    });

    loadHolidays();

    // enforce maxlength 50 on description input and truncate pasted text
    const descEl = document.getElementById('holiday_desc');
    if (descEl) {
        descEl.maxLength = 50;
        descEl.addEventListener('input', function () { if (this.value && this.value.length > 50) this.value = this.value.slice(0, 50); });
    }
});
