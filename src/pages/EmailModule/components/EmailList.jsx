import React from 'react';

export default function EmailList({ folder, messages, isLoading, selectedEmail, onSelect, searchQuery, onSearch, onAction, onMenuClick, selectedIds = new Set(), onToggleSelect, onToggleSelectAll, onBulkAction }) {
  const hasBulkSelection = selectedIds.size > 0;

  const selectedMessages = messages.filter(msg => selectedIds.has(msg.id));
  const allStarred = selectedMessages.length > 0 && selectedMessages.every(msg => msg.is_starred);
  const allFlagged = selectedMessages.length > 0 && selectedMessages.every(msg => msg.is_flagged);

  return (
    <div className="w-full h-full bg-slate-900 border-r border-white/5 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-white/5 space-y-3">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button onClick={onMenuClick} className="lg:hidden text-slate-400 hover:text-white p-1">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <h2 className="text-lg font-bold text-white capitalize flex-1">{folder}</h2>
          <span className="text-xs text-slate-500">{messages.length} email{messages.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]"
          />
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {hasBulkSelection && (
        <div className="px-3 py-2 border-b border-white/5 bg-[#0057c7]/10 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#38bdf8] font-600 mr-1">{selectedIds.size} selected</span>
          <button 
            onClick={() => onBulkAction(folder === 'trash' ? 'permanent_delete' : 'delete')} 
            className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors" 
            title={folder === 'trash' ? 'Permanently Delete' : 'Delete'}
          >
            🗑️ {folder === 'trash' ? 'Delete Permanently' : 'Delete'}
          </button>
          <button onClick={() => onBulkAction('archive')} className="px-2 py-1 text-xs bg-white/5 text-slate-300 rounded hover:bg-white/10 transition-colors" title="Archive">📦 Archive</button>
          <button onClick={() => onBulkAction('mark_read')} className="px-2 py-1 text-xs bg-white/5 text-slate-300 rounded hover:bg-white/10 transition-colors" title="Mark Read">✓ Read</button>
          <button onClick={() => onBulkAction('mark_unread')} className="px-2 py-1 text-xs bg-white/5 text-slate-300 rounded hover:bg-white/10 transition-colors" title="Mark Unread">● Unread</button>
          <button onClick={() => onBulkAction(allStarred ? 'unstar' : 'star')} className="px-2 py-1 text-xs bg-white/5 text-yellow-400 rounded hover:bg-white/10 transition-colors" title={allStarred ? 'Unstar' : 'Star'}>
            ⭐ {allStarred ? 'Unstar' : 'Star'}
          </button>
          <button onClick={() => onBulkAction(allFlagged ? 'unflag' : 'flag')} className="px-2 py-1 text-xs bg-white/5 text-orange-400 rounded hover:bg-white/10 transition-colors" title={allFlagged ? 'Unflag' : 'Flag'}>
            🚩 {allFlagged ? 'Unflag' : 'Flag'}
          </button>
          {folder === 'trash' && (
            <button onClick={() => onBulkAction('restore')} className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors" title="Restore">↩ Restore</button>
          )}
        </div>
      )}

      {/* Select All Checkbox */}
      {messages.length > 0 && (
        <div className="px-4 py-2 border-b border-white/5 flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedIds.size === messages.length && messages.length > 0}
            onChange={onToggleSelectAll}
            className="w-4 h-4 rounded border-slate-600 bg-transparent text-[#38bdf8] focus:ring-0 cursor-pointer accent-[#38bdf8]"
          />
          <span className="text-xs text-slate-500">Select All</span>
        </div>
      )}

      {/* Email List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            <div className="inline-block w-6 h-6 border-2 border-slate-600 border-t-[#38bdf8] rounded-full animate-spin mb-2"></div>
            <div>Loading emails...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            No messages found.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {messages.map(msg => {
              const isUnread = !msg.is_read;
              const isSelected = selectedIds.has(msg.id);
              return (
                <div
                  key={msg.id}
                  className={`p-4 cursor-pointer transition-colors relative group flex items-start gap-3 ${
                    selectedEmail?.id === msg.id ? 'bg-[#38bdf8]/10' : isSelected ? 'bg-white/5' : 'hover:bg-white/5'
                  } ${isUnread ? '' : 'opacity-80'}`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => { e.stopPropagation(); onToggleSelect(msg.id); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 mt-1 rounded border-slate-600 bg-transparent text-[#38bdf8] focus:ring-0 cursor-pointer flex-shrink-0 accent-[#38bdf8]"
                  />

                  {/* Unread dot */}
                  {isUnread && (
                    <div className="w-2 h-2 rounded-full bg-[#38bdf8] mt-2 flex-shrink-0 shadow-[0_0_6px_#38bdf8]"></div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0" onClick={() => onSelect(msg)}>
                    <div className="flex justify-between items-start mb-1">
                      <div className={`text-sm truncate pr-2 ${isUnread ? 'font-bold text-white' : 'font-500 text-slate-300'}`}>
                        {msg.sender?.full_name || 'Sender'}
                      </div>
                      <div className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">
                        {new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                    <div className={`text-[13px] truncate mb-1 pr-8 ${isUnread ? 'font-600 text-slate-200' : 'font-400 text-slate-400'}`}>
                      {msg.subject || '(No Subject)'}
                    </div>
                    <div className="text-[12px] text-slate-500 truncate" dangerouslySetInnerHTML={{ __html: msg.message_body?.replace(/<[^>]+>/g, '').substring(0, 100) || '' }} />
                    
                    {/* Thread indicator */}
                    {msg.replies && msg.replies.length > 0 && (
                      <div className="mt-1 text-[11px] text-[#38bdf8] flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        {msg.replies.length} repl{msg.replies.length === 1 ? 'y' : 'ies'}
                      </div>
                    )}
                  </div>

                  {/* Quick action icons */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); onAction('star', msg); }} className={`p-1 rounded ${msg.is_starred ? 'text-yellow-400 opacity-100' : 'text-slate-500 hover:text-yellow-400'}`} title={msg.is_starred ? 'Unstar' : 'Star'}>
                      <svg className="w-4 h-4" fill={msg.is_starred ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onAction('flag', msg); }} className={`p-1 rounded ${msg.is_flagged ? 'text-orange-400 opacity-100' : 'text-slate-500 hover:text-orange-400'}`} title={msg.is_flagged ? 'Unflag' : 'Flag'}>
                      <svg className="w-4 h-4" fill={msg.is_flagged ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onAction('archive', msg); }} className="p-1 rounded text-slate-500 hover:text-[#38bdf8]" title="Archive">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onAction('delete', msg); }} className="p-1 rounded text-slate-500 hover:text-red-400" title="Delete">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
