// ============================================================
//  VkTori – Reusable UI Components
// ============================================================

// ── Status Badge Helper ──────────────────────────────────
function statusBadge(status) {
  const map = {
    active:   { cls: 'badge-green',  label: 'Active' },
    pending:  { cls: 'badge-amber',  label: 'Pending' },
    inactive: { cls: 'badge-gray',   label: 'Inactive' },
    closed:   { cls: 'badge-gray',   label: 'Closed' },
    paid:     { cls: 'badge-green',  label: 'Paid' },
    overdue:  { cls: 'badge-red',    label: 'Overdue' },
    high:     { cls: 'badge-red',    label: 'High' },
    medium:   { cls: 'badge-amber',  label: 'Medium' },
    low:      { cls: 'badge-blue',   label: 'Low' },
    open:     { cls: 'badge-blue',   label: 'Open' },
  };
  const d = map[status] || { cls: 'badge-gray', label: status };
  return `<span class="badge badge-dot ${d.cls}">${d.label}</span>`;
}

// ── Stat Card ────────────────────────────────────────────
function renderStatCard({ label, value, change, icon, color }) {
  return `
  <div class="stat-card ${color}">
    <div class="stat-top">
      <div class="stat-icon ${color}">${icon}</div>
      ${change ? `<span class="stat-change ${change.startsWith('+') ? 'up' : 'down'}">${change}</span>` : ''}
    </div>
    <div class="stat-value">${value}</div>
    <div class="stat-label">${label}</div>
  </div>`;
}

// ── Page Header ──────────────────────────────────────────
function renderPageHeader(title, subtitle, actions = '') {
  return `
  <div class="page-header">
    <div class="page-title">
      <h2>${title}</h2>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
    </div>
    <div class="page-actions">${actions}</div>
  </div>`;
}

