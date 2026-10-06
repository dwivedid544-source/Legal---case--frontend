import React from 'react';

export default function VariableModuleCard({ module, onRemove }) {
  const type = module.module_type || 'Variable Module';
  const title = module.title || 'Attached Module';
  const payload = module.payload || {};

  const renderModuleBadgeDetails = () => {
    if (type === 'Vehicle') {
      return (
        <div className="text-[11px] text-[#38bdf8] font-mono mt-1 space-x-2">
          {payload.license_plate && <span>Plate: {payload.license_plate}</span>}
          {payload.vin && <span>VIN: {payload.vin}</span>}
          {payload.has_photos && <span className="text-emerald-400 font-bold">📷 {payload.photo_count || ''} Photos Available</span>}
        </div>
      );
    }
    if (type === 'Incident / accident') {
      return (
        <div className="text-[11px] text-amber-300 mt-1 space-x-2">
          {payload.incident_date && <span>Date: {payload.incident_date}</span>}
          {payload.location && <span>Location: {payload.location}</span>}
          {payload.has_police_report && <span className="text-emerald-400 font-bold">🚓 Police Report: #{payload.police_report_no || 'Yes'}</span>}
        </div>
      );
    }
    if (type === 'Property / premises') {
      return (
        <div className="text-[11px] text-[#38bdf8] mt-1 space-x-2">
          {payload.property_address && <span>{payload.property_address}</span>}
          {payload.issue_type && <span className="text-amber-400">Issue: {payload.issue_type}</span>}
          {payload.has_property_injury && <span className="text-rose-400 font-bold">⚠️ Injury: {payload.property_injured_party}</span>}
        </div>
      );
    }
    if (type === 'Employment claim') {
      return (
        <div className="text-[11px] text-indigo-300 mt-1 space-x-2">
          {payload.employer && <span>Employer: {payload.employer}</span>}
          {payload.employment_claim_type && <span>Claim: {payload.employment_claim_type}</span>}
          {payload.has_admin_charge && <span className="text-emerald-400 font-bold">🏛️ {payload.admin_agency} Charge #{payload.admin_charge_no}</span>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#38bdf8]/30 transition-all flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-900 bg-[#0057c7]/20 border border-[#0057c7]/30 text-[#38bdf8] px-2.5 py-1 rounded-full uppercase tracking-wider">
          {type}
        </span>
        <div>
          <h4 className="text-xs font-800 text-white">{title}</h4>
          {module.description && <p className="text-[11px] text-[#8a94a6] italic mt-0.5">"{module.description}"</p>}
          {renderModuleBadgeDetails()}
        </div>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(module)}
          title="Remove Module"
          className="w-6 h-6 rounded-full bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 flex items-center justify-center text-xs font-bold transition-all"
        >
          ✕
        </button>
      )}
    </div>
  );
}
