// Import Supabase client
import { supabase } from '../supabase-config.js';

// 1. GLOBAL LOGOUT FUNCTION - Must be outside any blocks
function handleLogout() {
    console.log("Logging out...");
    localStorage.clear(); // This wipes ALL login data at once
    window.location.href = "../login.html"; // Redirect to login page
}
window.handleLogout = handleLogout;

// 2. UI INITIALIZATION
document.addEventListener("DOMContentLoaded", async () => {
    await initAuth();
    initEventListeners();
    await loadTickets();
});

// Initialize authentication state
async function initAuth() {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const userInitial = localStorage.getItem("userInitial");
    const userFullName = localStorage.getItem("userFullName");
    const userEmail = localStorage.getItem("userEmail");
    const userRole = localStorage.getItem("userRole");

    const authSection = document.getElementById("auth-section");
    const loginBtn = document.getElementById("login-nav-btn");
    const profileWrapper = document.getElementById("profile-menu-wrapper");

    if (userInitial && authSection) {
        if (loginBtn) loginBtn.style.display = "none";
        if (profileWrapper) {
            profileWrapper.style.display = "block";

            // Inject Initial
            const circle = profileWrapper.querySelector(".user-profile-circle");
            if (!circle) {
                const newCircle = document.createElement("div");
                newCircle.className = "user-profile-circle";
                newCircle.innerText = userInitial;
                newCircle.onclick = (e) => {
                    e.stopPropagation();
                    document
                        .getElementById("dropdown-menu")
                        .classList.toggle("show");
                };
                profileWrapper.prepend(newCircle);
            }

            // Inject Name and Email
            document.getElementById("user-display-name").innerText =
                userFullName || "User";
            document.getElementById("user-display-email").innerText =
                userEmail || "";
        }
    }
}

// Initialize event listeners
function initEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Status filter
    const statusDropdown = document.querySelector('.status-dropdown');
    if (statusDropdown) {
        statusDropdown.addEventListener('change', handleStatusFilter);
    }

    // Tab switching
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.id === 'tab-ccd' ? 'ccd' : 'my'));
    });

    // Close menu when clicking outside
    window.addEventListener("click", () => {
        const menu = document.getElementById("dropdown-menu");
        if (menu) menu.classList.remove("show");
    });
}

// Tickets API Functions
async function getTickets() {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching tickets:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error fetching tickets:', error);
        return [];
    }
}

// Load and render tickets
async function loadTickets() {
    try {
        const tickets = await getTickets();
        renderTickets(tickets);
        updateStats(tickets);
    } catch (error) {
        console.error('Error loading tickets:', error);
    }
}

// Render tickets in the table
function renderTickets(tickets) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    if (tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-records">No Records to Display</td></tr>';
        return;
    }

    const tabType = getCurrentTab();
    const filteredTickets = filterTicketsByTab(tickets, tabType);
    
    filteredTickets.forEach(ticket => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ticket.id}</td>
            <td>${ticket.subject}</td>
            <td>${formatDate(ticket.created_at)}</td>
            <td>${ticket.reporter_name || ticket.email}</td>
            <td><span class="status-pill ${getStatusClass(ticket.status)}">${ticket.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Filter tickets based on current tab
function filterTicketsByTab(tickets, tabType) {
    const userEmail = localStorage.getItem("userEmail");
    const userFullName = localStorage.getItem("userFullName");
    
    if (tabType === 'ccd') {
        // Tickets where user is CC'd
        return tickets.filter(ticket => 
            ticket.cc && ticket.cc.includes(userEmail)
        );
    } else {
        // My tickets - assigned to user
        return tickets.filter(ticket => 
            ticket.assignee && ticket.assignee.includes(userFullName)
        );
    }
}

// Get current active tab
function getCurrentTab() {
    const ccdTab = document.getElementById('tab-ccd');
    return ccdTab.classList.contains('active-tab') ? 'ccd' : 'my';
}

// Switch between tabs
function switchTab(tabType) {
    const ccdTab = document.getElementById('tab-ccd');
    const myTab = document.getElementById('tab-my');
    
    if (tabType === 'ccd') {
        ccdTab.classList.add('active-tab');
        ccdTab.classList.remove('inactive-tab');
        myTab.classList.add('inactive-tab');
        myTab.classList.remove('active-tab');
    } else {
        myTab.classList.add('active-tab');
        myTab.classList.remove('inactive-tab');
        ccdTab.classList.add('inactive-tab');
        ccdTab.classList.remove('active-tab');
    }
    
    loadTickets();
}
window.switchTab = switchTab;
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    // Implementation would filter tickets based on search term
    loadTickets();
}

// Handle status filter
function handleStatusFilter() {
    const statusFilter = document.querySelector('.status-dropdown').value;
    // Implementation would filter tickets based on status
    loadTickets();
}

// Update statistics
function updateStats(tickets) {
    const allCount = tickets.length;
    const pendingCount = tickets.filter(t => t.status === 'In Progress').length;
    const closedCount = tickets.filter(t => t.status === 'Resolved').length;
    
    document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = allCount;
    document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = pendingCount;
    document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = closedCount;
}

// Utility functions
function getStatusClass(status) {
    if (status === 'In Progress') return 'status-progress';
    if (status === 'Breached') return 'status-breached';
    if (status === 'Resolved') return 'status-resolved';
    return 'status-progress';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}
