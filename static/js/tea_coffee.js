document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('teaCoffeeForm');
    const body = document.getElementById('drinksBody');

    function fmt(d) {
        const date = new Date(d);
        const y = date.getFullYear();
        const m = String(date.getMonth()+1).padStart(2,'0');
        const day = String(date.getDate()).padStart(2,'0');
        return `${y}-${m}-${day}`;
    }

    function updateTotal() {
        const qty = parseInt(document.getElementById('qty').value || '0', 10) || 0;
        const price = parseFloat(document.getElementById('price').value || '0') || 0;
        const total = (qty * price) || 0;
        const el = document.getElementById('total_price');
        if (el) el.value = total ? total.toFixed(2) : '';
    }

    window.addPrice = function() {
        const tod = document.getElementById('time_of_day').value || '';
        const val = prompt('Enter unit price (e.g. 12.50):', '');
        if (val === null) return;
        const p = parseFloat(val);
        if (isNaN(p) || p < 0) { alert('Invalid price'); return; }
        fetch('/Work_logs/api/tea_coffee_price', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ time_of_day: tod, price: p }) })
            .then(r=>r.json()).then(res=>{
                if (res && res.error) return alert('Error: '+res.error);
                // set unit price in form
                document.getElementById('price').value = res.price || p;
                updateTotal();
                // refresh cached prices so UI reflects the latest
                loadPrices();
                alert('Price saved');
            }).catch(err=>{ console.error('Error saving price', err); alert('Error saving price'); });
    };

    // Load prices and set the price field for current selection
    function loadPrices() {
        fetch('/Work_logs/api/tea_coffee_price')
            .then(r=>r.json())
            .then(list=>{
                // list is array of price objects, most recent first by our API
                const tod = document.getElementById('time_of_day') ? document.getElementById('time_of_day').value : '';
                let chosen = null;
                if (tod) {
                    chosen = list.find(p=>p.time_of_day === tod);
                }
                // fallback: if no exact match, use most recent overall
                if (!chosen && list && list.length>0) chosen = list[0];
                if (chosen) {
                    const priceEl = document.getElementById('price');
                    if (priceEl) priceEl.value = chosen.price;
                    updateTotal();
                }
            }).catch(err=>{ console.error('Error loading prices', err); });
    }

    window.loadDrinks = function() {
        fetch('/Work_logs/api/tea_coffee')
            .then(r=>r.json())
            .then(list=>{
                body.innerHTML = '';
                if (!list || list.length === 0) {
                    body.innerHTML = '<tr><td colspan="6" style="text-align:center">No records.</td></tr>';
                    return;
                }
                list.forEach((it, idx) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${idx+1}</td>
                        <td>${it.date || ''}</td>
                        <td>${it.time_of_day || ''}</td>
                        <td>${it.qty || ''}</td>
                        <td>${it.price != null ? it.price : ''}</td>
                        <td><button class="action-btn delete-btn" onclick="deleteDrink(${it.id})">Delete</button></td>
                    `;
                    body.appendChild(tr);
                });
            }).catch(err=>{ console.error('Error loading drinks', err); body.innerHTML = '<tr><td colspan="6" style="text-align:center">Error loading</td></tr>'; });
    };

    window.deleteDrink = function(id) {
        if (!confirm('Delete this record?')) return;
        fetch(`/Work_logs/api/tea_coffee/${id}`, { method: 'DELETE' })
            .then(r=>r.json()).then(res=>{
                if (res && res.error) return alert('Error: '+res.error);
                loadDrinks();
                alert('Deleted');
            }).catch(err=>{ console.error(err); alert('Error deleting'); });
    };

    form.addEventListener('submit', function(e){
        e.preventDefault();
        const date = document.getElementById('drink_date').value;
        const tod = (document.getElementById('time_of_day') && document.getElementById('time_of_day').value) ? document.getElementById('time_of_day').value : '';
        const qtyRaw = document.getElementById('qty').value;
        const price = document.getElementById('price').value;
        // validations: require date, time of day and qty > 0
        if (!date) return alert('Date is required');
        if (!tod) return alert('Time of day is required');
        const qty = qtyRaw ? parseInt(qtyRaw, 10) : 0;
        if (!qty || isNaN(qty) || qty <= 0) return alert('Quantity is required and must be greater than 0');
        fetch('/Work_logs/api/tea_coffee', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ date, time_of_day: tod, qty: qty, price: price ? parseFloat(price) : null }) })
            .then(r=>r.json()).then(res=>{
                if (res && res.error) return alert('Error: '+res.error);
                form.reset();
                loadDrinks();
                alert('Added');
            }).catch(err=>{ console.error(err); alert('Error adding'); });
    });

    // wire up events
    const qtyEl = document.getElementById('qty');
    const priceEl = document.getElementById('price');
    const addPriceBtn = document.getElementById('btnAddPrice');
    if (qtyEl) {
        // enforce max 4 digits (<=9999) and numeric-only
        try { qtyEl.max = 9999; } catch (e) {}
        qtyEl.addEventListener('input', function () {
            if (!this.value) { updateTotal(); return; }
            // remove non-digits
            this.value = String(this.value).replace(/[^0-9]/g, '');
            if (this.value.length > 4) this.value = this.value.slice(0, 4);
            if (parseInt(this.value, 10) > 9999) this.value = '9999';
            updateTotal();
        });
    }
    if (priceEl) priceEl.addEventListener('input', updateTotal);
    if (addPriceBtn) addPriceBtn.addEventListener('click', window.addPrice);
    const todEl = document.getElementById('time_of_day');
    if (todEl) todEl.addEventListener('change', function(){ loadPrices(); });

    // initial load when page opened
    // set default date to today and ensure editable; also restore on form reset
    const drinkDateEl = document.getElementById('drink_date');
    if (drinkDateEl) {
        drinkDateEl.value = fmt(new Date());
        drinkDateEl.removeAttribute('readonly');
        drinkDateEl.disabled = false;
        form.addEventListener('reset', function(){ drinkDateEl.value = fmt(new Date()); });
    }

    // initial load when page opened
    if (typeof loadDrinks === 'function') loadDrinks();
    // load prices to prefill price field
    loadPrices();
});
