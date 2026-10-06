import { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar, Modal } from './UI.jsx';
import api from '../services/api';
import TeamChatDrawer from './TeamChatDrawer';
import { formatPSTDate } from '../utils/dateUtils';

const ROLE_INFO = {
  admin: { name: 'Admin User', role: 'Administrator', initials: 'AU', color: '#003e9e' },
  lawyer: { name: 'Alex Parker', role: 'Lawyer', initials: 'AP', color: '#003e9e' },
  client: { name: 'Sarah Mitchell', role: 'Client Portal', initials: 'SM', color: '#22c55e' },
};

const NOTIF_CONFIG = {
  document: { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path d="M13 3v5a1 1 0 001 1h5" /></svg>, color: 'bg-blue-500/10 text-blue-400' },
  deadline: { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, color: 'bg-amber-500/10 text-amber-400' },
  client:   { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>, color: 'bg-emerald-500/10 text-emerald-400' },
  system:   { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>, color: 'bg-indigo-500/10 text-indigo-400' },
};

export default function Topbar({ sidebarOpen, onToggleSidebar, role, onLogout, onSwitchRole, toast, navigate, user }) {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Search Logic
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.search.global(searchQuery);
        setSearchResults(res.data || []);
        setShowResults(true);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const info = ROLE_INFO[role?.toLowerCase()] || ROLE_INFO.client;
  const displayName = user?.full_name || user?.name || info.name;
  const displayInitials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.notifications.list();
      setNotifs(Array.isArray(res?.data) ? res.data : []);
      const countRes = await api.notifications.unreadCount();
      setUnreadCount(countRes?.data?.unread_count ?? 0);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
      toast('Could not sync notifications', 'error');
    }
  }, [toast]);

  useEffect(() => {
    fetchNotifications();
    window.addEventListener('vktori:entities-changed', fetchNotifications);
    window.addEventListener('vktori:notifications-refresh', fetchNotifications);
    return () => {
      window.removeEventListener('vktori:entities-changed', fetchNotifications);
      window.removeEventListener('vktori:notifications-refresh', fetchNotifications);
    };
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notif) => {
    try {
      if (!notif.is_read) {
        await api.notifications.markRead(notif.id);
        fetchNotifications();
      }
      
      const baseRole = role?.toLowerCase() || 'admin';
      const refId = notif.reference_id;
      
      if (refId) {
        switch (notif.type) {
          case 'document': navigate(`/${baseRole}/matters/${refId}?tab=Documents`); break;
          case 'deadline': navigate(`/${baseRole}/matters/${refId}?tab=Tasks`); break;
          case 'system': navigate(`/${baseRole}/matters/${refId}?tab=Messages`); break;
          case 'client': if (baseRole === 'admin') navigate(`/admin/intake-leads/${refId}`); break;
          case 'invoice': navigate(`/${baseRole}/matters/${refId}?tab=Billing`); break;
          default: navigate(`/${baseRole}/matters/${refId}`);
        }
      }
      setShowNotifs(false);
    } catch (e) {
      toast('Failed to handle notification', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      toast('All notifications marked as read', 'success');
      fetchNotifications();
    } catch (e) {
      toast('Failed to mark all read', 'error');
    }
  };

  const handleClearAll = () => {
    setShowClearConfirmModal(true);
  };

  const handleConfirmClearAll = async () => {
    try {
      await api.notifications.clearAll();
      setNotifs([]);
      setUnreadCount(0);
      toast('Notifications cleared', 'success');
      fetchNotifications();
    } catch (e) {
      toast('Failed to clear notifications', 'error');
    } finally {
      setShowClearConfirmModal(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await api.notifications.remove(id);
      setNotifs(prev => prev.filter(n => n.id !== id));
      fetchNotifications();
    } catch (e) {
      toast('Failed to delete notification', 'error');
    }
  };

  const formatNotifTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return formatPSTDate(d);
  };

  return (
    <header className="h-[72px] bg-[#0057c7] border-b border-white/10 flex items-center px-6 gap-6 flex-shrink-0 relative z-[60] shadow-lg sticky top-0">
      <button onClick={onToggleSidebar}
        className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {/* Global Search */}
      <div className="flex items-center gap-3 bg-white/10 border border-white/10 rounded-2xl px-4 py-2.5 flex-1 max-w-lg transition-all focus-within:bg-[#111520] focus-within:border-[#0057c7] focus-within:shadow-2xl focus-within:ring-4 focus-within:ring-blue-900/10 relative group">
        <svg className="w-5 h-5 text-white/60 group-focus-within:text-[#38bdf8] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <input 
          className="bg-transparent border-none outline-none text-[14px] text-white w-full placeholder:text-white/60 font-medium" 
          placeholder="Search matters, parties, invoices..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
        />
        
        {showResults && (searchQuery.trim().length >= 2 || isSearching) && (
          <div ref={searchRef} className="absolute top-[60px] left-0 w-full bg-[#1a2233] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10 animate-fade-in overflow-hidden z-[100] max-h-[450px] overflow-y-auto">
            {isSearching ? (
              <div className="p-8 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
                <p className="text-[11px] text-[#8a94a6] font-700 uppercase tracking-[0.2em]">Searching Registry...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="py-3">
                <div className="px-6 py-2 bg-white/5 border-y border-white/5 mb-2">
                  <p className="text-[10px] font-800 text-[#8a94a6] uppercase tracking-[0.2em]">Global Search Results</p>
                </div>
                {searchResults.map((res, i) => (
                  <div 
                    key={`${res.type}-${res.id}-${i}`}
                    onClick={() => { navigate(res.url); setShowResults(false); setSearchQuery(''); }}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#8a94a6] group-hover:bg-[#0057c7] group-hover:text-white transition-all">
                      {res.type === 'Matter' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      ) : res.type === 'Client' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                      ) : res.type === 'Document' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path d="M13 3v5a1 1 0 001 1h5" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-600 text-white group-hover:text-[#38bdf8] transition-colors truncate">{res.title}</p>
                        <span className="text-[9px] font-800 uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 text-[#8a94a6] group-hover:bg-[#38bdf8]/20 group-hover:text-[#38bdf8]">{res.type}</span>
                      </div>
                      <p className="text-[12px] text-[#8a94a6] truncate">{res.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-[#8a94a6]">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <p className="text-[14px] text-[#8a94a6] font-500">No results found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Team Chat Button (Internal Firm Communication) */}
        <button
          onClick={() => { setShowChat(!showChat); setShowNotifs(false); setShowProfile(false); }}
          className={`h-11 px-3 flex flex-col items-center justify-center rounded-xl transition-all active:scale-95 relative ${
            showChat ? 'bg-white text-[#0057c7]' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title="Internal Team Chat Drawer"
        >
          <div className="relative leading-none">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-emerald-400 rounded-full border border-[#0057c7]" />
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-0.5 leading-none">Team Chat</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 relative ${showNotifs ? 'bg-white text-[#0057c7]' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-[#ef4444] text-white text-[10px] font-900 rounded-full flex items-center justify-center border-2 border-[#0057c7] shadow-lg animate-pulse z-10">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-14 w-80 bg-[#1a2233] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 animate-fade-in overflow-hidden z-[70]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-2">
                  <h4 className="text-[15px] font-700 text-white">Notifications</h4>
                  {unreadCount > 0 && <span className="text-[11px] bg-[#0057c7] text-white font-700 px-2.5 py-0.5 rounded-full">{unreadCount}</span>}
                </div>
                {notifs.length > 0 && (
                  <button onClick={handleClearAll} className="text-[10px] text-[#8a94a6] hover:text-[#ef4444] font-800 transition-colors uppercase tracking-widest">Clear All</button>
                )}
              </div>
              <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                {notifs.length > 0 ? notifs.map(n => {
                  const cfg = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.system;
                  return (
                    <div key={n.id} onClick={() => handleMarkAsRead(n)}
                      className={`flex items-start gap-4 px-5 py-4 hover:bg-white/5 cursor-pointer transition-colors group relative ${!n.is_read ? 'bg-white/5' : ''}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] text-white leading-snug font-600">{n.title}</p>
                        <p className="text-[12px] text-[#8a94a6] mt-1 line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-[#38bdf8] mt-1.5 font-700 uppercase tracking-tighter">{formatNotifTime(n.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-center gap-3 flex-shrink-0">
                        {!n.is_read && <div className="w-2 h-2 bg-[#38bdf8] rounded-full shadow-[0_0_10px_rgba(56,189,248,0.5)]" />}
                        <button onClick={(e) => handleDelete(e, n.id)} 
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:bg-white/10 hover:text-[#ef4444] transition-all opacity-0 group-hover:opacity-100">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-16 flex flex-col items-center justify-center text-[#8a94a6] gap-3">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    </div>
                    <p className="text-[13px] font-600">All caught up!</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 bg-black/20">
                <button onClick={handleMarkAllRead} className="text-[12px] text-[#38bdf8] font-700 hover:bg-white/10 w-full py-2.5 rounded-xl transition-all border border-white/10">Mark all as read</button>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
            className={`flex items-center gap-3 px-1 py-1 rounded-full transition-all active:scale-95 ${showProfile ? 'bg-white/20' : 'hover:bg-white/10'}`}>
            <Avatar initials={displayInitials} size="sm" color={info.color} className="ring-2 ring-white/20" />
            <svg className={`w-4 h-4 text-white/60 transition-transform hidden sm:block ${showProfile ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="6 9 12 15 18 9" /></svg>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-14 w-60 bg-[#1a2233] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 animate-fade-in overflow-hidden z-[70]">
              <div className="px-5 py-5 border-b border-white/5 bg-white/5">
                <p className="text-[15px] font-700 text-white">{displayName}</p>
                <p className="text-[11px] text-[#8a94a6] font-600 uppercase tracking-widest mt-1">{info.role}</p>
              </div>
              <div className="p-2">
                <button onClick={() => { setShowProfile(false); navigate(role === 'admin' ? '/admin/settings' : `/${role}/profile`); }}
                  className="w-full px-4 py-3 text-left text-[13.5px] font-600 text-[#dbe7ff] hover:bg-white/10 hover:text-white rounded-xl transition-all flex items-center gap-3">
                  <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
                  Account Settings
                </button>
              </div>
              
              {user?.roles?.length > 1 && (
                <div className="p-2 border-t border-white/5 bg-black/10">
                  <p className="px-4 py-2 text-[10px] font-800 text-[#8a94a6] uppercase tracking-widest">Switch Role</p>
                  {user.roles.map(r => (
                    <button key={r} onClick={() => { setShowProfile(false); onSwitchRole(r); }}
                      className={`w-full px-4 py-2 text-left text-[13px] font-700 rounded-xl transition-all flex items-center justify-between group ${role === r ? 'bg-[#0057c7] text-white' : 'text-[#8a94a6] hover:bg-white/10 hover:text-white'}`}>
                      <span className="capitalize">{r}</span>
                      {role === r && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-2 border-t border-white/5">
                <button onClick={() => { setShowProfile(false); onLogout(); }}
                  className="w-full px-4 py-3 text-left text-[13.5px] font-800 text-[#ef4444] hover:bg-[#ef4444]/10 rounded-xl transition-all flex items-center gap-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Sign Out Platform
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(showNotifs || showProfile) && (
        <div className="fixed inset-0 z-[65]" onClick={() => { setShowNotifs(false); setShowProfile(false); }} />
      )}

      {/* Internal Team Chat Drawer */}
      <TeamChatDrawer
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        user={user}
        toast={toast}
      />

      {/* Clear Notifications Confirmation Modal */}
      {showClearConfirmModal && (
        <Modal
          title="Clear Notifications"
          onClose={() => setShowClearConfirmModal(false)}
          footer={
            <>
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 font-700 text-xs hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-800 text-xs shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Yes, Clear All
              </button>
            </>
          }
        >
          <div className="flex flex-col items-center text-center py-4 px-2">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-5 shadow-inner">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h4 className="text-xl font-900 text-white tracking-tight mb-2 font-display">Clear All Notifications?</h4>
            <p className="text-sm text-[#8a94a6] leading-relaxed max-w-sm font-500">
              Are you sure you want to clear all your notification records? This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}
    </header>
  );
}
