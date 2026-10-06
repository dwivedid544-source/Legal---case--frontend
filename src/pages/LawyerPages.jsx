import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Badge, StatCard, PageHeader, Card, Table, Tr, Td, Avatar, Field, Input, Textarea } from '../components/UI.jsx';
import api from '../services/api';
import { formatPSTDate } from '../utils/dateUtils';

// ─────────────────────────────────────────────────────────
//  LAWYER DASHBOARD
// ─────────────────────────────────────────────────────────
export function LawyerDashboard({ navigate, toast, openModal }) {
  const [dashboard, setDashboard] = useState(null);
  const [matters, setMatters] = useState([]);
  const [clients, setClients] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const stoppingRef = useRef(false);

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
        const user = JSON.parse(localStorage.getItem('vktori_user') || 'null');
        const lawyerId = user?.id;
        const [dashRes, matterRes, clientRes, timerRes] = await Promise.all([
          api.dashboard.lawyer(),
          api.matters.list({ lawyer_id: lawyerId, limit: 8 }),
          api.clients.list({ limit: 20 }),
          api.timers.active(),
        ]);
        if (cancelled) return;
        setDashboard(dashRes.data || null);
        setMatters(Array.isArray(matterRes.data) ? matterRes.data : []);
        setClients(Array.isArray(clientRes.data) ? clientRes.data : []);
        if (timerRes.data) setActiveTimer(timerRes.data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshTick]);

  useEffect(() => {
    if (!activeTimer) {
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
  }, [activeTimer]);

  const stopTimer = async () => {
    const token = localStorage.getItem('vktori_token');
    if (!activeTimer || stoppingRef.current || !token) return;
    stoppingRef.current = true;
    try {
      await api.timers.stop(activeTimer.id);
      setActiveTimer(null);
      setTimerSeconds(0);
      toast('Timer stopped successfully', 'success');
      window.dispatchEvent(new Event('vktori:entities-changed'));
    } catch (e) {
      if (!e.message?.includes('already stopped')) {
        toast(e.message || 'Failed to stop timer', 'error');
      }
    } finally {
      stoppingRef.current = false;
    }
  };

  const formatTimer = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
  };

  if (loading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-slate-500">Loading lawyer dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in space-y-4">
        <Card className="border-red-200 bg-red-50/50">
          <p className="text-[13px] text-red-800 font-600">{error}</p>
        </Card>
      </div>
    );
  }

  const counters = dashboard?.counters || {};

  return (
    <div className="animate-fade-in space-y-6 relative">
      {/* Background Atmosphere */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#0057c7]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#10b981]/5 rounded-full blur-[120px] pointer-events-none" />

      <PageHeader title="My Dashboard" subtitle="Assigned matters, activity, and workload overview.">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          {activeTimer && (
            <div className="flex items-center gap-4 bg-white/[0.03] backdrop-blur-xl px-5 py-2.5 rounded-[1.25rem] border border-white/10 shadow-2xl animate-pulse-slow">
              <div className="text-left">
                <p className="text-[10px] text-[#ef4444] font-900 uppercase tracking-[0.2em] leading-none mb-1">Live Tracking</p>
                <p className="text-[16px] font-mono font-800 text-white leading-tight tracking-wider">{formatTimer(timerSeconds)}</p>
              </div>
              <button 
                onClick={stopTimer}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-lg border border-red-500/20"
                title="Stop Tracking"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              </button>
            </div>
          )}
          <button onClick={() => openModal('add-case')} className="btn btn-primary h-12 px-6 rounded-2xl shadow-xl shadow-primary-500/20 font-800 uppercase tracking-widest text-[12px]">
            + New Matter
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        <StatCard 
          label="My Parties" 
          value={String(counters.clientCount ?? clients.length)} 
          icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          gradient="linear-gradient(135deg, #0057c7 0%, #38bdf8 100%)" 
        />
        <StatCard 
          label="Assigned Matters" 
          value={String(counters.assignedMatters ?? matters.length)} 
          icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>}
          gradient="linear-gradient(135deg, #10b981 0%, #34d399 100%)" 
        />
        <StatCard 
          label="Pending Items" 
          value={String(counters.openDrafts ?? 0)} 
          icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          gradient="linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" 
        />
        <StatCard 
          label="Messages Sent" 
          value={String(counters.messagesSent ?? 0)} 
          icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012-2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
          gradient="linear-gradient(135deg, #6366f1 0%, #818cf8 100%)" 
        />
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        {/* My Cases */}
        <Card className="hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-800 text-white uppercase tracking-[0.15em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
              My Active Matters
            </h3>
            <button onClick={() => navigate('/lawyer/matters')} className="text-[11px] text-[#38bdf8] hover:text-white font-800 uppercase tracking-widest transition-colors">View all →</button>
          </div>
          <div className="space-y-3">
            {matters.slice(0, 4).map((m) => (
              <div key={m.id} onClick={() => navigate(`/lawyer/matters/${m.id}`)}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] cursor-pointer transition-all group">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#8a94a6] group-hover:bg-[#38bdf8]/10 group-hover:text-[#38bdf8] transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-700 text-white truncate group-hover:text-[#38bdf8] transition-colors">{m.title}</p>
                  <p className="text-[11px] text-[#8a94a6] font-600 tracking-wider mt-0.5">{m.matter_number}</p>
                </div>
                <Badge status={m.status} />
              </div>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-800 text-white uppercase tracking-[0.15em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0057c7]"></span>
              Recent Activity
            </h3>
          </div>
          <div className="space-y-3">
            {(dashboard?.assignedMatters || []).slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-white font-600 line-clamp-1">{m.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-[#8a94a6] font-700 uppercase tracking-wider">{m.matter_number}</span>
                    <span className="text-[10px] text-white/20">•</span>
                    <span className="text-[11px] text-[#38bdf8] font-800 uppercase tracking-widest">{m.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Hearings */}
        <Card className="hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-800 text-white uppercase tracking-[0.15em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></span>
              Upcoming Hearings
            </h3>
            <button onClick={() => navigate('/lawyer/calendar')} className="text-[11px] text-[#38bdf8] hover:text-white font-800 uppercase tracking-widest transition-colors">Calendar →</button>
          </div>
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-[13px] text-[#8a94a6] font-600 italic">No hearing schedule data available.</p>
          </div>
        </Card>

        {/* My Parties */}
        <Card className="hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-800 text-white uppercase tracking-[0.15em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
              My Parties
            </h3>
            <button onClick={() => navigate('/lawyer/clients')} className="text-[11px] text-[#38bdf8] hover:text-white font-800 uppercase tracking-widest transition-colors">View all →</button>
          </div>
          <div className="space-y-3">
            {clients.slice(0, 5).map((c) => (
              <div key={c.id} onClick={() => navigate(`/lawyer/clients/${c.id}`)}
                className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] cursor-pointer transition-all group">
                <Avatar initials={(c.full_name || '').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2) || '?'} size="md" color="#0057c7" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-700 text-white truncate group-hover:text-[#38bdf8] transition-colors">{c.full_name}</p>
                  <p className="text-[11px] text-[#8a94a6] font-600 tracking-wider mt-0.5">{c._count?.matters || 0} matter(s)</p>
                </div>
                <Badge status={c.is_portal_enabled ? 'active' : 'pending'} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  LAWYER CASES
// ─────────────────────────────────────────────────────────
export function LawyerCasesPage({ navigate, toast, openModal }) {
  const [myCases, setMyCases] = useState([]);
  
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
        const user = JSON.parse(localStorage.getItem('vktori_user') || 'null');
        const res = await api.matters.list({ lawyer_id: user?.id, limit: 500 });
        if (!cancelled) setMyCases(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load matters');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshTick]);

  if (loading) return <div className="text-[13px] text-slate-500 p-4">Loading matters...</div>;
  if (error) return <Card className="border-red-200 bg-red-50/50"><p className="text-[13px] text-red-800 font-600">{error}</p></Card>;

  return (
    <div className="animate-fade-in space-y-6 relative">
      {/* Background Atmosphere */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#0057c7]/5 rounded-full blur-[120px] pointer-events-none" />
      
      <PageHeader title="My Matters" subtitle={`${myCases.length} matters assigned to you`}>
        <button onClick={() => openModal('add-case')} className="btn btn-primary h-11 px-5 rounded-xl font-800 uppercase tracking-widest text-[11px] shadow-lg shadow-primary-500/20">
          + New Matter
        </button>
      </PageHeader>
      
      <div className="relative z-10">
        <Table headers={['Matter ID','Parties','Title','Type','Status','Next Hearing','Priority','']}>
        {myCases.map(c => (
          <Tr key={c.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
            <Td className="whitespace-nowrap"><span className="font-mono text-[12px] text-[#38bdf8] font-700 tracking-wider">{c.matter_number}</span></Td>
            <Td className="text-[#8a94a6] font-600 whitespace-nowrap">{c.client?.full_name || '—'}</Td>
            <Td className="font-700 text-white hover:text-[#38bdf8] max-w-[200px] truncate whitespace-nowrap transition-colors">{c.title}</Td>
            <Td className="whitespace-nowrap">
              <span className="text-[10px] bg-[#0057c7]/10 text-[#38bdf8] border border-[#0057c7]/20 px-2.5 py-1 rounded-full font-800 uppercase tracking-widest">
                {c.matter_type || c.practice_area}
              </span>
            </Td>
            <Td className="whitespace-nowrap"><Badge status={c.status} /></Td>
            <Td className="text-[#8a94a6] text-[12px] font-600 whitespace-nowrap">{c.next_hearing ? formatPSTDate(c.next_hearing) : '—'}</Td>
            <Td className="whitespace-nowrap"><Badge status={c.priority || 'medium'} /></Td>
            <Td className="whitespace-nowrap text-right">
              <button onClick={e => { e.stopPropagation(); navigate(`/lawyer/matters/${c.id}`); }} 
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#8a94a6] hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] hover:border-[#38bdf8]/20 transition-all" 
                title="View Details">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </button>
            </Td>
          </Tr>
        ))}
      </Table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  LAWYER PARTIES
// ─────────────────────────────────────────────────────────
export function LawyerClientsPage({ navigate, toast, openModal }) {
  const [clients, setClients] = useState([]);
  
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
        const res = await api.clients.list({ limit: 500 });
        if (!cancelled) setClients(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load clients');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshTick]);

  if (loading) return <div className="text-[13px] text-slate-500 p-4">Loading clients...</div>;
  if (error) return <Card className="border-red-200 bg-red-50/50"><p className="text-[13px] text-red-800 font-600">{error}</p></Card>;

  return (
    <div className="animate-fade-in space-y-6 relative">
      {/* Background Atmosphere */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#10b981]/5 rounded-full blur-[120px] pointer-events-none" />

      <PageHeader title="My Clients" subtitle="Clients under your representation">
        <button onClick={() => toast('Client creation is managed by admin.', 'info')} className="btn btn-primary h-11 px-5 rounded-xl font-800 uppercase tracking-widest text-[11px] shadow-lg shadow-primary-500/20">
          + Add Client
        </button>
      </PageHeader>

      <div className="relative z-10">
        <Table headers={['Client','Email','Type','Cases','Status','Joined','']}>
        {clients.map(c => (
          <Tr key={c.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
            <Td className="whitespace-nowrap">
              <div className="flex items-center gap-3">
                <Avatar initials={(c.full_name || '').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2) || '?'} size="sm" color="#0057c7" />
                <div className="whitespace-nowrap">
                  <p className="font-700 text-white group-hover:text-[#38bdf8] transition-colors">{c.full_name}</p>
                  <p className="text-[10px] text-[#8a94a6] font-800 uppercase tracking-widest mt-0.5">{c.id}</p>
                </div>
              </div>
            </Td>
            <Td className="text-[#8a94a6] text-[12px] font-500 whitespace-nowrap">{c.email}</Td>
            <Td className="whitespace-nowrap">
              <span className="text-[10px] bg-[#0057c7]/10 text-[#38bdf8] border border-[#0057c7]/20 px-2.5 py-1 rounded-full font-800 uppercase tracking-widest">
                {c.is_portal_enabled ? 'Client Portal' : 'Standard'}
              </span>
            </Td>
            <Td className="font-800 text-white whitespace-nowrap">{c._count?.matters || 0}</Td>
            <Td className="whitespace-nowrap"><Badge status={c.is_portal_enabled ? 'active' : 'pending'} /></Td>
            <Td className="text-[#8a94a6] text-[12px] font-600 whitespace-nowrap">{c.created_at ? formatPSTDate(c.created_at) : '—'}</Td>
            <Td className="whitespace-nowrap text-right">
              <button onClick={e => { e.stopPropagation(); navigate(`/lawyer/clients/${c.id}`); }} 
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#8a94a6] hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] hover:border-[#38bdf8]/20 transition-all" 
                title="View Profile">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </button>
            </Td>
          </Tr>
        ))}
      </Table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  LAWYER PROFILE PAGE
// ─────────────────────────────────────────────────────────
export function LawyerProfilePage({ toast }) {
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [updatingProfile, setUpdatingProfile] = useState(false);
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
        const res = await api.auth.getMe();
        if (!cancelled) {
          const u = res.data;
          setUser(u);
          setForm({
            full_name: u?.full_name || '',
            email: u?.email || '',
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

  const saveProfile = async () => {
    if (!user?.id) return;
    try {
      setUpdatingProfile(true);
      await api.users.update(user.id, form);
      toast('Profile information updated', 'success');
      // Update local user data if stored
      const stored = JSON.parse(localStorage.getItem('vktori_user') || '{}');
      localStorage.setItem('vktori_user', JSON.stringify({ ...stored, ...form }));
      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
    } catch (e) {
      toast(e.message || 'Save failed', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword) {
      return toast('Please fill in password fields', 'error');
    }
    if (newPassword !== confirmPassword) {
      return toast('New passwords do not match', 'error');
    }
    if (currentPassword === newPassword) {
      return toast('New password cannot be the same as the current password', 'error');
    }
    try {
      setUpdatingPassword(true);
      await api.auth.changePassword({ currentPassword, newPassword });
      toast('Password updated successfully', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      toast(e.message || 'Failed to update password', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) return <div className="text-[13px] text-slate-500 p-4">Loading profile...</div>;
  if (error) return <Card className="border-red-200 bg-red-50/50"><p className="text-[13px] text-red-800 font-600">{error}</p></Card>;

  const initials = (name) => (name || '').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="animate-fade-in space-y-6 relative">
      {/* Background Atmosphere */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#0057c7]/5 rounded-full blur-[120px] pointer-events-none" />

      <PageHeader title="My Profile" subtitle="Manage your account information and security" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        <Card className="text-center h-fit bg-white/[0.02] backdrop-blur-xl border-white/5 py-10">
          <Avatar initials={initials(form.full_name)} size="xl" color="#0057c7" />
          <h3 className="text-[18px] font-800 text-white mt-4 uppercase tracking-wide">{form.full_name || 'Lawyer'}</h3>
          <p className="text-[12px] text-[#8a94a6] font-600 mb-4 tracking-widest uppercase">Member Since {user?.created_at ? new Date(user.created_at).getFullYear() : '—'}</p>
          <Badge status="active" />
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white/[0.02] backdrop-blur-xl border-white/5">
            <h3 className="text-[14px] font-800 text-white uppercase tracking-[0.15em] mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]"></span>
              Account Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Full Name">
                <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              </Field>
              <Field label="Email Address">
                <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              </Field>
            </div>
            <div className="flex justify-end mt-8">
              <button onClick={saveProfile} disabled={updatingProfile} className="btn btn-primary h-11 px-8 rounded-xl font-800 uppercase tracking-widest text-[11px] shadow-lg shadow-primary-500/20">
                {updatingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </Card>

          <Card className="bg-white/[0.02] backdrop-blur-xl border-white/5">
            <h3 className="text-[14px] font-800 text-white uppercase tracking-[0.15em] mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></span>
              Security & Password
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Current Password">
                <Input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              </Field>
              <div className="hidden sm:block"></div>
              <Field label="New Password">
                <Input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              </Field>
              <Field label="Confirm New Password">
                <Input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              </Field>
            </div>
            <div className="flex justify-end mt-8">
              <button onClick={handlePasswordChange} disabled={updatingPassword} className="btn btn-secondary h-11 px-8 rounded-xl font-800 uppercase tracking-widest text-[11px] border-white/10 text-white hover:bg-white/5 transition-all">
                {updatingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
