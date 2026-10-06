// ============================================================
//  VkTori – Main Application Controller
// ============================================================

// ── App State ────────────────────────────────────────────
const APP = {
  role: 'admin',
  currentPage: 'dashboard',
  pageParams: {},
  sidebarCollapsed: false,
};

// ── Navigation Config per Role ───────────────────────────
const NAV_CONFIG = {
  admin: [
    { section: 'Main' },
    { id: 'dashboard',     label: 'Dashboard',       icon: 'grid' },
    { id: 'clients',       label: 'Parties',          icon: 'users', badge: null },
    { id: 'cases',         label: 'Matters',            icon: 'folder', badge: '2' },
    { id: 'calendar',      label: 'Calendar',         icon: 'calendar' },
    { section: 'Work' },
    { id: 'documents',     label: 'Documents',        icon: 'file' },
    { id: 'billing',       label: 'Billing',          icon: 'dollar' },
    { id: 'email',         label: 'Email',            icon: 'mail', badge: '4' },
    { id: 'ai',            label: 'VyNius',     icon: 'zap' },
    { section: 'Admin' },
    { id: 'users',         label: 'User Management',  icon: 'shield' },
    { id: 'settings',      label: 'Settings',         icon: 'settings' },
  ],
  lawyer: [
    { section: 'Main' },
    { id: 'lawyer-dashboard',  label: 'Dashboard',      icon: 'grid' },
    { id: 'lawyer-clients',    label: 'My Parties',     icon: 'users' },
    { id: 'lawyer-cases',      label: 'My Matters',       icon: 'folder', badge: '1' },
    { id: 'calendar',          label: 'Calendar',       icon: 'calendar' },
    { section: 'Work' },
    { id: 'documents',         label: 'Documents',      icon: 'file' },
    { id: 'billing',           label: 'Billing',        icon: 'dollar' },
    { id: 'email',             label: 'Email',          icon: 'mail', badge: '2' },
    { id: 'ai',                label: 'VyNius',   icon: 'zap' },
    { section: 'Account' },
    { id: 'settings',          label: 'Settings',       icon: 'settings' },
  ],
  client: [
    { section: 'Portal' },
    { id: 'client-dashboard',  label: 'My Dashboard',   icon: 'grid' },
    { id: 'client-cases',      label: 'My Matters',       icon: 'folder' },
    { id: 'client-documents',  label: 'My Documents',   icon: 'file' },
    { id: 'client-billing',    label: 'Billing',        icon: 'dollar', badge: '1' },
    { id: 'client-messages',   label: 'Messages',       icon: 'chat', badge: '3' },
    { section: 'Account' },
    { id: 'client-profile',    label: 'My Profile',     icon: 'user' },
  ],
};

// ── Icons Map ────────────────────────────────────────────
const ICONS = {
  grid:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  users:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  folder:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  calendar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  file:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  dollar:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  mail:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  zap:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  shield:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  user:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  chat:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
};

// ── Role Config ──────────────────────────────────────────
const ROLE_CONFIG = {
  admin:  { name: 'Admin User',       role: 'Administrator', avatar: 'AU', color: '#C9A24A', home: 'dashboard' },
  lawyer: { name: 'Alex Parker',      role: 'Lawyer',        avatar: 'AP', color: '#2563eb', home: 'lawyer-dashboard' },
  client: { name: 'Sarah Mitchell',   role: 'Client Portal', avatar: 'SM', color: '#059669', home: 'client-dashboard' },
};

