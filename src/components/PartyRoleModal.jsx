import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatUSPhone } from '../utils/phoneUtils';

const PARTY_ROLES = [
  'Client (individual)',
  'Witness',
  'Opposing party — individual',
  'Opposing party — organization',
  'Attorney / counsel',
  'Insurance carrier / adjuster',
  'Medical provider',
  'Petitioner',
  'Beneficiary',
  'Applicant',
  'Derivative',
  'Other (custom role)'
];

export default function PartyRoleModal({ isOpen, onClose, onAddParty }) {
  const [role, setRole] = useState('Witness');
  const [customRole, setCustomRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    dob: '',
    government_id: '',
    ssn: '',
    company_name: '',
    notes: '',
    relationship: '',
    agent_for_service: '',
    point_of_contact: '',
    firm_name: '',
    bar_no: '',
    counsel_type: 'opposing',
    policy_no: '',
    claim_no: '',
    adjuster_name: '',
    coverage_side: 'adverse',
    specialty: '',
    treatment_dates: '',
    records_requested: 'No',
    billed_amount: '',
    alien_number: '',
    country_of_birth: ''
  });

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(searchQuery)}`);
        const json = await res.json();
        if (json.success) {
          setSearchResults(json.data || []);
        }
      } catch (e) {
        console.error('Contact search failed', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSelectExistingContact = (contact) => {
    setFormData(prev => ({
      ...prev,
      full_name: contact.full_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.home_address || contact.address_line_1 || '',
      company_name: contact.organization_name || '',
      government_id: contact.government_id || ''
    }));
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleChange = (e) => {
    const val = e.target.name?.includes('phone') ? formatUSPhone(e.target.value) : e.target.value;
    setFormData({ ...formData, [e.target.name]: val });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalRole = role === 'Other (custom role)' ? (customRole || 'Custom Role') : role;
    const newParty = {
      id: `party_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      party_role: finalRole,
      primary_party_role: finalRole,
      party_roles: [finalRole],
      full_name: formData.full_name || formData.company_name || 'Unnamed Party',
      company_name: formData.company_name || '',
      party_type: role.includes('organization') ? 'Organization' : 'Person',
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      government_id: formData.government_id || formData.ssn,
      notes: formData.notes,
      role_fields: { ...formData }
    };
    onAddParty(newParty);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-[#1a2233] border border-white/10 rounded-[2rem] w-full max-w-xl shadow-2xl flex flex-col text-white overflow-hidden max-h-[90vh] my-auto" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#0057c7]/20 border border-[#0057c7]/30 text-[#38bdf8] text-sm flex items-center justify-center font-bold">👥</span>
            <h3 className="text-base font-900 text-white tracking-tight uppercase">+ Add Party (Select Role)</h3>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all">✕</button>
        </div>

        {/* Deduplication Search Bar */}
        <div className="p-4 bg-white/[0.02] border-b border-white/10">
          <label className="text-[11px] font-800 uppercase tracking-wider text-[#38bdf8] mb-1.5 block">🔍 Search Existing Contacts (Avoid Re-typing):</label>
          <input
            type="text"
            placeholder="Type name, email, or phone to search database..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0f172a] border border-[#38bdf8]/30 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none"
          />
          {searchResults.length > 0 && (
            <div className="bg-[#0f172a] border border-white/15 rounded-xl mt-1.5 max-h-32 overflow-y-auto divide-y divide-white/5">
              {searchResults.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleSelectExistingContact(c)}
                  className="p-2.5 hover:bg-white/10 cursor-pointer text-xs transition-all"
                >
                  <strong className="text-white">{c.full_name}</strong> <span className="text-slate-400">({c.email || c.phone || 'No contact info'})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Select Role:</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-[#38bdf8] outline-none"
            >
              {PARTY_ROLES.map(r => (
                <option key={r} value={r} className="bg-[#1a2233] text-white">{r}</option>
              ))}
            </select>
          </div>

          {role === 'Other (custom role)' && (
            <div>
              <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Custom Role Label:</label>
              <input
                type="text"
                placeholder="e.g. Property Manager, Expert Witness"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none"
                required
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Full Name / Point of Contact:</label>
            <input
              type="text"
              name="full_name"
              placeholder="e.g. Jane Doe"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none"
              required
            />
          </div>

          {(role.includes('organization') || role.includes('carrier') || role.includes('Medical') || role === 'Attorney / counsel') && (
            <div>
              <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Organization / Firm / Facility Name:</label>
              <input
                type="text"
                name="company_name"
                placeholder="e.g. Acme Corp / State Farm / St. Jude Hospital"
                value={formData.company_name}
                onChange={handleChange}
                className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Phone:</label>
              <input type="text" name="phone" placeholder="555-0199" value={formData.phone} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Email:</label>
              <input type="email" name="email" placeholder="contact@email.com" value={formData.email} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
            </div>
          </div>

          {/* Role-Specific Masks */}
          {role === 'Witness' && (
            <div>
              <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Relationship to Case:</label>
              <input type="text" name="relationship" placeholder="e.g. Bystander, Neighbor, Co-worker" value={formData.relationship} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
            </div>
          )}

          {role === 'Attorney / counsel' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Bar No:</label>
                <input type="text" name="bar_no" placeholder="CA-123456" value={formData.bar_no} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Counsel Type:</label>
                <select name="counsel_type" value={formData.counsel_type} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-[#38bdf8] outline-none">
                  <option value="opposing" className="bg-[#1a2233] text-white">Opposing Counsel</option>
                  <option value="co-counsel" className="bg-[#1a2233] text-white">Co-Counsel</option>
                  <option value="referring" className="bg-[#1a2233] text-white">Referring Counsel</option>
                  <option value="prior" className="bg-[#1a2233] text-white">Prior Counsel</option>
                </select>
              </div>
            </div>
          )}

          {role.includes('carrier') && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Policy No:</label>
                  <input type="text" name="policy_no" value={formData.policy_no} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Claim No:</label>
                  <input type="text" name="claim_no" value={formData.claim_no} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Coverage Side:</label>
                <select name="coverage_side" value={formData.coverage_side} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-[#38bdf8] outline-none">
                  <option value="client's" className="bg-[#1a2233] text-white">Client's Policy</option>
                  <option value="adverse" className="bg-[#1a2233] text-white">Adverse / Defendant's Policy</option>
                  <option value="excess" className="bg-[#1a2233] text-white">Excess Coverage</option>
                  <option value="UM-UIM" className="bg-[#1a2233] text-white">UM / UIM Coverage</option>
                </select>
              </div>
            </>
          )}

          {role === 'Medical provider' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Specialty:</label>
                <input type="text" name="specialty" placeholder="Ortho / ER" value={formData.specialty} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Records Status:</label>
                <select name="records_requested" value={formData.records_requested} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-[#38bdf8] outline-none">
                  <option value="No" className="bg-[#1a2233] text-white">No</option>
                  <option value="pending" className="bg-[#1a2233] text-white">Pending</option>
                  <option value="received" className="bg-[#1a2233] text-white">Received</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Billed ($):</label>
                <input type="text" name="billed_amount" placeholder="4500.00" value={formData.billed_amount} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
              </div>
            </div>
          )}

          {(role === 'Petitioner' || role === 'Beneficiary' || role === 'Applicant' || role === 'Derivative') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Alien Number (A-Number):</label>
                <input type="text" name="alien_number" placeholder="A123456789" value={formData.alien_number} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Country of Birth:</label>
                <input type="text" name="country_of_birth" placeholder="e.g. Mexico, India" value={formData.country_of_birth} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Role Notes / Specific Facts:</label>
            <textarea
              name="notes"
              rows={3}
              placeholder={role === 'Witness' ? 'Where they were / What they saw...' : 'Enter details...'}
              value={formData.notes}
              onChange={handleChange}
              className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none resize-y"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold px-4 py-2.5 rounded-xl transition-all">Cancel</button>
            <button type="submit" className="bg-[#0057c7] hover:bg-[#004bb1] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#0057c7]/20">Add Party to Matter</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
