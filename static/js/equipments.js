	// Populate Vendor dropdown for Add Equipment
	function populateVendorDropdown() {
		fetch(window.location.origin + '/Work_logs/api/vendor_names')
			.then(res => res.json())
			.then(vendors => {
				const vendorSelect = document.getElementById('vendor_name');
				if (vendorSelect) {
					vendorSelect.innerHTML = '<option value="">Select Vendor</option>';
					vendors.filter(v => v.operation !== 'delete').forEach(v => {
						vendorSelect.innerHTML += `<option value="${v.vendor_name}">${v.vendor_name}</option>`;
					});
				}
			});
	}
	populateVendorDropdown();

	// Populate Maintenance Type dropdowns from backend
	function populateMaintenanceDropdown() {
		fetch(window.location.origin + '/Work_logs/api/maintenance_types')
			.then(res => res.json())
			.then(types => {
				const maintSel = document.getElementById('maintenance_type');
				const editMaintSel = document.getElementById('edit_maintenance_type');
				if (maintSel) {
					maintSel.innerHTML = '<option value="">Select Maintenance Type</option>';
					types.filter(t => !(t.operation && String(t.operation).toLowerCase() === 'delete')).forEach(t => {
						const opt = document.createElement('option');
						opt.value = t.type_name || t.id || '';
						opt.textContent = t.type_name || t.frequency_type || '';
						maintSel.appendChild(opt);
					});
				}
				if (editMaintSel) {
					editMaintSel.innerHTML = '<option value="">Select Maintenance Type</option>';
					types.filter(t => !(t.operation && String(t.operation).toLowerCase() === 'delete')).forEach(t => {
						const opt = document.createElement('option');
						opt.value = t.type_name || t.id || '';
						opt.textContent = t.type_name || t.frequency_type || '';
						editMaintSel.appendChild(opt);
					});
				}
			}).catch(() => {
				// ignore errors silently; dropdown will remain as-is
			});
	}
	// populate maintenance dropdowns on load
	populateMaintenanceDropdown();

// Input sanitization for key fields
function sanitizeEquipInput(val) {
	// Allow letters, digits, space, hyphen, dot
	return val.replace(/[^a-zA-Z0-9 .-]/g, '');
}

function enforceSanitizeInput(id) {
	var el = document.getElementById(id);
	if (!el) return;
	el.addEventListener('input', function(e) {
		const sanitized = sanitizeEquipInput(el.value);
		if (el.value !== sanitized) el.value = sanitized;
	});
	el.addEventListener('paste', function(e) {
		e.preventDefault();
		const text = (e.clipboardData || window.clipboardData).getData('text');
		el.value = sanitizeEquipInput(text).slice(0, el.maxLength || 100);
	});
}

['equipment_name','serial_number','model_no','warranty'].forEach(enforceSanitizeInput);
// If edit modal fields exist, also enforce there
['edit_equipment_name','edit_serial_number','edit_model_no','edit_warranty'].forEach(enforceSanitizeInput);

