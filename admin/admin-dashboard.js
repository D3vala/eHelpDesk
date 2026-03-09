// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & STATE
// ─────────────────────────────────────────────────────────────────────────────

const loggedInAdmin = {
  firstName: "Ven",
  lastName: "Pascual",
};

const TICKETS_KEY  = "eHelpDesk_tickets";
const STAFF_KEY    = "eHelpDesk_staffData";

// Tracks which ticket is currently open in the modal
let activeTicketId = null;
// Tracks which reply mode is active: 'sms' | 'internal'
let activeReplyMode = "sms";
// Tracks edit mode for the staff modal
let editingStaffId = null;
// Navigation state
let currentFragment = "dashboard";

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL-STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getTickets() {
  const raw = localStorage.getItem(TICKETS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveTickets(tickets) {
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
}

function getStaff() {
  const raw = localStorage.getItem(STAFF_KEY);
  if (raw) return JSON.parse(raw);
  // Seed default staff on first load
  const defaults = [
    { id: "staff-1", name: "Phoenix",  email: "kplguinto@mymail.mapua.edu.ph", dept: "SOIT",      tier: "Level 0", status: "Online"  },
    { id: "staff-2", name: "Dominic",  email: "dominic@mymail.mapua.edu.ph",   dept: "DOIT",      tier: "Level 1", status: "Online"  },
    { id: "staff-3", name: "Chloie",   email: "chloie@mymail.mapua.edu.ph",    dept: "SOIT",      tier: "Level 2", status: "Online"  },
    { id: "staff-4", name: "Naveen",   email: "naveen@mymail.mapua.edu.ph",    dept: "Registrar", tier: "Level 3", status: "Offline" },
  ];
  saveStaffData(defaults);
  return defaults;
}

function saveStaffData(staff) {
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
}

function getInitials(name) {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

function initNavigation() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToFragment(item.getAttribute("data-section"));
    });
  });

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "") || "dashboard";
    navigateToFragment(hash);
  });

  const initialHash = window.location.hash.replace("#", "") || "dashboard";
  navigateToFragment(initialHash);
}

