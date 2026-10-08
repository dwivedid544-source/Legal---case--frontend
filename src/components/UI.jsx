import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

export function downloadFile(filename, content = "Dummy legal document content.") {
  const el = document.createElement('a');
  el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  el.setAttribute('download', filename);
  el.style.display = 'none';
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
}

// ── Toast System ─────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, toast };
}

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  const colors = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-[#0057c7]', warning: 'bg-amber-500' };
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  return (
    <div className="fixed bottom-6 right-6 z-[9999999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`${colors[t.type] || colors.success} text-white px-5 py-3 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center gap-3.5 text-[14px] font-bold pointer-events-auto min-w-[280px] max-w-[450px] border border-white/20 backdrop-blur-md transition-all`}>
          <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[12px] flex-shrink-0">{icons[t.type] || '✓'}</span>
          <span className="break-words leading-snug">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ── Badge Component ───────────────────────────────────────
export function Badge({ status }) {
  const map = {
    active:   ['bg-emerald-500/15 text-emerald-400 border border-emerald-500/20', 'Active',  'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'],
    inactive: ['bg-slate-500/15 text-slate-400 border border-slate-500/20',      'Inactive','bg-slate-400'],
    pending:  ['bg-amber-500/15 text-amber-400 border border-amber-500/20',        'Pending', 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'],
    prospective: ['bg-blue-500/15 text-blue-400 border border-blue-500/20', 'Prospective', 'bg-blue-400 shadow-[0_0_8px_#60a5fa]'],
    past:        ['bg-slate-500/15 text-slate-400 border border-slate-500/20', 'Past', 'bg-slate-500'],
    closed:   ['bg-slate-500/15 text-slate-400 border border-slate-500/20',       'Closed',  'bg-slate-500'],
    completed:['bg-slate-500/15 text-slate-400 border border-slate-500/20',       'Complete','bg-slate-500'],
    new:      ['bg-blue-500/15 text-blue-400 border border-blue-500/20',           'New',     'bg-blue-400 shadow-[0_0_8px_#60a5fa]'],
    screening:['bg-amber-500/15 text-amber-400 border border-amber-500/20',       'Screening','bg-amber-400'],
    referred: ['bg-teal-500/15 text-teal-400 border border-teal-500/20',          'Referred', 'bg-teal-400 shadow-[0_0_8px_#14b8a6]'],
    consultation_set: ['bg-indigo-500/15 text-indigo-400 border border-indigo-500/20', 'Consultation','bg-indigo-400'],
    retained: ['bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',  'Retained','bg-emerald-400'],
    declined: ['bg-red-500/15 text-red-400 border border-red-500/20',              'Declined','bg-red-400'],
    archived: ['bg-slate-500/15 text-slate-400 border border-slate-500/20',       'Archived','bg-slate-500'],
    draft:    ['bg-slate-500/15 text-slate-400 border border-slate-500/20',       'Draft',   'bg-slate-400'],
    void:     ['bg-slate-500/15 text-slate-400 border border-slate-500/20',       'Void',    'bg-slate-500'],
    unpaid:   ['bg-red-500/15 text-red-400 border border-red-500/20',              'Unpaid',  'bg-red-400'],
    due:      ['bg-[#0057c7]/15 text-[#38bdf8] border border-[#0057c7]/20',        'Due',     'bg-[#38bdf8]'],
    paid:     ['bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',  'Paid',    'bg-emerald-400'],
    overdue:  ['bg-red-500/15 text-red-400 border border-red-500/20',              'Overdue', 'bg-red-400 shadow-[0_0_8px_#ef4444]'],
    high:     ['bg-red-500/15 text-red-400 border border-red-500/20',              'High',    'bg-red-400 shadow-[0_0_8px_#ef4444]'],
    medium:   ['bg-amber-500/15 text-amber-400 border border-amber-500/20',        'Medium',  'bg-amber-400 shadow-[0_0_8px_#fbbf24]'],
    low:      ['bg-[#0057c7]/15 text-[#38bdf8] border border-[#0057c7]/20',        'Low',     'bg-[#38bdf8]'],
  };
  const [cls, label, dotCls] = map[status?.toLowerCase()] || ['bg-slate-500/15 text-slate-400 border border-slate-500/20', status, 'bg-slate-400'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-900 uppercase tracking-widest border shadow-sm ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
      {label}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────
export function Avatar({ initials, size = 'sm', color, className = '' }) {
  const sizes = { 
    xs:'w-6 h-6 text-[10px]', 
    sm:'w-8 h-8 text-[12px]', 
    md:'w-10 h-10 text-[14px]', 
    lg:'w-12 h-12 text-base', 
    xl:'w-16 h-16 text-xl' 
  };
  return (
    <div className={`${sizes[size]} rounded-2xl flex items-center justify-center font-900 flex-shrink-0 text-white shadow-[0_8px_20px_rgba(0,0,0,0.4)] border border-white/10 relative overflow-hidden group ${className}`}
      style={{ background: color || 'linear-gradient(135deg, #0057c7, #0B1F3A)' }}>
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="relative z-10 drop-shadow-md tracking-tighter">{initials}</span>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────
export function StatCard({ label, value, change, icon, gradient, iconBg }) {
  return (
    <div className="group cursor-pointer relative active:scale-[0.98] transition-all">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent opacity-50 rounded-3xl" />
      <div className="relative p-6 rounded-3xl border border-white/5 bg-[#1a2233]/40 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl -mr-8 -mt-8 group-hover:bg-white/10 transition-colors" />
        
        <div className="flex items-center justify-between mb-6">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-white/5 border border-white/10 shadow-xl group-hover:scale-110 transition-transform duration-500`}>
            {icon}
          </div>
          {change && (
            <span className={`text-[10px] font-900 px-2.5 py-1 rounded-lg tracking-widest uppercase ${change.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {change}
            </span>
          )}
        </div>

        <div className="relative">
          <div className="text-3xl font-900 text-white font-display leading-tight tracking-tighter mb-1.5 group-hover:translate-x-1 transition-transform duration-500">{value}</div>
          <div className="text-[11px] text-[#8a94a6] font-800 uppercase tracking-[0.2em] opacity-60">{label}</div>
        </div>
        
        {/* Animated accent bar */}
        <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      </div>
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start sm:items-center justify-between mb-8 flex-wrap gap-4">
      <div>
        <h1 className="text-3xl font-900 text-white font-display tracking-tight">{title}</h1>
        {subtitle && <p className="text-[14px] text-[#8a94a6] mt-1 font-medium">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">{children}</div>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────
export function Card({ children, className = '', noPad = false }) {
  return (
    <div className={`card ${noPad ? '' : 'p-6'} ${className}`}>
      {children}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────
export function Table({ headers = [], children, searchPlaceholder, onSearch, actions }) {
  return (
    <div className="card overflow-hidden border-white/5">
      {(searchPlaceholder || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02] gap-4 flex-wrap">
          {searchPlaceholder && (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2 min-w-0 w-full sm:w-80 focus-within:border-[#0057c7] transition-all">
              <svg className="w-4 h-4 text-[#8a94a6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="bg-transparent border-none outline-none text-[14px] text-white w-full placeholder:text-[#8a94a6] font-medium" placeholder={searchPlaceholder} onChange={e => onSearch?.(e.target.value)} />
            </div>
          )}
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          {Array.isArray(headers) && headers.length > 0 && (
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/5">
                {headers.map(h => (
                  <th key={h} className="px-6 py-4 text-[11px] font-800 text-[#8a94a6] uppercase tracking-[0.1em] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-white/5">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function Tr({ children, onClick }) {
  return (
    <tr className={`group transition-all ${onClick ? 'hover:bg-white/[0.04] cursor-pointer' : 'hover:bg-white/[0.02]'}`} onClick={onClick}>
      {children}
    </tr>
  );
}

export function Td({ children, className = '' }) {
  return <td className={`px-6 py-4 text-[14px] text-[#b8c2d1] font-medium ${className}`}>{children}</td>;
}

// ── Tabs ──────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-nowrap w-full max-w-full border-b border-white/10 mb-8 overflow-x-auto no-scrollbar scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
      {tabs.map(tab => (
        <button key={tab} onClick={() => onChange(tab)}
          className={`tab-btn whitespace-nowrap flex-shrink-0 ${active === tab ? 'active' : ''}`}>
          {tab}
        </button>
      ))}
    </div>
  );
}

// ── Search Input ──────────────────────────────────────────
export function SearchInput({ placeholder, value, onChange }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-[#0057c7] transition-all">
      <svg className="w-4 h-4 text-[#8a94a6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input className="bg-transparent border-none outline-none text-[14px] text-white w-full placeholder:text-[#8a94a6] font-medium" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const isTitan = wide === 'titan';

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
      <div className={`relative bg-[#1a2233] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-slide-up flex flex-col overflow-hidden z-10 ${
        isTitan
          ? 'rounded-2xl w-[580px] max-w-[95vw] max-h-[430px]'
          : wide
            ? 'rounded-[2rem] w-full max-w-4xl max-h-[92vh]'
            : 'rounded-[2rem] w-full max-w-lg max-h-[92vh]'
      }`}
        onClick={e => e.stopPropagation()}>
        <div className={`flex items-center justify-between ${isTitan ? 'px-6 py-3.5' : 'px-8 py-6'} border-b border-white/5 bg-white/[0.02]`}>
          <h3 className={`${isTitan ? 'text-[16px]' : 'text-xl'} font-800 text-white font-display tracking-tight truncate mr-3`}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8a94a6] hover:bg-white/10 hover:text-white transition-all shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className={`overflow-y-auto ${isTitan ? 'px-6 py-3.5 space-y-3' : 'p-8'} flex-1 custom-scrollbar`}>{children}</div>
        {footer && <div className={`flex justify-end gap-3 ${isTitan ? 'px-6 py-3' : 'px-8 py-5'} border-t border-white/5 bg-black/20 flex-wrap`}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ── Form Fields ───────────────────────────────────────────
export function Field({ label, required, children }) {
  return (
    <div className="mb-5 last:mb-0">
      <label className="block text-[13px] font-800 text-[#b8c2d1] uppercase tracking-[0.1em] mb-2 ml-1">
        {label}{required && <span className="text-[#ef4444] ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

import { formatUSPhone } from '../utils/phoneUtils';

export function Input({ className = '', value, type, onChange, ...props }) {
  const isPhone = type === 'tel' || (props.name && (
    props.name.includes('phone') || 
    props.name.includes('mobile') || 
    props.name.includes('fax')
  ));

  let normalizedValue = value !== undefined ? (value ?? '') : undefined;
  if (isPhone && typeof normalizedValue === 'string' && normalizedValue) {
    normalizedValue = formatUSPhone(normalizedValue);
  }

  const handleChange = (e) => {
    if (isPhone) {
      e.target.value = formatUSPhone(e.target.value);
    }
    if (onChange) {
      onChange(e);
    }
  };

  return <input type={type} className={`form-input ${className}`} value={normalizedValue} onChange={handleChange} {...props} />;
}

export function PhoneInput({ className = '', ...props }) {
  return <Input type="tel" className={className} {...props} />;
}

export function Select({ children, className = '', value, ...props }) {
  const normalizedValue = value !== undefined ? (value ?? '') : undefined;
  return (
    <select 
      className={`form-input cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%238a94a6%22%20stroke-width%3D%222.5%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25em_1.25em] bg-[right_1rem_center] bg-no-repeat [color-scheme:dark] ${className}`} 
      value={normalizedValue}
      {...props}
    >
      {children}
    </select>
  );
}

export function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  className = '',
  disabled = false,
  searchable = undefined,
  dropUp: explicitDropUp = undefined
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const normalizedOptions = useMemo(() => {
    return options.map(opt => {
      if (opt === null || opt === undefined) {
        return { value: '', label: '' };
      }
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: opt, label: String(opt) };
      }
      return {
        value: opt.value !== undefined ? opt.value : opt.id,
        label: opt.label !== undefined ? opt.label : (opt.name || String(opt.value)),
        color: opt.color,
        icon: opt.icon
      };
    });
  }, [options]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find(opt => String(opt.value ?? '') === String(value ?? ''));
  }, [normalizedOptions, value]);

  const isSearchable = searchable !== undefined ? searchable : normalizedOptions.length > 8;

  const filteredOptions = useMemo(() => {
    if (!isSearchable || !searchTerm.trim()) return normalizedOptions;
    const lower = searchTerm.toLowerCase();
    return normalizedOptions.filter(opt =>
      String(opt.label).toLowerCase().includes(lower) ||
      String(opt.value).toLowerCase().includes(lower)
    );
  }, [isSearchable, searchTerm, normalizedOptions]);

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      if (explicitDropUp !== undefined) {
        setDropUp(explicitDropUp);
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setDropUp(spaceBelow < 260 && rect.top > 260);
      }
      setSearchTerm('');
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen && isSearchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, isSearchable]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={`w-full text-[13px] bg-white/[0.05] border ${
          isOpen ? 'border-[#38bdf8] ring-4 ring-[#0057c7]/20' : 'border-white/10 hover:border-white/20'
        } rounded-xl px-4 py-3 text-white outline-none transition-all cursor-pointer font-600 flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-2.5 truncate pr-2">
          {selectedOption?.color && (
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
              style={{ backgroundColor: selectedOption.color, color: selectedOption.color }}
            />
          )}
          <span className={`truncate ${selectedOption ? 'text-white' : 'text-white/40'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <div className={`text-[#8a94a6] transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-[#38bdf8]' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-[70] ${
            dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } bg-[#0c1322] border border-white/15 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl p-1.5 max-h-64 flex flex-col animate-fade-in`}
          style={{ minWidth: '100%' }}
        >
          {isSearchable && (
            <div className="p-1 pb-1.5 border-b border-white/10 mb-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full text-[12px] bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-white placeholder:text-white/30 outline-none focus:border-[#38bdf8] transition-colors"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="overflow-y-auto max-h-52 custom-scrollbar space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-[12px] text-[#8a94a6] italic">
                {searchTerm ? 'No matches found' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value ?? '') === String(value ?? '');
                return (
                  <button
                    key={`${opt.value}-${idx}`}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-[13px] font-600 rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#0057c7] text-white shadow-md font-bold'
                        : 'text-white/80 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      {opt.color && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0 shadow-[0_0_6px_currentColor]"
                          style={{ backgroundColor: opt.color, color: opt.color }}
                        />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && (
                      <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Textarea({ className = '', value, ...props }) {
  const normalizedValue = value !== undefined ? (value ?? '') : undefined;
  return <textarea className={`form-input resize-none min-h-[100px] ${className}`} value={normalizedValue} {...props} />;
}

// ── Timeline ──────────────────────────────────────────────
export function Timeline({ items }) {
  const dotColor = { green:'bg-[#22c55e]', blue:'bg-[#0057c7]', gray:'bg-[#8a94a6]', amber:'bg-[#f59e0b]', red: 'bg-[#ef4444]' };
  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4 group">
          <div className="flex flex-col items-center flex-shrink-0 w-6">
            <div className={`w-3.5 h-3.5 rounded-full mt-1.5 flex-shrink-0 border-4 border-[#1a2233] ring-2 ring-white/5 ${dotColor[item.color] || 'bg-[#8a94a6]'} shadow-lg group-hover:scale-125 transition-transform`} />
            {i < items.length - 1 && <div className="w-px flex-1 bg-white/5 my-2" />}
          </div>
          <div className="pb-6 flex-1">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[14px] font-700 text-white group-hover:text-[#38bdf8] transition-colors">{item.title}</p>
              <p className="text-[11px] text-[#8a94a6] font-700 uppercase tracking-tighter whitespace-nowrap">{item.date}</p>
            </div>
            {item.desc && <p className="text-[13px] text-[#8a94a6] mt-1.5 leading-relaxed font-medium">{item.desc}</p>}
            {item.by && <p className="text-[11px] text-[#38bdf8] mt-2 font-800 uppercase tracking-widest">{item.by}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────
export function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-4xl mb-6 shadow-inner border border-white/5">
        {typeof icon === 'string' ? icon : (
          <div className="text-[#8a94a6]">{icon}</div>
        )}
      </div>
      <p className="text-[18px] font-800 text-white font-display tracking-tight">{title}</p>
      {desc && <p className="text-[14px] text-[#8a94a6] mt-2 max-w-[280px] font-medium">{desc}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────
export function ProgressBar({ pct, color = 'bg-[#0057c7]' }) {
  return (
    <div className="h-2 bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/5">
      <div className={`h-full rounded-full ${color} transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1)`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── File Icon ─────────────────────────────────────────────
export function FileIcon({ type }) {
  if (type === 'pdf') return (
    <div className="w-12 h-12 rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center shadow-lg">
      <svg className="w-6 h-6 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path d="M13 3v5a1 1 0 001 1h5" /></svg>
    </div>
  );
  if (type === 'doc') return (
    <div className="w-12 h-12 rounded-2xl bg-[#0057c7]/10 border border-[#0057c7]/20 flex items-center justify-center shadow-lg">
      <svg className="w-6 h-6 text-[#0057c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    </div>
  );
  return (
    <div className="w-12 h-12 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center shadow-lg">
      <svg className="w-6 h-6 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    </div>
  );
}
// ── Duplicate Contact Modal ─────────────────────────────────
export function DuplicateContactModal({ isOpen, duplicateData, onUseExisting, onCancel }) {
  if (!isOpen || !duplicateData) return null;
  const contact = duplicateData.contact || duplicateData;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={onCancel}>
      <div className="bg-[#161f30] border border-amber-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 text-white" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl">
            ⚠️
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-display">Duplicate Contact Found</h3>
            <p className="text-xs text-slate-400">A contact with the same information already exists in the system.</p>
          </div>
        </div>

        <div className="bg-[#0b121e] border border-white/10 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Name:</span>
            <span className="text-white font-bold">{contact.name || contact.full_name || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Phone:</span>
            <span className="text-amber-300 font-mono font-semibold">{contact.phone || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Email:</span>
            <span className="text-sky-300 font-mono">{contact.email && !contact.email.includes('@vktori.internal') ? contact.email : 'N/A'}</span>
          </div>
          {contact.government_id && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Gov ID / Driver License:</span>
              <span className="text-emerald-300 font-mono">{contact.government_id}</span>
            </div>
          )}
        </div>

        {duplicateData.message && (
          <p className="text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
            ℹ️ {duplicateData.message}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 btn btn-secondary text-xs font-semibold py-2.5">
            Cancel
          </button>
          <button type="button" onClick={() => onUseExisting(contact)} className="flex-1 bg-[#0057c7] hover:bg-[#0046a3] text-white text-xs font-bold rounded-xl px-4 py-2.5 shadow-lg shadow-[#0057c7]/20 transition-all flex items-center justify-center gap-1.5">
            <span>✓ Use Existing Contact</span>
          </button>
        </div>
      </div>
    </div>
  );
}

