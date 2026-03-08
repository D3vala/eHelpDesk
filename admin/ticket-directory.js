// --- DATABASE MOCK (seed data used only when localStorage is empty) ---
const TICKET_SEED = [
  {
    id: "#260219-001",
    subject: "Password Reset Request",
    email: "kgabriel@mymail.mapua.edu.ph",
    assignee: "Phoenix (L0)",
    slaMs: 81910840, // ~22.75 hours
    status: "In Progress",
    description: "User is locked out of their cardinal edge account after multiple failed login attempts.\n\nNeeds a manual password reset and verification link sent to their phone as soon as possible.",
    reporter: { name: "Kevin Gabriel", phone: "+1 (555) 019-2834" },
    details: { campus: "Main Campus", dept: "DOIT", cc: "none", created: "Feb 19, 2026, 10:44 AM" },
    attachments: [ { name: "login_error_screenshot.png", size: "1.2 MB" } ],
    activities: [
      { type: "internal", author: "Phoenix (L0)", text: "Checked active directory. Account is indeed locked. Reaching out to user now.", time: "Today, 10:50 AM" },
      { type: "system", author: "System", text: "Ticket assigned to Phoenix (L0)", time: "Today, 10:45 AM" }
    ]
  },
  {
    id: "#260219-002",
    subject: "Software License Issue",
    email: "mlopez@mymail.mapua.edu.ph",
    assignee: "Dominic (L1)",
    slaMs: -8130120, // Negative for breached
    status: "Breached",
    description: "AutoCAD license has expired on lab computer.",
    reporter: { name: "Maria Lopez", phone: "+1 (555) 019-3333" },
    details: { campus: "Makati Campus", dept: "Architecture", cc: "none", created: "Feb 18, 2026, 09:00 AM" },
    attachments: [],
    activities: [
      { type: "system", author: "System", text: "SLA Breached.", time: "Yesterday, 02:00 PM" }
    ]
  },
  {
    id: "#260219-003",
    subject: "Cardinal Edge Integration",
    email: "zsantos@mymail.mapua.edu.ph",
    assignee: "Chloie (L2)",
    slaMs: 86110000, 
    status: "In Progress",
    description: "API key needs resetting for Canvas integration.",
    reporter: { name: "Zach Santos", phone: "+1 (555) 019-9999" },
    details: { campus: "Main Campus", dept: "DOIT", cc: "admin@mapua.edu", created: "Feb 19, 2026, 11:00 AM" },
    attachments: [],
    activities: []
  }
];

// --- LOCALSTORAGE PERSISTENCE ---
let tickets = [];

function initData() {
  const storedTickets = localStorage.getItem('eHelpDesk_tickets');
  if (storedTickets) {
    tickets = JSON.parse(storedTickets);
  } else {
    // Seed with mock data on first load
    tickets = JSON.parse(JSON.stringify(TICKET_SEED));
    localStorage.setItem('eHelpDesk_tickets', JSON.stringify(tickets));
  }
}

function syncTickets() {
  localStorage.setItem('eHelpDesk_tickets', JSON.stringify(tickets));
}

// Build staff list from localStorage (synced with user-management.js)
// Falls back to hardcoded defaults if user management hasn't been opened yet.
function getStaffMembers() {
  const stored = localStorage.getItem('eHelpDesk_staffData');
  if (stored) {
    return JSON.parse(stored).map(s => ({
      name: `${s.name} (${s.tier.replace('Level ', 'L')})`,
      online: s.status === 'Online'
    }));
  }
  // Default seed fallback
  return [
    { name: "Phoenix (L0)", online: true },
    { name: "Dominic (L1)", online: true },
    { name: "Chloie (L2)", online: true },
    { name: "Naveen (L3)", online: false }
  ];
}

let currentOpenTicketId = null;
let replyMode = 'sms'; // 'sms' or 'internal'

