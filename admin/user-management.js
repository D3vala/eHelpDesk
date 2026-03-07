// --- Data Model ---
let staffData = [
  { id: '1', name: 'Phoenix', email: 'kplguinto@mymail.mapua.edu.ph', dept: 'SOIT', tier: 'Level 0', status: 'Online' },
  { id: '2', name: 'Dominic', email: 'mdpbacalla@mymail.mapua.edu.ph', dept: 'SOIT', tier: 'Level 1', status: 'Online' },
  { id: '3', name: 'Chloie', email: 'cmmbronola@mymail.mapua.edu.ph', dept: 'SOIT', tier: 'Level 2', status: 'Online' },
  { id: '4', name: 'Naveen', email: 'njpablo@mymail.mapua.edu.ph', dept: 'SOIT', tier: 'Level 3', status: 'Offline' }
];

let editingStaffId = null;

document.addEventListener('DOMContentLoaded', () => {
  initData();
  initResizers();
  initFilters();
  renderTable();
});

// Sync Data with LocalStorage so Dashboard can read it
function initData() {
  const stored = localStorage.getItem('eHelpDesk_staffData');
  if (stored) {
    staffData = JSON.parse(stored);
  } else {
    // Save initial mock data if none exists
    localStorage.setItem('eHelpDesk_staffData', JSON.stringify(staffData));
  }
}

function syncData() {
  localStorage.setItem('eHelpDesk_staffData', JSON.stringify(staffData));
}

// Generate Initials
function getInitials(name) {
  if (!name) return '--';
  const parts = name.split(' ').filter(n => n.length > 0);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// --- Core Rendering Logic ---
function renderTable() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;
  const deptFilter = document.getElementById('departmentFilter').value;

  // Filter
  let filtered = staffData.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm) || s.email.toLowerCase().includes(searchTerm);
    const matchStatus = statusFilter === 'All Status' || s.status === statusFilter;
    const matchDept = deptFilter === 'All Departments' || s.dept === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  // Sort consistently: Tier Level First, then Alphabetical Name Second
  filtered.sort((a, b) => {
    const tierCompare = a.tier.localeCompare(b.tier);
    if (tierCompare !== 0) return tierCompare;
    return a.name.localeCompare(b.name);
  });

  const tbody = document.getElementById('staffTableBody');
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr id="emptyStateRow">
        <td colspan="6" style="text-align: center; padding: 48px; color: #888; font-size: 14px;">
          <i class="fa-solid fa-user-xmark" style="font-size: 32px; margin-bottom: 16px; display: block; color: #ccc;"></i>
          No staff members found matching your filters.
        </td>
      </tr>
    `;
    return;
  }

  // Render items
  filtered.forEach(s => {
    const initials = getInitials(s.name);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="staff-cell">
          <div class="staff-avatar">${initials}</div>
          <span class="staff-name">${s.name}</span>
        </div>
      </td>
      <td title="${s.email}">${s.email}</td>
      <td>${s.dept}</td>
      <td>${s.tier}</td>
      <td>
        <div class="availability ${s.status.toLowerCase()}">
          <i class="${s.status === 'Online' ? 'fa-solid' : 'fa-regular'} fa-circle"></i> 
          <span class="avail-text">${s.status}</span>
        </div>
      </td>
      <td>
        <div class="action-group" style="justify-content: center;">
          <button class="icon-btn" title="Edit Staff" onclick="openEditStaffModal('${s.id}')"><i class="fa-solid fa-pencil"></i></button>
          <button class="icon-btn" title="Delete Staff" onclick="deleteStaff('${s.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function initFilters() {
  document.getElementById('searchInput').addEventListener('input', renderTable);
  document.getElementById('statusFilter').addEventListener('change', renderTable);
  document.getElementById('departmentFilter').addEventListener('change', renderTable);
}

// --- Actions Logic ---
function deleteStaff(id) {
  if (confirm("Are you sure you want to remove this staff member?")) {
    staffData = staffData.filter(s => s.id !== id);
    syncData();
    renderTable();
  }
}

// --- Modal Logic ---
function openAddStaffModal() {
  editingStaffId = null;
  document.getElementById('modalTitle').textContent = 'Add New Staff';
  document.getElementById('saveStaffBtn').textContent = 'Add Staff';
  document.getElementById('addStaffForm').reset();
  document.getElementById('addStaffModal').classList.add('active');
}

function openEditStaffModal(id) {
  editingStaffId = id;
  const staff = staffData.find(s => s.id === id);
  if (!staff) return;

  document.getElementById('modalTitle').textContent = 'Edit Staff';
  document.getElementById('saveStaffBtn').textContent = 'Save Changes';
  
  document.getElementById('newStaffName').value = staff.name;
  document.getElementById('newStaffEmail').value = staff.email;
  document.getElementById('newStaffDept').value = staff.dept;
  document.getElementById('newStaffTier').value = staff.tier;

  document.getElementById('addStaffModal').classList.add('active');
}

function closeAddStaffModal() {
  document.getElementById('addStaffModal').classList.remove('active');
}

function saveStaff(e) {
  e.preventDefault();
  
  const name = document.getElementById('newStaffName').value.trim();
  const email = document.getElementById('newStaffEmail').value.trim();
  const dept = document.getElementById('newStaffDept').value;
  const tier = document.getElementById('newStaffTier').value;

  if (editingStaffId) {
    // Edit existing
    const staff = staffData.find(s => s.id === editingStaffId);
    if (staff) {
      staff.name = name;
      staff.email = email;
      staff.dept = dept;
      staff.tier = tier;
    }
  } else {
    // Add new
    const newId = Date.now().toString();
    staffData.push({
      id: newId,
      name: name,
      email: email,
      dept: dept,
      tier: tier,
      status: 'Offline' // Default status for newly created staff
    });
  }

  syncData(); // Save to local storage for Dashboard use
  closeAddStaffModal();
  renderTable();
}

// --- Table Column Resizer Script ---
function initResizers() {
  const table = document.querySelector('.user-table');
  const cols = table.querySelectorAll('th');

  [].forEach.call(cols, function (col, index) {
    if (index === cols.length - 1) return; // Skip last col

    const resizer = document.createElement('div');
    resizer.classList.add('resizer');
    col.appendChild(resizer);

    let x = 0;
    let w = 0;

    const mouseDownHandler = function (e) {
      x = e.clientX;
      const styles = window.getComputedStyle(col);
      w = parseInt(styles.width, 10);
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
      resizer.classList.add('resizing');
    };

    const mouseMoveHandler = function (e) {
      const dx = e.clientX - x;
      col.style.width = `${w + dx}px`;
    };

    const mouseUpHandler = function () {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      resizer.classList.remove('resizing');
    };

    resizer.addEventListener('mousedown', mouseDownHandler);
  });
}