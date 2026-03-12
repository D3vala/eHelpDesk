// staff-dashboard.js — uses window.supabase initialised in HTML (no ES module imports needed)

// 1. GLOBAL FUNCTIONS (accessible from inline onclick handlers)
function handleLogout() {
  localStorage.clear();
  window.location.href = "../login.html";
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAILJS
// ─────────────────────────────────────────────────────────────────────────────

// Account 1 — Replies & Ticket Creation
const EMAILJS_ACCT1_SERVICE  = 'service_x81e8u7';
const EMAILJS_ACCT1_KEY      = 'tuIeGDI1S5x_SUbZI';
const EMAILJS_REPLY_TEMPLATE = 'template_4cqrvwy';

// Account 2 — Status Updates, Completion & CC Notifications
const EMAILJS_ACCT2_SERVICE   = 'service_t2mqqyk';
const EMAILJS_ACCT2_KEY       = 'GXadls4W2_hI1JF8c';
const EMAILJS_STATUS_TEMPLATE = 'template_wbarg4o';

// EmailJS Functions for Staff
async function sendStatusUpdateEmail(ticket, oldStatus, newStatus) {
  try {
    await emailjs.send(EMAILJS_ACCT2_SERVICE, EMAILJS_STATUS_TEMPLATE, {
      to_email:   ticket.reporter_email,
      to_name:    ticket.reporter_name,
      ticket_id:  ticket.ticket_id || ticket.id,
      subject:    ticket.subject,
      old_status: formatStatus(oldStatus),
      new_status: formatStatus(newStatus),
      updated_at: new Date().toLocaleString()
    }, { publicKey: EMAILJS_ACCT2_KEY });
    console.log('Status update email sent.');
    return true;
  } catch (error) {
    console.error('Error sending status update email:', error);
    return false;
  }
}

async function sendTicketCompletionEmail(ticket) {
  console.log('sendTicketCompletionEmail called with:', ticket);
  try {
    const result = await emailjs.send(EMAILJS_ACCT2_SERVICE, EMAILJS_STATUS_TEMPLATE, {
      to_email:     ticket.reporter_email,
      to_name:      ticket.reporter_name,
      ticket_id:    ticket.ticket_id || ticket.id,
      subject:      ticket.subject,
      completed_at: new Date().toLocaleString()
    }, { publicKey: EMAILJS_ACCT2_KEY });
    console.log('Ticket completion email sent. Result:', result);
    alert('Completion email sent to: ' + ticket.reporter_email);
    return true;
  } catch (error) {
    console.error('Error sending ticket completion email:', error);
    alert('EMAIL FAILED: ' + (error.text || error.message || JSON.stringify(error)));
    return false;
  }
}

async function sendCCNotificationEmail(ticket, action) {
  if (!ticket.cc_emails || ticket.cc_emails.length === 0) return;
  for (const ccEmail of ticket.cc_emails) {
    try {
      await emailjs.send(EMAILJS_ACCT2_SERVICE, EMAILJS_STATUS_TEMPLATE, {
        to_email:       ccEmail,
        to_name:        'CC Recipient',
        ticket_id:      ticket.ticket_id || ticket.id,
        subject:        ticket.subject,
        action:         action,
        reporter_name:  ticket.reporter_name,
        reporter_email: ticket.reporter_email,
        updated_at:     new Date().toLocaleString()
      }, { publicKey: EMAILJS_ACCT2_KEY });
      console.log(`CC notification email sent to ${ccEmail}.`);
    } catch (error) {
      console.error(`Error sending CC notification email to ${ccEmail}:`, error);
    }
  }
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
        tr.className = 'ticket-row';
        tr.title = 'Click to view details';
        tr.onclick = () => viewTicketDetails(ticket.id);
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

// 7. TICKET DETAIL MODAL
let currentTicketId = null;
let staffReplyMode  = 'email';
let slaIntervalId   = null;

async function viewTicketDetails(id) {
    currentTicketId = id;

    const { data: ticket, error } = await window.supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !ticket) { console.error('Error loading ticket:', error); return; }

    // Header
    document.getElementById('sd-modal-ticket-id').textContent = ticket.ticket_id || ('#' + ticket.id);
    document.getElementById('sd-modal-ticket-subject').textContent = 'Subject: ' + (ticket.subject || '');
    const badge = document.getElementById('sd-modal-status-badge');
    badge.className = 'status-pill ' + getStatusClass(ticket.status);
    badge.textContent = formatStatus(ticket.status);

    // Description
    document.getElementById('sd-modal-description').textContent = ticket.description || 'No description provided.';

    // Attachments
    await loadStaffAttachments(id);

    // Reporter
    const name = ticket.reporter_name || ticket.reporter_email || 'Unknown';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('sd-modal-reporter-initials').textContent = initials;
    document.getElementById('sd-modal-reporter-name').textContent    = name;
    document.getElementById('sd-modal-reporter-email').textContent   = ticket.reporter_email || '-';

    // Ticket details
    document.getElementById('sd-modal-campus').textContent  = ticket.campus_location || '-';
    document.getElementById('sd-modal-dept').textContent    = ticket.department       || '-';
    const ccList = Array.isArray(ticket.cc_emails) ? ticket.cc_emails.join(', ') : (ticket.cc_emails || '-');
    document.getElementById('sd-modal-cc').textContent      = ccList || '-';
    document.getElementById('sd-modal-created').textContent = formatDate(ticket.created_at);

    // SLA timer
    startSlaTimer(ticket);

    // Activity
    await loadStaffActivityFeed(id);

    // Status select
    const statusSelect = document.getElementById('sd-modal-status-select');
    if (statusSelect) statusSelect.value = ticket.status || 'open';

    // Reset reply box
    switchStaffReplyTab('email');
    document.getElementById('sd-reply-textarea').value = '';
    updateStaffCharCount();

    // Show modal
    document.getElementById('ticket-detail-modal').classList.add('active');
}
window.viewTicketDetails = viewTicketDetails;

async function loadStaffAttachments(ticketId) {
    const container = document.getElementById('sd-modal-attachments');
    container.innerHTML = '<h4>ATTACHMENTS</h4>';

    const { data, error } = await window.supabase
        .from('attachments')
        .select('*')
        .eq('ticket_id', ticketId);

    if (error || !data || data.length === 0) {
        container.innerHTML += '<p style="font-size:13px;color:#888;">No attachments.</p>';
        return;
    }
    data.forEach(att => {
        const hasUrl = att.file_url && att.file_url !== 'pending';
        const isDataUrl = hasUrl && att.file_url.startsWith('data:');
        const isImage = att.file_type && att.file_type.startsWith('image/');
        const isPdf = att.file_type === 'application/pdf';
        const canPreview = hasUrl && (isImage || isPdf);

        const pill = document.createElement('div');
        pill.className  = 'attachment-pill';

        const nameSpan = document.createElement('span');
        nameSpan.innerHTML = `<i class="fa-solid ${getStaffFileIcon(att.file_type)}"></i> ${att.file_name} <span style="color:#aaa;">(${formatStaffFileSize(att.file_size)})</span>`;

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
            noLink.textContent = 'no download link';
            actions.appendChild(noLink);
        }

        pill.appendChild(nameSpan);
        pill.appendChild(actions);
        container.appendChild(pill);
    });
}