// ── Login ─────────────────────────────────────────────────
let selectedRole = 'admin';
function selectRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-role="${role}"]`).classList.add('active');
}

function handleLogin(e) {
  e.preventDefault();
  APP.role = selectedRole;
  initApp();
}

// ── Init App ─────────────────────────────────────────────
function initApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  
  const cfg = ROLE_CONFIG[APP.role];
  
  // Set sidebar user info
  document.getElementById('sidebar-avatar').textContent = cfg.avatar;
  document.getElementById('sidebar-user-info').innerHTML = `
    <span class="user-name">${cfg.name}</span>
    <span class="user-role-badge">${cfg.role}</span>
  `;
  
  // Set topbar user info
  document.getElementById('topbar-avatar').textContent = cfg.avatar;
  document.getElementById('topbar-username').textContent = cfg.name;
  document.getElementById('topbar-role').textContent = cfg.role;
  
  // Build sidebar navigation
  buildSidebarNav();
  
  // Navigate to home
  navigateTo(ROLE_CONFIG[APP.role].home);
}

// ── Build Sidebar Nav ────────────────────────────────────
function buildSidebarNav() {
  const nav = document.getElementById('sidebar-nav');
  const items = NAV_CONFIG[APP.role];
  
  nav.innerHTML = items.map(item => {
    if (item.section) {
      return `<div class="nav-section-label">${item.section}</div>`;
    }
    return `
    <div class="nav-item" id="nav-${item.id}" data-label="${item.label}" onclick="navigateTo('${item.id}')">
      <span class="nav-icon">${ICONS[item.icon] || ''}</span>
      <span class="nav-label">${item.label}</span>
      ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
    </div>`;
  }).join('');
}

// ── Navigate To ──────────────────────────────────────────
function navigateTo(pageId, params = {}, saveHistory = false) {
  APP.currentPage = pageId;
  APP.pageParams = params;

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItem = document.getElementById(`nav-${pageId}`);
  if (navItem) navItem.classList.add('active');

  // Render page
  const content = document.getElementById('page-content');
  content.innerHTML = getPageHTML(pageId, params);
  content.scrollTop = 0;

  // Post-render hooks
  afterRender(pageId);
}

// ── Get Page HTML ────────────────────────────────────────
function getPageHTML(pageId, params) {
  // Admin pages
  if (pageId === 'dashboard')     return renderAdminDashboard();
  if (pageId === 'clients')       return renderPageHeader('Parties','Manage all parties',`<button class="btn btn-primary btn-sm" onclick="openModal('add-client')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Party</button>`) + renderClientsTable(DATA.clients);
  if (pageId === 'cases')         return renderPageHeader('Matters','All legal matters',`<button class="btn btn-primary btn-sm" onclick="openModal('add-case')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Matter</button>`) + renderCasesTable(DATA.cases);
  if (pageId === 'calendar')      return renderCalendarPage();
  if (pageId === 'documents')     return renderDocumentsPage();
  if (pageId === 'billing')       return renderBillingPage();
  if (pageId === 'email')         return renderEmailPage();
  if (pageId === 'ai')            return renderAIPage();
  if (pageId === 'users')         return renderUserManagementPage();
  if (pageId === 'settings')      return renderSettingsPage();
  if (pageId === 'client-detail') return renderClientDetail(params.id || 'C001');
  if (pageId === 'case-detail')   return renderCaseDetail(params.id || 'CASE-2045');

  // Lawyer pages
  if (pageId === 'lawyer-dashboard') return renderLawyerDashboard();
  if (pageId === 'lawyer-clients')   return renderLawyerClients();
  if (pageId === 'lawyer-cases')     return renderLawyerCases();

  // Client pages
  if (pageId === 'client-dashboard') return renderClientDashboard();
  if (pageId === 'client-cases')     return renderClientCases();
  if (pageId === 'client-documents') return renderClientDocuments();
  if (pageId === 'client-billing')   return renderClientBilling();
  if (pageId === 'client-messages')  return renderClientMessages();
  if (pageId === 'client-profile')   return renderClientProfile();

  return `<div class="empty-state"><div class="empty-icon">🚧</div><div class="empty-title">Page under construction</div><div class="empty-desc">This page is coming soon.</div></div>`;
}

// ── After Render Hooks ───────────────────────────────────
function afterRender(pageId) {
  // Activate first nav item
  const firstNavItem = document.querySelector('.nav-item');
  if (firstNavItem && !document.querySelector('.nav-item.active')) {
    firstNavItem.classList.add('active');
  }
}

// ── Sidebar Toggle ────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    APP.sidebarCollapsed = !APP.sidebarCollapsed;
    sidebar.classList.toggle('collapsed', APP.sidebarCollapsed);
  }
}

// ── Notifications Panel ───────────────────────────────────
function toggleNotifications() {
  const panel = document.getElementById('notifications-panel');
  panel.classList.toggle('hidden');
}

// ── Profile Menu ──────────────────────────────────────────
function toggleProfileMenu() {
  // Simple toggle for now
}

// ── Logout ────────────────────────────────────────────────
function handleLogout() {
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-role="admin"]').classList.add('active');
  selectedRole = 'admin';
}

// ── Tab Switcher ──────────────────────────────────────────
function switchTab(tabsId, panelsId, index) {
  const tabs = document.querySelectorAll(`#${tabsId} .tab-btn`);
  const panels = document.querySelectorAll(`#${panelsId} .tab-panel`);
  tabs.forEach((t, i) => t.classList.toggle('active', i === index));
  panels.forEach((p, i) => p.classList.toggle('active', i === index));
}

