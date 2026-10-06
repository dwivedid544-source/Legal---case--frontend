import { useState, useRef, useEffect } from 'react';

export function VyniusAI({ role = 'admin' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hello! I am Vynius, your AI legal assistant. How can I help you manage your matters today?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = getResponse(userMsg, role);
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
      setIsTyping(false);
    }, 1200);
  };

  const getResponse = (text, role) => {
    const t = text.toLowerCase();
    const isClient = role === 'client';

    if (t.includes('summary')) {
      return isClient 
        ? "Your case is currently focused on document review and preparing for the upcoming court date. Everything is tracking correctly."
        : "Matter Summary: Case-2045 involves a commercial dispute with Jones Industrial Corp. Current focus is on discovery and witness affidavits.";
    }
    if (t.includes('status')) {
      return "Current Status: Active. We are awaiting secondary document verification and opposing counsel's response.";
    }
    if (t.includes('next')) {
      return isClient
        ? "The next step is for your lawyer to finalize the evidence review. You don't need to take any action right now."
        : "Recommended Actions:\n1. Finalize witness list\n2. Review pending discovery docs\n3. Schedule internal strategy session";
    }
    if (t.includes('billing') || t.includes('money')) {
      return isClient
        ? "You can view your latest invoice in the Billing tab. Total outstanding is $2,850."
        : "Billing Update: Total billed for this matter is $10,450. One invoice (INV-0043) is currently pending payment.";
    }
    if (t.includes('document') || t.includes('file')) {
      return "I can see 12 documents associated with this case. All critical files have been categorized under 'Pleadings' and 'Evidence'.";
    }
    
    return "I'm not quite sure about that. Try asking for a 'summary', 'status', or 'next steps' for more accurate insights.";
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[150] font-sans">
      {/* Floating Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-[0_8px_30px_rgba(0,87,199,0.4)] transition-all duration-300 transform hover:scale-110 active:scale-95 bg-[#0057c7] text-white animate-fade-in group border-2 border-white/20"
        >
          <svg className="w-7 h-7 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed sm:absolute bottom-4 left-4 right-4 sm:left-auto sm:right-0 sm:bottom-0 w-auto sm:w-[380px] max-w-none sm:max-w-[90vw] h-[75vh] sm:h-[550px] bg-[#1a2233] rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col overflow-hidden animate-slide-up origin-bottom-right">
          {/* Header */}
          <div className="p-6 bg-[#00163c] text-white flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#0057c7] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(0,87,199,0.3)]">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-[15px] font-800 text-white tracking-tight">VyNius Intel</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-[10px] font-800 text-[#38bdf8] uppercase tracking-widest">Neural Link Active</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-[#8a94a6] hover:text-white hover:bg-white/10 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#111520] custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-[1.25rem] text-[13.5px] leading-relaxed shadow-lg ${
                  m.role === 'user' 
                  ? 'bg-[#0057c7] text-white rounded-br-none shadow-[#0057c7]/20' 
                  : 'bg-[#1a2233] text-[#dbe7ff] border border-white/5 rounded-bl-none shadow-black/20'
                }`}>
                  {m.text.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-[#1a2233] border border-white/5 p-4 rounded-[1.25rem] rounded-bl-none shadow-lg flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-[#0057c7] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-[#0057c7] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-[#0057c7] rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-5 bg-[#1a2233] border-t border-white/5">
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
              {['Summary', 'Next Steps', 'Billing'].map(chip => (
                <button key={chip} onClick={() => { setInput(chip); }} className="whitespace-nowrap px-4 py-2 bg-white/5 hover:bg-[#0057c7]/10 hover:text-[#38bdf8] text-[#8a94a6] rounded-full text-[11px] font-800 transition-all border border-white/5 hover:border-[#0057c7]/20 uppercase tracking-wider">
                  {chip}
                </button>
              ))}
            </div>
            <div className="relative">
              <input 
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask Vynius anything..."
                className="w-full bg-[#111520] border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-[14px] text-white focus:border-[#0057c7] focus:ring-4 focus:ring-[#0057c7]/10 outline-none transition-all placeholder:text-[#8a94a6] font-medium"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#0057c7] text-white rounded-xl flex items-center justify-center hover:bg-[#0066eb] disabled:opacity-30 disabled:hover:bg-[#0057c7] shadow-lg shadow-[#0057c7]/20 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
