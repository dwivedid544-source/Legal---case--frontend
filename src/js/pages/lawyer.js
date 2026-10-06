// ============================================================
//  VkTori Legal – Lawyer Pages
// ============================================================

function renderLawyerDashboard() {
  return `
  ${renderPageHeader('My Dashboard', 'Welcome back, Alex Parker! Here\'s your case overview.',
    `<button class="btn btn-secondary btn-sm">This Week</button>
    <button class="btn btn-primary btn-sm" onclick="openModal('add-case')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      New Matter
    </button>`
  )}

  <div class="stat-grid">
    ${renderStatCard({ label:'My Parties', value:'9', change:'+2%', color:'blue',
      icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' })}
    ${renderStatCard({ label:'My Matters', value:'12', change:'+1', color:'green',
      icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' })}
    ${renderStatCard({ label:'Pending Tasks', value:'4', change:'', color:'amber',
      icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' })}
    ${renderStatCard({ label:'Hours Logged', value:'147h', change:'+18h', color:'purple',
      icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' })}
  </div>

  <div class="content-grid">
    <!-- My Active Cases -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">My Active Matters</div>
          <div class="card-subtitle">Matters assigned to you</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('lawyer-cases')">View all</button>
      </div>
      <div class="activity-list">
        ${DATA.cases.filter(c => c.lawyer === 'Alex Parker').map(c => `
        <div class="activity-item" style="cursor:pointer;" onclick="navigateTo('case-detail',{id:'${c.id}'},true)">
          <div class="activity-icon ${c.status === 'active' ? 'green' : c.status === 'pending' ? 'amber' : 'gray'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="activity-text">
            <p style="font-weight:500;">${c.title}</p>
            <p style="font-size:11px;color:var(--gray-400);">${c.id} · Next: ${c.nextHearing}</p>
          </div>
          ${statusBadge(c.priority)}
        </div>`).join('')}
      </div>
    </div>

    <!-- Upcoming Hearings -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Upcoming Hearings</div>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('calendar')">Calendar</button>
      </div>
      ${DATA.calendarEvents.slice(0,4).map(e => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--gray-100);">
        <div style="width:40px;height:40px;border-radius:10px;background:var(--primary-50);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="font-size:15px;font-weight:700;color:var(--primary-700);line-height:1;">${e.day}</span>
          <span style="font-size:9px;color:var(--primary-400);text-transform:uppercase;">Apr</span>
        </div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:500;color:var(--gray-800);">${e.title}</div>
          <div style="font-size:11px;color:var(--gray-400);">${e.time || 'All day'}</div>
        </div>
        <span class="badge badge-${e.type === 'red' ? 'red' : e.type === 'amber' ? 'amber' : 'blue'}">${e.type === 'red' ? 'Deadline' : 'Hearing'}</span>
      </div>`).join('')}
    </div>

    <!-- My Clients Quick -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">My Parties</div>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('lawyer-clients')">View all</button>
      </div>
      ${DATA.clients.slice(0,4).map(c => `
      <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--gray-100);">
        <div class="avatar-sm" style="font-size:11px;">${c.avatar}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:500;color:var(--gray-800);">${c.name}</div>
          <div style="font-size:11px;color:var(--gray-400);">${c.cases} matter(s)</div>
        </div>
        ${statusBadge(c.status)}
      </div>`).join('')}
    </div>

    <!-- Task List -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Pending Tasks</div>

      </div>
      ${[
        { task:'Prepare evidence summary for CASE-2045', due:'Apr 12', done:false },
        { task:'Review contract clause for Hartwell case', due:'Apr 14', done:false },
        { task:'Schedule mediation for Mitchell case', due:'Apr 15', done:false },
        { task:'File motion to extend deadline – CASE-2040', due:'Apr 17', done:true },
      ].map(t => `
      <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--gray-100);">
        <input type="checkbox" ${t.done ? 'checked' : ''} style="width:15px;height:15px;accent-color:var(--primary-600);cursor:pointer;" />
        <div style="flex:1;">
          <div style="font-size:13px;color:${t.done ? 'var(--gray-400)' : 'var(--gray-800)'};text-decoration:${t.done ? 'line-through' : 'none'};">${t.task}</div>
          <div style="font-size:11px;color:var(--gray-400);">Due: ${t.due}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderLawyerClients() {
  return `
  ${renderPageHeader('My Parties', 'Parties assigned to you',
    `<button class="btn btn-primary btn-sm" onclick="openModal('add-client')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add Client
    </button>`
  )}
  ${renderClientsTable(DATA.clients, false)}`;
}

function renderLawyerCases() {
  const myCases = DATA.cases.filter(c => c.lawyer === 'Alex Parker');
  return `
  ${renderPageHeader('My Matters', 'Matters assigned to you',
    `<button class="btn btn-primary btn-sm" onclick="openModal('add-case')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      New Matter
    </button>`
  )}
  ${renderCasesTable(myCases, false)}`;
}