// ── Modals ────────────────────────────────────────────────
function openModal(type) {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  overlay.classList.remove('hidden');
  container.classList.remove('hidden');
  container.innerHTML = getModalHTML(type);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-container').classList.add('hidden');
}

function getModalHTML(type) {
  const modals = {
    'add-client': {
      title: 'Add New Client',
      body: `
        <div class="form-row">
          <div class="form-field"><label>First Name <span class="required">*</span></label><input class="form-control" placeholder="John" /></div>
          <div class="form-field"><label>Last Name <span class="required">*</span></label><input class="form-control" placeholder="Doe" /></div>
        </div>
        <div class="form-field"><label>Email Address <span class="required">*</span></label><input class="form-control" type="email" placeholder="john@example.com" /></div>
        <div class="form-row">
          <div class="form-field"><label>Phone Number</label><input class="form-control" placeholder="+1 (555) 000-0000" /></div>
          <div class="form-field"><label>Client Type</label><select class="form-control"><option>Individual</option><option>Corporate</option></select></div>
        </div>
        <div class="form-field"><label>Matter Type</label><select class="form-control"><option>Civil Litigation</option><option>Family Law</option><option>Corporate Law</option><option>Real Estate</option><option>Employment</option></select></div>
        <div class="form-field"><label>Notes</label><textarea class="form-control" placeholder="Initial notes about this client..."></textarea></div>`,
      footer: `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary">Add Client</button>`
    },
    'add-case': {
      title: 'Create New Matter',
      body: `
        <div class="form-field"><label>Matter Title <span class="required">*</span></label><input class="form-control" placeholder="Plaintiff vs. Defendant" /></div>
        <div class="form-row">
          <div class="form-field"><label>Client <span class="required">*</span></label><select class="form-control"><option>Select client...</option>${DATA.clients.map(c => `<option>${c.name}</option>`).join('')}</select></div>
          <div class="form-field"><label>Assigned Lawyer</label><select class="form-control"><option>Select lawyer...</option>${DATA.lawyers.map(l => `<option>${l.name}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Matter Type</label><select class="form-control"><option>Civil Litigation</option><option>Family Law</option><option>Corporate</option><option>Real Estate</option><option>Employment</option><option>Intellectual Property</option></select></div>
          <div class="form-field"><label>Priority</label><select class="form-control"><option>High</option><option>Medium</option><option>Low</option></select></div>
        </div>
        <div class="form-field"><label>Filing Date</label><input class="form-control" type="date" /></div>
        <div class="form-field"><label>Matter Description</label><textarea class="form-control" placeholder="Brief description of the matter..."></textarea></div>`,
      footer: `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary">Create Matter</button>`
    },
    'add-user': {
      title: 'Add New User',
      body: `
        <div class="form-row">
          <div class="form-field"><label>First Name</label><input class="form-control" placeholder="Jane" /></div>
          <div class="form-field"><label>Last Name</label><input class="form-control" placeholder="Smith" /></div>
        </div>
        <div class="form-field"><label>Email Address</label><input class="form-control" type="email" placeholder="jane@victoriatulsidaslaw.com" /></div>
        <div class="form-row">
          <div class="form-field"><label>Role</label><select class="form-control"><option>Lawyer</option><option>Admin</option></select></div>
          <div class="form-field"><label>Specialty</label><select class="form-control"><option>Civil Litigation</option><option>Family Law</option><option>Corporate</option></select></div>
        </div>
        <div class="form-field"><label>Temporary Password</label><input class="form-control" type="password" placeholder="••••••••" /></div>`,
      footer: `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary">Add User</button>`
    },
    'create-invoice': {
      title: 'Create New Invoice',
      body: `
        <div class="form-row">
          <div class="form-field"><label>Client</label><select class="form-control">${DATA.clients.map(c => `<option>${c.name}</option>`).join('')}</select></div>
          <div class="form-field"><label>Related Case</label><select class="form-control">${DATA.cases.map(c => `<option>${c.id} – ${c.title}</option>`).join('')}</select></div>
        </div>
        <div class="form-field"><label>Description</label><textarea class="form-control" placeholder="Services rendered..."></textarea></div>
        <div class="form-row">
          <div class="form-field"><label>Amount ($)</label><input class="form-control" type="number" placeholder="0.00" /></div>
          <div class="form-field"><label>Due Date</label><input class="form-control" type="date" /></div>
        </div>`,
      footer: `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary">Create Invoice</button>`
    },
    'compose-email': {
      title: 'Compose Email',
      body: `
        <div class="form-field"><label>To</label><input class="form-control" placeholder="recipient@example.com" /></div>
        <div class="form-field"><label>Subject</label><input class="form-control" placeholder="Email subject..." /></div>
        <div class="form-field"><label>Message</label><textarea class="form-control" style="min-height:150px;" placeholder="Write your message..."></textarea></div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
          <button class="btn btn-secondary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Attach File
          </button>
          <span style="font-size:12px;color:var(--gray-400);">Link to case documents</span>
        </div>`,
      footer: `<button class="btn btn-secondary" onclick="closeModal()">Discard</button><button class="btn btn-primary">Send Email</button>`
    },
    'add-event': {
      title: 'Add Calendar Event',
      body: `
        <div class="form-field"><label>Event Title</label><input class="form-control" placeholder="Hearing, Meeting, Deadline..." /></div>
        <div class="form-row">
          <div class="form-field"><label>Date</label><input class="form-control" type="date" /></div>
          <div class="form-field"><label>Time</label><input class="form-control" type="time" /></div>
        </div>
        <div class="form-field"><label>Type</label><select class="form-control"><option>Hearing</option><option>Deadline</option><option>Meeting</option><option>Consultation</option></select></div>
        <div class="form-field"><label>Related Case</label><select class="form-control"><option>None</option>${DATA.cases.map(c => `<option>${c.id} – ${c.title}</option>`).join('')}</select></div>
        <div class="form-field"><label>Notes</label><textarea class="form-control" placeholder="Additional notes..."></textarea></div>`,
      footer: `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary">Add Event</button>`
    },
    'add-document': {
      title: 'Upload Document',
      body: `
        <div style="border:2px dashed var(--gray-200);border-radius:var(--radius-lg);padding:32px;text-align:center;cursor:pointer;margin-bottom:16px;transition:var(--transition);" onmouseover="this.style.borderColor='var(--primary-400)'" onmouseout="this.style.borderColor='var(--gray-200)'">
          <div style="font-size:32px;margin-bottom:8px;">📁</div>
          <div style="font-size:14px;font-weight:600;color:var(--gray-700);margin-bottom:4px;">Drop files here or click to browse</div>
          <div style="font-size:12px;color:var(--gray-400);">Supports PDF, DOC, DOCX, JPG, PNG (Max 50MB)</div>
        </div>
        <div class="form-field"><label>Related Case</label><select class="form-control"><option>None</option>${DATA.cases.map(c => `<option>${c.id} – ${c.title}</option>`).join('')}</select></div>
        <div class="form-field"><label>Document Type</label><select class="form-control"><option>Complaint</option><option>Evidence</option><option>Contract</option><option>Court Order</option><option>Other</option></select></div>`,
      footer: `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary">Upload</button>`
    },
  };

  const modal = modals[type] || { title:'Action', body:'<p>Dialog content</p>', footer:'<button class="btn btn-primary" onclick="closeModal()">OK</button>' };
  return `
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">${modal.title}</div>
      <button class="modal-close" onclick="closeModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="modal-body">${modal.body}</div>
    <div class="modal-footer">${modal.footer}</div>
  </div>`;
}