async function loadStaffActivityFeed(ticketId) {
    const feed = document.getElementById('sd-activity-feed');
    feed.innerHTML = '';

    const { data, error } = await window.supabase
        .from('activity_log')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        feed.innerHTML = '<p style="font-size:13px;color:#888;">No activity yet.</p>';
        return;
    }
    data.forEach(act => {
        let iconClass = 'fa-gear', badgeClass = 'system', badgeText = 'System';
        if (act.action === 'internal') { iconClass = 'fa-lock';                  badgeClass = 'internal'; badgeText = 'Internal Note'; }
        else if (act.action === 'email') { iconClass = 'fa-envelope';            badgeClass = 'email';    badgeText = 'Email Reply'; }
        else if (act.action === 'alert') { iconClass = 'fa-triangle-exclamation'; badgeClass = 'alert';    badgeText = 'Escalation'; }

        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
            <div class="activity-icon ${badgeClass}"><i class="fa-solid ${iconClass}"></i></div>
            <div class="activity-content">
                <div class="activity-meta">
                    <strong>${act.description ? act.description.split(':')[0] : 'System'}</strong>
                    <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                <p>${act.description || ''}</p>
                <span class="activity-time">${new Date(act.created_at).toLocaleString()}</span>
            </div>`;
        feed.appendChild(div);
    });
}

function startSlaTimer(ticket) {
    if (slaIntervalId) clearInterval(slaIntervalId);
    const timerEl = document.getElementById('sd-modal-sla-timer');
    if (!timerEl) return;
    function tick() {
        if (!ticket.created_at) { timerEl.textContent = '--:--:--'; return; }
        const deadline  = new Date(ticket.created_at).getTime() + 24 * 3600 * 1000;
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
            timerEl.textContent = 'BREACHED';
            timerEl.style.color = '#ef4444';
        } else {
            const h = Math.floor(remaining / 3600000);
            const m = Math.floor((remaining % 3600000) / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            timerEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            timerEl.style.color = remaining < 3600000 ? '#f97316' : '#111';
        }
    }
    tick();
    slaIntervalId = setInterval(tick, 1000);
}

function closeTicketModal() {
    document.getElementById('ticket-detail-modal').classList.remove('active');
    currentTicketId = null;
    if (slaIntervalId) { clearInterval(slaIntervalId); slaIntervalId = null; }
}
window.closeTicketModal = closeTicketModal;

async function saveStaffChanges() {
    if (!currentTicketId) return;
    const statusSelect = document.getElementById('sd-modal-status-select');
    const newStatus = statusSelect?.value;
    if (!newStatus) return;

    const staffName = localStorage.getItem('userFullName') || 'Staff';
    const btn = document.querySelector('.modal-footer button:last-child');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    const { data: ticket } = await window.supabase
        .from('tickets')
        .select('status, reporter_email, reporter_name, ticket_id, subject')
        .eq('id', currentTicketId)
        .single();

    const statusChanged = ticket && ticket.status !== newStatus;

    const { error } = await window.supabase
        .from('tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', currentTicketId);

    if (error) {
        alert('Failed to save changes.');
        if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
        return;
    }

    await window.supabase.from('activity_log').insert({
        ticket_id:   currentTicketId,
        action:      'status_changed',
        description: `${staffName} updated status to ${newStatus}`,
        metadata:    { old_status: ticket?.status, new_status: newStatus }
    });

    if (statusChanged && ticket?.reporter_email) {
        if (newStatus === 'resolved') {
            const sent = await sendTicketCompletionEmail({ ...ticket, status: newStatus });
            if (!sent) console.error('Ticket completion email failed.');
        } else {
            const sent = await sendStatusUpdateEmail(ticket, ticket.status, newStatus);
            if (!sent) console.error('Status notification email failed.');
        }
    }

    const badge = document.getElementById('sd-modal-status-badge');
    if (badge) {
        badge.className = 'status-pill ' + getStatusClass(newStatus);
        badge.textContent = formatStatus(newStatus);
    }
    await loadStaffActivityFeed(currentTicketId);
    await loadTickets();
    if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    alert('Changes saved!');
}
window.saveStaffChanges = saveStaffChanges;

function switchStaffReplyTab(mode) {
    staffReplyMode = mode;
    const tabEmail = document.getElementById('sd-tab-email');
    const tabInt   = document.getElementById('sd-tab-internal');
    const textarea = document.getElementById('sd-reply-textarea');
    if (mode === 'email') {
        tabEmail.classList.add('active');  tabInt.classList.remove('active');
        textarea.placeholder = 'Type message to send via email...';
        textarea.classList.remove('internal-note-mode');
    } else {
        tabInt.classList.add('active');    tabEmail.classList.remove('active');
        textarea.placeholder = 'Type an internal note (visible to staff only)...';
        textarea.classList.add('internal-note-mode');
    }
    updateStaffCharCount();
}
window.switchStaffReplyTab = switchStaffReplyTab;

function updateStaffCharCount() {
    const val = document.getElementById('sd-reply-textarea').value;
    // no char counter needed for email mode
}
window.updateStaffCharCount = updateStaffCharCount;

async function submitStaffMessage() {
    const textarea  = document.getElementById('sd-reply-textarea');
    const text      = textarea.value.trim();
    if (!text || !currentTicketId) return;

    const staffName = localStorage.getItem('userFullName') || 'Staff';
    const sendBtn   = document.querySelector('.submit-reply-btn');

    // If email mode, actually send an email to the reporter
    if (staffReplyMode === 'email') {
        // Get reporter email from the currently displayed ticket
        const { data: ticket } = await window.supabase
            .from('tickets')
            .select('reporter_email, ticket_id, subject, status')
            .eq('id', currentTicketId)
            .single();

        if (!ticket?.reporter_email) {
            alert('No reporter email found for this ticket.');
            return;
        }

        if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending...'; }

        try {
            await emailjs.send(EMAILJS_ACCT1_SERVICE, EMAILJS_REPLY_TEMPLATE, {
                to_email:   ticket.reporter_email,
                ticket_id:  ticket.ticket_id || ('#' + currentTicketId),
                staff_name: staffName,
                message:    text,
            }, { publicKey: EMAILJS_ACCT1_KEY });
        } catch (err) {
            alert('Failed to send email: ' + (err.text || err.message || 'Unknown error'));
            if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send Message'; }
            return;
        }

        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send Message'; }
    }

    // Log to activity feed
    const { error } = await window.supabase
        .from('activity_log')
        .insert({
            ticket_id:   currentTicketId,
            action:      staffReplyMode,
            description: `${staffName}: ${text}`,
            metadata:    { mode: staffReplyMode, author: staffName }
        });

    if (error) { console.error('Failed to save message:', error); return; }
    textarea.value = '';
    updateStaffCharCount();
    await loadStaffActivityFeed(currentTicketId);
}
window.submitStaffMessage = submitStaffMessage;

function getStaffFileIcon(fileType) {
    if (!fileType) return 'fa-file';
    if (fileType.startsWith('image/'))          return 'fa-file-image';
    if (fileType === 'application/pdf')          return 'fa-file-pdf';
    if (fileType.includes('word'))               return 'fa-file-word';
    if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv'))
                                                 return 'fa-file-excel';
    return 'fa-file';
}

function formatStaffFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024)              return `${bytes} B`;
    if (bytes < 1024 * 1024)       return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
