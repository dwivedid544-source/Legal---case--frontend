import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import SignatureCanvas from 'react-signature-canvas';
import { Badge, StatCard, PageHeader, Card, Table, Tr, Td, Tabs, Timeline, EmptyState, ProgressBar, FileIcon, Modal, Field, Input, Select, CustomSelect, Textarea, Avatar, SearchInput, downloadFile } from '../components/UI.jsx';
import api, { API_BASE_URL } from '../services/api';
import PartyRoleModal from '../components/PartyRoleModal.jsx';
import VariableModuleModal from '../components/VariableModuleModal.jsx';
import StageTimelineBar from '../components/StageTimelineBar.jsx';
import TitanComposeEmailModal from './EmailModule/components/TitanComposeEmailModal.jsx';
import { formatUSPhone, deserializeId } from '../utils/adaptiveEngine.js';
import { formatPSTDate, formatPSTTime, getPacificParts, getPacificToday, isSamePacificDay, pacificToUTC, getPacificTimezoneAbbr } from '../utils/dateUtils';

function leadInitials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 3).toUpperCase();
}

function canDeleteRecord(user) {
  let u = user;
  if (!u) {
    try {
      u = JSON.parse(localStorage.getItem('vktori_user') || 'null');
    } catch (e) {
      u = null;
    }
  }
  if (!u) return false;
  const role = (u.role || '').toLowerCase();
  const email = (u.email || '').toLowerCase();
  return role === 'admin' || email.includes('kathleen');
}

function parseBodyAttachments(bodyText) {
  const attachments = [];
  const regex = /\[attachment:(\d+):([^\]]+)\]/g;
  let match;
  let cleanText = bodyText;

  while ((match = regex.exec(bodyText)) !== null) {
    attachments.push({
      id: parseInt(match[1], 10),
      name: match[2]
    });
  }
  cleanText = cleanText.replace(regex, '');

  const lines = cleanText.split('\n');
  let inAttachmentsSection = false;
  const cleanedLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase() === 'attachments:') {
      inAttachmentsSection = true;
      continue;
    }

    if (inAttachmentsSection) {
      if (trimmed.startsWith('- ')) {
        const name = trimmed.substring(2).trim();
        if (name && !attachments.some(att => att.name === name)) {
          attachments.push({
            id: null,
            name: name
          });
        }
        continue;
      } else if (trimmed === '') {
        continue;
      } else {
        inAttachmentsSection = false;
      }
    }

    cleanedLines.push(line);
  }

  cleanText = cleanedLines.join('\n').trim();

  return { cleanText, attachments };
}

async function downloadAttachment(att, matterId, toast) {
  try {
    let documentId = att.id;
    if (!documentId) {
      if (!matterId) throw new Error('Cannot lookup file without matter context.');
      const res = await api.documents.list({ matter_id: matterId, limit: 100 });
      const docs = res.data || [];
      const match = docs.find(d => d.original_name === att.name || d.file_name === att.name);
      if (!match) throw new Error(`File "${att.name}" not found in matter documents.`);
      documentId = match.id;
    }
    await downloadDocumentBlob(documentId, att.name);
  } catch (e) {
    console.error('Download failed:', e);
    toast(e.message || 'Failed to download attachment', 'error');
  }
}

async function openAttachment(att, matterId, openModal, toast) {
  try {
    let documentId = att.id;
    let mimeType = 'image/png'; // default fallback
    
    if (!documentId) {
      if (!matterId) throw new Error('Cannot lookup file without matter context.');
      const res = await api.documents.list({ matter_id: matterId, limit: 100 });
      const docs = res.data || [];
      const match = docs.find(d => d.original_name === att.name || d.file_name === att.name);
      if (!match) throw new Error(`File "${att.name}" not found in matter documents.`);
      documentId = match.id;
      mimeType = match.mime_type || 'image/png';
    } else {
      const res = await api.documents.get(documentId);
      mimeType = res.data?.mime_type || 'image/png';
    }
    
    const { blob } = await api.documents.download(documentId);
    const url = window.URL.createObjectURL(blob);
    openModal('preview-document', { id: documentId, title: att.name, url, mime_type: mimeType });
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  } catch (e) {
    console.error('Open failed:', e);
    toast(e.message || 'Failed to open attachment', 'error');
  }
}

function matterStatusForBadge(status) {
  if (status === 'completed') return 'closed';
  return status;
}

function mapMatterToCaseView(m) {
  const st = m.status === 'completed' ? 'closed' : m.status;
  return {
    ...m,
    matter_number: m.matter_number,
    numericId: m.id,
    id: m.matter_number,
    title: m.title,
    client: m.parties?.length ? m.parties.map(p => p.full_name).join(', ') : (m.client?.full_name || ''),
    lawyer: m.assigned_lawyer?.full_name || 'Unassigned',
    type: m.matter_type || m.practice_area,
    status: st,
    filed: m.opened_at
      ? new Date(m.opened_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    nextHearing: m.next_hearing
      ? new Date(m.next_hearing).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—',
    priority: m.priority || 'medium',
    description: m.description || '',
    opposingParty: m.opposing_party_name || '',
    lastUpdated: new Date(m.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
  };
}

function draftUiStatus(db) {
  const k = { draft: 'Draft', ready: 'Ready', sent_for_signature: 'Sent for Signature', signed: 'Signed' };
  return k[db] || db;
}

function clientStatus(db) {
  const k = { draft: 'Review Needed', ready: 'Ready', sent_for_signature: 'Pending Signature', signed: 'Signed' };
  return k[db] || db;
}

function matterMimeToFileType(mime) {
  if (!mime) return 'doc';
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('image')) return 'img';
  return 'doc';
}

/** Maps document.category to Matter Folders bucket (Complaint, Evidence, Contract, Court order). */
function documentFolderBucket(category) {
  if (!category) return null;
  const c = String(category).toLowerCase();
  if (c.includes('complaint')) return 'Complaint';
  if (c.includes('evidence')) return 'Evidence';
  if (c.includes('contract')) return 'Contract';
  if (c.includes('court')) return 'Court order';
  // If it's none of the standard ones, it's a custom folder category
  return category;
}

async function downloadDocumentBlob(documentId, fallbackName) {
  const { blob, filename } = await api.documents.download(documentId);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || fallbackName || 'document.bin';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

async function previewDocumentBlob(documentId, openModal, fallbackName) {
  const { blob, filename, contentType } = await api.documents.download(documentId);
  const type = contentType || blob.type || 'application/pdf';
  const fileBlob = new Blob([blob], { type });
  const url = window.URL.createObjectURL(fileBlob);
  openModal('preview-document', {
    id: documentId,
    title: filename || fallbackName || 'Document Preview',
    mime_type: type,
    url: url
  });
}



async function downloadInvoicePdfBlob(dbId, fallbackLabel, toast) {
  if (!dbId) {
    toast('This invoice is not linked to a database record.', 'info');
    return;
  }
  try {
    const { blob, filename } = await api.billing.downloadInvoicePdf(dbId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Invoice-${fallbackLabel || dbId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast('Invoice PDF downloaded', 'success');
  } catch (e) {
    toast(e.message || 'Could not download invoice PDF', 'error');
  }
}

const progressColors = ['bg-primary-500', 'bg-emerald-500', 'bg-amber-500', 'bg-accent-500', 'bg-blue-500', 'bg-slate-500'];

// ─────────────────────────────────────────────────────────
//  ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────
export function AdminDashboard({ navigate, toast, openModal }) {
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const h = () => setRefreshTick(t => t + 1);
    window.addEventListener('vktori:entities-changed', h);
    return () => window.removeEventListener('vktori:entities-changed', h);
  }, []);

  const load = useCallback(async () => {
    if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
    setError('');
    try {
      const res = await api.dashboard.admin();
      setDash(res.data);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshTick]);

  const exportReport = () => {
    if (!dash) {
      toast('Nothing to export yet.', 'info');
      return;
    }
    const row = `Metric,Value\nTotal Clients,${dash.counts.totalClients}\nOpen Matters,${dash.counts.openMatters}\nUpcoming Deadlines,${dash.counts.upcomingDeadlineCount}\nRevenue (${dash.revenue.monthLabel}),${dash.revenue.totalFormatted}\n`;
    downloadFile(`firm_overview_${new Date().toISOString().slice(0, 10)}.csv`, row);
    toast('Report exported!', 'success');
  };

  if (loading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#0057c7] border-t-transparent rounded-full animate-spin" />
        <p className="text-[14px] text-[#8a94a6] font-bold uppercase tracking-widest">Initializing Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in py-12">
        <Card className="border-[#ef4444]/20 bg-[#ef4444]/5 text-center p-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-xl font-800 text-white mb-2">Sync Interrupted</p>
          <p className="text-[14px] text-[#8a94a6] mb-6 max-w-md mx-auto">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-primary px-8">Reconnect System</button>
        </Card>
      </div>
    );
  }

  const c = dash.counts;
  const revRows = dash.revenue.byPracticeArea.length
    ? dash.revenue.byPracticeArea.map((item, i) => ({
      label: item.practiceArea,
      pct: item.pct,
      amount: item.amountFormatted,
      color: i === 0 ? 'bg-[#0057c7]' : i === 1 ? 'bg-[#22c55e]' : i === 2 ? 'bg-[#f59e0b]' : 'bg-[#38bdf8]',
    }))
    : [{ label: 'No paid revenue this month', pct: 0, amount: '—', color: 'bg-white/10' }];

  const deadlines = dash.upcomingDeadlines.length ? dash.upcomingDeadlines : [];

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* SECTION A: PAGE HEADER */}
      <PageHeader 
        title="Dashboard" 
        subtitle={`Welcome back, Administrator. System health optimized · ${dash.revenue.monthLabel}`}
      >
        <button onClick={exportReport} className="btn btn-secondary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export Report
        </button>
        <button onClick={() => openModal('conflict-check')} className="btn btn-secondary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          Conflict Check
        </button>
        <button onClick={() => openModal('add-case')} className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Matter
        </button>
      </PageHeader>

      {/* SECTION B: KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={String(c.totalClients)} 
          icon={<svg className="w-6 h-6 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>} 
          iconBg="bg-[#0057c7]/10" gradient="#0057c7" />
        <StatCard label="Open Matters" value={String(c.openMatters)} 
          icon={<svg className="w-6 h-6 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} 
          iconBg="bg-[#22c55e]/10" gradient="#22c55e" />
        <StatCard label="Upcoming Deadlines" value={String(c.upcomingDeadlineCount)} 
          icon={<svg className="w-6 h-6 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>} 
          iconBg="bg-[#f59e0b]/10" gradient="#f59e0b" />
        <StatCard label={`Revenue (${dash.revenue.monthLabel.split(' ')[0]})`} value={dash.revenue.totalFormatted} 
          icon={<svg className="w-6 h-6 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h1m11 0h1m-6 0h1m-10 11v-11m16 11v-11m-6 11v-11m-5 11v-11" /></svg>} 
          iconBg="bg-[#38bdf8]/10" gradient="#38bdf8" />
      </div>

      {/* FIRM-WIDE DEADLINE URGENCY MONITOR BAR */}
      <div className="p-5 rounded-2xl bg-[#1a2233] border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm flex items-center justify-center font-bold">⏱️</span>
            <div>
              <h3 className="text-xs font-900 text-white uppercase tracking-wider">Firm-wide Deadline Urgency Monitor</h3>
              <p className="text-[11px] text-slate-400">Cross-matter court filings, Statute-of-limitations (SOL) & answer deadlines</p>
            </div>
          </div>
          <span className="text-[10px] font-900 bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full uppercase">
            🔴 {dash?.deadlineUrgency?.criticalCount ?? (dash?.counts?.upcomingDeadlineCount || 0)} CRITICAL DEADLINES
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-800 text-rose-400 uppercase tracking-wider block">🔴 Overdue / This Week</span>
              <span className="text-sm font-extrabold text-white font-mono mt-0.5 block">{dash?.deadlineUrgency?.overdueThisWeek ?? 0} Statute &amp; Answer Dates</span>
            </div>
            <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-bold">{dash?.deadlineUrgency?.overdueThisWeek ?? 0}</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-800 text-amber-300 uppercase tracking-wider block">🟡 Upcoming 30 Days</span>
              <span className="text-sm font-extrabold text-white font-mono mt-0.5 block">{dash?.deadlineUrgency?.upcoming30Days ?? 0} Discovery / Motions</span>
            </div>
            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold">{dash?.deadlineUrgency?.upcoming30Days ?? 0}</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-800 text-emerald-400 uppercase tracking-wider block">🟢 Scheduled (&gt; 30 Days)</span>
              <span className="text-sm font-extrabold text-white font-mono mt-0.5 block">{dash?.deadlineUrgency?.scheduledBeyond30Days ?? 0} Trial &amp; Hearing Dates</span>
            </div>
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">{dash?.deadlineUrgency?.scheduledBeyond30Days ?? 0}</span>
          </div>
        </div>
      </div>

      {/* SECTION C: TWO COLUMN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT LARGE CARD: Recent Matters */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0057c7]/10 flex items-center justify-center text-white">
                  <svg className="w-6 h-6 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                </div>
                <h3 className="text-lg font-800 text-white tracking-tight">Recent Matters</h3>
              </div>
              <button onClick={() => navigate('/admin/matters')} className="text-[12px] text-[#38bdf8] font-700 uppercase tracking-widest hover:underline">Full Registry →</button>
            </div>
            <div className="space-y-2">
              {dash.recentMatters.length === 0 ? (
                <EmptyState icon="📂" title="No Recent Activity" desc="No legal matters have been registered recently." />
              ) : (
                dash.recentMatters.map((m) => (
                  <div key={m.id} onClick={() => navigate(`/admin/matters/${m.id}`)}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 cursor-pointer transition-all group">
                    <div className="w-12 h-12 bg-[#0057c7]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#0057c7] transition-all">
                      <svg className="w-6 h-6 text-[#38bdf8] group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-700 text-white truncate group-hover:text-[#38bdf8] transition-colors">{m.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-800 text-[#8a94a6] uppercase tracking-widest">{m.matterNumber}</span>
                        <span className="text-[#8a94a6]/40">•</span>
                        <span className="text-[11px] font-700 text-[#8a94a6]">{m.clientName}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge status={matterStatusForBadge(m.status)} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[15px] font-800 text-white tracking-tight uppercase tracking-[0.1em]">Upcoming Deadlines</h3>
              <button onClick={() => navigate('/admin/calendar')} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#8a94a6] hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              {deadlines.length === 0 ? (
                <p className="text-[13px] text-[#8a94a6] py-4 text-center font-medium">Clear docket for today.</p>
              ) : (
                deadlines.map((e, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-[#0057c7]/20 transition-all">
                      <span className="text-[15px] font-900 text-white leading-none">{e.day}</span>
                      <span className="text-[9px] text-[#38bdf8] font-900 uppercase tracking-tighter mt-0.5">{e.month}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-700 text-white truncate">{e.title}</p>
                      <p className="text-[11px] text-[#8a94a6] mt-0.5 font-semibold">{e.time || 'All Day'}</p>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${e.color === 'red' ? 'bg-[#ef4444]' : e.color === 'amber' ? 'bg-[#f59e0b]' : 'bg-[#38bdf8]'}`} />
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Revenue Breakdown */}
          <Card>
            <h3 className="text-[15px] font-800 text-white tracking-tight uppercase tracking-[0.1em] mb-6">Revenue Breakdown</h3>
            <div className="space-y-5">
              {revRows.map(item => (
                <div key={item.label} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[12px] font-700 text-[#8a94a6] uppercase tracking-wider">{item.label}</span>
                    <span className="text-[13px] font-900 text-white">{item.amount}</span>
                  </div>
                  <ProgressBar pct={item.pct} color={item.color} />
                </div>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-700 text-[#8a94a6]">TOTAL REVENUE</span>
                <span className="text-xl font-900 text-[#22c55e] tracking-tighter">{dash.revenue.totalFormatted}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* SECTION D: FULL WIDTH ACTIVITY CARD */}
      <Card>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center text-white">
                <svg className="w-6 h-6 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </div>
             <h3 className="text-lg font-800 text-white tracking-tight">Recent Activity Feed</h3>
          </div>
          <button className="text-[12px] text-[#8a94a6] font-800 uppercase tracking-widest hover:text-white transition-colors">Audit Log</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-1">
          {dash.activityFeed.length === 0 ? (
            <p className="text-[13px] text-[#8a94a6] col-span-full py-8 text-center">No system events recorded yet.</p>
          ) : (
            dash.activityFeed.map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-3 px-2 rounded-xl hover:bg-white/[0.03] transition-all group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl bg-white/5 group-hover:scale-110 transition-transform shadow-lg`}>{item.icon}</div>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-600 text-[#dbe7ff] truncate group-hover:text-white transition-colors">{item.text}</p>
                  <p className="text-[11px] text-[#8a94a6] mt-0.5 font-bold uppercase tracking-tighter">{item.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}


// ─────────────────────────────────────────────────────────
//  CLIENTS PAGE
// ─────────────────────────────────────────────────────────
export function ClientsPage({ navigate, toast, openModal }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [clients, setClients] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');

  const [deleteTargetClient, setDeleteTargetClient] = useState(null);
  const [typedConfirm, setTypedConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [mergePrimaryClient, setMergePrimaryClient] = useState(null);
  const [mergeDuplicateId, setMergeDuplicateId] = useState('');
  const [merging, setMerging] = useState(false);

  const load = async () => {
    if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
    setError('');
    try {
      const res = await api.clients.list({ limit: 500 });
      setClients(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleHardDeleteClient = async () => {
    if (!deleteTargetClient) return;
    if (typedConfirm !== 'DELETE' && typedConfirm !== deleteTargetClient.name) {
      toast('Please type "DELETE" or the exact client name to confirm', 'error');
      return;
    }
    try {
      setDeleting(true);
      await api.clients.delete(deleteTargetClient.id);
      toast(`Client "${deleteTargetClient.name}" permanently hard-deleted with Audit Log!`, 'success');
      setDeleteTargetClient(null);
      setTypedConfirm('');
      load();
    } catch (err) {
      toast(err.message || 'Failed to hard delete client', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmMerge = async () => {
    if (!mergePrimaryClient || !mergeDuplicateId) {
      toast('Please select a duplicate contact to merge', 'error');
      return;
    }
    try {
      setMerging(true);
      await api.request('/clients/merge', {
        method: 'POST',
        body: {
          primaryId: parseInt(mergePrimaryClient.id, 10),
          duplicateId: parseInt(mergeDuplicateId, 10)
        }
      });
      toast(`Merged duplicate contact into #${mergePrimaryClient.id}!`, 'success');
      setMergePrimaryClient(null);
      setMergeDuplicateId('');
      load();
    } catch (err) {
      toast(err.message || 'Failed to merge contacts', 'error');
    } finally {
      setMerging(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    window.addEventListener('vktori:entities-changed', load);
    return () => window.removeEventListener('vktori:entities-changed', load);
  }, []);

  const rows = clients.map((c) => ({
    raw: c,
    id: String(c.id),
    name: c.full_name,
    avatar: leadInitials(c.full_name),
    email: c.email,
    phone: c.phone || '—',
    type: c.is_portal_enabled ? 'Portal' : 'Standard',
    cases: c._count?.matters ?? 0,
    status: c.status || (c.is_portal_enabled ? 'active' : 'past'),
    joined: c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
    party_role: c.party_role || 'Client',
    opposing_party_name: c.opposing_party_name,
    opposing_law_firm: c.opposing_law_firm,
    opposing_counsel_name: c.opposing_counsel_name,
  }));

  const filtered = rows.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All Status' || c.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#0057c7] border-t-transparent rounded-full animate-spin" />
        <p className="text-[14px] text-[#8a94a6] font-bold uppercase tracking-widest">Compiling Registry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in py-12">
        <Card className="border-[#ef4444]/20 bg-[#ef4444]/5 text-center p-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-xl font-800 text-white mb-2">Sync Error</p>
          <p className="text-[14px] text-[#8a94a6] mb-6 max-w-md mx-auto">{error}</p>
          <button type="button" onClick={load} className="btn btn-primary px-8">Retry Connection</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Clients" subtitle={`${clients.length} total clients registered in system`}>
        <button onClick={() => openModal('add-client')} className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add New Client
        </button>
      </PageHeader>

      <Table headers={['Client Identity', 'Client Role', 'Opposing Party / Counsel', 'Contact Channel', 'Classification', 'Active Matters', 'Access Status', 'Date Enrolled', '']}
        searchPlaceholder="Search clients by name or email..." onSearch={setSearch}
        actions={
          <Select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            className="h-9 min-w-[140px] !py-0 !px-3 text-[12px] rounded-xl"
          >
            <option value="All Status">All Status</option>
            <option value="Active">Active</option>
            <option value="Prospective">Prospective</option>
            <option value="Past">Past</option>
          </Select>
        }>
        {filtered.map(c => (
          <Tr key={c.id} onClick={() => navigate(`/admin/clients/${c.id}`)}>
            <Td>
              <div className="flex items-center gap-4">
                <Avatar initials={c.avatar} size="sm" color="#0057c7" />
                <div className="min-w-0">
                  <p className="font-700 text-white group-hover:text-[#38bdf8] transition-colors truncate">{c.name}</p>
                  <p className="text-[11px] text-[#8a94a6] font-800 uppercase tracking-widest mt-0.5">{c.id}</p>
                </div>
              </div>
            </Td>
            <Td className="whitespace-nowrap font-700 text-white">{c.party_role}</Td>
            <Td>
              {c.opposing_party_name || c.opposing_law_firm || c.opposing_counsel_name ? (
                <div className="flex flex-col text-[12px] leading-relaxed max-w-[220px]">
                  {c.opposing_party_name && (
                    <span className="truncate text-white" title={c.opposing_party_name}>
                      <span className="text-[#8a94a6] text-[10px] font-700 uppercase tracking-wider mr-1.5 opacity-60">Opponent:</span>
                      <span className="font-700">{c.opposing_party_name}</span>
                    </span>
                  )}
                  {c.opposing_law_firm && (
                    <span className="truncate text-[#8a94a6] mt-0.5" title={c.opposing_law_firm}>
                      <span className="text-[#8a94a6] text-[10px] font-700 uppercase tracking-wider mr-1.5 opacity-40">Firm:</span>
                      <span className="font-600">{c.opposing_law_firm}</span>
                    </span>
                  )}
                  {c.opposing_counsel_name && (
                    <span className="truncate text-[#38bdf8] mt-0.5" title={c.opposing_counsel_name}>
                      <span className="text-[#38bdf8] text-[10px] font-700 uppercase tracking-wider mr-1.5 opacity-60">Counsel:</span>
                      <span className="font-700">{c.opposing_counsel_name}</span>
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[#8a94a6] font-600">—</span>
              )}
            </Td>
            <Td>
              <div className="flex flex-col">
                <span className="text-white font-600">{c.email}</span>
                <span className="text-[11px] text-[#8a94a6] font-700 mt-0.5">{c.phone}</span>
              </div>
            </Td>
            <Td>
              <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-900 uppercase tracking-widest ${c.type === 'Portal' ? 'bg-[#0057c7]/10 text-[#38bdf8] border border-[#0057c7]/20' : 'bg-white/5 text-[#8a94a6] border border-white/10'}`}>
                {c.type}
              </span>
            </Td>
            <Td>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white font-900 text-[13px] border border-white/5">{c.cases}</div>
                <span className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest">Matters</span>
              </div>
            </Td>
            <Td><Badge status={c.status} /></Td>
            <Td className="text-[#8a94a6] font-800 text-[11px] uppercase tracking-wider">{c.joined}</Td>
            <Td>
              <div className="flex gap-2 justify-end pr-2">
                <button onClick={e => { e.stopPropagation(); navigate(`/admin/clients/${c.id}`); }} 
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-[#8a94a6] hover:bg-[#0057c7] hover:text-white transition-all group/btn shadow-lg" 
                  title="View Client">
                  <svg className="w-4 h-4 transition-transform group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
                <button onClick={e => { e.stopPropagation(); openModal('edit-client', c.raw); }} 
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-[#8a94a6] hover:bg-[#f59e0b] hover:text-white transition-all group/btn shadow-lg" 
                  title="Edit Client">
                  <svg className="w-4 h-4 transition-transform group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 00 2 2h14a2 2 0 00 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <button onClick={e => { e.stopPropagation(); setMergePrimaryClient(c); setMergeDuplicateId(''); }} 
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-[#8a94a6] hover:bg-[#0057c7] hover:text-white transition-all group/btn shadow-lg" 
                  title="Merge Duplicate Contact">
                  <span className="text-xs">🔀</span>
                </button>
                {canDeleteRecord() && (
                  <button onClick={e => { e.stopPropagation(); setDeleteTargetClient(c); setTypedConfirm(''); }} 
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-[#8a94a6] hover:bg-red-600 hover:text-white transition-all group/btn shadow-lg" 
                    title="Hard Delete Client">
                    <span className="text-xs">🗑️</span>
                  </button>
                )}
              </div>
            </Td>
          </Tr>
        ))}
      </Table>
      <div className="flex items-center justify-between px-2">
        <span className="text-[12px] text-[#8a94a6] font-bold uppercase tracking-widest">Displaying {filtered.length} of {clients.length} Professional Records</span>
      </div>

      {/* Typed Confirmation Hard Delete Modal */}
      {deleteTargetClient && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setDeleteTargetClient(null)}>
          <div className="bg-[#1a2233] border border-red-500/40 rounded-2xl sm:rounded-[2rem] p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 text-white my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center justify-center font-bold">⚠️</span>
                <div>
                  <h3 className="text-sm font-900 text-white uppercase tracking-wider">Confirm Hard Delete</h3>
                  <p className="text-[11px] text-slate-400">Admin-only permanent removal with audit logging</p>
                </div>
              </div>
              <button type="button" onClick={() => setDeleteTargetClient(null)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs">✕</button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200">
                <p className="font-bold mb-1">Warning: Permanent Data Erasure</p>
                <p className="text-[11px] leading-relaxed">Hard deleting <strong>"{deleteTargetClient.name}"</strong> (#{deleteTargetClient.id}) will write an immutable Audit Log entry. If this record is referenced by active non-void invoices, deletion will be blocked.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Type <span className="text-red-400 font-mono font-extrabold">DELETE</span> or client name to confirm:
                </label>
                <input
                  type="text"
                  value={typedConfirm}
                  onChange={e => setTypedConfirm(e.target.value)}
                  placeholder={`Type "DELETE" or "${deleteTargetClient.name}"`}
                  className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setDeleteTargetClient(null)} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold py-2.5 rounded-xl">Cancel</button>
              <button type="button" onClick={handleHardDeleteClient} disabled={deleting || (typedConfirm !== 'DELETE' && typedConfirm !== deleteTargetClient.name)} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30">
                {deleting ? 'Hard Deleting...' : '🗑️ Confirm Hard Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Merge Duplicate Contacts Modal */}
      {mergePrimaryClient && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setMergePrimaryClient(null)}>
          <div className="bg-[#1a2233] border border-[#0057c7]/40 rounded-2xl sm:rounded-[2rem] p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 text-white my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#0057c7]/20 border border-[#0057c7]/30 text-[#38bdf8] text-sm flex items-center justify-center font-bold">🔀</span>
                <div>
                  <h3 className="text-sm font-900 text-white uppercase tracking-wider">Merge Duplicate Contact</h3>
                  <p className="text-[11px] text-slate-400">Re-point all matters & links to Primary Contact</p>
                </div>
              </div>
              <button type="button" onClick={() => setMergePrimaryClient(null)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs">✕</button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                <span className="text-slate-400 block font-medium">Primary Target Contact (Kept):</span>
                <p className="text-white font-bold truncate mt-0.5">#{mergePrimaryClient.id} - {mergePrimaryClient.name} ({mergePrimaryClient.email})</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Select Duplicate Contact to Merge & Clean Up:</label>
                <select
                  value={mergeDuplicateId}
                  onChange={e => setMergeDuplicateId(e.target.value)}
                  className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                >
                  <option value="">-- Select Duplicate Contact --</option>
                  {clients
                    .filter(c => String(c.id) !== String(mergePrimaryClient.id))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        #{c.id} - {c.full_name} ({c.email})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setMergePrimaryClient(null)} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold py-2.5 rounded-xl">Cancel</button>
              <button type="button" onClick={handleConfirmMerge} disabled={merging || !mergeDuplicateId} className="flex-1 bg-[#0057c7] hover:bg-[#0057c7]/80 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-[#0057c7]/30">
                {merging ? 'Merging Records...' : '🔀 Confirm Merge Records'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  CLIENT DETAIL PAGE
// ─────────────────────────────────────────────────────────
export function ClientDetailPage({ clientId, navigate, toast, openModal, role = 'admin' }) {
  const [tab, setTab] = useState('Overview');
  const [client, setClient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [documents, setDocuments] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [typedConfirm, setTypedConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleHardDeleteClient = async () => {
    if (!client) return;
    if (typedConfirm !== 'DELETE' && typedConfirm !== client.full_name) {
      toast('Please type "DELETE" or the exact client name to confirm', 'error');
      return;
    }
    try {
      setDeleting(true);
      await api.clients.delete(client.id);
      toast(`Client "${client.full_name}" permanently hard-deleted with Audit Log!`, 'success');
      setIsDeleteModalOpen(false);
      navigate(role === 'lawyer' ? '/lawyer/clients' : '/admin/clients');
    } catch (err) {
      toast(err.message || 'Failed to hard delete client', 'error');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const handler = () => setRefreshTick(t => t + 1);
    window.addEventListener('vktori:entities-changed', handler);
    return () => window.removeEventListener('vktori:entities-changed', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
      setError('');
      try {
        const res = await api.clients.get(clientId);
        if (cancelled) return;
        const C = res.data;
        setClient(C);
        setNotes(C.notes || '');
        const matters = C.matters || [];
        const mids = new Set(matters.map((m) => m.id));
        const [invRes, docRes] = await Promise.all([
          api.billing.listInvoices({ client_id: clientId, limit: 500 }),
          api.documents.list({ client_id: clientId, limit: 500 }),
        ]);
        if (cancelled) return;
        const invData = Array.isArray(invRes.data) ? invRes.data : [];
        const clientInvoices = invData.map(inv => {
          const amt = Number(inv.amount || 0);
          const invPaid = (inv.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
          return {
            ...inv,
            paidAmount: invPaid,
            outstanding: Math.max(0, amt - invPaid),
            status: inv.status === 'draft' ? 'pending' : inv.status,
          };
        });
        setInvoices(clientInvoices);
        const docData = Array.isArray(docRes.data) ? docRes.data : [];
        setDocuments(docData);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load client');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, refreshTick]);

  const saveNotes = async () => {
    try {
      await api.clients.update(clientId, { notes });
      toast('Notes saved!', 'success');
    } catch (e) {
      toast(e.message || 'Save failed', 'error');
    }
  };

  const formatMoney = (v) => {
    const n = typeof v === 'string' ? parseFloat(v) : Number(v);
    if (Number.isNaN(n)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  };

  const mimeToType = (mime) => {
    if (!mime) return 'doc';
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('image')) return 'img';
    return 'doc';
  };

  if (loading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-slate-500">Loading client…</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="animate-fade-in space-y-4">
        <button onClick={() => navigate(role === 'lawyer' ? '/lawyer/clients' : '/admin/clients')} className="btn btn-secondary btn-xs">Back to Clients</button>
        <Card className="border-red-200 bg-red-50/50">
          <p className="text-[13px] text-red-800 font-600">{error || 'Client not found'}</p>
        </Card>
      </div>
    );
  }

  const matters = client.matters || [];
  const firstMatterId = matters[0]?.id != null ? String(matters[0].id) : '';
  const view = {
    name: client.full_name,
    avatar: leadInitials(client.full_name),
    email: client.email,
    phone: client.phone || '—',
    type: client.is_portal_enabled ? 'Portal' : 'Standard',
    status: client.status || (client.is_portal_enabled ? 'active' : 'past'),
    id: String(client.id),
    joined: client.created_at
      ? new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—',
  };

  const activeMatters = matters.filter((m) => m.status === 'active').length;
  const pendingInv = invoices.filter((i) => (i.outstanding || 0) > 0 && i.status !== 'void').length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(role === 'lawyer' ? '/lawyer/clients' : '/admin/clients')} className="btn btn-secondary h-9 px-3 flex items-center gap-2 group transition-all">
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6" /></svg>
          <span className="text-[12px] font-700 uppercase tracking-widest">Back to Registry</span>
        </button>
      </div>

      <Card className="relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-start gap-5 flex-wrap relative z-10">
          <Avatar initials={view.avatar} size="xl" color="#0057c7" />
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="text-2xl font-800 text-white font-display tracking-tight">{view.name}</h2>
              <div className="flex gap-2">
                <Badge status={view.status} />
                <span className="text-[11px] bg-[#0057c7]/10 text-[#38bdf8] border border-[#0057c7]/20 px-2.5 py-0.5 rounded-full font-800 uppercase tracking-widest">{view.type}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium text-[#8a94a6]">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                {view.id}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Enrolled {view.joined}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {view.email}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                {view.phone}
              </span>
            </div>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <button onClick={() => setIsComposeOpen(true)} className="btn btn-secondary h-10 px-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Send Email
            </button>
            <button
              onClick={async () => {
                try {
                  await api.clients.sendPortalInvite(clientId);
                  toast('Portal invite link sent to client!', 'success');
                } catch (e) {
                  toast(e.message || 'Failed to send portal invite', 'error');
                }
              }}
              className="btn h-10 px-4 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 flex items-center gap-1.5 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Send Portal Invite
            </button>
            <button onClick={() => openModal('edit-client', client)} className="btn btn-primary h-10 px-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 00 2 2h11a2 2 0 00 2-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit Client
            </button>
            {canDeleteRecord() && (
              <button onClick={() => { setIsDeleteModalOpen(true); setTypedConfirm(''); }} className="btn bg-red-600 hover:bg-red-700 text-white h-10 px-4 flex items-center gap-1.5 shadow-lg shadow-red-600/30">
                <span className="text-xs">🗑️</span>
                <span className="text-xs font-bold uppercase tracking-wider">Delete Client</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/5">
          {[
            { 
              label: 'Active Matters', 
              value: activeMatters, 
              icon: <svg className="w-6 h-6 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg> 
            },
            { 
              label: 'Documents Vault', 
              value: documents.length, 
              icon: <svg className="w-6 h-6 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> 
            },
            { 
              label: 'Pending Items', 
              value: pendingInv, 
              icon: <svg className="w-6 h-6 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 
            },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
              <div className="mb-2 p-2 rounded-xl bg-white/5 group-hover:scale-110 transition-transform">
                {s.icon}
              </div>
              <p className="text-3xl font-800 text-white font-display mb-1">{s.value}</p>
              <p className="text-[11px] text-[#8a94a6] font-800 uppercase tracking-[0.15em]">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Tabs tabs={['Overview', 'Matters', 'Documents', 'Billing', 'Notes']} active={tab} onChange={setTab} />

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <Card>
            <h3 className="text-[14px] font-800 text-white uppercase tracking-[0.15em] mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0057c7]"></span>
              Client Identity
            </h3>
            {(() => {
              const idData = deserializeId(client.government_id);
              return (
                <div className="space-y-1">
                  {[
                    ['Client Type', client.party_type || 'Individual'],
                    ['Client Role', client.party_role || 'Client'],
                    client.party_type === 'Organization' ? ['Organization Name', client.organization_name || '—'] : null,
                    client.party_type === 'Organization' ? ['Contact First Name', client.contact_first_name || '—'] : null,
                    client.party_type === 'Organization' ? ['Contact Last Name', client.contact_last_name || '—'] : null,
                    client.party_type === 'Organization' ? ['Business Address', client.business_address || '—'] : null,
                    ['Home Address', client.home_address || 'Not provided'],
                    ['Full/Display Name', view.name],
                    ['Email Address', view.email],
                    ['Contact Number', view.phone],
                    ['Client Classification', view.type],
                    ['System Identifier', `C${view.id.padStart(4, '0')}`],
                    ['Enrollment Date', view.joined],
                    idData.ssn ? ['SSN / Tax ID', idData.ssn] : null,
                    idData.id_type !== 'none' && idData.id_number ? [
                      idData.id_type === 'passport' ? 'Passport Number' : idData.id_type === 'drivers_license' ? "Driver's License" : 'State ID',
                      `${idData.id_number}${idData.id_state ? ` (${idData.id_state})` : ''}${idData.id_country ? ` (${idData.id_country})` : ''}`
                    ] : null,
                    idData.id_issue_date ? ['ID Issue Date', idData.id_issue_date] : null,
                    idData.id_expiry_date ? ['ID Expiration Date', idData.id_expiry_date] : null,
                    client.referral_source ? ['Referral Source', client.referral_source] : null,
                    client.referral_detail ? ['Referred By / Detail', client.referral_detail] : null,
                  ].filter(Boolean).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center py-3.5 border-b border-white/5 last:border-0 group">
                      <span className="text-[13px] font-700 text-[#b8c2d1] uppercase tracking-wider">{k}</span>
                      <span className="text-[14px] font-600 text-white group-hover:text-[#38bdf8] transition-colors text-right">{v}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
          <Card className="flex flex-col">
            <h3 className="text-[14px] font-800 text-white uppercase tracking-[0.15em] mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
              Internal Case Notes
            </h3>
            <div className="flex-1 min-h-[180px]">
              <Textarea 
                className="h-full min-h-[180px] text-[14px] leading-relaxed" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Enter confidential client notes here..."
              />
            </div>
            <button type="button" onClick={saveNotes} className="btn btn-primary mt-5 w-full justify-center h-11">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>
              Save Notes
            </button>
          </Card>
        </div>
      )}
      {tab === 'Matters' && (
        matters.length > 0 ? (
          <Table headers={['Matter ID', 'Title', 'Type', 'Status', 'Next Hearing']}>
            {matters.map((c) => (
              <Tr key={c.id} onClick={() => navigate(`/admin/matters/${c.id}`)}>
                <Td><span className="font-mono text-[12px] text-[#38bdf8] font-900 tracking-wider uppercase">{c.matter_number}</span></Td>
                <Td className="font-700 text-white group-hover:text-[#38bdf8] transition-colors">{c.title}</Td>
                <Td><span className="text-[11px] font-800 uppercase tracking-widest bg-white/5 text-[#8a94a6] px-2.5 py-1 rounded-xl border border-white/5">{c.matter_type || c.practice_area}</span></Td>
                <Td><Badge status={matterStatusForBadge(c.status)} /></Td>
                <Td className="text-[#8a94a6] font-800 text-[11px] uppercase tracking-wider">{c.next_hearing ? new Date(c.next_hearing).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</Td>
              </Tr>
            ))}
          </Table>
        ) : <EmptyState icon={<svg className="w-12 h-12 text-[#8a94a6] opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>} title="No matters found" desc="No matters assigned to this client yet." />
      )}
      {tab === 'Documents' && (
        documents.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {documents.map((d) => (
              <Card key={d.id} className="hover:shadow-md cursor-pointer group" noPad>
                <div className="p-3">
                  <FileIcon type={mimeToType(d.mime_type)} />
                  <p className="text-[12px] font-800 text-white mt-2 line-clamp-2 group-hover:text-[#38bdf8] transition-colors tracking-tight">{d.original_name}</p>
                  <p className="text-[10px] text-[#8a94a6] mt-1 font-800 uppercase tracking-widest">{d.file_size} bytes · {new Date(d.created_at).toLocaleDateString()}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await previewDocumentBlob(d.id, openModal, d.original_name);
                        } catch (err) {
                          toast(err.message || 'Preview failed', 'error');
                        }
                      }}
                      className="btn btn-secondary justify-center text-[10px] font-900 uppercase tracking-widest py-1 h-8"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await downloadDocumentBlob(d.id, d.original_name);
                          toast(`${d.original_name} download started`, 'success');
                        } catch (e) {
                          toast(e.message || 'Download failed', 'error');
                        }
                      }}
                      className="btn btn-secondary justify-center text-[10px] font-900 uppercase tracking-widest py-1 h-8"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : <EmptyState icon={<svg className="w-12 h-12 text-[#8a94a6] opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} title="No documents" desc="Documents will appear here when uploaded." />
      )}
      {tab === 'Billing' && (
        invoices.length > 0 ? (
          <Table headers={['Invoice', 'Description', 'Amount', 'Due', 'Status']}>
            {invoices.map((inv) => (
              <Tr key={inv.id}>
                <Td><span className="font-mono text-[12px] text-[#38bdf8] font-900 tracking-wider uppercase">{inv.invoice_number}</span></Td>
                <Td className="text-[12px] text-[#8a94a6] font-600 max-w-[200px] truncate">{inv.description || '—'}</Td>
                <Td className="font-900 text-white tracking-tighter text-[15px]">{formatMoney(inv.amount)}</Td>
                <Td className="text-[#8a94a6] font-800 text-[11px] uppercase tracking-wider">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</Td>
                <Td><Badge status={inv.status} /></Td>
              </Tr>
            ))}
          </Table>
        ) : <EmptyState icon={<svg className="w-12 h-12 text-[#8a94a6] opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>} title="No invoices" desc="Invoices linked to this client’s matters will appear here." />
      )}
      {tab === 'Notes' && (
        <Card>
          <h3 className="text-[15px] font-800 text-white uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0057c7]" />
            Client Activity Journal
          </h3>
          <p className="text-[12px] text-[#8a94a6] mb-4 font-600 italic">Use the Overview tab to edit and save firm notes for this client.</p>
          <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button type="button" onClick={saveNotes} className="btn btn-primary mt-2">Save Notes</button>
        </Card>
      )}

      {isComposeOpen && (
        <TitanComposeEmailModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          data={{
            to: view.email || client.email || '',
            subject: '',
            body: ''
          }}
        />
      )}
      {/* Typed Confirmation Hard Delete Modal */}
      {isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="bg-[#1a2233] border border-red-500/40 rounded-2xl sm:rounded-[2rem] p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 text-white my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center justify-center font-bold">⚠️</span>
                <div>
                  <h3 className="text-sm font-900 text-white uppercase tracking-wider">Confirm Hard Delete</h3>
                  <p className="text-[11px] text-slate-400">Admin-only permanent removal with audit logging</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs">✕</button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200">
                <p className="font-bold mb-1">Warning: Permanent Data Erasure</p>
                <p className="text-[11px] leading-relaxed">Hard deleting <strong>"{client.full_name}"</strong> (#{client.id}) will write an immutable Audit Log entry. If this record is referenced by active non-void invoices, deletion will be blocked.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Type <span className="text-red-400 font-mono font-extrabold">DELETE</span> or client name to confirm:
                </label>
                <input
                  type="text"
                  value={typedConfirm}
                  onChange={e => setTypedConfirm(e.target.value)}
                  placeholder={`Type "DELETE" or "${client.full_name}"`}
                  className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold py-2.5 rounded-xl">Cancel</button>
              <button type="button" onClick={handleHardDeleteClient} disabled={deleting || (typedConfirm !== 'DELETE' && typedConfirm !== client.full_name)} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30">
                {deleting ? 'Hard Deleting...' : '🗑️ Confirm Hard Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  CASES PAGE
// ─────────────────────────────────────────────────────────
export function CasesPage({ navigate, toast, openModal }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [matters, setMatters] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
    setError('');
    try {
      const res = await api.matters.list({ limit: 500 });
      setMatters(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.message || 'Failed to load matters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    window.addEventListener('vktori:entities-changed', load);
    return () => window.removeEventListener('vktori:entities-changed', load);
  }, [load]);

  const rows = matters.map((m) => ({
    id: m.id,
    matterNumber: m.matter_number,
    title: m.title,
    client: m.parties?.length ? m.parties.map(p => p.full_name).join(', ') : (m.client?.full_name || '—'),
    lawyer: m.assigned_lawyer?.full_name || '—',
    type: m.matter_type || m.practice_area,
    status: m.status === 'completed' ? 'closed' : m.status,
    nextHearing: m.next_hearing
      ? new Date(m.next_hearing).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—',
    priority: m.priority || 'medium',
  }));

  const filtered = rows.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      String(c.matterNumber).toLowerCase().includes(search.toLowerCase()) ||
      c.client.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All Status' || c.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-white/10 rounded-xl w-36"></div>
          <div className="h-10 bg-white/10 rounded-xl w-32"></div>
        </div>
        <div className="bg-[#1a2233] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="h-8 bg-white/10 rounded-xl w-full mb-4"></div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-white/5 border border-white/5 rounded-xl w-full flex items-center px-4 justify-between gap-4">
              <div className="h-4 bg-white/10 rounded w-20"></div>
              <div className="h-4 bg-white/10 rounded w-44"></div>
              <div className="h-4 bg-white/10 rounded w-28"></div>
              <div className="h-4 bg-white/10 rounded w-24"></div>
              <div className="h-6 bg-white/10 rounded-full w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in space-y-4">
        <Card className="border-red-200 bg-red-50/50">
          <p className="text-[13px] text-red-800 font-600">{error}</p>
          <button type="button" onClick={load} className="btn btn-secondary btn-sm mt-3">Retry</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Matters" subtitle={`${matters.length} total matters`}>
        <button onClick={() => openModal('add-case')} className="btn btn-primary">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Matter
        </button>
      </PageHeader>
      <Table headers={['Matter ID', 'Parties', 'Title', 'Lawyer', 'Type', 'Status', 'Next Hearing', 'Priority', '']}
        searchPlaceholder="Search matters..." onSearch={setSearch}
        actions={
          <Select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            className="h-9 min-w-[140px] !py-0 !px-3 text-[12px] rounded-xl"
          >
            <option value="All Status">All Status</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Closed">Closed</option>
          </Select>
        }>
        {filtered.map(c => (
          <Tr key={c.id} onClick={() => navigate(`/admin/matters/${c.id}`)}>
            <Td className="whitespace-nowrap">
              <span className="font-mono text-[12px] text-[#38bdf8] font-bold uppercase tracking-wider">{c.matterNumber}</span>
            </Td>
            <Td className="whitespace-nowrap">
              <span className="text-[13px] font-600 text-[#b8c2d1]">{c.client}</span>
            </Td>
            <Td className="whitespace-nowrap">
              <p className="font-700 text-white group-hover:text-[#38bdf8] transition-colors truncate max-w-[200px]">{c.title}</p>
            </Td>
            <Td className="whitespace-nowrap">
              <span className="text-[12px] font-medium text-[#8a94a6]">{c.lawyer}</span>
            </Td>
            <Td className="whitespace-nowrap">
              <span className="text-[11px] bg-[#0057c7]/10 text-[#38bdf8] border border-[#0057c7]/20 px-2 py-0.5 rounded-full font-800 uppercase tracking-widest">{c.type}</span>
            </Td>
            <Td className="whitespace-nowrap"><Badge status={c.status} /></Td>
            <Td className="whitespace-nowrap">
              <span className="text-[12px] font-bold text-[#8a94a6]">{c.nextHearing}</span>
            </Td>
            <Td className="whitespace-nowrap"><Badge status={c.priority} /></Td>
            <Td className="whitespace-nowrap">
              <div className="flex justify-end pr-1">
                <button 
                  onClick={e => { e.stopPropagation(); navigate(`/admin/matters/${c.id}`); }} 
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-[#8a94a6] hover:bg-[#0057c7] hover:text-white transition-all group/btn" 
                  title="View Matter">
                  <svg className="w-4 h-4 transition-transform group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
              </div>
            </Td>
          </Tr>
        ))}
      </Table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ENTERPRISE TIMELINE & CASE ACTIVITY COMPONENT
// ─────────────────────────────────────────────────────────
function MatterTimelineTab({ caseId, apiMatter, toast }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: '',
    module: 'Matter',
    description: '',
    related_party: '',
    icon: '📌'
  });

  const MODULE_OPTIONS = [
    'All', 'Vehicle', 'Driver', 'Passenger', 'Witness',
    'Insurance', 'Medical Provider', 'Employer', 'Property Damage',
    'Police', 'Documents', 'Legal Parties', 'Matter'
  ];

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedModule && selectedModule !== 'All') params.module = selectedModule;
      if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();
      if (sortBy) params.sort = sortBy;

      const res = await api.matters.getTimeline(caseId, params);
      setEvents(Array.isArray(res.data?.timeline_events) ? res.data.timeline_events : []);
    } catch (e) {
      toast(e.message || 'Failed to load matter timeline', 'error');
    } finally {
      setLoading(false);
    }
  }, [caseId, selectedModule, searchTerm, sortBy, toast]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const filteredEvents = useMemo(() => {
    let result = [...events];

    if (selectedModule && selectedModule !== 'All') {
      const mod = selectedModule.toLowerCase();
      result = result.filter(ev => {
        const evMod = (ev.module || '').toLowerCase();
        return evMod === mod || evMod.includes(mod) || mod.includes(evMod);
      });
    }

    if (searchTerm && searchTerm.trim()) {
      const s = searchTerm.trim().toLowerCase();
      result = result.filter(ev =>
        (ev.title || '').toLowerCase().includes(s) ||
        (ev.description || '').toLowerCase().includes(s) ||
        (ev.user_name || '').toLowerCase().includes(s) ||
        (ev.module || '').toLowerCase().includes(s) ||
        (ev.related_party || '').toLowerCase().includes(s)
      );
    }

    if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at || a.date).getTime() - new Date(b.created_at || b.date).getTime());
    } else if (sortBy === 'module') {
      result.sort((a, b) => (a.module || '').localeCompare(b.module || ''));
    } else {
      result.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
    }

    return result;
  }, [events, selectedModule, searchTerm, sortBy]);

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim()) {
      toast('Please enter a title for the event.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.matters.addTimelineEvent(caseId, newEvent);
      toast('Timeline event recorded successfully!', 'success');
      setShowAddModal(false);
      setNewEvent({ title: '', module: 'Matter', description: '', related_party: '', icon: '📌' });
      fetchTimeline();
    } catch (e) {
      toast(e.message || 'Failed to record timeline event', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (typeof eventId === 'string' && eventId.startsWith('synth_')) {
      toast('Synthesized historic logs are auto-generated from case records.', 'info');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this timeline event?')) return;
    try {
      await api.matters.deleteTimelineEvent(caseId, eventId);
      toast('Timeline event deleted', 'info');
      fetchTimeline();
    } catch (e) {
      toast(e.message || 'Failed to delete event', 'error');
    }
  };

  const getModuleBadgeClass = (mod) => {
    const m = (mod || '').toLowerCase();
    if (m.includes('vehicle')) return 'bg-[#0057c7]/20 text-[#38bdf8] border-[#0057c7]/40';
    if (m.includes('driver')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    if (m.includes('passenger')) return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    if (m.includes('witness')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    if (m.includes('insurance')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (m.includes('medical')) return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    if (m.includes('employer')) return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    if (m.includes('property')) return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
    if (m.includes('police')) return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
    if (m.includes('document')) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    if (m.includes('party')) return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
    return 'bg-white/10 text-white border-white/20';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Main Action Bar */}
      <div className="p-6 rounded-[1.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0057c7]/20 border border-[#0057c7]/40 flex items-center justify-center text-2xl shadow-lg shadow-[#0057c7]/20">
            ⏳
          </div>
          <div>
            <h3 className="text-xl font-900 text-white font-display tracking-tight">Enterprise Timeline & Case Activity</h3>
            <p className="text-xs text-slate-400 mt-1">Chronological history of case progression, modules, document uploads & party events.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="bg-[#0057c7] hover:bg-[#004aa8] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#0057c7]/30 transition-all hover:scale-105"
        >
          <span>+ Record Timeline Event</span>
        </button>
      </div>

      {/* Control Bar: Module Filter Chips, Live Search & Sort */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
        {/* Module Filter Chips */}
        <div>
          <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-2">Filter by Module</label>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
            {MODULE_OPTIONS.map(mod => (
              <button
                key={mod}
                type="button"
                onClick={() => setSelectedModule(mod)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all border ${
                  selectedModule === mod
                    ? 'bg-[#0057c7] text-white border-[#38bdf8]/50 shadow-md shadow-[#0057c7]/30'
                    : 'bg-white/5 text-slate-400 hover:text-white border-white/5 hover:border-white/20'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="🔍 Search events by title, description, user or module..."
              className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
            />
          </div>
          <div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="module">Sort: Module (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline Stream View */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading case timeline...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-white/10 text-center space-y-3 bg-white/[0.01]">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl mx-auto text-slate-400">
            📜
          </div>
          <h4 className="text-sm font-bold text-white">No Timeline Events Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || selectedModule !== 'All'
              ? 'No activity matches your filter criteria.'
              : 'As actions take place across modules, case activity events will appear here in chronological order.'}
          </p>
        </div>
      ) : (
        <div className="relative pl-4 md:pl-8 space-y-6 before:absolute before:left-3 md:before:left-7 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
          {filteredEvents.map((ev, idx) => (
            <div key={ev.id || idx} className="relative group">
              {/* Vertical Icon Node */}
              <div className="absolute -left-7 md:-left-11 top-1.5 w-8 h-8 rounded-full bg-[#1a2233] border border-white/20 flex items-center justify-center text-sm shadow-xl z-10 group-hover:scale-110 group-hover:border-[#38bdf8] transition-all">
                {ev.icon || '📌'}
              </div>

              {/* Event Card (Responsive Stacked on Mobile, Clean Card on Desktop) */}
              <div className="p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all shadow-xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${getModuleBadgeClass(ev.module)}`}>
                      {ev.module}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      📅 {ev.date} at {ev.time}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                      👤 {ev.user_name}
                    </span>
                    {typeof ev.id === 'number' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="text-slate-500 hover:text-rose-400 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors"
                        title="Delete timeline event"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{ev.title}</h4>
                  {ev.description && <p className="text-xs text-slate-300 mt-1 leading-relaxed">{ev.description}</p>}
                </div>

                {ev.related_party && (
                  <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 text-xs text-[#38bdf8]">
                    <span>👥 Related Party:</span>
                    <span className="font-bold text-white">{ev.related_party}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Timeline Event Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#1a2233] border border-white/10 rounded-[2rem] p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 text-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📌</span>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Record Timeline Event</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Manually record a key milestone or activity for this matter.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white font-bold text-lg px-2">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Event Title *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                  placeholder="E.g., Deposition Scheduled / Settlement Offer Received"
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Module Category</label>
                  <select
                    value={newEvent.module}
                    onChange={e => setNewEvent(p => ({ ...p, module: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  >
                    {MODULE_OPTIONS.filter(m => m !== 'All').map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Icon / Tag</label>
                  <select
                    value={newEvent.icon}
                    onChange={e => setNewEvent(p => ({ ...p, icon: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  >
                    <option value="📌">📌 Note / General</option>
                    <option value="⚖️">⚖️ Court / Trial</option>
                    <option value="🚘">🚘 Vehicle</option>
                    <option value="🏎️">🏎️ Driver</option>
                    <option value="👥">👥 Passenger</option>
                    <option value="👁️">👁️ Witness</option>
                    <option value="🛡️">🛡️ Insurance</option>
                    <option value="🩹">🩹 Medical</option>
                    <option value="🏢">🏢 Employer</option>
                    <option value="🏠">🏠 Property Damage</option>
                    <option value="👮">👮 Police</option>
                    <option value="📄">📄 Document</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Related Party Name (Optional)</label>
                <input
                  type="text"
                  value={newEvent.related_party}
                  onChange={e => setNewEvent(p => ({ ...p, related_party: e.target.value }))}
                  placeholder="E.g., John Doe / State Farm Insurance"
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Event Description</label>
                <textarea
                  rows={3}
                  value={newEvent.description}
                  onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                  placeholder="Detailed notes or statement regarding this event..."
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              {/* Client Visible Toggle */}
              <div className="p-3 bg-[#0057c7]/10 border border-[#0057c7]/30 rounded-xl">
                <label className="flex items-center gap-2.5 text-xs text-white font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEvent.is_client_visible ?? true}
                    onChange={e => setNewEvent(p => ({ ...p, is_client_visible: e.target.checked }))}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#0057c7]"
                  />
                  <span className="text-[#38bdf8]">Publish to Client Portal (Client Visible)</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-1 pl-6">When checked, this milestone update is pushed to the client's portal timeline.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 btn btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={handleCreateEvent} disabled={saving} className="flex-1 btn btn-primary text-xs">
                {saving ? 'Saving...' : 'Record Event'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ENTERPRISE REUSABLE CONTACTS MASTER COMPONENT
// ─────────────────────────────────────────────────────────
export function ContactsPage({ navigate, toast, openModal }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState('All');
  const [directoryTab, setDirectoryTab] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmContact, setDeleteConfirmContact] = useState(null);
  const [contactForm, setContactForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    party_type: 'Person',
    organization_name: '',
    address_line_1: '',
    city: '',
    state: '',
    postal_code: '',
    notes: '',
    government_id: '',
    driver_license: '',
    alien_registration_number: '',
    is_referral_source: false,
    referral_category: 'attorney',
    default_fee_terms: '',
    category_type: 'General',
    department: '',
    vendor_service: ''
  });

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const useHighLimit = directoryTab !== 'All';
      const res = await api.contacts.list({
        page: useHighLimit ? 1 : page,
        limit: useHighLimit ? 500 : 12,
        q: searchQuery,
        party_type: partyTypeFilter
      });
      const data = res.data || {};
      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
      setTotalPages(useHighLimit ? 1 : (data.total_pages || 1));
      setTotalCount(data.total || 0);
    } catch (e) {
      toast(e.message || 'Failed to load contacts', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, partyTypeFilter, directoryTab, toast]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleOpenCreate = () => {
    setEditingContact(null);
    setContactForm({
      full_name: '',
      email: '',
      phone: '',
      party_type: 'Person',
      organization_name: '',
      address_line_1: '',
      city: '',
      state: '',
      postal_code: '',
      notes: '',
      government_id: '',
      driver_license: '',
      alien_registration_number: '',
      is_referral_source: false,
      referral_category: 'attorney',
      default_fee_terms: '',
      category_type: 'General',
      department: '',
      vendor_service: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingContact(c);
    setContactForm({
      full_name: c.full_name || '',
      email: c.email || '',
      phone: c.phone || '',
      party_type: c.party_type || 'Person',
      organization_name: c.organization_name || '',
      address_line_1: c.address_line_1 || '',
      city: c.city || '',
      state: c.state || '',
      postal_code: c.postal_code || '',
      notes: c.notes || '',
      government_id: c.government_id || '',
      driver_license: c.driver_license || '',
      alien_registration_number: c.alien_registration_number || '',
      is_referral_source: !!c.is_referral_source,
      referral_category: c.referral_category || 'attorney',
      default_fee_terms: c.default_fee_terms || '',
      category_type: c.category_type || 'General',
      department: c.department || '',
      vendor_service: c.vendor_service || ''
    });
    setShowModal(true);
  };

  const handleSaveContact = async () => {
    if (!contactForm.full_name.trim()) {
      toast('Contact Name is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingContact) {
        await api.contacts.update(editingContact.id, contactForm);
        toast('Contact master entry updated successfully!', 'success');
      } else {
        const res = await api.contacts.create(contactForm);
        if (res.data?.is_duplicate) {
          toast(`Duplicate matched: Contact already exists for ${res.data.full_name}`, 'info');
        } else {
          toast('New contact created in Master Registry!', 'success');
        }
      }
      setShowModal(false);
      fetchContacts();
    } catch (e) {
      toast(e.message || 'Failed to save contact', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = (c) => {
    if (c.linked_matters_count > 0) {
      toast(`Cannot delete contact: Linked to ${c.linked_matters_count} active matter(s). Contacts are preserved to maintain referential integrity.`, 'error');
      return;
    }
    setDeleteConfirmContact(c);
  };

  const confirmDeleteContact = async () => {
    if (!deleteConfirmContact) return;
    const c = deleteConfirmContact;
    setDeleteConfirmContact(null);
    try {
      await api.contacts.remove(c.id);
      toast('Contact removed from Master Registry', 'info');
      fetchContacts();
    } catch (e) {
      toast(e.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Centralized Contact Master"
        subtitle={`${totalCount} master contacts available to reuse across matters`}
      >
        <button
          onClick={handleOpenCreate}
          className="btn btn-primary h-10 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
        >
          <span>+ Create New Contact</span>
        </button>
      </PageHeader>

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-96">
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="🔍 Live search contacts by Name, Email, Phone, Organization..."
            className="w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {['All', 'Person', 'Organization'].map(t => (
            <button
              key={t}
              onClick={() => { setPartyTypeFilter(t); setPage(1); }}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all border ${
                partyTypeFilter === t
                  ? 'bg-[#0057c7] text-white border-[#38bdf8]/50 shadow-md'
                  : 'bg-white/5 text-slate-400 hover:text-white border-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 🏢 Vendors & Court Directory Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'All', label: '📋 All Contacts', color: 'sky' },
          { id: 'Court', label: '🏛️ Courts & Judges', color: 'amber' },
          { id: 'Clerk', label: '📝 Court Clerks', color: 'purple' },
          { id: 'Vendor', label: '🏢 Vendors', color: 'emerald' },
          { id: 'Process Server', label: '📨 Process Servers', color: 'rose' },
          { id: 'Expert', label: '🧑‍⚕️ Expert Witnesses', color: 'indigo' },
          { id: 'Mediator', label: '⚖️ Mediators', color: 'teal' },
          { id: 'Insurance Provider', label: '🛡️ Insurance Providers', color: 'blue' },
          { id: 'Counsel', label: '🎓 Counsel', color: 'cyan' },
          { id: 'Defendant', label: '👤 Defendant / Respondent', color: 'rose' },
          { id: 'Plaintiff', label: '⚖️ Plaintiff / Complainant', color: 'amber' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setDirectoryTab(tab.id); setPage(1); }}
            className={`text-[11px] font-bold px-3.5 py-1.5 rounded-xl transition-all border flex items-center gap-1.5 ${
              directoryTab === tab.id
                ? `bg-${tab.color}-500/20 text-${tab.color}-300 border-${tab.color}-500/40 shadow-md shadow-${tab.color}-500/10`
                : 'bg-white/[0.03] text-slate-400 hover:text-white border-white/5 hover:border-white/10'
            }`}
            style={directoryTab === tab.id ? {
              background: tab.color === 'sky' ? 'rgba(56,189,248,0.15)' : tab.color === 'amber' ? 'rgba(245,158,11,0.15)' : tab.color === 'purple' ? 'rgba(168,85,247,0.15)' : tab.color === 'emerald' ? 'rgba(16,185,129,0.15)' : tab.color === 'rose' ? 'rgba(244,63,94,0.15)' : tab.color === 'indigo' ? 'rgba(99,102,241,0.15)' : tab.color === 'blue' ? 'rgba(59,130,246,0.15)' : tab.color === 'cyan' ? 'rgba(6,182,212,0.15)' : 'rgba(20,184,166,0.15)',
              borderColor: tab.color === 'sky' ? 'rgba(56,189,248,0.4)' : tab.color === 'amber' ? 'rgba(245,158,11,0.4)' : tab.color === 'purple' ? 'rgba(168,85,247,0.4)' : tab.color === 'emerald' ? 'rgba(16,185,129,0.4)' : tab.color === 'rose' ? 'rgba(244,63,94,0.4)' : tab.color === 'indigo' ? 'rgba(99,102,241,0.4)' : tab.color === 'blue' ? 'rgba(59,130,246,0.4)' : tab.color === 'cyan' ? 'rgba(6,182,212,0.4)' : 'rgba(20,184,166,0.4)',
              color: tab.color === 'sky' ? '#38bdf8' : tab.color === 'amber' ? '#fbbf24' : tab.color === 'purple' ? '#c084fc' : tab.color === 'emerald' ? '#34d399' : tab.color === 'rose' ? '#fb7185' : tab.color === 'indigo' ? '#818cf8' : tab.color === 'blue' ? '#60a5fa' : tab.color === 'cyan' ? '#22d3ee' : '#2dd4bf'
            } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Table / Grid View */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading contacts master...</div>
      ) : contacts.length === 0 ? (
        <EmptyState
          title="No Master Contacts Found"
          description={searchQuery ? 'No contacts matched your search query.' : 'Click "Create New Contact" to add contacts to your master directory.'}
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <Table headers={['Contact Name', 'Type & Org', 'Directory Category', 'Email & Phone', 'Linked Matters', 'Actions']}>
              {contacts.filter(c => directoryTab === 'All' || (c.category_type || 'General') === directoryTab).map(c => (
                <Tr key={c.id} className="hover:bg-white/[0.04] transition-colors border-b border-white/5">
                    <Td className="font-bold text-white text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#0057c7]/20 border border-[#0057c7]/40 flex items-center justify-center text-xs font-extrabold text-[#38bdf8]">
                          {leadInitials(c.full_name)}
                        </div>
                        <div>
                          <div>{c.full_name}</div>
                          {c.address_line_1 && <div className="text-[10px] text-slate-400 font-normal">{c.address_line_1}</div>}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.party_type === 'Organization' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-sky-500/20 text-sky-300 border-sky-500/40'}`}>
                        {c.party_type || 'Person'}
                      </span>
                      {c.organization_name && <div className="text-[11px] text-slate-300 mt-1">{c.organization_name}</div>}
                    </Td>
                    <Td>
                      {(() => {
                        const cat = c.category_type || 'General';
                        const catColors = { 'Court': 'amber', 'Clerk': 'purple', 'Vendor': 'emerald', 'Process Server': 'rose', 'Expert': 'indigo', 'Mediator': 'teal', 'Insurance Provider': 'blue', 'Counsel': 'cyan', 'General': 'slate', 'Defendant': 'rose', 'Plaintiff': 'amber' };
                        const cl = catColors[cat] || 'slate';
                        return (
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{
                              background: cl === 'amber' ? 'rgba(245,158,11,0.15)' : cl === 'purple' ? 'rgba(168,85,247,0.15)' : cl === 'emerald' ? 'rgba(16,185,129,0.15)' : cl === 'rose' ? 'rgba(244,63,94,0.15)' : cl === 'indigo' ? 'rgba(99,102,241,0.15)' : cl === 'teal' ? 'rgba(20,184,166,0.15)' : cl === 'blue' ? 'rgba(59,130,246,0.15)' : cl === 'cyan' ? 'rgba(6,182,212,0.15)' : 'rgba(148,163,184,0.15)',
                              borderColor: cl === 'amber' ? 'rgba(245,158,11,0.4)' : cl === 'purple' ? 'rgba(168,85,247,0.4)' : cl === 'emerald' ? 'rgba(16,185,129,0.4)' : cl === 'rose' ? 'rgba(244,63,94,0.4)' : cl === 'indigo' ? 'rgba(99,102,241,0.4)' : cl === 'teal' ? 'rgba(20,184,166,0.4)' : cl === 'blue' ? 'rgba(59,130,246,0.4)' : cl === 'cyan' ? 'rgba(6,182,212,0.4)' : 'rgba(148,163,184,0.3)',
                              color: cl === 'amber' ? '#fbbf24' : cl === 'purple' ? '#c084fc' : cl === 'emerald' ? '#34d399' : cl === 'rose' ? '#fb7185' : cl === 'indigo' ? '#818cf8' : cl === 'teal' ? '#2dd4bf' : cl === 'blue' ? '#60a5fa' : cl === 'cyan' ? '#22d3ee' : '#94a3b8'
                            }}>
                              {cat === 'Court' ? '🏛️' : cat === 'Clerk' ? '📝' : cat === 'Vendor' ? '🏢' : cat === 'Process Server' ? '📨' : cat === 'Expert' ? '🧑‍⚕️' : cat === 'Mediator' ? '⚖️' : cat === 'Insurance Provider' ? '🛡️' : cat === 'Counsel' ? '🎓' : cat === 'Defendant' ? '👤' : cat === 'Plaintiff' ? '⚖️' : '👤'} {cat === 'Defendant' ? 'Defendant / Respondent' : cat === 'Plaintiff' ? 'Plaintiff / Complainant' : cat}
                            </span>
                            {c.department && <div className="text-[10px] text-slate-400 mt-1">{c.department}</div>}
                            {c.vendor_service && <div className="text-[10px] text-slate-500 italic">{c.vendor_service}</div>}
                          </div>
                        );
                      })()}
                    </Td>
                    <Td className="text-xs text-slate-300">
                      <div>📧 {c.email || '—'}</div>
                      <div className="text-slate-400 text-[11px]">📞 {c.phone || '—'}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-400 font-mono">
                          🪪 {c.revealed_id ? c.revealed_id : (c.government_id ? '••••-••••-' + String(c.government_id).slice(-4) : 'SSN/DL: —')}
                        </span>
                        {c.government_id && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await api.contacts.revealSensitive(c.id, 'government_id');
                                const val = res.data?.value || res.data || 'N/A';
                                setContacts(prev => prev.map(item => item.id === c.id ? { ...item, revealed_id: val } : item));
                                toast('Sensitive field unmasked & audit logged in system (Point 22 & 24).', 'info');
                              } catch (e) {
                                toast(e.message || 'Failed to reveal sensitive field', 'error');
                              }
                            }}
                            className="text-sky-400 hover:text-sky-300 font-bold px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[9px] flex items-center gap-1"
                            title="Click to Reveal SSN/DL & Audit Log"
                          >
                            👁️ {c.revealed_id ? 'Hide' : 'Reveal'}
                          </button>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <span className="text-xs font-bold text-[#38bdf8] bg-[#0057c7]/10 border border-[#0057c7]/30 px-2.5 py-1 rounded-xl">
                        ⚖️ {c.linked_matters_count} Matter(s)
                      </span>
                    </Td>
                    <Td className="text-xs text-slate-400 font-mono">
                      {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—'}
                    </Td>
                    <Td className="text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="text-xs font-bold text-slate-300 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteContact(c)}
                        className={`text-xs font-bold px-2 py-1 rounded transition-colors ${c.linked_matters_count > 0 ? 'text-slate-600 cursor-not-allowed opacity-50' : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'}`}
                        disabled={c.linked_matters_count > 0}
                        title={c.linked_matters_count > 0 ? 'Cannot delete: Contact is linked to active matter(s)' : 'Delete Contact'}
                      >
                        Delete
                      </button>
                    </Td>
                  </Tr>
                ))}
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="btn btn-secondary text-xs px-3 py-1 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="btn btn-secondary text-xs px-3 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-[#1a2233] border border-white/10 rounded-[2rem] p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 text-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {editingContact ? 'Edit Master Contact' : 'Create New Master Contact'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Centralized contact record reusable across all firm matters.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white font-bold text-lg px-2">✕</button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar p-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Contact Type *</label>
                  <select
                    value={contactForm.party_type}
                    onChange={e => setContactForm(p => ({ ...p, party_type: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  >
                    <option value="Person">Person (Individual)</option>
                    <option value="Organization">Organization (Company)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={contactForm.full_name}
                    onChange={e => setContactForm(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="Full Name / Primary Contact"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                    required
                  />
                </div>
              </div>

              {contactForm.party_type === 'Organization' && (
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Organization / Company Name</label>
                  <input
                    type="text"
                    value={contactForm.organization_name}
                    onChange={e => setContactForm(p => ({ ...p, organization_name: e.target.value }))}
                    placeholder="E.g. Acme Legal Insurance Inc."
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="contact@email.com"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={contactForm.phone}
                    onChange={e => setContactForm(p => ({ ...p, phone: formatUSPhone(e.target.value) }))}
                    placeholder="(555) 000-0000"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Street Address</label>
                <input
                  type="text"
                  value={contactForm.address_line_1}
                  onChange={e => setContactForm(p => ({ ...p, address_line_1: e.target.value }))}
                  placeholder="123 Main St Suite 100"
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">City</label>
                  <input
                    type="text"
                    value={contactForm.city}
                    onChange={e => setContactForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="City"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">State</label>
                  <input
                    type="text"
                    value={contactForm.state}
                    onChange={e => setContactForm(p => ({ ...p, state: e.target.value }))}
                    placeholder="State"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Zip Code</label>
                  <input
                    type="text"
                    value={contactForm.postal_code}
                    onChange={e => setContactForm(p => ({ ...p, postal_code: e.target.value }))}
                    placeholder="Zip"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              {/* Field-Level Encrypted Identity Fields (Point 22) */}
              <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔒</span> Confidential Identifiers (Point 22)
                  </span>
                  <span className="text-[9px] font-extrabold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-full uppercase">
                    AES-256 Encrypted
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">SSN / Tax ID</label>
                    <input
                      type="text"
                      value={contactForm.government_id || ''}
                      onChange={e => setContactForm(p => ({ ...p, government_id: e.target.value }))}
                      placeholder="XXX-XX-XXXX"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Driver License (DL)</label>
                    <input
                      type="text"
                      value={contactForm.driver_license || ''}
                      onChange={e => setContactForm(p => ({ ...p, driver_license: e.target.value }))}
                      placeholder="DL-9876543"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-400 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">A-Number (Alien Reg)</label>
                    <input
                      type="text"
                      value={contactForm.alien_registration_number || ''}
                      onChange={e => setContactForm(p => ({ ...p, alien_registration_number: e.target.value }))}
                      placeholder="A-123456789"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-400 font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={contactForm.notes}
                  onChange={e => setContactForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Master contact notes..."
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              {/* 🏢 Directory Category (Vendors, Courts, Clerks) */}
              <div className="p-3.5 bg-teal-500/10 border border-teal-500/20 rounded-xl space-y-2.5">
                <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏢</span> Firm Phonebook Directory Category
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-slate-300 uppercase tracking-wider block mb-1">Category Type</label>
                    <select
                      value={contactForm.category_type || 'General'}
                      onChange={e => setContactForm(p => ({ ...p, category_type: e.target.value }))}
                      className="w-full bg-[#090d16] border border-teal-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="General">General Contact</option>
                      <option value="Court">🏛️ Court / Judge</option>
                      <option value="Clerk">📝 Court Clerk</option>
                      <option value="Vendor">🏢 Vendor / Service Provider</option>
                      <option value="Process Server">📨 Process Server</option>
                      <option value="Expert">🧑‍⚕️ Expert Witness</option>
                      <option value="Mediator">⚖️ Mediator / Arbitrator</option>
                      <option value="Insurance Provider">🛡️ Insurance Provider</option>
                      <option value="Counsel">🎓 Counsel / Attorney</option>
                      <option value="Defendant">👤 Defendant / Respondent</option>
                      <option value="Plaintiff">⚖️ Plaintiff / Complainant</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-300 uppercase tracking-wider block mb-1">Department / Division</label>
                    <input
                      type="text"
                      value={contactForm.department || ''}
                      onChange={e => setContactForm(p => ({ ...p, department: e.target.value }))}
                      placeholder="e.g. Family Law Division"
                      className="w-full bg-[#090d16] border border-teal-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
                {(contactForm.category_type === 'Vendor' || contactForm.category_type === 'Expert' || contactForm.category_type === 'Process Server') && (
                  <div>
                    <label className="text-[9px] font-bold text-slate-300 uppercase tracking-wider block mb-1">Service Description</label>
                    <input
                      type="text"
                      value={contactForm.vendor_service || ''}
                      onChange={e => setContactForm(p => ({ ...p, vendor_service: e.target.value }))}
                      placeholder="e.g. Document Translation, Court Reporting, etc."
                      className="w-full bg-[#090d16] border border-teal-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Referral Source Flagging (Section 12 - Point 18 & 19) */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-300">
                  <input
                    type="checkbox"
                    checked={contactForm.is_referral_source || false}
                    onChange={e => setContactForm(p => ({ ...p, is_referral_source: e.target.checked }))}
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>🤝 Flag as Referral Source (Attorney, Clinic, Client, Marketing)</span>
                </label>

                {contactForm.is_referral_source && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="text-[9px] font-bold text-slate-300 uppercase tracking-wider block mb-1">Source Category</label>
                      <select
                        value={contactForm.referral_category || 'attorney'}
                        onChange={e => setContactForm(p => ({ ...p, referral_category: e.target.value }))}
                        className="w-full bg-[#090d16] border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="attorney">Attorney / Counsel</option>
                        <option value="firm">Law Firm</option>
                        <option value="clinic">Medical Clinic / Doctor</option>
                        <option value="client">Client / Former Client</option>
                        <option value="marketing">Marketing Channel</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-300 uppercase tracking-wider block mb-1">Default Fee Terms</label>
                      <input
                        type="text"
                        value={contactForm.default_fee_terms || ''}
                        onChange={e => setContactForm(p => ({ ...p, default_fee_terms: e.target.value }))}
                        placeholder="e.g. 25% Fee Split or $500/case"
                        className="w-full bg-[#090d16] border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={handleSaveContact} disabled={saving} className="flex-1 btn btn-primary text-xs">
                {saving ? 'Saving...' : editingContact ? 'Update Contact' : 'Save Contact'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmContact && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setDeleteConfirmContact(null)}>
          <div className="bg-[#1a2233] border border-rose-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 text-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Delete Contact</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete contact <span className="font-bold text-white">&quot;{deleteConfirmContact.full_name}&quot;</span> from the Master Registry?
            </p>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setDeleteConfirmContact(null)} className="flex-1 btn btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={confirmDeleteContact} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl px-4 py-2 transition-colors">Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ENTERPRISE RELATIONSHIP MAPPING TAB COMPONENT
// ─────────────────────────────────────────────────────────
export function MatterRelationshipsTab({ caseId, apiMatter, toast }) {
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortOption, setSortOption] = useState('Newest');

  const [showModal, setShowModal] = useState(false);
  const [editingRel, setEditingRel] = useState(null);
  const [saving, setSaving] = useState(false);

  const [fromContactText, setFromContactText] = useState('');
  const [toContactText, setToContactText] = useState('');

  const [deleteConfirmRel, setDeleteConfirmRel] = useState(null);

  const [relationshipType, setRelationshipType] = useState('Spouse');
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [notes, setNotes] = useState('');

  const numericMatterId = useMemo(() => {
    if (!caseId) return apiMatter?.id;
    if (typeof caseId === 'number') return caseId;
    if (typeof caseId === 'string') {
      const match = caseId.match(/\d+/);
      return match ? parseInt(match[0], 10) : apiMatter?.id;
    }
    return apiMatter?.id;
  }, [caseId, apiMatter]);

  const fetchRelationships = useCallback(async () => {
    if (!numericMatterId) return;
    setLoading(true);
    try {
      const res = await api.relationships.listForMatter(numericMatterId, {
        q: searchQuery,
        category: categoryFilter,
        sort: sortOption
      });
      setRelationships(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast(e.message || 'Failed to load relationships', 'error');
    } finally {
      setLoading(false);
    }
  }, [numericMatterId, searchQuery, categoryFilter, sortOption, toast]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  const handleOpenCreate = () => {
    setEditingRel(null);
    setFromContactText('');
    setToContactText('');
    setRelationshipType('Spouse');
    setCustomTypeInput('');
    setNotes('');
    setShowModal(true);
  };

  const handleOpenEdit = (rel) => {
    setEditingRel(rel);
    setFromContactText(rel.from_contact?.full_name || '');
    setToContactText(rel.to_contact?.full_name || '');
    const predefined = [
      'Spouse', 'Parent', 'Child', 'Guardian', 'Sibling', 'Emergency Contact',
      'Attorney', 'Client', 'Witness', 'Representative',
      'Employer', 'Employee', 'Business Partner'
    ];
    if (predefined.includes(rel.relationship_type)) {
      setRelationshipType(rel.relationship_type);
      setCustomTypeInput('');
    } else {
      setRelationshipType('Custom Relationship');
      setCustomTypeInput(rel.relationship_type);
    }
    setNotes(rel.notes || '');
    setShowModal(true);
  };

  const handleSaveRelationship = async () => {
    const fromVal = fromContactText.trim();
    const toVal = toContactText.trim();

    if (!fromVal) {
      toast('From Contact is required.', 'error');
      return;
    }
    if (!toVal) {
      toast('To Contact is required.', 'error');
      return;
    }

    const finalType = relationshipType === 'Custom Relationship' ? customTypeInput.trim() : relationshipType;
    if (!finalType) {
      toast('Please specify a Relationship Type.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingRel) {
        await api.relationships.update(editingRel.id, {
          relationship_type: finalType,
          notes
        });
        toast('Relationship updated successfully!', 'success');
      } else {
        await api.relationships.create(numericMatterId, {
          from_contact_name: fromVal,
          to_contact_name: toVal,
          relationship_type: finalType,
          notes
        });
        toast('Relationship mapped successfully!', 'success');
      }
      setShowModal(false);
      fetchRelationships();
    } catch (e) {
      toast(e.message || 'Failed to save relationship', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRelationship = (rel) => {
    setDeleteConfirmRel(rel);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmRel) return;
    const rel = deleteConfirmRel;
    setDeleteConfirmRel(null);
    try {
      await api.relationships.remove(rel.id);
      toast('Relationship deleted successfully', 'info');
      fetchRelationships();
    } catch (e) {
      toast(e.message || 'Delete failed', 'error');
    }
  };

  const getRelBadge = (type) => {
    const badges = {
      'Spouse': { icon: '💍', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
      'Parent': { icon: '👨‍👩‍👧', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
      'Child': { icon: '👶', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
      'Guardian': { icon: '🛡️', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
      'Sibling': { icon: '👫', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
      'Emergency Contact': { icon: '🚨', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
      'Attorney': { icon: '⚖️', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
      'Client': { icon: '👤', color: 'bg-[#0057c7]/20 text-[#38bdf8] border-[#0057c7]/40' },
      'Witness': { icon: '👁️', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
      'Representative': { icon: '💼', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
      'Employer': { icon: '🏢', color: 'bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/40' },
      'Employee': { icon: '👔', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
      'Business Partner': { icon: '🤝', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' }
    };
    return badges[type] || { icon: '📌', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/10">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>🔗 Enterprise Relationship Mapping</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Map family, legal, business, and custom connections between contacts for this Matter without creating duplicate records.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn btn-primary h-10 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shrink-0"
        >
          <span>+ Add Relationship</span>
        </button>
      </div>

      {/* Filters & Control Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="🔍 Search contacts, relationship type, or notes..."
            className="w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {['All', 'Family', 'Legal', 'Business', 'Other'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  categoryFilter === cat
                    ? 'bg-[#0057c7] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value)}
            className="bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
          >
            <option value="Newest">Newest First</option>
            <option value="Oldest">Oldest First</option>
            <option value="Relationship Type">By Type</option>
          </select>
        </div>
      </div>

      {/* Relationship List / Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading relationships for Matter #{numericMatterId}...</div>
      ) : relationships.length === 0 ? (
        <EmptyState
          title="No Relationships Mapped"
          description={searchQuery ? 'No relationships match your search query.' : 'Click "+ Add Relationship" to map connections between contacts for this Matter.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {relationships.map(rel => {
            const badge = getRelBadge(rel.relationship_type);
            return (
              <div key={rel.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-[#38bdf8]/40 transition-all flex flex-col justify-between gap-4 text-white shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  {/* From Contact */}
                  <div className="flex-1 bg-[#05080f] p-3 rounded-xl border border-white/5">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">From Contact</div>
                    <div className="font-bold text-white text-xs truncate">{rel.from_contact?.full_name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{rel.from_contact?.email || rel.from_contact?.phone || 'No contact info'}</div>
                  </div>

                  {/* Relationship Type Pill */}
                  <div className="flex flex-col items-center justify-center shrink-0 px-2 pt-2">
                    <span className="text-xs text-slate-400">➔</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1 shadow-md mt-1 ${badge.color}`}>
                      <span>{badge.icon}</span>
                      <span>{rel.relationship_type}</span>
                    </span>
                  </div>

                  {/* To Contact */}
                  <div className="flex-1 bg-[#05080f] p-3 rounded-xl border border-white/5">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">To Contact</div>
                    <div className="font-bold text-white text-xs truncate">{rel.to_contact?.full_name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{rel.to_contact?.email || rel.to_contact?.phone || 'No contact info'}</div>
                  </div>
                </div>

                {rel.notes && (
                  <div className="text-xs text-slate-300 bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Notes:</span>
                    {rel.notes}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400">
                  <span>Created {new Date(rel.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenEdit(rel)} className="text-xs font-bold text-slate-300 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">Edit</button>
                    <button onClick={() => handleDeleteRelationship(rel)} className="text-xs font-bold text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 transition-colors">Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmRel && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setDeleteConfirmRel(null)}>
          <div className="bg-[#1a2233] border border-rose-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 text-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Delete Relationship</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete the <span className="font-bold text-white">&quot;{deleteConfirmRel.relationship_type}&quot;</span> relationship link between <span className="font-bold text-white">{deleteConfirmRel.from_contact?.full_name}</span> and <span className="font-bold text-white">{deleteConfirmRel.to_contact?.full_name}</span>?
            </p>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setDeleteConfirmRel(null)} className="flex-1 btn btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={confirmDelete} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl px-4 py-2 transition-colors">Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add / Edit Relationship Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-[#1a2233] border border-white/10 rounded-[2rem] p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 text-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔗</span>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {editingRel ? 'Edit Relationship' : 'Map New Relationship'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Connect contacts for Matter #{numericMatterId} without duplicating records.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white font-bold text-lg px-2">✕</button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar p-1">
              {/* From Contact */}
              <div>
                <label className="text-[10px] font-900 text-[#38bdf8] uppercase tracking-widest block mb-1">From Contact *</label>
                <input
                  type="text"
                  value={fromContactText}
                  onChange={e => setFromContactText(e.target.value)}
                  placeholder="Enter name, phone, or any identifier..."
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              {/* Relationship Type Selector */}
              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Relationship Type *</label>
                <select
                  value={relationshipType}
                  onChange={e => setRelationshipType(e.target.value)}
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                >
                  <optgroup label="Family">
                    <option value="Spouse">💍 Spouse</option>
                    <option value="Parent">👨‍👩‍👧 Parent</option>
                    <option value="Child">👶 Child</option>
                    <option value="Guardian">🛡️ Guardian</option>
                    <option value="Sibling">👫 Sibling</option>
                    <option value="Emergency Contact">🚨 Emergency Contact</option>
                  </optgroup>
                  <optgroup label="Legal">
                    <option value="Attorney">⚖️ Attorney</option>
                    <option value="Client">👤 Client</option>
                    <option value="Witness">👁️ Witness</option>
                    <option value="Representative">💼 Representative</option>
                  </optgroup>
                  <optgroup label="Business">
                    <option value="Employer">🏢 Employer</option>
                    <option value="Employee">👔 Employee</option>
                    <option value="Business Partner">🤝 Business Partner</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="Custom Relationship">📌 Custom Relationship</option>
                  </optgroup>
                </select>
              </div>

              {relationshipType === 'Custom Relationship' && (
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Custom Relationship Name *</label>
                  <input
                    type="text"
                    value={customTypeInput}
                    onChange={e => setCustomTypeInput(e.target.value)}
                    placeholder="E.g. Trustee, Co-Signer, Power of Attorney..."
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
              )}

              {/* To Contact */}
              <div>
                <label className="text-[10px] font-900 text-[#38bdf8] uppercase tracking-widest block mb-1">To Contact *</label>
                <input
                  type="text"
                  value={toContactText}
                  onChange={e => setToContactText(e.target.value)}
                  placeholder="Enter name, phone, or any identifier..."
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Optional Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Additional context or relationship details..."
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={handleSaveRelationship} disabled={saving} className="flex-1 btn btn-primary text-xs">
                {saving ? 'Saving...' : editingRel ? 'Update Link' : 'Save Link'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ENTERPRISE DAMAGES & SETTLEMENT MODULE COMPONENT
// ─────────────────────────────────────────────────────────
export function MatterSettlementTab({ caseId, apiMatter, toast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    demand_amount: '',
    initial_offer: '',
    counter_offer: '',
    final_settlement_amount: '',
    future_medical_expenses: '',
    pain_and_suffering: '',
    out_of_pocket_expenses: '',
    miscellaneous_damages: '',
    punitive_damages: '',
    status: 'Open',
    settlement_date: '',
    notes: ''
  });

  const numericMatterId = useMemo(() => {
    if (!caseId) return apiMatter?.id;
    if (typeof caseId === 'number') return caseId;
    if (typeof caseId === 'string') {
      const match = caseId.match(/\d+/);
      return match ? parseInt(match[0], 10) : apiMatter?.id;
    }
    return apiMatter?.id;
  }, [caseId, apiMatter]);

  const fetchSettlementData = useCallback(async () => {
    if (!numericMatterId) return;
    setLoading(true);
    try {
      const res = await api.settlement.getForMatter(numericMatterId);
      setData(res.data || null);
    } catch (e) {
      toast(e.message || 'Failed to load settlement details', 'error');
    } finally {
      setLoading(false);
    }
  }, [numericMatterId, toast]);

  useEffect(() => {
    fetchSettlementData();
  }, [fetchSettlementData]);

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const handleOpenCreate = () => {
    setEditingRecord(null);
    setForm({
      demand_amount: '',
      initial_offer: '',
      counter_offer: '',
      final_settlement_amount: '',
      future_medical_expenses: '',
      pain_and_suffering: '',
      out_of_pocket_expenses: '',
      miscellaneous_damages: '',
      punitive_damages: '',
      status: 'Open',
      settlement_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setForm({
      demand_amount: rec.demand_amount || '',
      initial_offer: rec.initial_offer || '',
      counter_offer: rec.counter_offer || '',
      final_settlement_amount: rec.final_settlement_amount || '',
      future_medical_expenses: rec.future_medical_expenses || '',
      pain_and_suffering: rec.pain_and_suffering || '',
      out_of_pocket_expenses: rec.out_of_pocket_expenses || '',
      miscellaneous_damages: rec.miscellaneous_damages || '',
      punitive_damages: rec.punitive_damages || '',
      status: rec.status || 'Open',
      settlement_date: rec.settlement_date ? new Date(rec.settlement_date).toISOString().split('T')[0] : '',
      notes: rec.notes || ''
    });
    setShowModal(true);
  };

  const handleSaveSettlement = async () => {
    const checkNeg = (val) => Number(val) < 0;
    if (checkNeg(form.demand_amount) || checkNeg(form.initial_offer) || checkNeg(form.counter_offer) || checkNeg(form.final_settlement_amount) || checkNeg(form.future_medical_expenses) || checkNeg(form.pain_and_suffering) || checkNeg(form.out_of_pocket_expenses) || checkNeg(form.miscellaneous_damages) || checkNeg(form.punitive_damages)) {
      toast('Negative amounts are not allowed.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingRecord) {
        await api.settlement.update(editingRecord.id, form);
        toast('Settlement offer updated successfully!', 'success');
      } else {
        await api.settlement.saveForMatter(numericMatterId, form);
        toast('New settlement offer recorded in history!', 'success');
      }
      setShowModal(false);
      fetchSettlementData();
    } catch (e) {
      toast(e.message || 'Failed to save settlement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSettlement = async (rec) => {
    if (!window.confirm('Are you sure you want to delete this settlement record from history?')) return;
    try {
      await api.settlement.remove(rec.id);
      toast('Settlement record deleted', 'info');
      fetchSettlementData();
    } catch (e) {
      toast(e.message || 'Delete failed', 'error');
    }
  };

  const summary = data?.summary || {};
  const history = data?.history || [];
  const auto = data?.auto_calculated || {};

  const getStatusBadge = (st) => {
    const s = (st || 'Open').toLowerCase();
    if (s === 'settled' || s === 'accepted') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (s === 'negotiation' || s === 'counter offer') return 'bg-amber-500/20 text-amber-300 border-[#amber-500]/40';
    if (s === 'rejected') return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    if (s === 'closed') return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
    return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/10">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>⚖️ Enterprise Damages & Settlement Module</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Automatic case damages breakdown & settlement offer negotiation history for Matter #{numericMatterId}.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn btn-primary h-10 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shrink-0"
        >
          <span>+ Record Settlement Offer</span>
        </button>
      </div>

      {/* Financial Scorecards */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Computing automated case damages...</div>
      ) : (
        <div className="space-y-6">
          {/* Master Summary Box */}
          <div className="p-6 rounded-2xl bg-[#0057c7]/10 border border-[#0057c7]/30 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1 border-r border-white/10 pr-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-widest">💰 Total Economic Damages</div>
              <div className="text-2xl font-black text-white">{formatCurrency(summary.total_economic_damages)}</div>
              <div className="text-[10px] text-slate-400">Medical + Wages + Property + Future/Misc</div>
            </div>

            <div className="space-y-1 border-r border-white/10 pr-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-widest">🧠 Non-Economic Damages</div>
              <div className="text-2xl font-black text-amber-400">{formatCurrency(summary.total_non_economic_damages)}</div>
              <div className="text-[10px] text-slate-400">Pain & Suffering + Punitive Damages</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-[#38bdf8] uppercase tracking-widest">🎯 Target / Claimed Value</div>
              <div className="text-2xl font-black text-[#38bdf8]">{formatCurrency(summary.total_claimed_damages)}</div>
              <div className="text-[10px] text-slate-400">Total Claimed (Economic + Non-Economic)</div>
            </div>
          </div>

          {/* Negotiation Offers History Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Negotiation History ({history.length} Entries)</h4>
              <span className="text-[10px] text-slate-400">Full audit history preserved</span>
            </div>

            {history.length === 0 ? (
              <EmptyState
                title="No Negotiation Records"
                description='Click "+ Record Settlement Offer" to log initial demands, insurance counter offers, and settlement agreements.'
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
                <Table headers={['Date', 'Demand Amount', 'Initial Offer', 'Counter Offer', 'Final Settlement', 'Status', 'Notes', 'Actions']}>
                  {history.map(rec => (
                    <Tr key={rec.id} className="hover:bg-white/[0.04] border-b border-white/5">
                      <Td className="text-xs text-slate-300 font-mono">
                        {rec.settlement_date ? new Date(rec.settlement_date).toLocaleDateString() : new Date(rec.created_at).toLocaleDateString()}
                      </Td>
                      <Td className="font-bold text-white text-xs">{formatCurrency(rec.demand_amount)}</Td>
                      <Td className="text-xs text-slate-300">{formatCurrency(rec.initial_offer)}</Td>
                      <Td className="text-xs text-amber-300 font-bold">{formatCurrency(rec.counter_offer)}</Td>
                      <Td className="text-xs text-emerald-400 font-bold">{formatCurrency(rec.final_settlement_amount)}</Td>
                      <Td>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(rec.status)}`}>
                          {rec.status || 'Open'}
                        </span>
                      </Td>
                      <Td className="text-xs text-slate-300 max-w-xs truncate">{rec.notes || '—'}</Td>
                      <Td className="text-right space-x-2">
                        <button onClick={() => handleOpenEdit(rec)} className="text-xs font-bold text-slate-300 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10">Edit</button>
                        <button onClick={() => handleDeleteSettlement(rec)} className="text-xs font-bold text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20">Delete</button>
                      </Td>
                    </Tr>
                  ))}
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Settlement Offer Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-[#1a2233] border border-white/10 rounded-[2rem] p-6 w-full max-w-2xl shadow-2xl flex flex-col gap-4 text-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {editingRecord ? 'Edit Settlement Negotiation Record' : 'Record New Settlement Offer'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Appends offer to negotiation history for Matter #{numericMatterId}.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white font-bold text-lg px-2">✕</button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar p-1">
              {/* Negotiation Amounts */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">Negotiation Figures</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Demand Amount ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.demand_amount}
                      onChange={e => setForm(p => ({ ...p, demand_amount: e.target.value }))}
                      placeholder="E.g. 150000"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Initial Offer ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.initial_offer}
                      onChange={e => setForm(p => ({ ...p, initial_offer: e.target.value }))}
                      placeholder="E.g. 35000"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Counter Offer ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.counter_offer}
                      onChange={e => setForm(p => ({ ...p, counter_offer: e.target.value }))}
                      placeholder="E.g. 85000"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Final Settlement Amount ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.final_settlement_amount}
                      onChange={e => setForm(p => ({ ...p, final_settlement_amount: e.target.value }))}
                      placeholder="E.g. 110000"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                </div>
              </div>

              {/* Supplemental Damages */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Supplemental & Non-Economic Damages</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Pain & Suffering ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.pain_and_suffering}
                      onChange={e => setForm(p => ({ ...p, pain_and_suffering: e.target.value }))}
                      placeholder="E.g. 50000"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Future Medical Expenses ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.future_medical_expenses}
                      onChange={e => setForm(p => ({ ...p, future_medical_expenses: e.target.value }))}
                      placeholder="E.g. 25000"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Out-of-Pocket ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.out_of_pocket_expenses}
                      onChange={e => setForm(p => ({ ...p, out_of_pocket_expenses: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Misc Damages ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.miscellaneous_damages}
                      onChange={e => setForm(p => ({ ...p, miscellaneous_damages: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Punitive ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.punitive_damages}
                      onChange={e => setForm(p => ({ ...p, punitive_damages: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Settlement Status *</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  >
                    <option value="Open">Open</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Settled">Settled</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Settlement Date</label>
                  <input
                    type="date"
                    value={form.settlement_date}
                    onChange={e => setForm(p => ({ ...p, settlement_date: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Negotiation Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Record adjuster remarks, policy limit details, or negotiation terms..."
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={handleSaveSettlement} disabled={saving} className="flex-1 btn btn-primary text-xs">
                {saving ? 'Saving...' : editingRecord ? 'Update Record' : 'Save Offer Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ENTERPRISE TASKS & FOLLOW-UPS MODULE COMPONENT
// ─────────────────────────────────────────────────────────
export function MatterTasksTab({ caseId, apiMatter, toast }) {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ pending: 0, overdue: 0, completed: 0, due_today: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assignedFilter, setAssignedFilter] = useState('All');
  const [sortOption, setSortOption] = useState('Due Soon');

  const [usersList, setUsersList] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    assigned_user_id: '',
    due_date: '',
    priority: 'Medium',
    status: 'Pending',
    recurrence: 'One Time',
    depends_on_task_id: '',
    reminder_minutes_before: 60,
    reminder_type: 'System'
  });

  const numericMatterId = useMemo(() => {
    if (!caseId) return apiMatter?.id;
    if (typeof caseId === 'number') return caseId;
    if (typeof caseId === 'string') {
      const match = caseId.match(/\d+/);
      return match ? parseInt(match[0], 10) : apiMatter?.id;
    }
    return apiMatter?.id;
  }, [caseId, apiMatter]);

  useEffect(() => {
    api.users.list().then(res => {
      setUsersList(Array.isArray(res.data) ? res.data : []);
    }).catch(() => {});
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!numericMatterId) return;
    setLoading(true);
    try {
      const res = await api.tasks.listForMatter(numericMatterId, {
        q: searchQuery,
        status: statusFilter,
        priority: priorityFilter,
        assigned_user_id: assignedFilter,
        sort: sortOption
      });
      const data = res.data || {};
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setStats(data.stats || { pending: 0, overdue: 0, completed: 0, due_today: 0, total: 0 });
    } catch (e) {
      toast(e.message || 'Failed to load matter tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [numericMatterId, searchQuery, statusFilter, priorityFilter, assignedFilter, sortOption, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleOpenCreate = () => {
    setEditingTask(null);
    setForm({
      title: '',
      description: '',
      assigned_user_id: '',
      due_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      priority: 'Medium',
      status: 'Pending',
      recurrence: 'One Time',
      depends_on_task_id: '',
      reminder_minutes_before: 60,
      reminder_type: 'System'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTask(t);
    setForm({
      title: t.title || '',
      description: t.description || '',
      assigned_user_id: t.assigned_user_id || '',
      due_date: t.due_date ? new Date(t.due_date).toISOString().slice(0, 16) : '',
      priority: t.priority || 'Medium',
      status: t.status || 'Pending',
      recurrence: t.recurrence || 'One Time',
      depends_on_task_id: t.depends_on_task_id || '',
      reminder_minutes_before: t.reminder_minutes_before || 60,
      reminder_type: t.reminder_type || 'System'
    });
    setShowModal(true);
  };

  const handleToggleComplete = async (t) => {
    const newStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await api.tasks.update(t.id, { status: newStatus });
      toast(newStatus === 'Completed' ? `Task "${t.title}" marked completed!` : `Task reopened`, 'success');
      fetchTasks();
    } catch (e) {
      toast(e.message || 'Failed to update task status', 'error');
    }
  };

  const handleSaveTask = async () => {
    if (!form.title.trim()) {
      toast('Task Title is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingTask) {
        await api.tasks.update(editingTask.id, form);
        toast('Task updated successfully!', 'success');
      } else {
        await api.tasks.create(numericMatterId, form);
        toast('New task created for Matter!', 'success');
      }
      setShowModal(false);
      fetchTasks();
    } catch (e) {
      toast(e.message || 'Failed to save task', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = (t) => {
    setDeletingTask(t);
  };

  const confirmDeleteTask = async () => {
    if (!deletingTask) return;
    try {
      await api.tasks.remove(deletingTask.id);
      toast('Task deleted', 'info');
      setDeletingTask(null);
      fetchTasks();
    } catch (e) {
      toast(e.message || 'Delete failed', 'error');
    }
  };

  const getPriorityBadge = (p) => {
    const badges = {
      Critical: 'bg-red-500/20 text-red-300 border-red-500/40',
      High: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      Medium: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      Low: 'bg-slate-500/20 text-slate-300 border-slate-500/40'
    };
    return badges[p] || 'bg-slate-500/20 text-slate-300 border-slate-500/40';
  };

  const getStatusBadge = (st) => {
    const badges = {
      Completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      'In Progress': 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      Pending: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      Cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/40'
    };
    return badges[st] || 'bg-slate-500/20 text-slate-300 border-slate-500/40';
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full max-w-full min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/10">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>📋 Enterprise Tasks & Follow-ups</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Manage activities, deadlines, team assignments, and task dependencies for Matter #{numericMatterId}.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn btn-primary h-9 sm:h-10 px-4 sm:px-5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 shadow-lg shadow-[#0057c7]/20"
        >
          <span>+ Add Task</span>
        </button>
      </div>

      {/* Task Dashboard Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Tasks</div>
          <div className="text-lg sm:text-xl font-black text-amber-400">{stats.pending}</div>
        </div>

        <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border space-y-1 ${stats.overdue > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/[0.02] border-white/10'}`}>
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <span>Overdue Tasks</span>
            {stats.overdue > 0 && <span className="text-[8px] sm:text-[9px] text-rose-400 font-black animate-pulse">● Action Needed</span>}
          </div>
          <div className={`text-lg sm:text-xl font-black ${stats.overdue > 0 ? 'text-rose-400' : 'text-white'}`}>{stats.overdue}</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Today</div>
          <div className="text-lg sm:text-xl font-black text-[#38bdf8]">{stats.due_today}</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed</div>
          <div className="text-lg sm:text-xl font-black text-emerald-400">{stats.completed}</div>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        <div className="w-full lg:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="🔍 Search tasks..."
            className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 sm:px-4 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#05080f] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-[#38bdf8] w-full"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Overdue">Overdue Only</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-[#05080f] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-[#38bdf8] w-full"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Assigned User Filter */}
          <select
            value={assignedFilter}
            onChange={e => setAssignedFilter(e.target.value)}
            className="bg-[#05080f] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-[#38bdf8] w-full truncate"
          >
            <option value="All">All Team</option>
            {usersList.map(u => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>

          {/* Sort Option */}
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value)}
            className="bg-[#05080f] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-[#38bdf8] w-full"
          >
            <option value="Due Soon">Due Soon</option>
            <option value="Due Later">Due Later</option>
            <option value="Priority">By Priority</option>
          </select>
        </div>
      </div>

      {/* Task Content */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading tasks for Matter #{numericMatterId}...</div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No Tasks Found"
          description={searchQuery ? 'No tasks match your filters.' : 'Click "+ Add Task" to assign tasks and reminders to your team.'}
        />
      ) : (
        <>
          {/* Desktop Table View (Hidden on mobile/tablet) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <Table headers={['Complete', 'Task Title & Notes', 'Assigned To', 'Due Date & Time', 'Priority', 'Recurrence / Dep', 'Status', 'Actions']}>
              {tasks.map(t => (
                <Tr key={t.id} className={`hover:bg-white/[0.04] border-b border-white/5 ${t.is_overdue ? 'bg-rose-500/5' : ''}`}>
                  {/* 1-Click Checkbox */}
                  <Td className="w-10 text-center">
                    <input
                      type="checkbox"
                      checked={t.status === 'Completed'}
                      onChange={() => handleToggleComplete(t)}
                      className="w-4 h-4 rounded border-white/20 accent-[#0057c7] cursor-pointer"
                    />
                  </Td>

                  {/* Title & Notes */}
                  <Td className="font-bold text-white text-xs">
                    <div className="space-y-0.5">
                      <div className={`flex items-center gap-2 ${t.status === 'Completed' ? 'line-through text-slate-400' : 'text-white'}`}>
                        <span>{t.title}</span>
                        {t.is_overdue && (
                          <span className="text-[9px] font-black text-rose-400 bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                            Overdue
                          </span>
                        )}
                      </div>
                      {t.description && <div className="text-[10px] text-slate-400 font-normal line-clamp-1">{t.description}</div>}
                    </div>
                  </Td>

                  {/* Assigned User */}
                  <Td className="text-xs text-slate-300">
                    {t.assigned_user ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#0057c7]/30 border border-[#0057c7]/50 text-[9px] font-bold text-[#38bdf8] flex items-center justify-center">
                          {t.assigned_user.full_name.charAt(0)}
                        </span>
                        <span>{t.assigned_user.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Unassigned</span>
                    )}
                  </Td>

                  {/* Due Date & Time */}
                  <Td className="text-xs font-mono">
                    {t.due_date ? (
                      <span className={t.is_overdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        📅 {new Date(t.due_date).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : '—'}
                  </Td>

                  {/* Priority */}
                  <Td>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(t.priority)}`}>
                      {t.priority || 'Medium'}
                    </span>
                  </Td>

                  {/* Recurrence / Dependency */}
                  <Td className="text-[10px] text-slate-400 space-y-0.5">
                    {t.recurrence && t.recurrence !== 'One Time' && (
                      <div className="text-sky-300 font-bold">🔁 {t.recurrence}</div>
                    )}
                    {t.depends_on_task && (
                      <div className={`font-semibold ${t.depends_on_task.status === 'Completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        🔗 Depends on #{t.depends_on_task.id} ({t.depends_on_task.status})
                      </div>
                    )}
                    {(!t.recurrence || t.recurrence === 'One Time') && !t.depends_on_task && <span>Standard</span>}
                  </Td>

                  {/* Status */}
                  <Td>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(t.status)}`}>
                      {t.status}
                    </span>
                  </Td>

                  {/* Actions */}
                  <Td className="text-right space-x-2">
                    <button onClick={() => handleOpenEdit(t)} className="text-xs font-bold text-slate-300 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10">Edit</button>
                    <button onClick={() => handleDeleteTask(t)} className="text-xs font-bold text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20">Delete</button>
                  </Td>
                </Tr>
              ))}
            </Table>
          </div>

          {/* Mobile / Tablet Responsive Card List */}
          <div className="block md:hidden space-y-3">
            {tasks.map(t => (
              <div key={t.id} className={`p-4 rounded-xl border bg-white/[0.02] space-y-3 transition-all ${t.is_overdue ? 'border-rose-500/40 bg-rose-500/5' : 'border-white/10'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={t.status === 'Completed'}
                      onChange={() => handleToggleComplete(t)}
                      className="w-5 h-5 mt-0.5 rounded border-white/20 accent-[#0057c7] cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className={`text-xs font-bold ${t.status === 'Completed' ? 'line-through text-slate-400' : 'text-white'}`}>
                        {t.title}
                      </h4>
                      {t.description && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{t.description}</p>}
                    </div>
                  </div>

                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getStatusBadge(t.status)}`}>
                    {t.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.is_overdue && (
                      <span className="text-[9px] font-black text-rose-400 bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 rounded-full uppercase">
                        Overdue
                      </span>
                    )}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(t.priority)}`}>
                      {t.priority}
                    </span>
                    {t.assigned_user && (
                      <span className="text-slate-300 text-[10px]">👤 {t.assigned_user.full_name}</span>
                    )}
                  </div>

                  {t.due_date && (
                    <span className={`font-mono text-[10px] ${t.is_overdue ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                      📅 {new Date(t.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button onClick={() => handleOpenEdit(t)} className="text-[11px] font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/5">Edit</button>
                  <button onClick={() => handleDeleteTask(t)} className="text-[11px] font-bold text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg bg-rose-500/10">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Task Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-[#1a2233] border border-white/10 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 w-full max-w-lg shadow-2xl flex flex-col gap-3 sm:gap-4 text-white max-h-[92vh] sm:max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl sm:text-2xl">📋</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    {editingTask ? 'Edit Task & Reminder' : 'Create New Task'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Assign activity for Matter #{numericMatterId}.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white font-bold text-base sm:text-lg px-2">✕</button>
            </div>

            <div className="space-y-3 overflow-y-auto custom-scrollbar p-1">
              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Task Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="E.g. File Motion for Summary Judgment"
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Task Description / Instructions</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Detailed task instructions or notes..."
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Assign To Team Member</label>
                  <select
                    value={form.assigned_user_id}
                    onChange={e => setForm(p => ({ ...p, assigned_user_id: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  >
                    <option value="">Unassigned</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.role || 'Staff'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Due Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={form.due_date}
                    onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Recurrence</label>
                  <select
                    value={form.recurrence}
                    onChange={e => setForm(p => ({ ...p, recurrence: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                  >
                    <option value="One Time">One Time</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Task Dependency Picker */}
              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Depends On Another Task (Optional)</label>
                <select
                  value={form.depends_on_task_id}
                  onChange={e => setForm(p => ({ ...p, depends_on_task_id: e.target.value }))}
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                >
                  <option value="">No Dependency (Independent)</option>
                  {tasks.filter(t => !editingTask || t.id !== editingTask.id).map(t => (
                    <option key={t.id} value={t.id}>#{t.id} - {t.title} ({t.status})</option>
                  ))}
                </select>
              </div>

              {/* Reminder Settings */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">Notification & Reminder Settings</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Remind Before</label>
                    <select
                      value={form.reminder_minutes_before}
                      onChange={e => setForm(p => ({ ...p, reminder_minutes_before: e.target.value }))}
                      className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                    >
                      <option value="15">15 Minutes Before</option>
                      <option value="30">30 Minutes Before</option>
                      <option value="60">1 Hour Before</option>
                      <option value="1440">1 Day Before</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Notification Type</label>
                    <select
                      value={form.reminder_type}
                      onChange={e => setForm(p => ({ ...p, reminder_type: e.target.value }))}
                      className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                    >
                      <option value="System">System Popup</option>
                      <option value="Email">Email</option>
                      <option value="Both">System + Email</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={handleSaveTask} disabled={saving} className="flex-1 btn btn-primary text-xs">
                {saving ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Delete Confirmation Modal */}
      {deletingTask && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setDeletingTask(null)}>
          <div className="bg-[#1a2233] border border-rose-500/30 rounded-2xl sm:rounded-[2rem] p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 text-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-2xl flex items-center justify-center shrink-0">🗑️</span>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Delete Task Confirmation</h3>
                <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5 leading-relaxed">
              Are you sure you want to delete task <strong className="text-white font-bold">"{deletingTask.title}"</strong>?
            </p>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setDeletingTask(null)} className="flex-1 btn btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={confirmDeleteTask} className="flex-1 btn bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2 rounded-xl">Delete Task</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ENTERPRISE COMMUNICATION LOG MODULE COMPONENT
// ─────────────────────────────────────────────────────────
export function MatterCommunicationsTab({ caseId, apiMatter, toast }) {
  const [comms, setComms] = useState([]);
  const [stats, setStats] = useState({ total: 0, calls: 0, emails: 0, sms: 0, meetings: 0, notes: 0 });
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [contactFilter, setContactFilter] = useState('All');
  const [sortOption, setSortOption] = useState('Newest');

  const [contactsList, setContactsList] = useState([]);
  const [documentsList, setDocumentsList] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingComm, setEditingComm] = useState(null);
  const [deletingComm, setDeletingComm] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: 'Call',
    subject: '',
    description: '',
    communication_date: '',
    contact_id: '',
    document_ids: []
  });

  const numericMatterId = useMemo(() => {
    if (!caseId) return apiMatter?.id;
    if (typeof caseId === 'number') return caseId;
    if (typeof caseId === 'string') {
      const match = caseId.match(/\d+/);
      return match ? parseInt(match[0], 10) : apiMatter?.id;
    }
    return apiMatter?.id;
  }, [caseId, apiMatter]);

  useEffect(() => {
    api.contacts.list().then(res => setContactsList(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    if (numericMatterId) {
      api.documents.list({ matter_id: numericMatterId, limit: 'all' }).then(res => setDocumentsList(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    }
  }, [numericMatterId, matterRefreshTick]);

  const fetchCommunications = useCallback(async () => {
    if (!numericMatterId) return;
    setLoading(true);
    try {
      const res = await api.communications.listForMatter(numericMatterId, {
        q: searchQuery,
        type: typeFilter,
        contact_id: contactFilter,
        sort: sortOption
      });
      const data = res.data || {};
      setComms(Array.isArray(data.communications) ? data.communications : []);
      setStats(data.stats || { total: 0, calls: 0, emails: 0, sms: 0, meetings: 0, notes: 0 });
    } catch (e) {
      toast(e.message || 'Failed to load matter communications', 'error');
    } finally {
      setLoading(false);
    }
  }, [numericMatterId, searchQuery, typeFilter, contactFilter, sortOption, toast]);

  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  const handleOpenCreate = () => {
    setEditingComm(null);
    setForm({
      type: 'Call',
      subject: '',
      description: '',
      communication_date: new Date().toISOString().slice(0, 16),
      contact_id: '',
      document_ids: []
    });
    setShowModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingComm(c);
    setForm({
      type: c.type || 'Call',
      subject: c.subject || '',
      description: c.description || '',
      communication_date: c.communication_date ? new Date(c.communication_date).toISOString().slice(0, 16) : '',
      contact_id: c.contact_id || '',
      document_ids: Array.isArray(c.document_ids) ? c.document_ids : (typeof c.document_ids === 'string' ? JSON.parse(c.document_ids || '[]') : [])
    });
    setShowModal(true);
  };

  const handleSaveComm = async () => {
    if (!form.subject.trim()) {
      toast('Communication Subject is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingComm) {
        await api.communications.update(editingComm.id, form);
        toast('Communication record updated successfully!', 'success');
      } else {
        await api.communications.create(numericMatterId, form);
        toast('New communication logged for Matter!', 'success');
      }
      setShowModal(false);
      fetchCommunications();
    } catch (e) {
      toast(e.message || 'Failed to save communication', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComm = (c) => {
    setDeletingComm(c);
  };

  const confirmDeleteComm = async () => {
    if (!deletingComm) return;
    try {
      await api.communications.remove(deletingComm.id);
      toast('Communication log deleted', 'info');
      setDeletingComm(null);
      fetchCommunications();
    } catch (e) {
      toast(e.message || 'Delete failed', 'error');
    }
  };

  const getTypeIcon = (t) => {
    const tp = (t || '').toLowerCase();
    if (tp === 'call') return '📞';
    if (tp === 'email') return '✉️';
    if (tp === 'sms') return '💬';
    if (tp === 'meeting') return '🤝';
    return '📝';
  };

  const getTypeBadge = (t) => {
    const tp = (t || '').toLowerCase();
    if (tp === 'call') return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    if (tp === 'email') return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
    if (tp === 'sms') return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    if (tp === 'meeting') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
  };

  const toggleDocSelection = (docId) => {
    setForm(prev => {
      const current = prev.document_ids || [];
      if (current.includes(docId)) {
        return { ...prev, document_ids: current.filter(id => id !== docId) };
      } else {
        return { ...prev, document_ids: [...current, docId] };
      }
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full max-w-full min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/10">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>💬 Enterprise Communication Log</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Track phone calls, emails, SMS, meetings, and notes linked to contacts and documents for Matter #{numericMatterId}.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn btn-primary h-9 sm:h-10 px-4 sm:px-5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 shadow-lg shadow-[#0057c7]/20"
        >
          <span>+ Log Communication</span>
        </button>
      </div>

      {/* Summary Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Logs</div>
          <div className="text-lg sm:text-xl font-black text-white">{stats.total}</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <span>📞 Calls</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-sky-400">{stats.calls}</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <span>✉️ Emails</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-indigo-400">{stats.emails}</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <span>🤝 Meetings</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-400">{stats.meetings}</div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <span>📝 Notes</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-300">{stats.notes}</div>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        <div className="w-full lg:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="🔍 Search communications..."
            className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 sm:px-4 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full lg:w-auto">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-[#05080f] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-[#38bdf8] w-full"
          >
            <option value="All">All Types</option>
            <option value="Call">📞 Call</option>
            <option value="Email">✉️ Email</option>
            <option value="SMS">💬 SMS</option>
            <option value="Meeting">🤝 Meeting</option>
            <option value="Note">📝 Note</option>
          </select>

          {/* Contact Filter */}
          <select
            value={contactFilter}
            onChange={e => setContactFilter(e.target.value)}
            className="bg-[#05080f] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-[#38bdf8] w-full truncate"
          >
            <option value="All">All Contacts</option>
            {contactsList.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>

          {/* Sort Option */}
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value)}
            className="bg-[#05080f] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-[#38bdf8] w-full"
          >
            <option value="Newest">Newest First</option>
            <option value="Oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Communications Card List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading communications for Matter #{numericMatterId}...</div>
      ) : comms.length === 0 ? (
        <EmptyState
          title="No Communications Found"
          description={searchQuery ? 'No log entries match your filters.' : 'Click "+ Log Communication" to record phone calls, emails, meetings, or notes.'}
        />
      ) : (
        <div className="space-y-3">
          {comms.map(c => (
            <div key={c.id} className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl sm:text-2xl">{getTypeIcon(c.type)}</span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <span>{c.subject}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getTypeBadge(c.type)}`}>
                        {c.type}
                      </span>
                    </h4>
                    <div className="flex items-center gap-3 text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                      {c.contact && (
                        <span>👤 <strong className="text-slate-300">{c.contact.first_name} {c.contact.last_name}</strong></span>
                      )}
                      <span>📅 {new Date(c.communication_date).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {c.creator && <span>By: <strong className="text-slate-300">{c.creator.full_name}</strong></span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button onClick={() => handleOpenEdit(c)} className="text-xs font-bold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/5">Edit</button>
                  <button onClick={() => handleDeleteComm(c)} className="text-xs font-bold text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10">Delete</button>
                </div>
              </div>

              {c.description && (
                c.description.includes('<') && c.description.includes('>') ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: c.description }}
                    className="text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5 leading-relaxed communication-html-body"
                  />
                ) : (
                  <p className="text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed">
                    {c.description}
                  </p>
                )
              )}

              {Array.isArray(c.documents) && c.documents.length > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <div className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider mb-1.5">Attached Documents ({c.documents.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {c.documents.map(doc => (
                      <span key={doc.id} className="text-[10px] font-semibold text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <span>📄</span>
                        <span>{doc.title}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Communication Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-[#1a2233] border border-white/10 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 w-full max-w-lg shadow-2xl flex flex-col gap-3 sm:gap-4 text-white max-h-[92vh] sm:max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl sm:text-2xl">💬</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    {editingComm ? 'Edit Communication Log' : 'Log New Communication'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Record activity for Matter #{numericMatterId}.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white font-bold text-base sm:text-lg px-2">✕</button>
            </div>

            <div className="space-y-3 overflow-y-auto custom-scrollbar p-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Type *</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  >
                    <option value="Call">📞 Call</option>
                    <option value="Email">✉️ Email</option>
                    <option value="SMS">💬 SMS</option>
                    <option value="Meeting">🤝 Meeting</option>
                    <option value="Note">📝 Note</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={form.communication_date}
                    onChange={e => setForm(p => ({ ...p, communication_date: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Subject / Summary *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="E.g. Phone call with client regarding settlement offer"
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Link Contact / Party (Optional)</label>
                <select
                  value={form.contact_id}
                  onChange={e => setForm(p => ({ ...p, contact_id: e.target.value }))}
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                >
                  <option value="">Unlinked / General</option>
                  {contactsList.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email || c.phone || 'Contact'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Details / Message Body</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Detailed communication notes or email body..."
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              {/* Attach Existing Documents */}
              {documentsList.length > 0 && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">Attach Matter Documents</div>
                  <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                    {documentsList.map(doc => {
                      const isSelected = (form.document_ids || []).includes(doc.id);
                      return (
                        <label key={doc.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDocSelection(doc.id)}
                            className="w-3.5 h-3.5 rounded border-white/20 accent-[#0057c7]"
                          />
                          <span className="truncate text-slate-200">📄 {doc.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={handleSaveComm} disabled={saving} className="flex-1 btn btn-primary text-xs">
                {saving ? 'Saving...' : editingComm ? 'Update Log' : 'Save Log'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Delete Confirmation Modal */}
      {deletingComm && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setDeletingComm(null)}>
          <div className="bg-[#1a2233] border border-rose-500/30 rounded-2xl sm:rounded-[2rem] p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 text-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-2xl flex items-center justify-center shrink-0">🗑️</span>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Delete Communication Log</h3>
                <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5 leading-relaxed">
              Are you sure you want to delete communication <strong className="text-white font-bold">"{deletingComm.subject}"</strong>?
            </p>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setDeletingComm(null)} className="flex-1 btn btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={confirmDeleteComm} className="flex-1 btn bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2 rounded-xl">Delete Log</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  MATTER DETAIL
// ─────────────────────────────────────────────────────────
export function CaseDetailPage({ caseId, navigate, toast, openModal, role: originalRole = 'admin' }) {
  const role = originalRole.toLowerCase();
  const isAdmin = role === 'admin';
  const isStaff = role === 'admin' || role === 'lawyer';
  const isClient = role === 'client';
  const hasApiMatter = true;
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'Overview';
  const [tab, setTab] = useState(initialTab);
  const [documentsFolderFilter, setDocumentsFolderFilter] = useState(null);
  const [matterSubfolderPath, setMatterSubfolderPath] = useState([]);
  const [currentCase, setCurrentCase] = useState(null);
  const [apiMatter, setApiMatter] = useState(null);
  const [matterLoading, setMatterLoading] = useState(hasApiMatter);
  const [matterError, setMatterError] = useState('');
  const [statusHistory, setStatusHistory] = useState([]);
  const [matterRefreshTick, setMatterRefreshTick] = useState(0);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerHistory, setTimerHistory] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [expandedThread, setExpandedThread] = useState(null);
  const [expandedThreadData, setExpandedThreadData] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [isAddVariableModalOpen, setIsAddVariableModalOpen] = useState(false);
  const [newPartyForm, setNewPartyForm] = useState({
    full_name: '',
    party_role: 'Witness',
    party_type: 'Person',
    organization_name: '',
    email: '',
    phone: '',
    address: '',
    government_id: '',
    country_of_birth: '',
    insurance_number: '',
    relief_sought: '',
    notes: ''
  });
  const stoppingRef = useRef(false);
  const activeTimerRef = useRef(null);
  const autoStartedRef = useRef(null);

  const handleAddPartyFromModal = async (newParty) => {
    try {
      let existing = [];
      if (apiMatter?.parties_data) {
        if (Array.isArray(apiMatter.parties_data)) {
          existing = apiMatter.parties_data;
        } else if (typeof apiMatter.parties_data === 'string') {
          try {
            existing = JSON.parse(apiMatter.parties_data);
          } catch(e) {
            existing = [];
          }
        }
      }
      const updatedParties = [...existing, newParty];
      await api.matters.update(caseId, { parties_data: updatedParties });
      toast(`Party "${newParty.full_name}" added to matter`, 'success');
      fetchData();
      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
    } catch(e) {
      toast(e.message || 'Failed to add party', 'error');
    }
  };

  const handleAddModuleFromModal = async (newModule) => {
    try {
      if (newModule.module_type === 'Vehicle') {
        let existing = [];
        if (apiMatter?.vehicles_data) {
          if (Array.isArray(apiMatter.vehicles_data)) {
            existing = apiMatter.vehicles_data;
          } else if (typeof apiMatter.vehicles_data === 'string') {
            try {
              existing = JSON.parse(apiMatter.vehicles_data);
            } catch(e) {
              existing = [];
            }
          }
        }
        const updatedVehicles = [...existing, newModule.payload];
        await api.matters.update(caseId, { vehicles_data: updatedVehicles });
      } else {
        const existingAnswers = apiMatter?.intake_answers || {};
        const key = newModule.module_type.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const list = existingAnswers[key] || [];
        existingAnswers[key] = [...list, newModule.payload];
        await api.matters.update(caseId, { intake_answers: existingAnswers });
      }
      toast(`${newModule.module_type} attached to matter`, 'success');
      fetchData();
      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
    } catch(e) {
      toast(e.message || 'Failed to attach module', 'error');
    }
  };

  const handleStageTimelineClick = async (newStage) => {
    const prevMatter = apiMatter;
    const prevCase = currentCase;
    const newStatusStr = newStage.toLowerCase();

    // 1. Instant Optimistic UI Update for both apiMatter & currentCase header badge
    setApiMatter(prev => prev ? ({
      ...prev,
      status: newStatusStr,
      intake_answers: { ...(prev?.intake_answers || {}), current_stage: newStage }
    }) : prev);

    setCurrentCase(prev => prev ? ({
      ...prev,
      status: newStatusStr,
      stage: newStage
    }) : prev);

    toast(`Matter stage updated to: ${newStage}`, 'success');

    try {
      const updatedAnswers = { ...(prevMatter?.intake_answers || {}), current_stage: newStage };
      const res = await api.matters.update(caseId, {
        status: newStatusStr,
        intake_answers: updatedAnswers
      });
      if (res && res.data) {
        setApiMatter(res.data);
        setCurrentCase(mapMatterToCaseView(res.data));
      }
      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
    } catch(e) {
      // Revert both states to previous state if API call fails
      setApiMatter(prevMatter);
      setCurrentCase(prevCase);
      toast(e.message || 'Failed to update stage', 'error');
    }
  };

  useEffect(() => {
    activeTimerRef.current = activeTimer;
  }, [activeTimer]);

  const [matterEvents, setMatterEvents] = useState([]);
  const [remoteFolders, setRemoteFolders] = useState([]);
  const [courtForms, setCourtForms] = useState([]);
  const [courtFormsLoading, setCourtFormsLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;
    api.courtForms.listDrafts({ matter_id: caseId })
      .then((res) => setCourtForms(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setCourtFormsLoading(false));
  }, [caseId]);

  const handleDeleteCommunication = async (commId) => {
    try {
      await api.request(`/communications/${commId}`, {
        method: 'DELETE'
      });
      toast('Communication deleted successfully', 'success');
      setShowConfirmDelete(null);
      
      // Refresh case details data
      const res = await api.matters.get(caseId);
      setApiMatter(res.data);
      
      // Sync globally
      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
    } catch (err) {
      console.error(err);
      toast('Failed to delete communication: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const [portalNote, setPortalNote] = useState('');
  const [savingPortalNote, setSavingPortalNote] = useState(false);

  const fetchData = useCallback(async () => {
    if (!apiMatter) {
      setMatterLoading(true);
    }
    setMatterError('');
    try {
      const [res, folderRes, calRes] = await Promise.all([
        api.matters.get(caseId),
        api.folders.list({ matter_id: caseId }),
        api.calendar.list({ matter_id: caseId })
      ]);
      const m = res.data;
      setApiMatter(m);
      setPortalNote(m.description || m.client_next_steps_note || '');
      setRemoteFolders(Array.isArray(folderRes.data) ? folderRes.data : []);
      setMatterEvents(Array.isArray(calRes.data) ? calRes.data.filter(e => String(e.matter_id) === String(caseId) || (e.type === 'matter' && String(e.matter_id) === String(caseId))) : []);
      setCurrentCase(mapMatterToCaseView(m));
      const hist = (m.status_history || []).map((h) => ({
        date: new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        from: h.old_status === 'completed' ? 'closed' : h.old_status,
        to: h.new_status === 'completed' ? 'closed' : h.new_status,
        by: 'Firm',
      }));
      setStatusHistory(hist);
    } catch (e) {
      setMatterError(e.message || 'Failed to load matter');
    } finally {
      setMatterLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    window.addEventListener('vktori:entities-changed', fetchData);
    return () => window.removeEventListener('vktori:entities-changed', fetchData);
  }, [fetchData]);

  const savePortalNote = async () => {
    setSavingPortalNote(true);
    try {
      await api.matters.update(caseId, { description: portalNote });
      toast('Client Portal "What Happens Next" note saved & published!', 'success');
      fetchData();
      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
    } catch (e) {
      toast(e.message || 'Failed to save portal note', 'error');
    } finally {
      setSavingPortalNote(false);
    }
  };

  useEffect(() => {
    if (isClient || !apiMatter?.id || autoStartedRef.current === caseId) return;
    autoStartedRef.current = caseId;
    let cancelled = false;
    
    const autoStart = async () => {
      try {
        const res = await api.timers.start(apiMatter.id);
        if (!cancelled && res.data) {
          setActiveTimer(res.data);
        }
      } catch (e) {
        // Silently ignore if timer auto-start fails or already active
      }
    };
    
    autoStart();
    return () => { cancelled = true; };
  }, [apiMatter?.id, caseId, isClient]);

  // Handle auto-stop on unmount or tab close
  useEffect(() => {
    if (isClient) return;

    const handleUnload = () => {
      if (activeTimerRef.current && activeTimerRef.current.matter_id === Number(caseId)) {
        const token = localStorage.getItem('vktori_token');
        if (token) {
          // Use fetch with keepalive for tab close
          fetch(`${API_BASE_URL}/timers/${activeTimerRef.current.id}/stop`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            keepalive: true
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      // Only stop if still active and for this matter
      const timer = activeTimerRef.current;
      if (timer && timer.matter_id === Number(caseId) && !stoppingRef.current) {
        stopTimer();
      }
    };
  }, [caseId, isClient]); // Removed activeTimer from deps to prevent stopping on every update

  useEffect(() => {
    if (!activeTimer || activeTimer.matter_id !== Number(caseId)) {
      setTimerSeconds(0);
      return;
    }
    const update = () => {
      const start = new Date(activeTimer.start_time);
      const diff = Math.floor((new Date() - start) / 1000);
      setTimerSeconds(diff > 0 ? diff : 0);
    };
    update();
    const inv = setInterval(update, 1000);
    return () => clearInterval(inv);
  }, [activeTimer, caseId]);

  const loadTimerHistory = useCallback(async () => {
    if (isClient) return;
    try {
      const res = await api.timers.list({ matter_id: caseId });
      setTimerHistory(res.data || []);
    } catch (e) {
      console.error('Failed to load timer history', e);
    }
  }, [caseId, isClient]);

  useEffect(() => {
    loadTimerHistory();
  }, [loadTimerHistory]);

  useEffect(() => {
    const onRefresh = () => loadTimerHistory();
    window.addEventListener('vktori:entities-changed', onRefresh);
    return () => window.removeEventListener('vktori:entities-changed', onRefresh);
  }, [loadTimerHistory]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !caseId) return;
    setIsSubmittingReply(true);
    try {
      await api.communications.reply({
        parent_id: replyingTo,
        message_body: replyText.trim(),
      });
      setReplyText('');
      setReplyingTo(null);
      toast('Reply sent successfully', 'success');
      // Refresh data
      fetchData();
      window.dispatchEvent(new Event('vktori:entities-changed'));
    } catch (e) {
      toast(e.message || 'Failed to send reply', 'error');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const loadThread = async (id) => {
    if (expandedThread === id) {
      setExpandedThread(null);
      setExpandedThreadData(null);
      return;
    }
    setExpandedThread(id);
    try {
      const res = await api.communications.getThread(id);
      setExpandedThreadData(res.data);
    } catch (e) {
      toast('Failed to load thread replies', 'error');
    }
  };

  const formatTimer = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
  };

  const startTimer = async () => {
    try {
      const res = await api.timers.start(caseId);
      setActiveTimer(res.data);
      toast('Timer started', 'success');
      window.dispatchEvent(new Event('vktori:entities-changed'));
    } catch (e) {
      toast(e.message || 'Failed to start timer', 'error');
    }
  };

  const stopTimer = async () => {
    const token = localStorage.getItem('vktori_token');
    if (!activeTimerRef.current || stoppingRef.current || !token) return;
    stoppingRef.current = true;
    const timerId = activeTimerRef.current.id;
    try {
      await api.timers.stop(timerId);
      setActiveTimer(null);
      setTimerSeconds(0);
      toast('Timer stopped and session saved', 'success');
      window.dispatchEvent(new Event('vktori:entities-changed'));
    } catch (e) {
      // Only toast error if it's not a "already stopped" message which we are trying to avoid anyway
      if (!e.message?.includes('already stopped')) {
        toast(e.message || 'Failed to stop timer', 'error');
      }
    } finally {
      stoppingRef.current = false;
    }
  };

  useEffect(() => {
    setDocumentsFolderFilter(null);
  }, [caseId]);

  useEffect(() => {
    if (!hasApiMatter) return;
    const onRefresh = () => setMatterRefreshTick((t) => t + 1);
    window.addEventListener('vktori:entities-changed', onRefresh);
    return () => window.removeEventListener('vktori:entities-changed', onRefresh);
  }, [hasApiMatter]);

  useEffect(() => {
    if ((tab === 'Communications' || tab === 'Communication' || tab === 'Messages' || tab === 'Notes') && apiMatter?.id) {
      api.communications.markMatterRead(apiMatter.id)
        .then(() => {
          window.dispatchEvent(new Event('vktori:entities-changed'));
        })
        .catch(() => { });
    }
  }, [tab, apiMatter?.id]);

  const handleStatusChange = async (newStatus) => {
    if (!currentCase || newStatus === currentCase.status) return;
    try {
      const apiSt = newStatus === 'closed' ? 'completed' : newStatus;
      await api.matters.update(caseId, { status: apiSt });
      const res = await api.matters.get(caseId);
      setApiMatter(res.data);
      setCurrentCase(mapMatterToCaseView(res.data));
      toast(`Matter status updated to ${newStatus}`, 'success');
    } catch (e) {
      toast(e.message || 'Update failed', 'error');
    }
  };

  const [docSearchTerm, setDocSearchTerm] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState('');

  const parsedParties = (() => {
    if (!apiMatter?.parties_data) return [];
    if (Array.isArray(apiMatter.parties_data)) return apiMatter.parties_data;
    try {
      return JSON.parse(apiMatter.parties_data);
    } catch {
      return [];
    }
  })();

  const parsedVehicles = (() => {
    if (!apiMatter?.vehicles_data) return [];
    if (Array.isArray(apiMatter.vehicles_data)) return apiMatter.vehicles_data;
    try {
      return JSON.parse(apiMatter.vehicles_data);
    } catch {
      return [];
    }
  })();

  const maskGovId = (val) => {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (trimmed.length <= 4) return `••••${trimmed}`;
    const visible = trimmed.slice(-4);
    return `••••-••••-${visible}`;
  };

  const primaryRetainingClient = apiMatter?.client || (parsedParties.find(p => p.party_role === 'Retaining Client' || p.party_role === 'Client')) || {
    full_name: currentCase?.client || 'Primary Client',
    email: currentCase?.clientEmail || '—',
    phone: currentCase?.clientPhone || '—'
  };
  const docs = currentCase
    ? (hasApiMatter && apiMatter?.documents
      ? apiMatter.documents.map((d) => ({
        id: d.id,
        name: d.original_name,
        type: matterMimeToFileType(d.mime_type),
        caseId: currentCase.id,
        category: d.category || 'General',
        folder_path: d.folder_path || '',
        by: d.uploader?.full_name || '—',
        uploaded: new Date(d.created_at).toLocaleDateString(),
        created_at_ms: new Date(d.created_at).getTime(),
        size: `${Math.max(1, Math.round(d.file_size / 1024))} KB`,
      }))
      : [])
    : [];

  const rootMatterDocs = docs.filter(d => {
    if (!documentsFolderFilter) return false;
    return documentFolderBucket(d.category) === documentsFolderFilter;
  });

  const currentMatterPath = matterSubfolderPath.join('/');
  const matterPrefix = currentMatterPath === "" ? "" : currentMatterPath + "/";

  // Matter subfolders
  const matterSubfolders = (() => {
    if (!documentsFolderFilter || docSearchTerm) return [];
    const names = [...new Set(
      rootMatterDocs
        .map(d => d.folder_path || "")
        .filter(p => p !== currentMatterPath && p.startsWith(matterPrefix))
        .map(p => p.slice(matterPrefix.length).split('/')[0])
    )].filter(Boolean);

    return names.map(name => {
      const subPath = matterPrefix + name;
      const count = rootMatterDocs.filter(d => {
        const dp = d.folder_path || "";
        return dp === subPath || dp.startsWith(subPath + '/');
      }).length;
      return { name, count };
    });
  })();

  const docsInFolder = (() => {
    let list = docs;
    if (documentsFolderFilter) {
      if (docSearchTerm) {
        list = rootMatterDocs;
      } else {
        list = rootMatterDocs.filter(d => (d.folder_path || "") === currentMatterPath);
      }
    }
    return list.filter(d => {
      const matchSearch = docSearchTerm ? d.name.toLowerCase().includes(docSearchTerm.toLowerCase()) : true;
      const matchCategory = docCategoryFilter ? d.category === docCategoryFilter : true;
      return matchSearch && matchCategory;
    }).sort((a, b) => b.created_at_ms - a.created_at_ms);
  })();

  const handleCompleteTask = async (taskId, e) => {
    e?.stopPropagation();
    try {
      await api.tasks.complete(taskId);
      toast('Task marked as complete', 'success');
      window.dispatchEvent(new Event('vktori:entities-changed'));
    } catch (err) {
      toast(err.message || 'Failed to complete task', 'error');
    }
  };

  const handleReopenTask = async (taskId, e) => {
    e?.stopPropagation();
    try {
      await api.tasks.reopen(taskId);
      toast('Task reopened', 'success');
      window.dispatchEvent(new Event('vktori:entities-changed'));
    } catch (err) {
      toast(err.message || 'Failed to reopen task', 'error');
    }
  };

  const handleStartTask = async (taskId, e) => {
    e?.stopPropagation();
    try {
      await api.tasks.update(taskId, { status: 'in_progress' });
      toast('Task in progress', 'success');
      window.dispatchEvent(new Event('vktori:entities-changed'));
    } catch (err) {
      toast(err.message || 'Failed to start task', 'error');
    }
  };

  const tasks = hasApiMatter && apiMatter?.tasks
    ? apiMatter.tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
      status: t.status,
      task_type: t.task_type,
      assignee: t.assigned_user?.full_name || 'Unassigned',
      due: t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No Due Date',
      completed_at: t.completed_at
    }))
    : [];

  const [templatesDrafts, setTemplatesDrafts] = useState([]);

  useEffect(() => {
    if (hasApiMatter && apiMatter?.drafts) {
      setTemplatesDrafts(
        apiMatter.drafts.map((d) => ({
          id: String(d.id),
          title: d.title,
          category: d.category || 'General',
          updated: new Date(d.updated_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          status: d.status,
          preview: (d.content || '').slice(0, 400) || '—',
          content: d.content || '',
        })),
      );
    } else {
      setTemplatesDrafts([]);
    }
  }, [hasApiMatter, apiMatter, currentCase?.id]);
  const [reviewDraft, setReviewDraft] = useState(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [payingInvoiceDbId, setPayingInvoiceDbId] = useState(null);
  const [previewDraft, setPreviewDraft] = useState(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [isCreateDraftOpen, setIsCreateDraftOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [newDraftForm, setNewDraftForm] = useState({
    title: '',
    category: '',
    matterName: '',
    clientName: '',
    status: 'Draft',
    notes: '',
  });
  const [globalTemplates, setGlobalTemplates] = useState([]);
  const [creationType, setCreationType] = useState('blank');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  useEffect(() => {
    if (isCreateDraftOpen) {
      api.templates.list({ limit: 100 }).then(res => {
        setGlobalTemplates(res.data || []);
      }).catch(err => console.error('Failed to load templates for selector', err));
    }
  }, [isCreateDraftOpen]);

  const signaturePadRef = useRef(null);
  const signaturePadContainerRef = useRef(null);
  const signaturePadHeight = 210;

  const handleDeleteCase = async () => {
    try {
      await api.matters.remove(caseId);
      toast('Matter deleted successfully.', 'success');
      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
      navigate('/admin/matters');
    } catch (e) {
      toast(e.message || 'Failed to delete matter', 'error');
      setIsDeleteConfirmOpen(false);
    }
  };

  const [esignModalData, setEsignModalData] = useState(null);

  const openEsignModal = (item) => {
    const draftId = typeof item === 'object' ? item.id : item;
    const title = typeof item === 'object' ? item.title : 'Legal Document / Retainer Agreement';
    const clientEmail = apiMatter?.client?.email || '';
    setEsignModalData({
      draftId,
      title,
      email: clientEmail,
      token: null,
      url: null,
      step: 'input',
    });
  };

  const handleExecuteEsignSend = async (e) => {
    e?.preventDefault();
    if (!esignModalData || !esignModalData.email) {
      toast('Please enter a recipient email address.', 'error');
      return;
    }
    try {
      const res = await api.drafts.sendForSignature(esignModalData.draftId, { recipient_email: esignModalData.email });
      const token = res?.data?.token || res?.token || (res?.data && res.data.id ? res.data.id : null);
      const url = token ? `${window.location.origin}/sign/${token}` : `${window.location.origin}/sign`;
      
      setEsignModalData(prev => ({
        ...prev,
        token,
        url,
        step: 'success'
      }));
      const mRes = await api.matters.get(caseId);
      setApiMatter(mRes.data);
      toast('E-Sign signature request dispatched successfully!', 'success');
    } catch (e) {
      toast(e.message || 'Failed to dispatch signature request', 'error');
    }
  };

  const sendTemplateForSignature = (id, title) => {
    if (!/^\d+$/.test(String(id))) {
      toast('Draft is not linked to database.', 'info');
      return;
    }
    openEsignModal({ id, title: title || 'Legal Document / Retainer Agreement' });
  };
  const downloadDraftPdf = async (id) => {
    try {
      const { blob } = await api.drafts.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `draft_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(e.message || 'Download failed', 'error');
    }
  };
  const openDraftPreview = async (item) => {
    setPreviewDraft(item);
    try {
      const { blob } = await api.drafts.downloadPdf(item.id);
      setPreviewPdfUrl(URL.createObjectURL(blob));
    } catch (e) {
      toast('Failed to load PDF preview.', 'error');
    }
  };
  const closeDraftPreview = () => {
    setPreviewDraft(null);
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
  };
  const openCreateDraftModal = (cat = '') => {
    setCreationType('blank');
    setSelectedTemplateId('');
    setNewDraftForm({
      title: '',
      category: typeof cat === 'string' ? cat : '',
      matterName: currentCase.title || '',
      clientName: currentCase.client || '',
      status: 'Draft',
      notes: '',
    });
    setIsCreateDraftOpen(true);
  };
  const handleTemplateChange = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const t = globalTemplates.find(x => x.id === parseInt(templateId, 10));
    if (t) {
      setNewDraftForm(prev => ({
        ...prev,
        title: prev.title || t.title,
        category: t.category || '',
        notes: t.content || ''
      }));
    }
  };
  const saveNewDraft = async () => {
    if (creationType === 'template' && !selectedTemplateId) {
      toast('Please select a template.', 'warning');
      return;
    }
    if (!newDraftForm.title.trim()) {
      toast('Draft Title is required.', 'warning');
      return;
    }
    if (!newDraftForm.category.trim()) {
      toast('Category is required.', 'warning');
      return;
    }
    try {
      let u = null;
      try {
        u = JSON.parse(localStorage.getItem('vktori_user') || 'null');
      } catch { /* ignore */ }
      if (!u?.id) {
        toast('Missing user session.', 'error');
        return;
      }
      await api.drafts.create({
        matter_id: Number(caseId),
        title: newDraftForm.title.trim(),
        category: newDraftForm.category.trim(),
        content: newDraftForm.notes.trim() || null,
        created_by_user_id: u.id,
        status: 'draft',
      });
      const res = await api.matters.get(caseId);
      setApiMatter(res.data);
      setIsCreateDraftOpen(false);
      toast('New draft created successfully.', 'success');
    } catch (e) {
      toast(e.message || 'Create failed', 'error');
    }
  };
  const clientStatus = (status) => status === 'Sent for Signature' ? 'Pending Signature' : status;
  const openReviewAndSign = (item) => {
    setReviewConfirmed(false);
    setHasDrawnSignature(false);
    signaturePadRef.current?.clear();
    setReviewDraft(item);
  };
  const signReviewedDraft = async () => {
    if (!reviewConfirmed || !reviewDraft || !hasDrawnSignature) return;
    try {
      if (!/^\d+$/.test(String(reviewDraft.id))) {
        toast('Draft is not linked to a database record.', 'info');
        return;
      }
      const signature_data = signaturePadRef.current?.toDataURL() || null;
      if (!signature_data) {
        toast('Failed to capture signature image.', 'error');
        return;
      }
      await api.drafts.sign(Number(reviewDraft.id), {
        signature_data,
        ip_address: '0.0.0.0', // Could be captured if needed
        device_info: window.navigator.userAgent,
      });
      const res = await api.matters.get(caseId);
      setApiMatter(res.data);
      setReviewDraft(null);
      setReviewConfirmed(false);
      setHasDrawnSignature(false);
      signaturePadRef.current?.clear();
      toast('Document signed successfully.', 'success');
    } catch (e) {
      toast(e.message || 'Sign failed', 'error');
    }
  };

  const handleEdit = () => {
    openModal('edit-case', {
      ...apiMatter,
      ...currentCase,
      client: apiMatter?.client || currentCase?.client,
      parties_data: apiMatter?.parties_data,
      vehicles_data: apiMatter?.vehicles_data,
      intake_answers: apiMatter?.intake_answers,
      matterId: caseId,
      numericId: currentCase?.numericId ?? Number(caseId)
    });
  };

  const matterModalContext =
    isStaff && caseId ? { matterId: caseId, remoteFolders, existingDocCategories: apiMatter?.documents?.map(d => d.category) }
      : currentCase?.numericId ? { matterId: String(currentCase.numericId), remoteFolders, existingDocCategories: apiMatter?.documents?.map(d => d.category) }
        : {};
  const getProgressByStatus = (status) => (status === 'pending' ? 30 : status === 'active' ? 60 : 100);
  const [statusProgress, setStatusProgress] = useState(0);

  useEffect(() => {
    if (!currentCase?.status) return;
    setStatusProgress(getProgressByStatus(currentCase.status));
  }, [currentCase?.status]);

  useEffect(() => {
    if (!reviewDraft) return;

    const syncSignaturePadSize = () => {
      if (!signaturePadRef.current || !signaturePadContainerRef.current) return;
      const canvas = signaturePadRef.current.getCanvas();
      const displayWidth = signaturePadContainerRef.current.clientWidth;
      if (!canvas || !displayWidth) return;

      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = Math.floor(displayWidth * ratio);
      canvas.height = Math.floor(signaturePadHeight * ratio);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${signaturePadHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(ratio, ratio);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      signaturePadRef.current.clear();
      setHasDrawnSignature(false);
    };

    const timeoutId = window.setTimeout(syncSignaturePadSize, 0);
    window.addEventListener('resize', syncSignaturePadSize);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', syncSignaturePadSize);
    };
  }, [reviewDraft]);

  const formatUsd = (n) => {
    const x = Number(n) || 0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(x);
  };
  const formatDateDDMMYYYY = (v) => {
    if (!v) return '—';
    const dt = new Date(v);
    if (Number.isNaN(dt.getTime())) return '—';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const matterInvoices = hasApiMatter && apiMatter?.invoices
    ? apiMatter.invoices.map((inv) => {
      const totalAmt = Number(inv.amount);
      const paidAmt = inv.paid_amount ?? (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      const dueAmt = inv.due_amount ?? Math.max(0, totalAmt - paidAmt);
      return {
        dbId: inv.id,
        id: inv.invoice_number,
        issued: formatDateDDMMYYYY(inv.issued_at || inv.created_at),
        due: formatDateDDMMYYYY(inv.due_date),
        amount: formatUsd(totalAmt),
        paid: formatUsd(paidAmt),
        due_amount: formatUsd(dueAmt),
        outstanding: formatUsd(dueAmt),
        status: inv.status === 'draft' ? 'pending' : inv.status,
        desc: inv.description || currentCase?.title || 'Professional Legal Services',
      };
    })
    : [];

  const billingTotals = (() => {
    const invs = hasApiMatter && apiMatter?.invoices ? apiMatter.invoices : [];
    let total = 0;
    let paid = 0;
    let outstanding = 0;
    for (const inv of invs) {
      if (inv.status === 'void') continue;
      const totalAmt = Number(inv.amount);
      const paidAmt = inv.paid_amount ?? (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      const dueAmt = inv.due_amount ?? Math.max(0, totalAmt - paidAmt);
      total += totalAmt;
      paid += paidAmt;
      outstanding += dueAmt;
    }
    return { total, paid, outstanding };
  })();

  const payAllOutstanding = async () => {
    const payable = matterInvoices.filter((inv) => inv.status !== 'paid' && inv.status !== 'void' && inv.dbId != null);
    if (!payable.length) {
      toast('No payable invoices found.', 'info');
      return;
    }
    try {
      for (const inv of payable) {
        await api.billing.payInvoice(inv.dbId, {
          payment_method: 'manual',
          payment_reference: 'internal-manual',
        });
      }
      const res = await api.matters.get(caseId);
      setApiMatter(res.data);
      toast('Manual payments recorded.', 'success');
    } catch (e) {
      toast(e.message || 'Payment failed', 'error');
    }
  };

  const payInvoiceRow = async (invoice) => {
    if (!invoice?.dbId) {
      toast('This invoice is not linked to a database record.', 'info');
      return;
    }
    if (invoice.status === 'paid' || invoice.status === 'void') return;
    try {
      setPayingInvoiceDbId(invoice.dbId);
      await api.billing.payInvoice(invoice.dbId, {
        payment_method: 'manual',
        payment_reference: 'internal-manual',
      });
      const res = await api.matters.get(caseId);
      setApiMatter(res.data);
      toast('Payment marked as paid.', 'success');
    } catch (e) {
      toast(e.message || 'Payment failed', 'error');
    } finally {
      setPayingInvoiceDbId(null);
    }
  };

  const commRows = hasApiMatter && apiMatter
    ? (apiMatter.communications || []).map((c) => {
      const typeLabels = {
        portal_message: 'Portal Msg',
        note: 'Internal Note',
        email_log: 'Email',
        call_log: 'Call',
        meeting_log: 'Meeting',
      };
      const t = typeLabels[c.communication_type] || String(c.communication_type || '').replace(/_/g, ' ');
      const body = c.message_body || '';
      const subj = c.subject || body.split('\n')[0].slice(0, 80) || t;
      const { cleanText } = parseBodyAttachments(body);
      return {
        id: c.id,
        type: t,
        communication_type: c.communication_type,
        subject: subj,
        user: c.sender?.full_name || '—',
        fromEmail: c.sender?.email || '',
        text: cleanText.slice(0, 280),
        fullBody: body,
        matter_id: c.matter_id,
        to: c.to,
        cc: c.cc,
        bcc: c.bcc,
        repliesCount: c._count?.replies || 0,
        date: new Date(c.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
        icon: c.communication_type === 'email_log' 
          ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          : c.communication_type === 'call_log' 
            ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            : c.communication_type === 'meeting_log' 
              ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
        visibility: c.visibility,
      };
    })
    : null;

  const activityRows = hasApiMatter && apiMatter
    ? (apiMatter.activities || []).map((a) => ({
      title: (a.action || 'activity').replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
      text: a.description || '',
      date: new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
      type: a.entity_type || 'system',
    }))
    : null;

  const nextDeadlineLabel = (() => {
    if (!hasApiMatter || !apiMatter?.invoices?.length) return currentCase?.nextHearing || '—';
    const open = apiMatter.invoices.filter((i) => i.status !== 'paid');
    if (!open.length) return '—';
    open.sort((a, b) => {
      const ta = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const tb = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return ta - tb;
    });
    const d = open[0].due_date;
    return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  })();

  const recentActivityLabel = (() => {
    if (!hasApiMatter || !apiMatter?.activities?.length) return '—';
    return new Date(apiMatter.activities[0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  })();

  const overviewBenchmarks = (() => {
    if (!currentCase) return [];
    const invs = apiMatter?.invoices || [];
    const open = invs.filter((i) => i.status !== 'paid' && i.due_date);
    open.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    const nextInv = open[0];
    
    // Add upcoming court appearances
    const upcomingCourtEvents = matterEvents.filter(e => (e.is_court_event || e.court_related) && new Date(e.date) >= new Date());
    upcomingCourtEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    const benchmarks = [
      {
        title: 'Next invoice due',
        date: nextInv?.due_date ? new Date(nextInv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        status: nextInv && new Date(nextInv.due_date) < new Date() ? 'Overdue' : 'Scheduled',
      },
      ...upcomingCourtEvents.slice(0, 3).map(e => ({
        title: `${e.type.charAt(0).toUpperCase() + e.type.slice(1).replace('_', ' ')}: ${e.title}`,
        date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Upcoming'
      })),
      { title: 'Matter opened', date: currentCase.filed, status: 'Recorded' },
      { title: 'Last updated', date: currentCase.lastUpdated, status: 'Synced' },
    ];
    return benchmarks;
  })();

  if (hasApiMatter && matterLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="h-7 bg-white/10 rounded-xl w-64"></div>
            <div className="h-4 bg-white/5 rounded-lg w-80"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-white/10 rounded-xl"></div>
            <div className="h-10 w-32 bg-white/10 rounded-xl"></div>
          </div>
        </div>

        <div className="h-12 bg-white/5 border border-white/10 rounded-2xl w-full flex items-center px-4 gap-4">
          <div className="h-6 w-20 bg-white/10 rounded-lg"></div>
          <div className="h-6 w-20 bg-white/10 rounded-lg"></div>
          <div className="h-6 w-20 bg-white/10 rounded-lg"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="h-5 bg-white/10 rounded w-1/3"></div>
              <div className="h-12 bg-white/5 rounded-xl"></div>
              <div className="h-12 bg-white/5 rounded-xl"></div>
            </div>
            <div className="h-48 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
              <div className="h-5 bg-white/10 rounded w-1/4"></div>
              <div className="h-20 bg-white/5 rounded-xl"></div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
              <div className="h-5 bg-white/10 rounded w-1/2"></div>
              <div className="h-10 bg-white/5 rounded-xl"></div>
              <div className="h-10 bg-white/5 rounded-xl"></div>
            </div>
            <div className="h-48 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
              <div className="h-5 bg-white/10 rounded w-1/3"></div>
              <div className="h-20 bg-white/5 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasApiMatter && matterError) {
    return (
      <div className="animate-fade-in space-y-4">
        <button type="button" onClick={() => navigate(isClient ? '/client/matters' : role === 'lawyer' ? '/lawyer/matters' : '/admin/matters')} className="btn btn-secondary btn-xs">Back to Matters</button>
        <Card className="border-red-200 bg-red-50/50">
          <p className="text-[13px] text-red-800 font-600">{matterError}</p>
        </Card>
      </div>
    );
  }

  if (!currentCase) {
    return null;
  }

  const getStatusByProgress = (progress) => {
    if (progress >= 100) return 'closed';
    if (progress >= 50) return 'active';
    return 'pending';
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between pb-2 gap-3 flex-wrap">
        <button onClick={() => navigate(isClient ? '/client/matters' : role === 'lawyer' ? '/lawyer/matters' : '/admin/matters')} 
          className="btn btn-secondary h-9 px-3 flex items-center gap-2 group transition-all">
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6" /></svg>
          <span className="text-[12px] font-700 uppercase tracking-widest">Back to Matters</span>
        </button>
        {!isClient && (
          <div className="flex gap-2.5 flex-wrap w-full sm:w-auto">
            <button onClick={() => openModal('add-document', { ...matterModalContext, ...(documentsFolderFilter && { docCategory: documentsFolderFilter }) })} className="btn btn-secondary h-9 px-4 text-[12px] font-700 uppercase tracking-wider">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Upload File
            </button>
            <button onClick={() => openModal('add-note', matterModalContext)} className="btn btn-primary h-9 px-4 text-[12px] font-700 uppercase tracking-wider">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
              New Note
            </button>
          </div>
        )}
      </div>

      {/* Matter Header */}
      <header className="relative bg-white/[0.03] p-8 rounded-[1.5rem] border border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0057c7]" />
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0057c7]/5 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
        
        <div className={`relative z-10 flex justify-between items-start gap-8 flex-wrap ${isClient ? 'items-center' : ''}`}>
          <div className="flex-1 min-w-[300px]">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="font-mono text-[12px] bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 px-3 py-1 rounded-xl font-800 uppercase tracking-widest shadow-sm">{currentCase.id}</span>
              <Badge status={currentCase.status} />
              <Badge status={currentCase.priority} />
              {activeTimer && activeTimer.matter_id === Number(caseId) && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-red-500/10 border border-red-500/20 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <span className="text-[10px] font-900 text-red-500 uppercase tracking-[0.15em]">Live Session</span>
                </div>
              )}
            </div>
            <h1 className="text-4xl font-800 text-white font-display mb-4 tracking-tight leading-tight">{currentCase.title}</h1>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-[13px] font-600 text-[#8a94a6]">
              <span className="flex items-center gap-2">
                <span className="text-[#0057c7]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </span>
                <span className="text-white">{currentCase.client}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[#0057c7]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                </span>
                <span className="text-white">{currentCase.type}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[#0057c7]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                </span>
                <span className="text-white">{currentCase.lawyer}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[#0057c7]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
                </span>
                <span className="text-white">Opened {currentCase.filed}</span>
              </span>
            </div>
          </div>
          {!isClient && (
            <div className="flex flex-col items-start sm:items-end gap-4 text-left sm:text-right w-full sm:w-auto bg-white/[0.02] p-5 rounded-2xl border border-white/5 shadow-inner">
              <div className="w-full sm:w-auto">
                <p className="text-[10px] text-[#8a94a6] font-800 uppercase tracking-[0.2em] mb-2">
                  {activeTimer && activeTimer.matter_id !== Number(caseId) ? 'System Occupied' : 'Session Duration'}
                </p>
                <div className="flex items-center gap-4">
                  <p className="text-3xl font-mono font-900 text-[#38bdf8] tabular-nums tracking-tight">
                    {activeTimer && activeTimer.matter_id === Number(caseId) ? formatTimer(timerSeconds) : '00:00:00'}
                  </p>
                  {activeTimer && activeTimer.matter_id === Number(caseId) ? (
                    <button onClick={stopTimer} className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all shadow-lg shadow-red-500/10" title="End Session">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                    </button>
                  ) : (
                    <button
                      onClick={startTimer}
                      disabled={activeTimer && activeTimer.matter_id !== Number(caseId)}
                      className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all shadow-lg ${activeTimer && activeTimer.matter_id !== Number(caseId) ? 'bg-white/5 border-white/5 text-[#8a94a6] cursor-not-allowed opacity-50' : 'bg-[#0057c7]/10 border-[#0057c7]/20 text-[#38bdf8] hover:bg-[#0057c7] hover:text-white hover:border-transparent shadow-[#0057c7]/10'}`}
                      title={activeTimer && activeTimer.matter_id !== Number(caseId) ? 'Active timer on another matter' : 'Start Session'}
                    >
                      <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </button>
                  )}
                </div>
              </div>
              <button onClick={handleEdit} className="btn btn-secondary h-8 px-4 font-800 text-[10px] uppercase tracking-widest border-white/5 w-full sm:w-auto">Edit Matter Details</button>
            </div>
          )}
        </div>
      </header>

      {/* Summary Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Billed', value: formatUsd(billingTotals.total), icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, color: 'text-indigo-400 bg-indigo-500/10' },
          { label: 'Outstanding', value: formatUsd(billingTotals.outstanding), icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: 'text-[#38bdf8] bg-[#0057c7]/10' },
          { label: 'Documents Vault', value: docs.length, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, color: 'text-blue-400 bg-blue-500/10' },
          { label: 'Next Deadline', value: nextDeadlineLabel, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: 'text-red-400 bg-red-500/10' },
          { label: 'Recent Pulse', value: recentActivityLabel, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, color: 'text-emerald-400 bg-emerald-500/10' },
        ].map((stat, i) => (
          (isClient && stat.label === 'Total Billed') ? null : (
            <div key={i} className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 shadow-xl flex items-center gap-4 hover:bg-white/[0.05] transition-all group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner transition-transform group-hover:scale-110 ${stat.color}`}>{stat.icon}</div>
              <div>
                <p className="text-[20px] font-900 text-white leading-none tabular-nums">{stat.value}</p>
                <p className="text-[10px] text-[#8a94a6] mt-2 font-800 uppercase tracking-[0.15em]">{stat.label}</p>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Workspace Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Main Workspace (75%) */}
        <div className="lg:col-span-3 min-w-0 space-y-4">
          <Tabs
            tabs={isClient ? ['Overview', 'Timeline', 'Relationships', 'Damages & Settlement', 'Documents', 'Templates / Drafts', 'Communication', 'Schedule', 'Billing'] : ['Overview', 'Timeline', 'Relationships', 'Damages & Settlement', 'Documents', 'Templates / Drafts', 'Forms', 'Communication', 'Tasks', 'Schedule', 'Billing', 'Activity', 'Notes']}
            active={tab}
            onChange={(newTab) => {
              setTab(newTab);
              const params = new URLSearchParams(window.location.search);
              params.set('tab', newTab);
              navigate(`${window.location.pathname}?${params.toString()}`, { replace: true });
            }}
          />

          {tab === 'Timeline' && (
            <MatterTimelineTab caseId={caseId} apiMatter={apiMatter} toast={toast} />
          )}

          {tab === 'Relationships' && (
            <MatterRelationshipsTab caseId={caseId} apiMatter={apiMatter} toast={toast} />
          )}

          {(tab === 'Damages & Settlement' || tab === 'Settlement') && (
            <MatterSettlementTab caseId={caseId} apiMatter={apiMatter} toast={toast} />
          )}

          {tab === 'Tasks' && (
            <MatterTasksTab caseId={caseId} apiMatter={apiMatter} toast={toast} />
          )}

          {(tab === 'Communication' || tab === 'Communications') && (
            <MatterCommunicationsTab caseId={caseId} apiMatter={apiMatter} toast={toast} />
          )}

          {isClient && (
            <div className="animate-fade-in mb-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#0057c7]/20 to-[#38bdf8]/10 rounded-[2rem] blur-2xl" />
              <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-2xl">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="px-4 py-1.5 rounded-full bg-[#0057c7] text-white text-[11px] font-900 uppercase tracking-[0.2em] shadow-lg shadow-[#0057c7]/30">
                      System Status
                    </div>
                    <div className="h-px w-12 bg-white/10" />
                    <span className="text-[12px] font-800 text-[#38bdf8] uppercase tracking-widest animate-pulse">Live Tracking Active</span>
                  </div>
                  
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-3xl border border-white/10 shadow-inner">
                      {currentCase.status === 'active' ? '⚡' : currentCase.status === 'pending' ? '⏳' : '✅'}
                    </div>
                    <div>
                      <h3 className="text-2xl font-900 text-white font-display tracking-tight mb-2">
                        Case Status: <span className="text-[#38bdf8] uppercase">{currentCase.status}</span>
                      </h3>
                      <p className="text-[14px] text-[#8a94a6] font-600 leading-relaxed max-w-xl">
                        {currentCase.status === 'active' ? "Your legal matter is in active progression. Our specialized counsel is executing the current phase of operations." :
                          currentCase.status === 'pending' ? "The registry is currently awaiting critical updates or synchronized documentation from your end." :
                            "Mission complete. Your legal matter has been successfully finalized and archived in the secure registry."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center md:items-end gap-4">
                  <p className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em]">Legal Task Force</p>
                  <div className="flex -space-x-3">
                    <Avatar initials="AP" size="md" color="#0057c7" className="ring-4 ring-[#1a2233]" />
                    <Avatar initials="JD" size="md" color="#1e293b" className="ring-4 ring-[#1a2233]" />
                    <Avatar initials="SM" size="md" color="#334155" className="ring-4 ring-[#1a2233]" />
                    <div className="w-10 h-10 rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center text-[11px] font-900 text-white ring-4 ring-[#1a2233] border border-white/10">+2</div>
                  </div>
                  <button onClick={() => setTab('Communication')} className="mt-2 text-[11px] font-900 text-white bg-white/5 hover:bg-[#0057c7] px-6 py-2.5 rounded-xl border border-white/10 transition-all uppercase tracking-widest shadow-lg">
                    Message Counsel
                  </button>
                </div>
              </div>
            </div>
          )}



          {tab === 'Overview' && (
            <div className="animate-fade-in space-y-6">
              {/* Adaptive Practice-Area Stage Timeline Bar */}
              <StageTimelineBar
                practiceArea={apiMatter?.practice_area || currentCase?.practice_area}
                currentStage={apiMatter?.status || currentCase?.status || apiMatter?.intake_answers?.current_stage}
                onStageClick={handleStageTimelineClick}
              />

              {/* Attorney-Controlled "What Happens Next" Client Portal Guidance Card */}
              {!isClient && (
                <Card className="border border-[#38bdf8]/30 bg-[#38bdf8]/5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-xs font-900 text-white uppercase tracking-wider flex items-center gap-2">
                        <span>💡 Client Portal View: "What Happens Next" Note</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">Plain-language status note displayed directly to the client on their portal case tracking bar</p>
                    </div>
                    <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 uppercase">CLIENT VISIBLE</span>
                  </div>
                  
                  <Textarea
                    rows={2}
                    value={portalNote}
                    onChange={e => setPortalNote(e.target.value)}
                    placeholder="E.g., We have filed your initial court pleadings. Next, opposing counsel has 30 days to file their answer..."
                  />
                  <div className="flex justify-end">
                    <button onClick={savePortalNote} disabled={savingPortalNote} className="btn btn-primary btn-xs">
                      {savingPortalNote ? 'Saving Note...' : 'Save & Publish to Client Portal'}
                    </button>
                  </div>
                </Card>
              )}

              {/* Statute of Limitations (SOL) & Answer Deadlines Card */}
              {(() => {
                const solDateStr = (() => {
                  if (apiMatter?.sol_date) return String(apiMatter.sol_date).split('T')[0];
                  if (apiMatter?.statute_of_limitations) return String(apiMatter.statute_of_limitations).split('T')[0];
                  if (apiMatter?.intake_answers?.sol_date) return String(apiMatter.intake_answers.sol_date).split('T')[0];
                  if (apiMatter?.date_of_loss) {
                    const dol = new Date(apiMatter.date_of_loss);
                    if (!isNaN(dol.getTime())) {
                      dol.setFullYear(dol.getFullYear() + 2);
                      return dol.toISOString().split('T')[0];
                    }
                  }
                  return null;
                })();

                const answerDateStr = (() => {
                  if (apiMatter?.answer_deadline) return String(apiMatter.answer_deadline).split('T')[0];
                  if (apiMatter?.intake_answers?.answer_deadline) return String(apiMatter.intake_answers.answer_deadline).split('T')[0];
                  if (apiMatter?.initial_filing_date) {
                    const filing = new Date(apiMatter.initial_filing_date);
                    if (!isNaN(filing.getTime())) {
                      filing.setDate(filing.getDate() + 30);
                      return filing.toISOString().split('T')[0];
                    }
                  }
                  if (apiMatter?.next_hearing) return String(apiMatter.next_hearing).split('T')[0];
                  return null;
                })();

                const todayStr = new Date().toISOString().split('T')[0];

                const renderSolBadge = () => {
                  if (!solDateStr) return <span className="text-[10px] font-900 bg-white/10 text-slate-400 border border-white/20 px-3 py-1 rounded-full uppercase">⚪ NOT SET</span>;
                  if (solDateStr < todayStr) return <span className="text-[10px] font-900 bg-red-500/20 border border-red-500/30 text-red-300 px-3 py-1 rounded-full uppercase animate-pulse">🔴 EXPIRED / OVERDUE</span>;
                  const diffDays = Math.ceil((new Date(solDateStr) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
                  if (diffDays <= 30) return <span className="text-[10px] font-900 bg-rose-500/20 border border-rose-500/30 text-rose-300 px-3 py-1 rounded-full uppercase">🔴 CRITICAL ({diffDays} DAYS)</span>;
                  if (diffDays <= 90) return <span className="text-[10px] font-900 bg-amber-500/20 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full uppercase">🟡 UPCOMING ({diffDays} DAYS)</span>;
                  return <span className="text-[10px] font-900 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full uppercase">🟢 RECORDED</span>;
                };

                const renderAnswerBadge = () => {
                  if (!answerDateStr) return <span className="text-[10px] font-900 bg-white/10 text-slate-400 border border-white/20 px-3 py-1 rounded-full uppercase">⚪ PENDING</span>;
                  if (answerDateStr < todayStr) return <span className="text-[10px] font-900 bg-red-500/20 border border-red-500/30 text-red-300 px-3 py-1 rounded-full uppercase animate-pulse">🔴 OVERDUE</span>;
                  const diffDays = Math.ceil((new Date(answerDateStr) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
                  if (diffDays <= 7) return <span className="text-[10px] font-900 bg-amber-500/20 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full uppercase">🟡 DUE THIS WEEK</span>;
                  return <span className="text-[10px] font-900 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full uppercase">🟢 DOCKETED</span>;
                };

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-900 text-white uppercase tracking-wider flex items-center gap-2">
                          <span>⏰</span> Statute of Limitations (SOL)
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">FIRST-CLASS DEADLINE</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <span className="text-sm font-extrabold text-rose-400 font-mono">
                          {solDateStr || 'Not Set'}
                        </span>
                        {renderSolBadge()}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-900 text-white uppercase tracking-wider flex items-center gap-2">
                          <span>📜</span> Answer / Pleading Deadline
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">COURT DEADLINE</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <span className="text-sm font-extrabold text-amber-300 font-mono">
                          {answerDateStr || 'Pending Docketing'}
                        </span>
                        {renderAnswerBadge()}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Primary Retaining Client Spotlight Card */}
              <Card className="relative overflow-hidden border border-[#0057c7]/30 bg-[#0057c7]/5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚖️</span>
                    <div>
                      <h3 className="text-sm font-900 text-white uppercase tracking-wider">Primary Retaining Client</h3>
                      <p className="text-[11px] text-[#8a94a6]">The principal entity retaining the firm for this matter</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-900 bg-[#0057c7] text-white px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-[#0057c7]/30">
                    RETAINING CLIENT
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                  <div>
                    <span className="text-[10px] font-800 text-[#8a94a6] uppercase tracking-wider block">Client Identity</span>
                    <p className="text-sm font-800 text-white mt-0.5">{primaryRetainingClient.full_name || primaryRetainingClient.name || 'Not Specified'}</p>
                    <p className="text-xs text-[#38bdf8] mt-0.5">{primaryRetainingClient.party_type || 'Individual'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-800 text-[#8a94a6] uppercase tracking-wider block">Contact Information</span>
                    <p className="text-xs text-white mt-0.5 flex items-center gap-1.5">✉️ {primaryRetainingClient.email || '—'}</p>
                    <p className="text-xs text-white mt-0.5 flex items-center gap-1.5">📞 {primaryRetainingClient.phone || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-800 text-[#8a94a6] uppercase tracking-wider block">Address & Legal ID</span>
                    <p className="text-xs text-white mt-0.5">{primaryRetainingClient.home_address || primaryRetainingClient.address || '—'}</p>
                    {primaryRetainingClient.government_id && <p className="text-[11px] text-amber-400 mt-0.5">ID: {maskGovId(primaryRetainingClient.government_id)}</p>}
                  </div>
                </div>
              </Card>

              {/* Categorized Matter Parties Matrix */}
              <Card>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-900 text-white uppercase tracking-wider flex items-center gap-2">
                      <span>👥 Matter Associated Parties ({parsedParties.length})</span>
                    </h3>
                    <p className="text-[11px] text-[#8a94a6]">All registered non-client witnesses, defendants, passengers, adjusters, and family members</p>
                  </div>
                  {!isClient && (
                    <button
                      type="button"
                      onClick={() => setIsAddPartyModalOpen(true)}
                      className="btn btn-primary btn-xs flex items-center gap-1"
                    >
                      <span>+ Manage / Add Parties</span>
                    </button>
                  )}
                </div>

                {parsedParties.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                    <p className="text-xs text-[#8a94a6] italic">No additional parties attached to this matter yet. Click "+ Manage / Add Parties" to add parties.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parsedParties.map((p, i) => (
                      <div key={p.id || i} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#38bdf8]/30 transition-all space-y-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-800 text-white">{p.full_name}</span>
                            {p.is_retaining_client && (
                              <span className="text-[9px] font-900 bg-[#0057c7] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Retaining Client
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-900 bg-[#0057c7]/20 border border-[#0057c7]/30 text-[#38bdf8] px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {p.party_role || 'Party'}
                          </span>
                        </div>
                        {p.email && <p className="text-[11px] text-[#8a94a6]">✉️ {p.email}</p>}
                        {p.phone && <p className="text-[11px] text-[#8a94a6]">📞 {p.phone}</p>}
                        {p.government_id && <p className="text-[10px] text-amber-400">Govt ID: {maskGovId(p.government_id)}</p>}
                        {p.country_of_birth && <p className="text-[10px] text-[#38bdf8]">Country of Origin: {p.country_of_birth}</p>}
                        {p.relief_sought && <p className="text-[10px] text-amber-400">Relief: {p.relief_sought}</p>}
                        {p.insurance_number && <p className="text-[10px] text-emerald-400">Policy / Claim #: {p.insurance_number}</p>}
                        {p.notes && <p className="text-[10px] text-slate-400 italic">"{p.notes}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Vehicles & Property Assets Hub */}
              <Card>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-900 text-white uppercase tracking-wider flex items-center gap-2">
                      <span>🚘 Vehicles & Incident Assets ({parsedVehicles.length})</span>
                    </h3>
                    <p className="text-[11px] text-[#8a94a6]">Structured vehicle records for Personal Injury & Property Damage claims</p>
                  </div>
                  {!isClient && (
                    <button
                      type="button"
                      onClick={() => setIsAddVariableModalOpen(true)}
                      className="btn btn-primary btn-xs flex items-center gap-1"
                    >
                      <span>+ Manage / Add Vehicle</span>
                    </button>
                  )}
                </div>

                {parsedVehicles.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                    <p className="text-xs text-[#8a94a6] italic">No vehicles attached to this matter. Click "Edit Matter Details" to add vehicles.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parsedVehicles.map((v, i) => (
                      <div key={v.id || i} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#38bdf8]/30 transition-all space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-800 text-white">{v.year || ''} {v.make} {v.model}</span>
                          {v.color && <span className="text-[9px] font-bold bg-white/10 text-white/80 px-2 py-0.5 rounded-full">{v.color}</span>}
                        </div>
                        {v.license_plate && <p className="text-[11px] font-mono text-[#38bdf8]">Plate #: {v.license_plate}</p>}
                        {v.vin && <p className="text-[10px] font-mono text-[#8a94a6]">VIN: {v.vin}</p>}
                        {v.notes && <p className="text-[10px] text-slate-400 italic">Damage Notes: "{v.notes}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[16px] font-800 text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                    Matter Executive Summary
                  </h3>
                </div>

                {(() => {
                  if (!apiMatter?.sol_date) return null;
                  const expiryDate = new Date(apiMatter.sol_date);
                  const diffTime = expiryDate - new Date();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const formattedTerm = apiMatter.sol_term === '1_year' ? '1 Year' : apiMatter.sol_term === '2_years' ? '2 Years' : 'Custom';
                  
                  let alertClass = "bg-[#0057c7]/10 border-[#0057c7]/20 text-[#38bdf8]";
                  let badgeClass = "bg-[#0057c7]/20 text-[#38bdf8] border-[#0057c7]/30";
                  let statusText = `${diffDays} days remaining`;

                  if (diffDays < 0) {
                    alertClass = "bg-red-500/10 border-red-500/20 text-red-400";
                    badgeClass = "bg-red-500/20 text-red-400 border-red-500/30";
                    statusText = `Expired ${Math.abs(diffDays)} days ago`;
                  } else if (diffDays <= 60) {
                    alertClass = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                    badgeClass = "bg-amber-500/20 text-amber-400 border-amber-500/30";
                    statusText = `Imminent: ${diffDays} days left`;
                  }

                  return (
                    <div className={`p-4 rounded-2xl border ${alertClass} mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl">⚠️</span>
                        <div>
                          <h4 className="text-[13px] font-bold uppercase tracking-wider">Statute of Limitations</h4>
                          <p className="text-xs opacity-80 mt-0.5">
                            Term: <strong className="text-white">{formattedTerm}</strong> | Expires on: <strong className="text-white font-mono">{formatDateDDMMYYYY ? formatDateDDMMYYYY(apiMatter.sol_date) : new Date(apiMatter.sol_date).toLocaleDateString()}</strong>
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-900 px-3 py-1 rounded-xl uppercase tracking-widest border self-start sm:self-center ${badgeClass}`}>
                        {statusText}
                      </span>
                    </div>
                  );
                })()}
                <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 mb-8">
                  <p className="text-[14px] leading-relaxed text-[#b8c2d1] italic">
                    "{currentCase.description || 'No formal description recorded for this matter.'}"
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] flex items-center gap-2">
                      <span className="w-4 h-[1px] bg-[#8a94a6]/30" />
                      {apiMatter?.tracking_type === 'claim' ? 'Claim Infrastructure' : 'Legal Infrastructure'}
                    </h4>
                    <div className="space-y-4">
                      {[
                        ['Priority', apiMatter?.priority ? apiMatter.priority.charAt(0).toUpperCase() + apiMatter.priority.slice(1) : 'Medium', <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>],
                        ['Opened At', currentCase.filed, <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>],
                        ['Opposing Party', currentCase.opposingParty || 'N/A', <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>],
                        ['Lead Counsel', currentCase.lawyer, <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>],
                        apiMatter?.case_number ? [apiMatter.tracking_type === 'claim' ? 'Insurance Claim #' : 'Case Number', apiMatter.case_number, <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>] : null,
                        apiMatter?.court_name ? [apiMatter.tracking_type === 'claim' ? 'Insurance Company' : 'Court Name', apiMatter.court_name, <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>] : null,
                        apiMatter?.judge_name ? [apiMatter.tracking_type === 'claim' ? 'Adjuster / Agent Name' : 'Judge Name', apiMatter.judge_name, <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>] : null,
                        apiMatter?.court_address ? [apiMatter.tracking_type === 'claim' ? 'Insurance Company Address' : 'Court Address', apiMatter.court_address, <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>] : null,
                        apiMatter?.court_county && apiMatter?.court_type !== 'federal' ? ['Court County', apiMatter.court_county, <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>] : null,
                        apiMatter?.federal_court && apiMatter?.court_type === 'federal' ? ['Federal Court', apiMatter.federal_court, <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>] : null,
                        apiMatter?.court_department ? ['Department Number', apiMatter.court_department, <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>] : null,
                        apiMatter?.initial_filing_date ? [apiMatter.tracking_type === 'claim' ? 'Claim Opening Date' : 'Initial Filing Date', formatDateDDMMYYYY(apiMatter.initial_filing_date), <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>] : null,
                        apiMatter?.date_of_loss ? ['Date of Loss', formatDateDDMMYYYY(apiMatter.date_of_loss), <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>] : null,
                        apiMatter?.trial_date ? [apiMatter.tracking_type === 'claim' ? 'Expected Resolution Date' : 'Trial Date', formatDateDDMMYYYY(apiMatter.trial_date), <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>] : null,
                        apiMatter?.hearing_time ? ['Hearing / Trial Time', apiMatter.hearing_time, <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>] : null,
                        apiMatter?.case_value !== undefined && apiMatter?.case_value !== null ? ['Case Value', new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(apiMatter.case_value), <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>] : null,
                      ].filter(Boolean).map(([k, v, icon]) => (
                        <div key={k} className="flex justify-between items-center text-[13px] group border-b border-white/[0.03] pb-3 last:border-0">
                          <span className="text-[#8a94a6] flex items-center gap-2">
                            <span className="opacity-50 grayscale group-hover:grayscale-0 transition-all">{icon}</span>
                            {k}
                          </span>
                          <span className="font-700 text-white">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] flex items-center gap-2">
                      <span className="w-4 h-[1px] bg-[#8a94a6]/30" />
                      Critical Benchmarks
                    </h4>
                    <div className="space-y-3">
                      {overviewBenchmarks.map(b => (
                        <div key={b.title} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group">
                          <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${b.status === 'Overdue' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-[#0057c7]'}`} />
                            <div>
                              <p className="text-[13px] font-700 text-white group-hover:text-[#38bdf8] transition-colors">{b.title}</p>
                              <p className="text-[11px] text-[#8a94a6] mt-0.5">{b.date}</p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-900 px-2.5 py-1 rounded-lg uppercase tracking-widest border ${b.status === 'Imminent' || b.status === 'Overdue' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-[#0057c7]/10 text-[#38bdf8] border-[#0057c7]/20'}`}>{b.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Billing & Financial Snapshot Card */}
                {(() => {
                  const timeEntries = Array.isArray(apiMatter?.time_entries) ? apiMatter.time_entries : [];
                  const unbilledEntries = timeEntries.filter(te => !te.is_billed && !te.invoice_id);

                  const totalUnbilledMinutes = unbilledEntries.reduce((sum, te) => {
                    if (te.duration_minutes != null) return sum + Number(te.duration_minutes || 0);
                    if (te.hours != null) return sum + (Number(te.hours || 0) * 60);
                    if (te.start_time && te.end_time) {
                      const diffMs = new Date(te.end_time) - new Date(te.start_time);
                      return sum + (diffMs > 0 ? Math.floor(diffMs / 60000) : 0);
                    }
                    return sum;
                  }, 0);

                  const totalUnbilledHours = totalUnbilledMinutes / 60;

                  const totalUnbilledAmount = unbilledEntries.reduce((sum, te) => {
                    if (te.billable_amount != null) return sum + Number(te.billable_amount || 0);
                    if (te.amount != null) return sum + Number(te.amount || 0);
                    const hrs = (te.duration_minutes != null ? Number(te.duration_minutes) / 60 : Number(te.hours || 0));
                    const rate = Number(te.hourly_rate || te.rate || apiMatter?.billing_rate || 350);
                    return sum + (hrs * rate);
                  }, 0);

                  const expenses = Array.isArray(apiMatter?.expenses) ? apiMatter.expenses : (Array.isArray(apiMatter?.costs) ? apiMatter.costs : []);
                  const totalCosts = expenses.reduce((sum, e) => sum + Number(e.amount || e.cost || 0), 0);

                  const feeType = apiMatter?.fee_type || apiMatter?.fee_structure || apiMatter?.intake_answers?.fee_type || apiMatter?.intake_answers?.fee_structure || 'Contingency Fee';
                  const refSource = apiMatter?.referral_source || apiMatter?.lead_source || apiMatter?.intake_answers?.referral_source || 'Direct Intake';

                  const isCrpcConsented = Boolean(
                    apiMatter?.crpc_151_consented || 
                    apiMatter?.intake_answers?.crpc_151_consent_obtained || 
                    apiMatter?.crpc_consent
                  );

                  const isAgreementOnFile = Boolean(
                    apiMatter?.referral_agreement_on_file || 
                    apiMatter?.intake_answers?.referral_agreement_on_file
                  );

                  return (
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center font-bold">💳</span>
                          <h4 className="text-xs font-900 text-white uppercase tracking-wider">Billing &amp; Financial Snapshot</h4>
                        </div>
                        <span className="text-[10px] font-900 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full uppercase">
                          {feeType}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          <span className="text-slate-400 text-[11px] block font-medium">Fee Structure</span>
                          <span className="text-emerald-400 font-extrabold text-xs block mt-0.5">
                            {feeType}
                          </span>
                        </div>
                        <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          <span className="text-slate-400 text-[11px] block font-medium">Unbilled Time</span>
                          <span className="text-[#38bdf8] font-extrabold text-xs block mt-0.5 font-mono">
                            {totalUnbilledHours > 0 
                              ? `${totalUnbilledHours.toFixed(1)} hrs ($${totalUnbilledAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` 
                              : '0.0 hrs ($0.00)'}
                          </span>
                        </div>
                        <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          <span className="text-slate-400 text-[11px] block font-medium">Costs Advanced</span>
                          <span className="text-amber-300 font-extrabold text-xs block mt-0.5 font-mono">
                            ${totalCosts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-1">
                          <span className="text-slate-400 text-[11px] block font-medium">Referral Channel &amp; CRPC 1.5.1</span>
                          <span className="text-indigo-300 font-bold text-xs block font-mono">
                            {refSource}
                          </span>
                          <div className="flex items-center gap-1.5 pt-0.5 text-[10px] flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded font-bold ${isCrpcConsented ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                              {isCrpcConsented ? 'CRPC 1.5.1 Consented' : 'CRPC 1.5.1 Pending'}
                            </span>
                            {isAgreementOnFile && (
                              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-bold">
                                Agreement On File
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Card>

              {/* Private Strategy Log - Hidden from parties */}
              {!isClient ? (
                <Card className="bg-[#0057c7]/10 border-[#0057c7]/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                    <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                  </div>
                  <h3 className="text-[12px] font-900 uppercase tracking-[0.2em] text-[#38bdf8] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    High-Level Internal Strategy
                  </h3>
                  <p className="text-[15px] leading-relaxed text-white font-500 italic opacity-95">
                    {isAdmin && apiMatter
                      ? (apiMatter.description
                        ? `"${apiMatter.description}"`
                        : 'No classified strategy brief recorded for this matter.')
                      : '"Phase 2 discovery initiated. Focus remains on insurance indemnification clauses and expert witness preparation. Next mediation scheduled for month-end."'}
                  </p>
                </Card>
              ) : (
                <Card className="bg-[#0057c7]/10 border-[#0057c7]/20">
                  <h3 className="text-[12px] font-900 uppercase tracking-[0.2em] text-[#38bdf8] mb-4">Case Progression Brief</h3>
                  <p className="text-[15px] leading-relaxed text-white font-500">
                    We are currently in the mid-litigation phase. Our team has finalized the initial filings and is now performing a deep-dive into the evidence provided. You will receive an update as soon as the court confirms the next session date.
                    <br /><br />
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-800 uppercase tracking-widest mt-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Next Action: witness affidavit review
                    </span>
                  </p>
                </Card>
              )}

              {!isClient && (
                <div className="mt-4">
                  <h3 className="text-[15px] font-800 text-white flex items-center gap-2 mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                    Time Tracking History
                  </h3>
                  {timerHistory.length === 0 ? (
                    <div className="bg-white/[0.02] rounded-2xl p-8 text-center border border-dashed border-white/10">
                      <p className="text-[12px] text-[#8a94a6] italic">No active or historical time entries recorded for this matter.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {timerHistory.map((t) => (
                        <div key={t.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.05] transition-all shadow-xl relative overflow-hidden group">
                          {t.is_running && <div className="absolute top-0 left-0 w-1.5 h-full bg-[#38bdf8] shadow-[0_0_10px_rgba(56,189,248,0.5)]" />}
                          <div className="flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner ${t.is_running ? 'bg-[#38bdf8]/10 text-[#38bdf8]' : 'bg-white/[0.03] text-[#8a94a6]'}`}>
                              {t.is_running ? <svg className="w-5 h-5 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-800 text-white truncate tracking-tight">{t.user?.full_name || 'Legal Staff'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] text-[#8a94a6] font-600 uppercase tracking-widest">{formatPSTTime(t.start_time)}</span>
                                <span className="text-white/20">→</span>
                                <span className="text-[11px] text-[#8a94a6] font-600 uppercase tracking-widest">{t.end_time ? formatPSTTime(t.end_time) : 'Live'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-[15px] font-900 tabular-nums ${t.is_running ? 'text-[#38bdf8] animate-pulse' : 'text-white'}`}>
                              {t.duration_minutes ? (t.duration_minutes < 60 ? `${t.duration_minutes}m` : `${Math.floor(t.duration_minutes / 60)}h ${t.duration_minutes % 60}m`) : 'Active'}
                            </p>
                            <p className="text-[9px] text-[#8a94a6] font-900 uppercase tracking-[0.2em] mt-1">
                              {new Date(t.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'Documents' && (
            <div className="animate-fade-in space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[...new Set(['Complaint', 'Evidence', 'Contract', 'Court order', ...remoteFolders.map(f => f.name)])].map((folder) => (
                  <div
                    key={folder}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDocumentsFolderFilter((prev) => (prev === folder ? null : folder));
                        setMatterSubfolderPath([]);
                      }
                    }}
                    onClick={() => {
                      setDocumentsFolderFilter((prev) => (prev === folder ? null : folder));
                      setMatterSubfolderPath([]);
                    }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-lg ${documentsFolderFilter === folder
                        ? 'border-[#38bdf8] bg-[#0057c7]/10 ring-4 ring-[#0057c7]/20 shadow-[0_8px_30px_rgba(0,87,199,0.2)]'
                        : 'border-white/5 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-4xl group-hover:scale-110 transition-transform text-[#38bdf8]">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white font-900 text-[13px] border border-white/10">
                         {docs.filter((d) => documentFolderBucket(d.category) === folder || (d.folder_path && (d.folder_path === folder || d.folder_path.startsWith(folder + '/')))).length}
                      </div>
                    </div>
                    <p className={`text-[14px] font-800 leading-tight ${documentsFolderFilter === folder ? 'text-[#38bdf8]' : 'text-white'}`}>{folder}</p>
                    <p className="text-[10px] text-[#8a94a6] mt-2 font-900 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Legal Repository</p>
                  </div>
                ))}
              </div>
              <Card>
                <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                  <div>
                    <h3 className="text-[16px] font-800 text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                      Discovery Documents
                    </h3>
                    {documentsFolderFilter && (
                      <p className="text-[11px] text-[#38bdf8] mt-1 font-800 uppercase tracking-widest">Active Filter: {documentsFolderFilter} · click folder to reset</p>
                    )}
                  </div>
                  <div className="flex gap-3 flex-wrap items-center">
                    {isClient && <button onClick={() => openModal('add-document', { ...matterModalContext, ...(documentsFolderFilter && { docCategory: documentsFolderFilter }) })} className="btn btn-primary h-8 px-4 text-[11px] font-800 uppercase tracking-wider">Upload Object</button>}
                    <select className="text-[13px] bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-[#38bdf8] text-white transition-all" value={docCategoryFilter} onChange={e => setDocCategoryFilter(e.target.value)}>
                      <option value="">All Categories</option>
                      {[...new Set(docs.map(d => d.category))].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="relative">
                      <input className="text-[13px] bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2 w-full sm:w-64 outline-none focus:border-[#38bdf8] text-white transition-all" placeholder="Search objects..." value={docSearchTerm} onChange={e => setDocSearchTerm(e.target.value)} />
                      <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a94a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    </div>
                  </div>
                </div>

                {/* Breadcrumbs for Matter subfolders */}
                {documentsFolderFilter && (
                  <div className="flex items-center gap-2 text-[11px] font-800 text-[#8a94a6] bg-white/[0.02] border border-white/5 px-4 py-2.5 rounded-xl uppercase tracking-wider mb-6">
                    <span 
                      className="hover:text-white cursor-pointer transition-colors"
                      onClick={() => {
                        setMatterSubfolderPath([]);
                      }}
                    >
                      📁 {documentsFolderFilter}
                    </span>
                    {matterSubfolderPath.map((segment, idx) => (
                      <React.Fragment key={idx}>
                        <span className="text-white/20">/</span>
                        <span 
                          className="hover:text-white cursor-pointer transition-colors"
                          onClick={() => {
                            setMatterSubfolderPath(prev => prev.slice(0, idx + 1));
                          }}
                        >
                          {segment}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {/* Matter subfolders grid */}
                {matterSubfolders.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    {matterSubfolders.map(sub => (
                      <div
                        key={sub.name}
                        onClick={() => setMatterSubfolderPath(prev => [...prev, sub.name])}
                        className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 cursor-pointer transition-all group"
                      >
                        <span className="text-2xl text-[#f59e0b] group-hover:scale-115 transition-transform">
                          📁
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-800 text-white truncate leading-tight">{sub.name}</p>
                          <p className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest mt-1">{sub.count} items</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Table headers={['Document Identity', 'Category', 'Origin / Author', 'Date Logged', '']}>
                  {docsInFolder.map(d => (
                    <Tr key={d.id}>
                      <Td>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <FileIcon type={d.type} />
                            <span className="text-[14px] font-700 text-white truncate max-w-[240px] group-hover:text-[#38bdf8] transition-colors">{d.name}</span>
                          </div>
                          {d.folder_path && (
                            <span className="text-[10px] text-[#8a94a6] font-mono flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                              {d.folder_path}
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td><span className="text-[10px] bg-white/5 text-[#8a94a6] px-2.5 py-1 rounded-xl border border-white/5 font-900 uppercase tracking-widest">{d.category || 'General'}</span></Td>
                      <Td className="text-[#8a94a6] font-700 text-[12px]">{d.by}</Td>
                      <Td className="text-[#8a94a6] font-800 text-[11px] uppercase tracking-wider">{d.uploaded}</Td>
                      <Td>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await previewDocumentBlob(d.id, openModal, d.name);
                              } catch (e) {
                                toast(e.message || 'Preview failed', 'error');
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-[#8a94a6] hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] transition-all shadow-lg group/btn"
                            title="Preview"
                          >
                            <svg className="w-4 h-4 transition-transform group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await downloadDocumentBlob(d.id, d.name);
                                toast(`${d.name} download started`, 'success');
                              } catch (e) {
                                toast(e.message || 'Download failed', 'error');
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-[#8a94a6] hover:bg-[#0057c7] hover:text-white transition-all shadow-lg group/btn"
                            title="Download"
                          >
                            <svg className="w-4 h-4 transition-transform group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M7 16V4h10v12" /><path d="M20 12l-8 8-8-8" /></svg>
                          </button>
                        </div>
                      </Td>
                     </Tr>
                  ))}
                </Table>
              </Card>
            </div>
          )}

          {tab === 'Templates / Drafts' && (
            <div className="animate-fade-in">
              <Card>
                <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
                  <div>
                    <h3 className="text-[16px] font-800 text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                      Templates & Litigation Drafts
                    </h3>
                    <p className="text-[12px] text-[#8a94a6] mt-1 font-600">Automated legal document generation and signing pipeline.</p>
                  </div>
                  {!isClient && (
                    <div className="flex gap-2">
                      <button onClick={() => openModal('browse-templates', { targetMatterId: caseId })} className="btn btn-secondary h-9 px-4 text-[12px] font-700 uppercase tracking-wider">
                        Browse Library
                      </button>
                      <button onClick={() => openCreateDraftModal('letter')} className="btn btn-secondary h-9 px-4 text-[12px] font-700 uppercase tracking-wider">
                        + Draft Letter
                      </button>
                      <button onClick={() => openCreateDraftModal()} className="btn btn-primary h-9 px-4 text-[12px] font-700 uppercase tracking-wider">
                        Initialize Draft
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {templatesDrafts.length > 0 ? templatesDrafts.map((item) => (
                    <div key={item.id} className="p-6 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.05] transition-all group shadow-2xl relative overflow-hidden">
                      {/* Background Accent for draft status */}
                      <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.02] pointer-events-none transform translate-x-1/2 -translate-y-1/2 rounded-full ${item.status === 'signed' ? 'bg-emerald-500' : 'bg-[#0057c7]'}`} />
                      
                      {(() => {
                        const displayStatus = isClient ? clientStatus(item.status) : draftUiStatus(item.status);
                        return (
                          <>
                            <div className="flex items-center justify-between gap-4 flex-wrap relative z-10">
                              <div className="min-w-0">
                                <p className="text-[16px] font-900 text-white tracking-tight group-hover:text-[#38bdf8] transition-colors">{item.title}</p>
                                <div className="flex items-center gap-3 mt-2 text-[11px] text-[#8a94a6] flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-white/[0.05] text-[#38bdf8] border border-white/5 font-900 uppercase tracking-widest">{item.category}</span>
                                  <span className="font-800 uppercase tracking-[0.1em] opacity-60">Modified {item.updated}</span>
                                </div>
                              </div>
                              <span className={`text-[10px] font-900 px-3 py-1 rounded-lg uppercase tracking-[0.2em] border shadow-lg ${displayStatus === 'Draft'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : displayStatus === 'Ready'
                                    ? 'bg-[#0057c7]/10 text-[#38bdf8] border-[#0057c7]/20'
                                    : displayStatus === 'Sent for Signature' || displayStatus === 'Pending Signature'
                                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-indigo-500/10'
                                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10'
                                }`}>
                                {displayStatus}
                              </span>
                            </div>
                            <div className="mt-6 flex gap-3 flex-wrap relative z-10">
                              <button onClick={() => openDraftPreview(item)} className="btn btn-secondary h-8 px-5 text-[11px] font-800 uppercase tracking-widest">Preview</button>
                              <button onClick={() => downloadDraftPdf(item.id)} className="btn btn-secondary h-8 px-5 text-[11px] font-800 uppercase tracking-widest">Download PDF</button>
                              {!isClient && <button onClick={() => openModal('edit-draft', item)} className="btn btn-secondary h-8 px-5 text-[11px] font-800 uppercase tracking-widest">Edit</button>}
                              {!isClient && <button onClick={() => openModal('use-template', { ...item, targetMatterId: caseId })} className="btn btn-primary h-8 px-5 text-[11px] font-800 uppercase tracking-widest">Clone Draft</button>}
                              {!isClient && item.status !== 'signed' && <button onClick={() => sendTemplateForSignature(item.id, item.title)} className="btn btn-primary h-8 px-5 text-[11px] font-900 uppercase tracking-widest border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-600 hover:text-white flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"><span>✍️</span> Send for E-Sign</button>}
                              {isClient && (item.status === 'sent_for_signature' || displayStatus === 'Pending Signature') && (
                                <button onClick={() => openReviewAndSign(item)} className="btn btn-primary h-8 px-6 text-[11px] font-900 uppercase tracking-widest shadow-emerald-500/20">Review & Execute</button>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )) : (
                    <EmptyState
                      icon={<svg className="w-12 h-12 text-[#8a94a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                      title="Draft Registry Empty"
                      desc="No legal drafts or templates have been initialized for this matter yet."
                      action={
                        !isClient && (
                          <div className="flex gap-3">
                            <button onClick={() => openModal('browse-templates', { targetMatterId: caseId })} className="btn btn-secondary h-9 px-4 text-[11px] font-800 uppercase tracking-widest">Library Access</button>
                            <button onClick={() => openCreateDraftModal('letter')} className="btn btn-secondary h-9 px-4 text-[11px] font-800 uppercase tracking-widest">+ Draft Letter</button>
                            <button onClick={() => openCreateDraftModal()} className="btn btn-primary h-9 px-4 text-[11px] font-800 uppercase tracking-widest">New Draft</button>
                          </div>
                        )
                      }
                    />
                  )}
                </div>
              </Card>
            </div>
          )}

          {(tab === 'Communications' || tab === 'Communication' || tab === 'Messages') && (
            <Card>
              <div className="flex items-center justify-between mb-8 gap-2 flex-wrap">
                <h3 className="text-[16px] font-800 text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                  {isClient ? 'Portal Messages' : 'Communication History'}
                </h3>
                <div className="flex gap-3 flex-wrap">
                  {!isClient && <button onClick={() => openModal('log-call', matterModalContext)} className="btn btn-secondary h-8 px-5 text-[11px] font-800 uppercase tracking-widest">Log Call</button>}
                  <button className="btn btn-primary h-8 px-5 text-[11px] font-800 uppercase tracking-widest" onClick={() => openModal('compose-email', matterModalContext)}>{isClient ? 'New Message' : 'Send Email'}</button>
                </div>
              </div>
              <div className="space-y-4">
                {(commRows || [])
                  .filter(c => c.communication_type !== 'note')
                  .filter(c => !isClient || c.visibility === 'client_visible' || c.visibility === 'client_shared')
                  .map((com, i) => (
                    <div key={i} className="flex gap-4 p-6 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.05] transition-all group shadow-2xl">
                      <div className="w-12 h-12 rounded-full bg-white/[0.05] shadow-inner flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform text-white border border-white/10">
                        {com.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-[15px] font-900 text-white truncate tracking-tight">{com.subject}</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest whitespace-nowrap opacity-60">{com.date}</span>
                            {!isClient && (
                              <>
                                <button 
                                  onClick={() => openModal('compose-email', {
                                    id: com.id,
                                    matterId: com.matter_id,
                                    to: com.to,
                                    cc: com.cc,
                                    bcc: com.bcc,
                                    subject: com.subject,
                                    message: com.fullBody
                                  })}
                                  className="text-slate-400 hover:text-blue-400 text-[10px] font-900 uppercase tracking-widest transition-all cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => setShowConfirmDelete(com.id)}
                                  className="text-red-400/80 hover:text-red-400 text-[10px] font-900 uppercase tracking-widest transition-all cursor-pointer"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {(() => {
                          const { cleanText, attachments } = parseBodyAttachments(com.fullBody || com.text || '');
                          return (
                            <>
                              {cleanText.includes('<') && cleanText.includes('>') ? (
                                <div dangerouslySetInnerHTML={{ __html: cleanText }} className="text-[13px] text-[#b8c2d1] mb-4 leading-relaxed font-500 opacity-90 communication-html-body" />
                              ) : (
                                <p className="text-[13px] text-[#b8c2d1] mb-4 leading-relaxed font-500 opacity-90">{cleanText}</p>
                              )}
                              {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {attachments.map((att, attIdx) => (
                                    <div key={attIdx} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 shadow-sm">
                                      <button
                                        type="button"
                                        onClick={() => openAttachment(att, com.matter_id || apiMatter?.id, openModal, toast)}
                                        className="flex items-center gap-1.5 text-[11px] text-white font-600 hover:text-[#38bdf8] transition-colors cursor-pointer"
                                        title="Open file in new tab"
                                      >
                                        <span>📄</span>
                                        <span className="truncate max-w-[130px]">{att.name}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => downloadAttachment(att, com.matter_id || apiMatter?.id, toast)}
                                        className="p-1 text-[#8a94a6] hover:text-white hover:bg-white/10 rounded transition-all cursor-pointer ml-1"
                                        title="Download file"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] bg-[#0057c7]/10 text-[#38bdf8] border border-[#0057c7]/20 px-3 py-1 rounded-xl font-900 uppercase tracking-[0.15em]">{com.type}</span>
                            <span className="text-[11px] text-[#8a94a6] font-700 uppercase tracking-widest opacity-60">· {com.user}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => {
                                setReplyingTo(com.id);
                                setReplyText(`Replying to: ${com.text.slice(0, 50)}${com.text.length > 50 ? '...' : ''}\n\n`);
                              }}
                              className="text-[11px] font-900 text-[#38bdf8] hover:text-white transition-colors uppercase tracking-[0.25em]"
                            >
                              Reply →
                            </button>
                            {com.repliesCount > 0 && (
                              <button
                                onClick={() => loadThread(com.id)}
                                className="text-[11px] font-900 text-white hover:text-[#38bdf8] transition-colors uppercase tracking-[0.25em]"
                              >
                                {expandedThread === com.id ? 'Hide Thread' : `View Thread (${com.repliesCount})`}
                              </button>
                            )}
                          </div>
                        </div>
                        {replyingTo === com.id && (
                          <div className="mt-8 p-6 rounded-2xl bg-white/[0.03] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-slide-up">
                            <div className="flex items-center justify-between mb-5">
                              <span className="text-[10px] font-900 uppercase tracking-[0.25em] text-[#38bdf8]">Secure Response Portal</span>
                              <button onClick={() => setReplyingTo(null)} className="text-[#8a94a6] hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            <Textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type your reply here..."
                              rows={5}
                              className="mb-5 text-[14px] bg-white/[0.02] border-white/10 text-white rounded-xl focus:border-[#38bdf8] transition-all"
                            />
                            <div className="flex justify-end gap-3">
                              <button onClick={() => setReplyingTo(null)} className="btn btn-secondary h-9 px-5 text-[11px] font-800 uppercase tracking-widest">Cancel</button>
                              <button
                                onClick={handleSendReply}
                                disabled={isSubmittingReply || !replyText.trim()}
                                className="btn btn-primary h-9 px-6 text-[11px] font-900 uppercase tracking-widest shadow-[#0057c7]/20"
                              >
                                {isSubmittingReply ? 'Dispatching...' : 'Send Message'}
                              </button>
                            </div>
                          </div>
                        )}
                        {expandedThread === com.id && expandedThreadData && (
                          <div className="mt-8 pl-8 space-y-4 border-l-2 border-white/10 animate-slide-down">
                            {expandedThreadData.replies.map((reply, ridx) => (
                              <div key={ridx} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-900 text-white">{reply.sender?.full_name || '—'}</span>
                                    <span className="text-[9px] bg-white/10 text-white px-2 py-0.5 rounded-full font-800 uppercase tracking-widest">{reply.sender?.role || 'User'}</span>
                                  </div>
                                  <span className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest opacity-60">
                                    {new Date(reply.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[13px] text-[#b8c2d1] leading-relaxed font-500 opacity-90">{reply.message_body}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}



          {tab === 'Schedule' && (() => {
            const now = new Date();
            const upcomingHearings = matterEvents.filter(e => (e.is_court_event || e.court_related) && e.type === 'hearing' && new Date(e.date) >= now);
            const trialDates = matterEvents.filter(e => (e.is_court_event || e.court_related) && e.type === 'trial' && new Date(e.date) >= now);
            const filingDeadlines = matterEvents.filter(e => (e.is_court_event || e.court_related) && e.type === 'filing_deadline' && new Date(e.date) >= now);
            const pastAppearances = matterEvents.filter(e => (e.is_court_event || e.court_related) && new Date(e.date) < now);
            const otherEvents = matterEvents.filter(e => !(e.is_court_event || e.court_related));

            return (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-900 text-white tracking-tight mb-1">Court & Case Schedule</h3>
                    <p className="text-[12px] text-[#8a94a6] font-600">Hearings, trials, filing deadlines, and proceedings.</p>
                  </div>
                  {isStaff && (
                    <button onClick={() => openModal('add-event', { matterId: caseId })} className="btn btn-primary shadow-[#0057c7]/20">
                      + Add Court Event
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {/* UPCOMING HEARINGS */}
                  <div>
                    <h4 className="text-[11px] font-900 uppercase tracking-[0.25em] text-[#38bdf8] mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
                      Upcoming Hearings ({upcomingHearings.length})
                    </h4>
                    {upcomingHearings.length === 0 ? (
                      <p className="text-[12px] text-slate-500 italic pl-4">No upcoming hearings scheduled.</p>
                    ) : (
                      <div className="space-y-3">
                        {upcomingHearings.sort((a, b) => new Date(a.date) - new Date(b.date)).map((e) => (
                          <div key={e.id} onClick={() => openModal('view-event', e)} className="p-5 rounded-2xl bg-white/[0.02] border border-[#38bdf8]/20 hover:bg-white/[0.05] transition-all flex justify-between items-center cursor-pointer">
                            <div>
                              <h5 className="text-[15px] font-800 text-white">{e.title}</h5>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8a94a6] mt-2 font-600">
                                {e.court_name && <span>Court: <strong className="text-white">{e.court_name}</strong></span>}
                                {e.court_room && <span>Room: <strong className="text-white">{e.court_room}</strong></span>}
                                {e.judge_name && <span>Judge: <strong className="text-white">{e.judge_name}</strong></span>}
                                {e.appearance_type && <span>Type: <strong className="text-white uppercase">{e.appearance_type}</strong></span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[13px] font-900 text-white">{formatPSTDate(e.date)}</span>
                              <span className="block text-[11px] text-[#8a94a6] mt-1">{formatPSTTime(e.date)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* TRIAL DATES */}
                  <div>
                    <h4 className="text-[11px] font-900 uppercase tracking-[0.25em] text-red-400 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      Trial Dates ({trialDates.length})
                    </h4>
                    {trialDates.length === 0 ? (
                      <p className="text-[12px] text-slate-500 italic pl-4">No trial dates scheduled.</p>
                    ) : (
                      <div className="space-y-3">
                        {trialDates.sort((a, b) => new Date(a.date) - new Date(b.date)).map((e) => (
                          <div key={e.id} onClick={() => openModal('view-event', e)} className="p-5 rounded-2xl bg-white/[0.02] border border-red-500/20 hover:bg-white/[0.05] transition-all flex justify-between items-center cursor-pointer">
                            <div>
                              <h5 className="text-[15px] font-800 text-white">{e.title}</h5>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8a94a6] mt-2 font-600">
                                {e.court_name && <span>Court: <strong className="text-white">{e.court_name}</strong></span>}
                                {e.court_room && <span>Room: <strong className="text-white">{e.court_room}</strong></span>}
                                {e.judge_name && <span>Judge: <strong className="text-white">{e.judge_name}</strong></span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[13px] font-900 text-white">{formatPSTDate(e.date)}</span>
                              <span className="block text-[11px] text-[#8a94a6] mt-1">{formatPSTTime(e.date)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FILING DEADLINES */}
                  <div>
                    <h4 className="text-[11px] font-900 uppercase tracking-[0.25em] text-amber-500 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Filing Deadlines ({filingDeadlines.length})
                    </h4>
                    {filingDeadlines.length === 0 ? (
                      <p className="text-[12px] text-slate-500 italic pl-4">No upcoming filing deadlines.</p>
                    ) : (
                      <div className="space-y-3">
                        {filingDeadlines.sort((a, b) => new Date(a.date) - new Date(b.date)).map((e) => (
                          <div key={e.id} onClick={() => openModal('view-event', e)} className="p-5 rounded-2xl bg-white/[0.02] border border-amber-500/20 hover:bg-white/[0.05] transition-all flex justify-between items-center cursor-pointer">
                            <div>
                              <h5 className="text-[15px] font-800 text-white">{e.title}</h5>
                              <p className="text-[11px] text-[#8a94a6] mt-1 font-600">{e.description || 'Filing requirement'}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-[13px] font-900 text-white">{formatPSTDate(e.date)}</span>
                              <span className="block text-[11px] text-[#8a94a6] mt-1">{formatPSTTime(e.date)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PAST APPEARANCES */}
                  <div>
                    <h4 className="text-[11px] font-900 uppercase tracking-[0.25em] text-emerald-400 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Past Appearances ({pastAppearances.length})
                    </h4>
                    {pastAppearances.length === 0 ? (
                      <p className="text-[12px] text-slate-500 italic pl-4">No past appearances recorded.</p>
                    ) : (
                      <div className="space-y-3">
                        {pastAppearances.sort((a, b) => new Date(b.date) - new Date(a.date)).map((e) => (
                          <div key={e.id} onClick={() => openModal('view-event', e)} className="p-5 rounded-2xl bg-white/[0.02] border border-emerald-500/20 hover:bg-white/[0.05] transition-all flex justify-between items-center opacity-70 cursor-pointer">
                            <div>
                              <h5 className="text-[15px] font-800 text-white">{e.title}</h5>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8a94a6] mt-1 font-600">
                                {e.court_name && <span>Court: {e.court_name}</span>}
                                {e.judge_name && <span>Judge: {e.judge_name}</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[13px] font-900 text-white">{formatPSTDate(e.date)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* OTHER EVENTS */}
                  {otherEvents.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-900 uppercase tracking-[0.25em] text-slate-400 mb-3">
                        Other Scheduled Events ({otherEvents.length})
                      </h4>
                      <div className="space-y-3">
                        {otherEvents.map((e) => (
                          <div key={e.id} onClick={() => openModal('view-event', e)} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all flex justify-between items-center cursor-pointer">
                            <div>
                              <h5 className="text-[15px] font-800 text-white">{e.title}</h5>
                              <span className="text-[10px] bg-white/5 text-[#8a94a6] px-2 py-0.5 rounded uppercase tracking-wider font-700 mt-1 inline-block">{e.type}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[13px] font-900 text-white">{formatPSTDate(e.date)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {tab === 'Billing' && (
            <div className="animate-fade-in space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
                <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#0057c7]/5 rounded-full blur-3xl" />
                  <p className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-[0.3em] mb-4 opacity-70">Total Matter Billed</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#0057c7]/10 flex items-center justify-center text-[#38bdf8] border border-[#0057c7]/20 shadow-inner">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <p className="text-4xl font-900 text-white tabular-nums tracking-tighter">{formatUsd(billingTotals.total)}</p>
                  </div>
                </div>

                <div className="bg-emerald-500/5 backdrop-blur-xl border border-emerald-500/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
                  <p className="text-[10px] text-emerald-400 font-900 uppercase tracking-[0.3em] mb-4 opacity-70">Remittance Secured</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-inner">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-4xl font-900 text-emerald-500 tabular-nums tracking-tighter">{formatUsd(billingTotals.paid)}</p>
                  </div>
                </div>

                <div className="bg-red-500/5 backdrop-blur-xl border border-red-500/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/5 rounded-full blur-3xl" />
                  <p className="text-[10px] text-red-400 font-900 uppercase tracking-[0.3em] mb-4 opacity-70">Current Arrears</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-inner">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-4xl font-900 text-red-500 tabular-nums tracking-tighter">{formatUsd(billingTotals.outstanding)}</p>
                  </div>
                </div>
              </div>

              <Card className="bg-white/[0.02] border-white/5 rounded-[2.5rem] p-10 relative z-10">
                <div className="flex items-center justify-between mb-10 gap-6 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-8 bg-[#0057c7] rounded-full" />
                    <h3 className="text-lg font-900 text-white tracking-tight uppercase">
                      {isClient ? 'Financial Ledger' : 'Matter Invoice Stream'}
                    </h3>
                  </div>
                  <div className="flex gap-4">
                    {!isClient && (
                      <button className="h-11 px-6 rounded-2xl bg-[#0057c7] text-white text-[11px] font-900 uppercase tracking-widest hover:bg-[#004bb1] transition-all shadow-xl shadow-[#0057c7]/20" onClick={() => openModal('create-invoice', matterModalContext)}>
                        New Invoice
                      </button>
                    )}
                    {isClient && billingTotals.outstanding > 0 && (
                      <button className="h-11 px-8 rounded-2xl bg-emerald-600 text-white text-[11px] font-900 uppercase tracking-[0.2em] hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-600/20" onClick={payAllOutstanding}>
                        Pay All Outstanding
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table headers={['Invoice', 'Issued', 'Due Date', 'Total', 'Paid', 'Balance', 'Status', '']}>
                    {matterInvoices.map(inv => (
                      <Tr key={inv.id} className="group hover:bg-white/[0.02] transition-colors">
                        <Td>
                          <div className="flex flex-col">
                            <span className="font-mono text-[14px] font-900 text-[#38bdf8] tracking-tighter">{inv.id}</span>
                            <span className="text-[9px] text-[#8a94a6] font-800 uppercase tracking-widest opacity-50">Transaction ID</span>
                          </div>
                        </Td>
                        <Td className="text-[#8a94a6] text-[13px] font-700 uppercase tracking-tight">{inv.issued}</Td>
                        <Td className="text-[#8a94a6] text-[13px] font-700 uppercase tracking-tight">{inv.due}</Td>
                        <Td className="font-900 text-white text-[16px] tabular-nums tracking-tighter">{inv.amount}</Td>
                        <Td className="text-emerald-500/70 font-800 text-[14px] tabular-nums">{inv.paid}</Td>
                        <Td className="text-red-400 font-900 text-[14px] tabular-nums bg-white/[0.01] rounded-lg">{inv.outstanding}</Td>
                        <Td><Badge status={inv.status} /></Td>
                        <Td>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => openModal('view-invoice', { ...inv, client: currentCase?.client || '—' })}
                              className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[#38bdf8] hover:bg-[#0057c7] hover:text-white transition-all border border-white/5"
                              title="Review Invoice"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            {isClient && inv.status !== 'paid' && inv.status !== 'void' && inv.dbId != null && (
                              <button
                                type="button"
                                onClick={() => payInvoiceRow(inv)}
                                disabled={payingInvoiceDbId === inv.dbId}
                                className="h-8 px-4 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-900 uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                              >
                                {payingInvoiceDbId === inv.dbId ? '...' : 'Pay'}
                              </button>
                            )}
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </Table>
                </div>
              </Card>
            </div>
          )}

          {tab === 'Activity' && (
            <Card>
              <h3 className="text-[16px] font-900 text-white mb-10 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                Case Activity Intelligence
              </h3>
              <div className="space-y-0">
                {(activityRows || []).map((act, i) => (
                  <div key={i} className="flex gap-8 group">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full border-4 border-slate-900 shadow-2xl z-10 ${i === 0 ? 'bg-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.6)]' : 'bg-white/20'} mt-2.5`} />
                      {i < activityRows.length - 1 && <div className="w-[1.5px] h-full bg-white/5 -mt-1 group-hover:bg-[#38bdf8]/40 transition-colors" />}
                    </div>
                    <div className="pb-12 flex-1">
                      <div className="flex justify-between items-start mb-2.5">
                        <h4 className="text-[16px] font-900 text-white tracking-tight group-hover:text-[#38bdf8] transition-colors">{act.title}</h4>
                        <span className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-[0.2em] opacity-50">{act.date}</span>
                      </div>
                      <p className="text-[14px] text-[#b8c2d1] leading-relaxed font-500 opacity-90">{act.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === 'Notes' && (
            <div className="animate-fade-in space-y-6">
              <Card>
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-[16px] font-900 text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                    Matter Intelligence Briefs
                  </h3>
                  {!isClient && <button className="btn btn-primary h-8 px-5 text-[11px] font-900 uppercase tracking-widest shadow-[#f59e0b]/10" onClick={() => openModal('add-note', matterModalContext)}>+ Add Brief</button>}
                </div>
                <div className="space-y-5">
                  {(apiMatter?.communications || [])
                    .filter((c) => c.communication_type === 'note')
                    .map((c) => ({
                      author: c.sender?.full_name || 'Legal Intelligence',
                      date: new Date(c.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
                      text: c.message_body || '',
                      visibility: c.visibility === 'client_visible' || c.visibility === 'client_shared' ? 'Shared' : 'Classified',
                    }))
                    .map((note, idx) => (
                      (isClient && note.visibility === 'Classified') ? null : (
                        <div key={idx} className="p-6 rounded-2xl border border-white/5 bg-white/[0.03] group hover:bg-white/[0.05] transition-all shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-white/5 group-hover:bg-[#f59e0b]/40 transition-colors" />
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                              <Avatar initials={note.author.split(' ').map(n => n[0]).join('')} size="xs" />
                              <div>
                                <span className="text-[14px] font-900 text-white tracking-tight">{note.author}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-[0.15em] opacity-60">{note.date}</span>
                                </div>
                              </div>
                            </div>
                            {!isClient && (
                              <span className={`text-[9px] font-900 px-3 py-1 rounded-lg uppercase tracking-widest border shadow-lg ${note.visibility === 'Classified' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                {note.visibility}
                              </span>
                            )}
                          </div>
                          <p className="text-[14px] text-[#b8c2d1] leading-relaxed font-500 opacity-90 pl-11">{note.text}</p>
                        </div>
                      )
                    ))}
                </div>
              </Card>
            </div>
          )}

          {tab === 'Forms' && (
            <div className="animate-fade-in space-y-6">
              <Card>
                <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                  <div>
                    <h3 className="text-[16px] font-800 text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                      California Court Forms
                    </h3>
                    <p className="text-[12px] text-[#8a94a6] mt-1 font-600">Generated Judicial Council forms and active drafts for this matter.</p>
                  </div>
                  <button
                    onClick={() => navigate(role === 'lawyer' ? '/lawyer/court-forms' : '/admin/court-forms')}
                    className="btn btn-primary h-9 px-5 text-[12px] font-700 uppercase tracking-wider"
                  >
                    + Generate Court Form
                  </button>
                </div>

                {courtFormsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-6 h-6 rounded-full border-2 border-[#0057c7] border-t-transparent" />
                  </div>
                ) : courtForms.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                    <p className="text-sm text-[#8a94a6] italic">No court forms generated for this matter yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table headers={['Form', 'Status', 'Generated By', 'Last Modified', '']}>
                      {courtForms.map((f) => (
                        <Tr key={f.id}>
                          <Td>
                            <p className="font-mono text-sm font-bold text-[#38bdf8]">{f.template?.form_number}</p>
                            <p className="text-[#8a94a6] text-xs mt-0.5">{f.template?.title}</p>
                          </Td>
                          <Td>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${
                              f.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            }`}>{f.status}</span>
                          </Td>
                          <Td className="text-sm text-[#8a94a6]">{f.creator?.full_name || '—'}</Td>
                          <Td className="text-sm text-[#8a94a6]">{new Date(f.updated_at).toLocaleDateString()}</Td>
                          <Td>
                            <button
                              onClick={() => navigate(role === 'lawyer' ? `/lawyer/court-forms` : `/admin/court-forms`)}
                              className="text-xs font-semibold px-3 py-1.5 bg-[#0057c7]/20 text-[#38bdf8] border border-[#0057c7]/30 rounded-lg hover:bg-[#0057c7]/40 transition-all"
                            >
                              Manage in Library
                            </button>
                          </Td>
                        </Tr>
                      ))}
                    </Table>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Status / Quick Panel (25%) */}
        <div className="space-y-4 lg:sticky lg:top-0">
          <Card className="!p-0 overflow-hidden border-white/5 bg-white/[0.02]">
            <div className="bg-gradient-to-br from-slate-900 to-[#0057c7]/20 p-6 border-b border-white/5">
              <p className="text-[10px] font-900 uppercase tracking-[0.25em] text-[#38bdf8] mb-6 text-center opacity-80">Matter Profile Identity</p>
              <div className="flex flex-col items-center gap-4">
                <div className="min-w-[5rem] h-14 px-5 rounded-2xl bg-gradient-to-br from-[#0057c7] to-[#38bdf8] flex items-center justify-center text-white text-xl font-900 tracking-tighter shadow-[0_8px_20px_rgba(0,87,199,0.3)] border border-white/20">
                  {currentCase.matter_number || currentCase.id || '—'}
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-800 text-white tracking-tight">{currentCase.title}</h3>
                  <p className="text-[#8a94a6] text-[12px] font-600 mt-1 uppercase tracking-widest">{currentCase.type}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] mb-4">Personnel & Parties</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] text-[#38bdf8] flex items-center justify-center text-lg border border-white/5 transition-colors group-hover:bg-[#0057c7]/10 group-hover:border-[#0057c7]/20">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8a94a6] font-800 uppercase tracking-widest mb-0.5">Assigned Counsel</p>
                      <p className="text-[14px] font-700 text-white tracking-tight">{currentCase.lawyer}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] text-emerald-400 flex items-center justify-center text-lg border border-white/5 transition-colors group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8a94a6] font-800 uppercase tracking-widest mb-0.5">Parties</p>
                      <p className="text-[14px] font-700 text-white tracking-tight leading-snug">{currentCase.client}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-white/5">
                <h4 className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] mb-4">Command Center</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[13px] bg-white/[0.02] p-2 rounded-xl">
                    <span className="text-[#8a94a6] font-600">Current Status</span>
                    <Badge status={currentCase.status} />
                  </div>
                  <div className="flex justify-between items-center text-[13px] bg-white/[0.02] p-2 rounded-xl">
                    <span className="text-[#8a94a6] font-600">Action Priority</span>
                    <Badge status={currentCase.priority} />
                  </div>
                  <div className="flex justify-between items-center text-[13px] p-2">
                    <span className="text-[#8a94a6] font-600">Portal Sync</span>
                    <span className="flex items-center gap-2 text-emerald-400 font-800 text-[11px] uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      Live
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] p-2 pt-1 border-t border-white/[0.03] mt-2">
                    <span className="text-[#8a94a6] font-600">Registry Snapshot</span>
                    <span className="font-800 text-white uppercase tracking-tighter">{currentCase.lastUpdated || '—'}</span>
                  </div>
                </div>
              </div>
              {!isClient && (
                <div className="pt-4">
                  <button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-[11px] font-900 uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 group/arch">
                    <svg className="w-4 h-4 transition-transform group-hover/arch:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete Case File
                  </button>
                </div>
              )}
            </div>
          </Card>

        </div>
      </div>

      {isDeleteConfirmOpen && (
        <Modal
          title="Delete Case File"
          onClose={() => setIsDeleteConfirmOpen(false)}
          footer={
            <>
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={handleDeleteCase} className="btn btn-primary btn-sm !bg-red-500 hover:!bg-red-600 !border-red-500">Delete Permanently</button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <p className="text-[13px] text-red-200 font-700">Are you sure you want to delete this case file?</p>
                <p className="text-[12px] text-red-300/70 mt-1">This action cannot be undone. All associated documents, communications, invoices, and records will be permanently removed.</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {isCreateDraftOpen && (
        <Modal
          title="Create New Draft"
          onClose={() => setIsCreateDraftOpen(false)}
          footer={
            <>
              <button onClick={() => setIsCreateDraftOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={saveNewDraft} className="btn btn-primary btn-sm">Save Draft</button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Draft Creation Mode" required>
              <Select
                value={creationType}
                onChange={(e) => {
                  setCreationType(e.target.value);
                  if (e.target.value === 'blank') {
                    setSelectedTemplateId('');
                  }
                }}
              >
                <option value="blank">Create Blank Draft</option>
                <option value="template">Create From Template</option>
              </Select>
            </Field>

            {creationType === 'template' && (
              <Field label="Select Template" required>
                <Select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                >
                  <option value="">Select a template...</option>
                  {globalTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.category || 'General'})</option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label="Draft Title" required>
              <Input
                value={newDraftForm.title}
                onChange={(e) => setNewDraftForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Enter draft title"
              />
            </Field>
            <Field label="Category / Template Type" required>
              <Select
                value={newDraftForm.category}
                onChange={(e) => setNewDraftForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Select category</option>
                <option value="Agreement">Agreement</option>
                <option value="letter">Letter</option>
                <option value="court_form">Court Form</option>
                <option value="Contract">Contract</option>
                <option value="Motion">Motion</option>
                <option value="Pleading">Pleading</option>
                <option value="Affidavit">Affidavit</option>
                <option value="Notice">Notice</option>
                <option value="Demand Letter">Demand Letter</option>
                <option value="Legal Disclaimer">Legal Disclaimer</option>
                <option value="Engagement">Engagement</option>
                <option value="Intake">Intake</option>
                <option value="Litigation">Litigation</option>
                <option value="Resolution">Resolution</option>
                <option value="General">General</option>
                <option value="Other">Other...</option>
              </Select>
            </Field>
            <Field label="Related Matter Name">
              <Input
                value={newDraftForm.matterName}
                onChange={(e) => setNewDraftForm((prev) => ({ ...prev, matterName: e.target.value }))}
              />
            </Field>
            <Field label="Client Name">
              <Input
                value={newDraftForm.clientName}
                onChange={(e) => setNewDraftForm((prev) => ({ ...prev, clientName: e.target.value }))}
              />
            </Field>
            <Field label="Draft Status">
              <Input value={newDraftForm.status} disabled />
            </Field>
            <Field label="Mock Content / Notes">
              <Textarea
                rows={4}
                value={newDraftForm.notes}
                onChange={(e) => setNewDraftForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add mock legal draft notes..."
              />
            </Field>
          </div>
        </Modal>
      )}

      {isAddPartyModalOpen && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsAddPartyModalOpen(false)}>
          <div className="bg-[#1a2233] border border-white/10 rounded-[2rem] p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 text-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Add Additional Party / Entity to Matter
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Attach a client, witness, medical provider, vehicle driver/passenger, or entity affiliate.</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsAddPartyModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg px-2">✕</button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newPartyForm.full_name.trim()) {
                toast('Party Name is required.', 'error');
                return;
              }
              await handleAddPartyFromModal({
                id: 'party_' + Date.now(),
                ...newPartyForm
              });
              setIsAddPartyModalOpen(false);
              setNewPartyForm({
                full_name: '',
                party_role: 'Witness',
                party_type: 'Person',
                organization_name: '',
                email: '',
                phone: '',
                address: '',
                government_id: '',
                country_of_birth: '',
                insurance_number: '',
                relief_sought: '',
                notes: ''
              });
            }} className="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar p-1">

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Party Role *</label>
                  <select
                    value={newPartyForm.party_role}
                    onChange={e => setNewPartyForm(p => ({ ...p, party_role: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  >
                    <option value="Client">Client (Co-Client)</option>
                    <option value="Retaining Client">Retaining Client</option>
                    <option value="Defendant">Defendant / Opposing Party</option>
                    <option value="Witness">Witness</option>
                    <option value="Medical Provider">Medical Provider / Clinic</option>
                    <option value="Insurance Adjuster">Insurance Adjuster / Carrier</option>
                    <option value="Opposing Counsel">Opposing Counsel / Firm</option>
                    <option value="Passenger">Passenger</option>
                    <option value="Driver">Driver</option>
                    <option value="Petitioner">Petitioner (Immigration)</option>
                    <option value="Beneficiary">Beneficiary (Immigration)</option>
                    <option value="Point of Contact">Point of Contact / Entity Affiliate</option>
                    <option value="Other">Other / Related Party</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Party Type *</label>
                  <select
                    value={newPartyForm.party_type}
                    onChange={e => setNewPartyForm(p => ({ ...p, party_type: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  >
                    <option value="Person">Person (Individual)</option>
                    <option value="Organization">Organization (Company)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Full Name / Primary Contact *</label>
                <input
                  type="text"
                  value={newPartyForm.full_name}
                  onChange={e => setNewPartyForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Full Name / Primary Contact"
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  required
                />
              </div>

              {newPartyForm.party_type === 'Organization' && (
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Organization / Company Name</label>
                  <input
                    type="text"
                    value={newPartyForm.organization_name}
                    onChange={e => setNewPartyForm(p => ({ ...p, organization_name: e.target.value }))}
                    placeholder="E.g. Acme Medical Clinic Inc."
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newPartyForm.email}
                    onChange={e => setNewPartyForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="party@email.com"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newPartyForm.phone}
                    onChange={e => setNewPartyForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="(555) 000-0000"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Address / Location</label>
                <input
                  type="text"
                  value={newPartyForm.address}
                  onChange={e => setNewPartyForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="123 Main St, City, State Zip"
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Confidential ID / SSN / DL</label>
                  <input
                    type="text"
                    value={newPartyForm.government_id}
                    onChange={e => setNewPartyForm(p => ({ ...p, government_id: e.target.value }))}
                    placeholder="SSN / DL / Tax ID"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Policy / Claim # (If Insurance)</label>
                  <input
                    type="text"
                    value={newPartyForm.insurance_number}
                    onChange={e => setNewPartyForm(p => ({ ...p, insurance_number: e.target.value }))}
                    placeholder="Claim / Policy #"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-900 text-slate-400 uppercase tracking-widest block mb-1">Role Notes / Testimony Summary</label>
                <textarea
                  rows={2}
                  value={newPartyForm.notes}
                  onChange={e => setNewPartyForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Party role details, testimony or involvement summary..."
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setIsAddPartyModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Attach Party to Matter</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {reviewDraft && (
        <Modal
          title={`Review & Sign · ${reviewDraft.title}`}
          onClose={() => {
            setReviewDraft(null);
            setReviewConfirmed(false);
            setHasDrawnSignature(false);
            signaturePadRef.current?.clear();
          }}
          footer={
            <>
              <button onClick={() => {
                setReviewDraft(null);
                setReviewConfirmed(false);
                setHasDrawnSignature(false);
                signaturePadRef.current?.clear();
              }} className="btn btn-secondary btn-sm">Cancel</button>
              <button
                onClick={signReviewedDraft}
                disabled={!reviewConfirmed || !hasDrawnSignature}
                className={`btn btn-primary btn-sm ${(!reviewConfirmed || !hasDrawnSignature) ? 'opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-none' : ''}`}
              >
                Sign Document
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-800 uppercase tracking-[0.18em] text-[#8a94a6] mb-1">Document Title</p>
              <p className="text-[14px] font-700 text-white tracking-tight">{reviewDraft.title}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-800 uppercase tracking-[0.18em] text-[#8a94a6] mb-2">Short Preview</p>
              <p className="text-[13px] text-[#b8c2d1] leading-relaxed">{reviewDraft.preview}</p>
              <span className="inline-flex mt-3 text-[10px] font-900 px-3 py-1 rounded-lg uppercase tracking-[0.2em] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                Pending Signature
              </span>
            </div>
            <div className="rounded-2xl border border-[#0057c7]/20 bg-[#0057c7]/5 p-4">
              <label className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={reviewConfirmed}
                  onChange={(e) => setReviewConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded-[6px] border-white/10 bg-white/5 text-[#38bdf8] focus:ring-[#38bdf8]/50"
                />
                <span className="text-[12.5px] text-[#b8c2d1] font-600 group-hover:text-white transition-colors">
                  I confirm I have reviewed this document
                </span>
              </label>
              <div className="mt-3">
                <div ref={signaturePadContainerRef} className="rounded-xl border border-white/10 bg-white/[0.05] p-2">
                  <SignatureCanvas
                    ref={signaturePadRef}
                    penColor="#ffffff"
                    onEnd={() => setHasDrawnSignature(!signaturePadRef.current?.isEmpty())}
                    canvasProps={{
                      className: 'w-full rounded-lg bg-transparent cursor-crosshair',
                      height: signaturePadHeight,
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[11px] text-[#8a94a6] font-600">Use your mouse or touch to sign</p>
                  <button
                    onClick={() => {
                      signaturePadRef.current?.clear();
                      setHasDrawnSignature(false);
                    }}
                    className="btn btn-secondary btn-xs bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    Clear Signature
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {previewDraft && (
        <Modal
          title={`Draft Preview · ${previewDraft.title}`}
          onClose={closeDraftPreview}
          wide
          footer={
            <>
              <button onClick={closeDraftPreview} className="btn btn-secondary btn-sm">Close</button>
            </>
          }
        >
          <div className="space-y-5">
            <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-800 uppercase tracking-[0.18em] text-[#8a94a6] mb-1">Draft Title</p>
                  <p className="text-[14px] font-700 text-white">{previewDraft.title}</p>
                </div>
                <div>
                  <p className="text-[10px] font-800 uppercase tracking-[0.18em] text-[#8a94a6] mb-1">Matter Name</p>
                  <p className="text-[14px] font-600 text-[#dbe7ff]">{currentCase.title}</p>
                </div>
                <div>
                  <p className="text-[10px] font-800 uppercase tracking-[0.18em] text-[#8a94a6] mb-1">Client Name</p>
                  <p className="text-[14px] font-600 text-[#dbe7ff]">{currentCase.client}</p>
                </div>
                <div>
                  <p className="text-[10px] font-800 uppercase tracking-[0.18em] text-[#8a94a6] mb-1">Last Updated</p>
                  <p className="text-[14px] font-600 text-[#dbe7ff]">{previewDraft.updated}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <span className={`inline-flex text-[10px] font-900 px-3 py-1 rounded-lg uppercase tracking-[0.2em] border shadow-lg ${previewDraft.status === 'Draft'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10'
                    : previewDraft.status === 'Ready'
                      ? 'bg-[#0057c7]/10 text-[#38bdf8] border-[#0057c7]/20 shadow-[#0057c7]/10'
                      : previewDraft.status === 'Sent for Signature' || previewDraft.status === 'Pending Signature'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-indigo-500/10'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10'
                  }`}>
                  {previewDraft.status}
                </span>
              </div>
            </div>

            <div className="border border-white/10 rounded-2xl bg-white/[0.03] overflow-hidden">
              {previewPdfUrl ? (
                <iframe src={previewPdfUrl} className="w-full h-[600px] border-none" title="PDF Preview" />
              ) : (
                <div className="p-10 text-center flex flex-col items-center justify-center h-[400px]">
                  <div className="w-12 h-12 border-4 border-[#38bdf8] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-[#8a94a6] font-600">Generating PDF preview...</p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {esignModalData && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setEsignModalData(null)}>
          <div className="bg-[#141c2e] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl flex flex-col gap-5 text-white my-auto relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold">
                  ✍️
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">E-Sign Signature Engine</h3>
                  <p className="text-xs text-slate-400">DigiSigner / Adobe Sign Integration</p>
                </div>
              </div>
              <button onClick={() => setEsignModalData(null)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            {esignModalData.step === 'input' ? (
              <form onSubmit={handleExecuteEsignSend} className="space-y-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Document to Sign:</p>
                  <p className="text-sm font-bold text-white">{esignModalData.title}</p>
                </div>

                <Field label="Recipient Client Email Address" required>
                  <Input 
                    type="email" 
                    value={esignModalData.email} 
                    onChange={e => setEsignModalData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="client@example.com" 
                    required 
                  />
                </Field>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button type="button" onClick={() => setEsignModalData(null)} className="btn btn-secondary text-xs px-4">Cancel</button>
                  <button type="submit" className="btn btn-primary text-xs px-6 bg-emerald-600 hover:bg-emerald-500 border-emerald-500/40 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20">
                    <span>🚀</span> Send E-Sign Request
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5 animate-fade-in">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl">✓</div>
                  <h4 className="text-sm font-bold text-emerald-300">Signature Request Dispatched!</h4>
                  <p className="text-xs text-slate-300">Sent securely to <span className="font-bold text-white">{esignModalData.email}</span></p>
                </div>

                {esignModalData.url && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">E-Sign Signing Link (Shareable)</label>
                    <div className="flex items-center gap-2 bg-[#090d16] border border-white/10 rounded-xl p-2.5">
                      <input type="text" readOnly value={esignModalData.url} className="bg-transparent text-xs text-emerald-400 font-mono flex-1 outline-none truncate" />
                      <button 
                        type="button" 
                        onClick={() => {
                          navigator.clipboard.writeText(esignModalData.url);
                          toast('E-Sign link copied to clipboard!', 'success');
                        }}
                        className="btn btn-secondary text-[11px] py-1 px-3 rounded-lg font-bold shrink-0"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                  {esignModalData.url && (
                    <a 
                      href={esignModalData.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary text-xs px-4 bg-[#0057c7] text-white flex items-center gap-1.5 font-bold"
                    >
                      <span>🚀</span> Open Signing Portal
                    </a>
                  )}
                  <button type="button" onClick={() => setEsignModalData(null)} className="btn btn-secondary text-xs px-5">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Custom Delete Confirmation Modal */}
      {showConfirmDelete && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 w-full max-w-[400px] shadow-2xl flex flex-col gap-4 text-center text-white">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-[16px] font-800">Delete Transmission?</h3>
            <p className="text-[13px] text-slate-400 leading-relaxed">
              Are you sure you want to delete this communication record? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowConfirmDelete(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[12px] font-700 py-2.5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCommunication(showConfirmDelete)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[12px] font-700 py-2.5 rounded-xl transition-all shadow-md shadow-red-600/10"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isAddPartyModalOpen && (
        <PartyRoleModal
          isOpen={isAddPartyModalOpen}
          onClose={() => setIsAddPartyModalOpen(false)}
          onAddParty={handleAddPartyFromModal}
        />
      )}

      {isAddVariableModalOpen && (
        <VariableModuleModal
          isOpen={isAddVariableModalOpen}
          onClose={() => setIsAddVariableModalOpen(false)}
          onAddModule={handleAddModuleFromModal}
        />
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────
//  CALENDAR PAGE
// ─────────────────────────────────────────────────────────
export function CalendarPage({ toast, openModal, role = 'lawyer' }) {
  const isAdmin = role !== 'client';
  const todayPacific = getPacificToday() || { year: new Date().getFullYear(), monthIdx: new Date().getMonth(), month: new Date().getMonth() + 1, day: new Date().getDate(), dateStr: new Date().toISOString().split('T')[0] };
  const [viewDate, setViewDate] = useState(() => new Date(todayPacific.year, todayPacific.monthIdx, todayPacific.day || 1));
  const [viewMode, setViewMode] = useState('month'); // 'day' | 'week' | 'month'
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target)) {
        setIsViewDropdownOpen(false);
      }
    };
    if (isViewDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isViewDropdownOpen]);

  const [events, setEvents] = useState([]);
  const [matterPick, setMatterPick] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isManageCatsOpen, setIsManageCatsOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#0057c7');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');

  // Quick Add State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState(() => todayPacific.dateStr);
  const [quickMatter, setQuickMatter] = useState('');
  const [quickType, setQuickType] = useState('meeting');
  const [quickReminder, setQuickReminder] = useState('');
  const [quickCreateTask, setQuickCreateTask] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('all');

  const [showArchived, setShowArchived] = useState(false);
  const [syncingTitan, setSyncingTitan] = useState(false);

  const handleSyncTitan = async () => {
    setSyncingTitan(true);
    try {
      const res = await api.calendar.syncTitan();
      if (res && res.success) {
        toast(res.message || 'Titan Calendar synchronized successfully', 'success');
      } else {
        toast(res?.error || 'Titan Calendar sync finished', 'info');
      }
      await loadData();
    } catch (err) {
      toast(err.message || 'Failed to sync Titan Calendar', 'error');
    } finally {
      setSyncingTitan(false);
    }
  };

  const loadData = useCallback(async () => {
    if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
    setError('');
    try {
      const [calRes, matRes, catsRes] = await Promise.all([
        api.calendar.list(),
        api.matters.list({ limit: 500 }),
        api.calendar.listCategories({ include_inactive: true }),
      ]);
      setEvents(calRes.data || []);
      const mats = Array.isArray(matRes.data) ? matRes.data : [];
      setMatterPick(mats.map((m) => ({ id: m.id, label: m.matter_number || String(m.id) })));
      
      // Ensure all loaded categories have a sort_order
      const sortedCats = (catsRes.data || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setCategories(sortedCats);
    } catch (e) {
      setError(e.message || 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMoveCategory = async (cat, direction) => {
    const idx = categories.findIndex(c => c.id === cat.id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === categories.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const targetCat = categories[targetIdx];

    const currentOrder = cat.sort_order || 0;
    const targetOrder = targetCat.sort_order || 0;

    const newCurrentOrder = targetOrder;
    const newTargetOrder = currentOrder === targetOrder ? currentOrder + 1 : currentOrder;

    // Optimistic update: swap instantly in local state so UI responds immediately
    const prevCategories = [...categories];
    const updated = [...categories];
    updated[idx] = { ...cat, sort_order: newCurrentOrder };
    updated[targetIdx] = { ...targetCat, sort_order: newTargetOrder };
    updated.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    setCategories(updated);

    try {
      await Promise.all([
        api.calendar.updateCategory(cat.id, { sort_order: newCurrentOrder }),
        api.calendar.updateCategory(targetCat.id, { sort_order: newTargetOrder })
      ]);
    } catch {
      // Roll back to previous order if API fails
      setCategories(prevCategories);
      toast('Failed to reorder category', 'error');
    }
  };

  const handleToggleArchive = async (cat) => {
    try {
      await api.calendar.updateCategory(cat.id, { is_active: !cat.is_active });
      toast(`Category ${cat.is_active ? 'archived' : 'activated'}`, 'success');
      loadData();
    } catch {
      toast('Failed to update category status', 'error');
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('vktori:entities-changed', loadData);
    return () => window.removeEventListener('vktori:entities-changed', loadData);
  }, [loadData]);

  useEffect(() => {
    if (categories.length > 0 && quickType === 'meeting') {
      const found = categories.find(c => c.name.toLowerCase() === 'meeting') || categories[0];
      setQuickType(found.name);
    }
  }, [categories, quickType]);

  const quickTypeOptions = useMemo(() => [
    ...categories.filter(c => c.is_active).map(cat => ({
      value: cat.name,
      label: cat.name,
      color: cat.color
    })),
    { value: 'general_event', label: 'General Event', color: '#10b981' }
  ], [categories]);

  const quickReminderOptions = useMemo(() => [
    { value: '', label: 'No Reminder' },
    { value: '1_hour', label: '1 Hour Before' },
    { value: 'same_day', label: 'Same Day' },
    { value: '1_day', label: '1 Day Before' },
    { value: '3_days', label: '3 Days Before' },
    { value: '7_days', label: '7 Days Before' },
  ], []);

  const quickMatterOptions = useMemo(() => [
    { value: '', label: 'General Schedule' },
    ...matterPick.map(c => ({ value: c.id, label: c.label }))
  ], [matterPick]);

  const getEventColor = (e) => {
    if (e.type === 'invoice') return '#f59e0b';
    if (e.type === 'matter') return '#38bdf8';
    
    if (e.categories && Array.isArray(e.categories) && e.categories.length > 0) {
      const cat = categories.find(c => c.name.toLowerCase() === e.categories[0].toLowerCase());
      if (cat) return cat.color;
    }
    
    const typeColors = {
      hearing: '#ef4444',
      meeting: '#10b981',
      filing_deadline: '#f59e0b',
      consultation: '#38bdf8',
    };
    return typeColors[e.type] || '#10b981';
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      toast('Please enter category name', 'error');
      return;
    }
    try {
      await api.calendar.createCategory({
        name: newCatName.trim(),
        color: newCatColor
      });
      toast('Category created successfully', 'success');
      setNewCatName('');
      setNewCatColor('#0057c7');
      window.dispatchEvent(new Event('vktori:entities-changed'));
    } catch (e) {
      toast(e.message || 'Failed to create category', 'error');
    }
  };

  const startEdit = (cat) => {
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) {
      toast('Please enter category name', 'error');
      return;
    }
    try {
      await api.calendar.updateCategory(id, {
        name: editName.trim(),
        color: editColor
      });
      toast('Category updated successfully', 'success');
      setEditingCatId(null);
      window.dispatchEvent(new Event('vktori:entities-changed'));
    } catch (e) {
      toast(e.message || 'Failed to update category', 'error');
    }
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? Events in this category will keep their tags but their colors will fallback to defaults.')) return;
    try {
      await api.calendar.removeCategory(id);
      toast('Category deleted successfully', 'success');
      window.dispatchEvent(new Event('vktori:entities-changed'));
    } catch (e) {
      toast(e.message || 'Failed to delete category', 'error');
    }
  };

  const handleQuickAdd = async () => {
    if (!quickTitle.trim()) {
      toast('Please enter an event title', 'info');
      return;
    }
    setIsAdding(true);
    try {
      const evDateStr = quickDate || todayPacific.dateStr;
      let reminderDate = null;
      if (quickReminder) {
        const eventUtc = pacificToUTC(evDateStr, '09:00:00');
        const offsetMap = {
          '1_hour': 60 * 60 * 1000,
          '1_day': 24 * 60 * 60 * 1000,
          '3_days': 3 * 24 * 60 * 60 * 1000,
          '7_days': 7 * 24 * 60 * 60 * 1000
        };
        if (quickReminder === 'same_day') {
          reminderDate = eventUtc;
        } else if (offsetMap[quickReminder]) {
          reminderDate = new Date(eventUtc.getTime() - offsetMap[quickReminder]);
        }
      }

      await api.calendar.create({
        title: quickTitle,
        date: evDateStr,
        time: '09:00',
        timezone: 'America/Los_Angeles',
        matter_id: quickMatter || null,
        type: quickType,
        categories: [quickType],
        reminder_date: reminderDate ? reminderDate.toISOString() : null,
        create_task: quickCreateTask
      });
      toast('Event created successfully', 'success');
      setQuickTitle('');
      setQuickMatter('');
      setQuickType('meeting');
      setQuickReminder('');
      setQuickCreateTask(false);
      loadData();
    } catch (e) {
      toast(e.message || 'Failed to create event', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const pad = (n) => String(n).padStart(2, '0');
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = viewDate.getFullYear();
  const monthIdx = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('en-US', { month: 'long' });

  // Month grid days (memoized to avoid re-calculating on dropdown toggles)
  const days = useMemo(() => {
    const list = [];
    const daysInMonth = getDaysInMonth(year, monthIdx);
    const firstDay = getFirstDayOfMonth(year, monthIdx);

    // Prev month padding
    const prevMonthDays = getDaysInMonth(year, monthIdx - 1);
    for (let i = 0; i < firstDay; i++) {
      list.push({ day: prevMonthDays - firstDay + i + 1, other: true });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({ day: d });
    }

    // Next month padding
    while (list.length % 7 !== 0) {
      list.push({ day: list.length - (firstDay + daysInMonth) + 1, other: true });
    }
    return list;
  }, [year, monthIdx]);

  // Week view calculation (Sunday to Saturday)
  const currentDayOfWeek = viewDate.getDay();
  const weekStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - currentDayOfWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const isToday = d.getFullYear() === todayPacific.year && d.getMonth() === todayPacific.monthIdx && d.getDate() === todayPacific.day;
    const isSelected = d.getFullYear() === viewDate.getFullYear() && d.getMonth() === viewDate.getMonth() && d.getDate() === viewDate.getDate();
    return {
      date: d,
      dayNumber: d.getDate(),
      dayName: d.toLocaleString('en-US', { weekday: 'short' }),
      fullDayName: d.toLocaleString('en-US', { weekday: 'long' }),
      dateStr,
      isToday,
      isSelected,
    };
  });

  // Selected day string for Day view
  const selectedDayStr = `${viewDate.getFullYear()}-${pad(viewDate.getMonth() + 1)}-${pad(viewDate.getDate())}`;
  const isSelectedDayToday = viewDate.getFullYear() === todayPacific.year && viewDate.getMonth() === todayPacific.monthIdx && viewDate.getDate() === todayPacific.day;

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setViewDate(new Date(year, monthIdx - 1, 1));
    } else if (viewMode === 'week') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - 7));
    } else if (viewMode === 'day') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setViewDate(new Date(year, monthIdx + 1, 1));
    } else if (viewMode === 'week') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + 7));
    } else if (viewMode === 'day') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + 1));
    }
  };

  const handleToday = () => {
    setViewDate(new Date(todayPacific.year, todayPacific.monthIdx, todayPacific.day));
  };

  // Center navigation label
  let navLabel = `${monthName} ${year}`;
  if (viewMode === 'week') {
    const sMonth = weekDays[0].date.toLocaleString('en-US', { month: 'short' });
    const eMonth = weekDays[6].date.toLocaleString('en-US', { month: 'short' });
    if (sMonth === eMonth) {
      navLabel = `${sMonth} ${weekDays[0].dayNumber} – ${weekDays[6].dayNumber}, ${weekDays[6].date.getFullYear()}`;
    } else {
      navLabel = `${sMonth} ${weekDays[0].dayNumber} – ${eMonth} ${weekDays[6].dayNumber}, ${weekDays[6].date.getFullYear()}`;
    }
  } else if (viewMode === 'day') {
    navLabel = `${viewDate.toLocaleString('en-US', { weekday: 'short' })}, ${viewDate.toLocaleString('en-US', { month: 'short' })} ${viewDate.getDate()}, ${viewDate.getFullYear()}`;
  }

  const headerSubtitle = viewMode === 'month'
    ? `${monthName} ${year} · Pacific Time (${getPacificTimezoneAbbr(viewDate)}) · Manage hearings, deadlines & meetings`
    : viewMode === 'week'
    ? `Week of ${navLabel} · Pacific Time (${getPacificTimezoneAbbr(viewDate)}) · Manage hearings, deadlines & meetings`
    : `${viewDate.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · Pacific Time (${getPacificTimezoneAbbr(viewDate)})`;

  const getTypeStyle = (type) => {
    switch (type) {
      case 'invoice': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'matter': return 'bg-[#0057c7]/20 text-[#38bdf8] border-[#0057c7]/30';
      case 'hearing': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  const sameDay = (d1, d2) => isSamePacificDay(d1, d2);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterType === 'all') return true;
      return e.type === filterType;
    });
  }, [events, filterType]);

  // High-performance date lookup map: O(1) cell lookup instead of O(cells * events) loops
  const eventsByDate = useMemo(() => {
    const map = {};
    for (let i = 0; i < filteredEvents.length; i++) {
      const e = filteredEvents[i];
      const p = getPacificParts(e.date);
      if (p && p.dateStr) {
        if (!map[p.dateStr]) map[p.dateStr] = [];
        map[p.dateStr].push(e);
      }
    }
    // Sort each day's events chronologically by start time
    for (const d in map) {
      map[d].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return map;
  }, [filteredEvents]);

  const dayEvents = useMemo(() => {
    return eventsByDate[selectedDayStr] || [];
  }, [eventsByDate, selectedDayStr]);

  const sideAgendaEvents = useMemo(() => {
    if (viewMode === 'day') {
      const list = [...(eventsByDate[selectedDayStr] || [])];
      return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    if (viewMode === 'week') {
      const res = [];
      for (let i = 0; i < weekDays.length; i++) {
        const dEvts = eventsByDate[weekDays[i].dateStr];
        if (dEvts && dEvts.length > 0) res.push(...dEvts);
      }
      return res.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    // month view
    const res = [];
    for (let i = 0; i < days.length; i++) {
      if (!days[i].other) {
        const cDate = `${year}-${pad(monthIdx + 1)}-${pad(days[i].day)}`;
        const dEvts = eventsByDate[cDate];
        if (dEvts && dEvts.length > 0) res.push(...dEvts);
      }
    }
    return res.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [viewMode, eventsByDate, selectedDayStr, weekDays, days, year, monthIdx]);

  const agendaTitle = viewMode === 'day'
    ? `Agenda: ${viewDate.toLocaleString('en-US', { month: 'short', day: 'numeric' })}`
    : viewMode === 'week'
    ? 'Agenda: This Week'
    : `Agenda: ${monthName}`;

  const isOverdue = (date) => {
    const p = getPacificParts(date);
    if (!p) return false;
    const dateNum = p.year * 10000 + p.month * 100 + p.day;
    const todayNum = todayPacific.year * 10000 + todayPacific.month * 100 + todayPacific.day;
    return dateNum < todayNum;
  };

  const isDueToday = (date) => {
    const p = getPacificParts(date);
    if (!p) return false;
    return p.year === todayPacific.year && p.month === todayPacific.month && p.day === todayPacific.day;
  };

  if (loading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="w-10 h-10 border-4 border-[#0057c7] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-[#8a94a6] font-bold uppercase tracking-widest">Initializing Calendar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in space-y-4">
        <Card className="border-red-500/20 bg-red-500/5 text-center p-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-xl font-800 text-white mb-2">Sync Interrupted</p>
          <p className="text-[14px] text-[#8a94a6] mb-6 max-w-md mx-auto">{error}</p>
          <button type="button" onClick={loadData} className="btn btn-primary px-8">Reconnect Calendar</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <PageHeader title="Calendar" subtitle={headerSubtitle}>
        {/* Navigation Controls: Prev, Range Label, Next */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 p-1 rounded-xl">
          <button onClick={handlePrev} className="p-2 hover:bg-white/5 rounded-lg text-white transition-colors" title="Previous">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-[13px] font-800 text-white px-4 min-w-[140px] text-center uppercase tracking-widest">{navLabel}</span>
          <button onClick={handleNext} className="p-2 hover:bg-white/5 rounded-lg text-white transition-colors" title="Next">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Today quick jump (commented out per user request) */}
        {/* <button
          onClick={handleToday}
          className="px-3.5 py-2 rounded-xl text-[12px] font-800 uppercase tracking-wider bg-white/[0.04] border border-white/10 text-white/90 hover:bg-white/[0.08] hover:border-white/20 hover:text-white transition-all cursor-pointer"
        >
          Today
        </button> */}

        {/* View mode dropdown: Day, Week, Month */}
        <div ref={viewDropdownRef} className="relative inline-block text-left">
          <button
            type="button"
            onClick={() => setIsViewDropdownOpen(prev => !prev)}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-[12px] font-800 uppercase tracking-wider transition-all cursor-pointer ${
              isViewDropdownOpen
                ? 'bg-[#0057c7]/20 border-2 border-[#38bdf8] text-white shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                : 'bg-white/[0.04] border border-white/10 text-white/90 hover:bg-white/[0.08] hover:border-white/20 hover:text-white'
            }`}
          >
            <span>{viewMode === 'day' ? 'Day' : viewMode === 'week' ? 'Week' : 'Month'}</span>
            <svg
              className={`w-3.5 h-3.5 text-[#8a94a6] transition-transform duration-200 ${isViewDropdownOpen ? 'rotate-180 text-[#38bdf8]' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isViewDropdownOpen && (
            <div
              className="absolute left-0 mt-2 w-36 bg-[#0c1322] border border-white/15 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl p-1 z-[80] animate-fade-in divide-y divide-white/5"
              role="menu"
            >
              {[
                { id: 'day', label: 'Day' },
                { id: 'week', label: 'Week' },
                { id: 'month', label: 'Month' }
              ].map(opt => {
                const isSelected = viewMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setViewMode(opt.id);
                      setIsViewDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#0057c7]/20 text-[#38bdf8] font-bold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                    role="menuitem"
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_6px_#38bdf8]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mr-auto ml-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-900 uppercase tracking-widest whitespace-nowrap transition-all ${filterType === 'all' ? 'bg-[#38bdf8] text-black font-extrabold' : 'bg-white/5 text-[#8a94a6] hover:bg-white/10 hover:text-white'}`}
          >
            All
          </button>
          {categories.filter(c => c.is_active).map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterType(cat.name.toLowerCase())}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-900 uppercase tracking-widest whitespace-nowrap transition-all`}
              style={filterType === cat.name.toLowerCase() ? { backgroundColor: cat.color, color: '#000', fontWeight: '900' } : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#8a94a6' }}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <button
          onClick={handleSyncTitan}
          disabled={syncingTitan}
          className="btn btn-secondary shadow-md flex items-center gap-1.5"
          title="Synchronize real two-way Titan Calendar (CalDAV)"
        >
          <svg className={`w-4 h-4 ${syncingTitan ? 'animate-spin text-[#38bdf8]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncingTitan ? 'Syncing...' : 'Sync Titan'}
        </button>
        <button onClick={() => setIsManageCatsOpen(true)} className="btn btn-secondary shadow-md flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Categories
        </button>
        <button onClick={() => openModal('add-event')} className="btn btn-primary shadow-[#0057c7]/20">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Event
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {/* MONTH VIEW */}
          {viewMode === 'month' && (
            <Card className="!p-0 overflow-hidden border-white/5 bg-white/[0.02]">
              <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.03]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="py-4 text-center text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em]">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-white/5 border-b border-white/5">
                {days.map(({ day, other }, i) => {
                  const cellDateStr = `${year}-${pad(monthIdx + 1)}-${pad(day)}`;
                  const evts = other ? [] : (eventsByDate[cellDateStr] || []);
                  const isCellToday = !other && day === todayPacific.day && monthIdx === todayPacific.monthIdx && year === todayPacific.year;

                  return (
                    <div key={i} onClick={() => openModal('add-event', { date: cellDateStr })} className={`min-h-[120px] p-2 ${other ? 'bg-black/20' : 'hover:bg-white/[0.04]'} cursor-pointer transition-all group relative overflow-hidden`}>
                      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                        <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" /></svg>
                      </div>
                      <div className={`w-7 h-7 flex items-center justify-center text-[12px] mb-2 rounded-xl transition-all ${isCellToday ? 'bg-gradient-to-br from-[#0057c7] to-[#38bdf8] text-white font-900 shadow-[0_4px_12px_rgba(56,189,248,0.4)]' : other ? 'text-white/10' : 'text-white/40 font-800'}`}>{day}</div>
                      <div className="space-y-1 relative z-10">
                        {evts.map((e, j) => {
                          const evColor = getEventColor(e);
                          let alertBadge = null;
                          let customStyle = {
                            backgroundColor: `${evColor}1A`,
                            color: evColor,
                            borderColor: `${evColor}33`
                          };
                          if (e.event_status !== 'completed') {
                            if (isOverdue(e.date)) {
                              customStyle = {
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                color: '#f87171',
                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                boxShadow: '0 0 8px rgba(239, 68, 68, 0.3)'
                              };
                              alertBadge = <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 ml-1"></span>;
                            } else if (isDueToday(e.date)) {
                              customStyle = {
                                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                color: '#fbbf24',
                                borderColor: 'rgba(245, 158, 11, 0.4)',
                                boxShadow: '0 0 8px rgba(245, 158, 11, 0.3)'
                              };
                              alertBadge = <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 ml-1"></span>;
                            }
                          }
                          
                          return (
                            <div
                              key={j}
                              onClick={(ev) => { ev.stopPropagation(); openModal('view-event', e); }}
                              className="text-[10px] font-800 px-2 py-1 rounded-lg truncate border shadow-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between"
                              style={customStyle}
                            >
                              <span className="truncate">{e.title}</span>
                              {alertBadge}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <Card className="!p-0 overflow-hidden border-white/5 bg-white/[0.02]">
              <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.03]">
                {weekDays.map((w) => (
                  <div
                    key={w.dateStr}
                    onClick={() => { setViewDate(w.date); setViewMode('day'); }}
                    className={`py-3.5 px-2 text-center border-r border-white/5 last:border-r-0 cursor-pointer hover:bg-white/[0.04] transition-colors ${
                      w.isToday ? 'bg-[#0057c7]/10' : ''
                    }`}
                    title="Click to view this Day"
                  >
                    <div className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em]">
                      {w.dayName}
                    </div>
                    <div className="mt-1 flex items-center justify-center">
                      <span
                        className={`w-7 h-7 flex items-center justify-center text-[13px] rounded-xl transition-all ${
                          w.isToday
                            ? 'bg-gradient-to-br from-[#0057c7] to-[#38bdf8] text-white font-900 shadow-[0_4px_12px_rgba(56,189,248,0.4)]'
                            : 'text-white/80 font-800'
                        }`}
                      >
                        {w.dayNumber}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-white/5 min-h-[520px]">
                {weekDays.map((w) => {
                  const evts = eventsByDate[w.dateStr] || [];

                  return (
                    <div
                      key={w.dateStr}
                      onClick={() => openModal('add-event', { date: w.dateStr })}
                      className={`p-2 flex flex-col justify-between cursor-pointer transition-all hover:bg-white/[0.03] group relative ${
                        w.isToday ? 'bg-white/[0.01]' : ''
                      }`}
                    >
                      <div className="space-y-1.5 relative z-10 flex-1">
                        {evts.map((e, j) => {
                          const evColor = getEventColor(e);
                          const evTime = formatPSTTime(e.date);
                          let alertBadge = null;
                          let customStyle = {
                            backgroundColor: `${evColor}1A`,
                            color: evColor,
                            borderColor: `${evColor}33`,
                          };
                          if (e.event_status !== 'completed') {
                            if (isOverdue(e.date)) {
                              customStyle = {
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                color: '#f87171',
                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                boxShadow: '0 0 8px rgba(239, 68, 68, 0.3)',
                              };
                              alertBadge = <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 ml-1"></span>;
                            } else if (isDueToday(e.date)) {
                              customStyle = {
                                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                color: '#fbbf24',
                                borderColor: 'rgba(245, 158, 11, 0.4)',
                                boxShadow: '0 0 8px rgba(245, 158, 11, 0.3)',
                              };
                              alertBadge = <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 ml-1"></span>;
                            }
                          }

                          return (
                            <div
                              key={j}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                openModal('view-event', e);
                              }}
                              className="p-2 rounded-xl border text-[11px] font-medium shadow-sm transition-all hover:scale-[1.02] active:scale-95 space-y-1"
                              style={customStyle}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold opacity-80">
                                <span>{evTime || 'All Day'}</span>
                                {alertBadge}
                              </div>
                              <div className="font-bold truncate text-[11px]">{e.title}</div>
                              {e.type && (
                                <div className="text-[9px] uppercase tracking-wider opacity-60 font-semibold truncate">
                                  {e.type.replace('_', ' ')}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {evts.length === 0 && (
                          <div className="h-full flex items-center justify-center py-10 opacity-0 group-hover:opacity-60 transition-opacity text-center">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">+ Add</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                        <span className="text-[9px] font-extrabold text-[#38bdf8] uppercase tracking-wider">+ Event</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* DAY VIEW */}
          {viewMode === 'day' && (
            <Card className="!p-0 overflow-hidden border-white/5 bg-white/[0.02]">
              {/* Day Banner Header */}
              <div className="p-6 border-b border-white/5 bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-transparent flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-900 text-white tracking-tight">
                      {viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </h2>
                    {isSelectedDayToday && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-900 uppercase tracking-widest bg-gradient-to-r from-[#0057c7] to-[#38bdf8] text-white shadow-[0_0_12px_rgba(56,189,248,0.4)]">
                        Today
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#8a94a6] font-semibold mt-1">
                    {dayEvents.length} event{dayEvents.length === 1 ? '' : 's'} scheduled · Pacific Time ({getPacificTimezoneAbbr(viewDate)})
                  </p>
                </div>

                <button
                  onClick={() => openModal('add-event', { date: selectedDayStr })}
                  className="btn btn-primary text-[12px] font-bold px-4 py-2 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Schedule for this Day
                </button>
              </div>

              {/* Day Events List */}
              <div className="p-6 space-y-4 min-h-[460px]">
                {dayEvents.length > 0 ? (
                  <div className="space-y-3">
                    {dayEvents.map((e, idx) => {
                      const evColor = getEventColor(e);
                      const timeStr = formatPSTTime(e.date);
                      const isCompleted = e.event_status === 'completed';
                      const overdue = !isCompleted && isOverdue(e.date);
                      const dueToday = !isCompleted && isDueToday(e.date);

                      return (
                        <div
                          key={e.id || idx}
                          onClick={() => openModal('view-event', e)}
                          className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-[#38bdf8]/40 transition-all cursor-pointer group relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start sm:items-center gap-4">
                            {/* Time Box */}
                            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-center flex-shrink-0 group-hover:scale-105 transition-transform">
                              <span className="text-[14px] font-900 text-white block tracking-tight">
                                {timeStr || 'All Day'}
                              </span>
                              <span className="text-[9px] font-bold text-[#38bdf8] uppercase tracking-wider block mt-0.5">
                                {getPacificTimezoneAbbr(e.date)}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-[16px] font-800 text-white tracking-tight group-hover:text-[#38bdf8] transition-colors">
                                  {e.title}
                                </h4>
                                {overdue && (
                                  <span className="text-[9px] font-900 bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Overdue
                                  </span>
                                )}
                                {dueToday && (
                                  <span className="text-[9px] font-900 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Due Today
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="text-[9px] font-900 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Completed
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-[#8a94a6] flex-wrap font-medium">
                                <span
                                  className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider"
                                  style={{ backgroundColor: `${evColor}20`, color: evColor }}
                                >
                                  {(e.categories && e.categories[0]) || e.type?.replace('_', ' ') || 'Event'}
                                </span>
                                {e.matter_number && (
                                  <span className="text-white/60 font-semibold">
                                    Matter: #{e.matter_number}
                                  </span>
                                )}
                                {e.location && (
                                  <span className="flex items-center gap-1 text-white/50">
                                    📍 {e.location}
                                  </span>
                                )}
                              </div>

                              {e.description && (
                                <p className="text-[12px] text-[#8a94a6] line-clamp-2 mt-1">
                                  {e.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <span className="text-[12px] font-bold text-[#38bdf8] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              View Details →
                            </span>
                            <div
                              className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]"
                              style={{ color: evColor, backgroundColor: evColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01] flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-2xl mb-4 text-[#8a94a6]">
                      📅
                    </div>
                    <h4 className="text-[15px] font-bold text-white mb-1">No Events Scheduled</h4>
                    <p className="text-[12px] text-[#8a94a6] max-w-sm mb-6">
                      There are no court dates, hearings, or meetings scheduled for this day in Pacific Time.
                    </p>
                    <button
                      onClick={() => openModal('add-event', { date: selectedDayStr })}
                      className="btn btn-primary text-[12px] font-bold px-6 py-2.5"
                    >
                      + Create Event for this Day
                    </button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-white/[0.02] border-white/5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[11px] font-900 text-white uppercase tracking-[0.25em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]" />
                {agendaTitle}
              </h3>
              {sideAgendaEvents.length > 0 && (
                <span className="text-[10px] font-800 px-2.5 py-0.5 rounded-full bg-[#0057c7]/20 text-[#38bdf8] border border-[#0057c7]/30">
                  {sideAgendaEvents.length} {sideAgendaEvents.length === 1 ? 'event' : 'events'}
                </span>
              )}
            </div>
            <div className="space-y-2.5">
              {sideAgendaEvents.length > 0 ? sideAgendaEvents.map((e, i) => {
                const p = getPacificParts(e.date);
                const evDateObj = p ? new Date(Date.UTC(p.year, p.monthIdx, p.day, 12, 0, 0)) : new Date();
                const dayOfWeekShort = evDateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const monthShort = evDateObj.toLocaleDateString('en-US', { month: 'short' });
                const evTimeFormatted = formatPSTTime(e.date);
                const evColor = getEventColor(e);
                const isOver = e.event_status !== 'completed' && isOverdue(e.date);
                const isDue = e.event_status !== 'completed' && isDueToday(e.date);

                return (
                  <div
                    key={i}
                    onClick={() => openModal('view-event', e)}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-[#38bdf8]/30 transition-all group cursor-pointer shadow-lg hover:shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#0057c7]/5 blur-2xl pointer-events-none group-hover:bg-[#0057c7]/15 transition-all duration-500" />
                    
                    {/* Left Date Block */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 flex flex-col items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:border-[#38bdf8]/40 transition-all shadow-inner">
                      <span className="text-[9px] font-900 text-[#38bdf8] uppercase tracking-wider leading-none">
                        {viewMode === 'month' ? monthShort : dayOfWeekShort}
                      </span>
                      <span className="text-[17px] font-900 text-white tracking-tight leading-none mt-1">
                        {p?.day || '—'}
                      </span>
                    </div>

                    {/* Event Info */}
                    <div className="flex-1 min-w-0 relative z-10 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-700 text-white truncate tracking-tight group-hover:text-[#38bdf8] transition-colors">
                          {e.title}
                        </p>
                        {isOver && (
                          <span className="shrink-0 text-[8px] font-900 bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Overdue
                          </span>
                        )}
                        {isDue && (
                          <span className="shrink-0 text-[8px] font-900 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Due Today
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#8a94a6]">
                        <span className="flex items-center gap-1 font-700 text-white/80">
                          <svg className="w-3 h-3 text-[#38bdf8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {evTimeFormatted ? `${evTimeFormatted} PDT` : 'All Day'}
                        </span>
                        <span className="text-white/20">•</span>
                        <span className="text-[10px] font-800 text-[#8a94a6] uppercase tracking-wider truncate">
                          {(e.categories && e.categories[0]) || (e.type ? e.type.replace('_', ' ') : 'General')}
                        </span>
                      </div>
                    </div>

                    {/* Right indicator dot */}
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                      style={{ color: evColor, backgroundColor: evColor }}
                      title={e.type || 'Event'}
                    />
                  </div>
                );
              }) : (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                  <p className="text-[12px] text-[#8a94a6] font-800 uppercase tracking-widest opacity-40">No entries detected</p>
                  <p className="text-[10px] text-[#8a94a6] mt-2 italic">Calendar sync optimized.</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-slate-900 to-[#0057c7]/20 border-white/10 shadow-2xl relative group">
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl group-hover:bg-primary-500/20 transition-all duration-700" />
            </div>
            <h3 className="text-[11px] font-900 uppercase tracking-[0.3em] mb-6 text-[#38bdf8]">Quick Entry Terminal</h3>
            <div className="space-y-4">
              <div className="relative group/input">
                <input
                  className="w-full text-[13px] bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 outline-none focus:border-[#38bdf8] focus:ring-4 focus:ring-[#0057c7]/20 transition-all font-600"
                  placeholder="Event title or subject..."
                  value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)}
                />
              </div>
              <div className="relative group/input">
                <input
                  type="date"
                  className="w-full text-[13px] bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#38bdf8] focus:ring-4 focus:ring-[#0057c7]/20 transition-all [color-scheme:dark] font-600"
                  value={quickDate}
                  onChange={e => setQuickDate(e.target.value)}
                />
              </div>
              <CustomSelect
                value={quickType}
                onChange={setQuickType}
                options={quickTypeOptions}
                placeholder="Select event type..."
              />
              <CustomSelect
                value={quickReminder}
                onChange={setQuickReminder}
                options={quickReminderOptions}
                placeholder="No Reminder"
              />
              {['court_date', 'filing_deadline', 'hearing', 'trial_date'].includes(quickType) && (
                <div className="flex items-center gap-2 px-1">
                  <input type="checkbox" id="quickTask" checked={quickCreateTask} onChange={e => setQuickCreateTask(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-black/20 text-[#38bdf8] focus:ring-[#38bdf8]/50" />
                  <label htmlFor="quickTask" className="text-[12px] font-500 text-white cursor-pointer">Auto Create Task</label>
                </div>
              )}
              <CustomSelect
                value={quickMatter}
                onChange={setQuickMatter}
                options={quickMatterOptions}
                placeholder="General Schedule"
              />
              <button
                onClick={handleQuickAdd}
                disabled={isAdding}
                className="btn btn-primary w-full justify-center h-12 text-[12px] font-900 uppercase tracking-widest shadow-xl shadow-[#0057c7]/20 disabled:opacity-50 active:scale-[0.98]"
              >
                {isAdding ? 'Dispatching...' : 'Schedule Event →'}
              </button>
            </div>
          </Card>
        </div>
      </div>

      {isManageCatsOpen && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121826] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-900 text-white tracking-tight">Manage Calendar Categories</h3>
                <p className="text-[11px] text-[#8a94a6] font-500 mt-1">Add, rename, delete, archive or reorder categories.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowArchived(prev => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-900 uppercase tracking-widest whitespace-nowrap transition-all border ${showArchived ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-[#8a94a6] border-white/5 hover:text-white'}`}
                >
                  {showArchived ? 'Hide Archived' : 'Show Archived'}
                </button>
                <button 
                  onClick={() => setIsManageCatsOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar">
              {categories.filter(c => showArchived ? true : c.is_active).map((cat, idx, arr) => {
                const isEditing = editingCatId === cat.id;
                return (
                  <div key={cat.id} className={`flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl gap-3 ${!cat.is_active ? 'opacity-50 grayscale' : ''}`}>
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-grow">
                        <input 
                          type="color" 
                          value={editColor} 
                          onChange={e => setEditColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 outline-none flex-shrink-0"
                        />
                        <input 
                          type="text" 
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-[13px] text-white outline-none focus:border-[#38bdf8] flex-grow"
                        />
                        <button onClick={() => handleSaveEdit(cat.id)} className="btn btn-primary btn-xs font-semibold py-1">Save</button>
                        <button onClick={() => setEditingCatId(null)} className="btn btn-secondary btn-xs font-semibold py-1">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Reordering arrows */}
                          <div className="flex flex-col gap-0.5 mr-1">
                            <button 
                              onClick={() => handleMoveCategory(cat, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 text-white/40 hover:text-white disabled:opacity-20 transition-colors"
                              title="Move Up"
                            >
                              ▲
                            </button>
                            <button 
                              onClick={() => handleMoveCategory(cat, 'down')}
                              disabled={idx === arr.length - 1}
                              className="p-0.5 text-white/40 hover:text-white disabled:opacity-20 transition-colors"
                              title="Move Down"
                            >
                              ▼
                            </button>
                          </div>
                          <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: cat.color }} />
                          <span className="text-[13px] font-800 text-white truncate">{cat.name}</span>
                          {!cat.is_active && (
                            <span className="text-[9px] font-900 bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-widest">Archived</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            onClick={() => startEdit(cat)}
                            className="w-7 h-7 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-colors"
                            title="Edit Category"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button 
                            onClick={() => handleToggleArchive(cat)}
                            className={`w-7 h-7 border rounded-lg flex items-center justify-center transition-colors ${cat.is_active ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400 hover:text-amber-300' : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400 hover:text-emerald-300'}`}
                            title={cat.is_active ? 'Archive Category' : 'Activate Category'}
                          >
                            {cat.is_active ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" /></svg>
                            )}
                          </button>
                          <button 
                            onClick={() => handleDeleteCat(cat.id)}
                            className="w-7 h-7 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                            title="Delete Category"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Form to Add New Category */}
            <div className="p-6 border-t border-white/5 bg-white/[0.01] space-y-3">
              <h4 className="text-[11px] font-900 text-white uppercase tracking-wider">Create New Category</h4>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={newCatColor} 
                  onChange={e => setNewCatColor(e.target.value)}
                  className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0 outline-none flex-shrink-0"
                />
                <input 
                  type="text" 
                  placeholder="E.g., Client Consultation"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[13px] text-white outline-none focus:border-[#38bdf8] flex-grow font-600"
                />
                <button 
                  onClick={handleAddCategory} 
                  className="btn btn-primary h-9 px-4 font-800 text-[11px] uppercase tracking-widest shrink-0"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  DOCUMENTS PAGE
// ─────────────────────────────────────────────────────────
export function DocumentsPage({ toast, openModal, role = 'lawyer' }) {
  const isAdmin = role !== 'client';
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [currentPathSegments, setCurrentPathSegments] = useState([]);
  const [remoteDocs, setRemoteDocs] = useState([]);
  const [remoteFolders, setRemoteFolders] = useState([]);
  const [docLoading, setDocLoading] = useState(isAdmin);
  const [docError, setDocError] = useState('');
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const isFirstLoad = useRef(true);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFolder, search, currentPathSegments]);

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    setRemoteDocs(prev => {
      if (prev.length === 0) if (isFirstLoad.current) { setDocLoading(true); isFirstLoad.current = false; }
      return prev;
    });
    setDocError('');
    try {
      const [docRes, folderRes] = await Promise.all([
        api.documents.list({ limit: 'all' }),
        api.folders.list()
      ]);
      setRemoteDocs(Array.isArray(docRes.data) ? docRes.data : []);
      setRemoteFolders(Array.isArray(folderRes.data) ? folderRes.data : []);
    } catch (e) {
      setDocError(e.message || 'Failed to load document data');
    } finally {
      setDocLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    window.addEventListener('vktori:entities-changed', fetchData);
    return () => window.removeEventListener('vktori:entities-changed', fetchData);
  }, [fetchData]);

  const folders = (() => {
    const buckets = [...new Set([
      'Complaint', 'Evidence', 'Contract', 'Court order',
      ...remoteFolders.map(f => f.name)
    ])];
    const by = Object.fromEntries(buckets.map((name) => [name, 0]));
    remoteDocs.forEach((d) => {
      const bucket = documentFolderBucket(d.category);
      if (bucket && bucket in by) by[bucket] += 1;
    });
    return buckets.map((name) => ({ name, count: by[name] || 0 }));
  })();

  const rootDocs = remoteDocs.filter(d => {
    if (!selectedFolder) return false;
    return documentFolderBucket(d.category) === selectedFolder;
  });

  const currentPath = currentPathSegments.join('/');
  const prefix = currentPath === "" ? "" : currentPath + "/";

  // Subfolders at current level
  const subfolders = (() => {
    if (!selectedFolder || search) return [];
    const names = [...new Set(
      rootDocs
        .map(d => d.folder_path || "")
        .filter(p => p !== currentPath && p.startsWith(prefix))
        .map(p => p.slice(prefix.length).split('/')[0])
    )].filter(Boolean);

    return names.map(name => {
      const subPath = prefix + name;
      const count = rootDocs.filter(d => {
        const dp = d.folder_path || "";
        return dp === subPath || dp.startsWith(subPath + '/');
      }).length;
      return { name, count };
    });
  })();

  const filtered = (() => {
    let list = remoteDocs;
    if (selectedFolder) {
      if (search) {
        list = rootDocs;
      } else {
        list = rootDocs.filter(d => (d.folder_path || "") === currentPath);
      }
    }
    return list
      .map((d) => ({
        id: d.id,
        name: d.original_name,
        type: matterMimeToFileType(d.mime_type),
        size: `${Math.max(1, Math.round(d.file_size / 1024))} KB`,
        uploaded: new Date(d.created_at).toLocaleDateString(),
        caseId: d.matter?.matter_number || '—',
      }))
      .filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
  })();

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedDocs = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isAdmin && docLoading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="w-10 h-10 border-4 border-[#0057c7] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-[#8a94a6] font-bold uppercase tracking-widest">Initializing Vault...</p>
      </div>
    );
  }

  if (isAdmin && docError) {
    return (
      <div className="animate-fade-in space-y-4">
        <Card className="border-red-500/20 bg-red-500/5 text-center p-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-xl font-800 text-white mb-2">Vault Connection Interrupted</p>
          <p className="text-[14px] text-[#8a94a6] mb-6 max-w-md mx-auto">{docError}</p>
          <button type="button" onClick={fetchData} className="btn btn-primary px-8">Reconnect Vault</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <PageHeader title="Documents" subtitle="Secure repository for all matter evidence & case files">
        <button onClick={() => openModal('add-document', selectedFolder ? { docCategory: selectedFolder } : null)} className="btn btn-secondary border-white/10 hover:bg-white/5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          Upload File
        </button>
        <button onClick={() => openModal('add-folder')} className="btn btn-primary shadow-[#0057c7]/20">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Folder
        </button>
      </PageHeader>

      <Card className="bg-white/[0.02] border-white/5">
        <h3 className="text-[11px] font-900 text-white uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
          Matter Repository Folders
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {folders.map(f => (
            <div
              key={f.name}
              onClick={() => {
                setSelectedFolder((prev) => (prev === f.name ? null : f.name));
                setCurrentPathSegments([]);
              }}
              className={`flex flex-col items-center p-5 rounded-2xl border cursor-pointer transition-all group relative overflow-hidden ${selectedFolder === f.name
                  ? 'border-[#f59e0b] bg-[#f59e0b]/5 ring-1 ring-[#f59e0b]/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                  : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10'
                }`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:opacity-[0.06] transition-opacity">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" /></svg>
              </div>
              <div className={`mb-3 transition-transform group-hover:scale-110 ${selectedFolder === f.name ? 'text-[#f59e0b]' : 'text-[#8a94a6]'}`}>
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className={`text-[13px] font-800 text-center leading-tight mb-1 tracking-tight ${selectedFolder === f.name ? 'text-white' : 'text-[#b8c2d1]'}`}>{f.name}</p>
              <p className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest opacity-60">{f.count} objects</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-white/[0.02] border-white/5">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h3 className="text-[11px] font-900 text-white uppercase tracking-[0.3em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
              Recent Objects & Files
            </h3>
            {selectedFolder && (
              <p className="text-[10px] text-[#38bdf8] font-900 uppercase tracking-widest mt-2">Active Filter: {selectedFolder}</p>
            )}
          </div>
          <div className="w-full sm:w-72">
            <SearchInput placeholder="Search within vault..." value={search} onChange={setSearch} />
          </div>
        </div>

        {/* Breadcrumbs for global view subfolders */}
        {selectedFolder && (
          <div className="flex items-center gap-2 text-[11px] font-800 text-[#8a94a6] bg-white/[0.02] border border-white/5 px-4 py-2.5 rounded-xl uppercase tracking-wider mb-6">
            <span 
              className="hover:text-white cursor-pointer transition-colors"
              onClick={() => {
                setCurrentPathSegments([]);
              }}
            >
              📁 {selectedFolder}
            </span>
            {currentPathSegments.map((segment, idx) => (
              <React.Fragment key={idx}>
                <span className="text-white/20">/</span>
                <span 
                  className="hover:text-white cursor-pointer transition-colors"
                  onClick={() => {
                    setCurrentPathSegments(prev => prev.slice(0, idx + 1));
                  }}
                >
                  {segment}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Global subfolders grid */}
        {subfolders.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {subfolders.map(sub => (
              <div
                key={sub.name}
                onClick={() => setCurrentPathSegments(prev => [...prev, sub.name])}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 cursor-pointer transition-all group"
              >
                <span className="text-2xl text-[#f59e0b] group-hover:scale-115 transition-transform">
                  📁
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-800 text-white truncate leading-tight">{sub.name}</p>
                  <p className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest mt-1">{sub.count} items</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {paginatedDocs.length > 0 ? paginatedDocs.map(d => (
            <div key={d.id} className="flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-[#38bdf8]/30 transition-all group cursor-pointer shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#0057c7]/5 blur-3xl pointer-events-none group-hover:bg-[#0057c7]/10" />
              <div className="flex items-start justify-between relative z-10">
                <FileIcon type={d.type} />
                <div className="text-right">
                  <p className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest opacity-60 leading-none mb-1">Uploaded</p>
                  <p className="text-[11px] text-white font-800 tracking-tight">{d.uploaded}</p>
                </div>
              </div>
              <div className="relative z-10 flex-1">
                <p className="text-[14px] font-800 text-white group-hover:text-[#38bdf8] transition-colors line-clamp-2 leading-tight tracking-tight mb-2 min-h-[2.5em]">{d.name}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[10px] text-[#38bdf8] font-900 bg-[#0057c7]/10 border border-[#0057c7]/20 px-2 py-0.5 rounded-md uppercase tracking-widest">{d.caseId}</span>
                  <span className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest opacity-40">{d.size}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 relative z-10">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await previewDocumentBlob(d.id, openModal, d.name);
                    } catch (err) {
                      toast(err.message || 'Preview failed', 'error');
                    }
                  }}
                  className="btn btn-secondary justify-center text-[10px] font-900 uppercase tracking-widest h-10 border-white/10 hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] hover:border-[#38bdf8]/30 transition-all"
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  Preview
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await downloadDocumentBlob(d.id, d.name);
                      toast(`${d.name} download started`, 'success');
                    } catch (err) {
                      toast(err.message || 'Download failed', 'error');
                    }
                  }}
                  className="btn btn-secondary justify-center text-[10px] font-900 uppercase tracking-widest h-10 border-white/10 hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] hover:border-[#38bdf8]/30 transition-all"
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Download
                </button>
              </div>
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDocumentToDelete(d);
                  }}
                  className="mt-2 w-full btn btn-secondary justify-center text-[10px] font-900 uppercase tracking-widest h-10 border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all relative z-10"
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete
                </button>
              )}
            </div>


          )) : (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
              <div className="w-20 h-20 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                <svg className="w-10 h-10 text-[#8a94a6]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <p className="text-[14px] text-white font-800 tracking-tight mb-1">No objects found</p>
              <p className="text-[12px] text-[#8a94a6] font-500">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-8">
            <span className="text-[11px] text-[#8a94a6] font-900 uppercase tracking-widest">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} objects
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="btn btn-secondary px-3 py-1.5 text-xs font-bold disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      currentPage === pageNum
                        ? 'bg-[#38bdf8] text-black shadow-lg shadow-[#38bdf8]/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="btn btn-secondary px-3 py-1.5 text-xs font-bold disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {documentToDelete && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#0a0f1a] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0 border border-red-500/20">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-800 text-white leading-tight">Delete Document?</h3>
                <p className="text-xs text-[#8a94a6] font-500 mt-1">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-sm text-white/80 mb-6 bg-white/5 p-3 rounded-lg border border-white/5 break-words line-clamp-2">
              <span className="font-700 opacity-50 mr-2">File:</span>
              <span className="font-800 text-white">{documentToDelete.name}</span>
            </p>
            
            <div className="flex gap-3 relative z-10">
              <button
                onClick={() => setDocumentToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 bg-transparent border border-white/10 hover:bg-white/5 text-white text-xs font-800 uppercase tracking-wider rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await api.documents.remove(documentToDelete.id);
                    toast(`Document deleted successfully`, 'success');
                    window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
                    setDocumentToDelete(null);
                  } catch (err) {
                    toast(err.message || 'Delete failed', 'error');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-800 uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  BILLING PAGE
// ─────────────────────────────────────────────────────────
export function BillingPage({ openModal, toast, navigate, role = 'lawyer' }) {
  const isAdmin = role !== 'client';
  const canMarkPaid = role === 'admin';
  const [tab, setTab] = useState('Invoices');
  const [search, setSearch] = useState('');
  const [apiInvoices, setApiInvoices] = useState([]);
  const [apiTimers, setApiTimers] = useState([]);
  const [apiSettings, setApiSettings] = useState({});
  const [apiTrustAccounts, setApiTrustAccounts] = useState([]);
  const [apiExpenses, setApiExpenses] = useState([]);
  const [billLoading, setBillLoading] = useState(isAdmin);
  const [billError, setBillError] = useState('');
  const isFirstLoad = useRef(true);

  const billFormatUsd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

  const loadBillingData = useCallback(async () => {
    if (!isAdmin) return;
    if (isFirstLoad.current) { setBillLoading(true); isFirstLoad.current = false; }
    setBillError('');
    try {
      const fetchAdminSettings = role === 'admin' 
        ? api.dashboard.admin().then(r => r.data?.settings || {}) 
        : Promise.resolve({});

      const [invRes, timerRes, settingsRes, trustRes, expRes] = await Promise.all([
        api.billing.listInvoices({ limit: 500 }),
        api.timers.list({ limit: 200 }),
        fetchAdminSettings,
        api.billing.listTrustAccounts(),
        api.expenses.list({ limit: 500 })
      ]);
      setApiInvoices(Array.isArray(invRes.data) ? invRes.data : []);
      setApiTimers(Array.isArray(timerRes.data) ? timerRes.data : []);
      setApiSettings(settingsRes);
      setApiTrustAccounts(Array.isArray(trustRes.data) ? trustRes.data : []);
      setApiExpenses(Array.isArray(expRes.data) ? expRes.data : []);
    } catch (e) {
      setBillError(e.message || 'Failed to load billing');
    } finally {
      setBillLoading(false);
    }
  }, [isAdmin, role]);

  useEffect(() => {
    loadBillingData();
    window.addEventListener('vktori:entities-changed', loadBillingData);
    return () => window.removeEventListener('vktori:entities-changed', loadBillingData);
  }, [loadBillingData]);

  const adminStats = (() => {
    if (!isAdmin) {
      return { unbilled: '—', draft: '$0.00', ar: '$0.00', mtd: '$0.00' };
    }
    
    let draft = 0;
    let ar = 0;
    let mtd = 0;
    const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    apiInvoices.forEach((inv) => {
      const totalAmt = Number(inv.amount);
      const paidAmt = inv.paid_amount ?? (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0);
      const dueAmt = inv.due_amount ?? Math.max(0, totalAmt - paidAmt);

      if (inv.status === 'draft') {
        draft += totalAmt;
      } else if (inv.status !== 'void') {
        ar += dueAmt;
      }

      (inv.payments || []).forEach(p => {
        const pd = p.paid_on ? new Date(p.paid_on) : null;
        if (pd && !Number.isNaN(pd.getTime()) && pd >= startMonth) {
          mtd += Number(p.amount);
        }
      });
    });

    const rate = parseFloat(apiSettings.billing_rate) || 150;
    let unbilledMins = 0;
    apiTimers.forEach(t => {
      if (t.is_running) {
        const start = new Date(t.start_time);
        const now = new Date();
        const diff = Math.max(0, Math.floor((now - start) / 60000));
        unbilledMins += diff;
      } else if (!t.invoice_id) {
        unbilledMins += (t.duration_minutes || 0);
      }
    });
    const unbilledAmt = (unbilledMins / 60) * rate;

    return {
      unbilled: unbilledAmt > 0 ? billFormatUsd(unbilledAmt) : '$0.00',
      draft: billFormatUsd(draft),
      ar: billFormatUsd(ar),
      mtd: billFormatUsd(mtd),
    };
  })();

  const ledgerRows = (() => {
    if (!isAdmin || !apiInvoices.length) return [];
    return [...apiInvoices]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 40)
      .map((inv) => {
        const dt = inv.issued_at || inv.created_at;
        const dateStr = dt ? new Date(dt).toLocaleDateString() : '—';
        const matterNum = inv.matter?.matter_number || '';
        const paid = inv.status === 'paid';
        return {
          date: dateStr,
          desc: `Invoice ${inv.invoice_number}${matterNum ? ` · ${matterNum}` : ''}`,
          amount: paid ? `+${billFormatUsd(inv.amount)}` : billFormatUsd(inv.amount),
          color: paid ? 'text-[#10b981]' : 'text-[#b8c2d1]',
          bal: '—',
        };
      });
  })();

  const filteredInvoices = (() => {
    return apiInvoices
      .filter((inv) => {
        const client = inv.matter?.client?.full_name || '';
        const q = search.toLowerCase();
        return client.toLowerCase().includes(q) || inv.invoice_number.toLowerCase().includes(q);
      })
      .map((inv) => ({
        id: inv.invoice_number,
        dbId: inv.id,
        client: inv.matter?.client?.full_name || '—',
        amount: inv.amount,
        paid_amount: inv.paid_amount,
        due_amount: inv.due_amount,
        issued: inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : '—',
        due: inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—',
        status: inv.status,
        desc: inv.description || 'Professional Legal Services',
      }));
  })();

  const filteredExpenses = (() => {
    return apiExpenses.filter(exp => {
      const q = search.toLowerCase();
      const vendor = (exp.vendor || '').toLowerCase();
      const matter = (exp.matter?.title || exp.matter?.matter_number || '').toLowerCase();
      const category = (exp.category || '').toLowerCase();
      const desc = (exp.description || '').toLowerCase();
      return !q || vendor.includes(q) || matter.includes(q) || category.includes(q) || desc.includes(q);
    });
  })();

  if (isAdmin && billLoading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="w-10 h-10 border-4 border-[#0057c7] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-[#8a94a6] font-bold uppercase tracking-widest">Auditing Ledgers...</p>
      </div>
    );
  }

  if (isAdmin && billError) {
    return (
      <div className="animate-fade-in space-y-4">
        <Card className="border-red-500/20 bg-red-500/5 text-center p-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-xl font-800 text-white mb-2">Ledger Synchronization Failed</p>
          <p className="text-[14px] text-[#8a94a6] mb-6 max-w-md mx-auto">{billError}</p>
          <button type="button" onClick={loadBillingData} className="btn btn-primary px-8">Sync Financials</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <PageHeader title="Billing & Financials" subtitle="Executive oversight of firm revenue, trust accounts, and unbilled time">
        <button onClick={() => navigate('calendar')} className="btn btn-secondary border-white/10 hover:bg-white/5 active:scale-[0.98]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Time Entries
        </button>
        <button onClick={() => openModal('create-invoice')} className="btn btn-primary shadow-[#0057c7]/20 active:scale-[0.98]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Create Invoice
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Unbilled Time" value={adminStats.unbilled} change="+8.2%"
          icon={<svg className="w-6 h-6 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard label="Draft Invoices" value={adminStats.draft} 
          icon={<svg className="w-6 h-6 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
        <StatCard label="Outstanding (A/R)" value={adminStats.ar} change="-2.4%"
          icon={<svg className="w-6 h-6 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07-7.07l-1.41 1.41M6.34 17.66l-1.41 1.41M17.66 17.66l1.41 1.41M6.34 6.34l1.41-1.41" /></svg>} />
        <StatCard label="Collected (MTD)" value={adminStats.mtd} change="+14.5%"
          icon={<svg className="w-6 h-6 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3 1.343 3 3-1.343 3-3 3m0-12c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3m0-4v2m0 16v2" /></svg>} />
      </div>

      <Tabs tabs={['Invoices', 'Trust Accounts', 'Ledger', 'Expenses']} active={tab} onChange={setTab} />

      {tab === 'Invoices' && (
        <Card className="!p-0 overflow-hidden border-white/5 bg-white/[0.02]">
          <Table headers={['Invoice ID', 'Client Entity', 'Value & Status', 'Issuance', 'Due Date', 'Status', 'Actions']}
            searchPlaceholder="Search invoice archives..." onSearch={setSearch}>
            {filteredInvoices.map(inv => (
              <Tr key={inv.id} className="hover:bg-white/[0.03] transition-colors group">
                <Td>
                  <p className="text-[14px] font-900 text-white tracking-tighter group-hover:text-[#38bdf8] transition-colors">{inv.id}</p>
                  <p className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest opacity-40">Financial Record</p>
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar initials={inv.client.split(' ').map(n => n[0]).join('') || '—'} size="xs" />
                    <span className="text-[13px] font-800 text-white tracking-tight">{inv.client}</span>
                  </div>
                </Td>
                <Td>
                  <div className="text-[15px] font-900 text-white tracking-tighter">{billFormatUsd(inv.amount)}</div>
                  {inv.paid_amount > 0 && <p className="text-[10px] text-[#10b981] font-900 uppercase tracking-widest mt-1">Paid: {billFormatUsd(inv.paid_amount)}</p>}
                  {inv.due_amount > 0 && <p className="text-[10px] text-red-400 font-900 uppercase tracking-widest mt-1">Due: {billFormatUsd(inv.due_amount)}</p>}
                </Td>
                <Td className="text-[13px] text-[#b8c2d1] font-600">{inv.issued}</Td>
                <Td className="text-[13px] text-[#b8c2d1] font-600">{inv.due}</Td>
                <Td><Badge status={inv.status} /></Td>
                <Td>
                  <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal('view-invoice', inv)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] hover:border-[#38bdf8]/30 transition-all" title="Review Intelligence">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                    {canMarkPaid && inv.status !== 'paid' && inv.status !== 'void' && inv.dbId != null && (
                      <button onClick={() => openModal('pay-invoice', inv)} className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all" title="Authorize Payment">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>
                      </button>
                    )}
                    <button onClick={() => downloadInvoicePdfBlob(inv.dbId, inv.id, toast)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-[#f59e0b]/10 hover:text-[#f59e0b] hover:border-[#f59e0b]/30 transition-all" title="Export Statement">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === 'Trust Accounts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
             <button onClick={() => openModal('trust-deposit')} className="btn btn-primary shadow-[#0057c7]/20">
               <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
               Trust Deposit
             </button>
          </div>
          <Card className="!p-0 overflow-hidden border-white/5 bg-white/[0.02]">
            <Table headers={['Client Entity', 'Account Identifier', 'Current Balance', 'Last Activity', 'Lifecycle', 'Operations']}>
              {apiTrustAccounts.length === 0 ? (
                <Tr>
                  <td colSpan={6} className="px-4 py-24 text-center text-[#8a94a6] text-[13px] font-500 italic opacity-40">No institutional trust records located.</td>
                </Tr>
              ) : (
                apiTrustAccounts.map(ta => (
                  <Tr key={ta.id} className="hover:bg-white/[0.03] transition-colors group">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar initials={ta.client?.full_name?.split(' ').map(n => n[0]).join('') || '—'} size="xs" />
                        <span className="text-[13px] font-800 text-white tracking-tight">{ta.client?.full_name || '—'}</span>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-[13px] text-white font-900 tracking-tighter uppercase">TR-{String(ta.id).padStart(4, '0')}</p>
                      <p className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest opacity-40">Escrow ID</p>
                    </Td>
                    <Td>
                      <p className="text-[15px] font-900 text-[#10b981] tracking-tighter">{billFormatUsd(ta.balance)}</p>
                      <p className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest opacity-40">Liquid Assets</p>
                    </Td>
                    <Td className="text-[13px] text-[#b8c2d1] font-600">{ta.updated_at ? new Date(ta.updated_at).toLocaleDateString() : '—'}</Td>
                    <Td><Badge status="active" /></Td>
                    <Td>
                      <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal('trust-ledger', ta)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] hover:border-[#38bdf8]/30 transition-all" title="View Intelligence">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </button>
                        <button onClick={() => openModal('apply-trust', ta)} className="w-8 h-8 rounded-lg bg-[#0057c7]/10 border border-[#0057c7]/20 flex items-center justify-center text-[#38bdf8] hover:bg-[#0057c7]/20 transition-all" title="Apply Liquidated">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))
              )}
            </Table>
          </Card>
        </div>
      )}

      {tab === 'Expenses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openModal('add-expense')} className="btn btn-primary shadow-[#0057c7]/20">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Record Expense
            </button>
          </div>
          <Card className="!p-0 overflow-hidden border-white/5 bg-white/[0.02]">
            <Table headers={['Vendor Brief', 'Matter Reference', 'Classification', 'Fiscal Value', 'Execution Date', 'Status', 'Actions']}
              searchPlaceholder="Search expense records..." onSearch={setSearch}>
              {filteredExpenses.length === 0 ? (
                <Tr>
                  <td colSpan={7} className="px-4 py-24 text-center text-[#8a94a6] text-[13px] font-500 italic opacity-40">No outstanding expense records synchronized.</td>
                </Tr>
              ) : (
                filteredExpenses.map(exp => (
                  <Tr key={exp.id} className="hover:bg-white/[0.03] transition-colors group">
                    <Td>
                      <p className="text-[14px] font-900 text-white tracking-tight group-hover:text-[#38bdf8] transition-colors">{exp.vendor}</p>
                      <p className="text-[11px] text-[#8a94a6] font-600 truncate max-w-[220px]">{exp.description || 'Firm Expense Record'}</p>
                    </Td>
                    <Td>
                      {exp.matter ? (
                        <div>
                          <p className="text-[13px] font-800 text-[#38bdf8] tracking-tight">{exp.matter.matter_number}</p>
                          <p className="text-[11px] text-white/80 font-600 truncate max-w-[200px]">{exp.matter.title}</p>
                        </div>
                      ) : (
                        <span className="text-[12px] text-[#8a94a6] font-600 italic">General Firm Expense</span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-[10px] bg-[#0057c7]/10 text-[#38bdf8] border border-[#0057c7]/20 px-2.5 py-1 rounded-full font-800 uppercase tracking-widest">
                        {exp.category || 'General'}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[15px] font-900 text-white tracking-tighter">{billFormatUsd(exp.amount)}</span>
                    </Td>
                    <Td className="text-[13px] text-[#b8c2d1] font-600">{exp.date ? new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</Td>
                    <Td><Badge status={exp.status} /></Td>
                    <Td>
                      <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={async () => {
                            if (window.confirm(`Delete expense record for "${exp.vendor}" ($${exp.amount})?`)) {
                              try {
                                await api.expenses.remove(exp.id);
                                toast('Expense deleted successfully', 'success');
                                window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
                              } catch (e) {
                                toast(e.message || 'Failed to delete expense', 'error');
                              }
                            }
                          }}
                          className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all"
                          title="Delete Expense"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))
              )}
            </Table>
          </Card>
        </div>
      )}

      {tab === 'Ledger' && (
        <Card className="bg-white/[0.02] border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[11px] font-900 text-white uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                Institutional Transaction Ledger
              </h3>
              <p className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest mt-2 opacity-60">Verified Immutable Record</p>
            </div>
            <button onClick={() => {
              if (!ledgerRows.length) { toast('No ledger data to export.', 'warning'); return; }
              const header = 'Date,Description,Amount,Balance\n';
              const rows = ledgerRows.map(r => {
                const cleanAmt = (r.amount || '').replace(/[,$]/g, '');
                const cleanBal = (r.bal || '').replace(/[,$]/g, '');
                return `"${r.date}","${r.desc}","${cleanAmt}","${cleanBal}"`;
              }).join('\n');
              const csv = header + rows;
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ledger_statement_${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
              toast('Financial statement exported successfully!', 'success');
            }} className="btn btn-secondary border-white/10 hover:bg-white/5 text-[11px] font-900 uppercase tracking-widest">
              Export Statement
            </button>
          </div>
          <div className="space-y-0 text-[13px]">
            {ledgerRows.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 py-4 border-b border-white/5 hover:bg-white/[0.03] px-4 transition-all group rounded-xl">
                <div className="col-span-2 text-[#8a94a6] font-800 uppercase tracking-tighter opacity-60">{row.date}</div>
                <div className="col-span-6 font-800 text-white tracking-tight group-hover:text-[#38bdf8] transition-colors">{row.desc}</div>
                <div className={`col-span-2 font-900 text-right tracking-tighter ${row.color}`}>{row.amount}</div>
                <div className="col-span-2 text-right font-900 text-[#8a94a6] tracking-tighter opacity-40">{row.bal}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  EMAIL PAGE
// ─────────────────────────────────────────────────────────
export function EmailPage({ toast, openModal, role = 'lawyer' }) {
  const isAdmin = role !== 'client';
  const [selected, setSelected] = useState(null);
  const [commList, setCommList] = useState([]);
  const [mailLoading, setMailLoading] = useState(isAdmin);
  const [mailError, setMailError] = useState('');
  const [action, setAction] = useState(null); // 'reply' or 'forward'
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);

  const isFirstLoad = useRef(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const h = () => setRefreshTick(t => t + 1);
    window.addEventListener('vktori:entities-changed', h);
    return () => window.removeEventListener('vktori:entities-changed', h);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      if (isFirstLoad.current) { setMailLoading(true); isFirstLoad.current = false; }
      setMailError('');
      try {
        const res = await api.communications.list({ limit: 200 });
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        const mapped = rows.map((c) => {
          const body = c.message_body || c.description || '';
          const cleanBodyText = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const subj = c.subject || cleanBodyText.slice(0, 80) || String(c.communication_type || '').replace(/_/g, ' ');
          return {
            id: c.id,
            from: c.sender?.full_name || 'Unknown',
            fromEmail: c.sender?.email || '',
            subject: subj,
            preview: cleanBodyText ? cleanBodyText.slice(0, 120) : (subj || 'No Content'),
            body,
            time: new Date(c.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
            read: true,
            matter_id: c.matter_id,
            to: c.to,
            cc: c.cc,
            bcc: c.bcc,
            communication_type: c.communication_type,
          };
        });
        setCommList(mapped);
        setSelected(window.innerWidth >= 1024 ? (mapped[0] || null) : null);
      } catch (e) {
        if (!cancelled) setMailError(e.message || 'Failed to load communications');
      } finally {
        if (!cancelled) setMailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin, refreshTick]);

  const handleDeleteCommunication = async (commId) => {
    try {
      await api.request(`/communications/${commId}`, {
        method: 'DELETE'
      });
      toast('Communication deleted successfully', 'success');
      setShowConfirmDelete(null);
      
      setCommList((prev) => {
        const remaining = prev.filter((c) => c.id !== commId);
        if (selected?.id === commId) {
          setSelected(window.innerWidth >= 1024 ? (remaining[0] || null) : null);
        }
        return remaining;
      });

      // Reload lists in background
      const res = await api.communications.list({ limit: 200 });
      const rows = Array.isArray(res.data) ? res.data : [];
      const mapped = rows.map((c) => {
        const body = c.message_body || c.description || '';
        const cleanBodyText = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const subj = c.subject || cleanBodyText.slice(0, 80) || String(c.communication_type || '').replace(/_/g, ' ');
        return {
          id: c.id,
          from: c.sender?.full_name || 'Unknown',
          fromEmail: c.sender?.email || '',
          subject: subj,
          preview: cleanBodyText ? cleanBodyText.slice(0, 120) : (subj || 'No Content'),
          body,
          time: new Date(c.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
          read: true,
          matter_id: c.matter_id,
          to: c.to,
          cc: c.cc,
          bcc: c.bcc,
          communication_type: c.communication_type,
        };
      });
      setCommList(mapped);

      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
    } catch (err) {
      console.error(err);
      toast('Failed to delete communication: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const msg = formData.get('message') || '';
    const target = formData.get('target') || '';

    try {
      if (action === 'reply') {
        await api.communications.reply({
          parent_id: selected.raw_id || selected.id,
          message_body: msg
        });
      } else {
        await api.communications.create({
          matter_id: selected.matter_id,
          communication_type: 'email_log',
          message_body: `Forwarded Message:\n\n${selected.body}\n\nNotes: ${msg}`,
          to: target ? [target] : [],
        });
      }
      toast(action === 'reply' ? 'Reply sent successfully!' : 'Email forwarded!', 'success');
      setAction(null);
    } catch (err) {
      toast('Failed to send: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const inbox = commList.filter(e => 
    e.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isAdmin && mailLoading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-10 h-10 border-4 border-[#0057c7] border-t-transparent rounded-full animate-spin" />
        <p className="text-[12px] text-[#8a94a6] font-900 uppercase tracking-widest opacity-60">Syncing Communications...</p>
      </div>
    );
  }

  if (isAdmin && mailError) {
    return (
      <div className="animate-fade-in py-12">
        <Card className="border-red-500/20 bg-red-500/5 max-w-lg mx-auto text-center">
          <p className="text-[13px] text-red-400 font-600">{mailError}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Intelligence Hub" subtitle="Real-time communication & outreach monitoring">
        <button onClick={() => openModal('compose-email')} className="btn btn-primary h-11 px-6 text-[11px] font-900 uppercase tracking-widest flex items-center gap-2 group">
          <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Compose Outbound
        </button>
      </PageHeader>

      <Card noPad className="overflow-hidden border-white/5 bg-white/[0.02] backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row h-full min-h-[640px] lg:h-[640px]">
          {/* Global Inbox Sidebar */}
          <div className={`w-full lg:w-80 flex-shrink-0 border-r border-white/5 flex flex-col bg-white/[0.01] ${selected ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <SearchInput 
                placeholder="Search transmissions..." 
                value={searchQuery} 
                onChange={(val) => setSearchQuery(val)} 
              />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {inbox.map(e => (
                <div key={e.id} onClick={() => { setSelected(e); setAction(null); }}
                  className={`px-5 py-4 cursor-pointer border-b border-white/5 transition-all relative group ${selected?.id === e.id ? 'bg-[#0057c7]/10' : 'hover:bg-white/[0.03]'}`}>
                  {selected?.id === e.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#38bdf8] shadow-[0_0_15px_#38bdf8]" />}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[13px] tracking-tight ${!e.read ? 'font-900 text-white' : 'font-800 text-white/70'}`}>{e.from}</span>
                    <span className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-tighter opacity-40">{e.time}</span>
                  </div>
                  <p className="text-[12px] font-900 text-[#38bdf8] truncate tracking-tight mb-1">{e.subject}</p>
                  <p className="text-[11px] font-500 text-[#8a94a6] truncate opacity-60 leading-relaxed">{e.preview}</p>
                  {!e.read && <div className="absolute right-4 bottom-4 w-2 h-2 bg-[#10b981] rounded-full shadow-[0_0_8px_#10b981]" />}
                </div>
              ))}
            </div>
          </div>

          {/* Secure Message Environment */}
          <div className={`flex-1 flex flex-col overflow-hidden bg-transparent ${!selected ? 'hidden lg:flex' : 'flex'}`}>
            {selected ? (
              <>
                <div className="p-4 lg:p-6 border-b border-white/5 bg-white/[0.03]">
                  <button onClick={() => setSelected(null)} className="lg:hidden flex items-center gap-2 text-[#38bdf8] font-900 uppercase tracking-[0.2em] text-[10px] mb-4 hover:opacity-80 transition-opacity">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6" /></svg>
                    Back to Inbox
                  </button>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <h3 className="text-[18px] font-900 text-white tracking-tighter">{selected.subject}</h3>
                    <div className="flex gap-2 items-center flex-wrap">
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => openModal('compose-email', {
                              id: selected.id,
                              matterId: selected.matter_id,
                              to: selected.to,
                              cc: selected.cc,
                              bcc: selected.bcc,
                              subject: selected.subject,
                              message: selected.body
                            })} 
                            className="h-9 px-3.5 rounded-xl text-[10px] font-900 uppercase tracking-widest bg-white/5 text-white hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Edit
                          </button>
                          
                          <button 
                            onClick={() => setShowConfirmDelete(selected.id)}
                            className="h-9 px-3.5 rounded-xl text-[10px] font-900 uppercase tracking-widest bg-red-950/20 text-red-400 hover:bg-red-900/30 border border-red-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 text-red-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                          
                          <div className="h-4 w-px bg-white/10 mx-1" />
                        </>
                      )}
                      
                      <button onClick={() => setAction('reply')} className={`h-9 px-4 rounded-xl text-[10px] font-900 uppercase tracking-widest transition-all ${action === 'reply' ? 'bg-[#0057c7] text-white' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}>Reply</button>
                      <button onClick={() => setAction('forward')} className={`h-9 px-4 rounded-xl text-[10px] font-900 uppercase tracking-widest transition-all ${action === 'forward' ? 'bg-[#0057c7] text-white' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}>Forward</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Avatar initials={selected.from.charAt(0)} size="md" className="ring-2 ring-[#0057c7]/20" />
                    <div className="flex-1">
                      <p className="text-[14px] font-900 text-white tracking-tight">{selected.from}</p>
                      <p className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] opacity-40">Verification Timestamp: {selected.time}</p>
                    </div>
                  </div>

                  {(selected.communication_type === 'email_log' || selected.to) && (
                    <div className="mt-4 p-4 bg-[#121826]/40 border border-white/5 rounded-2xl flex flex-col gap-2 text-[12px] text-white/70">
                      <div className="flex items-center gap-2">
                        <span className="w-14 text-white/30 font-850 uppercase tracking-widest text-[9px]">From:</span>
                        <span className="font-600 text-white">{selected.from} {selected.fromEmail && `<${selected.fromEmail}>`}</span>
                      </div>
                      {selected.to && (
                        <div className="flex items-center gap-2">
                          <span className="w-14 text-white/30 font-850 uppercase tracking-widest text-[9px]">To:</span>
                          <span className="font-600 text-white/95">{selected.to}</span>
                        </div>
                      )}
                      {selected.cc && (
                        <div className="flex items-center gap-2">
                          <span className="w-14 text-white/30 font-850 uppercase tracking-widest text-[9px]">Cc:</span>
                          <span className="font-600 text-white/90">{selected.cc}</span>
                        </div>
                      )}
                      {selected.bcc && (
                        <div className="flex items-center gap-2">
                          <span className="w-14 text-white/30 font-850 uppercase tracking-widest text-[9px]">Bcc:</span>
                          <span className="font-600 text-white/80">{selected.bcc}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white/[0.01]">
                  {(() => {
                    const { cleanText, attachments } = parseBodyAttachments(selected.body || '');
                    const displayContent = (cleanText || '').replace(/^(<br\s*\/?>|\s)+/gi, '').trim();
                    return (
                      <div className="space-y-4">
                        <div className="bg-white/[0.03] p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[#0057c7]/5 blur-3xl pointer-events-none group-hover:bg-[#0057c7]/10 transition-all duration-1000" />
                          {displayContent.includes('<') && displayContent.includes('>') ? (
                            <div dangerouslySetInnerHTML={{ __html: displayContent }} className="text-[14px] text-white/80 leading-relaxed relative z-10 email-html-content" />
                          ) : (
                            <p className="text-[14px] text-white/80 font-500 leading-relaxed whitespace-pre-line relative z-10">{displayContent}</p>
                          )}
                        </div>
                        {attachments.length > 0 && (
                          <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                            <h4 className="text-[11px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] mb-3">Attachments ({attachments.length})</h4>
                            <div className="flex flex-wrap gap-3">
                              {attachments.map((att, attIdx) => (
                                <div key={attIdx} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 shadow-md">
                                  <button
                                    type="button"
                                    onClick={() => openAttachment(att, selected.matter_id, openModal, toast)}
                                    className="flex items-center gap-2 text-[12px] text-white font-700 hover:text-[#38bdf8] transition-colors cursor-pointer"
                                    title="Open file in new tab"
                                  >
                                    <span>📄</span>
                                    <span className="truncate max-w-[180px]">{att.name}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => downloadAttachment(att, selected.matter_id, toast)}
                                    className="p-1 text-[#8a94a6] hover:text-white hover:bg-white/10 rounded transition-all cursor-pointer ml-1"
                                    title="Download file"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {action && (
                    <div className="animate-slide-up bg-[#0b1f3a] rounded-[2.5rem] border border-white/10 shadow-3xl overflow-hidden">
                      <div className="bg-white/[0.05] px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[11px] font-900 text-[#38bdf8] uppercase tracking-[0.2em]">
                          {action === 'reply' ? 'Institutional Response' : 'Strategic Forwarding'}
                        </span>
                        <button onClick={() => setAction(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#8a94a6] hover:text-white transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <form onSubmit={handleSend} className="p-8 space-y-5">
                        {action === 'forward' && (
                          <Field label="Target Recipient" required>
                            <Input name="target" placeholder="institutional.entity@domain.com" required />
                          </Field>
                        )}
                        <Field label={action === 'reply' ? 'Draft Statement' : 'Transmission Notes'} required={action === 'reply'}>
                          <Textarea name="message" rows={6} placeholder={action === 'reply' ? 'Formulate institutional response...' : 'Append executive context to this forwarding...'} required={action === 'reply'} />
                        </Field>
                        <div className="flex justify-end gap-3 pt-2">
                          <button type="button" onClick={() => setAction(null)} className="h-11 px-6 rounded-2xl bg-white/5 text-white text-[11px] font-900 uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                          <button type="submit" className="btn btn-primary h-11 px-8 text-[11px] font-900 uppercase tracking-widest">
                            {action === 'reply' ? 'Execute Reply' : 'Execute Forward'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 rounded-[2rem] bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-[#8a94a6] opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M3 8l7.89 5.26a2 2 0 002.22 0L22 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h4 className="text-[18px] font-900 text-white tracking-tighter mb-2">Initialize Communication Overview</h4>
                <p className="text-[13px] text-[#8a94a6] max-w-xs mx-auto opacity-60">Select an active transmission from the sidebar to begin institutional review.</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Custom Delete Confirmation Modal */}
      {showConfirmDelete && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 w-full max-w-[400px] shadow-2xl flex flex-col gap-4 text-center text-white">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-[16px] font-800">Delete Transmission?</h3>
            <p className="text-[13px] text-slate-400 leading-relaxed">
              Are you sure you want to delete this communication record? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowConfirmDelete(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[12px] font-700 py-2.5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCommunication(showConfirmDelete)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[12px] font-700 py-2.5 rounded-xl transition-all shadow-md shadow-red-600/10"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  AI ASSISTANT PAGE
// ─────────────────────────────────────────────────────────
export function AIPage({ toast }) {
  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="VyNius Assistant" subtitle="Powered by ">
        <span className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Online
        </span>
      </PageHeader>

      <Card className="min-h-[520px] flex items-center justify-center">
        <EmptyState icon="🤖" title="AI assistant unavailable" desc="Live AI service is not configured yet." />
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  USERS PAGE
// ─────────────────────────────────────────────────────────
export function UsersPage({ toast, openModal, user }) {
  const [users, setUsers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [userToDelete, setUserToDelete] = useState(null);

  const mapApiUser = (u) => ({
    id: u.id,
    name: u.full_name,
    email: u.email,
    avatar: (u.full_name || '').split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '👤',
    roles: u.roles || [],
    roleLabel: (u.roles || []).map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', '),
    cases: u._count?.assigned_matters ?? 0,
    status: u.is_active ? 'active' : 'inactive',
    practice_focus: u.practice_focus || null,
    lastLogin: u.last_login_at
      ? new Date(u.last_login_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
      })
      : '—',
  });

  const loadUsers = async () => {
    if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
    setError('');
    try {
      const res = await api.users.list();
      const rows = Array.isArray(res.data) ? res.data : [];
      setUsers(rows.map(mapApiUser));
    } catch (e) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => {
    window.addEventListener('vktori:entities-changed', loadUsers);
    return () => window.removeEventListener('vktori:entities-changed', loadUsers);
  }, []);

  const handleEdit = (u) => {
    openModal('edit-user', u, async (values) => {
      try {
        const updatedName = `${values.firstName} ${values.lastName}`;
        const selectedRoles = [];
        if (values.role_admin) selectedRoles.push('admin');
        if (values.role_lawyer) selectedRoles.push('lawyer');
        if (values.role_client) selectedRoles.push('client');

        if (selectedRoles.length === 0) {
           toast('You must select at least one role.', 'error');
           return;
        }

        const specialtyVal = values.specialty === 'other'
          ? (values.custom_specialty || '').trim()
          : (values.specialty || null);

        await api.users.update(u.id, {
          full_name: updatedName,
          email: values.email,
          roles: selectedRoles,
          is_active: values.status === 'active',
          practice_focus: specialtyVal,
        });
        await loadUsers();
        toast('User updated successfully!', 'success');
      } catch (e) {
        toast(e.message || 'Update failed', 'error');
      }
    });
  };

  const handleDelete = (u) => {
    if (user?.id === u.id) {
      toast('You cannot delete your own active session account.', 'error');
      return;
    }
    setUserToDelete(u);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.users.remove(userToDelete.id);
      await loadUsers();
      toast('User deleted successfully!', 'success');
    } catch (e) {
      toast(e.message || 'Delete failed', 'error');
    } finally {
      setUserToDelete(null);
    }
  };

  const filteredUsers = users.filter(u => {
    if (activeTab === 'Staff') return u.roles?.includes('admin') || u.roles?.includes('lawyer');
    if (activeTab === 'Clients') return u.roles?.includes('client');
    return true;
  });

  if (loading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#0057c7] border-t-transparent rounded-full animate-spin" />
        <p className="text-[12px] text-[#8a94a6] font-900 uppercase tracking-[0.3em] opacity-60">Synchronizing Staff Records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in py-12">
        <Card className="border-[#ef4444]/20 bg-[#ef4444]/5 text-center p-12 max-w-lg mx-auto">
          <p className="text-[13px] text-[#ef4444] font-900 uppercase tracking-widest">{error}</p>
          <button type="button" onClick={loadUsers} className="btn btn-secondary mt-6 px-8">Re-establish Connection</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 relative">
      <PageHeader title={activeTab === 'Staff' ? 'Staff Directory' : (activeTab === 'Clients' ? 'Client Accounts' : 'User Directory')} subtitle="Administrative control and practitioner access management">
        <button onClick={() => openModal('add-user', null, async (values) => {
          try {
            const selectedRoles = [];
            if (values.role_admin) selectedRoles.push('admin');
            if (values.role_lawyer) selectedRoles.push('lawyer');
            if (values.role_client) selectedRoles.push('client');

            if (selectedRoles.length === 0) {
               toast('You must select at least one role.', 'error');
               return;
            }

            await api.users.create({
              full_name: `${values.firstName} ${values.lastName}`,
              email: values.email,
              password: values.password,
              roles: selectedRoles,
            });
            await loadUsers();
            toast('User account created!', 'success');
          } catch (e) {
            toast(e.message || 'Create failed', 'error');
          }
        })} className="btn btn-primary h-11 px-6 text-[11px] font-900 uppercase tracking-widest flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Initialize Account
        </button>
      </PageHeader>

      <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-2xl w-fit">
        {['All', 'Staff', 'Clients'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-[12px] font-900 uppercase tracking-widest transition-all ${
              activeTab === tab
                ? 'bg-[#0057c7] text-white shadow-lg shadow-[#0057c7]/20'
                : 'text-[#8a94a6] hover:text-white hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-[2rem]">
        <Table headers={['Practitioner', 'Secure Email', 'Role', 'Matters', 'Status', 'Last Activity', 'Actions']}>
          {filteredUsers.map(u => (
            <Tr key={u.id}>
              <Td>
                <div className="flex items-center gap-3">
                  <Avatar initials={u.avatar} size="md" className="ring-2 ring-white/5 shadow-2xl" />
                  <div>
                    <p className="text-[14px] font-900 text-white tracking-tight">{u.name}</p>
                    <p className="text-[10px] text-[#38bdf8] font-900 uppercase tracking-widest opacity-60">ID-{String(u.id).slice(-4).toUpperCase()}</p>
                  </div>
                </div>
              </Td>
              <Td><span className="text-[13px] font-600 text-white/70">{u.email}</span></Td>
              <Td>
                <span className={`text-[10px] font-900 px-3 py-1 rounded-lg uppercase tracking-[0.1em] border shadow-sm ${
                  u.roleLabel === 'Admin' 
                    ? 'bg-[#C9A24A]/10 text-[#C9A24A] border-[#C9A24A]/20' 
                    : u.roleLabel === 'Lawyer'
                    ? 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20'
                    : 'bg-white/5 text-[#8a94a6] border-white/10'
                }`}>
                  {u.roleLabel}
                </span>
              </Td>
              <Td><span className="text-[14px] font-900 text-white">{u.cases || '—'}</span></Td>
              <Td><Badge status={u.status} /></Td>
              <Td><span className="text-[12px] font-600 text-[#8a94a6]">{u.lastLogin}</span></Td>
              <Td>
                <div className="flex gap-2.5">
                  <button onClick={() => openModal('reset-password', u)} 
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-[#8a94a6] hover:bg-[#10b981]/10 hover:text-[#10b981] hover:border-[#10b981]/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all border border-white/10 group" title="Reset Password">
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                  </button>
                  <button onClick={() => handleEdit(u)} 
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-[#8a94a6] hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] hover:border-[#38bdf8]/30 hover:shadow-[0_0_15px_rgba(56,189,248,0.2)] transition-all border border-white/10 group" title="Edit User">
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  {user?.id !== u.id && (
                    <button onClick={() => handleDelete(u)} 
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-[#8a94a6] hover:bg-[#ef4444]/10 hover:text-[#ef4444] hover:border-[#ef4444]/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all border border-white/10 group" title="Terminate Access">
                      <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      </div>

      {userToDelete && (
        <Modal
          title="Terminate Access"
          onClose={() => setUserToDelete(null)}
          footer={
            <>
              <button onClick={() => setUserToDelete(null)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={confirmDelete} className="btn btn-primary btn-sm !bg-red-500 hover:!bg-red-600 !border-red-500">Terminate Access</button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <p className="text-[13px] text-red-200 font-700">Are you sure you want to terminate access for {userToDelete.name}?</p>
                <p className="text-[12px] text-red-300/70 mt-1">This user account will be deactivated. They will no longer be able to log in or access any cases.</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  PRACTICE AREAS TAB
// ─────────────────────────────────────────────────────────
function PracticeAreasTab({ toast }) {
  const [areas, setAreas] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  const loadAreas = async () => {
    try {
      const res = await api.practiceAreas.list();
      setAreas(res.data || []);
    } catch (e) {
      toast('Failed to load practice areas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAreas(); }, []);
  useEffect(() => {
    window.addEventListener('vktori:entities-changed', loadAreas);
    return () => window.removeEventListener('vktori:entities-changed', loadAreas);
  }, []);

  const toggleActive = async (area) => {
    try {
      await api.practiceAreas.update(area.id, { is_active: !area.is_active });
      loadAreas();
    } catch (e) {
      toast('Failed to update status', 'error');
    }
  };

  return (
    <>
      <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0 mb-6">
          <div>
            <h3 className="text-[14px] font-900 text-white uppercase tracking-widest">Practice Areas</h3>
            <p className="text-[11px] text-[#8a94a6] mt-1">Manage standard practice areas for new matters.</p>
          </div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('vktori:open-modal', { detail: { type: 'add-practice-area' } }))} className="btn btn-primary h-10 px-6 text-[11px] font-900 uppercase tracking-widest">
            + Add Practice Area
          </button>
        </div>
        {loading ? <div className="text-[#8a94a6] text-center p-6 text-[12px]">Loading...</div> : (
          <Table headers={['Name', 'Status', 'Actions']}>
            {areas.map(a => (
              <Tr key={a.id}>
                <Td><span className="text-white font-600 text-[13px]">{a.name}</span></Td>
                <Td>
                  <div onClick={() => toggleActive(a)} className={`w-10 h-5 rounded-full relative cursor-pointer transition-all duration-300 ${a.is_active ? 'bg-[#10b981]' : 'bg-white/10'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 ${a.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-4">
                    <button onClick={() => window.dispatchEvent(new CustomEvent('vktori:open-modal', { detail: { type: 'edit-practice-area', data: a } }))} className="text-[#38bdf8] text-[11px] font-900 uppercase hover:underline">Edit</button>
                    <button onClick={() => setDeleteTarget(a)} className="text-red-500 text-[11px] font-900 uppercase hover:underline">Delete</button>
                  </div>
                </Td>
              </Tr>
            ))}
            {areas.length === 0 && <Tr><Td colSpan={3} className="text-center text-[#8a94a6] py-6 text-[12px]">No practice areas configured.</Td></Tr>}
          </Table>
        )}
      </Card>

      {deleteTarget && createPortal(
        <Modal
          title="Delete Practice Area"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary btn-sm">Cancel</button>
              <button 
                onClick={async () => {
                  try {
                    await api.practiceAreas.remove(deleteTarget.id);
                    toast('Practice area deleted successfully', 'success');
                    loadAreas();
                    setDeleteTarget(null);
                  } catch (e) {
                    toast(e.message || 'Failed to delete practice area', 'error');
                  }
                }} 
                className="btn btn-primary btn-sm !bg-red-500 hover:!bg-red-600 !border-red-500"
              >
                Delete
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-[13px] text-red-200 font-700">Are you sure you want to delete practice area "{deleteTarget.name}"?</p>
                <p className="text-[12px] text-red-300/70 mt-1">This action cannot be undone and will permanently remove this practice area.</p>
              </div>
            </div>
          </div>
        </Modal>,
        document.body
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────
//  CUSTOM FIELDS TAB
// ─────────────────────────────────────────────────────────
function CustomFieldsTab({ toast }) {
  const [fields, setFields] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  const loadFields = async () => {
    try {
      const res = await api.customFields.list();
      setFields(res.data || []);
    } catch (e) {
      toast('Failed to load custom fields', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFields(); }, []);
  useEffect(() => {
    window.addEventListener('vktori:entities-changed', loadFields);
    return () => window.removeEventListener('vktori:entities-changed', loadFields);
  }, []);

  const toggleActive = async (field) => {
    try {
      await api.customFields.update(field.id, { is_active: !field.is_active });
      loadFields();
    } catch (e) {
      toast('Failed to update status', 'error');
    }
  };

  return (
    <>
      <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0 mb-6">
          <div>
            <h3 className="text-[14px] font-900 text-white uppercase tracking-widest">Custom Matter Fields</h3>
            <p className="text-[11px] text-[#8a94a6] mt-1">Configure dynamic fields to collect custom data on matters.</p>
          </div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('vktori:open-modal', { detail: { type: 'add-custom-field' } }))} className="btn btn-primary h-10 px-6 text-[11px] font-900 uppercase tracking-widest">
            + Add Custom Field
          </button>
        </div>
        {loading ? <div className="text-[#8a94a6] text-center p-6 text-[12px]">Loading...</div> : (
          <Table headers={['Name', 'Type', 'Status', 'Actions']}>
            {fields.map(f => (
              <Tr key={f.id}>
                <Td><span className="text-white font-600 text-[13px]">{f.name}</span></Td>
                <Td><span className="text-[#8a94a6] font-500 text-[12px] uppercase">{f.type}</span></Td>
                <Td>
                  <div onClick={() => toggleActive(f)} className={`w-10 h-5 rounded-full relative cursor-pointer transition-all duration-300 ${f.is_active ? 'bg-[#10b981]' : 'bg-white/10'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 ${f.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-4">
                    <button onClick={() => window.dispatchEvent(new CustomEvent('vktori:open-modal', { detail: { type: 'edit-custom-field', data: f } }))} className="text-[#38bdf8] text-[11px] font-900 uppercase hover:underline">Edit</button>
                    <button onClick={() => setDeleteTarget(f)} className="text-red-500 text-[11px] font-900 uppercase hover:underline">Delete</button>
                  </div>
                </Td>
              </Tr>
            ))}
            {fields.length === 0 && <Tr><Td colSpan={4} className="text-center text-[#8a94a6] py-6 text-[12px]">No custom fields configured.</Td></Tr>}
          </Table>
        )}
      </Card>

      {deleteTarget && createPortal(
        <Modal
          title="Delete Custom Field"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary btn-sm">Cancel</button>
              <button 
                onClick={async () => {
                  try {
                    await api.customFields.remove(deleteTarget.id);
                    toast('Custom field deleted successfully', 'success');
                    loadFields();
                    setDeleteTarget(null);
                  } catch (e) {
                    toast(e.message || 'Failed to delete custom field', 'error');
                  }
                }} 
                className="btn btn-primary btn-sm !bg-red-500 hover:!bg-red-600 !border-red-500"
              >
                Delete
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-[13px] text-red-200 font-700">Are you sure you want to delete custom field "{deleteTarget.name}"?</p>
                <p className="text-[12px] text-red-300/70 mt-1">This action cannot be undone and will permanently remove this custom field definition.</p>
              </div>
            </div>
          </div>
        </Modal>,
        document.body
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────
//  INTAKE MODULES TAB (Enterprise Adaptive Engine Settings)
// ─────────────────────────────────────────────────────────
function IntakeModulesTab({ toast }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeFieldModuleId, setActiveFieldModuleId] = useState(null);

  const [formState, setFormState] = useState({ title: '', icon: '📋', category: 'General', practice_area: 'All', description: '' });
  const [newField, setNewField] = useState({ field_label: '', field_type: 'text', placeholder: '', is_required: false, options: '' });

  const loadModules = async () => {
    try {
      const res = await api.settings.intakeModules.list();
      setModules(res.data || []);
    } catch (e) {
      toast('Failed to load intake modules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadModules(); }, []);

  const toggleEnabled = async (mod) => {
    try {
      await api.settings.intakeModules.update(mod.id, { is_enabled: !mod.is_enabled });
      loadModules();
      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
      toast(`Module "${mod.title}" ${!mod.is_enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (e) {
      toast(e.message || 'Failed to update module status', 'error');
    }
  };

  const moveOrder = async (index, direction) => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= modules.length) return;
    const reordered = [...modules];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;
    
    const payload = reordered.map((m, idx) => ({ id: m.id, display_order: idx + 1 }));
    setModules(reordered);
    try {
      await api.settings.intakeModules.reorder(payload);
      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
    } catch (_) {
      loadModules();
    }
  };

  const handleCreateModule = async () => {
    if (!formState.title.trim()) {
      toast('Module title is required', 'error');
      return;
    }
    try {
      await api.settings.intakeModules.create(formState);
      toast('Custom intake module created successfully', 'success');
      setShowAddModal(false);
      setFormState({ title: '', icon: '📋', category: 'General', practice_area: 'All', description: '' });
      loadModules();
    } catch (e) {
      toast(e.message || 'Failed to create module', 'error');
    }
  };

  const handleAddField = async (mod) => {
    if (!newField.field_label.trim()) {
      toast('Field label is required', 'error');
      return;
    }
    const opts = newField.options ? newField.options.split(',').map(s => s.trim()).filter(Boolean) : null;
    const fieldObj = {
      field_label: newField.field_label.trim(),
      field_key: newField.field_label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      field_type: newField.field_type,
      placeholder: newField.placeholder.trim(),
      is_required: newField.is_required,
      options: opts
    };

    const updatedFields = [...(mod.fields || []), fieldObj];
    try {
      await api.settings.intakeModules.update(mod.id, { fields: updatedFields });
      toast('Field added to module', 'success');
      setNewField({ field_label: '', field_type: 'text', placeholder: '', is_required: false, options: '' });
      loadModules();
    } catch (e) {
      toast(e.message || 'Failed to add field', 'error');
    }
  };

  const handleDeleteField = async (mod, fieldIdx) => {
    const updatedFields = (mod.fields || []).filter((_, idx) => idx !== fieldIdx);
    try {
      await api.settings.intakeModules.update(mod.id, { fields: updatedFields });
      toast('Field removed', 'info');
      loadModules();
    } catch (e) {
      toast('Failed to remove field', 'error');
    }
  };

  const handleDeleteModule = async () => {
    if (!deleteTarget) return;
    try {
      await api.settings.intakeModules.remove(deleteTarget.id);
      toast('Custom intake module deleted', 'success');
      setDeleteTarget(null);
      loadModules();
    } catch (e) {
      toast(e.message || 'Failed to delete module', 'error');
    }
  };

  return (
    <>
      <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-[14px] font-900 text-white uppercase tracking-widest flex items-center gap-2">
              <span>Enterprise Adaptive Intake Modules</span>
            </h3>
            <p className="text-[11px] text-[#8a94a6] mt-1">Configure core screening modules and build custom dynamic intake modules for the Matter Wizard.</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary h-10 px-6 text-[11px] font-900 uppercase tracking-widest">
            + Create Custom Module
          </button>
        </div>

        {loading ? <div className="text-[#8a94a6] text-center p-6 text-[12px]">Loading intake modules...</div> : (
          <Table headers={['Order', 'Module Name', 'Type', 'Category', 'Status', 'Actions']}>
            {modules.map((m, idx) => (
              <React.Fragment key={m.id}>
                <Tr>
                  <Td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveOrder(idx, 'up')} disabled={idx === 0} className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white text-xs flex items-center justify-center font-bold">▲</button>
                      <button onClick={() => moveOrder(idx, 'down')} disabled={idx === modules.length - 1} className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white text-xs flex items-center justify-center font-bold">▼</button>
                      <span className="text-xs font-mono text-slate-400 ml-1">#{m.display_order}</span>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div>
                        <p className="text-white font-bold text-[13px]">{m.title}</p>
                        {m.description && <p className="text-[11px] text-slate-400">{m.description}</p>}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {m.is_core ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">CORE</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">CUSTOM</span>
                    )}
                  </Td>
                  <Td><span className="text-[#8a94a6] font-500 text-[12px]">{m.category}</span></Td>
                  <Td>
                    <div onClick={() => toggleEnabled(m)} className={`w-10 h-5 rounded-full relative cursor-pointer transition-all duration-300 ${m.is_enabled ? 'bg-[#10b981]' : 'bg-white/10'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 ${m.is_enabled ? 'left-[22px]' : 'left-0.5'}`} />
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      {!m.is_core && (
                        <button onClick={() => setActiveFieldModuleId(activeFieldModuleId === m.id ? null : m.id)} className="text-[#38bdf8] text-[11px] font-bold uppercase hover:underline">
                          {activeFieldModuleId === m.id ? 'Close Fields' : `Fields (${m.fields?.length || 0})`}
                        </button>
                      )}
                      {!m.is_core ? (
                        <button onClick={() => setDeleteTarget(m)} className="text-rose-400 text-[11px] font-bold uppercase hover:underline">Delete</button>
                      ) : (
                        <span className="text-slate-600 text-[11px] font-bold uppercase">Built-in</span>
                      )}
                    </div>
                  </Td>
                </Tr>

                {/* Custom Fields Sub-row */}
                {!m.is_core && activeFieldModuleId === m.id && (
                  <Tr>
                    <Td colSpan={6} className="bg-[#0b121e] p-4 border-t border-b border-sky-500/20">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider">Dynamic Fields for "{m.title}"</h4>
                          <span className="text-[11px] text-slate-400">{m.fields?.length || 0} fields configured</span>
                        </div>

                        {/* List existing custom fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {(m.fields || []).map((f, fIdx) => (
                            <div key={fIdx} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-bold text-white">{f.field_label} {f.is_required && <span className="text-rose-400">*</span>}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{f.field_type} · key: {f.field_key}</p>
                              </div>
                              <button onClick={() => handleDeleteField(m, fIdx)} className="text-rose-400 font-bold hover:text-rose-300 text-xs px-2">✕</button>
                            </div>
                          ))}
                        </div>

                        {/* Add Field Form */}
                        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Field Label *</label>
                            <input type="text" value={newField.field_label} onChange={e => setNewField(prev => ({ ...prev, field_label: e.target.value }))} placeholder="e.g. Camera Brand" className="w-full bg-[#161f30] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Field Type</label>
                            <select value={newField.field_type} onChange={e => setNewField(prev => ({ ...prev, field_type: e.target.value }))} className="w-full bg-[#161f30] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white">
                              <option value="text">Text</option>
                              <option value="textarea">Textarea</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                              <option value="checkbox">Checkbox</option>
                              <option value="select">Dropdown</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Placeholder / Options (comma separated)</label>
                            <input type="text" value={newField.options || newField.placeholder} onChange={e => setNewField(prev => ({ ...prev, placeholder: e.target.value, options: e.target.value }))} placeholder="Option A, Option B..." className="w-full bg-[#161f30] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleAddField(m)} className="btn btn-primary text-xs py-1.5 flex-1 font-bold">+ Add Field</button>
                          </div>
                        </div>
                      </div>
                    </Td>
                  </Tr>
                )}
              </React.Fragment>
            ))}
          </Table>
        )}
      </Card>

      {/* Create Module Modal */}
      {showAddModal && (
        <Modal title="Create Custom Intake Module" onClose={() => setShowAddModal(false)}
          footer={
            <>
              <button onClick={() => setShowAddModal(false)} className="btn btn-secondary text-xs">Cancel</button>
              <button onClick={handleCreateModule} className="btn btn-primary text-xs font-bold">Create Module</button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Module Title *" required>
              <Input value={formState.title} onChange={e => setFormState(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Dashcam Footage & Telematics" required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Icon Emoji">
                <Input value={formState.icon} onChange={e => setFormState(prev => ({ ...prev, icon: e.target.value }))} placeholder="📹" />
              </Field>
              <Field label="Category">
                <Select value={formState.category} onChange={e => setFormState(prev => ({ ...prev, category: e.target.value }))}>
                  <option value="General">General</option>
                  <option value="Vehicle">Vehicle</option>
                  <option value="Injury">Injury</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Evidence">Evidence</option>
                  <option value="Property">Property</option>
                </Select>
              </Field>
            </div>
            <Field label="Module Description">
              <Textarea rows={2} value={formState.description} onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))} placeholder="Explain what data this screening module collects..." />
            </Field>
          </div>
        </Modal>
      )}

      {/* Delete Module Modal */}
      {deleteTarget && createPortal(
        <Modal title="Delete Custom Intake Module" onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary text-xs">Cancel</button>
              <button onClick={handleDeleteModule} className="btn bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl px-4 py-2">Delete Module</button>
            </>
          }
        >
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-xs text-red-200 font-bold">Are you sure you want to delete custom module "{deleteTarget.title}"?</p>
              <p className="text-[11px] text-red-300/70 mt-1">This will permanently remove this dynamic intake module definition.</p>
            </div>
          </div>
        </Modal>,
        document.body
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────
//  INTEGRATIONS PAGE
// ─────────────────────────────────────────────────────────
export function IntegrationsPage({ toast }) {
  const [titanAccounts, setTitanAccounts] = useState([]);
  const [isManageTitanAccountsOpen, setIsManageTitanAccountsOpen] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [isDigiSignerModalOpen, setIsDigiSignerModalOpen] = useState(false);
  const [isCourtEfilingModalOpen, setIsCourtEfilingModalOpen] = useState(false);
  const [isPhysicalMailModalOpen, setIsPhysicalMailModalOpen] = useState(false);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.titanEmail.getAccounts();
      setTitanAccounts(res.data || []);
    } catch (e) {
      console.error('Failed to fetch Titan accounts', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.settings.get();
      setSettings(res.data || {});
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadSettings();
  }, []);

  const handleSaveZoom = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    try {
      setLoading(true);
      await api.settings.update({
        zoom_account_id: data.zoom_account_id,
        zoom_client_id: data.zoom_client_id,
        zoom_client_secret: data.zoom_client_secret
      });
      toast('Zoom settings saved successfully!', 'success');
      setIsZoomModalOpen(false);
      loadSettings();
    } catch (err) {
      toast(err.message || 'Failed to save Zoom settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectZoom = async () => {
    try {
      setLoading(true);
      await api.settings.update({
        zoom_account_id: '',
        zoom_client_id: '',
        zoom_client_secret: ''
      });
      toast('Zoom disconnected successfully', 'success');
      setIsZoomModalOpen(false);
      loadSettings();
    } catch (err) {
      toast(err.message || 'Failed to disconnect Zoom', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDigiSigner = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    try {
      setLoading(true);
      await api.settings.update({
        digisigner_api_key: data.digisigner_api_key
      });
      toast('DigiSigner settings saved successfully!', 'success');
      setIsDigiSignerModalOpen(false);
      loadSettings();
    } catch (err) {
      toast(err.message || 'Failed to save DigiSigner settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourtEfiling = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    try {
      setLoading(true);
      await api.settings.update({
        journal_tech_api_key: data.journal_tech_api_key,
        trellis_api_key: data.trellis_api_key
      });
      toast('Court E-Filing Gateway settings saved successfully!', 'success');
      setIsCourtEfilingModalOpen(false);
      loadSettings();
    } catch (err) {
      toast(err.message || 'Failed to save Court E-Filing settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePhysicalMail = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    try {
      setLoading(true);
      await api.settings.update({
        lob_api_key: data.lob_api_key,
        click2mail_api_key: data.click2mail_api_key
      });
      toast('USPS Certified Physical Mail settings saved successfully!', 'success');
      setIsPhysicalMailModalOpen(false);
      loadSettings();
    } catch (err) {
      toast(err.message || 'Failed to save Physical Mail settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const integrationCards = [
    { 
      title: 'Titan Email & Calendar', 
      subtitle: titanAccounts.length > 0 ? `Sync firm communications & calendars. (${titanAccounts.length} account${titanAccounts.length === 1 ? '' : 's'} connected)` : 'Sync firm communications & calendars.', 
      connected: titanAccounts.length > 0, 
      action: () => setIsManageTitanAccountsOpen(true) 
    },
    {
      title: 'Zoom Video Meetings',
      subtitle: settings.zoom_client_id ? 'Synchronize video conferences and calendar meeting rooms.' : 'Connect your firm\'s Zoom account to generate video conference rooms.',
      connected: !!settings.zoom_client_id,
      action: () => setIsZoomModalOpen(true)
    },
    {
      title: 'DigiSigner & Adobe Sign (E-Signature)',
      subtitle: settings.digisigner_api_key ? 'Authorized to request & track digital document signatures.' : 'Connect DigiSigner / Adobe Acrobat Sign API credentials to request secure document signatures.',
      connected: !!settings.digisigner_api_key,
      hidden: true, // Set to false to show on UI when requested by client
      action: () => setIsDigiSignerModalOpen(true)
    },
    {
      title: 'Court Direct E-Filing (Journal Tech & Trellis)',
      subtitle: (settings.journal_tech_api_key || settings.trellis_api_key) ? 'Direct Court Gateway Active for Journal Tech & Trellis E-Filing.' : 'Connect Journal Technologies, Trellis, or LegalConnect API credentials to e-file directly with courts.',
      connected: !!(settings.journal_tech_api_key || settings.trellis_api_key),
      hidden: true, // Set to false to show on UI when requested by client
      action: () => setIsCourtEfilingModalOpen(true)
    },
    {
      title: 'US Certified Physical Mail (Lob.com & Click2Mail)',
      subtitle: (settings.lob_api_key || settings.click2mail_api_key) ? 'USPS Certified Physical Mail Dispatcher Active via Lob API.' : 'Connect Lob.com or Click2Mail API credentials to send physical certified USPS mail directly from software.',
      connected: !!(settings.lob_api_key || settings.click2mail_api_key),
      hidden: true, // Set to false to show on UI when requested by client
      action: () => setIsPhysicalMailModalOpen(true)
    }
  ];

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      <PageHeader title="Integrations" subtitle="Connect external communication protocols, calendar services, and firm tools" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrationCards.filter(item => !item.hidden).map((item) => (
          <Card key={item.title} className="flex flex-col gap-6 border-white/5 bg-white/[0.02] backdrop-blur-xl p-8 rounded-[2rem] group hover:border-[#38bdf8]/30 transition-all overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0057c7]/5 blur-3xl group-hover:bg-[#0057c7]/10 transition-all pointer-events-none" />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-[15px] font-900 text-white tracking-tight leading-none mb-2">{item.title}</h3>
                <p className="text-[12px] text-[#8a94a6] font-500 leading-relaxed opacity-70">{item.subtitle}</p>
              </div>
              <span className={`flex-shrink-0 inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-900 uppercase tracking-widest border transition-all ${item.connected ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-white/5 text-[#8a94a6] border-white/10 opacity-50'}`}>
                {item.connected ? 'Active Sync' : 'Plug & Play Ready'}
              </span>
            </div>
            <div className="flex justify-end pt-5 mt-auto border-t border-white/5">
              <button type="button" onClick={item.action} disabled={loading} className={`h-9 px-4 rounded-xl text-[10px] font-900 uppercase tracking-widest transition-all ${
                item.title.startsWith('Titan')
                  ? 'bg-[#0057c7] text-white hover:bg-[#004bb1] shadow-lg shadow-[#0057c7]/20'
                  : item.connected
                    ? 'bg-white/5 text-[#38bdf8] hover:bg-[#38bdf8]/10 hover:border-[#38bdf8]/30 border border-white/10'
                    : 'bg-[#0057c7] text-white hover:bg-[#004bb1] shadow-lg shadow-[#0057c7]/20'
              } disabled:opacity-50`}>
                {item.connected ? 'Configure' : 'Connect / Test Driver'}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {isManageTitanAccountsOpen && createPortal(
        <Modal
          title="Manage Titan Mail &amp; Calendar"
          onClose={() => setIsManageTitanAccountsOpen(false)}
        >
          <div className="space-y-6">
            <div>
              <h4 className="text-[12px] font-900 text-white uppercase tracking-widest mb-3">Settings</h4>
              <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl mb-4">
                <div>
                  <p className="text-[13px] font-700 text-white">Titan Calendar Synchronization</p>
                  <p className="text-[11px] text-[#8a94a6] mt-0.5">Automatically sync court dates &amp; hearings with your Titan Calendar</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.titan_sync_calendar === 'true'}
                    onChange={async (e) => {
                      try {
                        const val = e.target.checked ? 'true' : 'false';
                        await api.settings.update({ titan_sync_calendar: val });
                        toast(e.target.checked ? 'Titan calendar sync enabled!' : 'Titan calendar sync disabled.', 'success');
                        loadSettings();
                      } catch (err) {
                        toast(err.message || 'Failed to update calendar sync setting', 'error');
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#38bdf8]"></div>
                </label>
              </div>

              <h4 className="text-[12px] font-900 text-white uppercase tracking-widest mb-3">Connected Accounts</h4>
              {titanAccounts.length === 0 ? (
                <div className="text-[12px] text-[#8a94a6] py-3 bg-white/[0.01] border border-white/5 rounded-xl text-center">
                  No Titan accounts connected yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {titanAccounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0057c7]/10 flex items-center justify-center text-[#38bdf8]">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="M22 6l-10 7L2 6" /></svg>
                        </div>
                        <div>
                          <p className="text-[13px] font-600 text-white leading-tight">{acc.email_address}</p>
                          <p className="text-[10px] text-[#8a94a6] mt-0.5">{acc.imap_host}:{acc.imap_port} (IMAP)</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            setLoading(true);
                            await api.titanEmail.deleteAccount(acc.id);
                            toast('Account disconnected successfully', 'success');
                            const res = await api.titanEmail.getAccounts();
                            setTitanAccounts(res.data || []);
                          } catch (err) {
                            toast(err.message || 'Failed to disconnect account', 'error');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="text-red-500 hover:text-red-400 text-[10px] font-900 uppercase tracking-wider transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                      >
                        Disconnect
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-6">
              <h4 className="text-[12px] font-900 text-white uppercase tracking-widest mb-4">Connect New Account</h4>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const data = Object.fromEntries(formData.entries());
                  try {
                    setLoading(true);
                    await api.titanEmail.addAccount(data);
                    toast('Titan email account connected successfully!', 'success');
                    e.target.reset();
                    const res = await api.titanEmail.getAccounts();
                    setTitanAccounts(res.data || []);
                  } catch (err) {
                    toast(err.message || 'Failed to connect Titan account', 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <Field label="Email Address" required>
                  <Input name="email_address" type="email" placeholder="e.g. victoria@firm.com" required />
                </Field>
                <Field label="App Password" required>
                  <Input name="password" type="password" placeholder="••••••••••••" required />
                </Field>

                <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-4">
                  <p className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest">Advanced Connection Settings</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="IMAP Host">
                      <Input name="imap_host" defaultValue="imap.titan.email" />
                    </Field>
                    <Field label="IMAP Port">
                      <Input name="imap_port" type="number" defaultValue="993" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="SMTP Host">
                      <Input name="smtp_host" defaultValue="smtp.titan.email" />
                    </Field>
                    <Field label="SMTP Port">
                      <Input name="smtp_port" type="number" defaultValue="465" />
                    </Field>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsManageTitanAccountsOpen(false)} className="btn btn-secondary btn-sm">Close</button>
                  <button type="submit" disabled={loading} className="btn btn-primary btn-sm">Connect Account</button>
                </div>
              </form>
            </div>
          </div>
        </Modal>,
        document.body
      )}

      {isZoomModalOpen && createPortal(
        <Modal
          title="Connect Zoom Meeting Rooms"
          onClose={() => setIsZoomModalOpen(false)}
        >
          <form onSubmit={handleSaveZoom} className="space-y-4">
            <p className="text-[12px] text-slate-400">
              Provide your Zoom Server-to-Server OAuth credentials. These keys allow the portal to dynamically generate Zoom meeting links for client consultations, trials, and case hearings.
            </p>
            <Field label="Zoom Account ID" required>
              <Input name="zoom_account_id" defaultValue={settings.zoom_account_id || ''} placeholder="E.g., 2vT5X..." required />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Client ID" required>
                <Input name="zoom_client_id" defaultValue={settings.zoom_client_id || ''} placeholder="Zoom Client ID" required />
              </Field>
              <Field label="Client Secret" required>
                <Input name="zoom_client_secret" type="password" defaultValue={settings.zoom_client_secret || ''} placeholder="••••••••••••" required />
              </Field>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-white/5">
              {settings.zoom_client_id ? (
                <button type="button" onClick={handleDisconnectZoom} className="text-red-500 hover:text-red-400 text-[10px] font-900 uppercase tracking-widest">
                  Disconnect Zoom
                </button>
              ) : <div />}
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsZoomModalOpen(false)} className="btn btn-secondary btn-sm">Close</button>
                <button type="submit" disabled={loading} className="btn btn-primary btn-sm">Save Configuration</button>
              </div>
            </div>
          </form>
        </Modal>,
        document.body
      )}

      {isDigiSignerModalOpen && createPortal(
        <Modal
          title="Connect DigiSigner Credentials"
          onClose={() => setIsDigiSignerModalOpen(false)}
        >
          <form onSubmit={handleSaveDigiSigner} className="space-y-4">
            <p className="text-[12px] text-slate-400">
              Provide your DigiSigner developer API Key. This enables the portal to interface with DigiSigner to send document packages for legal signatures.
            </p>
            <Field label="DigiSigner API Key" required>
              <Input name="digisigner_api_key" defaultValue={settings.digisigner_api_key || ''} placeholder="Your DigiSigner API Key" required />
            </Field>
            <div className="flex justify-between items-center pt-4 border-t border-white/5">
              {settings.digisigner_api_key ? (
                <button type="button" onClick={handleDisconnectDigiSigner} className="text-red-500 hover:text-red-400 text-[10px] font-900 uppercase tracking-widest">
                  Disconnect DigiSigner
                </button>
              ) : <div />}
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsDigiSignerModalOpen(false)} className="btn btn-secondary btn-sm">Close</button>
                <button type="submit" disabled={loading} className="btn btn-primary btn-sm">Save Configuration</button>
              </div>
            </div>
          </form>
        </Modal>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  SETTINGS PAGE
// ─────────────────────────────────────────────────────────
export function SettingsPage({ toast }) {
  const [activeTab, setActiveTab] = useState('Firm Profile');
  const [settings, setSettings] = useState({});
  const [companyProfile, setCompanyProfile] = useState({});
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const logoInputRef = useRef(null);
  const letterheadInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [res, profileRes] = await Promise.all([
          api.settings.get(),
          api.settings.getCompanyProfile()
        ]);
        setSettings(res.data || {});
        setCompanyProfile(profileRes.data || {});
      } catch (e) {
        toast('Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await Promise.all([
        api.settings.update(settings),
        api.settings.updateCompanyProfile(companyProfile)
      ]);
      toast('Firm settings saved successfully!', 'success');
      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
    } catch (e) {
      toast(e.message || 'Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const updateProfile = (key, val) => {
    setCompanyProfile(prev => ({ ...prev, [key]: val }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.settings.uploadLogo(formData);
      setCompanyProfile(res.data || {});
      toast('Logo uploaded successfully', 'success');
    } catch (err) {
      toast(err.message || 'Logo upload failed', 'error');
    }
  };

  const handleLetterheadUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('letterhead', file);
      const res = await api.settings.uploadLetterhead(formData);
      setCompanyProfile(res.data || {});
      toast('Letterhead uploaded successfully', 'success');
    } catch (err) {
      toast(err.message || 'Letterhead upload failed', 'error');
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const res = await api.settings.removeLogo();
      setCompanyProfile(res.data || {});
      toast('Logo removed successfully', 'success');
    } catch (err) {
      toast(err.message || 'Failed to remove logo', 'error');
    }
  };

  const handleRemoveLetterhead = async () => {
    try {
      const res = await api.settings.removeLetterhead();
      setCompanyProfile(res.data || {});
      toast('Letterhead removed successfully', 'success');
    } catch (err) {
      toast(err.message || 'Failed to remove letterhead', 'error');
    }
  };



  return (
    <div className="animate-fade-in space-y-6 pb-20">
      <PageHeader title="Firm Configuration" subtitle="Neural control center for firm protocols and operational settings" />

      <Tabs tabs={['Firm Profile', 'Practice Areas', 'Custom Fields', 'Intake Modules', 'Social Links', 'Security']} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Practice Areas' && <PracticeAreasTab toast={toast} />}
      {activeTab === 'Custom Fields' && <CustomFieldsTab toast={toast} />}
      {activeTab === 'Intake Modules' && <IntakeModulesTab toast={toast} />}

      {activeTab === 'Firm Profile' && (
        <Card className="max-w-3xl border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 sm:gap-8 mb-10 pb-10 border-b border-white/5">
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#0057c7] to-[#0B1F3A] flex items-center justify-center text-4xl text-white font-900 shadow-[0_15px_40px_rgba(0,87,199,0.3)] border border-white/10 relative overflow-hidden group flex-shrink-0">
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              {companyProfile.logo_url ? (
                <img src={`${API_BASE_URL.replace(/\/api$/, '')}${companyProfile.logo_url}`} alt="Logo" className="w-full h-full object-contain bg-white" />
              ) : (
                <span className="relative z-10 drop-shadow-2xl">{String(companyProfile.company_name || 'V')[0]}</span>
              )}
            </div>
            <div>
              <h3 className="text-[22px] font-900 text-white font-display tracking-tight leading-none mb-2">{companyProfile.company_name || 'Victoria Tulsidas Law'}</h3>
              <p className="text-[11px] text-[#8a94a6] font-900 uppercase tracking-[0.3em] opacity-60">Centralized Firm Profile</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Field label="Law Firm Name"><Input value={companyProfile.company_name || ''} onChange={e => updateProfile('company_name', e.target.value)} placeholder="Full legal name" /></Field>
            <Field label="Global Phone Link"><Input value={companyProfile.phone || ''} onChange={e => updateProfile('phone', e.target.value)} placeholder="+1 (000) 000-0000" /></Field>
            <Field label="Primary Secure Email"><Input value={companyProfile.email || ''} onChange={e => updateProfile('email', e.target.value)} placeholder="administrative@firm.com" /></Field>
            <Field label="Website"><Input value={companyProfile.website || ''} onChange={e => updateProfile('website', e.target.value)} placeholder="https://www.firm.com" /></Field>
            <div className="md:col-span-2">
              <Field label="Firm Address"><Textarea rows={2} value={companyProfile.address || ''} onChange={e => updateProfile('address', e.target.value)} placeholder="123 Legal Avenue..." /></Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Standard Hourly Rate ($/HR)"><Input type="number" value={settings.billing_rate || ''} onChange={e => updateSetting('billing_rate', e.target.value)} placeholder="e.g. 350" /></Field>
            </div>
          </div>

          {/* Branding Uploads */}
          <div className="space-y-6 pt-6 border-t border-white/5">
            <h4 className="text-[12px] font-900 text-white uppercase tracking-[0.2em]">Document Branding (PDFs & Templates)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Upload */}
              <div className="p-5 border border-white/5 rounded-2xl bg-white/[0.02]">
                <p className="text-[11px] text-[#8a94a6] font-900 uppercase tracking-widest mb-3">Firm Logo</p>
                <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={handleLogoUpload} />
                <button onClick={() => logoInputRef.current?.click()} className="btn w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] uppercase font-900 tracking-wider">
                  Upload Logo
                </button>
                {companyProfile.logo_url && (
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-[10px] text-[#10b981]">✓ Logo Active</p>
                    <button onClick={handleRemoveLogo} className="text-[10px] text-[#ef4444] hover:text-[#ef4444]/80 font-800 uppercase tracking-widest transition-colors">
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-10 pt-6 border-t border-white/5">
            <button onClick={handleSave} disabled={loading} className="h-12 px-10 rounded-2xl bg-[#0057c7] text-white text-[11px] font-900 uppercase tracking-widest hover:bg-[#004bb1] transition-all shadow-[0_10px_30px_rgba(0,87,199,0.3)] disabled:opacity-50">
              {loading ? 'Reconciling...' : 'Save Configuration'}
            </button>
          </div>
        </Card>
      )}


      
      {activeTab === 'Social Links' && <SocialLinksSettings toast={toast} />}

      {activeTab === 'Security' && (
        <div className="max-w-3xl space-y-6">
          {/* Card 1: Point 25 — Firm Data Export & Backup (No Lock-In) */}
          <Card className="border-indigo-500/20 bg-indigo-500/5 backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-extrabold text-lg">
                  🛡️
                </div>
                <div>
                  <h3 className="text-xs font-900 text-indigo-200 uppercase tracking-[0.25em]">
                    Section 13: Data Portability & Backup Protocols (Point 25)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    No Lock-In Data Export & Encrypted Disaster Recovery
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full uppercase">
                AES-256 Protected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1-Click Export */}
              <div className="bg-white/[0.02] border border-white/10 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>📦</span> Export All Firm Data (No Lock-In)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    Download complete unencrypted JSON/Zip backup containing all clients, matters, invoices, time entries, and audit logs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const res = await api.settings.exportFirmData();
                      const exportObj = res.data || res;
                      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `firm_export_${new Date().toISOString().slice(0,10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast('Full firm data exported successfully! (Point 25)', 'success');
                    } catch (e) {
                      toast(e.message || 'Data export failed', 'error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 rounded-xl border border-indigo-400/30 shadow-lg shadow-indigo-600/20 w-full"
                >
                  📥 Export Firm Data (JSON)
                </button>
              </div>

              {/* Encrypted Backup */}
              <div className="bg-white/[0.02] border border-white/10 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>💾</span> Automated Daily Backup Engine
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    Automated daily encrypted snapshot. Test recovery procedure verified.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const res = await api.settings.runBackup();
                      toast(`Encrypted Backup Created: ${res.data?.backup_file || 'Snapshot created'} (Point 25)`, 'success');
                    } catch (e) {
                      toast(e.message || 'Backup creation failed', 'error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="btn bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 rounded-xl border border-emerald-400/30 shadow-lg shadow-emerald-600/20 w-full"
                >
                  ⚡ Run Immediate Backup
                </button>
              </div>
            </div>
          </Card>

          {/* Card 2: Point 22 & 23 & 24 — Security Protocols Summary */}
          <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-xs font-900 text-white uppercase tracking-[0.25em] flex items-center gap-2">
                <span>🔐</span> Active Security & Confidentiality Rules (Section 13)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block">Point 22: Field Encryption</span>
                <span className="text-xs font-extrabold text-white block">AES-256-CBC at Rest</span>
                <span className="text-[10px] text-slate-400 block mt-1">SSN, A-Numbers & DL Numbers masked with click-to-reveal.</span>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">Point 23: RBAC Restrictions</span>
                <span className="text-xs font-extrabold text-white block">Law Clerk Assigned Cases</span>
                <span className="text-[10px] text-slate-400 block mt-1">Law clerks restricted strictly to assigned matters.</span>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">Point 24: Inactivity & MFA</span>
                <span className="text-xs font-extrabold text-white block">15-Min Auto Logout</span>
                <span className="text-[10px] text-slate-400 block mt-1">Full Audit logging on views/edits + MFA security.</span>
              </div>
            </div>
          </Card>

          {/* Card 3: Password Update */}
          <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-[#0057c7]/10 flex items-center justify-center text-[#38bdf8]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h3 className="text-[11px] font-900 text-white uppercase tracking-[0.3em]">Access Credentials & Password Vault</h3>
            </div>
            <div className="space-y-6">
              <Field label="Current Authorization Password"><Input type="password" placeholder="••••••••" value={passwordForm.currentPassword} onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))} /></Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="New Secure Password"><Input type="password" placeholder="••••••••" value={passwordForm.newPassword} onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))} /></Field>
                <Field label="Confirm Synchronization"><Input type="password" placeholder="••••••••" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))} /></Field>
              </div>
            </div>
            <div className="flex justify-end mt-10 pt-6 border-t border-white/5">
              <button onClick={async () => {
                  if (!passwordForm.currentPassword || !passwordForm.newPassword) return toast('Please fill in all password fields', 'error');
                  if (passwordForm.newPassword !== passwordForm.confirmPassword) return toast('Passwords do not match', 'error');
                  if (passwordForm.currentPassword === passwordForm.newPassword) return toast('New password cannot be the same as the current password', 'error');
                  try {
                    setLoading(true);
                    await api.auth.changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
                    toast('Password updated successfully!', 'success');
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  } catch (e) { toast(e.message || 'Failed to update password', 'error'); } finally { setLoading(false); }
                }} disabled={loading} className="h-12 px-10 rounded-2xl bg-[#0057c7] text-white text-[11px] font-900 uppercase tracking-widest hover:bg-[#004bb1] transition-all shadow-[0_10px_30px_rgba(0,87,199,0.3)] disabled:opacity-50">
                {loading ? 'Updating Vault...' : 'Reset Credentials'}
              </button>
            </div>
          </Card>
        </div>
      )}



    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  TEMPLATE LIBRARY COMPONENT
// ─────────────────────────────────────────────────────────
export function TemplateLibrary({ targetMatterId, onSelect, toast }) {
  const [templates, setTemplates] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const loadTemplates = () => {
    if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
    api.templates.list({ limit: 100 }).then(res => {
      setTemplates(res.data || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleDuplicate = async (id) => {
    try {
      await api.templates.duplicate(id);
      if (toast) toast('Template duplicated successfully!', 'success');
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.templates.remove(id);
      if (toast) toast('Template deleted successfully!', 'success');
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (template) => {
    window.dispatchEvent(new CustomEvent('vktori:open-modal', {
      detail: { 
        type: 'edit-template', 
        data: template, 
        onSave: async (values) => {
          const catVal = values.category === 'other'
            ? (values.custom_category || '').trim()
            : (values.category || 'court_form');
          const paVal = values.practice_area === 'other'
            ? (values.custom_practice_area || '').trim()
            : (values.practice_area || null);
          await api.templates.update(template.id, {
            title: values.title,
            content: values.content,
            category: catVal,
            practice_area: paVal,
            matter_type: paVal,
            description: values.description || null,
            is_active: values.is_active !== 'inactive',
          });
          if (toast) toast('Template updated successfully!', 'success');
          loadTemplates();
        }
      }
    }));
  };

  const filtered = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          (t.category || '').toLowerCase().includes(search.toLowerCase()) ||
                          (t.description || '').toLowerCase().includes(search.toLowerCase());
    const mappedTab = activeTab.toLowerCase().replace(/ /g, '_');
    const matchesTab = activeTab === 'All' || (t.category || '').toLowerCase() === mappedTab;
    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="w-10 h-10 border-4 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-[#8a94a6] font-600 animate-pulse">Accessing Secure Library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative group flex-1">
          <input
            className="text-[14px] bg-white/[0.03] border border-white/10 rounded-2xl pl-11 pr-4 py-3 w-full outline-none focus:border-[#38bdf8] focus:ring-4 focus:ring-[#0057c7]/20 text-white transition-all placeholder:text-white/20"
            placeholder="Search global templates by title, description or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#8a94a6] group-focus-within:text-[#38bdf8] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('vktori:open-modal', {
              detail: { 
                type: 'add-template', 
                data: null, 
                onSave: async (values) => {
                  const catVal = values.category === 'other'
                    ? (values.custom_category || '').trim()
                    : (values.category || 'court_form');
                  const paVal = values.practice_area === 'other'
                    ? (values.custom_practice_area || '').trim()
                    : (values.practice_area || null);
                  await api.templates.create({
                    title: values.title,
                    content: values.content,
                    category: catVal,
                    practice_area: paVal,
                    matter_type: paVal,
                    description: values.description || null,
                    is_active: values.is_active !== 'inactive',
                  });
                  if (toast) toast('Template created successfully!', 'success');
                  loadTemplates();
                }
              }
            }));
          }}
          className="btn btn-primary h-12 px-6 text-[11px] font-900 uppercase tracking-widest shadow-[#0057c7]/20 whitespace-nowrap"
        >
          Create Template
        </button>
      </div>

      <div className="flex gap-2 border-b border-white/5 pb-4 mb-2 overflow-x-auto custom-scrollbar">
        {['All', 'Agreement', 'Court Form', 'Letter', 'Contract', 'Motion', 'Pleading', 'Affidavit', 'Notice', 'Demand Letter', 'Legal Disclaimer', 'Other'].map(cat => {
          const tabKey = cat === 'All' ? 'All' : cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-900 uppercase tracking-widest transition-colors whitespace-nowrap ${
                activeTab === cat ? 'bg-[#38bdf8] text-white shadow-lg shadow-[#38bdf8]/20' : 'bg-white/5 text-[#8a94a6] hover:text-white hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="max-h-[450px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {filtered.length > 0 ? filtered.map(t => (
          <div key={t.id} className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#38bdf8]/30 transition-all group flex items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0057c7]/5 blur-3xl pointer-events-none group-hover:bg-[#0057c7]/10 transition-all" />
            <div className="min-w-0 relative z-10 flex-1">
              <p className="text-[15px] font-800 text-white group-hover:text-[#38bdf8] transition-colors tracking-tight">{t.title}</p>
              {t.description && (
                <p className="text-[12px] text-[#8a94a6] mt-1 line-clamp-2 font-500">{t.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-[9px] font-900 px-2.5 py-1 rounded-lg bg-[#0057c7]/10 text-[#38bdf8] border border-[#0057c7]/20 uppercase tracking-[0.15em]">{t.category || 'General'}</span>
                <span className="text-[11px] text-[#8a94a6] font-700 opacity-60">· Template Ref #{t.id}</span>
                <span className={`text-[10px] font-900 px-2 py-0.5 rounded uppercase tracking-wider ${t.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'}`}>
                  {t.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-10 flex-shrink-0">
              <button onClick={() => handleEdit(t)} className="btn btn-secondary h-9 px-4 text-[11px] font-900 uppercase tracking-widest whitespace-nowrap">
                Edit
              </button>
              <button onClick={() => handleDuplicate(t.id)} className="btn btn-secondary h-9 px-4 text-[11px] font-900 uppercase tracking-widest whitespace-nowrap">
                Duplicate
              </button>
              <button onClick={() => handleDelete(t.id)} className="btn btn-secondary h-9 px-4 text-[11px] font-900 uppercase tracking-widest text-rose-400 border-rose-500/10 hover:bg-rose-500/10 whitespace-nowrap">
                Delete
              </button>
              {targetMatterId && (
                <button onClick={() => {
                    window.dispatchEvent(new CustomEvent('vktori:open-modal', {
                      detail: { type: 'use-template', data: { ...t, targetMatterId } }
                    }));
                  }} className="btn btn-primary h-9 px-6 text-[11px] font-900 uppercase tracking-widest shadow-[#0057c7]/20 whitespace-nowrap">
                  Apply Template
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
            <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5"><svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg></div>
            <p className="text-[14px] font-800 text-white opacity-40">No matching templates found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  SOCIAL LINKS SETTINGS
// ─────────────────────────────────────────────────────────
export function SocialLinksSettings({ toast }) {
  const [links, setLinks] = useState([
    { platform: 'LinkedIn', url: '' },
    { platform: 'Instagram', url: '' },
    { platform: 'Facebook', url: '' },
    { platform: 'YouTube', url: '' }
  ]);
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.marketing.getSocialLinks();
        if (res.success && res.data.length > 0) {
          const merged = links.map(d => {
            const found = res.data.find(r => r.platform === d.platform);
            return found ? { ...d, url: found.url || '' } : d;
          });
          setLinks(merged);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.marketing.updateSocialLinks(links);
      toast('Social links updated successfully!', 'success');
    } catch (e) { toast(e.message || 'Failed to update links', 'error'); } finally { setSaving(false); }
  };

  const updateUrl = (platform, url) => {
    setLinks(prev => prev.map(l => l.platform === platform ? { ...l, url } : l));
  };

  if (loading) {
    return (
      <Card className="max-w-3xl border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-48 bg-white/5 rounded" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl" />)}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl border-white/5 bg-white/[0.02] backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#0057c7]/10 flex items-center justify-center text-[#38bdf8]"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg></div>
        <h3 className="text-[11px] font-900 text-white uppercase tracking-[0.3em]">Institutional Presence</h3>
      </div>
      <p className="text-[13px] text-[#8a94a6] mb-10 leading-relaxed opacity-70">Configure authenticated social identity links for the firm's public portal.</p>
      
      <div className="space-y-6">
        {links.map(link => (
          <div key={link.platform} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-[#38bdf8]/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform">
                {link.platform === 'LinkedIn' ? <svg className="w-5 h-5 text-[#0077b5]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg> : link.platform === 'Instagram' ? <svg className="w-5 h-5 text-[#e1306c]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> : link.platform === 'Facebook' ? <svg className="w-5 h-5 text-[#1877f2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> : <svg className="w-5 h-5 text-[#ff0000]" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>}
              </div>
              <span className="text-[14px] font-900 text-white tracking-tight">{link.platform}</span>
            </div>
            <div className="md:col-span-3"><Input placeholder={`Authenticated path for ${link.platform}`} value={link.url} onChange={e => updateUrl(link.platform, e.target.value)} /></div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-10 pt-6 border-t border-white/5">
        <button onClick={handleSave} disabled={saving} className="h-12 px-10 rounded-2xl bg-[#0057c7] text-white text-[11px] font-900 uppercase tracking-widest hover:bg-[#004bb1] transition-all shadow-[0_10px_30px_rgba(0,87,199,0.3)] disabled:opacity-50">
          {saving ? 'Synchronizing...' : 'Update Social Protocols'}
        </button>
      </div>
    </Card>
  );
}