// ── AI Chat Logic ─────────────────────────────────────────
const AI_RESPONSES = {
  'summarize case-2045': 'Here\'s a summary of <strong>CASE-2045 – Smith vs. Jones Industrial</strong>:<br><br>📋 <strong>Type:</strong> Civil Litigation<br>👤 <strong>Client:</strong> Robert Chen<br>⚖️ <strong>Lawyer:</strong> Alex Parker<br>📅 <strong>Filed:</strong> Jan 15, 2025<br>🏛️ <strong>Next Hearing:</strong> Apr 20, 2025<br>⚡ <strong>Priority:</strong> High<br><br>The case involves a civil dispute. Current status is <em>Active</em>. Three documents have been filed to date, and evidence collection is approximately 60% complete.',
  'draft a demand letter': 'Here\'s a draft demand letter:<br><br><em>RE: DEMAND FOR [RELIEF]</em><br><br>Dear [Opposing Counsel / Party],<br><br>This letter is sent on behalf of our client, [CLIENT NAME], regarding the above-referenced matter. We hereby demand that you [SPECIFIC ACTION] within 10 business days of receipt of this letter.<br><br>Failure to comply may result in [LEGAL ACTION]. Our client reserves all rights and remedies available under California law.<br><br>Please respond in writing to this office at your earliest convenience.<br><br>Sincerely,<br>[ATTORNEY NAME]<br>VkTori',
  'what are upcoming deadlines?': 'Here are the <strong>upcoming deadlines and hearings</strong> this month:<br><br>📅 <strong>Apr 14</strong> – Hartwell Hearing (9:00 AM)<br>📅 <strong>Apr 18</strong> – Chen IP Review (2:00 PM)<br>🔴 <strong>Apr 20</strong> – Smith vs. Jones Hearing (10:30 AM) <span style="background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:11px;">HIGH PRIORITY</span><br>🔴 <strong>Apr 20</strong> – Invoice INV-0041 Overdue<br>📅 <strong>Apr 25</strong> – Mitchell Appeal (11:00 AM)<br>📅 <strong>Apr 30</strong> – Torres Hearing (1:00 PM)',
  'research ca contract law': 'Here\'s a summary of <strong>California Contract Law Basics</strong>:<br><br>Under California law, a valid contract requires:<br>1. <strong>Offer & Acceptance</strong> – Clear mutual agreement<br>2. <strong>Consideration</strong> – Something of value exchanged<br>3. <strong>Capacity</strong> – Parties must be legally competent<br>4. <strong>Legality</strong> – Subject matter must be lawful<br><br><strong>Statute of Limitations:</strong><br>• Written contracts: 4 years (Cal. CCP §337)<br>• Oral contracts: 2 years (Cal. CCP §339)<br><br>Would you like me to research a specific aspect of contract law?',
  'default': 'I understand your query. Based on the matter information available in VkTori, I can help with:<br><br>• 📋 Matter summarization and analysis<br>• ✍️ Document drafting assistance<br>• 📅 Deadline tracking and reminders<br>• 🔍 Legal research assistance<br>• 📊 Billing and time tracking queries<br><br>Please be more specific so I can provide a detailed response for your legal matter.'
};

