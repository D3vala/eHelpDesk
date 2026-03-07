const loggedInAdmin = {
  firstName: "Ven",
  lastName: "Pascual",
};

// Navigation State
let currentFragment = "dashboard";

function updateAdminProfile() {
  const welcomeElement = document.getElementById("welcome-message");
  welcomeElement.textContent = `Welcome back, ${loggedInAdmin.firstName}.`;

  const avatarElement = document.getElementById("user-avatar");
  const initials = (
    loggedInAdmin.firstName.charAt(0) + loggedInAdmin.lastName.charAt(0)
  ).toUpperCase();
  avatarElement.textContent = initials;
}

function setupWorkloadFilter() {
  const filterDropdown = document.getElementById("level-filter");
  const workloadRows = document.querySelectorAll(".workload-row");
  const emptyStateRow = document.getElementById("empty-state-row");

  filterDropdown.addEventListener("change", function (e) {
    const selectedLevel = e.target.value;
    let visibleCount = 0;

    workloadRows.forEach((row) => {
      if (selectedLevel === "all") {
        row.style.display = "";
        visibleCount++;
      } else {
        if (row.getAttribute("data-level") === selectedLevel) {
          row.style.display = "";
          visibleCount++;
        } else {
          row.style.display = "none";
        }
      }
    });

    if (visibleCount === 0) {
      emptyStateRow.style.display = "table-row";
    } else {
      emptyStateRow.style.display = "none";
    }
  });
}

// Fragment Navigation Logic
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const fragments = document.querySelectorAll(".fragment");

  // Handle navigation clicks
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      
      const targetSection = item.getAttribute("data-section");
      navigateToFragment(targetSection);
    });
  });

  // Handle URL hash changes (browser back/forward buttons)
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "") || "dashboard";
    navigateToFragment(hash);
  });

  // Initialize with current hash or default to dashboard
  const initialHash = window.location.hash.replace("#", "") || "dashboard";
  navigateToFragment(initialHash);
}

function navigateToFragment(section) {
  // Update URL hash without scrolling
  if (window.location.hash !== `#${section}`) {
    history.replaceState(null, null, `#${section}`);
  }

  // Update navigation active states
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
    if (item.getAttribute("data-section") === section) {
      item.classList.add("active");
    }
  });

  // Show/hide fragments
  document.querySelectorAll(".fragment").forEach(fragment => {
    if (fragment.id === `fragment-${section}`) {
      fragment.classList.add("active");
      currentFragment = section;
      
      // Initialize fragment-specific functionality
      if (section === "dashboard") {
        initDashboard();
      } else if (section === "tickets") {
        initTickets();
      } else if (section === "users") {
        initUsers();
      }
    } else {
      fragment.classList.remove("active");
    }
  });
}

// Fragment-specific initialization functions
function initDashboard() {
  updateAdminProfile();
  setupWorkloadFilter();
}

function initTickets() {
  // Initialize ticket directory functionality
  setupTicketFilters();
  renderTicketTable();
  setupTicketModal();
}

function initUsers() {
  // Initialize user management functionality
  setupUserFilters();
  renderUserTable();
  setupUserModal();
}

// Ticket Directory Functions (simplified versions)
function setupTicketFilters() {
  const searchInput = document.getElementById("search-input");
  const statusFilter = document.getElementById("status-filter");
  const assigneeFilter = document.getElementById("assignee-filter");

  if (searchInput) searchInput.addEventListener("input", renderTicketTable);
  if (statusFilter) statusFilter.addEventListener("change", renderTicketTable);
  if (assigneeFilter) assigneeFilter.addEventListener("change", renderTicketTable);
}

function renderTicketTable() {
  // This would render the ticket table - simplified for now
  const tbody = document.getElementById("ticket-table-body");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td>#260219-001</td>
        <td>Password Reset Request</td>
        <td>kgabriel@mymail.mapua.edu.ph</td>
        <td>Phoenix (L0)</td>
        <td>22:45:30:120</td>
        <td style="text-align: center;"><span class="status-pill status-progress">In Progress</span></td>
        <td style="text-align: center;"><button class="btn-action">More Details</button></td>
      </tr>
    `;
  }
}

function setupTicketModal() {
  // Ticket modal functions would go here
  window.closeModal = function() {
    const modal = document.getElementById("ticket-modal");
    if (modal) modal.classList.remove("active");
  };
  
  window.switchReplyTab = function(mode) {
    // Tab switching logic
  };
  
  window.updateCharCount = function() {
    // Character count logic
  };
  
  window.submitMessage = function() {
    // Submit message logic
  };
  
  window.escalateTicket = function() {
    // Escalate ticket logic
  };
  
  window.saveTicketUpdates = function() {
    // Save ticket updates logic
  };
}

// User Management Functions (simplified versions)
function setupUserFilters() {
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const departmentFilter = document.getElementById("departmentFilter");

  if (searchInput) searchInput.addEventListener("input", renderUserTable);
  if (statusFilter) statusFilter.addEventListener("change", renderUserTable);
  if (departmentFilter) departmentFilter.addEventListener("change", renderUserTable);
}

function renderUserTable() {
  // This would render the user table - simplified for now
  const tbody = document.getElementById("staffTableBody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td>
          <div class="staff-cell">
            <div class="staff-avatar">PH</div>
            <span class="staff-name">Phoenix</span>
          </div>
        </td>
        <td>kplguinto@mymail.mapua.edu.ph</td>
        <td>SOIT</td>
        <td>Level 0</td>
        <td>
          <div class="availability online">
            <i class="fa-solid fa-circle"></i> 
            <span class="avail-text">Online</span>
          </div>
        </td>
        <td>
          <div class="action-group" style="justify-content: center;">
            <button class="icon-btn" title="Edit Staff"><i class="fa-solid fa-pencil"></i></button>
            <button class="icon-btn" title="Delete Staff"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }
}

function setupUserModal() {
  // User modal functions would go here
  window.openAddStaffModal = function() {
    const modal = document.getElementById("addStaffModal");
    if (modal) modal.classList.add("active");
  };
  
  window.closeAddStaffModal = function() {
    const modal = document.getElementById("addStaffModal");
    if (modal) modal.classList.remove("active");
  };
  
  window.saveStaff = function(e) {
    e.preventDefault();
    // Save staff logic
    closeAddStaffModal();
  };
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
});

// Load staff data from localStorage
const savedStaff = localStorage.getItem("eHelpDesk_staffData");
if (savedStaff) {
  const staffData = JSON.parse(savedStaff);
  // This would be used by the user management fragment
}