function navigateToFragment(section) {
  if (window.location.hash !== `#${section}`) {
    history.replaceState(null, null, `#${section}`);
  }

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.getAttribute("data-section") === section);
  });

  document.querySelectorAll(".fragment").forEach(fragment => {
    const isTarget = fragment.id === `fragment-${section}`;
    fragment.classList.toggle("active", isTarget);
    if (isTarget) {
      currentFragment = section;
      if (section === "dashboard") initDashboard();
      else if (section === "tickets") initTickets();
      else if (section === "users")   initUsers();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD FRAGMENT
// ─────────────────────────────────────────────────────────────────────────────

function initDashboard() {
  updateAdminProfile();
  updateDashboardKPIs();
  renderWorkloadTable();
  setupWorkloadFilter();
}

function updateAdminProfile() {
  const welcome = document.getElementById("welcome-message");
  if (welcome) welcome.textContent = `Welcome back, ${loggedInAdmin.firstName}.`;

  const avatar = document.getElementById("user-avatar");
  if (avatar) {
    avatar.textContent = (
      loggedInAdmin.firstName.charAt(0) + loggedInAdmin.lastName.charAt(0)
    ).toUpperCase();
  }
}

function updateDashboardKPIs() {
  const tickets  = getTickets();
  const total    = tickets.length;
  const urgent   = tickets.filter(t => t.status === "Breached").length;

  // Quarterly volume — total tickets in localStorage
  const qvEl = document.querySelector(".kpi-card:nth-child(1) .kpi-value");
  if (qvEl) qvEl.textContent = total.toLocaleString();

  // Urgent escalation count
  const ueEl = document.querySelector(".kpi-card:nth-child(3) .kpi-value");
  if (ueEl) ueEl.textContent = String(urgent).padStart(2, "0");
}

function renderWorkloadTable() {
  const tbody = document.getElementById("workload-tbody");
  if (!tbody) return;

  const staff   = getStaff();
  const tickets = getTickets();

  // Count active tickets per assignee name
  const countMap = {};
  tickets.forEach(t => {
    const name = (t.assignee || "").split(" ")[0]; // first word
    if (name && name !== "Unassigned") {
      countMap[name] = (countMap[name] || 0) + 1;
    }
  });

  if (staff.length === 0) {
    tbody.innerHTML = `<tr id="empty-state-row"><td colspan="4">No staff found for this level.</td></tr>`;
    return;
  }

  tbody.innerHTML = staff.map(s => {
    const count      = countMap[s.name] || 0;
    const isOnline   = s.status === "Online";
    const dotClass   = isOnline ? "online" : "offline";
    const tierLabel  = s.tier;
    return `
      <tr class="workload-row" data-level="${tierLabel}">
        <td>${s.name}</td>
        <td>${tierLabel}</td>
        <td>${count} Ticket${count !== 1 ? "s" : ""}</td>
        <td>
          <div class="status-indicator">
            <div class="dot ${dotClass}"></div>
            ${s.status}
          </div>
        </td>
      </tr>`;
  }).join("") + `<tr id="empty-state-row" style="display:none;"><td colspan="4">No staff found for this level.</td></tr>`;
}

function setupWorkloadFilter() {
  const filterDropdown = document.getElementById("level-filter");
  if (!filterDropdown) return;

  // Remove old listener by cloning the node
  const fresh = filterDropdown.cloneNode(true);
  filterDropdown.parentNode.replaceChild(fresh, filterDropdown);

  fresh.addEventListener("change", function () {
    const selected = this.value;
    const rows      = document.querySelectorAll(".workload-row");
    const emptyRow  = document.getElementById("empty-state-row");
    let visible     = 0;

    rows.forEach(row => {
      const show = selected === "all" || row.getAttribute("data-level") === selected;
      row.style.display = show ? "" : "none";
      if (show) visible++;
    });

    if (emptyRow) emptyRow.style.display = visible === 0 ? "table-row" : "none";
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TICKET DIRECTORY FRAGMENT
// ─────────────────────────────────────────────────────────────────────────────

function initTickets() {
  setupTicketFilters();
  renderTicketTable();
  setupTicketModal();
}

function setupTicketFilters() {
  const searchInput    = document.getElementById("search-input");
  const statusFilter   = document.getElementById("status-filter");
  const assigneeFilter = document.getElementById("assignee-filter");

  // Clone to remove any duplicate listeners from previous fragment visits
  [searchInput, statusFilter, assigneeFilter].forEach(el => {
    if (!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
  });

  const s = document.getElementById("search-input");
  const f = document.getElementById("status-filter");
  const a = document.getElementById("assignee-filter");
  if (s) s.addEventListener("input",  renderTicketTable);
  if (f) f.addEventListener("change", renderTicketTable);
  if (a) a.addEventListener("change", renderTicketTable);

  // Populate assignee filter dynamically from staff list
  if (a) {
    const staff = getStaff();
    const existing = Array.from(a.options).map(o => o.value);
    staff.forEach(st => {
      if (!existing.includes(st.name)) {
        const opt = document.createElement("option");
        opt.value = st.name;
        opt.textContent = st.name;
        a.appendChild(opt);
      }
    });
  }
}

function renderTicketTable() {
  const tbody          = document.getElementById("ticket-table-body");
  if (!tbody) return;

  const searchVal      = (document.getElementById("search-input")?.value    || "").toLowerCase();
  const statusVal      = document.getElementById("status-filter")?.value    || "All Status";
  const assigneeVal    = document.getElementById("assignee-filter")?.value  || "All Assignees";

  let tickets = getTickets();

  // Apply filters
  if (searchVal) {
    tickets = tickets.filter(t =>
      t.id.toLowerCase().includes(searchVal)      ||
      t.subject.toLowerCase().includes(searchVal) ||
      t.email.toLowerCase().includes(searchVal)
    );
  }
  if (statusVal !== "All Status") {
    tickets = tickets.filter(t => t.status === statusVal);
  }
  if (assigneeVal !== "All Assignees") {
    tickets = tickets.filter(t => (t.assignee || "").includes(assigneeVal));
  }

  if (tickets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:#888;">No tickets found.</td></tr>`;
    return;
  }

  tbody.innerHTML = tickets.map(t => {
    const statusClass = t.status === "Resolved" ? "status-resolved"
                      : t.status === "Breached"  ? "status-breached"
                      : "status-progress";
    const slaDisplay  = formatSLA(t.slaMs);
    return `
      <tr>
        <td>${t.id}</td>
        <td>${t.subject}</td>
        <td>${t.email}</td>
        <td>${t.assignee || "Unassigned"}</td>
        <td>${slaDisplay}</td>
        <td style="text-align:center;">
          <span class="status-pill ${statusClass}">${t.status}</span>
        </td>
        <td style="text-align:center;">
          <button class="btn-action" onclick="openTicketModal('${t.id}')">More Details</button>
        </td>
      </tr>`;
  }).join("");
}

function formatSLA(ms) {
  if (ms == null || ms < 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const days     = Math.floor(totalSec / 86400);
  const hrs      = Math.floor((totalSec % 86400) / 3600);
  const mins     = Math.floor((totalSec % 3600) / 60);
  const secs     = totalSec % 60;
  return `${String(days).padStart(2,"0")}:${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TICKET MODAL
// ─────────────────────────────────────────────────────────────────────────────

function setupTicketModal() {
  // All modal functions are defined globally so inline onclick attributes work
}

window.openTicketModal = function(ticketId) {
  const tickets = getTickets();
  const ticket  = tickets.find(t => t.id === ticketId);
  if (!ticket) return;

  activeTicketId  = ticketId;
  activeReplyMode = "sms";

  // Header
  document.getElementById("modal-ticket-id").textContent      = ticket.id;
  document.getElementById("modal-ticket-subject").textContent = `Subject: ${ticket.subject}`;

  const badge = document.getElementById("modal-ticket-status-badge");
  badge.textContent  = ticket.status;
  badge.className    = "status-pill " + (ticket.status === "Resolved" ? "status-resolved"
                                       : ticket.status === "Breached"  ? "status-breached"
                                       : "status-progress");

  // Description
  document.getElementById("modal-ticket-description").textContent = ticket.description || "No description provided.";

  // Attachments
  const attContainer = document.getElementById("modal-attachments-container");
  if (ticket.attachments && ticket.attachments.length > 0) {
    attContainer.style.display = "";
    attContainer.innerHTML = `<h4>ATTACHMENTS</h4>` +
      ticket.attachments.map(a =>
        `<div style="font-size:13px; color:#555; margin-top:4px;">
           <i class="fa-solid fa-paperclip"></i> ${a.name} <span style="color:#aaa;">(${a.size})</span>
         </div>`
      ).join("");
  } else {
    attContainer.style.display = "none";
  }

  // Reporter
  const reporter = ticket.reporter || {};
  const reporterName = reporter.name || ticket.email || "Unknown";
  document.getElementById("modal-reporter-initials").textContent = getInitials(reporterName);
  document.getElementById("modal-reporter-name").textContent     = reporterName;
  document.getElementById("modal-reporter-email").textContent    = ticket.email || "—";
  document.getElementById("modal-reporter-phone").textContent    = reporter.phone || "—";

  // Ticket details
  const details = ticket.details || {};
  document.getElementById("modal-detail-campus").textContent  = details.campus  || "—";
  document.getElementById("modal-detail-dept").textContent    = details.dept    || "—";
  document.getElementById("modal-detail-cc").textContent      = details.cc      || "—";
  document.getElementById("modal-detail-created").textContent = details.created || "—";

  // SLA timer display
  document.getElementById("modal-sla-timer").textContent = formatSLA(ticket.slaMs);

  // Status select
  const statusSelect = document.getElementById("modal-status-select");
  if (statusSelect) statusSelect.value = ticket.status || "In Progress";

  // Assignee select — populate with staff names
  const assigneeSelect = document.getElementById("modal-assignee-select");
  if (assigneeSelect) {
    const staff = getStaff();
    assigneeSelect.innerHTML = `<option value="Unassigned">Unassigned</option>` +
      staff.map(s =>
        `<option value="${s.name}" ${ticket.assignee === s.name ? "selected" : ""}>${s.name} (${s.tier}) — ${s.status}</option>`
      ).join("");
  }

  // Reply tab state reset
  switchReplyTab("sms");

  // Render activity feed
  renderActivityFeed(ticket);

  // Show modal
  document.getElementById("ticket-modal").classList.add("active");
};

window.closeModal = function() {
  document.getElementById("ticket-modal").classList.remove("active");
  activeTicketId = null;
};

window.switchReplyTab = function(mode) {
  activeReplyMode = mode;

  document.getElementById("tab-sms").classList.toggle("active",      mode === "sms");
  document.getElementById("tab-internal").classList.toggle("active", mode === "internal");

  const textarea = document.getElementById("reply-textarea");
  const btn      = document.querySelector(".submit-reply-btn");
  const counter  = document.getElementById("char-count");

  if (mode === "sms") {
    textarea.placeholder = "Type message to send via SMS...";
    if (btn)     btn.textContent = "Send Message";
    if (counter) counter.style.display = "";
  } else {
    textarea.placeholder = "Write an internal note (not visible to the student)...";
    if (btn)     btn.textContent = "Add Note";
    if (counter) counter.style.display = "none";
  }

  textarea.value = "";
  updateCharCount();
};

window.updateCharCount = function() {
  if (activeReplyMode !== "sms") return;
  const textarea = document.getElementById("reply-textarea");
  const counter  = document.getElementById("char-count");
  if (!textarea || !counter) return;
  const remaining = 160 - textarea.value.length;
  counter.textContent = `${remaining} char${remaining !== 1 ? "s" : ""} left`;
  counter.style.color = remaining < 20 ? "#e53935" : "";
};

window.submitMessage = function() {
  if (!activeTicketId) return;

  const textarea = document.getElementById("reply-textarea");
  const text     = textarea.value.trim();
  if (!text) return;

  const tickets = getTickets();
  const ticket  = tickets.find(t => t.id === activeTicketId);
  if (!ticket) return;

  const now     = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  if (!ticket.activities) ticket.activities = [];
  ticket.activities.push({
    type:   activeReplyMode,
    author: `${loggedInAdmin.firstName} ${loggedInAdmin.lastName}`,
    text:   text,
    time:   timeStr,
  });

  saveTickets(tickets);
  textarea.value = "";
  updateCharCount();
  renderActivityFeed(ticket);
};

window.escalateTicket = function() {
  if (!activeTicketId) return;

  const tickets = getTickets();
  const ticket  = tickets.find(t => t.id === activeTicketId);
  if (!ticket) return;

  if (ticket.status === "Resolved") {
    alert("Cannot escalate a resolved ticket.");
    return;
  }

  const confirmed = confirm(`Escalate ticket ${activeTicketId}? This will mark it as Breached and flag it for urgent review.`);
  if (!confirmed) return;

  ticket.status = "Breached";

  const now     = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  if (!ticket.activities) ticket.activities = [];
  ticket.activities.push({
    type:   "system",
    author: "System",
    text:   `Ticket escalated to Breached by ${loggedInAdmin.firstName} ${loggedInAdmin.lastName}.`,
    time:   timeStr,
  });

  saveTickets(tickets);

  // Update modal badge
  const badge = document.getElementById("modal-ticket-status-badge");
  badge.textContent = "Breached";
  badge.className   = "status-pill status-breached";

  const statusSelect = document.getElementById("modal-status-select");
  if (statusSelect) statusSelect.value = "Breached";

  renderActivityFeed(ticket);
};

window.saveTicketUpdates = function() {
  if (!activeTicketId) return;

  const tickets        = getTickets();
  const ticket         = tickets.find(t => t.id === activeTicketId);
  if (!ticket) return;

  const newStatus   = document.getElementById("modal-status-select")?.value;
  const newAssignee = document.getElementById("modal-assignee-select")?.value;

  const changes = [];
  if (newStatus   && newStatus   !== ticket.status)   changes.push(`Status → ${newStatus}`);
  if (newAssignee && newAssignee !== ticket.assignee) changes.push(`Assignee → ${newAssignee}`);

  ticket.status   = newStatus   || ticket.status;
  ticket.assignee = newAssignee || ticket.assignee;

  if (changes.length > 0) {
    const now     = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    if (!ticket.activities) ticket.activities = [];
    ticket.activities.push({
      type:   "system",
      author: "System",
      text:   `Updated by ${loggedInAdmin.firstName}: ${changes.join(", ")}.`,
      time:   timeStr,
    });
  }

  saveTickets(tickets);
  closeModal();
  renderTicketTable();
};

function renderActivityFeed(ticket) {
  const feed = document.getElementById("activity-feed");
  if (!feed) return;

  const activities = ticket.activities || [];
  if (activities.length === 0) {
    feed.innerHTML = `<p style="color:#aaa; font-size:13px;">No activity yet.</p>`;
    return;
  }

  feed.innerHTML = activities.map(a => {
    const isSystem   = a.type === "system";
    const isInternal = a.type === "internal";
    const iconClass  = isSystem   ? "fa-solid fa-gear"
                     : isInternal ? "fa-solid fa-lock"
                     : "fa-solid fa-comment-sms";
    const labelColor = isSystem   ? "#888"
                     : isInternal ? "#e67e22"
                     : "#1976d2";
    return `
      <div style="display:flex; gap:10px; margin-bottom:14px; align-items:flex-start;">
        <i class="${iconClass}" style="color:${labelColor}; margin-top:3px; font-size:13px;"></i>
        <div>
          <div style="font-size:12px; font-weight:600; color:${labelColor};">${a.author}</div>
          <div style="font-size:13px; color:#333; margin-top:2px;">${a.text}</div>
          <div style="font-size:11px; color:#aaa; margin-top:2px;">${a.time}</div>
        </div>
      </div>`;
  }).join("");

  // Auto-scroll to latest
  feed.scrollTop = feed.scrollHeight;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT FRAGMENT
// ─────────────────────────────────────────────────────────────────────────────

function initUsers() {
  setupUserFilters();
  renderUserTable();
  setupUserModal();
}

function setupUserFilters() {
  ["searchInput", "statusFilter", "departmentFilter"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
  });

  const s = document.getElementById("searchInput");
  const f = document.getElementById("statusFilter");
  const d = document.getElementById("departmentFilter");
  if (s) s.addEventListener("input",  renderUserTable);
  if (f) f.addEventListener("change", renderUserTable);
  if (d) d.addEventListener("change", renderUserTable);
}

function renderUserTable() {
  const tbody  = document.getElementById("staffTableBody");
  if (!tbody) return;

  const searchVal = (document.getElementById("searchInput")?.value       || "").toLowerCase();
  const statusVal =  document.getElementById("statusFilter")?.value      || "All Status";
  const deptVal   =  document.getElementById("departmentFilter")?.value  || "All Departments";

  let staff = getStaff();

  if (searchVal) {
    staff = staff.filter(s =>
      s.name.toLowerCase().includes(searchVal) ||
      s.email.toLowerCase().includes(searchVal)
    );
  }
  if (statusVal !== "All Status") {
    staff = staff.filter(s => s.status === statusVal);
  }
  if (deptVal !== "All Departments") {
    staff = staff.filter(s => s.dept === deptVal);
  }

  if (staff.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:#888;">No staff found.</td></tr>`;
    return;
  }

  tbody.innerHTML = staff.map(s => {
    const isOnline   = s.status === "Online";
    const dotClass   = isOnline ? "online" : "offline";
    const initials   = getInitials(s.name);
    return `
      <tr>
        <td>
          <div class="staff-cell">
            <div class="staff-avatar">${initials}</div>
            <span class="staff-name">${s.name}</span>
          </div>
        </td>
        <td>${s.email}</td>
        <td>${s.dept}</td>
        <td>${s.tier}</td>
        <td>
          <div class="availability ${dotClass}">
            <i class="fa-solid fa-circle"></i>
            <span class="avail-text">${s.status}</span>
          </div>
        </td>
        <td>
          <div class="action-group" style="justify-content:center;">
            <button class="icon-btn" title="Edit Staff"   onclick="openEditStaffModal('${s.id}')"><i class="fa-solid fa-pencil"></i></button>
            <button class="icon-btn" title="Delete Staff" onclick="deleteStaff('${s.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

function setupUserModal() {
  // All modal functions are defined globally — nothing extra to wire here
}

window.openAddStaffModal = function() {
  editingStaffId = null;
  document.getElementById("modalTitle").textContent     = "Add New Staff";
  document.getElementById("saveStaffBtn").textContent   = "Add Staff";
  document.getElementById("addStaffForm").reset();
  document.getElementById("addStaffModal").classList.add("active");
};

window.openEditStaffModal = function(staffId) {
  const staff  = getStaff();
  const member = staff.find(s => s.id === staffId);
  if (!member) return;

  editingStaffId = staffId;
  document.getElementById("modalTitle").textContent     = "Edit Staff";
  document.getElementById("saveStaffBtn").textContent   = "Save Changes";

  document.getElementById("newStaffName").value  = member.name;
  document.getElementById("newStaffEmail").value = member.email;
  document.getElementById("newStaffDept").value  = member.dept;
  document.getElementById("newStaffTier").value  = member.tier;

  document.getElementById("addStaffModal").classList.add("active");
};

window.closeAddStaffModal = function() {
  document.getElementById("addStaffModal").classList.remove("active");
  editingStaffId = null;
};

window.saveStaff = function(e) {
  e.preventDefault();

  const name  = document.getElementById("newStaffName").value.trim();
  const email = document.getElementById("newStaffEmail").value.trim();
  const dept  = document.getElementById("newStaffDept").value;
  const tier  = document.getElementById("newStaffTier").value;

  if (!name || !email) return;

  let staff = getStaff();

  if (editingStaffId) {
    // Edit existing
    staff = staff.map(s =>
      s.id === editingStaffId ? { ...s, name, email, dept, tier } : s
    );
  } else {
    // Add new
    const newMember = {
      id:     "staff-" + Date.now(),
      name,
      email,
      dept,
      tier,
      status: "Offline",
    };
    staff.push(newMember);
  }

  saveStaffData(staff);
  closeAddStaffModal();
  renderUserTable();
};

window.deleteStaff = function(staffId) {
  const staff  = getStaff();
  const member = staff.find(s => s.id === staffId);
  if (!member) return;

  const confirmed = confirm(`Remove ${member.name} from the staff list?`);
  if (!confirmed) return;

  saveStaffData(staff.filter(s => s.id !== staffId));
  renderUserTable();
};

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
});