function sendAIMessage(text) {
  const input = document.getElementById('ai-input');
  const message = text || (input ? input.value.trim() : '');
  if (!message) return;

  const messagesDiv = document.getElementById('ai-messages');
  if (!messagesDiv) return;

  // Add user message
  messagesDiv.innerHTML += `
  <div class="ai-message user">
    <div class="ai-avatar user">U</div>
    <div class="ai-bubble">${message}</div>
  </div>`;

  if (input) input.value = '';

  // Add typing indicator
  const typingId = 'ai-typing-' + Date.now();
  messagesDiv.innerHTML += `
  <div class="ai-message" id="${typingId}">
    <div class="ai-avatar">⚡</div>
    <div class="ai-bubble" style="color:var(--gray-400);">
      <span>Thinking</span>
      <span style="display:inline-block;animation:pulse 1s infinite;">...</span>
    </div>
  </div>`;
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Simulate response
  setTimeout(() => {
    const typing = document.getElementById(typingId);
    if (typing) {
      const key = Object.keys(AI_RESPONSES).find(k => message.toLowerCase().includes(k)) || 'default';
      typing.outerHTML = `
      <div class="ai-message">
        <div class="ai-avatar">⚡</div>
        <div class="ai-bubble">${AI_RESPONSES[key]}</div>
      </div>`;
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }, 1200);
}

function handleAIKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAIMessage();
  }
}

// ── Chat Message ──────────────────────────────────────────
function sendChatMessage() {
  const input = document.getElementById('chat-message-input');
  if (!input || !input.value.trim()) return;
  const body = document.getElementById('chat-body');
  if (!body) return;
  body.innerHTML += `
  <div class="message sent">
    <div class="avatar-sm" style="font-size:11px;background:linear-gradient(135deg,#0B1F3A,#C9A24A);">SM</div>
    <div>
      <div class="msg-bubble">${input.value}</div>
      <div class="msg-time" style="text-align:right;">Just now</div>
    </div>
  </div>`;
  input.value = '';
  body.scrollTop = body.scrollHeight;
}

function handleChatKeydown(e) {
  if (e.key === 'Enter') { e.preventDefault(); sendChatMessage(); }
}

// ── Close panels on outside click ────────────────────────
document.addEventListener('click', (e) => {
  if (!e.target.closest('#notif-btn') && !e.target.closest('#notifications-panel')) {
    document.getElementById('notifications-panel')?.classList.add('hidden');
  }
});

// ── Responsive Sidebar ────────────────────────────────────
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
  }
});
