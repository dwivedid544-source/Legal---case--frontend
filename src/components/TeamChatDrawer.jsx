import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { formatPSTDate, formatPSTTime } from '../utils/dateUtils';

const CHANNELS = [
  { name: 'general', label: '💬 General', color: '#38bdf8' },
  { name: 'case-updates', label: '📋 Case Updates', color: '#a78bfa' },
  { name: 'urgent', label: '🚨 Urgent', color: '#f87171' },
];

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${formatPSTDate(d, { month: 'short', day: 'numeric' })} ${formatPSTTime(d)}`;
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

const ROLE_COLORS = {
  admin: '#0057c7',
  lawyer: '#8b5cf6',
  client: '#22c55e',
};

export default function TeamChatDrawer({ isOpen, onClose, user, toast }) {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeChannel, setActiveChannel] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.teamChat.getMessages({ channel: activeChannel, limit: 100 });
      if (res.data) setMessages(res.data);
    } catch (e) {
      console.error('Failed to fetch chat messages:', e);
    }
  }, [activeChannel]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await api.teamChat.getMembers();
      if (res.data) setMembers(res.data);
    } catch (e) {
      console.error('Failed to fetch members:', e);
    }
  }, []);

  // Initial load & polling
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
    fetchMembers();

    // Poll every 2 seconds for instant messaging updates
    pollRef.current = setInterval(() => {
      fetchMessages();
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, fetchMessages, fetchMembers]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, activeChannel]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.teamChat.sendMessage({ message: newMessage.trim(), channel: activeChannel });
      if (res.data) {
        setMessages(prev => [...prev, res.data]);
        setNewMessage('');
      }
    } catch (e) {
      toast?.(e.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await api.teamChat.deleteMessage(msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (e) {
      toast?.(e.message || 'Failed to delete', 'error');
    }
  };

  const onlineCount = members.filter(m => m.is_online).length;
  const currentChannelInfo = CHANNELS.find(c => c.name === activeChannel) || CHANNELS[0];

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99998] flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Drawer Panel */}
      <div
        className="relative w-full max-w-md h-full bg-[#0a0f1a] border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideInRight 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-[#0057c7]/20 to-[#8b5cf6]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0057c7] flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-white tracking-wide">Team Chat</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {onlineCount} team member{onlineCount !== 1 ? 's' : ''} online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showMembers ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
              title="Team Members"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Channel Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 bg-white/[0.02] overflow-x-auto">
          {CHANNELS.map(ch => (
            <button
              key={ch.name}
              onClick={() => { setActiveChannel(ch.name); setMessages([]); }}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap border ${
                activeChannel === ch.name
                  ? 'text-white shadow-md'
                  : 'bg-transparent text-slate-400 hover:text-white border-transparent hover:border-white/10'
              }`}
              style={activeChannel === ch.name ? {
                background: `${ch.color}22`,
                borderColor: `${ch.color}55`,
                color: ch.color
              } : {}}
            >
              {ch.label}
            </button>
          ))}
        </div>

        {/* Members Panel (toggleable) */}
        {showMembers && (
          <div className="border-b border-white/5 bg-white/[0.02] px-4 py-3 max-h-[200px] overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Team Members ({members.length})</p>
            <div className="space-y-1.5">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2.5 py-1">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: ROLE_COLORS[m.role] || '#475569' }}>
                      {getInitials(m.full_name)}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0f1a] ${m.is_online ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{m.full_name}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{m.role}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${m.is_online ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-500'}`}>
                    {m.is_online ? 'Online' : 'Offline'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar" style={{ scrollBehavior: 'smooth' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                  <span className="text-3xl">💬</span>
                </div>
                <p className="text-[13px] font-semibold text-white">No messages yet</p>
                <p className="text-[11px] text-slate-500 max-w-[200px]">
                  Be the first to send a message in <span style={{ color: currentChannelInfo.color }} className="font-bold">{currentChannelInfo.label}</span>
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const isMe = msg.user?.id === user?.id;
                const showAvatar = idx === 0 || messages[idx - 1]?.user?.id !== msg.user?.id;
                return (
                  <div key={msg.id} className={`flex gap-2.5 group ${isMe ? 'flex-row-reverse' : ''}`}>
                    {showAvatar ? (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                        style={{ background: ROLE_COLORS[msg.user?.role] || '#475569' }}>
                        {getInitials(msg.user?.full_name)}
                      </div>
                    ) : (
                      <div className="w-8 flex-shrink-0" />
                    )}
                    <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {showAvatar && (
                        <div className={`flex items-center gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[11px] font-bold text-white">{isMe ? 'You' : msg.user?.full_name}</span>
                          <span className="text-[9px] text-slate-500 capitalize px-1.5 py-0.5 bg-white/5 rounded-full">{msg.user?.role}</span>
                        </div>
                      )}
                      <div className={`relative px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed ${
                        isMe
                          ? 'bg-[#0057c7] text-white rounded-br-md'
                          : 'bg-white/[0.06] text-slate-200 border border-white/5 rounded-bl-md'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        <div className={`flex items-center gap-2 mt-1 ${isMe ? 'justify-end' : ''}`}>
                          <span className="text-[9px] opacity-50">{formatTime(msg.created_at)}</span>
                        </div>
                        {/* Delete button for own messages or admin */}
                        {(isMe || user?.role === 'admin') && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 shadow-lg"
                            title="Delete message"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 bg-[#0d1320] px-4 py-3">
          <div className="flex items-end gap-2.5">
            <div className="flex-1 bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-2.5 focus-within:border-[#38bdf8] focus-within:bg-white/[0.08] transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${currentChannelInfo.label}...`}
                className="w-full bg-transparent border-none outline-none text-[13px] text-white placeholder:text-slate-500 resize-none max-h-[100px]"
                style={{ minHeight: '20px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="w-10 h-10 rounded-xl bg-[#0057c7] flex items-center justify-center text-white hover:bg-[#0068e6] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 flex-shrink-0"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[9px] text-slate-600 mt-1.5 text-center font-medium">Press Enter to send • Shift+Enter for new line</p>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}
