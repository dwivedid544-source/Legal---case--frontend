import React, { useState, useEffect } from 'react';

export default function EmailPreview({ email, onAction, onBack, threadMessages = [], currentFolder, folders = [] }) {
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Automatically expand the newest message in the thread
  useEffect(() => {
    if (threadMessages.length > 0) {
      const lastMsg = threadMessages[threadMessages.length - 1];
      setExpandedIds(new Set([lastMsg.id]));
    } else if (email) {
      setExpandedIds(new Set([email.id]));
    }
  }, [threadMessages, email]);

  if (!email) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/40 text-slate-500 w-full h-full p-6">
        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-sm font-500">Select an email to read</p>
      </div>
    );
  }

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isTrash = currentFolder === 'trash' || email.folder === 'trash';
  const isArchive = currentFolder === 'archive' || email.folder === 'archive';

  // Helper to render a single message card inside the thread
  const renderMessageCard = (msg, isMain = false) => {
    const isExpanded = expandedIds.has(msg.id);
    const dateObj = new Date(msg.created_at);
    const formattedDate = dateObj.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }) + ' at ' + dateObj.toLocaleString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });

    return (
      <div key={msg.id} className="border border-white/5 rounded-xl bg-slate-950/40 overflow-hidden mb-3">
        {/* Header (always visible, click to toggle collapse) */}
        <div 
          onClick={() => toggleExpand(msg.id)}
          className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0057c7] to-[#38bdf8] flex items-center justify-center text-white font-bold text-xs shadow-md flex-shrink-0">
              {msg.sender?.full_name?.charAt(0) || 'M'}
            </div>
            <div className="min-w-0">
              <div className="font-600 text-[13px] text-white flex items-center gap-1.5 flex-wrap">
                <span>{msg.sender?.full_name || 'Sender'}</span>
                <span className="text-slate-500 font-400 text-[11px]">&lt;{msg.sender?.email || 'email@example.com'}&gt;</span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                To: {msg.to} {msg.cc && ` | CC: ${msg.cc}`} {msg.bcc && ` | BCC: ${msg.bcc}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-slate-400 hidden sm:inline">{formattedDate}</span>
            <svg 
              className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Body (visible if expanded) */}
        {isExpanded && (
          <div className="p-4 sm:p-6 border-t border-white/5 bg-slate-950/20">
            <div 
              className="prose prose-invert max-w-none text-slate-200 text-[13px] sm:text-[14px] leading-relaxed custom-scrollbar overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: msg.message_body }}
            />
          </div>
        )}
      </div>
    );
  };

  const messagesToRender = threadMessages.length > 0 ? threadMessages : [email];

  return (
    <div className="flex-1 flex flex-col bg-slate-900/60 overflow-hidden relative w-full h-full">
      {/* Top Action Bar */}
      <div className="p-4 border-b border-white/5 flex flex-col gap-3 sm:gap-4 flex-shrink-0 bg-slate-950/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button onClick={onBack} className="md:hidden text-slate-400 hover:text-white p-1 -ml-2" title="Back">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            <h1 className="text-lg sm:text-xl font-bold text-white leading-tight break-words">
              {email.subject || '(No Subject)'}
            </h1>
          </div>

          {/* Quick Actions (Reply, Reply All, Forward, Star, Flag, Archive, Delete/Restore) */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button 
              onClick={() => onAction('reply', email)} 
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors" 
              title="Reply"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button 
              onClick={() => onAction('reply_all', email)} 
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors" 
              title="Reply All"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6M9 14l-6-6 6-6" />
              </svg>
            </button>
            <button 
              onClick={() => onAction('forward', email)} 
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors" 
              title="Forward"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            <div className="h-6 w-[1px] bg-white/10 mx-1" />
            <button 
              onClick={() => onAction('file_to_matter', email)} 
              className="h-8 px-3 rounded-lg bg-[#0057c7] hover:bg-[#0057c7]/80 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#0057c7]/30 transition-all" 
              title="File this email thread directly to a Legal Matter"
            >
              <span>📂</span>
              <span>File to Matter</span>
            </button>
            <div className="h-6 w-[1px] bg-white/10 mx-1" />
            <button 
              onClick={() => onAction('star', email)} 
              className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-colors ${email.is_starred ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-400 hover:text-yellow-400 hover:bg-white/10'}`} 
              title="Star"
            >
              <svg className="w-4 h-4" fill={email.is_starred ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
            <button 
              onClick={() => onAction('flag', email)} 
              className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-colors ${email.is_flagged ? 'text-orange-400 bg-orange-400/10' : 'text-slate-400 hover:text-orange-400 hover:bg-white/10'}`} 
              title="Flag"
            >
              <svg className="w-4 h-4" fill={email.is_flagged ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </button>
            <div className="h-6 w-[1px] bg-white/10 mx-1" />
            <button 
              onClick={() => onAction(email.is_read ? 'mark_unread' : 'mark_read', email)} 
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors" 
              title={email.is_read ? 'Mark as Unread' : 'Mark as Read'}
            >
              <span className="text-[14px]">{email.is_read ? '✉️' : '📖'}</span>
            </button>
            <div className="relative group">
              <button 
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors" 
                title="Move to Folder"
              >
                📁
              </button>
              <div className="absolute right-0 top-9 w-44 bg-slate-950 border border-white/10 rounded-xl shadow-2xl py-1.5 hidden group-hover:block z-50 max-h-60 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-bold text-slate-500 uppercase px-3 py-1 border-b border-white/5 tracking-wider">Move to:</p>
                {folders
                  .filter(f => f.id !== 'starred' && f.id !== 'flagged' && f.id !== currentFolder && f.id !== email.folder)
                  .map(f => (
                    <button 
                      key={f.id}
                      onClick={() => onAction('move_to_folder', { emailObj: email, folderName: f.id })}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white capitalize flex items-center gap-2 truncate"
                    >
                      <span>{f.icon || '📁'}</span>
                      <span className="truncate">{f.label}</span>
                    </button>
                  ))}
              </div>
            </div>
            {!isTrash && !isArchive && (
              <button 
                onClick={() => onAction('archive', email)} 
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#38bdf8]/10 transition-colors" 
                title="Archive"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>
            )}
            {isTrash ? (
              <>
                <button 
                  onClick={() => onAction('restore', email)} 
                  className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:text-white hover:bg-emerald-500 transition-colors" 
                  title="Restore to Inbox"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
                <button 
                  onClick={() => onAction('delete', email)} 
                  className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 transition-colors" 
                  title="Permanently Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            ) : (
              <button 
                onClick={() => onAction('delete', email)} 
                className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 transition-colors" 
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Message Thread Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-900/20">
        {messagesToRender.map(msg => renderMessageCard(msg, msg.id === email.id))}
      </div>
    </div>
  );
}
