import React from 'react';
import { createPortal } from 'react-dom';

const RATE_CARD_ITEMS = [
  { id: 'app_master_in_person', title: 'Master Calendar Hearing', mode: 'In-Person', rate: 600, category: 'EOIR Court' },
  { id: 'app_master_virtual', title: 'Master Calendar Hearing', mode: 'Virtual / Webex', rate: 400, category: 'EOIR Court' },
  { id: 'app_individual_in_person', title: 'Individual Merits Hearing', mode: 'In-Person', rate: 1800, category: 'EOIR Court' },
  { id: 'app_individual_virtual', title: 'Individual Merits Hearing', mode: 'Virtual / Webex', rate: 1200, category: 'EOIR Court' },
  { id: 'app_uscis_in_person', title: 'USCIS Field Office Interview', mode: 'In-Person', rate: 850, category: 'USCIS Agency' },
  { id: 'app_uscis_virtual', title: 'USCIS Field Office Interview', mode: 'Virtual / Phone', rate: 550, category: 'USCIS Agency' },
  { id: 'app_asylum_in_person', title: 'Asylum Office Interview', mode: 'In-Person', rate: 1000, category: 'USCIS Asylum' },
  { id: 'app_credible_fear', title: 'Credible Fear Interview', mode: 'In-Person', rate: 900, category: 'DHS Detention' }
];

export default function ImmigrationRateCardModal({ isOpen, onClose, onSelectRate }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-[#1a2233] border border-white/10 rounded-[2rem] w-full max-w-xl shadow-2xl flex flex-col text-white overflow-hidden max-h-[85vh] my-auto" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center font-bold">📋</span>
            <h3 className="text-base font-900 text-white tracking-tight uppercase">Immigration Appearance Fee Rate Card</h3>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all">✕</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          <p className="text-xs text-slate-400">Select standard appearance fee to pre-populate line item rate:</p>
          <div className="grid grid-cols-1 gap-2.5">
            {RATE_CARD_ITEMS.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectRate(item);
                  onClose();
                }}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#38bdf8]/40 hover:bg-white/[0.06] cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-800 text-white group-hover:text-[#38bdf8] transition-colors">{item.title}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300 uppercase">{item.category}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Mode: <strong className="text-slate-200">{item.mode}</strong></span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-emerald-400 font-mono">${item.rate}.00</span>
                  <span className="text-[10px] text-[#38bdf8] font-bold block group-hover:underline mt-0.5">Load Fee →</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-white/10 bg-white/[0.02]">
          <button type="button" onClick={onClose} className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold px-4 py-2 rounded-xl transition-all">Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
