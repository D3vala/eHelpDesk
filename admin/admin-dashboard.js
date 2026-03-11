// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & STATE
// ─────────────────────────────────────────────────────────────────────────────

const loggedInAdmin = {
  firstName: "Ven",
  lastName: "Pascual",
};

// Supabase Tables
const TICKETS_TABLE = "tickets";
const USERS_TABLE = "users";

// Tracks which ticket is currently open in the modal
let activeTicketId = null;
// Tracks which reply mode is active: 'sms' | 'internal'
let activeReplyMode = "sms";
// Tracks edit mode for the staff modal
let editingStaffId = null;
// Navigation state
let currentFragment = "dashboard";

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

// Import Supabase client
import { supabase } from '../supabase-config.js';

// Error handling helper
function handleSupabaseError(error, operation) {
  console.error(`Supabase ${operation} error:`, error);
  return null;
}

// Tickets API Functions
async function getTickets() {
  try {
    const { data, error } = await supabase
      .from(TICKETS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return handleSupabaseError(error, 'fetch tickets');
    }
    
    return data || [];
  } catch (error) {
    return handleSupabaseError(error, 'fetch tickets');
  }
}

async function saveTicket(ticket) {
  try {
    const { data, error } = await supabase
      .from(TICKETS_TABLE)
      .upsert(ticket, { onConflict: ['id'] });
    
    if (error) {
      return handleSupabaseError(error, 'save ticket');
    }
    
    return data;
  } catch (error) {
    return handleSupabaseError(error, 'save ticket');
  }
}

