// --- Data Model ---
let staffData = [];
let editingStaffId = null;

// Import Supabase client
import { supabase } from '../supabase-config.js';

// Error handling helper
function handleSupabaseError(error, operation) {
  console.error(`Supabase ${operation} error:`, error);
  return null;
}

// Staff API Functions
async function getStaff() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'staff')
      .order('full_name', { ascending: true });
    
    if (error) {
      return handleSupabaseError(error, 'fetch staff');
    }
    
    // Transform data to match expected format
    return (data || []).map(staff => ({
      id: staff.id,
      name: staff.full_name,
      email: staff.email,
      dept: staff.department,
      tier: staff.tier || 'Level 0',
      status: staff.status || 'Offline'
    }));
  } catch (error) {
    return handleSupabaseError(error, 'fetch staff');
  }
}

async function saveStaffData(staff) {
  try {
    // Convert back to users table format
    const usersData = staff.map(s => ({
      id: s.id,
      full_name: s.name,
      email: s.email,
      department: s.dept,
      role: 'staff',
      tier: s.tier,
      status: s.status
    }));
    
    const { data, error } = await supabase
      .from('users')
      .upsert(usersData, { onConflict: ['id'] });
    
    if (error) {
      return handleSupabaseError(error, 'save staff');
    }
    
    return data;
  } catch (error) {
    return handleSupabaseError(error, 'save staff');
  }
}

async function deleteStaffFromDB(staffId) {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', staffId);
    
    if (error) {
      return handleSupabaseError(error, 'delete staff');
    }
    
    return true;
  } catch (error) {
    return handleSupabaseError(error, 'delete staff');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initData();
  initResizers();
  initFilters();
  renderTable();
});

// Initialize data from Supabase
async function initData() {
  try {
    staffData = await getStaff();
  } catch (error) {
    console.error('Error initializing staff data:', error);
    // Fallback to empty array if Supabase fails
    staffData = [];
  }
}

function syncData() {
  // For backward compatibility, still save to localStorage
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
async function deleteStaff(id) {
  if (confirm("Are you sure you want to remove this staff member?")) {
    try {
      // Delete from Supabase
      await deleteStaffFromDB(id);
      
      // Update local data
      staffData = staffData.filter(s => s.id !== id);
      syncData();
      renderTable();
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Error deleting staff member. Please try again.');
    }
  }
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