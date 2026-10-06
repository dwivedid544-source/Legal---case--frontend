import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const MODULE_TYPES = [
  'Vehicle',
  'Injury',
  'Incident / accident',
  'Insurance claim',
  'Property / premises',
  'Immigration application',
  'Employment claim',
  'Evidence / photos',
  'Custom variable'
];

export default function VariableModuleModal({ isOpen, onClose, onAddModule }) {
  const [moduleType, setModuleType] = useState('Vehicle');
  const [customName, setCustomName] = useState('');
  
  // Conditional (Yes/No) States (Default = No)
  const [hasPhotos, setHasPhotos] = useState(false);
  const [hasPoliceReport, setHasPoliceReport] = useState(false);
  const [hasWitnesses, setHasWitnesses] = useState(false);
  const [hasPropertyInjury, setHasPropertyInjury] = useState(false);
  const [hasPropertyNotices, setHasPropertyNotices] = useState(false);
  const [hasAdminCharge, setHasAdminCharge] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    // Vehicle
    belongs_to_party: '', make: '', model: '', year: '', vehicle_type: 'Sedan', vin: '', license_plate: '', damage_desc: '', photo_count: '', photo_location: '',
    // Injury
    injured_party: '', injury_type: '', body_parts: '', treatment_status: 'Under Treatment',
    // Incident
    incident_date: '', location: '', police_agency: '', police_report_no: '',
    // Insurance
    carrier_name: '', policy_no: '', claim_no: '', adjuster_name: '', claim_status: 'filed',
    // Property
    property_address: '', unit_no: '', landlord_manager: '', issue_type: 'mold', property_injured_party: '', property_injury_desc: '', notice_dates: '', notice_method: 'Email',
    // Immigration
    form_type: 'I-130', posture: 'affirmative USCIS', receipt_no: '', filed_date: '', immigration_status: 'Pending',
    // Employment
    employer: '', position: '', employment_dates: '', wage: '', employment_claim_type: 'Wrongful Termination', admin_agency: 'EEOC', admin_charge_no: '', right_to_sue_date: '',
    // Evidence
    evidence_type: 'Photos', evidence_source: '', date_collected: '', storage_location: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalType = moduleType === 'Custom variable' ? (customName || 'Custom Module') : moduleType;
    const newModule = {
      id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      module_type: finalType,
      title: formData.title || `${finalType} Record`,
      description: formData.description,
      payload: {
        ...formData,
        has_photos: hasPhotos,
        has_police_report: hasPoliceReport,
        has_witnesses: hasWitnesses,
        has_property_injury: hasPropertyInjury,
        has_property_notices: hasPropertyNotices,
        has_admin_charge: hasAdminCharge
      }
    };
    onAddModule(newModule);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-[#1a2233] border border-white/10 rounded-[2rem] w-full max-w-xl shadow-2xl flex flex-col text-white overflow-hidden max-h-[90vh] my-auto" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#0057c7]/20 border border-[#0057c7]/30 text-[#38bdf8] text-sm flex items-center justify-center font-bold">📋</span>
            <h3 className="text-base font-900 text-white tracking-tight uppercase">+ Add Variable Module</h3>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Select Module Type:</label>
            <select
              value={moduleType}
              onChange={(e) => setModuleType(e.target.value)}
              className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-[#38bdf8] outline-none"
            >
              {MODULE_TYPES.map(m => (
                <option key={m} value={m} className="bg-[#1a2233] text-white">{m}</option>
              ))}
            </select>
          </div>

          {moduleType === 'Custom variable' && (
            <div>
              <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Custom Variable Name:</label>
              <input
                type="text"
                placeholder="e.g. HOA Assessment, Patent Claim"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none"
                required
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Module Title / Label:</label>
            <input
              type="text"
              name="title"
              placeholder={`e.g. Primary ${moduleType} Record`}
              value={formData.title}
              onChange={handleChange}
              className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none"
              required
            />
          </div>

          {/* 1. VEHICLE MASK */}
          {moduleType === 'Vehicle' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="text" name="year" placeholder="Year (2023)" value={formData.year} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                <input type="text" name="make" placeholder="Make (Toyota)" value={formData.make} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                <input type="text" name="model" placeholder="Model (Camry)" value={formData.model} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="license_plate" placeholder="License Plate #" value={formData.license_plate} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                <input type="text" name="vin" placeholder="VIN Number" value={formData.vin} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
              </div>
              
              {/* Conditional Photos Available */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-700 text-slate-300">Photos Available?</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setHasPhotos(false)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${!hasPhotos ? 'bg-slate-700 text-white' : 'bg-white/5 text-slate-400'}`}>No</button>
                    <button type="button" onClick={() => setHasPhotos(true)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${hasPhotos ? 'bg-[#0057c7] text-white' : 'bg-white/5 text-slate-400'}`}>Yes</button>
                  </div>
                </div>
                {hasPhotos && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/10 animate-fade-in">
                    <input type="text" name="photo_count" placeholder="Photo Count (e.g. 12)" value={formData.photo_count} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                    <input type="text" name="photo_location" placeholder="Storage Folder / Cloud Link" value={formData.photo_location} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                  </div>
                )}
              </div>
            </>
          )}

          {/* 2. INJURY MASK */}
          {moduleType === 'Injury' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="injured_party" placeholder="Injured Party Name" value={formData.injured_party} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                <input type="text" name="injury_type" placeholder="Injury Type (Fracture, Whiplash)" value={formData.injury_type} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
              </div>
              <input type="text" name="body_parts" placeholder="Body Part(s) Affected (Lumbar Spine, Knee)" value={formData.body_parts} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
            </>
          )}

          {/* 3. INCIDENT / ACCIDENT MASK */}
          {moduleType === 'Incident / accident' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="date" name="incident_date" value={formData.incident_date} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-[#38bdf8] outline-none" />
                <input type="text" name="location" placeholder="Location / Intersection" value={formData.location} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
              </div>

              {/* Conditional Police Report */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-700 text-slate-300">Police Report Taken?</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setHasPoliceReport(false)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${!hasPoliceReport ? 'bg-slate-700 text-white' : 'bg-white/5 text-slate-400'}`}>No</button>
                    <button type="button" onClick={() => setHasPoliceReport(true)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${hasPoliceReport ? 'bg-[#0057c7] text-white' : 'bg-white/5 text-slate-400'}`}>Yes</button>
                  </div>
                </div>
                {hasPoliceReport && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/10 animate-fade-in">
                    <input type="text" name="police_agency" placeholder="Police Agency (CHP, LAPD)" value={formData.police_agency} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                    <input type="text" name="police_report_no" placeholder="Report Number" value={formData.police_report_no} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                  </div>
                )}
              </div>
            </>
          )}

          {/* 4. INSURANCE CLAIM MASK */}
          {moduleType === 'Insurance claim' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="carrier_name" placeholder="Carrier Name (State Farm)" value={formData.carrier_name} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                <select name="claim_status" value={formData.claim_status} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-[#38bdf8] outline-none">
                  <option value="not filed" className="bg-[#1a2233] text-white">Not Filed</option>
                  <option value="filed" className="bg-[#1a2233] text-white">Filed</option>
                  <option value="accepted" className="bg-[#1a2233] text-white">Accepted</option>
                  <option value="denied" className="bg-[#1a2233] text-white">Denied</option>
                  <option value="negotiating" className="bg-[#1a2233] text-white">Negotiating</option>
                  <option value="settled" className="bg-[#1a2233] text-white">Settled</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="policy_no" placeholder="Policy No" value={formData.policy_no} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                <input type="text" name="claim_no" placeholder="Claim No" value={formData.claim_no} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
              </div>
            </>
          )}

          {/* 5. PROPERTY / PREMISES MASK */}
          {moduleType === 'Property / premises' && (
            <>
              <input type="text" name="property_address" placeholder="Property Address" value={formData.property_address} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="unit_no" placeholder="Unit / Apt #" value={formData.unit_no} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                <select name="issue_type" value={formData.issue_type} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-[#38bdf8] outline-none">
                  <option value="mold" className="bg-[#1a2233] text-white">Mold</option>
                  <option value="pests" className="bg-[#1a2233] text-white">Pests</option>
                  <option value="water" className="bg-[#1a2233] text-white">Water Leak</option>
                  <option value="utilities" className="bg-[#1a2233] text-white">Utilities</option>
                  <option value="structural" className="bg-[#1a2233] text-white">Structural Defect</option>
                  <option value="security" className="bg-[#1a2233] text-white">Security Violation</option>
                </select>
              </div>

              {/* Conditional Injury From Conditions */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-700 text-slate-300">Injury from Conditions?</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setHasPropertyInjury(false)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${!hasPropertyInjury ? 'bg-slate-700 text-white' : 'bg-white/5 text-slate-400'}`}>No</button>
                    <button type="button" onClick={() => setHasPropertyInjury(true)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${hasPropertyInjury ? 'bg-[#0057c7] text-white' : 'bg-white/5 text-slate-400'}`}>Yes</button>
                  </div>
                </div>
                {hasPropertyInjury && (
                  <div className="space-y-2 pt-2 border-t border-white/10 animate-fade-in">
                    <input type="text" name="property_injured_party" placeholder="Injured Party Name" value={formData.property_injured_party} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                    <input type="text" name="property_injury_desc" placeholder="Injury Details (Respiratory, Slip & fall)" value={formData.property_injury_desc} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                  </div>
                )}
              </div>
            </>
          )}

          {/* 6. IMMIGRATION APPLICATION MASK */}
          {moduleType === 'Immigration application' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Form Type:</label>
                <select name="form_type" value={formData.form_type} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-[#38bdf8] outline-none">
                  <option value="I-130" className="bg-[#1a2233] text-white">I-130 (Relative Petition)</option>
                  <option value="I-485" className="bg-[#1a2233] text-white">I-485 (Adjustment of Status)</option>
                  <option value="I-751" className="bg-[#1a2233] text-white">I-751 (Remove Conditions)</option>
                  <option value="I-589" className="bg-[#1a2233] text-white">I-589 (Asylum)</option>
                  <option value="I-129F" className="bg-[#1a2233] text-white">I-129F (Fiancé Petition)</option>
                  <option value="I-765" className="bg-[#1a2233] text-white">I-765 (Work Permit)</option>
                  <option value="N-400" className="bg-[#1a2233] text-white">N-400 (Naturalization)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Receipt No:</label>
                <input type="text" name="receipt_no" placeholder="MSC2190000000" value={formData.receipt_no} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
              </div>
            </div>
          )}

          {/* 7. EMPLOYMENT CLAIM MASK */}
          {moduleType === 'Employment claim' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="employer" placeholder="Employer Name" value={formData.employer} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                <select name="employment_claim_type" value={formData.employment_claim_type} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-[#38bdf8] outline-none">
                  <option value="Wrongful Termination" className="bg-[#1a2233] text-white">Wrongful Termination</option>
                  <option value="Retaliation" className="bg-[#1a2233] text-white">Retaliation</option>
                  <option value="Discrimination" className="bg-[#1a2233] text-white">Discrimination</option>
                  <option value="Harassment" className="bg-[#1a2233] text-white">Harassment</option>
                  <option value="Wage & Hour" className="bg-[#1a2233] text-white">Wage & Hour</option>
                  <option value="Whistleblower" className="bg-[#1a2233] text-white">Whistleblower</option>
                </select>
              </div>

              {/* Conditional Admin Charge */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-700 text-slate-300">Admin Charge Filed?</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setHasAdminCharge(false)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${!hasAdminCharge ? 'bg-slate-700 text-white' : 'bg-white/5 text-slate-400'}`}>No</button>
                    <button type="button" onClick={() => setHasAdminCharge(true)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${hasAdminCharge ? 'bg-[#0057c7] text-white' : 'bg-white/5 text-slate-400'}`}>Yes</button>
                  </div>
                </div>
                {hasAdminCharge && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/10 animate-fade-in">
                    <select name="admin_agency" value={formData.admin_agency} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs focus:border-[#38bdf8] outline-none">
                      <option value="EEOC" className="bg-[#1a2233] text-white">EEOC</option>
                      <option value="CRD" className="bg-[#1a2233] text-white">CRD</option>
                      <option value="Cal-OSHA" className="bg-[#1a2233] text-white">Cal-OSHA</option>
                      <option value="Labor Comm" className="bg-[#1a2233] text-white">Labor Comm</option>
                    </select>
                    <input type="text" name="admin_charge_no" placeholder="Charge #" value={formData.admin_charge_no} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none" />
                    <input type="date" name="right_to_sue_date" value={formData.right_to_sue_date} onChange={handleChange} className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs focus:border-[#38bdf8] outline-none" />
                  </div>
                )}
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-800 uppercase tracking-wider text-[#8a94a6] mb-1.5 block">Description / Facts:</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Enter specific facts or details..."
              value={formData.description}
              onChange={handleChange}
              className="w-full bg-[#0f172a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:border-[#38bdf8] outline-none resize-y"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold px-4 py-2.5 rounded-xl transition-all">Cancel</button>
            <button type="submit" className="bg-[#0057c7] hover:bg-[#004bb1] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#0057c7]/20">Attach Module</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