// --- UTILITY FUNCTIONS ---
function formatSLA(ms) {
  let isNegative = ms < 0;
  let absMs = Math.abs(ms);
  
  let hours = Math.floor(absMs / (1000 * 60 * 60));
  let mins = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
  let secs = Math.floor((absMs % (1000 * 60)) / 1000);
  let hundredths = Math.floor((absMs % 1000) / 10);
  
  let pad = (num) => num.toString().padStart(2, '0');
  let sign = isNegative ? "-" : "";
  
  return `${sign}${pad(hours)}:${pad(mins)}:${pad(secs)}:${pad(hundredths)}`;
}

function getStatusClass(status) {
  if (status === 'In Progress') return 'status-progress';
  if (status === 'Breached') return 'status-breached';
  if (status === 'Resolved') return 'status-resolved';
  return 'status-progress';
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  initData();

  // Event Listeners for filters
  document.getElementById('status-filter').addEventListener('change', renderTable);
  document.getElementById('assignee-filter').addEventListener('change', renderTable);
  document.getElementById('search-input').addEventListener('input', renderTable);

  renderTable();
  populateAssigneeDropdown();
  initResizers();
  
  // SLA Timer Loop
  setInterval(() => {
    tickets.forEach(t => {
      if (t.status !== 'Resolved') {
        t.slaMs -= 60; // Approximate reduction per tick
        // Auto breach if it crosses 0
        if (t.slaMs < 0 && t.status === 'In Progress') {
          t.status = 'Breached';
          syncTickets(); // Persist breach to localStorage
          renderTable(); // Update the pill in the table immediately
        }
      }
    });
    updateSLAUI();
  }, 60);
});