// Tab switching logic for Equipment Master
window.addEventListener('DOMContentLoaded', function() {
	// Store equipments in memory
	let filteredEquipments = [];

	// Equipment search input logic
	const equipmentSearchInput = document.getElementById('equipmentSearchInput');
	function sanitizeEquipSearch(val) {
		if (!val) return '';
		const cleaned = String(val).split('').filter(ch => /[A-Za-z0-9 .-]/.test(ch)).join('');
		return cleaned.length > 40 ? cleaned.slice(0,40) : cleaned;
	}
	if (equipmentSearchInput) {
		equipmentSearchInput.addEventListener('input', function() {
			const cleaned = sanitizeEquipSearch(this.value);
			if (cleaned !== this.value) this.value = cleaned;
			filterAndRenderEquipments();
		});
		equipmentSearchInput.addEventListener('paste', function() {
			setTimeout(() => {
				const cleaned = sanitizeEquipSearch(this.value);
				if (cleaned !== this.value) this.value = cleaned;
				filterAndRenderEquipments();
			}, 0);
		});
	}

	function filterAndRenderEquipments() {
		const searchVal = equipmentSearchInput ? equipmentSearchInput.value.trim().toLowerCase() : '';
		if (!searchVal) {
			renderEquipmentTable(equipments);
			return;
		}
		filteredEquipments = equipments.filter(eq => (eq.equipment_name || '').toLowerCase().includes(searchVal));
		renderEquipmentTable(filteredEquipments);
	}

	// Fetch equipments from backend
	function fetchEquipments() {
		const apiUrl = window.location.origin + '/Work_logs/api/equipments';
		fetch(apiUrl)
			.then(response => response.json())
			.then(data => {
				equipments = data;
				filterAndRenderEquipments();
			})
			.catch(() => {
				equipments = [];
				filterAndRenderEquipments();
			});
	}

	// Cache for frequency types to avoid multiple API calls
	let frequencyTypesCache = null;
	let frequencyTypesFetching = false;
	let frequencyTypesCallbacks = [];

	// Helper function to get frequency types (with caching)
	function getFrequencyTypes() {
		return new Promise((resolve, reject) => {
			// If we have cached data, return it immediately
			if (frequencyTypesCache !== null) {
				resolve(frequencyTypesCache);
				return;
			}
			
			// If a fetch is already in progress, queue this request
			if (frequencyTypesFetching) {
				frequencyTypesCallbacks.push({ resolve, reject });
				return;
			}
			
			// Start a new fetch
			frequencyTypesFetching = true;
			fetch(window.location.origin + '/Work_logs/api/frequency_types')
				.then(res => res.json())
				.then(data => {
					// Cache the result
					frequencyTypesCache = data;
					// Resolve this promise
					resolve(data);
					// Resolve any queued promises
					frequencyTypesCallbacks.forEach(cb => cb.resolve(data));
					frequencyTypesCallbacks = [];
					frequencyTypesFetching = false;
				})
				.catch(err => {
					// Handle error
					reject(err);
					// Reject any queued promises
					frequencyTypesCallbacks.forEach(cb => cb.reject(err));
					frequencyTypesCallbacks = [];
					frequencyTypesFetching = false;
				});
		});
	}

	// Populate frequency select based on selected maintenance type (from DB)
	function populateFrequencyForMaintenance(maintenanceType, targetSelect) {
		if (!targetSelect) return;
		// default placeholder
		targetSelect.innerHTML = '<option value="">Select Frequency</option>';
		if (!maintenanceType) return;
		
		console.log('Populating frequency for maintenance type:', maintenanceType);
		
		// Use cached data or fetch new data
		return getFrequencyTypes()
			.then(list => {
				// Filter by maintenance type and not deleted
				const filteredList = list.filter(f => {
					const op = (f.operation || '').toString().toLowerCase();
					return op !== 'delete' && (f.frequency_type === maintenanceType || String(f.frequency_type) === String(maintenanceType));
				});
				
				console.log('Filtered frequency list:', filteredList);

				// Log all frequency values received for debugging
				const allValues = filteredList.map(f => String(f.frequency_value));
				console.log('All frequency values for maintenance type', maintenanceType, ':', allValues);

				// Find duplicates for debugging
				const valueCount = {};
				allValues.forEach(val => {
					valueCount[val] = (valueCount[val] || 0) + 1;
				});
				const duplicates = Object.keys(valueCount).filter(val => valueCount[val] > 1);
				if (duplicates.length > 0) {
					console.error('Duplicate frequency values detected:', duplicates, 'Counts:', duplicates.map(d => valueCount[d]));
				}

				// Build a set of unique frequency values
				const uniqueValues = Array.from(new Set(allValues));
				uniqueValues.sort((a, b) => Number(a) - Number(b));
				
				// Clear existing options first except the placeholder
				while (targetSelect.options.length > 1) {
					targetSelect.remove(1);
				}

				// Track already added options to prevent duplicates
				const addedOptions = new Set();
				
				// Populate select with only unique values
				uniqueValues.forEach(val => {
					if (addedOptions.has(val)) return; // Skip if already added
					
					let label = '';
					if (val === '1') label = 'Monthly';
					else if (val === '3') label = 'Quarterly';
					else if (val === '6') label = 'Half-Yearly';
					else if (val === '12') label = 'Yearly';
					else label = val;
					
					const opt = document.createElement('option');
					opt.value = val;
					opt.textContent = label;
					targetSelect.appendChild(opt);
					addedOptions.add(val);
				});
			}).catch(() => {
				// network error: leave only placeholder
			});
	}
	// expose to global so inline onchange in template can call it
	window.populateFrequencyForMaintenance = populateFrequencyForMaintenance;

	// wire change handlers for maintenance selects (add & edit)
	const maintSelGlobal = document.getElementById('maintenance_type');
	const freqSelGlobal = document.getElementById('maintenance_frequency');
	if (maintSelGlobal) {
		maintSelGlobal.addEventListener('change', function() {
			const val = this.value;
			populateFrequencyForMaintenance(val, freqSelGlobal);
			// existing UI logic in template may expect toggle/generate functions
			try { if (typeof toggleMaintenanceFields === 'function') toggleMaintenanceFields(); } catch (e) {}
			try { if (typeof generateMaintenanceDates === 'function') generateMaintenanceDates(); } catch (e) {}
		});
	}
	const editMaintSelGlobal = document.getElementById('edit_maintenance_type');
	const editFreqSelGlobal = document.getElementById('edit_maintenance_frequency');
	if (editMaintSelGlobal) {
		editMaintSelGlobal.addEventListener('change', function() {
			const val = this.value;
			populateFrequencyForMaintenance(val, editFreqSelGlobal);
			try { if (typeof toggleEditMaintenanceFields === 'function') toggleEditMaintenanceFields(); } catch (e) {}
			try { if (typeof generateEditMaintenanceDates === 'function') generateEditMaintenanceDates(); } catch (e) {}
		});
	}

	const tabEquipmentEntry = document.getElementById('tabEquipmentEntry');
	const tabEquipmentList = document.getElementById('tabEquipmentList');
	const equipmentEntryTab = document.getElementById('equipmentEntryTab');
	const equipmentListTab = document.getElementById('equipmentListTab');

	if (tabEquipmentEntry && tabEquipmentList && equipmentEntryTab && equipmentListTab) {
		tabEquipmentEntry.onclick = function() {
			tabEquipmentEntry.classList.add('active');
			tabEquipmentList.classList.remove('active');
			equipmentEntryTab.style.display = 'block';
			equipmentListTab.style.display = 'none';
		};
		tabEquipmentList.onclick = function() {
			tabEquipmentList.classList.add('active');
			tabEquipmentEntry.classList.remove('active');
			equipmentEntryTab.style.display = 'none';
			equipmentListTab.style.display = 'block';
			fetchEquipments(); // Load data every time tab is shown
		};
	}

	// Store equipments in memory
	let equipments = [];

	// Fetch equipments from backend
	function fetchEquipments() {
		const apiUrl = window.location.origin + '/Work_logs/api/equipments';
		fetch(apiUrl)
			.then(response => response.json())
			.then(data => {
				equipments = data;
				renderEquipmentTable();
			})
			.catch(() => {
				equipments = [];
				renderEquipmentTable();
			});
	}

	// Form submission
	const equipmentForm = document.getElementById('equipmentForm');
	if (equipmentForm) {
		equipmentForm.onsubmit = function(e) {
			e.preventDefault();
			const formData = new FormData(equipmentForm);
			// Validate required fields in Purchase Details
			const requiredFields = [
				'vendor_name', 'purchase_date', 'price', 'warranty',
				'equipment_name', 'serial_number', 'model_no', 'location', 'building', 'department', 'dept_floor', 'room_lab',
				'maintenance_type', 'maintenance_frequency', 'maintenance_start_date'
			];
			let missing = [];
			requiredFields.forEach(f => {
				const val = formData.get(f);
				if (!val || String(val).trim() === '') missing.push(f);
			});
			// Check at least one maintenance date
			const container = document.getElementById('maintenance-dates-container');
			const maintenanceDates = container ? Array.from(container.querySelectorAll('input[type="date"]')).map(i => i.value).filter(v => v) : [];
			if (!maintenanceDates.length) missing.push('maintenance_dates');
			if (missing.length) {
				showEquipmentMessage('Please fill all Purchase Details and Maintenance Schedule fields.', 'error');
				return;
			}
			// Duplicate serial number check
			const serialNo = formData.get('serial_number') ? formData.get('serial_number').trim() : '';
			if (serialNo) {
				const duplicate = equipments.some(eq => eq.serial_number && eq.serial_number.trim().toLowerCase() === serialNo.toLowerCase() && (!eq.operation || String(eq.operation).toLowerCase() !== 'delete'));
				if (duplicate) {
					showEquipmentMessage('Duplicate Serial Number! Equipment with this serial number already exists.', 'error');
					return;
				}
			}
			const equipment = {
				equipment_name: formData.get('equipment_name'),
				serial_number: formData.get('serial_number'),
				model_no: formData.get('model_no'),
				location: formData.get('location'),
				building: formData.get('building'),
				department: formData.get('department'),
				dept_floor: formData.get('dept_floor'),
				room_lab: formData.get('room_lab'),
				vendor_name: formData.get('vendor_name'),
				purchase_date: formData.get('purchase_date'),
				price: formData.get('price'),
				warranty: formData.get('warranty'),
				maintenance_type: formData.get('maintenance_type'),
				maintenance_frequency: formData.get('maintenance_frequency'),
				maintenance_start_date: formData.get('maintenance_start_date'),
				maintenance_dates: maintenanceDates
			};
			const apiUrl = window.location.origin + '/Work_logs/api/equipments';
			fetch(apiUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(equipment)
			})
			.then(response => response.json())
			.then(data => {
				showEquipmentMessage(data.message || 'Equipment added!', 'success');
				fetchEquipments();
				equipmentForm.reset();
			})
			.catch(() => {
				showEquipmentMessage('Failed to add equipment!', 'error');
			});
		};
	}

	// Render table
	function renderEquipmentTable(dataOverride) {
		const data = Array.isArray(dataOverride) ? dataOverride : equipments;
		const tbody = document.getElementById('equipmentTableBody');
		if (!tbody) return;
		tbody.innerHTML = '';
				if (!data || data.length === 0) {
					const row = document.createElement('tr');
					// compute current header count for colspan
					let headerCount = 0;
					const table = document.getElementById('equipmentTable');
					if (table) {
						const ths = table.querySelectorAll('thead th');
						headerCount = ths ? ths.length : 1;
					} else headerCount = 1;
					row.innerHTML = `<td colspan="${headerCount}" style="text-align:center">No equipments found.</td>`;
					tbody.appendChild(row);
					return;
				}
			data.forEach((eq, idx) => {
				const row = document.createElement('tr');
				row.innerHTML = `
					<td>${idx + 1}</td>
					<td>${eq.equipment_code || eq.id || ''}</td>
					<td>${eq.equipment_name || ''}</td>
					<td>${eq.serial_number || ''}</td>
					<td>${eq.model_no || ''}</td>
					<td>${eq.location || ''}</td>
					<td>${eq.building || ''}</td>
					<td>${eq.department || ''}</td>
					<td>${eq.dept_floor || ''}</td>
					<td>${eq.room_lab || ''}</td>
					<td>${eq.vendor_name || ''}</td>
					<td>${eq.purchase_date || ''}</td>
					<td>${eq.price || ''}</td>
					<!-- guarantee column removed -->
					<td>${eq.warranty || ''}</td>
					<td>${eq.maintenance_type || eq.maintenance || ''}</td>
					<td>${eq.maintenance_frequency ? (eq.maintenance_frequency === '1' ? 'Monthly' : eq.maintenance_frequency === '3' ? 'Quarterly' : eq.maintenance_frequency === '6' ? 'Half-Yearly' : eq.maintenance_frequency === '12' ? 'Yearly' : eq.maintenance_frequency) : ''}</td>
					<td>${(function(){
						// Format start date as yyyy-mm-dd
						if (eq.maintenance_start_date) {
							if (eq.maintenance_start_date.includes('GMT')) {
								const dateObj = new Date(eq.maintenance_start_date);
								return dateObj.toISOString().slice(0,10);
							}
							return eq.maintenance_start_date;
						}
						return '';
					})()}</td>
					<td>${(function(){
						// show next maintenance date (first of maintenance_dates) if available, formatted yyyy-mm-dd
						try{
							if (eq.maintenance_dates && Array.isArray(eq.maintenance_dates) && eq.maintenance_dates.length>0) {
								const d = eq.maintenance_dates[0];
								if (typeof d === 'string' && d.includes('GMT')) {
									const dateObj = new Date(d);
									return dateObj.toISOString().slice(0,10);
								}
								return d;
							}
							return '';
						}catch(e){return '';}
					})()}</td>
					<td>${eq.logged_user || ''}</td>
					<td>${eq.insert_datetime || eq.datetime || ''}</td>
					<td>${eq.operation || ''}</td>
					<td>${eq.qr_code ? `<img src="data:image/png;base64,${eq.qr_code}" alt="QR Code" style="width:80px;height:80px;">` : ''}</td>
					<td>
						<button class="location-action-btn edit-btn" onclick="editEquipment('${eq.id}')" title="Edit"><i class="fas fa-pen"></i> Edit</button>
						<button class="location-action-btn print-btn" onclick="printQRCode(this)" title="Print" style="background:#43a047;color:#fff;border:none;"> <i class="fas fa-print"></i> Print</button>
						<button class="location-action-btn delete-btn" onclick="deleteEquipment('${eq.id}')" title="Delete"><i class="fas fa-trash"></i> Delete</button>
					</td>
				`;
				tbody.appendChild(row);

				// Attach printQRCode function to window for inline onclick
				window.printQRCode = function(btn) {
					// Find the QR code image in the same row as the button
					const row = btn.closest('tr');
					const qrImg = row.querySelector('td img');
					if (!qrImg) {
						alert('QR code not found!');
						return;
					}
					// Create a new window with just the QR code for printing
					const printWindow = window.open('', '_blank', 'width=400,height=400');
					printWindow.document.write('<html><head><title>Print QR Code</title>');
					printWindow.document.write('<style>body{display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}img{max-width:90vw;max-height:90vh;}</style>');
					printWindow.document.write('</head><body>');
					printWindow.document.write('<img src="' + qrImg.src + '" />');
					printWindow.document.write('</body></html>');
					printWindow.document.close();
					printWindow.focus();
					setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
				};
			});
	}

	// Show message
	function showEquipmentMessage(msg, type) {
		const msgDiv = document.getElementById('equipmentMessage');
		if (!msgDiv) return;
		msgDiv.textContent = msg;
		msgDiv.style.display = 'block';
		msgDiv.style.background = type === 'success' ? '#e3f2fd' : '#ffebee';
		msgDiv.style.color = type === 'success' ? '#1976d2' : '#c62828';
		setTimeout(() => { msgDiv.style.display = 'none'; }, 2500);
	}

	// Edit Equipment Modal logic
	window.editEquipment = function(id) {
		const eq = equipments.find(e => e.id == id);
		if (!eq) {
			alert('Equipment not found');
			return;
		}
		// Helper to set dropdown value, adding option if missing
		function setDropdownValue(select, value) {
			if (!select) return;
			let found = false;
			for (let i = 0; i < select.options.length; i++) {
				if (select.options[i].value == value) { found = true; break; }
			}
			if (!found && value) {
				const opt = document.createElement('option');
				opt.value = value;
				opt.textContent = value;
				select.appendChild(opt);
			}
			select.value = value || '';
		}

		// Populate all dropdowns in parallel, then set values
		Promise.all([
			fetch(window.location.origin + '/Work_logs/api/locations').then(res => res.json()),
			fetch(window.location.origin + '/Work_logs/api/buildings?location_name=' + encodeURIComponent(eq.location || '')).then(res => res.json()),
			fetch(window.location.origin + '/Work_logs/api/departments?building_id=' + encodeURIComponent(eq.building || '')).then(res => res.json()),
			fetch(window.location.origin + '/Work_logs/api/floors_by_department?department_id=' + encodeURIComponent(eq.department || '')).then(res => res.json()),
			fetch(window.location.origin + '/Work_logs/api/rooms?department_id=' + encodeURIComponent(eq.department || '') + '&floor=' + encodeURIComponent(eq.dept_floor || '')).then(res => res.json()),
			fetch(window.location.origin + '/Work_logs/api/vendor_names').then(res => res.json())
		]).then(([locations, buildings, departments, floors, rooms, vendors]) => {
			// Location
			const locSel = document.getElementById('edit_location');
			if (locSel) {
				locSel.innerHTML = '<option value="">Select Location</option>';
				locations.filter(loc => loc.operation !== 'delete').forEach(loc => {
					locSel.innerHTML += `<option value="${loc.id}">${loc.location_name}${loc.city ? ', ' + loc.city : ''}${loc.state ? ', ' + loc.state : ''}</option>`;
				});
				setDropdownValue(locSel, eq.location);
			}
			// Building
			const bldSel = document.getElementById('edit_building');
			if (bldSel) {
				bldSel.innerHTML = '<option value="">Select Building</option>';
				buildings.filter(bld => bld.operation !== 'delete').forEach(bld => {
					bldSel.innerHTML += `<option value="${bld.id}">${bld.building_name}</option>`;
				});
				setDropdownValue(bldSel, eq.building);
			}
			// Department
			const depSel = document.getElementById('edit_department');
			if (depSel) {
				depSel.innerHTML = '<option value="">Select Department</option>';
				departments.filter(dep => dep.operation !== 'delete').forEach(dep => {
					depSel.innerHTML += `<option value="${dep.id}">${dep.department_name}</option>`;
				});
				setDropdownValue(depSel, eq.department);
			}
			// Floor
			const floorSel = document.getElementById('edit_dept_floor');
			if (floorSel) {
				floorSel.innerHTML = '<option value="">Select Floor</option>';
				floors.filter(floor => floor.operation !== 'delete').forEach(floor => {
					floorSel.innerHTML += `<option value="${floor.value}">${floor.label}</option>`;
				});
				setDropdownValue(floorSel, eq.dept_floor);
			}
			// Room No./Lab
			const roomSel = document.getElementById('edit_room_lab');
			if (roomSel) {
				roomSel.innerHTML = '<option value="">Select Room/Lab</option>';
				rooms.filter(room => room.operation !== 'delete').forEach(room => {
					roomSel.innerHTML += `<option value="${room.value}">${room.label}</option>`;
				});
				setDropdownValue(roomSel, eq.room_lab);
			}
			// Vendor Name
			const vendorSelect = document.getElementById('edit_vendor_name');
			if (vendorSelect) {
				vendorSelect.innerHTML = '<option value="">Select Vendor</option>';
				vendors.filter(v => v.operation !== 'delete').forEach(v => {
					vendorSelect.innerHTML += `<option value="${v.vendor_name}">${v.vendor_name}</option>`;
				});
				setDropdownValue(vendorSelect, eq.vendor_name);
			}
			// Other fields - set if elements are present
			const elName = document.getElementById('edit_equipment_name');
			if (elName) elName.value = eq.equipment_name || '';
			const elSerial = document.getElementById('edit_serial_number');
			if (elSerial) elSerial.value = eq.serial_number || '';
			const elPurchase = document.getElementById('edit_purchase_date');
			if (elPurchase) elPurchase.value = eq.purchase_date || '';
			const elModel = document.getElementById('edit_model_no');
			if (elModel) elModel.value = eq.model_no || '';
			const elPrice = document.getElementById('edit_price');
			if (elPrice) elPrice.value = eq.price || '';
			const elGuarantee = document.getElementById('edit_guarantee');
			if (elGuarantee) elGuarantee.value = eq.guarantee || '';
			const elWarranty = document.getElementById('edit_warranty');
			if (elWarranty) elWarranty.value = eq.warranty || '';
			// New maintenance fields: populate frequency options first, then set selected value
			const editMaintEl = document.getElementById('edit_maintenance_type');
			const editFreqEl = document.getElementById('edit_maintenance_frequency');
			if (editMaintEl) {
				editMaintEl.value = eq.maintenance_type || '';
				// Populate frequency options for this maintenance type, then set the selected frequency
				populateFrequencyForMaintenance(editMaintEl.value, editFreqEl)
					.then(() => {
						if (editFreqEl) editFreqEl.value = eq.maintenance_frequency || '';
					})
					.catch(() => {
						// on error, still attempt to set value if possible
						if (editFreqEl) editFreqEl.value = eq.maintenance_frequency || '';
					});
			} else {
				if (editFreqEl) editFreqEl.value = eq.maintenance_frequency || '';
			}
			if (document.getElementById('edit_maintenance_start_date')) {
				let startDate = eq.maintenance_start_date || '';
				// Format start date if it contains GMT
				if (typeof startDate === 'string' && startDate.includes('GMT')) {
					const dateObj = new Date(startDate);
					startDate = dateObj.toISOString().slice(0,10);
				}
				document.getElementById('edit_maintenance_start_date').value = startDate;
			}
			// Populate generated dates in edit modal if present
			if (eq.maintenance_dates) {
				// Parse maintenance_dates - it might be a JSON string or an array
				let datesArray = eq.maintenance_dates;
				try {
					if (typeof eq.maintenance_dates === 'string') {
						datesArray = JSON.parse(eq.maintenance_dates);
					}
				} catch(e) {
					console.error("Failed to parse maintenance_dates:", e);
				}
				
				if (Array.isArray(datesArray)) {
					const container = document.getElementById('edit-maintenance-dates-container');
					if (container) {
						container.innerHTML = '';
						datesArray.forEach((d, i) => {
							// Format date if it contains GMT
							let formattedDate = d;
							if (typeof d === 'string' && d.includes('GMT')) {
								const dateObj = new Date(d);
								formattedDate = dateObj.toISOString().slice(0,10);
							}
							
							const div = document.createElement('div');
							div.innerHTML = `<label for="edit_maintenance_date_${i+1}" style="font-size:0.95rem;font-weight:600;margin-bottom:4px;">Maintenance #${i+1} Date:</label><input type="date" id="edit_maintenance_date_${i+1}" name="edit_maintenance_date_${i+1}" value="${formattedDate}" style="width:100%;padding:6px 8px;font-size:0.9rem;border-radius:4px;border:1px solid #b0bec5;">`;
							container.appendChild(div);
						});
						document.getElementById('edit-generated-dates').style.display = 'block';
					}
				}
			}
			if (document.getElementById('equipmentEditForm')) document.getElementById('equipmentEditForm').dataset.editId = id;
			if (document.getElementById('equipmentEditModal')) document.getElementById('equipmentEditModal').style.display = 'flex';
			if (document.getElementById('edit_equipment_name')) document.getElementById('edit_equipment_name').focus();
		});
	};

	window.closeEquipmentEditModal = function() {
		const form = document.getElementById('equipmentEditForm');
		form.reset();
		delete form.dataset.editId;
		document.getElementById('equipmentEditModal').style.display = 'none';
	};

	// Handle equipment edit submit
	const equipmentEditForm = document.getElementById('equipmentEditForm');
	if (equipmentEditForm) {
		equipmentEditForm.addEventListener('submit', function(e) {
			e.preventDefault();
			const id = this.dataset.editId;
			// safe reads for optional edit fields
			const getVal = (idStr) => {
				const el = document.getElementById(idStr);
				return el ? el.value.trim() : '';
			};
			const getOptionalVal = (idStr) => {
				const el = document.getElementById(idStr);
				return el ? el.value.trim() : '';
			};
			const container = document.getElementById('edit-maintenance-dates-container');
			const maintenance_dates = container ? Array.from(container.querySelectorAll('input[type="date"]')).map(i=>i.value).filter(v=>v) : [];

			const payload = {
				equipment_name: getVal('edit_equipment_name'),
				serial_number: getVal('edit_serial_number'),
				model_no: getOptionalVal('edit_model_no'),
				vendor_name: getVal('edit_vendor_name'),
				purchase_date: getVal('edit_purchase_date'),
				price: getVal('edit_price'),
				guarantee: getVal('edit_guarantee'),
				// guarantee removed
				warranty: getVal('edit_warranty'),
				maintenance_type: getOptionalVal('edit_maintenance_type'),
				maintenance_frequency: getOptionalVal('edit_maintenance_frequency'),
				maintenance_start_date: getOptionalVal('edit_maintenance_start_date'),
				maintenance_dates: maintenance_dates,
				operation: 'Update'
			};
			fetch(window.location.origin + '/Work_logs/api/equipments/' + id, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			})
			.then(res => res.json())
			.then(data => {
				showEquipmentMessage(data.message || 'Equipment updated!', 'success');
				fetchEquipments();
				window.closeEquipmentEditModal();
			})
			.catch(() => {
				showEquipmentMessage('Failed to update equipment!', 'error');
			});
		});
	}

	// Delete handler
	window.deleteEquipment = function(id) {
		if (confirm('Are you sure you want to delete this equipment?')) {
			const apiUrl = window.location.origin + '/Work_logs/api/equipments/' + id;
			fetch(apiUrl, {
				method: 'DELETE',
			})
			.then(response => response.json())
			.then(data => {
				showEquipmentMessage(data.message || 'Equipment deleted!', 'success');
				fetchEquipments();
			})
			.catch(() => {
				showEquipmentMessage('Failed to delete equipment!', 'error');
			});
		}
	};

	// Initial render
	fetchEquipments();
});

				// Populate Location and Building dropdowns from backend
				document.addEventListener('DOMContentLoaded', function() {
					var locationSelect = document.getElementById('location');
					var buildingSelect = document.getElementById('building');
					let allLocations = [];
					if (locationSelect) {
						fetch(window.location.origin + '/Work_logs/api/locations')
							.then(res => res.json())
							.then(locations => {
								allLocations = locations;
								locations.filter(loc => loc.operation !== 'delete').forEach(function(loc) {
									var opt = document.createElement('option');
									opt.value = loc.id; // Use location id as value
									opt.textContent = loc.location_name + (loc.city ? (', ' + loc.city) : '') + (loc.state ? (', ' + loc.state) : '');
									locationSelect.appendChild(opt);
								});
							});
					}
							var departmentSelect = document.getElementById('department');
							if (locationSelect && buildingSelect) {
								locationSelect.addEventListener('change', function() {
									// Clear previous buildings and departments
									buildingSelect.innerHTML = '<option value="">Select Building</option>';
									if (departmentSelect) departmentSelect.innerHTML = '<option value="">Select Department</option>';
									var selectedLocId = locationSelect.value;
									if (!selectedLocId) return;
									// Fetch buildings for selected location id
									fetch(window.location.origin + '/Work_logs/api/buildings?location_name=' + encodeURIComponent(selectedLocId))
										.then(res => res.json())
										.then(buildings => {
											buildings.filter(bld => bld.operation !== 'delete').forEach(function(bld) {
												var opt = document.createElement('option');
												opt.value = bld.id;
												opt.textContent = bld.building_name;
												buildingSelect.appendChild(opt);
											});
										});
								});
										buildingSelect.addEventListener('change', function() {
											// Clear previous departments, floors, and rooms
											if (departmentSelect) departmentSelect.innerHTML = '<option value="">Select Department</option>';
											if (floorSelect) floorSelect.innerHTML = '<option value="">Select Floor</option>';
											if (roomSelect) roomSelect.innerHTML = '<option value="">Select Room/Lab</option>';
											var selectedBldId = buildingSelect.value;
											if (!selectedBldId) return;
											// Fetch departments for selected building id
											fetch(window.location.origin + '/Work_logs/api/departments?building_id=' + encodeURIComponent(selectedBldId))
												.then(res => res.json())
												.then(departments => {
													departments.filter(dep => dep.operation !== 'delete').forEach(function(dep) {
														var opt = document.createElement('option');
														opt.value = dep.id;
														opt.textContent = dep.department_name;
														departmentSelect.appendChild(opt);
													});
												});
										});
										// Populate Floor dropdown based on Department
										if (departmentSelect && floorSelect) {
											departmentSelect.addEventListener('change', function() {
												floorSelect.innerHTML = '<option value="">Select Floor</option>';
												roomSelect.innerHTML = '<option value="">Select Room/Lab</option>';
												var selectedDeptId = departmentSelect.value;
												if (!selectedDeptId) return;
												// Fetch floors for selected department id (use department endpoint)
												fetch(window.location.origin + '/Work_logs/api/floors_by_department?department_id=' + encodeURIComponent(selectedDeptId))
													.then(res => res.json())
													.then(floors => {
														(Array.isArray(floors) ? floors : []).forEach(function(floor) {
															var opt = document.createElement('option');
															opt.value = floor.value;
															opt.textContent = floor.label;
															floorSelect.appendChild(opt);
														});
													});
											});
										}
										// Populate Room/Lab dropdown based on Floor
										if (floorSelect && roomSelect) {
											floorSelect.addEventListener('change', function() {
												roomSelect.innerHTML = '<option value="">Select Room/Lab</option>';
												var selectedDeptId = departmentSelect.value;
												var selectedFloor = floorSelect.value;
												if (!selectedDeptId || !selectedFloor) return;
												// Fetch rooms for selected department id and floor
												fetch(window.location.origin + '/Work_logs/api/rooms?department_id=' + encodeURIComponent(selectedDeptId) + '&floor=' + encodeURIComponent(selectedFloor))
													.then(res => res.json())
													.then(rooms => {
														rooms.filter(room => room.operation !== 'delete').forEach(function(room) {
															var opt = document.createElement('option');
															opt.value = room.value;
															opt.textContent = room.label;
															roomSelect.appendChild(opt);
														});
													});
											});
										}
							}
				});

	var floorSelect = document.getElementById('dept_floor');
	var roomSelect = document.getElementById('room_lab');
		// Collapsible Purchase Details
		document.addEventListener('DOMContentLoaded', function() {
			var toggleBtn = document.getElementById('purchaseDetailsToggle');
			var section = document.getElementById('purchaseDetailsSection');
			var arrow = document.getElementById('purchaseDetailsArrow');
			if (toggleBtn && section && arrow) {
				let open = true;
				toggleBtn.onclick = function() {
					open = !open;
					section.style.display = open ? 'block' : 'none';
					arrow.innerHTML = open ? '&#9650;' : '&#9660;';
				};
				// Start open
				section.style.display = 'block';
				arrow.innerHTML = '&#9650;';
			}
		});
	