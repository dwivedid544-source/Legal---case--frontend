import React, { useState } from 'react';

export default function FolderList({ 
  folders = [], 
  selectedFolder, 
  onSelect, 
  onCompose, 
  folderCounts = {}, 
  isSyncing = false, 
  onSync,
  onCreateCustomFolder,
  titanAccounts = [],
  selectedAccountId,
  onAccountChange
}) {
  const [showAddFolderInput, setShowAddFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const standardFolders = folders.filter(f => !f.isCustom);
  const customFolders = folders.filter(f => f.isCustom);

  const handleAddFolderSubmit = (e) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateCustomFolder(newFolderName.trim());
      setNewFolderName('');
      setShowAddFolderInput(false);
    }
  };

  return (
    <div className="w-[280px] md:w-64 h-full bg-slate-900 md:bg-slate-900/80 border-r border-white/5 flex flex-col shadow-2xl md:shadow-none select-none">
      {/* Top Section */}
      <div className="p-4 border-b border-white/5 space-y-2 flex-shrink-0">
        {/* Account Switcher */}
        {titanAccounts && titanAccounts.length > 0 && (
          <div className="relative mb-3">
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Active Mailbox</label>
            <div className="relative">
              <select
                value={selectedAccountId || ''}
                onChange={(e) => onAccountChange(parseInt(e.target.value, 10))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-600 text-white outline-none focus:border-[#38bdf8] appearance-none cursor-pointer pr-8"
              >
                {titanAccounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-slate-900 text-white">
                    {acc.email_address}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8a94a6]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Compose Button */}
        <button 
          onClick={onCompose}
          className="w-full py-3 bg-[#0057c7] text-white font-700 rounded-xl hover:bg-[#004bb1] transition-colors shadow-lg flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Message
        </button>

        {/* Sync Now Button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className={`w-full py-2 border border-white/10 text-slate-300 font-600 rounded-lg hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2 text-xs ${isSyncing ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <svg 
            className={`w-4 h-4 text-[#38bdf8] ${isSyncing ? 'animate-spin' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
          </svg>
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Folders Area */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar flex flex-col gap-4">
        {/* Standard Folders */}
        <div className="px-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 mb-1">Mailboxes</p>
          <ul className="space-y-0.5">
            {standardFolders.map(folder => {
              const count = folderCounts[folder.id] || 0;
              return (
                <li key={folder.id}>
                  <button
                    onClick={() => onSelect(folder.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[13px] font-600 transition-colors ${
                      selectedFolder === folder.id 
                        ? 'bg-[#38bdf8]/10 text-[#38bdf8]' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{folder.icon}</span>
                    <span className="flex-1 text-left">{folder.label}</span>
                    {count > 0 && (
                      <span className="min-w-[18px] h-4.5 px-1.5 rounded-full bg-[#0057c7] text-white text-[10px] font-bold flex items-center justify-center">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Custom Folders Section */}
        <div className="px-3">
          <div className="flex items-center justify-between px-4 mb-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Custom Folders</p>
            <button 
              onClick={() => setShowAddFolderInput(!showAddFolderInput)}
              className="text-slate-500 hover:text-white text-xs font-bold"
              title="Add Custom Folder"
            >
              ➕
            </button>
          </div>

          {/* Add Folder Inline Input */}
          {showAddFolderInput && (
            <form onSubmit={handleAddFolderSubmit} className="px-3 mb-2 flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#38bdf8]"
              />
              <button 
                type="submit" 
                className="px-2 py-1 bg-[#0057c7] text-white rounded text-xs hover:bg-[#004bb1]"
              >
                Save
              </button>
            </form>
          )}

          {/* Custom Folders List */}
          <ul className="space-y-0.5">
            {customFolders.length === 0 ? (
              <li className="text-[11px] text-slate-600 px-4 py-2 italic">No custom folders</li>
            ) : (
              customFolders.map(folder => {
                const count = folderCounts[folder.id] || 0;
                return (
                  <li key={folder.id}>
                    <button
                      onClick={() => onSelect(folder.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[13px] font-600 transition-colors ${
                        selectedFolder === folder.id 
                          ? 'bg-[#38bdf8]/10 text-[#38bdf8]' 
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>📁</span>
                      <span className="flex-1 text-left truncate">{folder.label}</span>
                      {count > 0 && (
                        <span className="min-w-[18px] h-4.5 px-1.5 rounded-full bg-[#0057c7] text-white text-[10px] font-bold flex items-center justify-center">
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      <div className="p-3 border-t border-white/5 bg-black/20 flex-shrink-0">
        <p className="text-[11px] text-slate-500 text-center">Connected to Titan Mail</p>
      </div>
    </div>
  );
}
