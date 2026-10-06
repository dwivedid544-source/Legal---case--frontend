// ============================================================
//  VkTori Legal – Client Portal Pages
// ============================================================

function renderClientDashboard() {
  return `
  ${renderPageHeader('My Dashboard', 'Welcome back, Sarah Mitchell! Here\'s your case summary.')}

  <div class="stat-grid">
    <div class="stat-card blue">
      <div class="stat-top">
        <div class="stat-icon blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
      </div>
      <div class="stat-value">2</div>
      <div class="stat-label">Active Matters</div>
    </div>
    <div class="stat-card amber">
      <div class="stat-top">
        <div class="stat-icon amber">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
      </div>
      <div class="stat-value">Apr 20</div>
      <div class="stat-label">Next Hearing</div>
    </div>
    <div class="stat-card green">
      <div class="stat-top">
        <div class="stat-icon green">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
      </div>
      <div class="stat-value">3</div>
      <div class="stat-label">Documents Ready</div>
    </div>
    <div class="stat-card purple">
      <div class="stat-top">
        <div class="stat-icon purple">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
      </div>
      <div class="stat-value">1</div>
      <div class="stat-label">Invoice Pending</div>
    </div>
  </div>

  <div class="content-grid">
    <!-- Case Status Cards -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">My Matters</div>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('client-cases')">View All</button>
      </div>
      ${DATA.cases.filter(c => c.client === 'Sarah Mitchell').map(c => `
      <div style="border:1px solid var(--gray-200);border-radius:var(--radius-md);padding:14px;margin-bottom:12px;cursor:pointer;transition:var(--transition);" onmouseover="this.style.borderColor='var(--primary-300)'" onmouseout="this.style.borderColor='var(--gray-200)'" onclick="navigateTo('case-detail',{id:'${c.id}'},true)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div>
            <div style="font-size:11px;font-family:monospace;color:var(--primary-600);margin-bottom:3px;">${c.id}</div>
            <div style="font-size:14px;font-weight:600;color:var(--gray-900);">${c.title}</div>
          </div>
          ${statusBadge(c.status)}
        </div>
        <div style="font-size:12px;color:var(--gray-500);">
          <span>⚖️ ${c.lawyer}</span> &nbsp;·&nbsp; <span>📅 Next: ${c.nextHearing}</span>
        </div>
        <div class="progress-bar" style="margin-top:10px;">
          <div class="progress-fill blue" style="width:60%;"></div>
        </div>
        <div style="font-size:11px;color:var(--gray-400);margin-top:4px;">Matter in progress · 60% complete</div>
      </div>`).join('')}
    </div>

    <!-- Updates -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Recent Updates</div>
      </div>
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-icon green"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div>
          <div class="activity-text"><p>New document uploaded to your case</p><span style="font-size:11px;color:var(--gray-400);">Today, 10:15 AM · Alex Parker</span></div>
        </div>
        <div class="activity-item">
          <div class="activity-icon amber"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <div class="activity-text"><p>Hearing confirmed for <strong>April 20, 2025</strong></p><span style="font-size:11px;color:var(--gray-400);">Yesterday · Court Notification</span></div>
        </div>
        <div class="activity-item">
          <div class="activity-icon blue"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
          <div class="activity-text"><p>New message from <strong>Alex Parker</strong></p><span style="font-size:11px;color:var(--gray-400);">Apr 7 · 3:45 PM</span></div>
        </div>
        <div class="activity-item">
          <div class="activity-icon purple"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div class="activity-text"><p>Invoice <strong>INV-0043</strong> – $3,500 due May 10</p><span style="font-size:11px;color:var(--gray-400);">Apr 5 · Billing</span></div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderClientCases() {
  const myCases = DATA.cases.filter(c => c.client === 'Sarah Mitchell');
  return `
  ${renderPageHeader('My Matters', 'View all your legal matters')}
  ${myCases.map(c => `
  <div class="card section-gap" style="cursor:pointer;" onclick="navigateTo('case-detail',{id:'${c.id}'},true)">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:11px;font-family:monospace;background:var(--primary-50);color:var(--primary-600);padding:2px 8px;border-radius:4px;">${c.id}</span>
          ${statusBadge(c.status)}
        </div>
        <h3 style="font-size:17px;font-weight:700;color:var(--gray-900);margin-bottom:8px;">${c.title}</h3>
        <div style="font-size:13px;color:var(--gray-500);display:flex;gap:16px;flex-wrap:wrap;">
          <span>⚖️ Lawyer: ${c.lawyer}</span>
          <span>📋 Type: ${c.type}</span>
          <span>📅 Next Hearing: ${c.nextHearing}</span>
        </div>
      </div>
      <button class="btn btn-primary btn-sm">View Details</button>
    </div>
    <div style="margin-top:14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;color:var(--gray-500);">
        <span>Matter Progress</span><span style="font-weight:600;">60%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill blue" style="width:60%;"></div></div>
    </div>

    <div class="timeline" style="margin-top:16px;">
      ${[
        { text:'Matter Filed', date:c.filed, color:'green' },
        { text:'Evidence Collection', date:'Feb 20, 2025', color:'green' },
        { text:'Pre-trial Motions', date:'Mar 15, 2025', color:'blue' },
        { text:'Hearing Scheduled', date:c.nextHearing, color:'gray' },
      ].map(item => `
      <div class="timeline-item">
        <div class="timeline-left">
          <div class="timeline-dot ${item.color}"></div>
          <div class="timeline-line"></div>
        </div>
        <div class="timeline-content">
          <div class="timeline-title" style="font-size:12px;">${item.text}</div>
          <div class="timeline-date">${item.date}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>`).join('')}`;
}

function renderClientDocuments() {
  const myDocs = DATA.documents.filter(d => DATA.cases.filter(c => c.client === 'Sarah Mitchell').some(c => c.id === d.case));
  return `
  ${renderPageHeader('My Documents', 'Documents shared with you by your lawyer')}
  <div class="card">
    ${myDocs.length > 0 ? `
    <div class="file-grid">
      ${myDocs.map(d => `
      <div class="file-card">
        <div class="file-icon ${d.type}">${d.type === 'pdf' ? '📄' : d.type === 'doc' ? '📝' : '🖼️'}</div>
        <div>
          <div class="file-name">${d.name}</div>
          <div class="file-meta">${d.size} · ${d.uploaded}</div>
          <div class="file-meta">Matter: ${d.case}</div>
        </div>
        <button class="btn btn-primary btn-sm" style="width:100%;justify-content:center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </button>
      </div>`).join('')}
    </div>` : `<div class="empty-state"><div class="empty-icon">📂</div><div class="empty-title">No documents yet</div><div class="empty-desc">Your lawyer will share documents here as your case progresses.</div></div>`}
  </div>`;
}

function renderClientBilling() {
  const myInvoices = DATA.invoices.filter(i => i.client === 'Sarah Mitchell');
  return `
  ${renderPageHeader('My Billing', 'View your invoices and payment status')}
  <div class="content-grid" style="grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
    <div class="stat-card amber">
      <div class="stat-top"><div class="stat-icon amber"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div></div>
      <div class="stat-value">$3,500</div>
      <div class="stat-label">Pending Payment</div>
    </div>
    <div class="stat-card green">
      <div class="stat-top"><div class="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div></div>
      <div class="stat-value">$0</div>
      <div class="stat-label">Total Paid</div>
    </div>
  </div>
  <div class="table-container">
    <div class="table-toolbar"><div class="card-title">My Invoices</div></div>
    <table>
      <thead>
        <tr><th>Invoice ID</th><th>Description</th><th>Amount</th><th>Due Date</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        ${myInvoices.map(inv => `
        <tr>
          <td style="font-family:monospace;font-size:12px;">${inv.id}</td>
          <td style="font-size:12px;">${inv.desc}</td>
          <td style="font-weight:700;">${inv.amount}</td>
          <td style="font-size:12px;color:var(--gray-400);">${inv.due}</td>
          <td>${statusBadge(inv.status)}</td>
          <td>
            ${inv.status === 'pending' ? `<button class="btn btn-primary btn-sm">Pay Now</button>` : `<button class="btn btn-secondary btn-sm">Download</button>`}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function renderClientMessages() {
  return `
  ${renderPageHeader('Messages', 'Chat with your legal team')}
  <div class="card" style="padding:0;overflow:hidden;">
    <div class="chat-layout">
      <div class="chat-list">
        ${DATA.messages.map(m => `
        <div class="chat-list-item ${m.active ? 'active' : ''}">
          <div class="avatar-sm" style="font-size:11px;">${m.avatar}</div>
          <div class="chat-info">
            <div class="chat-name">${m.from}</div>
            <div class="chat-preview">${m.preview}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
            <span class="chat-time">${m.time}</span>
            ${m.unread > 0 ? `<span class="chat-unread">${m.unread}</span>` : ''}
          </div>
        </div>`).join('')}
      </div>
      <div class="chat-messages">
        <div class="chat-messages-header">
          <div class="avatar-sm">AL</div>
          <div>
            <div style="font-size:13px;font-weight:600;">Alex Parker</div>
            <div style="font-size:11px;color:var(--success-500);">● Online</div>
          </div>
        </div>
        <div class="chat-messages-body" id="chat-body">
          <div class="message received">
            <div class="avatar-sm" style="font-size:11px;">AL</div>
            <div>
              <div class="msg-bubble">Hi Sarah! I wanted to update you on your custody case. We have a strong argument and I'll be preparing the motion next week.</div>
              <div class="msg-time">9:30 AM</div>
            </div>
          </div>
          <div class="message sent">
            <div class="avatar-sm" style="font-size:11px;background:linear-gradient(135deg,#0B1F3A,#C9A24A);">SM</div>
            <div>
              <div class="msg-bubble">Thank you Alex! That's great to hear. When should I expect the next update?</div>
              <div class="msg-time">9:45 AM</div>
            </div>
          </div>
          <div class="message received">
            <div class="avatar-sm" style="font-size:11px;">AL</div>
            <div>
              <div class="msg-bubble">I'll send you the full case update by end of week. The April 20 hearing is confirmed. Please review the documents I uploaded to your portal.</div>
              <div class="msg-time">10:02 AM</div>
            </div>
          </div>
          <div class="message sent">
            <div class="avatar-sm" style="font-size:11px;background:linear-gradient(135deg,#0B1F3A,#C9A24A);">SM</div>
            <div>
              <div class="msg-bubble">Will do! Are we still on for the meeting tomorrow?</div>
              <div class="msg-time">10:24 AM</div>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <input class="chat-input" id="chat-message-input" placeholder="Type a message..." onkeydown="handleChatKeydown(event)" />
          <button class="chat-send-btn" onclick="sendChatMessage()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderClientProfile() {
  return `
  ${renderPageHeader('My Profile', 'Manage your personal information')}
  <div class="content-grid" style="grid-template-columns:1fr 2fr;gap:20px;">
    <div class="card" style="text-align:center;">
      <div class="avatar-lg" style="margin:0 auto 12px;font-size:22px;">SM</div>
      <div style="font-size:16px;font-weight:700;color:var(--gray-900);">Sarah Mitchell</div>
      <div style="font-size:12px;color:var(--gray-400);margin-bottom:8px;">C001 · Individual Client</div>
      ${statusBadge('active')}
      <hr class="divider" />
      <div style="text-align:left;">
        ${[
          ['Member Since', 'Jan 12, 2025'],
          ['Active Matters', '2'],
          ['Documents', '4'],
        ].map(([k,v]) => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;">
          <span style="color:var(--gray-500);">${k}</span>
          <span style="font-weight:600;color:var(--gray-700);">${v}</span>
        </div>`).join('')}
      </div>
    </div>
    <div>
      <div class="card section-gap">
        <div class="card-title" style="margin-bottom:16px;">Personal Information</div>
        <div class="form-row">
          <div class="form-field"><label>First Name</label><input class="form-control" value="Sarah" /></div>
          <div class="form-field"><label>Last Name</label><input class="form-control" value="Mitchell" /></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label>Email Address</label><input class="form-control" type="email" value="sarah.m@email.com" /></div>
          <div class="form-field"><label>Phone Number</label><input class="form-control" value="+1 (415) 555-0101" /></div>
        </div>
        <div class="form-field"><label>Home Address</label><input class="form-control" value="123 Oak Street, San Francisco, CA 94102" /></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
          <button class="btn btn-secondary">Cancel</button>
          <button class="btn btn-primary">Save Changes</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px;">Change Password</div>
        <div class="form-field"><label>Current Password</label><input class="form-control" type="password" placeholder="••••••••" /></div>
        <div class="form-row">
          <div class="form-field"><label>New Password</label><input class="form-control" type="password" placeholder="••••••••" /></div>
          <div class="form-field"><label>Confirm Password</label><input class="form-control" type="password" placeholder="••••••••" /></div>
        </div>
        <div style="display:flex;justify-content:flex-end;">
          <button class="btn btn-primary btn-sm">Update Password</button>
        </div>
      </div>
    </div>
  </div>`;
}