// ── Client Table ─────────────────────────────────────────
function renderClientsTable(clients, showAdd = true) {
  return `
  <div class="table-container">
    <div class="table-toolbar">
      <div class="table-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search parties..." oninput="filterTable(this,'clients-tbody')" />
      </div>
      <div class="table-actions">
        <select class="btn btn-secondary btn-sm" style="padding:5px 10px;font-size:12px;">
          <option>All Status</option>
          <option>Active</option>
          <option>Pending</option>
          <option>Inactive</option>
        </select>
        ${showAdd ? `<button class="btn btn-primary btn-sm" onclick="openModal('add-client')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Client</button>` : ''}
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Client</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Type</th>
          <th>Matters</th>
          <th>Status</th>
          <th>Joined</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="clients-tbody">
        ${clients.map(c => `
        <tr>
          <td>
            <div class="td-name">
              <div class="avatar-sm" style="font-size:11px;">${c.avatar}</div>
              <div>
                <div class="name" onclick="navigateTo('client-detail', {id:'${c.id}'}, true)" style="cursor:pointer;">${c.name}</div>
                <div class="sub">${c.id}</div>
              </div>
            </div>
          </td>
          <td>${c.email}</td>
          <td>${c.phone}</td>
          <td><span class="badge badge-blue">${c.type}</span></td>
          <td><span style="font-weight:600;color:var(--gray-800)">${c.cases}</span></td>
          <td>${statusBadge(c.status)}</td>
          <td style="color:var(--gray-400);font-size:12px;">${c.joined}</td>
          <td>
            <div style="display:flex;gap:4px;">
              <button class="btn btn-secondary btn-icon btn-sm" title="View" onclick="navigateTo('client-detail', {id:'${c.id}'}, true)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button class="btn btn-secondary btn-icon btn-sm" title="Edit">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${renderTablePagination(clients.length)}
  </div>`;
}

// ── Cases Table ──────────────────────────────────────────
function renderCasesTable(cases, showAdd = true) {
  return `
  <div class="table-container">
    <div class="table-toolbar">
      <div class="table-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search matters..." oninput="filterTable(this,'cases-tbody')" />
      </div>
      <div class="table-actions">
        <select class="btn btn-secondary btn-sm" style="padding:5px 10px;font-size:12px;">
          <option>All Status</option>
          <option>Active</option>
          <option>Pending</option>
          <option>Closed</option>
        </select>
        ${showAdd ? `<button class="btn btn-primary btn-sm" onclick="openModal('add-case')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Matter</button>` : ''}
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Matter ID</th>
          <th>Matter Title</th>
          <th>Client</th>
          <th>Lawyer</th>
          <th>Type</th>
          <th>Status</th>
          <th>Next Hearing</th>
          <th>Priority</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="cases-tbody">
        ${cases.map(c => `
        <tr>
          <td><span class="td-link" onclick="navigateTo('case-detail', {id:'${c.id}'}, true)" style="font-family:monospace;font-size:12px;">${c.id}</span></td>
          <td>
            <div style="font-weight:500;color:var(--gray-900);cursor:pointer;" onclick="navigateTo('case-detail', {id:'${c.id}'}, true)">${c.title}</div>
          </td>
          <td>${c.client}</td>
          <td>${c.lawyer}</td>
          <td><span class="badge badge-blue">${c.type}</span></td>
          <td>${statusBadge(c.status)}</td>
          <td style="font-size:12px;color:var(--gray-600);">${c.nextHearing}</td>
          <td>${statusBadge(c.priority)}</td>
          <td>
            <button class="btn btn-secondary btn-icon btn-sm" onclick="navigateTo('case-detail', {id:'${c.id}'}, true)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${renderTablePagination(cases.length)}
  </div>`;
}

function renderTablePagination(total) {
  return `
  <div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--gray-100);">
    <span style="font-size:12px;color:var(--gray-400);">Showing ${Math.min(total, 10)} of ${total} results</span>
    <div style="display:flex;gap:4px;">
      <button class="btn btn-secondary btn-sm">&#8249; Prev</button>
      <button class="btn btn-primary btn-sm">1</button>
      <button class="btn btn-secondary btn-sm">2</button>
      <button class="btn btn-secondary btn-sm">Next &#8250;</button>
    </div>
  </div>`;
}

// ── Document Grid ────────────────────────────────────────
function renderDocumentsPage() {
  const folders = [
    { name: 'CASE-2045', count: 8, icon: '📁' },
    { name: 'CASE-2044', count: 3, icon: '📁' },
    { name: 'CASE-2043', count: 5, icon: '📁' },
    { name: 'CASE-2041', count: 6, icon: '📁' },
    { name: 'CASE-2042', count: 4, icon: '📁' },
    { name: 'Templates', count: 12, icon: '📂' },
  ];
  return `
  ${renderPageHeader('Documents', 'Manage all matter documents and files',
    `<button class="btn btn-secondary btn-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Upload File
    </button>
    <button class="btn btn-primary btn-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      New Folder
    </button>`
  )}
  <div class="card section-gap">
    <div class="card-header">
      <div>
        <div class="card-title">Matter Folders</div>
        <div class="card-subtitle">Organized by matter number</div>
      </div>
    </div>
    <div class="folder-grid">
      ${folders.map(f => `
      <div class="folder-card" onclick="">
        <div class="folder-icon">${f.icon}</div>
        <div class="folder-name">${f.name}</div>
        <div class="folder-count">${f.count} files</div>
      </div>`).join('')}
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <div>
        <div class="card-title">Recent Files</div>
        <div class="card-subtitle">All uploaded documents</div>
      </div>
      <div class="table-search" style="max-width:220px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search files..." />
      </div>
    </div>
    <div class="file-grid">
      ${DATA.documents.map(d => `
      <div class="file-card">
        <div class="file-icon ${d.type}">${d.type === 'pdf' ? '📄' : d.type === 'doc' ? '📝' : '🖼️'}</div>
        <div>
          <div class="file-name">${d.name}</div>
          <div class="file-meta">${d.size} · ${d.uploaded}</div>
          <div class="file-meta" style="margin-top:2px;">${d.case}</div>
        </div>
        <div style="display:flex;gap:6px;margin-top:4px;">
          <button class="btn btn-secondary btn-sm" style="flex:1;justify-content:center;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </button>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

// ── Billing Page ─────────────────────────────────────────
function renderBillingPage(viewOnly = false) {
  return `
  ${renderPageHeader('Billing & Invoices', 'Track invoices and manage payments',
    viewOnly ? '' :
    `<button class="btn btn-secondary btn-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Export
    </button>
    <button class="btn btn-primary btn-sm" onclick="openModal('create-invoice')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      New Invoice
    </button>`
  )}
  <div class="stat-grid" style="margin-bottom:24px;">
    ${renderStatCard({ label:'Total Invoiced', value:'$17,500', change:'+12%', color:'blue', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' })}
    ${renderStatCard({ label:'Paid', value:'$4,000', change:'+5%', color:'green', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' })}
    ${renderStatCard({ label:'Pending', value:'$7,700', change:'', color:'amber', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' })}
    ${renderStatCard({ label:'Overdue', value:'$5,800', change:'-3%', color:'purple', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' })}
  </div>
  <div class="table-container">
    <div class="table-toolbar">
      <div class="card-title">All Invoices</div>
      <div class="table-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search invoices..." />
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Invoice ID</th>
          <th>Client</th>
          <th>Case</th>
          <th>Description</th>
          <th>Amount</th>
          <th>Issued</th>
          <th>Due Date</th>
          <th>Status</th>
          ${!viewOnly ? '<th></th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${DATA.invoices.map(inv => `
        <tr>
          <td style="font-family:monospace;font-size:12px;font-weight:600;">${inv.id}</td>
          <td>${inv.client}</td>
          <td style="font-size:12px;color:var(--gray-500);">${inv.case}</td>
          <td style="font-size:12px;color:var(--gray-500);max-width:200px;">${inv.desc}</td>
          <td style="font-weight:700;color:var(--gray-900);">${inv.amount}</td>
          <td style="font-size:12px;color:var(--gray-400);">${inv.issued}</td>
          <td style="font-size:12px;color:var(--gray-600);">${inv.due}</td>
          <td>${statusBadge(inv.status)}</td>
          ${!viewOnly ? `<td>
            <div style="display:flex;gap:4px;">
              <button class="btn btn-secondary btn-icon btn-sm" title="View">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              ${inv.status === 'pending' || inv.status === 'overdue' ? `<button class="btn btn-success btn-icon btn-sm" title="Mark Paid">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              </button>` : ''}
            </div>
          </td>` : ''}
        </tr>`).join('')}
      </tbody>
    </table>
    ${renderTablePagination(DATA.invoices.length)}
  </div>`;
}

// ── Email Page ───────────────────────────────────────────
function renderEmailPage() {
  let selectedEmail = DATA.emails[0];
  return `
  ${renderPageHeader('Email', 'Manage communications',
    `<button class="btn btn-primary btn-sm" onclick="openModal('compose-email')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Compose
    </button>`
  )}
  <div class="card" style="padding:0;overflow:hidden;">
    <div class="email-layout">
      <div class="email-list">
        <div style="padding:10px 14px;border-bottom:1px solid var(--gray-100);">
          <div class="table-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search emails..." style="font-size:12px;" />
          </div>
        </div>
        ${DATA.emails.map((e, i) => `
        <div class="email-item ${!e.read ? 'unread' : ''} ${i === 0 ? 'active' : ''}" onclick="selectEmail('${e.id}')">
          <div class="email-meta">
            <span class="email-sender">${e.from}</span>
            <span class="email-time">${e.time}</span>
          </div>
          <div class="email-subject">${e.subject}</div>
          <div class="email-preview">${e.preview}</div>
        </div>`).join('')}
      </div>
      <div class="email-preview-panel" id="email-preview-panel">
        ${renderEmailPreview(selectedEmail)}
      </div>
    </div>
  </div>`;
}

function renderEmailPreview(email) {
  if (!email) return '<div class="empty-state"><div class="empty-icon">📨</div><div class="empty-title">Select an email</div></div>';
  return `
  <div class="email-preview-header">
    <div class="email-preview-subject">${email.subject}</div>
    <div class="email-preview-from">
      <div class="avatar-sm" style="font-size:11px;">${email.from.charAt(0)}</div>
      <div>
        <div style="font-size:13px;font-weight:500;">${email.from}</div>
        <div style="font-size:11px;color:var(--gray-400);">${email.time}</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:6px;">
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('quick-action').style.display='block'; document.getElementById('action-label').innerText='Quick Reply';">Reply</button>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('quick-action').style.display='block'; document.getElementById('action-label').innerText='Forward Email';">Forward</button>
      </div>
    </div>
  </div>
  <div class="email-preview-body">
    <div style="padding:16px; background:white; border-radius:10px; border:1px solid var(--gray-100); margin-bottom:16px; color:var(--gray-800); line-height:1.6;">
      ${email.body.replace(/\n/g, '<br/>')}
    </div>
    <div id="quick-action" style="display:none; border:1px solid var(--primary-100); border-radius:12px; background:white; overflow:hidden; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
      <div style="background:var(--primary-50); padding:8px 16px; border-bottom:1px solid var(--primary-100); display:flex; justify-content:space-between; align-items:center;">
        <span id="action-label" style="font-size:11px; font-weight:700; color:var(--primary-700); text-transform:uppercase;">Reply</span>
        <button onclick="document.getElementById('quick-action').style.display='none'" style="background:none; border:none; cursor:pointer; color:var(--primary-400);">✕</button>
      </div>
      <div style="padding:16px; display:flex; flex-direction:column; gap:12px;">
        <textarea style="width:100%; min-height:80px; padding:10px; border:1px solid var(--gray-200); border-radius:6px; font-family:inherit; font-size:13px;" placeholder="Type your message..."></textarea>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('quick-action').style.display='none'">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="alert('Message sent successfully!'); document.getElementById('quick-action').style.display='none'">Send</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ── VyNius Page ────────────────────────────────────
function renderAIPage() {
  return `
  ${renderPageHeader('VyNius', 'Powered by VyNius Intelligence',
    `<span class="badge badge-green badge-dot">Online</span>`
  )}
  <div class="card" style="padding:0;overflow:hidden;">
    <div class="ai-chat" id="ai-chat-container">
      <div style="padding:14px 16px;background:linear-gradient(135deg,#eff6ff,#f5f3ff);border-bottom:1px solid var(--gray-200);">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--primary-600),#C9A24A);display:flex;align-items:center;justify-content:center;color:white;font-size:16px;">⚡</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--gray-900);">VyNius</div>
            <div style="font-size:11px;color:var(--gray-400);">Your intelligent legal assistant</div>
          </div>
        </div>
      </div>
      <div class="ai-suggestions">
        <button class="ai-suggestion-chip" onclick="sendAIMessage('Summarize CASE-2045')">📋 Summarize CASE-2045</button>
        <button class="ai-suggestion-chip" onclick="sendAIMessage('Draft a demand letter')">✍️ Draft demand letter</button>
        <button class="ai-suggestion-chip" onclick="sendAIMessage('What are upcoming deadlines?')">📅 Upcoming deadlines</button>
        <button class="ai-suggestion-chip" onclick="sendAIMessage('Research CA contract law')">🔍 Research CA law</button>
      </div>
      <div class="ai-messages" id="ai-messages">
        ${DATA.aiMessages.map(m => `
        <div class="ai-message ${m.role === 'user' ? 'user' : ''}">
          <div class="ai-avatar ${m.role === 'user' ? 'user' : ''}">
            ${m.role === 'user' ? 'U' : '⚡'}
          </div>
          <div class="ai-bubble">${m.text}</div>
        </div>`).join('')}
      </div>
      <div class="ai-input-area">
        <textarea class="ai-input" id="ai-input" placeholder="Ask anything about your cases, documents, or legal research..." rows="1" onkeydown="handleAIKeydown(event)"></textarea>
        <button class="btn btn-primary" onclick="sendAIMessage()" style="padding:9px 14px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Send
        </button>
      </div>
    </div>
  </div>`;
}

// ── Calendar Page ────────────────────────────────────────
function renderCalendarPage() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const month = months[3]; // April
  const year = 2025;
  const days = [];
  // April starts on Tuesday (index 2)
  const startDayOffset = 2;
  for (let i = 0; i < startDayOffset; i++) {
    days.push({ day: 31 - startDayOffset + i + 1, thisMonth: false });
  }
  for (let d = 1; d <= 30; d++) {
    days.push({ day: d, thisMonth: true });
  }
  // Pad to complete the grid
  let nextDay = 1;
  while (days.length % 7 !== 0) {
    days.push({ day: nextDay++, thisMonth: false });
  }

  return `
  ${renderPageHeader('Calendar', 'Schedule hearings, deadlines & meetings',
    `<button class="btn btn-secondary btn-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <div style="font-size:14px;font-weight:600;padding:0 12px;">${month} ${year}</div>
    <button class="btn btn-secondary btn-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
    <button class="btn btn-primary btn-sm" onclick="openModal('add-event')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add Event
    </button>`
  )}
  <div class="content-grid" style="grid-template-columns:1fr 280px;gap:20px;">
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="calendar-grid">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="cal-header-cell">${d}</div>`).join('')}
        ${days.map(({ day, thisMonth }) => {
          const events = DATA.calendarEvents.filter(e => e.day === day && thisMonth);
          const isToday = day === 9 && thisMonth;
          return `
          <div class="cal-day ${!thisMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">
            <div class="day-num">${day}</div>
            ${events.map(e => `<div class="cal-event ${e.type}" title="${e.time}">${e.title}</div>`).join('')}
          </div>`;
        }).join('')}
      </div>
    </div>
    <div>
      <div class="card section-gap">
        <div class="card-title" style="margin-bottom:14px;">Upcoming Events</div>
        <div class="activity-list">
          ${DATA.calendarEvents.map(e => `
          <div class="activity-item">
            <div class="activity-icon ${e.type}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div class="activity-text">
              <p style="font-weight:500;">${e.title}</p>
              <p style="color:var(--gray-400);font-size:11px;">Apr ${e.day}${e.time ? ' · ' + e.time : ''}</p>
            </div>
          </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:12px;">Quick Add Event</div>
        <div class="form-field">
          <label>Event Title</label>
          <input class="form-control" placeholder="Enter event title" />
        </div>
        <div class="form-field">
          <label>Date & Time</label>
          <input class="form-control" type="date" />
        </div>
        <div class="form-field">
          <label>Related Case</label>
          <select class="form-control">
            <option>Select case...</option>
            ${DATA.cases.map(c => `<option>${c.id} – ${c.title}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;">Add to Calendar</button>
      </div>
    </div>
  </div>`;
}

// ── Settings Page ────────────────────────────────────────
function renderSettingsPage() {
  return `
  ${renderPageHeader('Settings', 'Manage your account and preferences')}
  <div class="content-grid" style="grid-template-columns:220px 1fr;gap:20px;">
    <div class="card" style="padding:0;overflow:hidden;">
      ${['Profile','Password','Notifications','Appearance','Integrations','Billing Info'].map((item, i) => `
      <div style="padding:11px 16px;border-bottom:1px solid var(--gray-100);cursor:pointer;font-size:13px;font-weight:${i===0?'600':'400'};color:${i===0?'var(--primary-600)':'var(--gray-700)'};background:${i===0?'var(--primary-50)':'transparent'};"
        onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background='${i===0?'var(--primary-50)':'transparent'}'">
        ${item}
      </div>`).join('')}
    </div>
    <div>
      <div class="card section-gap">
        <div class="card-header">
          <div>
            <div class="card-title">Profile Information</div>
            <div class="card-subtitle">Update your personal details</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--gray-100);">
          <div class="avatar-lg">A</div>
          <div>
            <div style="font-size:14px;font-weight:600;margin-bottom:4px;">Admin User</div>
            <div style="font-size:12px;color:var(--gray-400);margin-bottom:8px;">admin@vktorilegal.com</div>
            <button class="btn btn-secondary btn-sm">Change Photo</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>First Name</label><input class="form-control" value="Admin" /></div>
          <div class="form-field"><label>Last Name</label><input class="form-control" value="User" /></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Email Address</label><input class="form-control" type="email" value="admin@vktorilegal.com" /></div>
          <div class="form-field"><label>Phone Number</label><input class="form-control" value="+1 (415) 555-0100" /></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Role</label><input class="form-control" value="Administrator" disabled style="background:var(--gray-50);color:var(--gray-400);" /></div>
          <div class="form-field"><label>Bar Number</label><input class="form-control" placeholder="CA-XXXXXX" /></div>
        </div>
        <div class="form-field"><label>Firm Name</label><input class="form-control" value="VkTori Law Associates" /></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
          <button class="btn btn-secondary">Cancel</button>
          <button class="btn btn-primary">Save Changes</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Change Password</div>
            <div class="card-subtitle">Keep your account secure</div>
          </div>
        </div>
        <div class="form-field"><label>Current Password</label><input class="form-control" type="password" placeholder="••••••••" /></div>
        <div class="form-row">
          <div class="form-field"><label>New Password</label><input class="form-control" type="password" placeholder="••••••••" /></div>
          <div class="form-field"><label>Confirm Password</label><input class="form-control" type="password" placeholder="••••••••" /></div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px;">
          <button class="btn btn-primary">Update Password</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ── User Management Page ──────────────────────────────────
function renderUserManagementPage() {
  const users = [
    ...DATA.lawyers.map(l => ({ ...l, role: 'Lawyer', lastLogin: 'Today, 9:12 AM' })),
    { id: 'A001', name: 'Admin User', email: 'admin@vktorilegal.com', role: 'Admin', status: 'active', cases: 0, avatar: 'AU', lastLogin: 'Today, 11:30 AM' },
  ];
  return `
  ${renderPageHeader('User Management', 'Manage admin users and lawyers',
    `<button class="btn btn-primary btn-sm" onclick="openModal('add-user')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add User
    </button>`
  )}
  <div class="table-container">
    <div class="table-toolbar">
      <div class="table-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search users..." />
      </div>
    </div>
    <table>
      <thead>
        <tr><th>User</th><th>Email</th><th>Role</th><th>Matters Assigned</th><th>Status</th><th>Last Login</th><th></th></tr>
      </thead>
      <tbody>
        ${users.map(u => `
        <tr>
          <td>
            <div class="td-name">
              <div class="avatar-sm" style="font-size:11px;">${u.avatar}</div>
              <div><div class="name">${u.name}</div><div class="sub">${u.id}</div></div>
            </div>
          </td>
          <td>${u.email}</td>
          <td><span class="badge ${u.role === 'Admin' ? 'badge-purple' : 'badge-blue'}">${u.role}</span></td>
          <td>${u.cases || '—'}</td>
          <td>${statusBadge(u.status)}</td>
          <td style="font-size:12px;color:var(--gray-400);">${u.lastLogin}</td>
          <td>
            <div style="display:flex;gap:4px;">
              <button class="btn btn-secondary btn-icon btn-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-danger btn-icon btn-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${renderTablePagination(users.length)}
  </div>`;
}

// ── Table Filter Helper ───────────────────────────────────
function filterTable(input, tbodyId) {
  const q = input.value.toLowerCase();
  const rows = document.querySelectorAll(`#${tbodyId} tr`);
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ── Select Email ──────────────────────────────────────────
function selectEmail(id) {
  const email = DATA.emails.find(e => e.id === id);
  const panel = document.getElementById('email-preview-panel');
  if (panel) panel.innerHTML = renderEmailPreview(email);
  document.querySelectorAll('.email-item').forEach(el => { el.classList.remove('active'); });
  document.querySelectorAll('.email-item').forEach(el => {
    if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(id)) el.classList.add('active');
  });
}
