// ============================================================
//  VkTori Legal – Admin Pages
// ============================================================

function renderAdminDashboard() {
  return `
  ${renderPageHeader('Dashboard', 'Welcome back! Here\'s your practice overview.',
    `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--gray-400);">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      April 2025
    </div>
    <button class="btn btn-secondary btn-sm">Export Report</button>
    <button class="btn btn-primary btn-sm" onclick="openModal('add-case')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      New Matter
    </button>`
  )}

  <!-- Stat Cards -->
  <div class="stat-grid">
    ${renderStatCard({ label:'Total Parties', value:'124', change:'+8%', color:'blue',
      icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' })}
    ${renderStatCard({ label:'Active Matters', value:'38', change:'+3%', color:'green',
      icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' })}
    ${renderStatCard({ label:'Upcoming Deadlines', value:'7', change:'+2', color:'amber',
      icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' })}
    ${renderStatCard({ label:'Monthly Revenue', value:'$42.8K', change:'+12%', color:'purple',
      icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' })}
  </div>

  <!-- Content Grid -->
  <div class="content-grid">
    <!-- Recent Cases -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Recent Matters</div>
          <div class="card-subtitle">Latest matter activity</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('cases')">View all</button>
      </div>
      <div class="activity-list">
        ${DATA.cases.slice(0,5).map(c => `
        <div class="activity-item" style="cursor:pointer;" onclick="navigateTo('case-detail',{id:'${c.id}'},true)">
          <div class="activity-icon blue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="activity-text">
            <p style="font-weight:500;">${c.title}</p>
            <p style="font-size:11px;color:var(--gray-400);">${c.id} · ${c.client} · ${c.lawyer}</p>
          </div>
          ${statusBadge(c.status)}
        </div>`).join('')}
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Activity Feed</div>
          <div class="card-subtitle">Latest system activity</div>
        </div>
      </div>
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-icon green"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          <div class="activity-text"><p>New client <strong>Emily Carter</strong> added</p><span style="font-size:11px;color:var(--gray-400);">Today, 10:42 AM</span></div>
        </div>
        <div class="activity-item">
          <div class="activity-icon blue"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div>
          <div class="activity-text"><p>Document uploaded to <strong>CASE-2045</strong></p><span style="font-size:11px;color:var(--gray-400);">Today, 10:15 AM</span></div>
        </div>
        <div class="activity-item">
          <div class="activity-icon amber"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <div class="activity-text"><p>Hearing set for <strong>April 20</strong> – Smith vs. Jones</p><span style="font-size:11px;color:var(--gray-400);">Yesterday, 4:30 PM</span></div>
        </div>
        <div class="activity-item">
          <div class="activity-icon purple"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div class="activity-text"><p>Invoice <strong>INV-0044</strong> marked as paid</p><span style="font-size:11px;color:var(--gray-400);">Yesterday, 2:00 PM</span></div>
        </div>
        <div class="activity-item">
          <div class="activity-icon red"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          <div class="activity-text"><p>Invoice <strong>INV-0041</strong> is overdue – Robert Chen</p><span style="font-size:11px;color:var(--gray-400);">Apr 7, 2025</span></div>
        </div>
      </div>
    </div>

    <!-- Upcoming Deadlines -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Upcoming Deadlines</div>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('calendar')">Calendar</button>
      </div>
      ${DATA.calendarEvents.map(e => `
      <div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--gray-100);">
        <div style="width:36px;height:36px;border-radius:8px;background:var(--primary-50);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="font-size:14px;font-weight:700;color:var(--primary-700);">${e.day}</span>
          <span style="font-size:9px;color:var(--primary-400);text-transform:uppercase;">Apr</span>
        </div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:500;color:var(--gray-800);">${e.title}</div>
          <div style="font-size:11px;color:var(--gray-400);">${e.time || 'Deadline'}</div>
        </div>
        <span class="badge badge-${e.type === 'red' ? 'red' : e.type === 'amber' ? 'amber' : 'blue'}">${e.type === 'red' ? 'Urgent' : e.type === 'amber' ? 'Soon' : 'Hearing'}</span>
      </div>`).join('')}
    </div>

    <!-- Quick Stats / Revenue -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Revenue Breakdown</div>
        <span class="badge badge-gray">April 2025</span>
      </div>
      ${[
        { label:'Civil Litigation', pct:45, color:'blue', amount:'$19,260' },
        { label:'Corporate Law', pct:28, color:'green', amount:'$11,984' },
        { label:'Family Law', pct:17, color:'amber', amount:'$7,276' },
        { label:'Employment', pct:10, color:'purple', amount:'$4,280' },
      ].map(item => `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:12px;font-weight:500;color:var(--gray-700);">${item.label}</span>
          <span style="font-size:12px;font-weight:600;color:var(--gray-900);">${item.amount}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${item.color}" style="width:${item.pct}%;"></div>
        </div>
        <div style="font-size:11px;color:var(--gray-400);margin-top:3px;">${item.pct}% of total</div>
      </div>`).join('')}
    </div>
  </div>`;
}