// Staff/Users API Functions
async function getStaff() {
  try {
    const { data, error } = await supabase
      .from(USERS_TABLE)
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
      .from(USERS_TABLE)
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
      .from(USERS_TABLE)
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
  });

  // Ensure only the target fragment is active
  document.querySelectorAll(".fragment").forEach(fragment => {
    const isTarget = fragment.id === `fragment-${section}`;
    if (isTarget) {
      currentFragment = section;
      if (section === "dashboard") initDashboard();
      else if (section === "tickets") initTickets();
      else if (section === "users")   initUsers();
      console.log(`Navigated to ${section} fragment.`);
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

async function updateDashboardKPIs() {
  try {
    const tickets = await getTickets();
    const total   = tickets.length;
    const urgent  = tickets.filter(t => t.status === "Breached").length;

    // Quarterly volume — total tickets in Supabase
    const qvEl = document.querySelector(".kpi-card:nth-child(1) .kpi-value");
    if (qvEl) qvEl.textContent = total.toLocaleString();

    // Urgent escalation count
    const ueEl = document.querySelector(".kpi-card:nth-child(3) .kpi-value");
    if (ueEl) ueEl.textContent = String(urgent).padStart(2, "0");
  } catch (error) {
    console.error('Error updating dashboard KPIs:', error);
  }
}

async function renderWorkloadTable() {
  const tbody = document.getElementById("workload-tbody");
  if (!tbody) return;

  try {
    const [staff, tickets] = await Promise.all([getStaff(), getTickets()]);

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
  } catch (error) {
    console.error('Error rendering workload table:', error);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#888;">Error loading data.</td></tr>`;
  }
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

async function setupTicketFilters() {
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
    try {
      const staff = await getStaff();
      const existing = Array.from(a.options).map(o => o.value);
      staff.forEach(st => {
        if (!existing.includes(st.name)) {
          const opt = document.createElement("option");
          opt.value = st.name;
          opt.textContent = st.name;
          a.appendChild(opt);
        }
      });
    } catch (error) {
      console.error('Error populating assignee filter:', error);
    }
  }
}

async function renderTicketTable() {
  const tbody          = document.getElementById("ticket-table-body");
  if (!tbody) return;

  try {
    const searchVal      = (document.getElementById("search-input")?.value    || "").toLowerCase();
    const statusVal      = document.getElementById("status-filter")?.value    || "All Status";
    const assigneeVal    = document.getElementById("assignee-filter")?.value  || "All Assignees";

    let tickets = await getTickets();

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
  } catch (error) {
    console.error('Error rendering ticket table:', error);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:#888;">Error loading tickets.</td></tr>`;
  }
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

window.openTicketModal = async function(ticketId) {
  try {
    const tickets = await getTickets();
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
    attContainer.style.display = "none";
    attContainer.innerHTML = '<h4>ATTACHMENTS</h4>';
    const { data: attData } = await supabase.from('attachments').select('*').eq('ticket_id', ticketId);
    if (attData && attData.length > 0) {
      attContainer.style.display = '';
      attData.forEach(att => {
        const hasUrl = att.file_url && att.file_url !== 'pending';
        const pill = document.createElement(hasUrl ? 'a' : 'div');
        pill.className = 'attachment-pill';
        if (hasUrl) {
          pill.href = att.file_url;
          pill.target = '_blank';
          pill.rel = 'noopener noreferrer';
          pill.download = att.file_name;
        }
        const iconClass = !att.file_type ? 'fa-file'
          : att.file_type.startsWith('image/')        ? 'fa-file-image'
          : att.file_type === 'application/pdf'        ? 'fa-file-pdf'
          : att.file_type.includes('word')             ? 'fa-file-word'
          : (att.file_type.includes('sheet') || att.file_type.includes('excel') || att.file_type.includes('csv')) ? 'fa-file-excel'
          : 'fa-file';
        const sizeLabel = att.file_size
          ? (att.file_size < 1024 ? `${att.file_size} B`
            : att.file_size < 1048576 ? `${(att.file_size / 1024).toFixed(1)} KB`
            : `${(att.file_size / 1048576).toFixed(1)} MB`)
          : '';
        pill.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${att.file_name}${sizeLabel ? ` <span style="color:#aaa;">(${sizeLabel})</span>` : ''}${!hasUrl ? ' <span style="color:#f97316;font-size:10px;">no download link</span>' : ''}`;
        attContainer.appendChild(pill);
      });
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
      const staff = await getStaff();
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
  } catch (error) {
    console.error('Error opening ticket modal:', error);
    alert('Error loading ticket details. Please try again.');
  }
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

window.submitMessage = async function() {
  if (!activeTicketId) return;

  const textarea = document.getElementById("reply-textarea");
  const text     = textarea.value.trim();
  if (!text) return;

  try {
    const tickets = await getTickets();
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

    await saveTicket(ticket);
    textarea.value = "";
    updateCharCount();
    renderActivityFeed(ticket);
  } catch (error) {
    console.error('Error submitting message:', error);
    alert('Error saving message. Please try again.');
  }
};

window.escalateTicket = async function() {
  if (!activeTicketId) return;

  try {
    const tickets = await getTickets();
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

    await saveTicket(ticket);

    // Update modal badge
    const badge = document.getElementById("modal-ticket-status-badge");
    badge.textContent = "Breached";
    badge.className   = "status-pill status-breached";

    const statusSelect = document.getElementById("modal-status-select");
    if (statusSelect) statusSelect.value = "Breached";

    renderActivityFeed(ticket);
  } catch (error) {
    console.error('Error escalating ticket:', error);
    alert('Error escalating ticket. Please try again.');
  }
};

window.saveTicketUpdates = async function() {
  if (!activeTicketId) return;

  try {
    const tickets        = await getTickets();
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

    await saveTicket(ticket);
    closeModal();
    renderTicketTable();
  } catch (error) {
    console.error('Error saving ticket updates:', error);
    alert('Error saving ticket updates. Please try again.');
  }
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

async function renderUserTable() {
  const tbody  = document.getElementById("staffTableBody");
  if (!tbody) return;

  try {
    const searchVal = (document.getElementById("searchInput")?.value       || "").toLowerCase();
    const statusVal =  document.getElementById("statusFilter")?.value      || "All Status";
    const deptVal   =  document.getElementById("departmentFilter")?.value  || "All Departments";

    let staff = await getStaff();

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
  } catch (error) {
    console.error('Error rendering user table:', error);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:#888;">Error loading staff data.</td></tr>`;
  }
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

window.saveStaff = async function(e) {
  e.preventDefault();

  const name  = document.getElementById("newStaffName").value.trim();
  const email = document.getElementById("newStaffEmail").value.trim();
  const dept  = document.getElementById("newStaffDept").value;
  const tier  = document.getElementById("newStaffTier").value;

  if (!name || !email) return;

  try {
    let staff = await getStaff();

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

    await saveStaffData(staff);
    closeAddStaffModal();
    renderUserTable();
  } catch (error) {
    console.error('Error saving staff:', error);
    alert('Error saving staff member. Please try again.');
  }
};

window.deleteStaff = async function(staffId) {
  try {
    const staff  = await getStaff();
    const member = staff.find(s => s.id === staffId);
    if (!member) return;

    const confirmed = confirm(`Remove ${member.name} from the staff list?`);
    if (!confirmed) return;

    await saveStaffData(staff.filter(s => s.id !== staffId));
    renderUserTable();
  } catch (error) {
    console.error('Error deleting staff:', error);
    alert('Error deleting staff member. Please try again.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
});
