// Import Supabase client
import { supabase } from '../supabase-config.js';

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

async function saveTicket(ticket) {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert(ticket);
    
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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
  
  filteredTickets.forEach(ticket => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ticket.id}</td>
      <td>${ticket.subject}</td>
      <td>${formatDate(ticket.created_at)}</td>
      <td>${ticket.status}</td>
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
  const userEmail = localStorage.getItem("userEmail");
  
  // Show tickets created by this user
  return tickets.filter(ticket => 
    ticket.email === userEmail
  );
}

// Handle search functionality
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
  const userEmail = localStorage.getItem("userEmail");
  const userTickets = tickets.filter(t => t.email === userEmail);
  const allCount = userTickets.length;
  const pendingCount = userTickets.filter(t => t.status === 'In Progress').length;
  const closedCount = userTickets.filter(t => t.status === 'Resolved').length;

  const card1 = document.querySelector('.stat-card:nth-child(1) .stat-number');
  const card2 = document.querySelector('.stat-card:nth-child(2) .stat-number');
  const card3 = document.querySelector('.stat-card:nth-child(3) .stat-number');
  if (card1) card1.textContent = allCount;
  if (card2) card2.textContent = pendingCount;
  if (card3) card3.textContent = closedCount;
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

// CRUD Operations
async function createTicket(event) {
  event.preventDefault();
  const campus = document.querySelector("select:first-of-type")?.value || "Not Specified";
  const dept = document.querySelectorAll("select")[1]?.value || "Not Specified";
  const ccs = document.querySelector('input[placeholder="Select CCs"]')?.value || "none";
  const subject = document.querySelector('input[placeholder="Enter subject"]')?.value || "No Subject";
  const description = document.getElementById("editor")?.innerText || "";
  const userFullName = localStorage.getItem("userFullName") || "Anonymous";
  const userEmail = localStorage.getItem("userEmail") || "unknown@mapua.edu.ph";

  const ccEmails = ccs.split(',').map(e => e.trim()).filter(Boolean);

  const newTicket = {
    subject:          subject,
    description:      description,
    reporter_email:   userEmail,
    reporter_name:    userFullName,
    campus_location:  campus,
    department:       dept,
    cc_emails:        ccEmails,
    status:           'open',
    priority:         'medium',
    sla_target_hours: 24
  };

  try {
    const saved = await saveTicket(newTicket);
    if (!saved) {
      alert('Error creating ticket. Please check your connection and try again.');
      return;
    }

    // Upload any attached files to Supabase Storage and record in attachments table
    if (uploadedFiles.length > 0) {
      await uploadTicketAttachments(saved.id, uploadedFiles);
      uploadedFiles = [];
      renderFileList();
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

async function uploadTicketAttachments(ticketId, files) {
  const userEmail = localStorage.getItem('userEmail') || 'unknown';
  for (const file of files) {
    try {
      // Sanitise filename to avoid path issues
      const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${ticketId}/${Date.now()}_${safeName}`;

      const { data: uploadData, error: uploadErr } = await window.supabase
        .storage
        .from('ticket-attachments')
        .upload(storagePath, file, { upsert: false });

      if (uploadErr) {
        console.error('File upload error:', uploadErr);
        continue;
      }

      // Get public URL
      const { data: urlData } = window.supabase
        .storage
        .from('ticket-attachments')
        .getPublicUrl(storagePath);

      const fileUrl = urlData?.publicUrl || '';

      // Insert row in attachments table
      const { error: insertErr } = await window.supabase
        .from('attachments')
        .insert({
          ticket_id:   ticketId,
          file_name:   file.name,
          file_url:    fileUrl,
          file_size:   file.size,
          file_type:   file.type,
          uploaded_by: userEmail
        });

      if (insertErr) console.error('Attachment insert error:', insertErr);
    } catch (err) {
      console.error('Unexpected upload error:', err);
    }
  }
}

async function viewTicket(ticketId) {
  const tickets = await getTickets();
  const ticket = tickets.find(t => t.id === ticketId);
  
  if (ticket) {
    // Show view ticket modal with ticket details
    document.getElementById("viewTicketIDDisplay").innerText = `Ticket ${ticket.id}`;
    document.getElementById("viewCampus").innerText = ticket.campus || "Not Specified";
    document.getElementById("viewDept").innerText = ticket.department || "Not Specified";
    document.getElementById("viewSubject").innerText = ticket.subject || "No Subject";
    document.getElementById("viewDescription").innerHTML = ticket.description;
    document.getElementById("viewTimeStamp").innerText = formatDate(ticket.created_at);
    
    const overlay = document.getElementById("viewTicketOverlay");
    if (overlay) overlay.style.display = "flex";
  }
}

async function editTicket(ticketId) {
  const tickets = await getTickets();
  const ticket = tickets.find(t => t.id === ticketId);
  
  if (ticket) {
    // Populate form with ticket data for editing
    document.querySelector("select:first-of-type").value = ticket.campus || "";
    document.querySelectorAll("select")[1].value = ticket.department || "";
    document.querySelector('input[placeholder="Select CCs"]').value = ticket.cc || "";
    document.querySelector('input[placeholder="Enter subject"]').value = ticket.subject || "";
    document.getElementById("editor").innerHTML = ticket.description || "";
    
    // Show edit mode
    const createBtn = document.querySelector('.form-buttons .btn-black');
    if (createBtn) {
      createBtn.textContent = 'Update Ticket';
      createBtn.onclick = () => updateExistingTicket(ticketId);
    }
  }
}

async function updateExistingTicket(ticketId) {
  const campus = document.querySelector("select:first-of-type")?.value || "Not Specified";
  const dept = document.querySelectorAll("select")[1]?.value || "Not Specified";
  const ccs = document.querySelector('input[placeholder="Select CCs"]')?.value || "none";
  const subject = document.querySelector('input[placeholder="Enter subject"]')?.value || "No Subject";
  const description = document.getElementById("editor")?.innerText || "";

  const updates = {
    campus: campus,
    department: dept,
    cc: ccs,
    subject: subject,
    description: description
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