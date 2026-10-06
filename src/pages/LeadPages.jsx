import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Badge, PageHeader, Card, Table, Tr, Td, Avatar, StatCard, Field, Input, Select, Textarea, Modal, downloadFile } from '../components/UI.jsx';
import api from '../services/api';
import { formatUSPhone } from '../utils/phoneUtils';
import { formatPSTDate } from '../utils/dateUtils';

function leadInitials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 3).toUpperCase();
}

function formatLeadDate(d) {
  if (!d) return '—';
  return formatPSTDate(d);
}

const STAGE_KEYS = [
  { key: 'all', label: 'All Stages' },
  { key: 'new', label: 'New' },
  { key: 'screening', label: 'Screening' },
  { key: 'referred', label: 'Referral / Referred' },
  { key: 'consultation_set', label: 'Consultation' },
  { key: 'retained', label: 'Retained' },
  { key: 'declined', label: 'Declined' },
  { key: 'archived', label: 'Archived' },
];

// ─────────────────────────────────────────────────────────
//  LEAD DASHBOARD (INQUIRIES REVIEW QUEUE)
// ─────────────────────────────────────────────────────────
export function LeadDashboard({ navigate, toast, openModal }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  const load = async () => {
    if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
    setError('');
    try {
      const res = await api.leads.list({ limit: 500 });
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const h = () => setRefreshTick(t => t + 1);
    window.addEventListener('vktori:entities-changed', h);
    return () => window.removeEventListener('vktori:entities-changed', h);
  }, []);

  useEffect(() => { load(); }, [refreshTick]);

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (l.full_name || '').toLowerCase().includes(q) ||
      (l.matter_type || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q);
    const matchStage = stageFilter === 'all' || l.status === stageFilter;
    return matchSearch && matchStage;
  });

  const countBy = (s) => leads.filter((l) => l.status === s).length;
  const newCount = countBy('new');
  const screeningCount = countBy('screening');
  const consultCount = countBy('consultation_set');
  const retainedCount = countBy('retained');
  const total = leads.length;
  const convRate = total ? Math.round((retainedCount / total) * 100) : 0;

  if (loading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-slate-500">Loading leads…</p>
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
      <PageHeader title="Inquiries & Review Queue" subtitle="Manage prospective parties, screening pipeline, and conflict checks">
        <button
          onClick={() => {
            const intakeUrl = `${window.location.origin}/public-intake`;
            navigator.clipboard.writeText(intakeUrl);
            toast(`Public intake link copied to clipboard: ${intakeUrl}`, 'success');
          }}
          className="btn btn-secondary text-xs font-bold"
        >
          Copy Public Intake Link
        </button>
        <button onClick={() => navigate('/admin/conflict-check')} className="btn btn-secondary">Conflict Check</button>
        <button onClick={() => openModal('add-lead')} className="btn btn-primary">+ New Lead</button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="New Leads" value={String(newCount)} 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 4v16m8-8H4" /></svg>}
          iconBg="bg-[#0057c7]/10 text-[#38bdf8]" gradient="linear-gradient(90deg,#0B1F3A,#C9A24A)" />
        <StatCard label="In Screening" value={String(screeningCount)} 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>}
          iconBg="bg-amber-500/10 text-amber-400" gradient="linear-gradient(90deg,#f59e0b,#fbbf24)" />
        <StatCard label="Consultations" value={String(consultCount)} 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          iconBg="bg-emerald-500/10 text-emerald-400" gradient="linear-gradient(90deg,#10b981,#34d399)" />
        <StatCard label="Conversion Rate" value={`${convRate}%`} 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          iconBg="bg-indigo-500/10 text-indigo-400" gradient="linear-gradient(90deg,#0B1F3A,#C9A24A)" />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 no-scrollbar">
        {STAGE_KEYS.map(({ key, label }) => {
          const count = key === 'all' ? total : countBy(key);
          return (
            <button key={key} onClick={() => setStageFilter(key)}
              className={`px-4 py-2 rounded-xl text-[12px] font-700 border transition-all whitespace-nowrap ${stageFilter === key ? 'bg-[#0057c7] text-white border-transparent shadow-lg shadow-[#0057c7]/20' : 'bg-white/5 text-[#8a94a6] border-white/5 hover:border-white/20 hover:bg-white/10 hover:text-white'}`}>
              {label} <span className={`ml-1 opacity-50 ${stageFilter === key ? 'text-white' : ''}`}>({count})</span>
            </button>
          );
        })}
      </div>

      <Table headers={['Lead Name', 'Matter Type', 'Source', 'Received', 'Status', '']}
        searchPlaceholder="Search leads..." onSearch={setSearch}>
        {filtered.map((l) => {
          const isUrgent = l.has_court_date;
          return (
            <Tr key={l.id} onClick={() => navigate(`/admin/intake-leads/${l.id}`)}>
              <Td>
                <div className="flex items-center gap-3">
                  <Avatar initials={leadInitials(l.full_name)} size="sm" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-700 text-white group-hover:text-[#38bdf8] transition-colors">{l.full_name}</p>
                      {isUrgent && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 uppercase animate-pulse">🚨 URGENT</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8a94a6] font-500">#{l.id}</p>
                  </div>
                </div>
              </Td>
              <Td><span className="text-[11px] bg-[#0057c7]/20 text-[#38bdf8] px-2.5 py-1 rounded-lg font-700 border border-[#0057c7]/30">{l.matter_type || '—'}</span></Td>
              <Td className="text-[#b8c2d1] text-[13px] font-500">{l.source || '—'}</Td>
              <Td className="text-[#b8c2d1] text-[13px] font-500">{formatLeadDate(l.created_at)}</Td>
              <Td><Badge status={l.status} /></Td>
              <Td>
                <button type="button" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[#8a94a6] hover:bg-[#0057c7] hover:text-white hover:border-transparent transition-all group/btn" title="View Detail">
                  <svg className="w-4 h-4 transition-transform group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
              </Td>
            </Tr>
          );
        })}
      </Table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  LEAD DETAIL PAGE
// ─────────────────────────────────────────────────────────
export function LeadDetailPage({ leadId, navigate, openModal, toast }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('new');
  const [notes, setNotes] = useState('');

  // Conflict Check Modal state
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictRunning, setConflictRunning] = useState(false);
  const [conflictResult, setConflictResult] = useState(null);

  // Non-Engagement Decline Modal state
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('Outside Practice Area');
  const [declineNotes, setDeclineNotes] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.leads.get(leadId);
        if (cancelled) return;
        const L = res.data;
        setLead(L);
        setStatus(L.status);
        setNotes(L.notes || '');
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load lead');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [leadId]);

  const saveLead = async () => {
    try {
      await api.leads.update(leadId, { status, notes });
      toast('Lead updated successfully!', 'success');
      const res = await api.leads.get(leadId);
      setLead(res.data);
    } catch (e) {
      toast(e.message || 'Update failed', 'error');
    }
  };

  const convertLead = async () => {
    try {
      const res = await api.leads.convert(leadId);
      toast('Lead converted to client.', 'success');
      const clientId = res?.data?.client?.id || res?.data?.id;
      navigate(`/admin/clients/${clientId}`);
    } catch (e) {
      toast(e.message || 'Conversion failed', 'error');
    }
  };

  // 1-Click Conflict Check from Inquiry
  const runInquiryConflictCheck = async () => {
    if (!lead) return;
    setConflictModalOpen(true);
    setConflictRunning(true);
    setConflictResult(null);
    try {
      const res = await api.conflicts.check({ prospectiveClient: lead.full_name, opposingParty: '' });
      setConflictResult(res.data || res);
    } catch (e) {
      toast(e.message || 'Conflict check failed', 'error');
    } finally {
      setConflictRunning(false);
    }
  };

  // Decline Inquiry & Generate Non-Engagement Letter
  const confirmDeclineAndGenerateLetter = async () => {
    if (!lead) return;
    try {
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const letterText = `VICTORIA TULSIDAS LAW
A PROFESSIONAL LEGAL CORPORATION
9200 Sunset Blvd, Suite 400, West Hollywood, CA 90069
Tel: (310) 504-2359 | Email: info@victoriatulsidaslaw.com

------------------------------------------------------------------
NOTICE OF NON-ENGAGEMENT & DECLINATION OF REPRESENTATION
------------------------------------------------------------------

Date: ${dateStr}
Prospective Client: ${lead.full_name}
Email / Contact: ${lead.email || formatUSPhone(lead.phone) || 'N/A'}
Inquiry Reference: Lead #${lead.id} (${lead.matter_type || 'General Legal Matter'})

Dear ${lead.full_name},

Thank you for contacting Victoria Tulsidas Law regarding your prospective legal matter.

After evaluating your inquiry, we regret to inform you that our firm is unable to accept representation in your matter at this time.

REASON FOR DECLINATION:
${declineReason}${declineNotes ? ` - ${declineNotes}` : ''}

IMPORTANT LEGAL NOTICES:
1. NO ATTORNEY-CLIENT RELATIONSHIP FORMED:
   Please be advised that your submission of an inquiry and this notice of declination do NOT create an attorney-client relationship between you and Victoria Tulsidas Law. Our firm has not been retained to represent you, and we will take no legal action on your behalf.

2. STATUTE OF LIMITATIONS & DEADLINE WARNING:
   All legal claims are subject to strict statutory deadlines (Statutes of Limitations). If you fail to file a legal action within the time required by law, your legal rights will be PERMANENTLY BARRED. Because we are not representing you, we urge you to consult another qualified attorney immediately to protect your rights.

3. CONFIDENTIALITY & CONFLICT RECORDS:
   The information you submitted will be retained confidentially in our master registry solely for mandatory conflict-of-interest checks required by professional conduct rules.

Sincerely,

VICTORIA TULSIDAS LAW
A Professional Legal Corporation`;

      // Download letter file
      downloadFile(`Non_Engagement_Letter_${lead.full_name.replace(/[^a-zA-Z0-9]+/g, '_')}.txt`, letterText);

      // Append declination log to lead notes and set status to declined
      const updatedNotes = `${notes}\n\n[DECLINED / NON-ENGAGEMENT LETTER GENERATED]\nDate: ${dateStr}\nReason: ${declineReason}${declineNotes ? `\nDetails: ${declineNotes}` : ''}`;
      
      await api.leads.update(leadId, { status: 'declined', notes: updatedNotes, decline_reason: declineReason });
      setStatus('declined');
      setNotes(updatedNotes);
      setDeclineModalOpen(false);
      toast('Inquiry declined & Non-Engagement Letter generated!', 'info');
    } catch (e) {
      toast(e.message || 'Decline failed', 'error');
    }
  };

  const isUrgent = lead?.has_court_date;
  const isRetained = status === 'retained';
  const isDeclined = status === 'declined' || status === 'archived';
  const isClosed = isRetained || isDeclined;

  if (loading) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Loading inquiry details...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <p>{error || 'Inquiry details not found.'}</p>
        <button onClick={() => navigate('/admin/intake-leads')} className="btn btn-secondary mt-4">Return to Queue</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button onClick={() => navigate('/admin/intake-leads')} className="btn btn-secondary btn-xs">← Back to Inquiries Queue</button>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto items-center">
          {isClosed ? (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ${
              isRetained
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <span>{isRetained ? '✅' : '🚫'}</span>
              <span>{isRetained ? 'Already Converted — Client Record Active' : 'Declined — Inquiry Closed'}</span>
            </div>
          ) : (
            <>
              <button onClick={runInquiryConflictCheck} className="btn bg-purple-600 hover:bg-purple-700 text-white font-bold btn-xs">⚡ 1-Click Conflict Check</button>
              <button onClick={() => setDeclineModalOpen(true)} className="btn bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white btn-xs border border-rose-500/30">Decline & Generate Letter</button>
              <button onClick={convertLead} className="btn btn-primary btn-xs">1-Click Convert to Client</button>
            </>
          )}
        </div>
      </div>

      {/* Urgent Warning Banner */}
      {isUrgent && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between flex-wrap gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl font-bold shrink-0">🚨</div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Urgent Court Date / Hearing Deadline Disclosed</h4>
              <p className="text-xs text-rose-300 mt-0.5">This inquiry contains an upcoming hearing date or critical deadline. Requires immediate conflict check & evaluation.</p>
            </div>
          </div>
          {!isClosed && (
            <button onClick={runInquiryConflictCheck} className="btn bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl">
              Run Conflict Check Now
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-start gap-4 mb-6">
              <Avatar initials={leadInitials(lead.full_name)} size="xl" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-900 text-white tracking-tight">{lead.full_name}</h2>
                  {isUrgent && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 uppercase">URGENT DEADLINE</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-[13px] text-[#8a94a6] flex-wrap font-500">
                  <span className="flex items-center gap-1.5"><span className="text-[#0057c7]">🆔</span> #{lead.id}</span>
                  <span className="flex items-center gap-1.5"><span className="text-[#0057c7]">📅</span> Received: {formatLeadDate(lead.created_at)}</span>
                  <span className="flex items-center gap-1.5"><span className="text-[#0057c7]">📍</span> {lead.source || '—'}</span>
                </div>
              </div>
              <Badge status={status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-[12px] font-800 text-white uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0057c7]"></span>
                  Matter Information
                </h4>
                <div className="space-y-3">
                  <Field label="Matter Type"><Input value={lead.matter_type || ''} readOnly /></Field>
                  <Field label="Practice Area"><Input value={lead.practice_area || ''} readOnly /></Field>
                  <Field label="Email"><Input value={lead.email || ''} readOnly /></Field>
                  <Field label="Phone"><Input value={lead.phone || ''} readOnly /></Field>
                </div>
              </div>
              <div>
                <h4 className="text-[12px] font-800 text-white uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Lead Status
                </h4>
                <div className="space-y-3">
                  <Field label="Current Pipeline Stage">
                    <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="new">New</option>
                      <option value="screening">Screening</option>
                      <option value="referred">Referral / Referred</option>
                      <option value="consultation_set">Consultation</option>
                      <option value="retained">Retained</option>
                      <option value="declined">Declined</option>
                      <option value="archived">Archived</option>
                    </Select>
                  </Field>
                  <button type="button" onClick={() => openModal('add-task')} className="btn btn-secondary w-full justify-center">Schedule Consultation</button>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h4 className="text-[14px] font-800 text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Universal Intake Variables & Notes
            </h4>
            <Textarea rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="flex justify-end mt-3">
              <button type="button" onClick={saveLead} className="btn btn-primary w-full sm:w-auto justify-center">Save Notes</button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h4 className="text-[14px] font-800 text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
              Original Message / Narrative
            </h4>
            <p className="text-[13px] text-[#b8c2d1] leading-relaxed whitespace-pre-wrap bg-white/5 p-4 rounded-2xl border border-white/5">{lead.message || 'No message provided.'}</p>
          </Card>

          {isRetained ? (
            <Card className="bg-emerald-600/20 border border-emerald-500/30 text-white space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <h4 className="text-[13px] font-800 text-emerald-300">Client Record Active</h4>
              </div>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                This inquiry has already been converted. The client record and matter are live in the system. No further action is required here.
              </p>
              <button type="button" onClick={() => navigate('/admin/clients')} className="btn bg-emerald-600 hover:bg-emerald-700 text-white w-full justify-center font-800">View Client Registry →</button>
            </Card>
          ) : isDeclined ? (
            <Card className="bg-rose-600/10 border border-rose-500/30 text-white space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚫</span>
                <h4 className="text-[13px] font-800 text-rose-300">Inquiry Closed — Declined</h4>
              </div>
              <p className="text-[11px] text-rose-200/80 leading-relaxed">
                This inquiry was declined and a Non-Engagement Letter was generated. No further conversion or conflict actions are available.
              </p>
            </Card>
          ) : (
            <Card className="bg-primary-600 text-white space-y-3">
              <h4 className="text-[13px] font-700">1-Click Convert to Matter & Client</h4>
              <p className="text-[11px] text-primary-100 leading-relaxed">
                Creates a client record from this inquiry and opens the Matter Intake Wizard automatically with all typed details carried over.
              </p>
              <button type="button" onClick={convertLead} className="btn bg-white text-primary-600 w-full justify-center font-800">Convert to Client Now</button>
            </Card>
          )}
        </div>
      </div>

      {/* ─── 1-CLICK CONFLICT CHECK MODAL ─────────────────────────────────────── */}
      {conflictModalOpen && (
        <Modal title={`Conflict Check: ${lead.full_name}`} onClose={() => setConflictModalOpen(false)} wide>
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Scanning Master Registry (Clients, Active Matters, and Historical Inquiries) for potential ethical conflicts matching <strong className="text-white">"{lead.full_name}"</strong>.
            </p>

            {conflictRunning ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-purple-300 font-bold">Executing Search Across Database...</p>
              </div>
            ) : conflictResult ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border flex items-center justify-between ${conflictResult.conflict ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
                  <span className="text-xs font-bold">{conflictResult.message || (conflictResult.conflict ? 'Potential Conflict Detected!' : 'No Conflicts Found')}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10">{conflictResult.conflict ? 'MATCHES DISCOVERED' : 'CLEAR'}</span>
                </div>

                {Array.isArray(conflictResult.matches) && conflictResult.matches.length > 0 ? (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                    {conflictResult.matches.map((m, idx) => (
                      <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-white uppercase tracking-wider text-[10px] px-2 py-0.5 bg-white/10 rounded mr-2">{m.type}</span>
                          <span className="text-white font-bold">{m.name}</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">{m.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-slate-400">
                    Zero conflict matches discovered for "{lead.full_name}". Safe to accept representation.
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setConflictModalOpen(false)} className="btn btn-secondary text-xs">Close Check</button>
              <button type="button" onClick={convertLead} className="btn btn-primary text-xs">Accept & Convert Lead</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── DECLINE & NON-ENGAGEMENT LETTER MODAL ───────────────────────────── */}
      {declineModalOpen && (
        <Modal title="Decline Inquiry & Generate Non-Engagement Letter" onClose={() => setDeclineModalOpen(false)}>
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Select the reason for declining representation. A formal Non-Engagement Letter will be generated, downloaded, and logged for conflict retention.
            </p>

            <Field label="Reason for Declination" required>
              <Select value={declineReason} onChange={e => setDeclineReason(e.target.value)}>
                <option value="Outside Practice Area">Outside Practice Area / Scope</option>
                <option value="Ethical Conflict of Interest">Ethical Conflict of Interest</option>
                <option value="Lack of Merit Assessment">Lack of Legal Merit / Liability Issue</option>
                <option value="Statute of Limitations Approaching">Statute of Limitations Expiration Approaching</option>
                <option value="Firm Capacity Limits">Firm Capacity Limits</option>
                <option value="Client Referred Elsewhere">Referred to Outside Counsel</option>
                <option value="Other / Discretionary">Other / Discretionary</option>
              </Select>
            </Field>

            <Field label="Additional Internal Notes (Optional)">
              <Textarea rows={3} value={declineNotes} onChange={e => setDeclineNotes(e.target.value)} placeholder="Provide any internal notes regarding this declination..." />
            </Field>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
              <strong>Notice:</strong> Declined inquiry data will be securely retained for future mandatory conflict checks per professional conduct rules.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setDeclineModalOpen(false)} className="btn btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={confirmDeclineAndGenerateLetter} className="btn bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs">Decline & Download Letter</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  CONFLICT CHECK PAGE
// ─────────────────────────────────────────────────────────
export function ConflictCheckPage({ navigate, openModal, toast }) {
  const [client, setClient] = useState('');
  const [opponent, setOpponent] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    if (!client && !opponent) return;
    setLoading(true);
    try {
      const res = await api.conflicts.check({ prospectiveClient: client, opposingParty: opponent });
      setResult(res.data || res);
    } catch (e) {
      toast(e.message || 'Conflict check failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-4 max-w-4xl mx-auto">
      <PageHeader title="Conflict Check Tool" subtitle="Scan existing records across Clients, Matters, and Inquiries for ethical conflicts" />
      
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Field label="Prospective Client" required>
            <Input placeholder="Enter full name..." value={client} onChange={e => setClient(e.target.value)} />
          </Field>
          <Field label="Adverse / Opposing Party" required>
            <Input placeholder="Enter full name..." value={opponent} onChange={e => setOpponent(e.target.value)} />
          </Field>
        </div>
        <button onClick={handleCheck} disabled={(!client && !opponent) || loading}
          className="btn btn-primary w-full justify-center h-12 text-[15px]">
          {loading ? 'Running Conflict Search...' : 'Perform Comprehensive Check'}
        </button>
      </Card>

      {result && (
        <div className="animate-slide-up p-6 rounded-2xl border bg-white/[0.02] border-white/10 space-y-4">
          <div className={`p-4 rounded-xl border flex items-center justify-between ${result.conflict ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
            <span className="text-xs font-bold">{result.message || (result.conflict ? 'Potential Conflict Detected!' : 'No Conflicts Found')}</span>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-white/10 uppercase">{result.conflict ? 'CONFLICT DETECTED' : 'CLEAR'}</span>
          </div>

          {Array.isArray(result.matches) && result.matches.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Discovered Matches:</h4>
              {result.matches.map((m, idx) => (
                <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white uppercase tracking-wider text-[10px] px-2 py-0.5 bg-white/10 rounded mr-2">{m.type}</span>
                    <span className="text-white font-bold">{m.name}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{m.details}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">No matching entity or party records found across existing files.</p>
          )}

          <div className="flex justify-end">
            <button onClick={() => setResult(null)} className="btn btn-secondary text-xs">Clear Results</button>
          </div>
        </div>
      )}
    </div>
  );
}
