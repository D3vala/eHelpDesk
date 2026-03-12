// Uses window.supabase initialised in HTML (no ES module imports needed)

// 1. DYNAMIC USER LOGO & AUTH LOGIC
document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initEventListeners();
  loadTickets();
});

function initAuth() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const userInitial = localStorage.getItem("userInitial");
  const userFullName = localStorage.getItem("userFullName");
  const userEmail = localStorage.getItem("userEmail");

  const authSection = document.getElementById("auth-section");
  const loginBtn = document.getElementById("login-nav-btn");
  const profileWrapper = document.getElementById("profile-menu-wrapper");

  if (isLoggedIn === "true" && userInitial && authSection) {
    if (loginBtn) loginBtn.style.display = "none";
    if (profileWrapper) {
      profileWrapper.style.display = "block";

      // Create Circle Profile
      const profileCircle = document.createElement("div");
      profileCircle.className = "user-profile-circle";
      profileCircle.innerText = userInitial;

      profileCircle.onclick = (e) => {
        e.stopPropagation();
        const menu = document.getElementById("dropdown-menu");
        if (menu) menu.classList.toggle("show");
      };
      profileWrapper.prepend(profileCircle);

      // Inject User Info into Nav Dropdown
      const nameDisp = document.getElementById("user-display-name");
      const emailDisp = document.getElementById("user-display-email");
      if (nameDisp) nameDisp.innerText = userFullName || "User";
      if (emailDisp) emailDisp.innerText = userEmail || "";
    }
  }
}

function initEventListeners() {
  // Status filter
  const statusDropdown = document.querySelector('.status-dropdown');
  if (statusDropdown) {
    statusDropdown.addEventListener('change', handleStatusFilter);
  }

  // Rich Text Editor
  initRichTextEditor();

  // File Upload
  initFileUpload();

  // Form submission
  const ticketForm = document.getElementById("ticketForm");
  if (ticketForm) {
    ticketForm.addEventListener("submit", createTicket);
  }

  // Close menu when clicking outside
  window.addEventListener("click", (e) => {
    const menu = document.getElementById("dropdown-menu");
    if (menu && !e.target.closest(".profile-container")) {
      menu.classList.remove("show");
    }
  });
}

// Rich Text Editor Functions
function initRichTextEditor() {
  const editorEl = document.getElementById("editor");
  const placeholderText = "Enter description. Type / to open a list";

  if (editorEl) {
    editorEl.addEventListener("focus", function () {
      if (this.innerText.trim() === placeholderText) {
        this.innerHTML = "";
      }
    });
    editorEl.addEventListener("blur", function () {
      if (this.innerText.trim() === "") {
        this.innerHTML = placeholderText;
      }
    });
  }
}

function formatDoc(cmd, value = null) {
  const editor = document.getElementById("editor");
  if (editor) {
    editor.focus();
    document.execCommand(cmd, false, value);

    // Toggle the 'active' class on the button that was clicked
    if (window.event && window.event.currentTarget) {
      window.event.currentTarget.classList.toggle("active");
    }
  }
}

function toggleDropdown(id) {
  document.querySelectorAll(".custom-dropdown").forEach((d) => {
    if (d.id !== id) d.classList.remove("show");
  });
  const dropdown = document.getElementById(id);
  if (dropdown) dropdown.classList.toggle("show");
}

function applyFormat(cmd, value) {
  const editor = document.getElementById("editor");
  if (editor) {
    editor.focus();
    document.execCommand(cmd, false, value);
    if (cmd === "foreColor") {
      document.getElementById("text-indicator").style.borderBottomColor =
        value;
    }
  }
  document
    .querySelectorAll(".custom-dropdown")
    .forEach((d) => d.classList.remove("show"));
}

// File Upload Functions
let uploadedFiles = [];

function initFileUpload() {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("fileInput");
  const fileDisplayArea = document.getElementById("file-display-area");

  if (dropZone && fileInput) {
    fileInput.addEventListener("change", function () {
      handleFileSelection(this.files);
    });
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });
    dropZone.addEventListener("dragleave", () =>
      dropZone.classList.remove("dragover"),
    );
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      handleFileSelection(e.dataTransfer.files);
    });
  }
}

function handleFileSelection(files) {
  Array.from(files).forEach((file) => {
    if (!uploadedFiles.some((f) => f.name === file.name)) {
      uploadedFiles.push(file);
    }
  });
  renderFileList();
}

