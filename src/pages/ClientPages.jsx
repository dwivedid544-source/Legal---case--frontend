import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Badge, StatCard, PageHeader, Card, Table, Tr, Td, EmptyState, Avatar, Field, Input, Select, Textarea, Modal } from '../components/UI.jsx';
import api from '../services/api';
import { formatUSPhone } from '../utils/adaptiveEngine.js';
import { formatPSTDate, formatPSTTime } from '../utils/dateUtils';

const money = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v) || 0);
const initials = (name) => (name || '').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

export function ClientDashboard({ navigate }) {
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ myMatters: 0, unpaidInvoices: 0, pendingSignatures: 0 });
  const [matters, setMatters] = useState([]);

  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const h = () => setRefreshTick(t => t + 1);
    window.addEventListener('vktori:entities-changed', h);
    return () => window.removeEventListener('vktori:entities-changed', h);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
      setError('');
      try {
        const [dashRes, mattersRes] = await Promise.all([
          api.dashboard.client(),
          api.matters.list({ limit: 10 }),
        ]);
        if (cancelled) return;
        setStats(dashRes?.data?.counters || { myMatters: 0, unpaidInvoices: 0, pendingSignatures: 0 });
        setMatters(Array.isArray(mattersRes?.data) ? mattersRes.data : []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshTick]);

  if (loading) return (
    <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-[13px] text-slate-500 font-600">Syncing dashboard data...</p>
    </div>
  );
  if (error) return <Card className="border-red-200 bg-red-50/50"><p className="text-[13px] text-red-800 font-600">{error}</p></Card>;

  return (
    <div className="animate-fade-in space-y-8 relative pb-20">
      {/* Background Atmosphere */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#0057c7]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#10b981]/5 rounded-full blur-[120px] pointer-events-none" />

      <PageHeader title="Client Command Center" subtitle="Monitor your active legal matters and communications." />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        <StatCard 
          label="Active Matters" 
          value={String(stats.myMatters || 0)} 
          icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>} 
          gradient="linear-gradient(135deg, #0057c7 0%, #38bdf8 100%)" 
        />
        <StatCard 
          label="Awaiting Payment" 
          value={String(stats.unpaidInvoices || 0)} 
          icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>} 
          gradient="linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" 
        />
        <StatCard 
          label="Pending Signatures" 
          value={String(stats.pendingSignatures || 0)} 
          icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>} 
          gradient="linear-gradient(135deg, #10b981 0%, #34d399 100%)" 
        />
        <StatCard 
          label="Recent Registry" 
          value={String(matters.length)} 
          icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} 
          gradient="linear-gradient(135deg, #6366f1 0%, #818cf8 100%)" 
        />
      </div>

      {/* Attorney-Controlled "What Happens Next" Banner */}
      {matters.length > 0 && (
        <div className="relative z-10 p-6 rounded-[2rem] bg-gradient-to-r from-[#0057c7]/20 via-[#38bdf8]/10 to-transparent border border-[#38bdf8]/30 shadow-2xl space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[#38bdf8] font-900 text-xs uppercase tracking-widest flex items-center gap-2">
              <span>💡 WHAT HAPPENS NEXT (CASE STATUS GUIDANCE)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Attorney Update</span>
          </div>
          <p className="text-sm font-600 text-white leading-relaxed">
            {matters[0].description || matters[0].client_next_steps_note || "Your legal matter is in active progression. Our specialized counsel is executing the current phase of operations and managing deadlines."}
          </p>
          <p className="text-[10px] text-slate-400 pt-1">Case ID: {matters[0].matter_number} | Last activity updated: {matters[0].updated_at ? formatPSTDate(matters[0].updated_at) : 'Today'}</p>
        </div>
      )}

      <div className="relative z-10">
        <Card className="bg-white/[0.02] backdrop-blur-xl border-white/5 shadow-2xl p-8 rounded-[2rem]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[14px] font-800 text-white uppercase tracking-[0.2em] flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
              Active Matters Overview
            </h3>
            <button onClick={() => navigate('/client/matters')} className="text-[11px] font-800 text-[#38bdf8] hover:text-white uppercase tracking-[0.2em] transition-colors group flex items-center gap-2">
              View All Registry
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
          </div>
          
          <div className="space-y-4">
            {matters.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/10 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                </div>
                <p className="text-[14px] text-[#8a94a6] font-600">No active matters found in your registry.</p>
              </div>
            ) : matters.slice(0, 5).map((m) => (
              <div key={m.id} className="group relative flex items-center gap-5 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer shadow-lg overflow-hidden"
                onClick={() => navigate(`/client/matters/${m.id}`)}>
                <div className="absolute top-0 left-0 w-1 h-full bg-[#0057c7] opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-[#8a94a6] group-hover:bg-[#0057c7]/10 group-hover:text-[#38bdf8] transition-all flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-[11px] text-[#38bdf8] font-800 tracking-widest uppercase opacity-70">{m.matter_number}</span>
                    <Badge status={m.status || 'active'} />
                  </div>
                  <h4 className="text-[16px] font-700 text-white truncate group-hover:text-[#38bdf8] transition-colors mb-1">{m.title}</h4>
                  <p className="text-[12px] text-[#8a94a6] font-500 flex items-center gap-2">
                    <span className="text-[#0057c7]">●</span>
                    {m.assigned_lawyer?.full_name || 'Legal Team'} 
                    <span className="opacity-30">|</span> 
                    {m.matter_type || m.practice_area || 'General Legal'}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/client/matters/${m.id}?tab=Messages`);
                    }}
                    className="h-9 px-4 rounded-xl bg-[#0057c7]/10 text-[#38bdf8] border border-[#0057c7]/20 text-[10px] font-900 uppercase tracking-widest hover:bg-[#0057c7] hover:text-white hover:border-transparent transition-all flex items-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Contact Team
                  </button>
                  <svg className="w-5 h-5 text-white/10 group-hover:text-white/30 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  CLIENT MATTER DETAIL (CLIENT-SAFE VIEW — Req 5.8–5.10)
//  Shows ONLY: stage timeline, attorney note, last activity,
//  assigned counsel, documents, messages.
//  NEVER shows: SOL dates, internal deadlines, damages,
//  settlement figures, relationships, templates, or any
//  admin/lawyer controls.
// ─────────────────────────────────────────────────────────
export function ClientMatterDetailPage({ matterId, navigate, toast }) {
  const [matter, setMatter] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Stage pipeline definition (display labels only — no advance actions)
  const STAGES = [
    { key: 'intake',        label: 'Intake' },
    { key: 'investigation', label: 'Investigation' },
    { key: 'treatment',     label: 'Treatment' },
    { key: 'demand',        label: 'Demand' },
    { key: 'negotiation',   label: 'Negotiation' },
    { key: 'litigation',    label: 'Litigation' },
    { key: 'resolution',    label: 'Resolution' },
  ];

  useEffect(() => {
    if (!matterId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [mRes, tRes] = await Promise.all([
          api.matters.get(matterId),
          api.matters.getTimeline(matterId).catch(() => ({ data: { timeline_events: [] } })),
        ]);
        if (cancelled) return;
        setMatter(mRes?.data || null);
        // Backend already filters to client-safe events when role=client
        const all = Array.isArray(tRes?.data?.timeline_events) ? tRes.data.timeline_events : [];
        setTimeline(all);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load case details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [matterId]);

  if (loading) return (
    <div className="animate-fade-in flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-[13px] text-slate-500 font-600">Loading case details...</p>
    </div>
  );

  if (error || !matter) return (
    <div className="space-y-4">
      <button onClick={() => navigate('/client/matters')} className="btn btn-secondary btn-xs">← Back to My Matters</button>
      <Card className="border-red-200 bg-red-50/50"><p className="text-[13px] text-red-800 font-600">{error || 'Case not found'}</p></Card>
    </div>
  );

  // Map matter status → stage index (status is the source of truth, no separate 'stage' field)
  const STATUS_TO_STAGE = {
    pending: 0, intake: 0,
    investigation: 1,
    treatment: 2,
    demand: 3,
    negotiation: 4,
    litigation: 5,
    resolution: 6, resolved: 6, closed: 6, active: 0,
  };
  const statusKey = (matter.status || 'pending').toLowerCase();
  const activeIdx = STATUS_TO_STAGE[statusKey] ?? 0;

  const lastActivity = matter.updated_at
    ? formatPSTDate(matter.updated_at, { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Recently updated';

  return (
    <div className="animate-fade-in space-y-6 pb-20 relative">
      {/* Atmosphere */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#0057c7]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Back nav */}
      <button onClick={() => navigate('/client/matters')} className="flex items-center gap-2 text-[12px] font-700 text-[#8a94a6] hover:text-white uppercase tracking-widest transition-colors group">
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
        Back to My Matters
      </button>

      {/* Header */}
      <div className="p-6 rounded-[2rem] bg-gradient-to-br from-[#0057c7]/20 via-[#0057c7]/5 to-transparent border border-[#0057c7]/20 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] text-[#38bdf8] font-900 tracking-[0.2em] uppercase opacity-70">{matter.matter_number}</span>
            <h1 className="text-2xl font-900 text-white mt-1 tracking-tight">{matter.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px] text-[#8a94a6] font-600">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {matter.assigned_lawyer?.full_name || 'Legal Team'}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                {matter.matter_type || matter.practice_area || 'General Legal'}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Last updated: {lastActivity}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge status={matter.status || 'active'} />
            <button
              onClick={() => navigate(`/client/messages`)}
              className="h-10 px-5 rounded-2xl bg-[#0057c7] text-white text-[11px] font-900 uppercase tracking-widest hover:bg-[#004bb1] transition-all flex items-center gap-2 shadow-lg shadow-[#0057c7]/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Message Counsel
            </button>
          </div>
        </div>
      </div>

      {/* ── STAGE TIMELINE (Read-only — no advance controls) ─────────────────── */}
      <Card className="space-y-4">
        <h3 className="text-[12px] font-900 text-white uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
          Case Stage Progress
        </h3>
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
          {STAGES.map((s, idx) => {
            const isDone = idx < activeIdx;
            const isCurrent = idx === activeIdx;
            return (
              <div key={s.key} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                {/* Connector line */}
                <div className="flex items-center w-full">
                  <div className={`h-0.5 flex-1 ${idx === 0 ? 'opacity-0' : isDone || isCurrent ? 'bg-[#0057c7]' : 'bg-white/10'}`} />
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-900 shrink-0 transition-all ${
                    isDone
                      ? 'bg-[#0057c7] border-[#0057c7] text-white shadow-lg shadow-[#0057c7]/30'
                      : isCurrent
                      ? 'bg-[#0057c7]/20 border-[#38bdf8] text-[#38bdf8] ring-4 ring-[#38bdf8]/20 animate-pulse'
                      : 'bg-white/5 border-white/10 text-[#8a94a6]'
                  }`}>
                    {isDone ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className={`h-0.5 flex-1 ${idx === STAGES.length - 1 ? 'opacity-0' : isDone ? 'bg-[#0057c7]' : 'bg-white/10'}`} />
                </div>
                <span className={`text-[9px] font-800 uppercase tracking-wider text-center leading-tight ${
                  isCurrent ? 'text-[#38bdf8]' : isDone ? 'text-white/60' : 'text-[#8a94a6]'
                }`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── ATTORNEY NOTE: WHAT HAPPENS NEXT ────────────────────────────────── */}
      <div className="p-6 rounded-[2rem] bg-gradient-to-r from-[#0057c7]/15 via-[#38bdf8]/5 to-transparent border border-[#38bdf8]/20 shadow-xl space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[#38bdf8] font-900 text-[10px] uppercase tracking-widest flex items-center gap-2">
            <span>💡</span>
            <span>What Happens Next — Attorney Update</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Updated {lastActivity}</span>
        </div>
        <p className="text-[14px] font-600 text-white leading-relaxed">
          {matter.client_next_steps || matter.description ||
            'Your legal matter is in active progression. Our specialized counsel is managing the current phase and will update you when there is a significant development. Please message counsel if you have questions.'}
        </p>
      </div>

      {/* ── CLIENT-VISIBLE TIMELINE UPDATES ─────────────────────────────────── */}
      {timeline.length > 0 && (
        <Card className="space-y-4">
          <h3 className="text-[12px] font-900 text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Case Updates
          </h3>
          <div className="space-y-3">
            {timeline.slice(0, 10).map((event, idx) => (
              <div key={event.id || idx} className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                <div className="w-8 h-8 rounded-xl bg-[#0057c7]/10 text-[#38bdf8] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-[13px] font-700 text-white">{event.title || event.event_type || 'Case Update'}</p>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{event.event_date || event.created_at ? formatPSTDate(event.event_date || event.created_at) : ''}</span>
                  </div>
                  {event.description && <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">{event.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── QUICK ACTIONS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/client/documents')}
          className="group p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-[#0057c7]/10 hover:border-[#0057c7]/30 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0057c7]/10 text-[#38bdf8] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          </div>
          <h4 className="text-[14px] font-800 text-white mb-1">Documents Vault</h4>
          <p className="text-[11px] text-[#8a94a6]">Upload documents or view files shared by your legal team.</p>
        </button>
        <button
          onClick={() => navigate('/client/messages')}
          className="group p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </div>
          <h4 className="text-[14px] font-800 text-white mb-1">Message Counsel</h4>
          <p className="text-[11px] text-[#8a94a6]">Send a secure message to your assigned legal team.</p>
        </button>
      </div>
    </div>
  );
}

export function ClientCasesPage({ navigate }) {
  const [matters, setMatters] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');

  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const h = () => setRefreshTick(t => t + 1);
    window.addEventListener('vktori:entities-changed', h);
    return () => window.removeEventListener('vktori:entities-changed', h);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
      setError('');
      try {
        const res = await api.matters.list({ limit: 500 });
        if (!cancelled) setMatters(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load matters');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshTick]);

  if (loading) return (
    <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-[13px] text-slate-500 font-600">Loading your matters registry...</p>
    </div>
  );
  if (error) return <Card className="border-red-200 bg-red-50/50"><p className="text-[13px] text-red-800 font-600">{error}</p></Card>;

  return (
    <div className="animate-fade-in space-y-8 relative pb-20">
      {/* Background Atmosphere */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#0057c7]/5 to-transparent pointer-events-none" />
      
      <PageHeader title="Legal Matters Registry" subtitle="Comprehensive overview of all your active and historic legal files." />

      <div className="grid grid-cols-1 gap-4 relative z-10">
        {!matters.length ? (
          <EmptyState 
            icon={<svg className="w-12 h-12 text-[#8a94a6] opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} 
            title="Empty Registry" 
            desc="No legal matters have been registered for your account yet." 
          />
        ) : matters.map((m) => (
          <div key={m.id} 
            onClick={() => navigate(`/client/matters/${m.id}`)}
            className="group flex flex-col md:flex-row md:items-center gap-6 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer shadow-xl relative overflow-hidden"
          >
            {/* Left Accent */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0057c7] opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Matter Identifier */}
            <div className="flex-shrink-0 w-full md:w-40">
              <div className="flex flex-col">
                <span className="font-mono text-[11px] text-[#38bdf8] font-900 tracking-[0.2em] uppercase opacity-60 mb-2">Matter ID</span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0057c7]/10 flex items-center justify-center text-[#38bdf8] border border-[#0057c7]/20 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <span className="font-mono text-[15px] font-900 text-white tracking-tighter">{m.matter_number}</span>
                </div>
              </div>
            </div>

            {/* Title & Details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-1">
                <h3 className="text-[18px] font-800 text-white group-hover:text-[#38bdf8] transition-colors truncate">{m.title}</h3>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[12px] text-[#8a94a6] font-600">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {m.assigned_lawyer?.full_name || 'Legal Team'}
                  </div>
                  <span className="opacity-20 hidden md:block">|</span>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    {m.matter_type || m.practice_area || 'General Practice'}
                  </div>
                  <span className="opacity-20 hidden md:block">|</span>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {m.created_at ? formatPSTDate(m.created_at) : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Action */}
            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
              <div className="flex flex-col items-start md:items-end gap-1">
                <span className="text-[9px] font-800 uppercase tracking-widest text-[#8a94a6] mb-1">Matter Status</span>
                <Badge status={m.status || 'active'} />
              </div>
              <button className="h-11 px-6 rounded-2xl bg-[#0057c7] text-white text-[11px] font-900 uppercase tracking-[0.15em] hover:bg-[#004bb1] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#0057c7]/20 whitespace-nowrap">
                Open File
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClientDocumentsPage({ toast }) {
  const [docs, setDocs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [matters, setMatters] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    matter_id: '',
    category: 'Medical records',
    description: '',
    doc_date: '',
    file: null,
  });

  const CATEGORY_OPTIONS = [
    'Medical records',
    'Photos',
    'Bills',
    'Letters / correspondence',
    'Court or agency papers',
    'Insurance documents',
    'ID',
    'Pay stubs / employment records',
    'Other'
  ];

  const fetchDocs = useCallback(async () => {
    setDocs(prev => {
      if (prev.length === 0) if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
      return prev;
    });
    setError('');
    try {
      const [docsRes, tasksRes, mattersRes] = await Promise.all([
        api.documents.list({ limit: 'all' }),
        api.tasks.list({ limit: 500 }),
        api.matters.list({ limit: 500 }),
      ]);
      setDocs(Array.isArray(docsRes?.data) ? docsRes.data : []);
      const allTasks = Array.isArray(tasksRes?.data) ? tasksRes.data : [];
      setTasks(allTasks.filter(t => t.status !== 'completed'));
      const mList = Array.isArray(mattersRes?.data) ? mattersRes.data : [];
      setMatters(mList);
    } catch (e) {
      setError(e.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
    window.addEventListener('vktori:entities-changed', fetchDocs);
    return () => window.removeEventListener('vktori:entities-changed', fetchDocs);
  }, [fetchDocs]);

  const downloadDocument = async (doc) => {
    try {
      const { blob, filename } = await api.documents.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || doc.original_name || `document-${doc.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast(`${doc.original_name} download started`, 'success');
    } catch (e) {
      toast(e.message || 'Download failed. File may not exist on server.', 'error');
    }
  };

  const openUploadForTask = (task) => {
    setSelectedTask(task);
    setUploadForm({
      matter_id: String(task.matter_id || (matters[0]?.id || '')),
      category: task.category || 'Medical records',
      description: `Fulfilling request: ${task.title}`,
      doc_date: '',
      file: null,
    });
    setUploadModalOpen(true);
  };

  const openGeneralUpload = () => {
    setSelectedTask(null);
    setUploadForm({
      matter_id: String(matters[0]?.id || ''),
      category: 'Medical records',
      description: '',
      doc_date: '',
      file: null,
    });
    setUploadModalOpen(true);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.matter_id) {
      toast('Please select a file and matter to upload.', 'error');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result;
          await api.documents.create({
            matter_id: Number(uploadForm.matter_id),
            file_base64: base64,
            original_name: uploadForm.file.name,
            mime_type: uploadForm.file.type || 'application/octet-stream',
            category: uploadForm.category,
            description: `${uploadForm.description}${uploadForm.doc_date ? ` (Document Date: ${uploadForm.doc_date})` : ''}`,
            visibility: 'client_visible',
          });

          if (selectedTask?.id) {
            await api.tasks.complete(selectedTask.id);
          }

          toast(`Document "${uploadForm.file.name}" uploaded to Client Uploads / ${uploadForm.category}. Staff review task created!`, 'success');
          setUploadModalOpen(false);
          fetchDocs();
          window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
        } catch (err) {
          toast(err.message || 'Upload failed', 'error');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(uploadForm.file);
    } catch (e) {
      toast(e.message || 'File processing failed', 'error');
      setUploading(false);
    }
  };

  const getFileIcon = (mime) => {
    const m = String(mime || '').toLowerCase();
    if (m.includes('pdf')) return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path d="M9 9h1m0 4h1m0 4h1" /></svg>;
    if (m.includes('image')) return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    if (m.includes('word') || m.includes('officedocument')) return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
  };

  if (loading) return (
    <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-[13px] text-slate-500 font-600">Accessing secure documents vault...</p>
    </div>
  );
  if (error) return <Card className="border-red-200 bg-red-50/50"><p className="text-[13px] text-red-800 font-600">{error}</p></Card>;

  return (
    <div className="animate-fade-in space-y-8 relative pb-20">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#0057c7]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader title="Secure Documents Vault" subtitle="Encrypted repository of your shared legal documents and requested file uploads." />
        <button
          onClick={openGeneralUpload}
          className="btn btn-primary font-bold text-xs shrink-0"
        >
          + Upload Document with Directives
        </button>
      </div>

      {/* ─── REQUESTED DOCUMENTS CHECKLIST SECTION ───────────────────────────── */}
      {tasks.length > 0 && (
        <Card className="border border-[#38bdf8]/30 bg-[#0057c7]/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-900 text-white uppercase tracking-wider flex items-center gap-2">
              <span>Requested Documents Checklist</span>
              <span className="text-[10px] bg-[#38bdf8] text-slate-950 font-900 px-2 py-0.5 rounded-full">{tasks.length} PENDING</span>
            </h3>
            <span className="text-[11px] text-slate-400">Items requested by your legal team</span>
          </div>

          <div className="space-y-3">
            {tasks.map(t => (
              <div key={t.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#38bdf8]/50 transition-all">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">{t.title}</h4>
                  {t.description && <p className="text-[11px] text-slate-400 italic">"{t.description}"</p>}
                  <p className="text-[10px] text-[#38bdf8] font-mono mt-1">Due: {t.due_date ? formatPSTDate(t.due_date) : 'Priority Request'}</p>
                </div>
                <button
                  onClick={() => openUploadForTask(t)}
                  className="btn btn-secondary btn-xs shrink-0 text-[#38bdf8] border-[#0057c7]/40 hover:bg-[#0057c7] hover:text-white"
                >
                  Upload Matching Document
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─── VAULT DOCUMENTS GRID ───────────────────────────────────────────── */}
      {!docs.length ? (
        <EmptyState 
          icon={<svg className="w-12 h-12 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1m-6 9l-3-3m0 0l3-3m-3 3h12" /></svg>} 
          title="Vault Empty" 
          desc="Your legal team has not shared any documents with your portal yet." 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {docs.map((d) => (
            <div key={d.id} className="group bg-white/[0.02] backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.05] hover:border-white/10 transition-all shadow-xl flex flex-col justify-between overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:bg-[#0057c7]/10 transition-colors" />
              
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[#8a94a6] border border-white/10 group-hover:text-[#38bdf8] group-hover:scale-110 transition-all">
                    {getFileIcon(d.mime_type)}
                  </div>
                  <Badge status={d.category || 'General'} />
                </div>

                <h4 className="text-[15px] font-800 text-white truncate mb-2 group-hover:text-[#38bdf8] transition-colors" title={d.original_name}>
                  {d.original_name}
                </h4>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-[11px] text-[#8a94a6] font-600">
                    <span className="w-1 h-1 rounded-full bg-[#0057c7]" />
                    Folder: <span className="text-white opacity-70">{d.folder_path || `Client Uploads/${d.category || 'General'}`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#8a94a6] font-600">
                    <span className="w-1 h-1 rounded-full bg-[#0057c7]" />
                    Uploaded: <span className="text-white opacity-70">{formatPSTDate(d.created_at)}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => downloadDocument(d)} 
                className="w-full h-11 rounded-2xl bg-[#0057c7]/10 text-[#38bdf8] border border-[#0057c7]/20 text-[11px] font-900 uppercase tracking-widest hover:bg-[#0057c7] hover:text-white hover:border-transparent transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 8m4-4v12" /></svg>
                Secure Download
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── GUIDED DOCUMENT UPLOAD MODAL ────────────────────────────────────── */}
      {uploadModalOpen && (
        <Modal title="Upload Document with Directives" onClose={() => setUploadModalOpen(false)}>
          <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
            {selectedTask && (
              <div className="p-3 bg-[#0057c7]/20 border border-[#0057c7]/40 rounded-xl text-white">
                <span className="font-bold block text-[10px] text-[#38bdf8] uppercase">Fulfilling Checklist Request</span>
                <p className="font-bold mt-0.5">{selectedTask.title}</p>
              </div>
            )}

            <Field label="Matter">
              <Select
                value={uploadForm.matter_id}
                onChange={e => setUploadForm(p => ({ ...p, matter_id: e.target.value }))}
                required
              >
                {matters.map(m => (
                  <option key={m.id} value={m.id}>{m.matter_number} — {m.title}</option>
                ))}
              </Select>
            </Field>

            <Field label="Document Type / Category *">
              <Select
                value={uploadForm.category}
                onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}
                required
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>

            <Field label="Tell Us What This Is & When It's From *">
              <Textarea
                rows={3}
                value={uploadForm.description}
                onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                placeholder="E.g., Emergency Room records from Memorial Hospital from March 14, 2026..."
                required
              />
            </Field>

            <Field label="Document Date (Optional)">
              <Input
                type="date"
                value={uploadForm.doc_date}
                onChange={e => setUploadForm(p => ({ ...p, doc_date: e.target.value }))}
              />
            </Field>

            <Field label="Select Document File *">
              <input
                type="file"
                accept="image/*,application/pdf,.doc,.docx,video/*"
                onChange={e => {
                  const selectedFile = e.target.files?.[0] || null;
                  if (selectedFile && selectedFile.size > 50 * 1024 * 1024) { // 50MB ceiling limit
                    toast('File size exceeds the maximum allowed limit of 50MB. Please compress and retry.', 'error');
                    e.target.value = '';
                    setUploadForm(p => ({ ...p, file: null }));
                    return;
                  }
                  setUploadForm(p => ({ ...p, file: selectedFile }));
                }}
                className="w-full bg-[#05080f] border border-white/10 rounded-xl p-2 text-xs text-white"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Accepted: PDF, Images (PNG/JPG), Word Documents, HEIC, Video (Max size: 50MB).</p>
            </Field>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="btn btn-secondary"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploading}
              >
                {uploading ? 'Encrypting & Uploading...' : 'Upload & Notify Staff'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function ClientBillingPage({ toast }) {
  const [invoices, setInvoices] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');
  const [payingInvoiceId, setPayingInvoiceId] = useState(null);

  const loadBillingData = useCallback(async () => {
    if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
    setError('');
    try {
      const res = await api.billing.listInvoices({ limit: 500 });
      setInvoices(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBillingData();
    window.addEventListener('vktori:entities-changed', loadBillingData);
    return () => window.removeEventListener('vktori:entities-changed', loadBillingData);
  }, [loadBillingData]);

  const payInvoice = async (invoice) => {
    if (!invoice?.id) return;
    try {
      setPayingInvoiceId(invoice.id);
      await api.billing.payInvoice(invoice.id, {
        payment_method: 'manual',
        payment_reference: 'internal-manual',
      });
      await loadBillingData();
      toast('Payment marked as paid.', 'success');
      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
    } catch (e) {
      toast(e.message || 'Payment failed', 'error');
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const totals = useMemo(() => {
    const validInvoices = invoices.filter(i => i.status !== 'void');
    const due = validInvoices.reduce((s, i) => {
      const totalAmt = Number(i.amount) || 0;
      const paidAmt = i.paid_amount ?? (i.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      return s + Math.max(0, totalAmt - paidAmt);
    }, 0);
    const paid = validInvoices.reduce((s, i) => {
      const paidAmt = i.paid_amount ?? (i.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      return s + paidAmt;
    }, 0);
    return { due, paid };
  }, [invoices]);

  if (loading) return (
    <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-[13px] text-slate-500 font-600">Accessing financial records...</p>
    </div>
  );
  if (error) return <Card className="border-red-200 bg-red-50/50"><p className="text-[13px] text-red-800 font-600">{error}</p></Card>;

  return (
    <div className="animate-fade-in space-y-8 relative pb-20">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#0057c7]/5 rounded-full blur-[120px] pointer-events-none" />

      <PageHeader title="Financial Registry" subtitle="Manage your billing, track payments, and access secure receipts." />
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
        <StatCard 
          label="Total Outstanding" 
          value={money(totals.due)} 
          icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
          gradient="linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" 
        />
        <StatCard 
          label="Invoices Issued" 
          value={String(invoices.length)} 
          icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 17v-2m3 2v-4m3 2v-6m-8-2h11a2 2 0 012 2v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>} 
          gradient="linear-gradient(135deg, #0057c7 0%, #38bdf8 100%)" 
        />
        <StatCard 
          label="Total Remittance" 
          value={money(totals.paid)} 
          icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
          gradient="linear-gradient(135deg, #10b981 0%, #34d399 100%)" 
        />
      </div>

      <Card className="bg-white/[0.02] border-white/5 rounded-[2.5rem] p-8 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-1.5 h-8 bg-[#0057c7] rounded-full shadow-[0_0_10px_rgba(0,87,199,0.5)]" />
          <h3 className="text-lg font-900 text-white tracking-tight uppercase">Settlement Ledger</h3>
        </div>

        <div className="overflow-x-auto">
          <Table headers={['Invoice ID', 'Related Matter', 'Total Amount', 'Due Date', 'Settlement Status', 'Actions']}>
            {invoices.map((inv) => (
              <Tr key={inv.id} className="group hover:bg-white/[0.02] transition-colors">
                <Td>
                  <div className="flex flex-col">
                    <span className="font-mono text-[14px] font-900 text-[#38bdf8] tracking-tighter">{inv.invoice_number}</span>
                    <span className="text-[9px] text-[#8a94a6] font-800 uppercase tracking-widest opacity-50 italic">REF: #{inv.id}</span>
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-700 text-white truncate max-w-[200px]">{inv.matter?.title || 'General Legal'}</span>
                    <span className="text-[10px] font-800 text-[#8a94a6] uppercase tracking-widest">{inv.matter?.matter_number || '—'}</span>
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-col">
                    <span className="font-900 text-white text-[16px] tabular-nums tracking-tighter">{money(inv.amount)}</span>
                    {inv.paid_amount > 0 && <span className="text-[10px] text-emerald-500 font-900 uppercase">Paid: {money(inv.paid_amount)}</span>}
                    {inv.due_amount > 0 && <span className="text-[10px] text-red-400 font-900 uppercase italic">Due: {money(inv.due_amount)}</span>}
                  </div>
                </Td>
                <Td className="text-[#8a94a6] text-[13px] font-700 uppercase tracking-tight">{inv.due_date ? formatPSTDate(inv.due_date) : '—'}</Td>
                <Td><Badge status={inv.status} /></Td>
                <Td>
                  <div className="flex items-center gap-4">
                    {inv.status === 'paid' ? (
                      <button 
                        onClick={async () => {
                          try {
                            const { blob, filename } = await api.billing.downloadInvoicePdf(inv.id);
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = filename || `Receipt-${inv.invoice_number}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(url);
                            toast('Secure receipt downloaded', 'success');
                          } catch (e) {
                            toast(e.message || 'Download failed', 'error');
                          }
                        }} 
                        className="h-9 px-4 rounded-xl bg-white/5 text-white/70 border border-white/10 text-[10px] font-900 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0112.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        Receipt
                      </button>
                    ) : (
                      <button 
                        onClick={() => payInvoice(inv)} 
                        disabled={payingInvoiceId === inv.id} 
                        className="h-9 px-6 rounded-xl bg-emerald-600 text-white text-[10px] font-900 uppercase tracking-widest hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {payingInvoiceId === inv.id ? 'Processing...' : 'Settle Now'}
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
  );
}

export function ClientMessagesPage({ toast }) {
  const [items, setItems] = useState([]);
  const [matters, setMatters] = useState([]);
  const [matterId, setMatterId] = useState('');
  const [message, setMessage] = useState('');
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');

  const load = async () => {
    const [mattersRes, commRes] = await Promise.all([
      api.matters.list({ limit: 500 }),
      api.communications.list({ limit: 500, visibility: 'client_visible' }),
    ]);
    const m = Array.isArray(mattersRes?.data) ? mattersRes.data : [];
    const allComms = Array.isArray(commRes?.data) ? commRes.data : [];
    // ── PRIVACY GUARD: only show messages from this client's own matters ──
    const myMatterIds = new Set(m.map(matter => matter.id));
    const c = allComms.filter(comm => myMatterIds.has(comm.matter_id));
    // ──────────────────────────────────────────────────────────────────────
    setMatters(m);
    setItems(c);
    if (!matterId && m[0]?.id) setMatterId(String(m[0].id));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
      setError('');
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load messages');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (matterId) {
      api.communications.markMatterRead(matterId)
        .then(() => {
          window.dispatchEvent(new Event('vktori:entities-changed'));
        })
        .catch(() => {});
    }
  }, [matterId]);

  const send = async () => {
    if (!matterId || !message.trim()) return;
    try {
      await api.communications.create({
        matter_id: Number(matterId),
        message_body: message.trim(),
        communication_type: 'portal_message',
        visibility: 'client_visible',
      });
      setMessage('');
      await load();
      toast('Message sent', 'success');
      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
    } catch (e) {
      toast(e.message || 'Send failed', 'error');
    }
  };

  if (loading) return <div className="text-[13px] text-slate-500 p-4">Loading messages...</div>;
  if (error) return <Card className="border-red-200 bg-red-50/50"><p className="text-[13px] text-red-800 font-600">{error}</p></Card>;

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Messages" subtitle="Communicate with your legal team" />
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <Field label="Matter">
            <select className="form-input" value={matterId} onChange={(e) => setMatterId(e.target.value)}>
              {matters.map((m) => <option key={m.id} value={m.id}>{m.matter_number} — {m.title}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Message">
              <div className="flex gap-2">
                <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message..." />
                <button onClick={send} className="btn btn-primary">Send</button>
              </div>
            </Field>
          </div>
        </div>
        <Table headers={['When', 'Matter', 'From', 'Message']}>
          {items.map((c) => (
            <Tr key={c.id}>
              <Td>{new Date(c.created_at).toLocaleString()}</Td>
              <Td>{matters.find((m) => m.id === c.matter_id)?.matter_number || c.matter_id}</Td>
              <Td>{c.sender?.full_name || c.sender_role}</Td>
              <Td className="max-w-[420px] truncate">{c.message_body}</Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

export function ClientProfilePage({ toast }) {
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');
  const [client, setClient] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', notes: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const h = () => setRefreshTick(t => t + 1);
    window.addEventListener('vktori:entities-changed', h);
    return () => window.removeEventListener('vktori:entities-changed', h);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isFirstLoad.current) { setLoading(true); isFirstLoad.current = false; }
      setError('');
      try {
        const res = await api.clients.list({ limit: 1 });
        const c = Array.isArray(res?.data) ? res.data[0] : null;
        if (!cancelled) {
          setClient(c || null);
          setForm({
            full_name: c?.full_name || '',
            email: c?.email || '',
            phone: c?.phone || '',
            notes: c?.notes || '',
          });
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshTick]);

  const save = async () => {
    if (!client?.id) return;
    try {
      await api.clients.update(client.id, form);
      toast('Profile information synchronized.', 'success');
    } catch (e) {
      toast(e.message || 'Sync failed', 'error');
    }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast('Incomplete security credentials.', 'error');
    }
    if (newPassword !== confirmPassword) {
      return toast('Security confirmation mismatch.', 'error');
    }
    if (newPassword.length < 4) {
      return toast('Credential density too low (min 4 chars).', 'error');
    }
    if (currentPassword === newPassword) {
      return toast('New password cannot be the same as the current password', 'error');
    }

    try {
      setUpdatingPassword(true);
      await api.auth.changePassword({ currentPassword, newPassword });
      toast('Security credentials updated successfully.', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      toast(e.message || 'Failed to update credentials', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) return (
    <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-[13px] text-slate-500 font-600">Accessing secure profile data...</p>
    </div>
  );
  if (error) return <Card className="border-red-200 bg-red-50/50"><p className="text-[13px] text-red-800 font-600">{error}</p></Card>;

  return (
    <div className="animate-fade-in space-y-8 relative pb-20">
      {/* Background Atmosphere */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#0057c7]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <PageHeader title="Identity & Security" subtitle="Manage your personal profile and digital security credentials." />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        {/* Cinematic Identity Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#0057c7]/10 to-transparent" />
            
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#0057c7]/20 rounded-full blur-xl group-hover:blur-2xl transition-all" />
              <Avatar initials={initials(form.full_name)} size="xl" color="linear-gradient(135deg, #0057c7 0%, #38bdf8 100%)" className="relative z-10 ring-8 ring-slate-900/50" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-[#111827] flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>

            <div className="relative z-10">
              <h3 className="text-2xl font-900 text-white tracking-tight mb-1">{form.full_name || 'Legal Client'}</h3>
              <p className="font-mono text-[11px] text-[#38bdf8] font-900 tracking-[0.2em] uppercase opacity-70 mb-4">{client?.id ? `ID: C${String(client.id).padStart(3, '0')}` : 'Registry Pending'}</p>
              <div className="flex justify-center">
                <Badge status={client?.is_portal_enabled ? 'active' : 'pending'} />
              </div>
            </div>

            <div className="w-full mt-10 pt-10 border-t border-white/5 flex flex-col gap-4">
              <div className="flex justify-between items-center text-[12px] font-600">
                <span className="text-[#8a94a6]">Portal Status</span>
                <span className="text-emerald-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Synchronized
                </span>
              </div>
              <div className="flex justify-between items-center text-[12px] font-600">
                <span className="text-[#8a94a6]">Member Since</span>
                <span className="text-white opacity-70">{client?.created_at ? formatPSTDate(client.created_at) : '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Sections */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-white/[0.02] border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0057c7]/5 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1.5 h-8 bg-[#0057c7] rounded-full shadow-[0_0_10px_rgba(0,87,199,0.5)]" />
              <h3 className="text-lg font-900 text-white tracking-tight uppercase">Registry Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] ml-1">Full Legal Name</label>
                <Input className="bg-white/[0.03] border-white/10 rounded-2xl h-12 focus:ring-[#0057c7]" value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] ml-1">Secure Email Endpoint</label>
                <Input className="bg-white/[0.03] border-white/10 rounded-2xl h-12 focus:ring-[#0057c7]" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] ml-1">Verified Phone</label>
                <Input className="bg-white/[0.03] border-white/10 rounded-2xl h-12 focus:ring-[#0057c7]" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: formatUSPhone(e.target.value) }))} />
              </div>
            </div>

            <div className="space-y-2 mb-10">
              <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] ml-1">Profile Intelligence / Notes</label>
              <Textarea rows={4} className="bg-white/[0.03] border-white/10 rounded-2xl focus:ring-[#0057c7] p-5" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Additional identity context..." />
            </div>

            <div className="flex justify-end pt-6 border-t border-white/5">
              <button onClick={save} className="h-12 px-10 rounded-2xl bg-[#0057c7] text-white text-[11px] font-900 uppercase tracking-[0.2em] hover:bg-[#004bb1] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#0057c7]/20">
                Update Identity
              </button>
            </div>
          </Card>

          <Card className="bg-white/[0.02] border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -mr-32 -mt-32" />

            <div className="flex items-center gap-4 mb-10">
              <div className="w-1.5 h-8 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              <h3 className="text-lg font-900 text-white tracking-tight uppercase">Credential Vault</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
              <div className="space-y-2">
                <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] ml-1">Current Credential</label>
                <Input className="bg-white/[0.03] border-white/10 rounded-2xl h-12" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} placeholder="••••••••" />
              </div>
              <div className="hidden sm:block"></div>
              <div className="space-y-2">
                <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] ml-1">New Credential</label>
                <Input className="bg-white/[0.03] border-white/10 rounded-2xl h-12" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] ml-1">Verify New Credential</label>
                <Input className="bg-white/[0.03] border-white/10 rounded-2xl h-12" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="••••••••" />
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-white/5">
              <button onClick={handleChangePassword} disabled={updatingPassword} className="h-12 px-10 rounded-2xl bg-white/5 text-white text-[11px] font-900 uppercase tracking-[0.2em] border border-white/10 hover:bg-red-500 hover:border-transparent transition-all shadow-xl disabled:opacity-50">
                {updatingPassword ? 'Synchronizing...' : 'Rotate Credentials'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
