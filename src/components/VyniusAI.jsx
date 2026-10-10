import { useState, useRef, useEffect } from 'react';
import api from '../services/api';

export function VyniusAI({ role = 'admin' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello! I am VyNius, your AI legal specialist powered by GPT-4o. How can I assist you with legal research, case workflow tracking, or litigation drafting today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [matters, setMatters] = useState([]);
  const [selectedMatterId, setSelectedMatterId] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const scrollRef = useRef(null);

  // Load matters for case grounding
  useEffect(() => {
    const fetchMatters = async () => {
      try {
        const res = await api.matters.list({ limit: 100 });
        if (res && res.data) {
          setMatters(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.warn('Could not load matters for VyNius floating widget:', err);
      }
    };
    fetchMatters();
  }, []);

  // Sync matter from URL if on a matter/case detail page
  useEffect(() => {
    const match = window.location.pathname.match(/(?:matters|cases)\/(\d+)/);
    if (match && match[1]) {
      setSelectedMatterId(match[1]);
    }
  }, [window.location.pathname]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const activeMatter = matters.find(m => String(m.id) === String(selectedMatterId));

  const handleSend = async (customPrompt) => {
    const userMsg = (customPrompt || input).trim();
    if (!userMsg || isTyping) return;

    const newMessages = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      const payloadMessages = newMessages
        .filter((_, idx) => idx > 0)
        .map(m => ({ role: m.role, content: m.text }));

      const res = await api.ai.chat({
        messages: payloadMessages.length > 0 ? payloadMessages : [{ role: 'user', content: userMsg }],
        matterId: selectedMatterId ? parseInt(selectedMatterId, 10) : null,
        workflowMode: 'general'
      });

      const reply = res?.data?.reply || res?.reply || 'I am ready for your next legal inquiry.';
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: reply,
          hasMatterContext: res?.data?.hasMatterContext
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ AI Service Note: ${err.message || 'Unable to reach OpenAI service. Please verify your connection or API key.'}`,
          isError: true
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        text: `Session reset. How can I assist you with legal research, case workflow tracking, or litigation drafting today?`
      }
    ]);
  };

  const quickChips = activeMatter
    ? [
        { label: 'Case Summary', text: 'Provide a concise factual and procedural summary of this active matter.' },
        { label: 'Injuries & Damages', text: 'Summarize the documented injuries, treatment, and damages for this client.' },
        { label: 'SOL & Deadlines', text: 'What is the applicable statute of limitations and procedural deadlines for this matter?' },
        { label: 'Next Steps', text: 'What are the recommended legal action items and next steps for this case?' },
      ]
    : [
        { label: 'Tort Law Research', text: 'Provide a breakdown of required elements for a California premises liability claim.' },
        { label: 'SOL Check', text: 'Explain California CCP § 335.1 statute of limitations and tolling exceptions.' },
        { label: 'Discovery Drafting', text: 'Draft 5 critical special interrogatories for an injury claim regarding liability and insurance.' },
        { label: 'Next Steps', text: 'What are standard litigation workflow milestones for personal injury plaintiff cases?' },
      ];

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[150] font-sans">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-[0_8px_30px_rgba(0,87,199,0.5)] transition-all duration-300 transform hover:scale-110 active:scale-95 bg-gradient-to-r from-[#0057c7] to-[#0070f3] text-white animate-fade-in group border-2 border-white/20 relative"
          title="Open VyNius AI Legal Assistant"
        >
          <svg className="w-7 h-7 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#111520] rounded-full animate-pulse" />
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="fixed sm:absolute bottom-4 left-4 right-4 sm:left-auto sm:right-0 sm:bottom-0 w-auto sm:w-[420px] max-w-none sm:max-w-[95vw] h-[80vh] sm:h-[600px] bg-[#0c1424] rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col overflow-hidden animate-slide-up origin-bottom-right">
          
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#001f54] via-[#002f7a] to-[#001f54] text-white flex items-center justify-between border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#0057c7] flex items-center justify-center text-white shadow-lg shadow-[#0057c7]/40 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-800 text-white tracking-tight truncate">VyNius Intel</h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full shrink-0">
                    GPT-4o
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider truncate">
                    LexisNexis &amp; Claude Standards
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button 
                onClick={clearChat}
                title="Reset Conversation"
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-all text-xs"
              >
                ↺
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                title="Close Assistant"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Matter Grounding Selector Bar */}
          <div className="px-3.5 py-2 bg-black/40 border-b border-white/5 flex items-center justify-between gap-2 text-xs flex-shrink-0">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              📁 Case:
            </span>
            <select
              value={selectedMatterId}
              onChange={(e) => setSelectedMatterId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-[11px] text-white outline-none focus:border-[#0057c7] w-full font-medium truncate"
            >
              <option value="" className="bg-[#0c1424] text-slate-300">General (Firm-Wide Practice)</option>
              {matters.map(m => (
                <option key={m.id} value={m.id} className="bg-[#0c1424] text-white">
                  {m.matter_number} — {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Messages Feed */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#0a0f1d] custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] p-3.5 rounded-[1.25rem] text-[13px] leading-relaxed shadow-lg relative group ${
                  m.role === 'user' 
                  ? 'bg-[#0057c7] text-white rounded-br-none shadow-[#0057c7]/20 font-medium' 
                  : m.isError
                    ? 'bg-red-500/10 text-red-200 border border-red-500/20 rounded-bl-none'
                    : 'bg-[#151f33] text-slate-200 border border-white/5 rounded-bl-none shadow-black/30'
                }`}>
                  {m.role === 'assistant' && (
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 pb-1 border-b border-white/5">
                      <span className="font-bold text-[#38bdf8] uppercase tracking-wider">VyNius AI</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(m.text, i)}
                        className="text-[10px] text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors"
                      >
                        {copiedIndex === i ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap break-words">
                    {m.text}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-[#151f33] border border-white/5 p-3.5 rounded-[1.25rem] rounded-bl-none shadow-lg flex gap-2 items-center">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#38bdf8] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-[#38bdf8] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-[#38bdf8] rounded-full animate-bounce" />
                  </div>
                  <span className="text-[11px] text-sky-300 font-medium">VyNius is researching case authorities...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3.5 py-2 bg-[#0d1527] border-t border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
            {quickChips.map((chip, idx) => (
              <button 
                key={idx} 
                onClick={() => handleSend(chip.text)} 
                disabled={isTyping}
                className="whitespace-nowrap px-3 py-1 bg-white/5 hover:bg-[#0057c7]/20 hover:text-sky-300 hover:border-[#0057c7]/40 text-slate-300 rounded-full text-[11px] font-semibold transition-all border border-white/5 disabled:opacity-50 shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3.5 sm:p-4 bg-[#0a0f1d] border-t border-white/10 flex-shrink-0">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="relative flex items-center"
            >
              <input 
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={
                  activeMatter 
                    ? `Ask VyNius about ${activeMatter.matter_number}...` 
                    : "Ask VyNius anything (research, SOL, drafting)..."
                }
                className="w-full bg-[#141d30] border border-white/10 rounded-2xl pl-4 pr-12 py-3 text-[13px] text-white focus:border-[#0057c7] outline-none transition-all placeholder:text-slate-400 font-medium"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#0057c7] text-white rounded-xl flex items-center justify-center hover:bg-[#0066eb] disabled:opacity-30 disabled:hover:bg-[#0057c7] shadow-md shadow-[#0057c7]/30 transition-all shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VyniusAI;