function renderFileList() {
  const fileDisplayArea = document.getElementById("file-display-area");
  if (!fileDisplayArea) return;
  fileDisplayArea.innerHTML = "";
  uploadedFiles.forEach((file, index) => {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";
    fileItem.innerHTML = `
          <i class="fa fa-file-alt" style="margin-right: 8px; color: #888;"></i>
          <span>${file.name}</span>
          <button type="button" class="remove-file" onclick="removeFile(${index})" 
                  style="margin-left: 10px; color: red; border: none; background: none; cursor: pointer;">×</button>
      `;
    fileDisplayArea.appendChild(fileItem);
  });
}

function removeFile(index) {
  uploadedFiles.splice(index, 1);
  renderFileList();
}

function handleLogout() {
  localStorage.clear();
  window.location.href = "../login.html";
}

// Tickets API Functions
async function getTickets() {
  try {
    const { data, error } = await window.supabase
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

async function saveTicket(ticket) {
  try {
    const { data, error } = await window.supabase
      .from('tickets')
      .insert(ticket)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving ticket:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error saving ticket:', error);
    return null;
  }
}

async function updateTicket(ticketId, updates) {
  try {
    const { data, error } = await window.supabase
      .from('tickets')
      .update(updates)
      .eq('id', ticketId);
    
    if (error) {
      console.error('Error updating ticket:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating ticket:', error);
    return null;
  }
}

async function deleteTicketFromDB(ticketId) {
  try {
    const { error } = await window.supabase
      .from('tickets')
      .delete()
      .eq('id', ticketId);
    
    if (error) {
      console.error('Error deleting ticket:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return false;
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

// Map DB status values to display labels
function formatStatus(status) {
  const map = { open: 'Open', in_progress: 'In Progress', breached: 'Breached', resolved: 'Resolved' };
  return map[status] || status;
}

// Render tickets in the table
function renderTickets(tickets) {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (tickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="no-records">No Records to Display</td></tr>';
    return;
  }

  const filteredTickets = filterTicketsByUser(tickets);

  if (filteredTickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="no-records">No Records to Display</td></tr>';
    return;
  }
  
  filteredTickets.forEach(ticket => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ticket.ticket_id || ticket.id}</td>
      <td>${ticket.subject || ''}</td>
      <td>${formatDate(ticket.created_at)}</td>
      <td><span class="status-pill ${getStatusClass(ticket.status)}">${formatStatus(ticket.status)}</span></td>
      <td>
        <div class="action-group">
          <button class="btn-action view-btn" onclick="viewTicket('${ticket.id}')">View</button>
          <button class="btn-action edit-btn" onclick="editTicket('${ticket.id}')">Edit</button>
          <button class="btn-action delete-btn" onclick="deleteTicket('${ticket.id}')">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Filter tickets for the current user
function filterTicketsByUser(tickets) {
  const userEmail = (localStorage.getItem("userEmail") || '').toLowerCase();
  return tickets.filter(ticket =>
    (ticket.reporter_email || '').toLowerCase() === userEmail
  );
}

// Handle status filter
function handleStatusFilter() {
  const statusFilter = document.querySelector('.status-dropdown').value;
  // Implementation would filter tickets based on status
  loadTickets();
}

// Update statistics
function updateStats(tickets) {
  const userEmail = (localStorage.getItem("userEmail") || '').toLowerCase();
  const userTickets = tickets.filter(t => (t.reporter_email || '').toLowerCase() === userEmail);
  const allCount = userTickets.length;
  const pendingCount = userTickets.filter(t => t.status === 'in_progress' || t.status === 'open').length;
  const closedCount = userTickets.filter(t => t.status === 'resolved').length;

  const card1 = document.querySelector('.stat-card:nth-child(1) .stat-number');
  const card2 = document.querySelector('.stat-card:nth-child(2) .stat-number');
  const card3 = document.querySelector('.stat-card:nth-child(3) .stat-number');
  if (card1) card1.textContent = allCount;
  if (card2) card2.textContent = pendingCount;
  if (card3) card3.textContent = closedCount;
}

// Utility functions
function getStatusClass(status) {
  if (status === 'in_progress' || status === 'open') return 'status-progress';
  if (status === 'breached') return 'status-breached';
  if (status === 'resolved') return 'status-resolved';
  return 'status-progress';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// CRUD Operations
async function createTicket(event) {
  event.preventDefault();

  const campusEl  = document.getElementById("campusSelect");
  const deptEl    = document.getElementById("deptSelect");
  const ccsInput  = document.querySelector('input[placeholder="Select CCs"]');
  const subjectEl = document.querySelector('input[placeholder="Enter subject"]');
  const editorEl  = document.getElementById("editor");
  const campus      = campusEl?.value  || '';
  const dept        = deptEl?.value    || '';
  const ccsRaw      = ccsInput?.value  || '';
  const subject     = subjectEl?.value || '';
  const placeholder = "Enter description. Type / to open a list";
  const description = (editorEl?.innerText || '').trim();

  if (!campus)  { alert('Please select a campus.'); return; }
  if (!dept)    { alert('Please select a department.'); return; }
  if (!subject) { alert('Please enter a subject.'); return; }

  const userFullName = localStorage.getItem("userFullName") || "Anonymous";
  const userEmail    = localStorage.getItem("userEmail")    || "unknown@mapua.edu.ph";
  const ccEmails     = ccsRaw.split(',').map(e => e.trim()).filter(Boolean);

  const newTicket = {
    subject:         subject,
    description:     description === placeholder ? '' : description,
    reporter_email:  userEmail,
    reporter_name:   userFullName,
    campus_location: campus,
    department:      dept,
    cc_emails:       ccEmails,
    status:          'open',
    priority:        'medium',
    sla_target_hours: 24
  };

  try {
    const saved = await saveTicket(newTicket);
    if (!saved) {
      alert('Error creating ticket. Please check your connection and try again.');
      return;
    }

    // Upload any attached files
    if (uploadedFiles.length > 0) {
      await uploadTicketAttachments(saved.id, uploadedFiles, userEmail);
      uploadedFiles = [];
      const fileDisplayArea = document.getElementById('file-display-area');
      if (fileDisplayArea) fileDisplayArea.innerHTML = '';
    }

    loadTickets();
    window._lastCreatedTicketId = saved.id;
    const ticketIdEl = document.querySelector('#popupOverlay .ticket-id');
    if (ticketIdEl) ticketIdEl.textContent = `Ticket ID: ${saved.ticket_id || saved.id}`;
    const popup = document.getElementById('popupOverlay');
    if (popup) popup.style.display = 'flex';
  } catch (error) {
    console.error('Error creating ticket:', error);
    alert('Error creating ticket. Please try again.');
  }
}

async function uploadTicketAttachments(ticketId, files, uploaderEmail) {
  for (const file of files) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${ticketId}/${Date.now()}_${safeName}`;

      // Step 1 — try Supabase Storage; fall back to base64 data URL
      let fileUrl = '';
      const { error: uploadError } = await window.supabase.storage
        .from('ticket-attachments')
        .upload(storagePath, file, { upsert: false });

      if (uploadError) {
        console.warn('Storage upload failed for', file.name, '— using base64 fallback.', uploadError.message);
        // Fallback: read file as base64 data URL so it can be viewed/downloaded without storage
        fileUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
      } else {
        const { data: urlData } = window.supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(storagePath);
        fileUrl = urlData?.publicUrl || '';
      }

      // Step 2 — insert the DB record
      const { error: dbError } = await window.supabase
        .from('attachments')
        .insert({
          ticket_id:   ticketId,
          file_name:   file.name,
          file_url:    fileUrl || 'pending',
          file_size:   file.size,
          file_type:   file.type,
          uploaded_by: uploaderEmail
        });

      if (dbError) {
        console.error('Attachment DB insert error for', file.name, dbError);
      }
    } catch (err) {
      console.error('Unexpected error uploading', file.name, err);
    }
  }
}

async function viewTicket(ticketId) {
  const tickets = await getTickets();
  const ticket = tickets.find(t => t.id === ticketId);
  
  if (ticket) {
    document.getElementById("viewTicketIDDisplay").innerText = `Ticket ${ticket.ticket_id || ticket.id}`;
    document.getElementById("viewCampus").innerText = ticket.campus_location || "Not Specified";
    document.getElementById("viewDept").innerText = ticket.department || "Not Specified";
    document.getElementById("viewSubject").innerText = ticket.subject || "No Subject";
    document.getElementById("viewDescription").innerHTML = ticket.description || '';
    document.getElementById("viewTimeStamp").innerText = formatDate(ticket.created_at);

    await loadStudentAttachments(ticketId);
    await loadStudentActivityFeed(ticketId);

    const statusTag = document.getElementById('viewStatusTag');
    if (statusTag) statusTag.textContent = `Status: ${formatStatus(ticket.status)}`;

    const overlay = document.getElementById("viewTicketOverlay");
    if (overlay) overlay.style.display = "flex";
  }
}

async function loadStudentAttachments(ticketId) {
  const container = document.getElementById('viewAttachmentsContainer');
  const list = document.getElementById('viewAttachmentsList');
  if (!container || !list) return;

  const { data, error } = await window.supabase
    .from('attachments')
    .select('*')
    .eq('ticket_id', ticketId);

  if (error || !data || data.length === 0) {
    container.style.display = 'none';
    return;
  }

  list.innerHTML = '';
  data.forEach(att => {
    const hasUrl = att.file_url && att.file_url !== 'pending';
    const isDataUrl = hasUrl && att.file_url.startsWith('data:');
    const isImage = att.file_type && att.file_type.startsWith('image/');
    const isPdf = att.file_type === 'application/pdf';
    const canPreview = hasUrl && (isImage || isPdf);
    const icon = getStudentFileIcon(att.file_type);
    const size = formatStudentFileSize(att.file_size);

    const pill = document.createElement('div');
    pill.className = 'attachment-pill';

    const nameSpan = document.createElement('span');
    nameSpan.innerHTML = `<i class="fa-solid ${icon}"></i> ${att.file_name}${size ? ` <span style="color:#aaa;">(${size})</span>` : ''}`;

    const actions = document.createElement('span');
    actions.className = 'pill-actions';

    if (canPreview) {
      const viewBtn = document.createElement('button');
      viewBtn.className = 'pill-btn pill-view';
      viewBtn.innerHTML = '<i class="fa-solid fa-eye"></i> View';
      viewBtn.addEventListener('click', () => openAttachmentPreview(att.file_url, att.file_name, att.file_type));
      actions.appendChild(viewBtn);
    }

    if (hasUrl) {
      const dlBtn = document.createElement('a');
      dlBtn.className = 'pill-btn pill-dl';
      dlBtn.href = att.file_url;
      dlBtn.download = att.file_name;
      if (!isDataUrl) { dlBtn.target = '_blank'; dlBtn.rel = 'noopener noreferrer'; }
      dlBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download';
      actions.appendChild(dlBtn);
    } else {
      const noLink = document.createElement('span');
      noLink.style.cssText = 'color:#f97316;font-size:10px;';
      noLink.textContent = 'no link';
      actions.appendChild(noLink);
    }

    pill.appendChild(nameSpan);
    pill.appendChild(actions);
    list.appendChild(pill);
  });
  container.style.display = '';
}

function openAttachmentPreview(url, name, type) {
  const modal = document.getElementById('att-preview-modal');
  const img = document.getElementById('att-preview-img');
  const iframe = document.getElementById('att-preview-iframe');
  document.getElementById('att-preview-name').textContent = name;
  const dl = document.getElementById('att-preview-dl');
  dl.href = url; dl.download = name;
  img.style.display = 'none'; img.src = '';
  iframe.style.display = 'none'; iframe.src = '';
  if (type && type.startsWith('image/')) { img.src = url; img.style.display = 'block'; }
  else if (type === 'application/pdf') { iframe.src = url; iframe.style.display = 'block'; }
  modal.style.display = 'flex';
}

function closeAttachmentPreview() {
  const modal = document.getElementById('att-preview-modal');
  modal.style.display = 'none';
  document.getElementById('att-preview-img').src = '';
  document.getElementById('att-preview-iframe').src = '';
}

function getStudentFileIcon(fileType) {
  if (!fileType) return 'fa-file';
  if (fileType.startsWith('image/'))        return 'fa-file-image';
  if (fileType === 'application/pdf')        return 'fa-file-pdf';
  if (fileType.includes('word'))             return 'fa-file-word';
  if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv'))
                                             return 'fa-file-excel';
  return 'fa-file';
}

function formatStudentFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function editTicket(ticketId) {
  const tickets = await getTickets();
  const ticket = tickets.find(t => t.id === ticketId);
  
  if (ticket) {
    document.getElementById("campusSelect").value = ticket.campus_location || "";
    document.getElementById("deptSelect").value = ticket.department || "";
    document.querySelector('input[placeholder="Select CCs"]').value = Array.isArray(ticket.cc_emails) ? ticket.cc_emails.join(', ') : (ticket.cc_emails || "");
    document.querySelector('input[placeholder="Enter subject"]').value = ticket.subject || "";
    document.getElementById("editor").innerHTML = ticket.description || "";
    
    const createBtn = document.querySelector('.form-buttons .btn-black');
    if (createBtn) {
      createBtn.textContent = 'Update Ticket';
      createBtn.onclick = () => updateExistingTicket(ticketId);
    }

    // Scroll to form
    document.getElementById('ticketForm')?.scrollIntoView({ behavior: 'smooth' });
  }
}

async function updateExistingTicket(ticketId) {
  const campus      = document.getElementById("campusSelect")?.value || '';
  const dept        = document.getElementById("deptSelect")?.value || '';
  const ccsRaw      = document.querySelector('input[placeholder="Select CCs"]')?.value || '';
  const subject     = document.querySelector('input[placeholder="Enter subject"]')?.value || '';
  const description = document.getElementById("editor")?.innerText || "";
  const placeholder = "Enter description. Type / to open a list";

  const updates = {
    campus_location: campus,
    department:      dept,
    cc_emails:       ccsRaw.split(',').map(e => e.trim()).filter(Boolean),
    subject:         subject,
    description:     description === placeholder ? '' : description
  };

  try {
    await updateTicket(ticketId, updates);
    alert('Ticket updated successfully!');
    loadTickets();
    resetForm();
  } catch (error) {
    console.error('Error updating ticket:', error);
    alert('Error updating ticket. Please try again.');
  }
}

async function deleteTicket(ticketId) {
  if (confirm("Are you sure you want to delete this ticket?")) {
    try {
      await deleteTicketFromDB(ticketId);
      alert('Ticket deleted successfully!');
      loadTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Error deleting ticket. Please try again.');
    }
  }
}

function showViewTicket() {
  const popup = document.getElementById('popupOverlay');
  if (popup) popup.style.display = 'none';
  if (window._lastCreatedTicketId) {
    viewTicket(window._lastCreatedTicketId);
  }
}

function triggerWheel() {
  const wheel = document.getElementById('hiddenWheel');
  if (wheel) wheel.click();
}

function resetForm() {
  // Hide popup overlay
  const popup = document.getElementById('popupOverlay');
  if (popup) popup.style.display = 'none';
  // Reset the form fields
  const form = document.getElementById("ticketForm");
  if (form) form.reset();

  // Reset rich-text editor
  const editor = document.getElementById("editor");
  if (editor) editor.innerHTML = "Enter description. Type / to open a list";

  // Reset button text
  const createBtn = document.querySelector('.form-buttons .btn-black');
  if (createBtn) {
    createBtn.textContent = 'Create';
    createBtn.onclick = createTicket;
  }
}

function generateTicketID() {
  const now = new Date();
  const datePart =
    now.getFullYear().toString().slice(-2) +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");
  const randomPart = Math.floor(Math.random() * 999 + 1)
    .toString()
    .padStart(3, "0");
  return `#${datePart}-${randomPart}`;
}

// Close view ticket modal
function closeViewTicket() {
  const overlay = document.getElementById("viewTicketOverlay");
  if (overlay) overlay.style.display = "none";
}

async function loadStudentActivityFeed(ticketId) {
  const feed = document.getElementById('student-activity-feed');
  if (!feed) return;
  feed.innerHTML = '';

  const { data, error } = await window.supabase
    .from('activity_log')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('action', 'email')
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) return;

  data.forEach(act => {
    const colonIdx = act.description ? act.description.indexOf(': ') : -1;
    const author  = colonIdx >= 0 ? act.description.slice(0, colonIdx) : 'Staff';
    const message = colonIdx >= 0 ? act.description.slice(colonIdx + 2) : (act.description || '');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
      <span class="log-user" style="color:#1976d2;"><i class="fa-solid fa-envelope" style="margin-right:4px;"></i>${author}</span>
      <span class="log-text">${message} <em style="color:#aaa;font-size:11px;">— ${new Date(act.created_at).toLocaleString()}</em></span>
    `;
    feed.appendChild(entry);
  });
}