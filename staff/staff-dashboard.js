// staff-dashboard.js — uses window.supabase initialised in HTML (no ES module imports needed)

// 1. GLOBAL FUNCTIONS (accessible from inline onclick handlers)
function handleLogout() {
    localStorage.clear();
    window.location.href = '../login.html';
}
window.handleLogout = handleLogout;

function switchTab(tabType) {
    const ccdTab = document.getElementById('tab-ccd');
    const myTab = document.getElementById('tab-my');
    if (!ccdTab || !myTab) return;
    if (tabType === 'ccd') {
        ccdTab.classList.add('active-tab');    ccdTab.classList.remove('inactive-tab');
        myTab.classList.add('inactive-tab');   myTab.classList.remove('active-tab');
    } else {
        myTab.classList.add('active-tab');     myTab.classList.remove('inactive-tab');
        ccdTab.classList.add('inactive-tab');  ccdTab.classList.remove('active-tab');
    }
    applyFiltersAndRender();
}
window.switchTab = switchTab;

// 2. UI INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    initAuth();
    initEventListeners();
    await loadTickets();
});

function initAuth() {
    const userInitial  = localStorage.getItem('userInitial');
    const userFullName = localStorage.getItem('userFullName');
    const userEmail    = localStorage.getItem('userEmail');

    const loginBtn      = document.getElementById('login-nav-btn');
    const profileWrapper = document.getElementById('profile-menu-wrapper');

    if (userInitial) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (profileWrapper) {
            profileWrapper.style.display = 'block';
            if (!profileWrapper.querySelector('.user-profile-circle')) {
                const circle = document.createElement('div');
                circle.className = 'user-profile-circle';
                circle.innerText = userInitial;
                circle.onclick = (e) => {
                    e.stopPropagation();
                    const menu = document.getElementById('dropdown-menu');
                    if (menu) menu.classList.toggle('show');
                };
                profileWrapper.prepend(circle);
            }
            const nameEl  = document.getElementById('user-display-name');
            const emailEl = document.getElementById('user-display-email');
            if (nameEl)  nameEl.innerText  = userFullName || 'User';
            if (emailEl) emailEl.innerText = userEmail    || '';
        }
    }
}

function initEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', applyFiltersAndRender);

    const statusDropdown = document.querySelector('.status-dropdown');
    if (statusDropdown) statusDropdown.addEventListener('change', applyFiltersAndRender);

    window.addEventListener('click', (e) => {
        const menu = document.getElementById('dropdown-menu');
        if (menu && !e.target.closest('.profile-container')) menu.classList.remove('show');
    });
}

// 3. DATA
let allTicketsCache = [];

async function getTickets() {
    try {
        const { data, error } = await window.supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) { console.error('Error fetching tickets:', error); return []; }
        return data || [];
    } catch (err) {
        console.error('Error fetching tickets:', err);
        return [];
    }
}

async function loadTickets() {
    try {
        allTicketsCache = await getTickets();
        applyFiltersAndRender();
    } catch (err) {
        console.error('Error loading tickets:', err);
    }
}
window._loadTickets = loadTickets;

// 4. FILTERING & RENDERING
function applyFiltersAndRender() {
    const searchTerm   = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const statusFilter = document.querySelector('.status-dropdown')?.value || '';
    const tabType      = getCurrentTab();

    let tickets = filterTicketsByTab(allTicketsCache, tabType);

    if (statusFilter) {
        tickets = tickets.filter(t => t.status === statusFilter);
    }

    if (searchTerm) {
        tickets = tickets.filter(t =>
            (t.id           && String(t.id).toLowerCase().includes(searchTerm)) ||
            (t.subject      && t.subject.toLowerCase().includes(searchTerm))    ||
            (t.reporter_name && t.reporter_name.toLowerCase().includes(searchTerm)) ||
            (t.email        && t.email.toLowerCase().includes(searchTerm))
        );
    }

    renderTickets(tickets);
    updateStats(tickets);
}

function renderTickets(tickets) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-records">No Records to Display</td></tr>';
        return;
    }
    tickets.forEach(ticket => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ticket.ticket_id || ticket.id}</td>
            <td>${ticket.subject || ''}</td>
            <td>${formatDate(ticket.created_at)}</td>
            <td>${ticket.reporter_name || ticket.reporter_email || 'Unknown'}</td>
            <td><span class="status-pill ${getStatusClass(ticket.status)}">${formatStatus(ticket.status)}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function filterTicketsByTab(tickets, tabType) {
    if (tabType === 'ccd') {
        // Show all accessible tickets (RLS already scopes to dept/assigned)
        return tickets;
    } else {
        // "My Tickets" — assigned to this staff member or CC'd on
        const userEmail = (localStorage.getItem('userEmail') || '').toLowerCase();
        return tickets.filter(t =>
            (Array.isArray(t.cc_emails) && t.cc_emails.map(e => e.toLowerCase()).includes(userEmail))
        );
    }
}

function getCurrentTab() {
    const ccdTab = document.getElementById('tab-ccd');
    return (ccdTab && ccdTab.classList.contains('active-tab')) ? 'ccd' : 'my';
}

// 5. STATS
function updateStats(filteredTickets) {
    const allCount     = filteredTickets.length;
    const pendingCount = filteredTickets.filter(t => t.status === 'in_progress' || t.status === 'open').length;
    const closedCount  = filteredTickets.filter(t => t.status === 'resolved').length;
    const c1 = document.querySelector('.stat-card:nth-child(1) .stat-number');
    const c2 = document.querySelector('.stat-card:nth-child(2) .stat-number');
    const c3 = document.querySelector('.stat-card:nth-child(3) .stat-number');
    if (c1) c1.textContent = allCount;
    if (c2) c2.textContent = pendingCount;
    if (c3) c3.textContent = closedCount;
}

// 6. UTILITIES
function formatStatus(status) {
    const map = { open: 'Open', in_progress: 'In Progress', breached: 'Breached', resolved: 'Resolved' };
    return map[status] || status;
}

function getStatusClass(status) {
    if (status === 'in_progress' || status === 'open') return 'status-progress';
    if (status === 'breached')  return 'status-breached';
    if (status === 'resolved')  return 'status-resolved';
    return 'status-progress';
}

function formatDate(dateString) {
    return dateString ? new Date(dateString).toLocaleDateString() : '';
}