// ── Client Detail Page ───────────────────────────────────
function renderClientDetail(clientId) {
  const client = DATA.clients.find(c => c.id === clientId) || DATA.clients[0];
  const clientCases = DATA.cases.filter(c => c.client === client.name);
  const clientInvoices = DATA.invoices.filter(i => i.client === client.name);

  return `
  <div style="margin-bottom:20px;">
    <button class="btn btn-secondary btn-sm" onclick="navigateTo('clients')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      Back to Parties
    </button>
  </div>
  <div class="card section-gap">
    <div style="display:flex;align-items:center;gap:20px;">
      <div class="avatar-lg" style="font-size:22px;">${client.avatar}</div>
      <div style="flex:1;">
        <h2 style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--gray-900);margin-bottom:4px;">${client.name}</h2>
        <div style="font-size:13px;color:var(--gray-500);margin-bottom:10px;">${client.id} · ${client.type} Client · Joined ${client.joined}</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <span style="font-size:13px;color:var(--gray-600);display:flex;align-items:center;gap:5px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            ${client.email}
          </span>
          <span style="font-size:13px;color:var(--gray-600);display:flex;align-items:center;gap:5px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 -.36h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${client.phone}
          </span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
        ${statusBadge(client.status)}
        <button class="btn btn-primary btn-sm">Edit Client</button>
        <button class="btn btn-secondary btn-sm" onclick="openModal('compose-email')">Send Email</button>
      </div>
    </div>
  </div>

  <!-- Stats Row -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;">
    ${[
      { label:'Active Matters', value:clientCases.filter(c=>c.status==='active').length, color:'blue'},
      { label:'Documents', value:DATA.documents.filter(d=>clientCases.some(c=>c.id===d.case)).length, color:'green'},
      { label:'Outstanding Invoices', value:clientInvoices.filter(i=>i.status!=='paid').length, color:'amber'},
    ].map(s => `
    <div class="card" style="padding:16px;text-align:center;">
      <div style="font-size:26px;font-weight:700;color:var(--${s.color}-600,var(--primary-600));margin-bottom:4px;">${s.value}</div>
      <div style="font-size:12px;color:var(--gray-500);">${s.label}</div>
    </div>`).join('')}
  </div>

  <div class="tabs" id="client-detail-tabs">
    ${['Overview','Matters','Documents','Billing','Notes'].map((tab, i) => `
    <button class="tab-btn ${i===0?'active':''}" onclick="switchTab('client-detail-tabs','client-tab-panels',${i})">${tab}</button>`).join('')}
  </div>

  <div id="client-tab-panels">
    <!-- Overview -->
    <div class="tab-panel active">
      <div class="content-grid">
        <div class="card">
          <div class="card-title" style="margin-bottom:14px;">Contact Details</div>
          ${[
            ['Full Name', client.name],
            ['Email', client.email],
            ['Phone', client.phone],
            ['Client Type', client.type],
            ['Client ID', client.id],
            ['Joined Date', client.joined],
          ].map(([label, val]) => `
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-100);font-size:13px;">
            <span style="color:var(--gray-500);">${label}</span>
            <span style="font-weight:500;color:var(--gray-800);">${val}</span>
          </div>`).join('')}
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:14px;">Notes</div>
          <textarea class="form-control" style="min-height:150px;" placeholder="Add notes about this client...">Valued client with multiple ongoing cases. Prefers email communication. Responsive and cooperative.</textarea>
          <button class="btn btn-primary btn-sm" style="margin-top:10px;">Save Notes</button>
        </div>
      </div>
    </div>
    <!-- Cases -->
    <div class="tab-panel">
      ${clientCases.length > 0 ? renderCasesTable(clientCases, false) : '<div class="empty-state"><div class="empty-icon">📁</div><div class="empty-title">No matters found</div><div class="empty-desc">No matters assigned to this client yet.</div></div>'}
    </div>
    <!-- Documents -->
    <div class="tab-panel">
      <div class="file-grid">
        ${DATA.documents.filter(d => clientCases.some(c => c.id === d.case)).map(d => `
        <div class="file-card">
          <div class="file-icon ${d.type}">${d.type === 'pdf' ? '📄' : d.type === 'doc' ? '📝' : '🖼️'}</div>
          <div><div class="file-name">${d.name}</div><div class="file-meta">${d.size} · ${d.uploaded}</div></div>
          <button class="btn btn-secondary btn-sm" style="width:100%;justify-content:center;">Download</button>
        </div>`).join('')}
      </div>
    </div>
    <!-- Billing -->
    <div class="tab-panel">
      <div class="table-container">
        <table>
          <thead><tr><th>Invoice</th><th>Description</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
          <tbody>
            ${clientInvoices.map(inv => `
            <tr>
              <td style="font-family:monospace;font-size:12px;">${inv.id}</td>
              <td style="font-size:12px;">${inv.desc}</td>
              <td style="font-weight:700;">${inv.amount}</td>
              <td style="font-size:12px;color:var(--gray-400);">${inv.due}</td>
              <td>${statusBadge(inv.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <!-- Notes -->
    <div class="tab-panel">
      <div class="card">
        <div class="card-title" style="margin-bottom:12px;">Matter Notes</div>
        <div class="timeline">
          ${[
            { text:'Initial consultation completed. Client provided all required documents.', date:'Feb 03, 2025', by:'Alex Parker', color:'green' },
            { text:'Follow-up call scheduled. Client requested status update on case.', date:'Feb 20, 2025', by:'Admin User', color:'blue' },
            { text:'Documents sent for review. Awaiting client signature.', date:'Mar 10, 2025', by:'Sarah Lee', color:'blue' },
          ].map(note => `
          <div class="timeline-item">
            <div class="timeline-left">
              <div class="timeline-dot ${note.color}"></div>
              <div class="timeline-line"></div>
            </div>
            <div class="timeline-content">
              <div class="timeline-title">${note.text}</div>
              <div class="timeline-date">${note.date} · Added by ${note.by}</div>
            </div>
          </div>`).join('')}
        </div>
        <div style="margin-top:16px;">
          <textarea class="form-control" placeholder="Add a new note..." style="min-height:80px;"></textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:8px;">
            <button class="btn btn-primary btn-sm">Add Note</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Case Detail Page ──────────────────────────────────────
function renderCaseDetail(caseId) {
  const cas = DATA.cases.find(c => c.id === caseId) || DATA.cases[0];
  const caseDocs = DATA.documents.filter(d => d.case === cas.id);
  const caseInvoice = DATA.invoices.filter(i => i.case === cas.id);

  return `
  <div style="margin-bottom:20px;">
    <button class="btn btn-secondary btn-sm" onclick="navigateTo('cases')">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      Back to Matters
    </button>
  </div>
  <div class="card section-gap">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span style="font-family:monospace;font-size:12px;font-weight:600;color:var(--primary-600);background:var(--primary-50);padding:3px 8px;border-radius:4px;">${cas.id}</span>
          ${statusBadge(cas.status)}
          ${statusBadge(cas.priority)}
        </div>
        <h2 style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--gray-900);margin-bottom:8px;">${cas.title}</h2>
        <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px;color:var(--gray-500);">
          <span>📋 ${cas.type}</span>
          <span>👤 ${cas.client}</span>
          <span>⚖️ ${cas.lawyer}</span>
          <span>📅 Filed: ${cas.filed}</span>
          <span>🏛️ Next Hearing: ${cas.nextHearing}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm">Edit Matter</button>
        <button class="btn btn-primary btn-sm" onclick="openModal('add-document')">+ Document</button>
      </div>
    </div>
  </div>

  <div class="tabs" id="case-detail-tabs">
    ${['Overview','Parties','Documents','Timeline','Notes','Billing'].map((tab, i) => `
    <button class="tab-btn ${i===0?'active':''}" onclick="switchTab('case-detail-tabs','case-tab-panels',${i})">${tab}</button>`).join('')}
  </div>

  <div id="case-tab-panels">
    <!-- Overview -->
    <div class="tab-panel active">
      <div class="content-grid">
        <div class="card">
          <div class="card-title" style="margin-bottom:14px;">Matter Information</div>
          ${[
            ['Matter ID', cas.id],
            ['Matter Title', cas.title],
            ['Type', cas.type],
            ['Status', cas.status.charAt(0).toUpperCase()+cas.status.slice(1)],
            ['Priority', cas.priority.charAt(0).toUpperCase()+cas.priority.slice(1)],
            ['Filed Date', cas.filed],
            ['Next Hearing', cas.nextHearing],
            ['Assigned Lawyer', cas.lawyer],
          ].map(([label, val]) => `
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-100);font-size:13px;">
            <span style="color:var(--gray-500);">${label}</span>
            <span style="font-weight:500;color:var(--gray-800);">${val}</span>
          </div>`).join('')}
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:14px;">Matter Summary</div>
          <p style="font-size:13px;color:var(--gray-600);line-height:1.7;">
            This case involves a ${cas.type.toLowerCase()} dispute between ${cas.client} and the opposing party. 
            The matter was filed on ${cas.filed} and is currently handled by ${cas.lawyer}. 
            The next court hearing is scheduled for ${cas.nextHearing}.
          </p>
          <div style="margin-top:16px;">
            <div class="card-title" style="margin-bottom:10px;font-size:13px;">Matter Progress</div>
            ${[
              { label:'Documents Filed', pct:75 },
              { label:'Evidence Collected', pct:60 },
              { label:'Pre-trial Preparation', pct:40 },
            ].map(p => `
            <div style="margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;">
                <span style="color:var(--gray-600);">${p.label}</span>
                <span style="font-weight:600;color:var(--gray-800);">${p.pct}%</span>
              </div>
              <div class="progress-bar"><div class="progress-fill blue" style="width:${p.pct}%;"></div></div>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Parties -->
    <div class="tab-panel">
      <div class="content-grid">
        ${[
          { role:'Client (Plaintiff)', name: cas.client, type:'Primary Client', color:'blue' },
          { role:'Opposing Party', name:'State of California / ABC Corp', type:'Defendant', color:'red' },
          { role:'Assigned Lawyer', name:cas.lawyer, type:'Lead Attorney', color:'green' },
          { role:'Co-counsel', name:'John Assistant Esq.', type:'Supporting Attorney', color:'purple' },
        ].map(p => `
        <div class="card">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="avatar-md">${p.name.charAt(0)}</div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--gray-400);margin-bottom:2px;">${p.role}</div>
              <div style="font-size:14px;font-weight:700;color:var(--gray-900);">${p.name}</div>
              <span class="badge badge-${p.color}" style="margin-top:4px;">${p.type}</span>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Documents -->
    <div class="tab-panel">
      <div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
        <button class="btn btn-primary btn-sm" onclick="openModal('add-document')">+ Upload Document</button>
      </div>
      ${caseDocs.length > 0 ? `
      <div class="file-grid">
        ${caseDocs.map(d => `
        <div class="file-card">
          <div class="file-icon ${d.type}">${d.type === 'pdf' ? '📄' : d.type === 'doc' ? '📝' : '🖼️'}</div>
          <div>
            <div class="file-name">${d.name}</div>
            <div class="file-meta">${d.size} · ${d.uploaded}</div>
            <div class="file-meta">By: ${d.uploadedBy}</div>
          </div>
          <button class="btn btn-secondary btn-sm" style="width:100%;justify-content:center;">Download</button>
        </div>`).join('')}
      </div>` : '<div class="empty-state"><div class="empty-icon">📄</div><div class="empty-title">No documents yet</div></div>'}
    </div>

    <!-- Timeline -->
    <div class="tab-panel">
      <div class="card">
        <div class="timeline">
          ${[
            { text:'Matter filed at Superior Court of California', desc:'Initial complaint submitted with all exhibits.', date:cas.filed, color:'green' },
            { text:'Client intake meeting completed', desc:'All intake documents collected and reviewed.', date:'Feb 10, 2025', color:'green' },
            { text:'Evidence collection phase initiated', desc:'Witness list and evidence gathered for review.', date:'Feb 25, 2025', color:'blue' },
            { text:'Pre-trial motion filed', desc:'Motion to dismiss counter-claim submitted.', date:'Mar 12, 2025', color:'blue' },
            { text:'Next hearing scheduled', desc:'Courtroom date confirmed with clerk of court.', date:cas.nextHearing, color:'gray' },
          ].map(item => `
          <div class="timeline-item">
            <div class="timeline-left">
              <div class="timeline-dot ${item.color}"></div>
              <div class="timeline-line"></div>
            </div>
            <div class="timeline-content">
              <div class="timeline-title">${item.text}</div>
              <div class="timeline-desc">${item.desc}</div>
              <div class="timeline-date">${item.date}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div class="tab-panel">
      <div class="card">
        <div class="card-title" style="margin-bottom:14px;">Matter Notes</div>
        <div class="timeline">
          ${[
            { text:'Witness testimony aligned well with plaintiff\'s account. Recommend proceeding.', date:'Mar 15, 2025', by:'Alex Parker' },
            { text:'Client requested settlement discussion. Will schedule mediation.', date:'Mar 28, 2025', by:'Admin User' },
          ].map(note => `
          <div class="timeline-item">
            <div class="timeline-left">
              <div class="timeline-dot"></div>
              <div class="timeline-line"></div>
            </div>
            <div class="timeline-content">
              <div class="timeline-title">${note.text}</div>
              <div class="timeline-date">${note.date} · ${note.by}</div>
            </div>
          </div>`).join('')}
        </div>
        <div style="margin-top:14px;">
          <textarea class="form-control" placeholder="Write a note..." style="min-height:80px;"></textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:8px;">
            <button class="btn btn-primary btn-sm">Add Note</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Billing -->
    <div class="tab-panel">
      ${renderBillingPage(false)}
    </div>
  </div>`;
}
