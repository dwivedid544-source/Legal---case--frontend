import React, { useState } from 'react';
import { formatUSPhone } from '../utils/phoneUtils';

export default function PartyListRow({ party, onRemove }) {
  const [showSensitive, setShowSensitive] = useState(false);

  if (!party) return null;

  const role = party.primary_party_role || party.party_role || 'Party';
  const name = party.full_name || party.company_name || 'Unnamed Party';
  const roleFields = party.role_fields || {};

  const sensitiveId = party.government_id || party.ssn || party.alien_number || roleFields.alien_number;

  const renderRoleSpecificFacts = () => {
    if (role === 'Witness' && roleFields.notes) {
      return <span className="text-[11px] text-slate-400 italic">Saw/Observed: "{roleFields.notes}"</span>;
    }
    if (role.includes('Insurance') || role.includes('carrier')) {
      return (
        <span className="text-[11px] text-emerald-400 font-mono">
          {roleFields.policy_no && `Pol #: ${roleFields.policy_no} | `}
          {roleFields.claim_no && `Claim #: ${roleFields.claim_no}`}
          {roleFields.coverage_side && ` (${roleFields.coverage_side})`}
        </span>
      );
    }
    if (role.includes('Medical')) {
      return (
        <span className="text-[11px] text-[#38bdf8]">
          {roleFields.specialty && `${roleFields.specialty} | `}
          {roleFields.records_requested && `Records: ${roleFields.records_requested} | `}
          {roleFields.billed_amount && `Billed: $${roleFields.billed_amount}`}
        </span>
      );
    }
    if (role === 'Attorney / counsel') {
      return (
        <span className="text-[11px] text-indigo-300">
          {roleFields.firm_name && `${roleFields.firm_name} | `}
          {roleFields.bar_no && `Bar #: ${roleFields.bar_no} | `}
          {roleFields.counsel_type && `${roleFields.counsel_type}`}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#38bdf8]/30 transition-all flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-900 bg-[#0057c7]/20 border border-[#0057c7]/30 text-[#38bdf8] px-2.5 py-1 rounded-full uppercase tracking-wider">
          {role}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-800 text-white">{name}</span>
            {party.phone && <span className="text-[11px] text-[#8a94a6]">📞 {formatUSPhone(party.phone)}</span>}
            {party.email && <span className="text-[11px] text-[#8a94a6]">✉️ {party.email}</span>}
          </div>
          <div className="mt-0.5">{renderRoleSpecificFacts()}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {sensitiveId && (
          <div className="text-[11px] text-amber-400 font-mono cursor-pointer bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20" onClick={() => setShowSensitive(!showSensitive)}>
            ID: {showSensitive ? sensitiveId : `••••-••••-${String(sensitiveId).slice(-4)}`}
            <span className="ml-1.5 underline text-amber-300 font-bold">
              {showSensitive ? 'Hide' : 'Reveal'}
            </span>
          </div>
        )}

        {!party.is_retaining_client && party.party_role !== 'Retaining Client' && (
          <button
            type="button"
            onClick={() => onRemove && onRemove(party)}
            title="Remove Party Link"
            className="w-6 h-6 rounded-full bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 flex items-center justify-center text-xs font-bold transition-all"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
