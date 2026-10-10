import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export function LegalAIChatDrawer({
  isOpen,
  onClose,
  activeMatterId = null,
  activeMatter = null,
  matterList = [],
  onSelectMatter = null
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your **VkTori Legal AI Specialist**, equipped with LexisNexis-caliber statutory research and Claude-level analytical drafting.\n\nHow can I assist you with your case research, workflow analysis, or litigation drafting today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workflowMode, setWorkflowMode] = useState('general');
  const [selectedMatterId, setSelectedMatterId] = useState(activeMatterId || '');
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (activeMatterId) {
      setSelectedMatterId(activeMatterId);
    }
  }, [activeMatterId]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const currentMatter = matterList.find(m => String(m.id) === String(selectedMatterId)) || activeMatter;

  const quickPrompts = currentMatter ? [
    { label: '⚖️ Analyze Case Strengths', text: 'Analyze the liability, causation, and key legal strengths of this case under California law.' },
    { label: '⏳ Check SOL & Deadlines', text: 'What is the applicable Statute of Limitations (SOL) and key procedural deadlines for this matter?' },
    { label: '✍️ Draft Deposition Outline', text: 'Draft a comprehensive deposition outline and key examination questions for the opposing party in this matter.' },
    { label: '📋 Summarize Plaintiff Injuries', text: 'Summarize the plaintiff\'s documented injuries, medical care, and general damages from the case file.' },
    { label: '📑 Demand Letter Arguments', text: 'Draft strong legal arguments for a formal demand letter highlighting liability and compensatory damages.' },
  ] : [
    { label: '🔍 California Tort Law Research', text: 'Provide a breakdown of the required elements and standard of care for a California premises liability claim.' },
    { label: '⏳ CA CCP § 335.1 Statute of Limitations', text: 'Explain the statute of limitations under California CCP § 335.1 and recognized tolling exceptions.' },
    { label: '✍️ Draft Form Interrogatories', text: 'Draft 5 critical special interrogatories for an injury claim regarding liability and insurance coverage.' },
    { label: '📄 IRAC Legal Analysis', text: 'Explain the IRAC methodology and how to structure a winning summary judgment opposition brief.' },
  ];

  const handleSend = async (textToSend) => {
    const promptText = (textToSend || inputValue).trim();
    if (!promptText || isLoading) return;

    const userMessageId = `user_${Date.now()}`;
    const userMsg = {
      id: userMessageId,
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send conversation payload to backend
      const payloadMessages = newHistory
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await api.ai.chat({
        messages: payloadMessages.length > 0 ? payloadMessages : [{ role: 'user', content: promptText }],
        matterId: selectedMatterId ? parseInt(selectedMatterId, 10) : null,
        workflowMode
      });

      const replyContent = res?.data?.reply || res?.reply || 'I am ready to assist with your next inquiry.';
      const assistantMsg = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        model: res?.data?.model || 'gpt-4o',
        hasMatterContext: res?.data?.hasMatterContext,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        isError: true,
        content: `⚠️ **AI Service Notice:** ${err.message || 'Unable to connect to OpenAI service. Please verify your connection or API key.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome_reset',
        role: 'assistant',
        content: `Chat session reset. Focused matter: **${currentMatter ? `${currentMatter.matter_number} — ${currentMatter.title}` : 'Firm-Wide General Practice'}**.\n\nHow can I assist you with legal research, drafting, or statutory analysis?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex justify-end animate-fade-in pointer-events-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Container */}
      <div className="relative w-full max-w-2xl bg-[#0a1120] border-l border-white/10 shadow-[-20px_0_60px_rgba(0,0,0,0.8)] flex flex-col h-full z-10 animate-slide-left overflow-hidden">
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-[#0057c7]/20 via-white/[0.03] to-[#0a1120] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0057c7] to-[#38bdf8] flex items-center justify-center text-white text-lg shadow-lg shadow-[#0057c7]/30 border border-white/20">
              ⚖️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-900 text-white font-display tracking-tight flex items-center gap-2">
                  VkTori LexCore AI
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    GPT-4o Specialist
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-[#8a94a6] font-medium">
                Senior Legal Research Associate · LexisNexis &amp; Claude Analytical Standards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              title="Clear Conversation"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 text-xs flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span className="hidden sm:inline font-semibold">Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
              title="Close Assistant"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Matter Context & Mode Toolbar */}
        <div className="px-4 py-2.5 bg-black/30 border-b border-white/5 flex items-center justify-between flex-wrap gap-2 text-xs flex-shrink-0">
          {/* Matter Selector */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1">
              📁 Case File:
            </span>
            <select
              value={selectedMatterId}
              onChange={(e) => {
                setSelectedMatterId(e.target.value);
                onSelectMatter?.(e.target.value);
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-[#0057c7] w-full max-w-[280px] font-medium"
            >
              <option value="" className="bg-[#0b1325] text-slate-300">Firm-Wide (General Jurisprudence)</option>
              {matterList.map(m => (
                <option key={m.id} value={m.id} className="bg-[#0b1325] text-white">
                  {m.matter_number} — {m.title} {m.client?.full_name ? `(${m.client.full_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Workflow Mode Tabs */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {[
              { id: 'general', label: 'General' },
              { id: 'discovery_drafter', label: 'Discovery' },
              { id: 'sol_checker', label: 'SOL / Deadlines' },
              { id: 'document_summary', label: 'Synthesis' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWorkflowMode(tab.id)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  workflowMode === tab.id
                    ? 'bg-[#0057c7] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Matter Grounding Strip */}
        {currentMatter && (
          <div className="px-4 py-2 bg-gradient-to-r from-[#0057c7]/15 to-transparent border-b border-white/5 flex items-center justify-between text-[11px] text-sky-200">
            <span className="truncate flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <strong>Active Case:</strong> {currentMatter.matter_number} · {currentMatter.title}
              {currentMatter.client?.full_name && ` (${currentMatter.client.full_name})`}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold shrink-0 ml-2">
              Dossier Grounded
            </span>
          </div>
        )}

        {/* Chat Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0057c7] to-[#38bdf8] flex items-center justify-center text-white text-sm shadow-md shrink-0 mt-0.5">
                    ⚖️
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-[13px] leading-relaxed relative group ${
                    isUser
                      ? 'bg-[#0057c7] text-white shadow-lg shadow-[#0057c7]/20 rounded-br-sm'
                      : msg.isError
                        ? 'bg-red-500/10 border border-red-500/20 text-red-200 rounded-bl-sm'
                        : 'bg-white/[0.04] border border-white/10 text-slate-200 shadow-xl rounded-bl-sm backdrop-blur-md'
                  }`}
                >
                  {/* Message Sender & Timestamp Bar */}
                  <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-white/10 text-[10px] text-slate-400">
                    <span className="font-bold uppercase tracking-wider text-slate-300">
                      {isUser ? 'You (Counsel)' : 'VkTori LexCore AI Specialist'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="hover:text-white transition-colors text-[10px] font-semibold bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1"
                          title="Copy legal response"
                        >
                          {copiedId === msg.id ? '✓ Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message Content with Markdown Formatting */}
                  <div className="prose prose-invert max-w-none text-[13px] leading-relaxed whitespace-pre-wrap break-words font-sans">
                    {msg.content}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                    ME
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0057c7] to-[#38bdf8] flex items-center justify-center text-white text-sm shadow-md shrink-0">
                ⚖️
              </div>
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 rounded-bl-sm text-slate-300 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-sky-300 font-medium tracking-wide">
                  LexCore AI is analyzing legal authorities &amp; case facts...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-white/5 bg-black/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Suggested:
          </span>
          {quickPrompts.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSend(chip.text)}
              className="text-[11px] whitespace-nowrap px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-[#0057c7]/20 hover:border-[#0057c7]/50 hover:text-sky-300 border border-white/10 text-slate-300 font-medium transition-all shrink-0 active:scale-95 disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Message Input Bar */}
        <div className="p-4 border-t border-white/10 bg-[#070e1c] flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-1.5 focus-within:border-[#0057c7] transition-all shadow-inner"
          >
            <textarea
              ref={inputRef}
              rows={2}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                currentMatter
                  ? `Ask legal research, discovery, or SOL questions for ${currentMatter.matter_number}...`
                  : "Ask any legal question, citation analysis, or litigation strategy..."
              }
              className="flex-1 bg-transparent border-none outline-none px-3 py-1.5 text-xs sm:text-sm text-white placeholder:text-slate-500 resize-none font-sans"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="h-10 px-4 rounded-xl bg-[#0057c7] hover:bg-[#004bb1] text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-[#0057c7]/30 shrink-0"
            >
              <span>Send</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
            <span>Press <kbd className="font-mono bg-white/10 px-1 rounded text-slate-400">Enter</kbd> to send, <kbd className="font-mono bg-white/10 px-1 rounded text-slate-400">Shift+Enter</kbd> for new line</span>
            <span>Grounding: LexisNexis Precedents · California &amp; Federal Law</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default LegalAIChatDrawer;