// --- RENDER TABLE ---
function renderTable() {
  const tbody = document.getElementById('ticket-table-body');
  tbody.innerHTML = '';
  
  const statusFilter = document.getElementById('status-filter').value;
  const assigneeFilter = document.getElementById('assignee-filter').value;
  const searchInput = document.getElementById('search-input').value.toLowerCase();

  const filteredTickets = tickets.filter(t => {
    let matchStatus = statusFilter === 'All Status' || t.status === statusFilter;
    let matchAssignee = assigneeFilter === 'All Assignees' || t.assignee.includes(assigneeFilter);
    let matchSearch = true;
    if (searchInput) {
       const text = `${t.id} ${t.subject} ${t.email} ${t.reporter.name}`.toLowerCase();
       matchSearch = text.includes(searchInput);
    }
    return matchStatus && matchAssignee && matchSearch;
  });

  if (filteredTickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px 12px; color:#888;">No tickets found matching your filters.</td></tr>';
    return;
  }

  filteredTickets.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="ticket-id" title="${t.id}">${t.id}</td>
      <td title="${t.subject}">${t.subject}</td>
      <td title="${t.email}">${t.email}</td>
      <td title="${t.assignee}">${t.assignee}</td>
      <td class="sla-cell" data-ticket-id="${t.id}" title="${formatSLA(t.slaMs)}">${formatSLA(t.slaMs)}</td>
      <td class="no-truncate" style="text-align: center;">
        <span class="status-pill ${getStatusClass(t.status)}">${t.status}</span>
      </td>
      <td class="no-truncate" style="text-align: center;">
        <button class="btn-action" onclick="openModal('${t.id}')">More Details</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateSLAUI() {
  // Update table cells
  tickets.forEach(t => {
    const cell = document.querySelector(`.sla-cell[data-ticket-id="${t.id}"]`);
    if (cell) {
      const formatted = formatSLA(t.slaMs);
      cell.textContent = formatted;
      cell.title = formatted;
    }
  });
  // Update modal if open
  if (currentOpenTicketId) {
    const t = tickets.find(x => x.id === currentOpenTicketId);
    if (t) document.getElementById('modal-sla-timer').textContent = formatSLA(t.slaMs);
  }
}

// --- MODAL LOGIC ---
function populateAssigneeDropdown() {
  const select = document.getElementById('modal-assignee-select');
  select.innerHTML = '';
  
  // Filter only online staff from live localStorage data
  const onlineStaff = getStaffMembers().filter(s => s.online);
  
  onlineStaff.forEach(staff => {
    const opt = document.createElement('option');
    opt.value = staff.name;
    opt.textContent = `${staff.name} - Online`;
    select.appendChild(opt);
  });
}

function openModal(ticketId) {
  currentOpenTicketId = ticketId;
  const t = tickets.find(x => x.id === ticketId);
  if (!t) return;

  // Populate Header
  document.getElementById('modal-ticket-id').textContent = t.id;
  document.getElementById('modal-ticket-subject').textContent = `Subject: ${t.subject}`;
  
  const badge = document.getElementById('modal-ticket-status-badge');
  badge.className = `status-pill ${getStatusClass(t.status)}`;
  badge.textContent = t.status;

  // Populate Description
  document.getElementById('modal-ticket-description').textContent = t.description;

  // Populate Attachments
  const attContainer = document.getElementById('modal-attachments-container');
  attContainer.innerHTML = '<h4>ATTACHMENTS</h4>';
  if (t.attachments.length === 0) {
    attContainer.innerHTML += '<p style="font-size:13px; color:#888;">No attachments.</p>';
  } else {
    t.attachments.forEach(att => {
      const pill = document.createElement('div');
      pill.className = 'attachment-pill';
      pill.innerHTML = `<i class="fa-solid fa-file-image"></i> ${att.name} (${att.size})`;
      pill.onclick = () => alert(`Downloading ${att.name}...`);
      attContainer.appendChild(pill);
    });
  }

  // Populate Right Sidebar Details
  const initials = t.reporter.name.split(' ').map(n=>n[0]).join('').toUpperCase();
  document.getElementById('modal-reporter-initials').textContent = initials;
  document.getElementById('modal-reporter-name').textContent = t.reporter.name;
  document.getElementById('modal-reporter-email').textContent = t.email;
  document.getElementById('modal-reporter-phone').textContent = t.reporter.phone;

  document.getElementById('modal-detail-campus').textContent = t.details.campus;
  document.getElementById('modal-detail-dept').textContent = t.details.dept;
  document.getElementById('modal-detail-cc').textContent = t.details.cc;
  document.getElementById('modal-detail-created').textContent = t.details.created;

  // Status Dropdown
  const statusSelect = document.getElementById('modal-status-select');
  statusSelect.innerHTML = `
    <option value="In Progress">In Progress</option>
    <option value="Resolved">Resolved</option>
  `;
  // Always allow showing "Breached" if the ticket itself is currently breached
  if (t.status === 'Breached') {
     const opt = document.createElement('option');
     opt.value = 'Breached';
     opt.textContent = 'Breached';
     statusSelect.appendChild(opt);
  }
  statusSelect.value = t.status;
  
  // Assignee (if current assignee went offline, we append them so they aren't lost, or just set it)
  const assigneeSelect = document.getElementById('modal-assignee-select');
  if (!Array.from(assigneeSelect.options).some(opt => opt.value === t.assignee)) {
     const opt = document.createElement('option');
     opt.value = t.assignee;
     opt.textContent = `${t.assignee} - Offline`;
     assigneeSelect.appendChild(opt);
  }
  assigneeSelect.value = t.assignee;

  // Render Activities
  renderActivities(t);

  // Reset Reply Box
  switchReplyTab('sms');
  document.getElementById('reply-textarea').value = '';
  updateCharCount();

  // Show Modal
  document.getElementById('ticket-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('ticket-modal').classList.remove('active');
  currentOpenTicketId = null;
}

function renderActivities(ticket) {
  const feed = document.getElementById('activity-feed');
  feed.innerHTML = '';
  
  if (ticket.activities.length === 0) {
    feed.innerHTML = '<p style="font-size:13px; color:#888;">No activities yet.</p>';
    return;
  }

  // Render in order (Newest first, assuming array has newest at index 0)
  ticket.activities.forEach(act => {
    let iconClass = 'fa-gear';
    let badgeClass = 'system';
    let badgeText = 'System';
    
    if (act.type === 'internal') {
      iconClass = 'fa-lock';
      badgeClass = 'internal';
      badgeText = 'Internal Note';
    } else if (act.type === 'sms') {
      iconClass = 'fa-mobile-screen-button';
      badgeClass = 'sms';
      badgeText = 'SMS Reply';
    } else if (act.type === 'alert') {
      iconClass = 'fa-triangle-exclamation';
      badgeClass = 'alert';
      badgeText = 'Escalation';
    }

    const div = document.createElement('div');
    div.className = 'activity-item';
    div.innerHTML = `
      <div class="activity-icon ${badgeClass}">
        <i class="fa-solid ${iconClass}"></i>
      </div>
      <div class="activity-content">
        <div class="activity-meta">
          <strong>${act.author}</strong>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <p>${act.text}</p>
        <span class="activity-time">${act.time}</span>
      </div>
    `;
    feed.appendChild(div);
  });
}

// --- ESCALATE BUTTON LOGIC ---
function escalateTicket() {
  const t = tickets.find(x => x.id === currentOpenTicketId);
  if (!t) return;

  const assigneeSelect = document.getElementById('modal-assignee-select');
  const selectedAssigneeText = assigneeSelect.options[assigneeSelect.selectedIndex].text;

  const newAct = {
    type: 'alert',
    author: "System",
    text: `Ticket escalated. Current assignment verified: ${selectedAssigneeText}.`,
    time: "Just now"
  };

  t.activities.unshift(newAct);
  syncTickets(); // Persist escalation to localStorage
  renderActivities(t);
}

// --- TAB LOGIC ---
function switchReplyTab(mode) {
  replyMode = mode;
  const tabSms = document.getElementById('tab-sms');
  const tabInt = document.getElementById('tab-internal');
  const textarea = document.getElementById('reply-textarea');

  if (mode === 'sms') {
    tabSms.classList.add('active');
    tabInt.classList.remove('active');
    textarea.placeholder = "Type message to send via SMS...";
    textarea.classList.remove('internal-note-mode');
  } else {
    tabInt.classList.add('active');
    tabSms.classList.remove('active');
    textarea.placeholder = "Type an internal note (visible to staff only)...";
    textarea.classList.add('internal-note-mode');
  }
  updateCharCount();
}

function updateCharCount() {
  const val = document.getElementById('reply-textarea').value;
  const countEl = document.getElementById('char-count');
  if (replyMode === 'sms') {
    countEl.textContent = `${160 - val.length} chars left`;
  } else {
    countEl.textContent = `${val.length} chars typed`;
  }
}

function submitMessage() {
  const textarea = document.getElementById('reply-textarea');
  const text = textarea.value.trim();
  if (!text) return;

  const t = tickets.find(x => x.id === currentOpenTicketId);
  if (!t) return;

  const newAct = {
    type: replyMode,
    author: "Administrator (You)",
    text: text,
    time: "Just now"
  };

  // Add to beginning of array so newest is at top
  t.activities.unshift(newAct);
  
  syncTickets(); // Persist reply to localStorage
  textarea.value = '';
  updateCharCount();
  renderActivities(t);
}

function saveTicketUpdates() {
  const t = tickets.find(x => x.id === currentOpenTicketId);
  if (!t) return;

  const newStatus = document.getElementById('modal-status-select').value;
  const newAssignee = document.getElementById('modal-assignee-select').value;

  t.status = newStatus;
  t.assignee = newAssignee;

  // Note: If changed to Resolved, the global interval ignores it and stops ticking down.
  syncTickets(); // Persist status/assignee change to localStorage

  renderTable();
  closeModal();
}

// --- TABLE COL RESIZER ---
function initResizers() {
  const table = document.querySelector('.directory-table');
  const cols = table.querySelectorAll('th');

  [].forEach.call(cols, function (col, index) {
    if (index === cols.length - 1) return;

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