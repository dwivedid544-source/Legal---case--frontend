import React, { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet, useParams, useSearchParams } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import { VyniusAI } from './components/VyniusAI.jsx';
import { useToast, ToastContainer, Modal, Field, Input, Select, Textarea, DuplicateContactModal } from './components/UI.jsx';
import logoImg from './assets/WhatsApp Image 2026-04-13 at 11.01.36 AM-Photoroom.png';
import justiceBg from './assets/lady_justice_login_bg_1777101771752.png';
import api from './services/api';
import OutlookEventComposer from './components/OutlookEventComposer.jsx';
import EmailComposeModal from './components/EmailComposeModal.jsx';
import { formatPSTDate, formatPSTTime, formatPSTDateTime, linkifyContent, getPacificToday, pacificToUTC, PACIFIC_TIMEZONE } from './utils/dateUtils';

// Admin Pages
import { AdminDashboard, ClientsPage, ContactsPage, ClientDetailPage, CasesPage, CaseDetailPage, CalendarPage, DocumentsPage, BillingPage, EmailPage, AIPage, UsersPage, SettingsPage, IntegrationsPage, TemplateLibrary } from './pages/AdminPages.jsx';
import ActivitiesPage from './pages/ActivitiesPage.jsx';
import CourtFormsPage from './pages/CourtFormsPage.jsx';

// Lawyer Pages
import { LawyerDashboard, LawyerCasesPage, LawyerClientsPage, LawyerProfilePage } from './pages/LawyerPages.jsx';

// Lead & Marketing Pages
import { LeadDashboard, LeadDetailPage, ConflictCheckPage } from './pages/LeadPages.jsx';
import { MarketingDashboard, ReportsDashboard } from './pages/MarketingPages.jsx';

// Client Pages
import { ClientDashboard, ClientCasesPage, ClientDocumentsPage, ClientBillingPage, ClientMessagesPage, ClientProfilePage, ClientMatterDetailPage } from './pages/ClientPages.jsx';
import { PublicIntakePage } from './website/pages/WebsitePages.jsx';

import { SignDocument } from './components/SignDocument.jsx';

const CALIFORNIA_COUNTIES = [
  "Alameda", "Alpine", "Amador", "Butte", "Calaveras", "Colusa", "Contra Costa", "Del Norte", 
  "El Dorado", "Fresno", "Glenn", "Humboldt", "Imperial", "Inyo", "Kern", "Kings", "Lake", 
  "Lassen", "Los Angeles", "Madera", "Marin", "Mariposa", "Mendocino", "Merced", "Modoc", 
  "Mono", "Monterey", "Napa", "Nevada", "Orange", "Placer", "Plumas", "Riverside", "Sacramento", 
  "San Benito", "San Bernardino", "San Diego", "San Francisco", "San Joaquin", "San Luis Obispo", 
  "San Mateo", "Santa Barbara", "Santa Clara", "Santa Cruz", "Shasta", "Sierra", "Siskiyou", 
  "Solano", "Sonoma", "Stanislaus", "Sutter", "Tehama", "Trinity", "Tulare", "Tuolumne", 
  "Ventura", "Yolo", "Yuba"
];

const FEDERAL_COURTS = [
  "Central District of California",
  "Eastern District of California",
  "Northern District of California",
  "Southern District of California"
];

import TitanEmailModule from './pages/EmailModule/TitanEmailModule.jsx';
import { evaluateConditionRule, evaluateSectionRules, defaultMatterFormSections, practiceAreaConfigs, getPracticeAreaConfig, isSectionVisibleForPracticeArea, matterTypeConfigs, getMatterTypeConfig, getCombinedMatterConfig, isSectionVisibleForMatter, customFieldRegistry, getCustomFieldsForMatter, getCustomFieldsForParty, partyRoleFormConfigs, getPartyRoleFormConfig, formatUSPhone, serializeId, deserializeId } from './utils/adaptiveEngine.js';
import { WORLD_COUNTRIES } from './utils/countries.js';

// ─────────────────────────────────────────────────────────
//  CONFIDENTIAL IDENTITY FIELDS COMPONENT
// ─────────────────────────────────────────────────────────
function ConfidentialIdFields({ value, onChange }) {
  const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
  const COUNTRIES = WORLD_COUNTRIES;
  
  const [fields, setFields] = useState(() => deserializeId(value));

  useEffect(() => {
    setFields(deserializeId(value));
  }, [value]);

  const updateField = (key, val) => {
    const updated = { ...fields, [key]: val };
    setFields(updated);
    const serialized = serializeId(
      updated.ssn,
      updated.id_type,
      updated.id_number,
      updated.id_state,
      updated.id_country,
      updated.id_issue_date,
      updated.id_expiry_date
    );
    onChange(serialized);
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
      <div>
        <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Social Security Number (SSN) / Tax ID</label>
        <Input
          value={fields.ssn || ''}
          onChange={e => updateField('ssn', e.target.value)}
          placeholder="XXX-XX-XXXX"
        />
      </div>

      <div>
        <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-2">Secondary Government ID Type</label>
        <div className="flex flex-wrap gap-4">
          {[
            { value: 'none', label: 'None' },
            { value: 'drivers_license', label: "Driver's License" },
            { value: 'state_id', label: 'State ID' },
            { value: 'passport', label: 'Passport' }
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
              <input
                type="radio"
                name={`secondary_id_type_radio_${opt.value}`}
                value={opt.value}
                checked={fields.id_type === opt.value}
                onChange={() => updateField('id_type', opt.value)}
                className="accent-[#38bdf8]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {fields.id_type !== 'none' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-white/5 pt-3">
          <div>
            <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">
              {fields.id_type === 'passport' ? 'Passport Number' : fields.id_type === 'drivers_license' ? "Driver's License Number" : 'State ID Number'}
            </label>
            <Input
              value={fields.id_number || ''}
              onChange={e => updateField('id_number', e.target.value)}
              placeholder={fields.id_type === 'passport' ? 'Passport #' : 'ID / DL Number'}
            />
          </div>

          {(fields.id_type === 'drivers_license' || fields.id_type === 'state_id') && (
            <div>
              <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Issue State</label>
              <Select
                value={fields.id_state || ''}
                onChange={e => updateField('id_state', e.target.value)}
              >
                <option value="">Select State</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          )}

          {fields.id_type === 'passport' && (
            <>
              <div>
                <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Issuing Country</label>
                <Select
                  value={fields.id_country || ''}
                  onChange={e => updateField('id_country', e.target.value)}
                >
                  <option value="">Select Country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Issue Date</label>
                <Input
                  type="date"
                  value={fields.id_issue_date || ''}
                  onChange={e => updateField('id_issue_date', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Expiration Date</label>
                <Input
                  type="date"
                  value={fields.id_expiry_date || ''}
                  onChange={e => updateField('id_expiry_date', e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  MODULAR ROLE FORM ENGINE (RoleRenderer)
// ─────────────────────────────────────────────────────────

function DriverForm({ tempParty, setTempParty, vehiclesList }) {
  const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
  const lbl = "text-[9px] font-bold text-[#8a94a6] block mb-1";
  const inp = "w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8] transition-colors";

  const isExpired = Boolean(tempParty.license_expiry && new Date(tempParty.license_expiry) < new Date());

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-500/10 to-purple-950/20 border border-purple-500/30 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🚗</span>
          <div>
            <h5 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Driver Profile & License Details</h5>
            <p className="text-[10px] text-slate-400">Single Source of Truth (role_data.Driver) — Vehicle Synchronized</p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">DRIVER ROLE</span>
      </div>

      {/* License & Expiry */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">🪪 License Information</p>
          {isExpired && <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">⚠️ LICENSE EXPIRED</span>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className={lbl}>License Number *</label>
            <input
              type="text"
              value={tempParty.license_number || ''}
              onChange={e => setTempParty(p => ({ ...p, license_number: e.target.value.toUpperCase() }))}
              placeholder="DL-9876543"
              className={`${inp} font-mono uppercase`}
            />
          </div>
          <div>
            <label className={lbl}>License State</label>
            <select
              value={tempParty.license_state || ''}
              onChange={e => setTempParty(p => ({ ...p, license_state: e.target.value }))}
              className={inp}
            >
              <option value="">Select State</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>License Class</label>
            <input
              type="text"
              value={tempParty.license_class || ''}
              onChange={e => setTempParty(p => ({ ...p, license_class: e.target.value }))}
              placeholder="Class C"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>License Expiry</label>
            <input
              type="date"
              value={tempParty.license_expiry || ''}
              onChange={e => setTempParty(p => ({ ...p, license_expiry: e.target.value }))}
              className={`${inp} ${isExpired ? 'border-rose-500/50 text-rose-300' : ''}`}
            />
          </div>
        </div>

        {/* CDL Toggle */}
        <div className="flex items-center gap-3 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(tempParty.is_commercial_driver)}
              onChange={e => setTempParty(p => ({ ...p, is_commercial_driver: e.target.checked }))}
              className="rounded bg-white/10 border-white/20 text-purple-500 focus:ring-0"
            />
            <span className="text-xs font-semibold text-white">Commercial Driver (CDL)</span>
          </label>
          {tempParty.is_commercial_driver && (
            <input
              type="text"
              value={tempParty.cdl_number || ''}
              onChange={e => setTempParty(p => ({ ...p, cdl_number: e.target.value.toUpperCase() }))}
              placeholder="CDL Number..."
              className={`${inp} font-mono uppercase max-w-[200px]`}
            />
          )}
        </div>
      </div>

      {/* Experience, Employer & Vehicle Mapping */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">💼 Employment & Vehicle Assignment</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Employer Name</label>
            <input
              type="text"
              value={tempParty.employer || ''}
              onChange={e => setTempParty(p => ({ ...p, employer: e.target.value }))}
              placeholder="E.g., City Logistics"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Driving Experience (Years)</label>
            <input
              type="number"
              min="0"
              max="70"
              value={tempParty.years_experience || ''}
              onChange={e => setTempParty(p => ({ ...p, years_experience: e.target.value }))}
              placeholder="E.g., 8"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Assigned Vehicle</label>
            <select
              value={tempParty.assigned_vehicle_id || ''}
              onChange={e => setTempParty(p => ({ ...p, assigned_vehicle_id: e.target.value }))}
              className={inp}
            >
              <option value="">None / Unassigned</option>
              {vehiclesList.map(v => (
                <option key={v.vehicle_id || v.id} value={v.vehicle_id || v.id}>
                  {v.year} {v.make} {v.model} {v.license_plate ? `(${v.license_plate})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Incident Tests & Citations */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">⚠️ Incident & Testing Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Seatbelt Used</label>
            <select
              value={tempParty.seatbelt_used || 'Unknown'}
              onChange={e => setTempParty(p => ({ ...p, seatbelt_used: e.target.value }))}
              className={inp}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Alcohol Test Result</label>
            <select
              value={tempParty.alcohol_test || 'Not Tested'}
              onChange={e => setTempParty(p => ({ ...p, alcohol_test: e.target.value }))}
              className={inp}
            >
              <option value="Not Tested">Not Tested</option>
              <option value="Negative">Negative</option>
              <option value="Positive">Positive</option>
              <option value="Refused">Refused</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Drug Test Result</label>
            <select
              value={tempParty.drug_test || 'Not Tested'}
              onChange={e => setTempParty(p => ({ ...p, drug_test: e.target.value }))}
              className={inp}
            >
              <option value="Not Tested">Not Tested</option>
              <option value="Negative">Negative</option>
              <option value="Positive">Positive</option>
              <option value="Refused">Refused</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(tempParty.citation_issued)}
              onChange={e => setTempParty(p => ({ ...p, citation_issued: e.target.checked }))}
              className="rounded bg-white/10 border-white/20 text-rose-500 focus:ring-0"
            />
            <span className="text-xs font-semibold text-rose-300">Traffic Citation Issued</span>
          </label>
          {tempParty.citation_issued && (
            <input
              type="text"
              value={tempParty.citation_number || ''}
              onChange={e => setTempParty(p => ({ ...p, citation_number: e.target.value }))}
              placeholder="Citation / Ticket #..."
              className={`${inp} max-w-[200px]`}
            />
          )}
        </div>
      </div>

      {/* Injury & Hospital */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">🩹 Injury & Medical Status</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Driver Injury Status</label>
            <select
              value={tempParty.injury_status || 'Uninjured'}
              onChange={e => setTempParty(p => ({ ...p, injury_status: e.target.value }))}
              className={inp}
            >
              <option value="Uninjured">Uninjured</option>
              <option value="Minor Injury">Minor Injury</option>
              <option value="Severe Injury">Severe Injury</option>
              <option value="Fatal">Fatal</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Hospital / Facility</label>
            <input
              type="text"
              value={tempParty.hospital || ''}
              onChange={e => setTempParty(p => ({ ...p, hospital: e.target.value }))}
              placeholder="Hospital name..."
              className={inp}
            />
          </div>
        </div>
        <div>
          <label className={lbl}>Medical / Treatment Notes</label>
          <textarea
            rows={2}
            value={tempParty.medical_notes || ''}
            onChange={e => setTempParty(p => ({ ...p, medical_notes: e.target.value }))}
            placeholder="Driver injury & medical details..."
            className={inp}
          />
        </div>
      </div>
    </div>
  );
}

function PassengerForm({ tempParty, setTempParty, vehiclesList, partiesList }) {
  const SEAT_POSITIONS = ['Front Left', 'Front Right', 'Rear Left', 'Rear Center', 'Rear Right', 'Third Row', 'Other'];
  const TRANSPORT_MODES = ['EMS', 'Private Vehicle', 'Walked Away', 'Air Ambulance', 'Unknown'];
  const driverParties = Array.isArray(partiesList) ? partiesList.filter(p => (p.party_roles || [p.party_role]).includes('Driver')) : [];
  const lbl = "text-[9px] font-bold text-[#8a94a6] block mb-1";
  const inp = "w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8] transition-colors";

  const isInjured = tempParty.injury_status && tempParty.injury_status !== 'None' && tempParty.injury_status !== 'Uninjured';

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-b from-sky-500/10 to-sky-950/20 border border-sky-500/30 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🧍</span>
          <div>
            <h5 className="text-xs font-bold text-sky-300 uppercase tracking-wider">Passenger Profile & Assignment</h5>
            <p className="text-[10px] text-slate-400">Single Source of Truth (role_data.Passenger) — Vehicle & Driver Synchronized</p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase">PASSENGER ROLE</span>
      </div>

      {/* 1. Vehicle & Driver Assignment */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">🚗 Vehicle & Driver Assignment</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Assigned Vehicle</label>
            <select
              value={tempParty.assigned_vehicle_id || ''}
              onChange={e => setTempParty(p => ({ ...p, assigned_vehicle_id: e.target.value }))}
              className={inp}
            >
              <option value="">None / Unassigned</option>
              {vehiclesList.map(v => (
                <option key={v.vehicle_id || v.id} value={v.vehicle_id || v.id}>
                  {v.year} {v.make} {v.model} {v.license_plate ? `(${v.license_plate})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Assigned Driver</label>
            <select
              value={tempParty.assigned_driver_party_id || ''}
              onChange={e => setTempParty(p => ({ ...p, assigned_driver_party_id: e.target.value }))}
              className={inp}
            >
              <option value="">None / Unassigned Driver</option>
              {driverParties.map(d => (
                <option key={d.id} value={d.id}>
                  🏎️ {d.full_name || d.company_name} {d.role_data?.Driver?.license_number ? `(DL: ${d.role_data.Driver.license_number})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Seat & Restraint Information */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">💺 Seating & Restraint Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Seat Position</label>
            <select
              value={tempParty.seat_position || 'Front Right'}
              onChange={e => setTempParty(p => ({ ...p, seat_position: e.target.value }))}
              className={inp}
            >
              {SEAT_POSITIONS.map(sp => <option key={sp} value={sp}>{sp}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Seatbelt Fastened</label>
            <select
              value={tempParty.seatbelt_used || 'Unknown'}
              onChange={e => setTempParty(p => ({ ...p, seatbelt_used: e.target.value }))}
              className={inp}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Airbag Deployed</label>
            <select
              value={tempParty.airbag_deployed || 'Unknown'}
              onChange={e => setTempParty(p => ({ ...p, airbag_deployed: e.target.value }))}
              className={inp}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Medical & Injury Details */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">🩹 Medical & Treatment Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Injury Status</label>
            <select
              value={tempParty.injury_status || 'None'}
              onChange={e => setTempParty(p => ({ ...p, injury_status: e.target.value }))}
              className={`${inp} ${isInjured ? 'border-rose-500/50 text-rose-300' : ''}`}
            >
              <option value="None">None / Uninjured</option>
              <option value="Minor">Minor Injury</option>
              <option value="Moderate">Moderate Injury</option>
              <option value="Severe">Severe Injury</option>
              <option value="Fatal">Fatal</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Hospital Name {isInjured && <span className="text-amber-400">*</span>}</label>
            <input
              type="text"
              value={tempParty.hospital || ''}
              onChange={e => setTempParty(p => ({ ...p, hospital: e.target.value }))}
              placeholder="E.g., St. Jude Memorial Hospital"
              className={`${inp} ${isInjured && !tempParty.hospital ? 'border-amber-500/50' : ''}`}
            />
          </div>
          <div>
            <label className={lbl}>Transported By</label>
            <select
              value={tempParty.transported_by || 'Unknown'}
              onChange={e => setTempParty(p => ({ ...p, transported_by: e.target.value }))}
              className={inp}
            >
              {TRANSPORT_MODES.map(tm => <option key={tm} value={tm}>{tm}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Hospital Address</label>
            <input
              type="text"
              value={tempParty.hospital_address || ''}
              onChange={e => setTempParty(p => ({ ...p, hospital_address: e.target.value }))}
              placeholder="Hospital street, city..."
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Medical / Treatment Notes</label>
            <textarea
              rows={1}
              value={tempParty.medical_notes || ''}
              onChange={e => setTempParty(p => ({ ...p, medical_notes: e.target.value }))}
              placeholder="Injury summary & treatment notes..."
              className={inp}
            />
          </div>
        </div>
      </div>

      {/* 4. Insurance Information */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">🛡️ Insurance & Claim Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Insurance Company</label>
            <input
              type="text"
              value={tempParty.insurance_company || ''}
              onChange={e => setTempParty(p => ({ ...p, insurance_company: e.target.value }))}
              placeholder="E.g., Progressive"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Policy Number</label>
            <input
              type="text"
              value={tempParty.policy_number || ''}
              onChange={e => setTempParty(p => ({ ...p, policy_number: e.target.value }))}
              placeholder="POL-998877"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Claim Number</label>
            <input
              type="text"
              value={tempParty.claim_number || ''}
              onChange={e => setTempParty(p => ({ ...p, claim_number: e.target.value }))}
              placeholder="CLM-554433"
              className={inp}
            />
          </div>
        </div>
      </div>

      {/* 5. Emergency Contact */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">📞 Emergency Contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Contact Name</label>
            <input
              type="text"
              value={tempParty.emergency_contact_name || ''}
              onChange={e => setTempParty(p => ({ ...p, emergency_contact_name: e.target.value }))}
              placeholder="Contact full name"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Contact Phone</label>
            <input
              type="tel"
              value={tempParty.emergency_contact_phone || ''}
              onChange={e => setTempParty(p => ({ ...p, emergency_contact_phone: formatUSPhone(e.target.value) }))}
              placeholder="+1 (555) 000-0000"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Relationship</label>
            <input
              type="text"
              value={tempParty.relationship || ''}
              onChange={e => setTempParty(p => ({ ...p, relationship: e.target.value }))}
              placeholder="Spouse / Parent / Sibling"
              className={inp}
            />
          </div>
        </div>
      </div>

      {/* 6. Passenger Notes */}
      <div>
        <label className={lbl}>Passenger Specific Notes</label>
        <textarea
          rows={2}
          value={tempParty.passenger_notes || ''}
          onChange={e => setTempParty(p => ({ ...p, passenger_notes: e.target.value }))}
          placeholder="Passenger statement or general notes..."
          className={inp}
        />
      </div>
    </div>
  );
}

function WitnessForm({ tempParty, setTempParty }) {
  const lbl = "text-[9px] font-bold text-[#8a94a6] block mb-1";
  const inp = "w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8] transition-colors";

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/10 to-amber-950/20 border border-amber-500/30 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">👁️</span>
          <div>
            <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Witness Profile & Assignment</h5>
            <p className="text-[10px] text-slate-400">Single Source of Truth (role_data.Witness)</p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">WITNESS ROLE</span>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">📋 Statement & Observations</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Witness Type</label>
            <select value={tempParty.witness_type || 'Bystander'} onChange={e => setTempParty(p => ({ ...p, witness_type: e.target.value }))} className={inp}>
              <option value="Bystander">Bystander</option>
              <option value="Passenger">Passenger</option>
              <option value="Driver">Driver</option>
              <option value="First Responder">First Responder</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Statement Obtained?</label>
            <select value={tempParty.statement_status || 'Pending'} onChange={e => setTempParty(p => ({ ...p, statement_status: e.target.value }))} className={inp}>
              <option value="Pending">Pending</option>
              <option value="Written Statement">Written Statement</option>
              <option value="Recorded Audio">Recorded Audio</option>
              <option value="Deposition">Deposition Completed</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Vantage Point / Location</label>
            <input type="text" value={tempParty.vantage_point || ''} onChange={e => setTempParty(p => ({ ...p, vantage_point: e.target.value }))} placeholder="E.g., Southwest Corner" className={inp} />
          </div>
          <div>
            <label className={lbl}>Statement Date</label>
            <input type="date" value={tempParty.statement_date || ''} onChange={e => setTempParty(p => ({ ...p, statement_date: e.target.value }))} className={inp} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Credibility / Reliability</label>
            <select value={tempParty.reliability || 'Unknown'} onChange={e => setTempParty(p => ({ ...p, reliability: e.target.value }))} className={inp}>
              <option value="Unknown">Unknown</option>
              <option value="Highly Credible">Highly Credible</option>
              <option value="Questionable">Questionable</option>
              <option value="Unreliable">Unreliable</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Relationship to Parties</label>
            <input type="text" value={tempParty.relationship_to_parties || ''} onChange={e => setTempParty(p => ({ ...p, relationship_to_parties: e.target.value }))} placeholder="E.g., None, Friend of Plaintiff" className={inp} />
          </div>
        </div>
      </div>

      <div>
        <label className={lbl}>Witness Notes / Observations</label>
        <textarea
          rows={2}
          value={tempParty.witness_notes || ''}
          onChange={e => setTempParty(p => ({ ...p, witness_notes: e.target.value }))}
          placeholder="Detailed witness observations..."
          className={inp}
        />
      </div>
    </div>
  );
}

function InsuranceForm({ tempParty, setTempParty }) {
  const lbl = "text-[9px] font-bold text-[#8a94a6] block mb-1";
  const inp = "w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8] transition-colors";

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-emerald-950/20 border border-emerald-500/30 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🛡️</span>
          <div>
            <h5 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Insurance Profile & Assignment</h5>
            <p className="text-[10px] text-slate-400">Single Source of Truth (role_data.Insurance)</p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">INSURANCE ROLE</span>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">🏢 Insurance Company</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Company Name <span className="text-red-400">*</span></label>
            <input type="text" value={tempParty.company_name || ''} onChange={e => setTempParty(p => ({ ...p, company_name: e.target.value }))} placeholder="E.g., GEICO, State Farm" className={inp} />
          </div>
          <div>
            <label className={lbl}>Insurance Type</label>
            <select value={tempParty.insurance_type || 'Liability'} onChange={e => setTempParty(p => ({ ...p, insurance_type: e.target.value }))} className={inp}>
              <option value="Liability">Liability</option>
              <option value="Collision">Collision</option>
              <option value="Comprehensive">Comprehensive</option>
              <option value="Medical Payments">Medical Payments</option>
              <option value="Personal Injury Protection">Personal Injury Protection (PIP)</option>
              <option value="Workers Compensation">Workers Compensation</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Policy Holder</label>
            <input type="text" value={tempParty.policy_holder || ''} onChange={e => setTempParty(p => ({ ...p, policy_holder: e.target.value }))} placeholder="Name of Insured" className={inp} />
          </div>
          <div>
            <label className={lbl}>Policy Number <span className="text-red-400">*</span></label>
            <input type="text" value={tempParty.policy_number || ''} onChange={e => setTempParty(p => ({ ...p, policy_number: e.target.value }))} className={inp} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">📝 Claim Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Claim Number <span className="text-red-400">*</span></label>
            <input type="text" value={tempParty.claim_number || ''} onChange={e => setTempParty(p => ({ ...p, claim_number: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Claim Status</label>
            <select value={tempParty.claim_status || 'Open'} onChange={e => setTempParty(p => ({ ...p, claim_status: e.target.value }))} className={inp}>
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Approved">Approved</option>
              <option value="Denied">Denied</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Claim Date</label>
            <input type="date" value={tempParty.claim_date || ''} onChange={e => setTempParty(p => ({ ...p, claim_date: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Claim Amount</label>
            <input type="number" step="0.01" value={tempParty.claim_amount || ''} onChange={e => setTempParty(p => ({ ...p, claim_amount: e.target.value }))} placeholder="$0.00" className={inp} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">👤 Adjuster</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Adjuster Name</label>
            <input type="text" value={tempParty.adjuster_name || ''} onChange={e => setTempParty(p => ({ ...p, adjuster_name: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Phone</label>
            <input type="text" value={tempParty.adjuster_phone || ''} onChange={e => setTempParty(p => ({ ...p, adjuster_phone: formatUSPhone(e.target.value) }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" value={tempParty.adjuster_email || ''} onChange={e => setTempParty(p => ({ ...p, adjuster_email: e.target.value }))} className={inp} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">💰 Coverage & Settlement</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <label className={lbl}>Coverage Limit</label>
            <input type="number" step="0.01" value={tempParty.coverage_limit || ''} onChange={e => setTempParty(p => ({ ...p, coverage_limit: e.target.value }))} placeholder="$0.00" className={inp} />
          </div>
          <div>
            <label className={lbl}>Deductible</label>
            <input type="number" step="0.01" value={tempParty.deductible || ''} onChange={e => setTempParty(p => ({ ...p, deductible: e.target.value }))} placeholder="$0.00" className={inp} />
          </div>
          <div>
            <label className={lbl}>Settlement Offer</label>
            <input type="number" step="0.01" value={tempParty.settlement_offer || ''} onChange={e => setTempParty(p => ({ ...p, settlement_offer: e.target.value }))} placeholder="$0.00" className={inp} />
          </div>
          <div>
            <label className={lbl}>Payment Received?</label>
            <select value={tempParty.payment_received || 'No'} onChange={e => setTempParty(p => ({ ...p, payment_received: e.target.value }))} className={inp}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
        </div>
        {tempParty.payment_received && tempParty.payment_received !== 'No' && (
          <div>
            <label className={lbl}>Payment Date</label>
            <input type="date" value={tempParty.payment_date || ''} onChange={e => setTempParty(p => ({ ...p, payment_date: e.target.value }))} className={inp} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">🔗 Assignments</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Assigned Vehicle ID</label>
            <input type="text" value={tempParty.assigned_vehicle_id || ''} onChange={e => setTempParty(p => ({ ...p, assigned_vehicle_id: e.target.value }))} placeholder="Vehicle ID if applicable" className={inp} />
          </div>
          <div>
            <label className={lbl}>Assigned Driver Party ID</label>
            <input type="text" value={tempParty.assigned_driver_party_id || ''} onChange={e => setTempParty(p => ({ ...p, assigned_driver_party_id: e.target.value }))} placeholder="Driver ID if applicable" className={inp} />
          </div>
        </div>
      </div>

      <div>
        <label className={lbl}>Insurance Notes</label>
        <textarea value={tempParty.insurance_notes || ''} onChange={e => setTempParty(p => ({ ...p, insurance_notes: e.target.value }))} rows={2} className={`${inp} resize-none`} placeholder="Any additional notes about this policy/claim..."></textarea>
      </div>
    </div>
  );
}

function MedicalProviderForm({ tempParty, setTempParty }) {
  const lbl = "text-[9px] font-bold text-[#8a94a6] block mb-1";
  const inp = "w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8] transition-colors";

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-b from-rose-500/10 to-rose-950/20 border border-rose-500/30 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🏥</span>
          <div>
            <h5 className="text-xs font-bold text-rose-300 uppercase tracking-wider">Medical Provider & Treatment</h5>
            <p className="text-[10px] text-slate-400">Single Source of Truth (role_data.MedicalProvider)</p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">MEDICAL PROVIDER ROLE</span>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">🏥 Provider Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Provider Name <span className="text-red-400">*</span></label>
            <input type="text" value={tempParty.provider_name || tempParty.full_name || ''} onChange={e => setTempParty(p => ({ ...p, provider_name: e.target.value, full_name: e.target.value }))} placeholder="Dr. John Smith / General Hospital" className={inp} />
          </div>
          <div>
            <label className={lbl}>Provider Type <span className="text-red-400">*</span></label>
            <select value={tempParty.provider_type || 'Doctor'} onChange={e => setTempParty(p => ({ ...p, provider_type: e.target.value }))} className={inp}>
              <option value="Hospital">Hospital</option>
              <option value="Doctor">Doctor</option>
              <option value="Clinic">Clinic</option>
              <option value="Urgent Care">Urgent Care</option>
              <option value="Physical Therapy">Physical Therapy</option>
              <option value="Chiropractor">Chiropractor</option>
              <option value="Radiology">Radiology</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Specialist">Specialist</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Facility Name</label>
            <input type="text" value={tempParty.facility_name || tempParty.company_name || ''} onChange={e => setTempParty(p => ({ ...p, facility_name: e.target.value }))} placeholder="City Medical Center" className={inp} />
          </div>
          <div>
            <label className={lbl}>Specialization</label>
            <input type="text" value={tempParty.specialization || ''} onChange={e => setTempParty(p => ({ ...p, specialization: e.target.value }))} placeholder="Orthopedic Surgery" className={inp} />
          </div>
          <div>
            <label className={lbl}>License Number</label>
            <input type="text" value={tempParty.license_number || ''} onChange={e => setTempParty(p => ({ ...p, license_number: e.target.value }))} className={inp} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">📞 Contact & Location</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Phone</label>
            <input type="text" value={tempParty.phone || ''} onChange={e => setTempParty(p => ({ ...p, phone: formatUSPhone(e.target.value) }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" value={tempParty.email || ''} onChange={e => setTempParty(p => ({ ...p, email: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Contact Person</label>
            <input type="text" value={tempParty.contact_person || ''} onChange={e => setTempParty(p => ({ ...p, contact_person: e.target.value }))} className={inp} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div className="sm:col-span-2">
            <label className={lbl}>Address</label>
            <input type="text" value={tempParty.address || ''} onChange={e => setTempParty(p => ({ ...p, address: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>City / State</label>
            <input type="text" value={tempParty.city || ''} onChange={e => setTempParty(p => ({ ...p, city: e.target.value }))} placeholder="City, State" className={inp} />
          </div>
          <div>
            <label className={lbl}>Zip Code</label>
            <input type="text" value={tempParty.zip_code || ''} onChange={e => setTempParty(p => ({ ...p, zip_code: e.target.value }))} className={inp} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">🩺 Patient & Assignments</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Patient Name</label>
            <input type="text" value={tempParty.patient_name || ''} onChange={e => setTempParty(p => ({ ...p, patient_name: e.target.value }))} placeholder="Patient Full Name" className={inp} />
          </div>
          <div>
            <label className={lbl}>Assigned Driver Party ID</label>
            <input type="text" value={tempParty.assigned_driver_party_id || ''} onChange={e => setTempParty(p => ({ ...p, assigned_driver_party_id: e.target.value }))} placeholder="Driver Party ID" className={inp} />
          </div>
          <div>
            <label className={lbl}>Assigned Passenger Party ID</label>
            <input type="text" value={tempParty.assigned_passenger_party_id || ''} onChange={e => setTempParty(p => ({ ...p, assigned_passenger_party_id: e.target.value }))} placeholder="Passenger Party ID" className={inp} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">📋 Treatment Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Diagnosis</label>
            <input type="text" value={tempParty.diagnosis || ''} onChange={e => setTempParty(p => ({ ...p, diagnosis: e.target.value }))} placeholder="E.g., Cervical Strain, Fracture" className={inp} />
          </div>
          <div>
            <label className={lbl}>Treatment Status</label>
            <select value={tempParty.treatment_status || 'Active'} onChange={e => setTempParty(p => ({ ...p, treatment_status: e.target.value }))} className={inp}>
              <option value="Scheduled">Scheduled</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <label className={lbl}>First Visit Date</label>
            <input type="date" value={tempParty.date_of_first_visit || ''} onChange={e => setTempParty(p => ({ ...p, date_of_first_visit: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Last Visit Date</label>
            <input type="date" value={tempParty.date_of_last_visit || ''} onChange={e => setTempParty(p => ({ ...p, date_of_last_visit: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Follow Up Required?</label>
            <select value={tempParty.follow_up_required || 'No'} onChange={e => setTempParty(p => ({ ...p, follow_up_required: e.target.value }))} className={inp}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Follow Up Date</label>
            <input type="date" value={tempParty.follow_up_date || ''} onChange={e => setTempParty(p => ({ ...p, follow_up_date: e.target.value }))} className={inp} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">💰 Financial & Billing</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <label className={lbl}>Estimated Cost ($)</label>
            <input type="number" step="0.01" value={tempParty.estimated_medical_cost || ''} onChange={e => {
              const est = parseFloat(e.target.value) || 0;
              const paid = parseFloat(tempParty.paid_amount) || 0;
              setTempParty(p => ({ ...p, estimated_medical_cost: e.target.value, balance_amount: (est - paid).toFixed(2) }));
            }} placeholder="0.00" className={inp} />
          </div>
          <div>
            <label className={lbl}>Paid Amount ($)</label>
            <input type="number" step="0.01" value={tempParty.paid_amount || ''} onChange={e => {
              const paid = parseFloat(e.target.value) || 0;
              const est = parseFloat(tempParty.estimated_medical_cost) || 0;
              setTempParty(p => ({ ...p, paid_amount: e.target.value, balance_amount: (est - paid).toFixed(2) }));
            }} placeholder="0.00" className={inp} />
          </div>
          <div>
            <label className={lbl}>Outstanding Balance ($)</label>
            <input type="number" step="0.01" value={tempParty.balance_amount || ''} readOnly className={`${inp} opacity-75 cursor-not-allowed`} />
          </div>
          <div>
            <label className={lbl}>Insurance Claim #</label>
            <input type="text" value={tempParty.insurance_claim_number || ''} onChange={e => setTempParty(p => ({ ...p, insurance_claim_number: e.target.value }))} className={inp} />
          </div>
        </div>
      </div>

      <div>
        <label className={lbl}>Medical Notes</label>
        <textarea value={tempParty.medical_notes || ''} onChange={e => setTempParty(p => ({ ...p, medical_notes: e.target.value }))} rows={2} className={`${inp} resize-none`} placeholder="Additional treatment or medical notes..."></textarea>
      </div>
    </div>
  );
}

function EmployerForm({ tempParty, setTempParty }) {
  const lbl = "text-[9px] font-bold text-[#8a94a6] block mb-1";
  const inp = "w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8] transition-colors";

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-500/10 to-blue-950/20 border border-blue-500/30 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🏢</span>
          <div>
            <h5 className="text-xs font-bold text-blue-300 uppercase tracking-wider">Employer & Employment Profile</h5>
            <p className="text-[10px] text-slate-400">Single Source of Truth (role_data.Employer)</p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">EMPLOYER ROLE</span>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">🏢 Employer Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Employer Name <span className="text-red-400">*</span></label>
            <input type="text" value={tempParty.employer_name || tempParty.company_name || tempParty.full_name || ''} onChange={e => setTempParty(p => ({ ...p, employer_name: e.target.value, company_name: e.target.value }))} placeholder="Acme Corp / Employer" className={inp} />
          </div>
          <div>
            <label className={lbl}>Employer Type</label>
            <select value={tempParty.employer_type || 'Corporation'} onChange={e => setTempParty(p => ({ ...p, employer_type: e.target.value }))} className={inp}>
              <option value="Corporation">Corporation</option>
              <option value="Small Business">Small Business</option>
              <option value="Government">Government</option>
              <option value="Non-Profit">Non-Profit</option>
              <option value="Educational">Educational</option>
              <option value="Sole Proprietorship">Sole Proprietorship</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Occupation</label>
            <input type="text" value={tempParty.occupation || ''} onChange={e => setTempParty(p => ({ ...p, occupation: e.target.value }))} placeholder="Software Engineer / Driver" className={inp} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">💼 Employment Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <label className={lbl}>Employment Status <span className="text-red-400">*</span></label>
            <select value={tempParty.employment_status || 'Full Time'} onChange={e => setTempParty(p => ({ ...p, employment_status: e.target.value }))} className={inp}>
              <option value="Full Time">Full Time</option>
              <option value="Part Time">Part Time</option>
              <option value="Self Employed">Self Employed</option>
              <option value="Unemployed">Unemployed</option>
              <option value="Retired">Retired</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Date Hired</label>
            <input type="date" value={tempParty.date_hired || ''} onChange={e => setTempParty(p => ({ ...p, date_hired: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Last Working Date</label>
            <input type="date" value={tempParty.last_working_date || ''} onChange={e => setTempParty(p => ({ ...p, last_working_date: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Currently Working?</label>
            <select value={tempParty.currently_working || 'Yes'} onChange={e => setTempParty(p => ({ ...p, currently_working: e.target.value }))} className={inp}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">📞 Contact & Location</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Phone</label>
            <input type="text" value={tempParty.employer_phone || tempParty.phone || ''} onChange={e => setTempParty(p => ({ ...p, employer_phone: formatUSPhone(e.target.value), phone: formatUSPhone(e.target.value) }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" value={tempParty.employer_email || tempParty.email || ''} onChange={e => setTempParty(p => ({ ...p, employer_email: e.target.value, email: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Supervisor Name</label>
            <input type="text" value={tempParty.supervisor_name || ''} onChange={e => setTempParty(p => ({ ...p, supervisor_name: e.target.value }))} className={inp} />
          </div>
        </div>
        <div>
          <label className={lbl}>Employer Address</label>
          <input type="text" value={tempParty.employer_address || tempParty.address || ''} onChange={e => setTempParty(p => ({ ...p, employer_address: e.target.value, address: e.target.value }))} className={inp} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">⚠️ Work Restrictions & Return</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Work Restrictions?</label>
            <select value={tempParty.work_restrictions || 'No'} onChange={e => setTempParty(p => ({ ...p, work_restrictions: e.target.value }))} className={inp}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Return To Work Date</label>
            <input type="date" value={tempParty.return_to_work_date || ''} onChange={e => setTempParty(p => ({ ...p, return_to_work_date: e.target.value }))} className={inp} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">💵 Lost Wages</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Lost Wages ($)</label>
            <input type="number" step="0.01" value={tempParty.lost_wages || ''} onChange={e => setTempParty(p => ({ ...p, lost_wages: e.target.value }))} placeholder="0.00" className={inp} />
          </div>
          <div>
            <label className={lbl}>Lost Wage Notes</label>
            <input type="text" value={tempParty.lost_wage_notes || ''} onChange={e => setTempParty(p => ({ ...p, lost_wage_notes: e.target.value }))} placeholder="Notes on calculation or missed days" className={inp} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">🔗 Assignments & Notes</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Assigned Driver Party ID</label>
            <input type="text" value={tempParty.assigned_driver_party_id || ''} onChange={e => setTempParty(p => ({ ...p, assigned_driver_party_id: e.target.value }))} placeholder="Driver Party ID if applicable" className={inp} />
          </div>
          <div>
            <label className={lbl}>Assigned Passenger Party ID</label>
            <input type="text" value={tempParty.assigned_passenger_party_id || ''} onChange={e => setTempParty(p => ({ ...p, assigned_passenger_party_id: e.target.value }))} placeholder="Passenger Party ID if applicable" className={inp} />
          </div>
        </div>
        <div>
          <label className={lbl}>Employer Notes</label>
          <textarea value={tempParty.employer_notes || ''} onChange={e => setTempParty(p => ({ ...p, employer_notes: e.target.value }))} rows={2} className={`${inp} resize-none`} placeholder="Additional employment notes..."></textarea>
        </div>
      </div>
    </div>
  );
}

function PropertyDamageForm({ tempParty, setTempParty, vehiclesList }) {
  const lbl = "text-[9px] font-bold text-[#8a94a6] block mb-1";
  const inp = "w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8] transition-colors";

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-b from-orange-500/10 to-orange-950/20 border border-orange-500/30 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-orange-500/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🏚️</span>
          <div>
            <h5 className="text-xs font-bold text-orange-300 uppercase tracking-wider">Property Damage Profile</h5>
            <p className="text-[10px] text-slate-400">Single Source of Truth (role_data.PropertyDamage)</p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase">PROPERTY DAMAGE ROLE</span>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">🏚️ Property Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Property Type <span className="text-red-400">*</span></label>
            <select value={tempParty.property_type || 'Vehicle'} onChange={e => setTempParty(p => ({ ...p, property_type: e.target.value }))} className={inp}>
              <option value="Vehicle">Vehicle</option>
              <option value="Building">Building</option>
              <option value="Fence">Fence</option>
              <option value="Road Sign">Road Sign</option>
              <option value="Utility Pole">Utility Pole</option>
              <option value="Personal Property">Personal Property</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Owner Name <span className="text-red-400">*</span></label>
            <input type="text" value={tempParty.owner_name || tempParty.full_name || ''} onChange={e => setTempParty(p => ({ ...p, owner_name: e.target.value, full_name: e.target.value }))} placeholder="Property Owner Name" className={inp} />
          </div>
          <div>
            <label className={lbl}>Owner Contact</label>
            <input type="text" value={tempParty.owner_contact || tempParty.phone || ''} onChange={e => setTempParty(p => ({ ...p, owner_contact: e.target.value, phone: e.target.value }))} placeholder="Phone or Email" className={inp} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">💥 Damage Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Damage Severity</label>
            <select value={tempParty.damage_severity || 'Minor'} onChange={e => setTempParty(p => ({ ...p, damage_severity: e.target.value }))} className={inp}>
              <option value="Minor">Minor</option>
              <option value="Moderate">Moderate</option>
              <option value="Major">Major</option>
              <option value="Total Loss">Total Loss</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Damage Description</label>
            <input type="text" value={tempParty.damage_description || ''} onChange={e => setTempParty(p => ({ ...p, damage_description: e.target.value }))} placeholder="Front bumper, side panel, structure collapse..." className={inp} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">🛠️ Repair Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <label className={lbl}>Repair Status <span className="text-red-400">*</span></label>
            <select value={tempParty.repair_status || 'Not Started'} onChange={e => setTempParty(p => ({ ...p, repair_status: e.target.value }))} className={inp}>
              <option value="Not Started">Not Started</option>
              <option value="Estimate Pending">Estimate Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Repair Shop</label>
            <input type="text" value={tempParty.repair_shop || ''} onChange={e => setTempParty(p => ({ ...p, repair_shop: e.target.value }))} placeholder="Body Shop / Contractor Name" className={inp} />
          </div>
          <div>
            <label className={lbl}>Estimated Repair Cost ($)</label>
            <input type="number" step="0.01" value={tempParty.estimated_repair_cost || ''} onChange={e => setTempParty(p => ({ ...p, estimated_repair_cost: e.target.value }))} placeholder="0.00" className={inp} />
          </div>
          <div>
            <label className={lbl}>Actual Repair Cost ($)</label>
            <input type="number" step="0.01" value={tempParty.actual_repair_cost || ''} onChange={e => setTempParty(p => ({ ...p, actual_repair_cost: e.target.value }))} placeholder="0.00" className={inp} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">🔗 Assignments & Insurance</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Assigned Vehicle</label>
            <select value={tempParty.assigned_vehicle_id || ''} onChange={e => setTempParty(p => ({ ...p, assigned_vehicle_id: e.target.value }))} className={inp}>
              <option value="">-- Select Vehicle (Optional) --</option>
              {Array.isArray(vehiclesList) && vehiclesList.map(v => (
                <option key={v.id || v.vehicle_id} value={v.id || v.vehicle_id}>
                  {v.year} {v.make} {v.model} ({v.license_plate || v.vin || 'No Plate'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Insurance Claim Number</label>
            <input type="text" value={tempParty.insurance_claim_number || ''} onChange={e => setTempParty(p => ({ ...p, insurance_claim_number: e.target.value }))} placeholder="Claim #" className={inp} />
          </div>
          <div>
            <label className={lbl}>Assigned Insurance Party ID</label>
            <input type="text" value={tempParty.assigned_insurance_party_id || ''} onChange={e => setTempParty(p => ({ ...p, assigned_insurance_party_id: e.target.value }))} placeholder="Insurance Party ID" className={inp} />
          </div>
        </div>
      </div>

      <div>
        <label className={lbl}>Property Notes</label>
        <textarea value={tempParty.property_notes || ''} onChange={e => setTempParty(p => ({ ...p, property_notes: e.target.value }))} rows={2} className={`${inp} resize-none`} placeholder="Additional notes about damaged property..."></textarea>
      </div>
    </div>
  );
}

function PoliceForm({ tempParty, setTempParty, vehiclesList, partiesList }) {
  const lbl = "text-[9px] font-bold text-[#8a94a6] block mb-1";
  const inp = "w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8] transition-colors";

  const driversList = (partiesList || []).filter(p => (p.party_roles || [p.party_role]).includes('Driver'));
  const witnessesList = (partiesList || []).filter(p => (p.party_roles || [p.party_role]).includes('Witness'));

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-500/10 to-indigo-950/20 border border-indigo-500/30 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">👮</span>
          <div>
            <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Police & Investigation Profile</h5>
            <p className="text-[10px] text-slate-400">Single Source of Truth (role_data.Police)</p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">POLICE ROLE</span>
      </div>

      {/* 1. Police Report */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">📋 1. Police Report</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <label className={lbl}>Report Number <span className="text-red-400">*</span></label>
            <input type="text" value={tempParty.report_number || ''} onChange={e => setTempParty(p => ({ ...p, report_number: e.target.value }))} placeholder="PR-99201" className={inp} />
          </div>
          <div>
            <label className={lbl}>Case Number</label>
            <input type="text" value={tempParty.case_number || ''} onChange={e => setTempParty(p => ({ ...p, case_number: e.target.value }))} placeholder="PD-2026-X" className={inp} />
          </div>
          <div>
            <label className={lbl}>Report Date</label>
            <input type="date" value={tempParty.report_date || ''} onChange={e => setTempParty(p => ({ ...p, report_date: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Reporting Agency <span className="text-red-400">*</span></label>
            <input type="text" value={tempParty.reporting_agency || tempParty.company_name || ''} onChange={e => setTempParty(p => ({ ...p, reporting_agency: e.target.value, company_name: e.target.value }))} placeholder="City Police Dept / State Hwy Patrol" className={inp} />
          </div>
        </div>
      </div>

      {/* 2. Officer Details */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">👮 2. Officer Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <div className="sm:col-span-2">
            <label className={lbl}>Officer Name <span className="text-red-400">*</span></label>
            <input type="text" value={tempParty.officer_name || tempParty.full_name || ''} onChange={e => setTempParty(p => ({ ...p, officer_name: e.target.value, full_name: e.target.value }))} placeholder="Officer John Doe" className={inp} />
          </div>
          <div>
            <label className={lbl}>Badge Number</label>
            <input type="text" value={tempParty.badge_number || ''} onChange={e => setTempParty(p => ({ ...p, badge_number: e.target.value }))} placeholder="#4092" className={inp} />
          </div>
          <div>
            <label className={lbl}>Department</label>
            <input type="text" value={tempParty.department || ''} onChange={e => setTempParty(p => ({ ...p, department: e.target.value }))} placeholder="Traffic Division" className={inp} />
          </div>
          <div>
            <label className={lbl}>Phone / Email</label>
            <input type="text" value={tempParty.officer_phone || tempParty.phone || ''} onChange={e => setTempParty(p => ({ ...p, officer_phone: e.target.value, phone: e.target.value }))} placeholder="555-0199" className={inp} />
          </div>
        </div>
      </div>

      {/* 3. Investigation */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">🔍 3. Investigation & Citations</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Investigation Status <span className="text-red-400">*</span></label>
            <select value={tempParty.investigation_status || 'Open'} onChange={e => setTempParty(p => ({ ...p, investigation_status: e.target.value }))} className={inp}>
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Citation Issued?</label>
            <select value={tempParty.citation_issued || 'No'} onChange={e => setTempParty(p => ({ ...p, citation_issued: e.target.value }))} className={inp}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Citation Number {tempParty.citation_issued === 'Yes' && <span className="text-red-400">*</span>}</label>
            <input type="text" value={tempParty.citation_number || ''} onChange={e => setTempParty(p => ({ ...p, citation_number: e.target.value }))} placeholder="CIT-8831" className={inp} />
          </div>
        </div>
      </div>

      {/* 4. Assignments */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">🔗 4. Related Entity Assignments</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className={lbl}>Related Vehicle</label>
            <select value={tempParty.assigned_vehicle_id || ''} onChange={e => setTempParty(p => ({ ...p, assigned_vehicle_id: e.target.value }))} className={inp}>
              <option value="">-- Select Vehicle (Optional) --</option>
              {Array.isArray(vehiclesList) && vehiclesList.map(v => (
                <option key={v.id || v.vehicle_id} value={v.id || v.vehicle_id}>
                  {v.year} {v.make} {v.model} ({v.license_plate || v.vin || 'No Plate'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Related Driver</label>
            <select value={tempParty.assigned_driver_party_id || ''} onChange={e => setTempParty(p => ({ ...p, assigned_driver_party_id: e.target.value }))} className={inp}>
              <option value="">-- Select Driver (Optional) --</option>
              {driversList.map(d => (
                <option key={d.id} value={d.id}>{d.full_name || d.company_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Related Witness</label>
            <select value={tempParty.assigned_witness_party_id || ''} onChange={e => setTempParty(p => ({ ...p, assigned_witness_party_id: e.target.value }))} className={inp}>
              <option value="">-- Select Witness (Optional) --</option>
              {witnessesList.map(w => (
                <option key={w.id} value={w.id}>{w.full_name || w.company_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 5. Evidence */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">📸 5. Evidence Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <label className={lbl}>Photos Available?</label>
            <select value={tempParty.photos_available || 'No'} onChange={e => setTempParty(p => ({ ...p, photos_available: e.target.value }))} className={inp}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Body Camera Footage?</label>
            <select value={tempParty.body_camera || 'No'} onChange={e => setTempParty(p => ({ ...p, body_camera: e.target.value }))} className={inp}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Dash Camera Footage?</label>
            <select value={tempParty.dash_camera || 'No'} onChange={e => setTempParty(p => ({ ...p, dash_camera: e.target.value }))} className={inp}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Evidence Description</label>
            <input type="text" value={tempParty.evidence_collected || ''} onChange={e => setTempParty(p => ({ ...p, evidence_collected: e.target.value }))} placeholder="Physical evidence, debris, skid marks..." className={inp} />
          </div>
        </div>
      </div>

      {/* 6. Notes */}
      <div>
        <label className={lbl}>Police Notes</label>
        <textarea value={tempParty.police_notes || ''} onChange={e => setTempParty(p => ({ ...p, police_notes: e.target.value }))} rows={2} className={`${inp} resize-none`} placeholder="Additional officer notes, narrative summary..."></textarea>
      </div>
    </div>
  );
}

function RoleRenderer({ roles, tempParty, setTempParty, vehiclesList, partiesList, adaptiveQuestions }) {
  const activeRoles = Array.isArray(roles) ? roles : [roles];

  return (
    <div className="space-y-3">
      {/* Driver Form — Adaptive intake check: show if vehiclesInvolved !== false */}
      {activeRoles.includes('Driver') && (adaptiveQuestions?.vehiclesInvolved !== false) && (
        <DriverForm tempParty={tempParty} setTempParty={setTempParty} vehiclesList={vehiclesList} />
      )}

      {/* Passenger Form — Adaptive intake check: show if vehiclesInvolved !== false */}
      {activeRoles.includes('Passenger') && (adaptiveQuestions?.vehiclesInvolved !== false) && (
        <PassengerForm tempParty={tempParty} setTempParty={setTempParty} vehiclesList={vehiclesList} partiesList={partiesList} />
      )}

      {activeRoles.includes('Witness') && (
        <WitnessForm tempParty={tempParty} setTempParty={setTempParty} />
      )}

      {(activeRoles.includes('Insurance Company') || activeRoles.includes('Insurance Adjuster')) && (
        <InsuranceForm tempParty={tempParty} setTempParty={setTempParty} />
      )}

      {activeRoles.includes('Medical Provider') && (
        <MedicalProviderForm tempParty={tempParty} setTempParty={setTempParty} />
      )}

      {activeRoles.includes('Employer') && (
        <EmployerForm tempParty={tempParty} setTempParty={setTempParty} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  LOGIN SCREEN
// ─────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [isPasswordless, setIsPasswordless] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showAdminContact, setShowAdminContact] = useState(false);
  const [showAdminEmail, setShowAdminEmail] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const cleanEmail = (email || '').trim();
      if (isPasswordless) {
        if (!cleanEmail) {
          throw new Error('Please enter your email to request a secure login link.');
        }
        const response = await api.auth.requestMagicLink(cleanEmail);
        setMagicLinkSent(true);
      } else {
        if (!cleanEmail) {
          throw new Error('Please enter your email.');
        }
        const response = await api.auth.login({ email: cleanEmail, password: pass });
        const payload = response?.data;
        const user = payload?.user ?? response?.user;
        const token = payload?.token ?? response?.token;
        if (!user || !token) {
          throw new Error('Invalid login response from server.');
        }
        onLogin(user, token);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#05080f] overflow-hidden">
      {/* Left Panel - Cinematic Branding */}
      <div className="hidden md:flex md:w-[45%] lg:w-[40%] bg-[#05080f] relative flex-col items-center justify-center p-12 text-center border-r border-white/5">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img src={justiceBg} alt="Justice Background" className="w-full h-full object-cover opacity-40 mix-blend-luminosity scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#05080f]/80 via-[#05080f]/40 to-[#05080f]/90" />
        </div>

        <div className="relative z-10 space-y-12 animate-fade-in-up">
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
              <img src={logoImg} alt="Firm Logo" className="w-full h-full object-contain filter brightness-110" />
            </div>
            <div className="space-y-2">
              <h2 className="text-[#C9A24A] font-serif text-3xl tracking-wide">Victoria Tulsidas Law, APLC</h2>
              <p className="text-white/60 text-[11px] font-900 uppercase tracking-[0.5em] ml-1">Attorney At Law</p>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-white font-serif text-6xl leading-tight tracking-tighter">VkTori</h1>
            <p className="text-white/70 text-sm max-w-sm mx-auto leading-relaxed">
              Streamline your legal practice. Manage cases, parties, documents and billing all in one secure platform.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-12 border-t border-white/10">
            {[
              { label: 'Secure', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
              { label: 'Efficient', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
              { label: 'Insightful', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 012 2h2a2 2 0 012-2" /></svg> },
            ].map(f => (
              <div key={f.label} className="space-y-3 group cursor-default">
                <div className="w-10 h-10 mx-auto rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#C9A24A] group-hover:bg-[#C9A24A] group-hover:text-black transition-all duration-300">
                  {f.icon}
                </div>
                <p className="text-[10px] font-900 text-white/60 uppercase tracking-widest">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Institutional Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-24 bg-[#0a0f1a] relative overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#0057c7]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#C9A24A]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-xl space-y-12 animate-fade-in relative z-10">
          {/* Mobile Logo */}
          <div className="md:hidden flex flex-col items-center gap-4 mb-12">
            <div className="w-16 h-16 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-white font-serif text-4xl tracking-tight">VkTori</h1>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="px-4 py-1.5 rounded-full bg-[#0057c7] text-white text-[11px] font-900 uppercase tracking-[0.2em] shadow-lg shadow-[#0057c7]/30">
                Secure Gateway
              </div>
              <div className="h-px w-12 bg-white/10" />
              <span className="text-[12px] font-800 text-slate-500 uppercase tracking-widest">Secure Legal Platform</span>
            </div>
            <h2 className="text-white font-serif text-6xl tracking-tight leading-tight">Welcome <span className="text-[#C9A24A]">Back</span></h2>
            <p className="text-white/80 text-lg font-medium">Authorized portal access. Choose magic link or internal staff sign-in.</p>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[3rem] p-10 sm:p-14 shadow-2xl border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:bg-[#C9A24A]/10 transition-colors" />

            {/* Toggle Authentication Modes */}
            <div className="flex bg-[#05080f] p-1 rounded-2xl mb-8 relative z-10">
              <button
                type="button"
                onClick={() => { setIsPasswordless(true); setErrorMsg(''); setMagicLinkSent(false); }}
                className={`flex-1 py-3 text-xs uppercase tracking-wider font-900 rounded-xl transition-all ${isPasswordless ? 'bg-[#0057c7] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Passwordless Link (Client)
              </button>
              <button
                type="button"
                onClick={() => { setIsPasswordless(false); setErrorMsg(''); }}
                className={`flex-1 py-3 text-xs uppercase tracking-wider font-900 rounded-xl transition-all ${!isPasswordless ? 'bg-[#0057c7] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Password / Staff
              </button>
            </div>

            {errorMsg && (
              <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[14px] font-700 text-center animate-shake relative z-10">
                {errorMsg}
              </div>
            )}

            {magicLinkSent ? (
              <div className="text-center py-8 relative z-10 space-y-6">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
                  </svg>
                </div>
                <h3 className="text-white font-serif text-3xl">Secure Link Dispatched</h3>
                <p className="text-slate-300 text-sm leading-relaxed max-w-sm mx-auto">
                  If your email matches an active client account in our registry, a secure magic link has been sent to <strong className="text-white">{email}</strong>. The link expires in 15 minutes.
                </p>
                <button
                  type="button"
                  onClick={() => setMagicLinkSent(false)}
                  className="text-xs font-bold text-[#38bdf8] hover:underline"
                >
                  Send another link
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="relative z-10">
                <div className="space-y-8 mb-12">
                  <div className="space-y-3">
                    <label className="block text-[11px] font-900 text-white/80 uppercase tracking-[0.2em] ml-2">Email Identity</label>
                    <div className="relative group/input">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-[#38bdf8] transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <input value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-14 pr-5 py-5 text-white text-[16px] outline-none focus:border-[#38bdf8] focus:ring-4 focus:ring-[#38bdf8]/10 transition-all font-medium placeholder:text-slate-600 shadow-inner"
                        placeholder="Enter your credential email" />
                    </div>
                  </div>

                  {!isPasswordless && (
                    <div className="space-y-3">
                      <label className="block text-[11px] font-900 text-white/80 uppercase tracking-[0.2em] ml-2">Secure Credential</label>
                      <div className="relative group/input">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-[#38bdf8] transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                        <input type={showPass ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-14 pr-14 py-5 text-white text-[16px] outline-none focus:border-[#38bdf8] focus:ring-4 focus:ring-[#38bdf8]/10 transition-all font-medium placeholder:text-slate-600 shadow-inner"
                          placeholder="••••••••" />
                        <button type="button" onClick={() => setShowPass(!showPass)} className={`absolute right-5 top-1/2 -translate-y-1/2 transition-colors ${showPass ? 'text-[#38bdf8]' : 'text-slate-500 hover:text-white'}`}>
                          {showPass ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L4.22 4.22m13.88 13.88l-1.42-1.42m1.42-1.42a10.02 10.02 0 001.383-2.31c-1.274-4.057-5.064-7-9.542-7-1.144 0-2.235.19-3.25.54m0 0l-1.42-1.42" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-2">
                    <label className="flex items-center gap-3 text-[13px] text-white/80 font-600 cursor-pointer group">
                      <input type="checkbox" defaultChecked className="w-4.5 h-4.5 rounded-[6px] border-white/10 bg-white/5 text-[#0057c7] focus:ring-[#0057c7]/50" />
                      Remember this device
                    </label>
                    {!isPasswordless && (
                      <button type="button" onClick={() => { setShowAdminContact(true); setShowAdminEmail(false); }} className="text-[13px] text-[#38bdf8] font-800 hover:text-white transition-colors">Forgot Password?</button>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={isLoading}
                  className="w-full py-5 bg-[#0057c7] text-white font-900 uppercase tracking-[0.3em] rounded-2xl text-[15px] hover:bg-[#004bb1] hover:shadow-2xl hover:shadow-[#0057c7]/30 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 relative z-10 shadow-lg">
                  {isLoading ? 'Synchronizing...' : isPasswordless ? 'Request Access Link' : 'Enter Platform'}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-[14px] text-slate-500 font-600">
            Internal Access Only. <span onClick={() => { setShowAdminContact(true); setShowAdminEmail(false); }} className="text-[#C9A24A] font-800 cursor-pointer hover:text-white transition-colors ml-1">Contact Systems Admin</span>
          </p>
        </div>

        {showAdminContact && (
          <div className="absolute inset-0 z-50 bg-[#0a0f1a]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in">
            <div className="bg-white/[0.05] border border-white/10 p-6 sm:p-8 rounded-3xl max-w-md w-full text-center space-y-4 sm:space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A24A]/10 rounded-full -mr-16 -mt-16 blur-xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#0057c7]/10 rounded-full -ml-16 -mb-16 blur-xl" />
              
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#C9A24A]/20 rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-4 relative z-10 border border-[#C9A24A]/30">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-[#C9A24A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif text-white relative z-10 tracking-tight">Security Protocol</h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed relative z-10">
                For security compliance, password resets must be authorized by the Systems Administrator. 
                Please contact IT support to receive a temporary credential.
              </p>
              <div className="pt-4 sm:pt-6 space-y-3 relative z-10">
                {showAdminEmail ? (
                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl animate-fade-in text-center space-y-2">
                    <p className="text-[10px] sm:text-[11px] font-900 text-slate-400 uppercase tracking-widest">Administrator Email</p>
                    <p className="text-sm sm:text-base font-semibold text-[#38bdf8] select-all break-all">
                      info@victoriatulsidaslaw.com
                    </p>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowAdminEmail(true)} className="block w-full py-3 sm:py-4 bg-[#0057c7] text-white rounded-xl font-bold uppercase tracking-wider text-xs sm:text-sm hover:bg-[#004bb1] transition-all shadow-lg shadow-[#0057c7]/20">
                    Email Administrator
                  </button>
                )}
                <button type="button" onClick={() => { setShowAdminContact(false); setShowAdminEmail(false); }} className="block w-full py-3 sm:py-4 bg-transparent border border-white/10 text-white rounded-xl font-bold uppercase tracking-wider text-xs sm:text-sm hover:bg-white/5 transition-all">
                  Return to Gateway
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-10 left-0 w-full text-center opacity-40">
          <p className="text-[10px] font-900 text-slate-600 uppercase tracking-[0.4em]">
            © {new Date().getFullYear()} Victoria Tulsidas Law, APLC. Secure Legal Network v2.4.0
          </p>
        </div>
      </div>
    </div>
  );
}

function MagicLinkVerifier({ onLogin, toast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toast('Login token is missing.', 'error');
      navigate('/login');
      return;
    }

    api.auth.verifyMagicLink(token)
      .then(res => {
        const payload = res?.data ?? res;
        toast('Logged in successfully!', 'success');
        onLogin(payload?.user, payload?.token);
      })
      .catch(err => {
        toast(err.message || 'Login verification failed. Link may be expired.', 'error');
        navigate('/login');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-[#05080f] flex flex-col items-center justify-center text-white">
      <div className="w-12 h-12 border-4 border-[#38bdf8] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-xs uppercase tracking-widest font-900 text-slate-400">Verifying secure portal key...</p>
    </div>
  );
}

function InviteVerifier({ onLogin, toast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toast('Invitation token is missing.', 'error');
      navigate('/login');
      return;
    }

    api.auth.verifyInvite(token)
      .then(res => {
        const payload = res?.data ?? res;
        toast('Onboarding completed! Welcome to the Victoria Tulsidas Law client portal.', 'success');
        onLogin(payload?.user, payload?.token);
      })
      .catch(err => {
        toast(err.message || 'Invitation verification failed.', 'error');
        navigate('/login');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-[#05080f] flex flex-col items-center justify-center text-white">
      <div className="w-12 h-12 border-4 border-[#38bdf8] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-xs uppercase tracking-widest font-900 text-slate-400">Activating secure portal access...</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  EDIT CASE MODAL BODY (THE "FULL MASK")
// ─────────────────────────────────────────────────────────
function EditCaseModalBody({ data, formState, setFormState, lawyerRows, practiceAreas, customFields }) {
  const [activeTab, setActiveTab] = useState('general');
  const [partiesList, setPartiesList] = useState(() => {
    let raw = data?.parties_data || [];
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch { raw = []; }
    }
    return Array.isArray(raw) ? raw : [];
  });
  const [vehiclesList, setVehiclesList] = useState(() => {
    let raw = data?.vehicles_data || [];
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch { raw = []; }
    }
    return Array.isArray(raw) ? raw : [];
  });

  const [showAddParty, setShowAddParty] = useState(false);
  const [newParty, setNewParty] = useState({ full_name: '', party_role: 'Witness', email: '', phone: '' });
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState([]);

  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ make: '', model: '', year: '', license_plate: '' });

  const handleAddParty = () => {
    if (!newParty.full_name) return;
    const updated = [...partiesList, { ...newParty, id: 'party_' + Date.now() }];
    setPartiesList(updated);
    setFormState(s => ({ ...s, parties_data: updated }));
    setNewParty({ full_name: '', party_role: 'Witness', email: '', phone: '' });
    setShowAddParty(false);
  };

  const handleRemoveParty = (id) => {
    const updated = partiesList.filter(p => p.id !== id);
    setPartiesList(updated);
    setFormState(s => ({ ...s, parties_data: updated }));
  };

  const handleAddVehicle = () => {
    if (!newVehicle.make) return;
    const updated = [...vehiclesList, { ...newVehicle, vehicle_id: 'veh_' + Date.now() }];
    setVehiclesList(updated);
    setFormState(s => ({ ...s, vehicles_data: updated }));
    setNewVehicle({ make: '', model: '', year: '', license_plate: '' });
    setShowAddVehicle(false);
  };

  const handleRemoveVehicle = (id) => {
    const updated = vehiclesList.filter(v => v.vehicle_id !== id);
    setVehiclesList(updated);
    setFormState(s => ({ ...s, vehicles_data: updated }));
  };

  return (
    <div className="space-y-4">
      {/* Modal Tab Bar */}
      <div className="flex border-b border-white/10 pb-2 mb-4 gap-2">
        {[
          { id: 'general', label: 'General Details' },
          { id: 'client', label: 'Retaining Client' },
          { id: 'parties', label: 'Parties & Vehicles' }
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${activeTab === t.id ? 'bg-[#0057c7] text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={activeTab === 'general' ? 'space-y-4' : 'hidden'}>
          <AdaptiveSection icon="⚖️" title="General Matter Details" visible={true}>
            <div className="mb-3">
              <Field label="Matter Title" required>
                <Input
                  name="title"
                  value={formState.title !== undefined ? formState.title : (data?.title || '')}
                  onChange={e => setFormState(s => ({ ...s, title: e.target.value }))}
                  required
                />
              </Field>
            </div>
            {lawyerRows && (
              <div className="mb-3">
                <Field label="Assigned Lawyer">
                  <Select
                    name="assigned_lawyer_id"
                    value={formState.assigned_lawyer_id !== undefined ? formState.assigned_lawyer_id : (data?.assigned_lawyer_id || '')}
                    onChange={e => setFormState(s => ({ ...s, assigned_lawyer_id: e.target.value }))}
                  >
                    <option value="">Select lawyer...</option>
                    {lawyerRows.map((u) => <option key={u.id} value={u.user_id || u.id}>{u.full_name || u.display_name}</option>)}
                  </Select>
                </Field>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Status" required>
                <Select
                  name="status"
                  value={formState.status !== undefined ? formState.status : (data?.status || 'active')}
                  onChange={e => setFormState(s => ({ ...s, status: e.target.value }))}
                  required
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                </Select>
              </Field>
              <Field label="Priority" required>
                <Select
                  name="priority"
                  value={formState.priority !== undefined ? formState.priority : (data?.priority || 'medium')}
                  onChange={e => setFormState(s => ({ ...s, priority: e.target.value }))}
                  required
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Practice Area" required>
                <Select
                  name="type"
                  value={formState.type !== undefined ? formState.type : (data?.practice_area || data?.type || data?.matter_type || 'Civil Litigation')}
                  onChange={e => setFormState(s => ({ ...s, type: e.target.value, practice_area: e.target.value }))}
                  required
                >
                  {practiceAreas.length > 0 ? practiceAreas.map(pa => (
                    <option key={pa.id} value={pa.name}>{pa.name}</option>
                  )) : (
                    <><option value="Civil Litigation">Civil Litigation</option><option value="Family Law">Family Law</option><option value="Criminal Defense">Criminal Defense</option><option value="Corporate Law">Corporate Law</option><option value="Real Estate">Real Estate</option><option value="Personal Injury">Personal Injury</option><option value="Immigration">Immigration</option><option value="Employment">Employment</option></>
                  )}
                  <option value="other">Other...</option>
                </Select>
              </Field>
              <Field label={(formState.tracking_type !== undefined ? formState.tracking_type : (data?.tracking_type || 'court')) === 'claim' ? 'Insurance Claim Number' : 'Case / Docket Number'}>
                <Input
                  name="case_number"
                  placeholder={(formState.tracking_type !== undefined ? formState.tracking_type : (data?.tracking_type || 'court')) === 'claim' ? 'Claim #' : 'Case #'}
                  value={formState.case_number !== undefined ? formState.case_number : (data?.case_number || '')}
                  onChange={e => setFormState(s => ({ ...s, case_number: e.target.value }))}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Case Value ($)">
                <Input
                  name="case_value"
                  type="number"
                  step="0.01"
                  placeholder="E.g., 50000.00"
                  value={formState.case_value !== undefined ? formState.case_value : (data?.case_value || '')}
                  onChange={e => setFormState(s => ({ ...s, case_value: e.target.value }))}
                />
              </Field>
            </div>
            {(formState.type === 'other' || (formState.type === undefined && (() => { const predefinedTypes = ['Civil Litigation','Family Law','Criminal Defense','Corporate Law','Real Estate'].concat(practiceAreas.map(pa => pa.name)); return !predefinedTypes.includes(data?.type) && !!data?.type; })() )) && (
              <div className="mb-3">
                <Field label="Custom Practice Area" required>
                  <Input
                    name="custom_matter_type"
                    value={formState.custom_matter_type !== undefined ? formState.custom_matter_type : (data?.type || '')}
                    onChange={e => setFormState(s => ({ ...s, custom_matter_type: e.target.value }))}
                    placeholder="E.g., Immigration Law"
                    required
                  />
                </Field>
              </div>
            )}
          </AdaptiveSection>

          <AdaptiveSection icon="📅" title="Filing Dates & Key Timeline" visible={true}>
            <div className="mb-4">
              <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">
                Case Stage / Tracking Type
              </label>
              <div className="flex gap-4 mt-2">
                {[
                  { value: 'court', label: 'Court Case' },
                  { value: 'claim', label: 'Pre-Litigation / Claim' }
                ].map(opt => {
                  const currentType = formState.tracking_type !== undefined ? formState.tracking_type : (data?.tracking_type || 'court');
                  return (
                    <label key={opt.value} className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                      <input
                        type="radio"
                        name="tracking_type"
                        value={opt.value}
                        checked={currentType === opt.value}
                        onChange={e => setFormState(s => ({ ...s, tracking_type: e.target.value }))}
                        className="accent-[#38bdf8]"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label={(formState.tracking_type !== undefined ? formState.tracking_type : (data?.tracking_type || 'court')) === 'claim' ? 'Claim Opening Date' : 'Initial Filing Date'}>
                <Input
                  name="initial_filing_date"
                  type="date"
                  value={formState.initial_filing_date !== undefined ? formState.initial_filing_date : (data?.initial_filing_date ? data.initial_filing_date.split('T')[0] : '')}
                  onChange={e => setFormState(s => ({ ...s, initial_filing_date: e.target.value }))}
                />
              </Field>
              <Field label="Date of Loss">
                <Input
                  name="date_of_loss"
                  type="date"
                  value={formState.date_of_loss !== undefined ? formState.date_of_loss : (data?.date_of_loss ? data.date_of_loss.split('T')[0] : '')}
                  onChange={e => setFormState(s => ({ ...s, date_of_loss: e.target.value }))}
                />
              </Field>
            </div>

            <div className="mb-3">
              <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">
                Statute of Limitations
              </label>
              <div className="flex gap-4 mt-2">
                {[
                  { value: '1_year', label: '1 Year' },
                  { value: '2_years', label: '2 Years' },
                  { value: 'custom', label: 'Custom' }
                ].map(opt => {
                  const currentTerm = formState.sol_term !== undefined ? formState.sol_term : (data?.sol_term || '2_years');
                  return (
                    <label key={opt.value} className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                      <input
                        type="radio"
                        name="sol_term"
                        value={opt.value}
                        checked={currentTerm === opt.value}
                        onChange={e => setFormState(s => ({ ...s, sol_term: e.target.value }))}
                        className="accent-[#38bdf8]"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>

            {(formState.sol_term !== undefined ? formState.sol_term : (data?.sol_term || '2_years')) === 'custom' && (
              <div className="mb-3">
                <Field label="Custom SOL Expiration Date">
                  <Input
                    name="sol_date"
                    type="date"
                    value={formState.sol_date !== undefined ? formState.sol_date : (data?.sol_date ? data.sol_date.split('T')[0] : '')}
                    onChange={e => setFormState(s => ({ ...s, sol_date: e.target.value }))}
                  />
                </Field>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label={(formState.tracking_type !== undefined ? formState.tracking_type : (data?.tracking_type || 'court')) === 'claim' ? 'Expected Resolution Date' : 'Trial Date'}>
                <Input
                  name="trial_date"
                  type="date"
                  value={formState.trial_date !== undefined ? formState.trial_date : (data?.trial_date ? data.trial_date.split('T')[0] : '')}
                  onChange={e => setFormState(s => ({ ...s, trial_date: e.target.value }))}
                />
              </Field>
              <Field label="Next Hearing">
                <Input
                  name="nextHearing"
                  type="date"
                  value={formState.nextHearing !== undefined ? formState.nextHearing : (data?.next_hearing ? data.next_hearing.split('T')[0] : (data?.nextHearing && data.nextHearing !== '—' ? data.nextHearing.split('T')[0] : ''))}
                  onChange={e => setFormState(s => ({ ...s, nextHearing: e.target.value }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Hearing / Trial Time">
                <Input
                  name="hearing_time"
                  type="text"
                  placeholder="E.g., 09:30 AM"
                  defaultValue={data?.hearing_time || ''}
                />
              </Field>
            </div>
          </AdaptiveSection>

          <AdaptiveSection
            icon="🏛️"
            title={(formState.tracking_type !== undefined ? formState.tracking_type : (data?.tracking_type || 'court')) === 'claim' ? 'Insurance Claim Information' : 'Court & Docket Information'}
            visible={true}
          >
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label={(formState.tracking_type !== undefined ? formState.tracking_type : (data?.tracking_type || 'court')) === 'claim' ? 'Insurance Company' : 'Court Name'}><Input name="court_name" placeholder={(formState.tracking_type !== undefined ? formState.tracking_type : (data?.tracking_type || 'court')) === 'claim' ? 'Insurance Carrier' : 'Court Name'} defaultValue={data?.court_name || ''} /></Field>
              <Field label={(formState.tracking_type !== undefined ? formState.tracking_type : (data?.tracking_type || 'court')) === 'claim' ? 'Adjuster / Agent Name' : 'Judge Name'}><Input name="judge_name" placeholder={(formState.tracking_type !== undefined ? formState.tracking_type : (data?.tracking_type || 'court')) === 'claim' ? 'Adjuster Name' : 'Honorable Judge...'} defaultValue={data?.judge_name || ''} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label={(formState.tracking_type !== undefined ? formState.tracking_type : (data?.tracking_type || 'court')) === 'claim' ? 'Insurance Company Address' : 'Court Address'}><Input name="court_address" placeholder={(formState.tracking_type !== undefined ? formState.tracking_type : (data?.tracking_type || 'court')) === 'claim' ? 'Company Address' : 'Court Address'} defaultValue={data?.court_address || ''} /></Field>
              <Field label="Department Number"><Input name="court_department" placeholder="E.g., Dept 12" defaultValue={data?.court_department || ''} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Court County">
                <Select name="court_county" defaultValue={data?.court_county || ''}>
                  <option value="">-- None / Out of State --</option>
                  {CALIFORNIA_COUNTIES.map(county => (
                    <option key={county} value={county}>{county}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </AdaptiveSection>

          {customFields && customFields.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <h4 className="text-[12px] font-900 text-white uppercase tracking-widest mb-3">Custom Fields</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map(f => {
                  const existingVal = data?.custom_fields?.find(cf => cf.field_id === f.id)?.value || '';
                  return (
                    <Field key={f.id} label={f.name}>
                      {f.type === 'dropdown' ? (
                        <Select name={`cf_${f.id}`} defaultValue={existingVal}>
                          <option value="">Select option...</option>
                          {(f.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </Select>
                      ) : f.type === 'date' ? (
                        <Input type="date" name={`cf_${f.id}`} defaultValue={existingVal} />
                      ) : f.type === 'number' || f.type === 'currency' ? (
                        <Input type="number" step="any" name={`cf_${f.id}`} defaultValue={existingVal} placeholder={f.type === 'currency' ? '0.00' : ''} />
                      ) : f.type === 'checkbox' || f.type === 'yes_no' ? (
                        <Select name={`cf_${f.id}`} defaultValue={existingVal}>
                          <option value="">Select...</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </Select>
                      ) : (
                        <Input type="text" name={`cf_${f.id}`} defaultValue={existingVal} />
                      )}
                    </Field>
                  );
                })}
              </div>
            </div>
          )}
      </div>

      <div className={activeTab === 'client' ? 'space-y-4 animate-fade-in' : 'hidden'}>
          <AdaptiveSection icon="👤" title="Retaining Client Details" visible={true}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Client Name" required>
                <Input
                  name="retaining_client_name"
                  value={formState.retaining_client_name !== undefined ? formState.retaining_client_name : (data?.retaining_client_name || data?.client?.full_name || '')}
                  onChange={e => setFormState(s => ({ ...s, retaining_client_name: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Client Email" required>
                <Input
                  name="retaining_client_email"
                  type="email"
                  value={formState.retaining_client_email !== undefined ? formState.retaining_client_email : (data?.retaining_client_email || data?.client?.email || '')}
                  onChange={e => setFormState(s => ({ ...s, retaining_client_email: e.target.value }))}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Client Phone">
                <Input
                  name="retaining_client_phone"
                  value={formState.retaining_client_phone !== undefined ? formState.retaining_client_phone : (data?.retaining_client_phone || data?.client?.phone || '')}
                  onChange={e => setFormState(s => ({ ...s, retaining_client_phone: formatUSPhone(e.target.value) }))}
                />
              </Field>
              <Field label="Date of Birth">
                <Input
                  name="retaining_client_dob"
                  type="date"
                  value={formState.retaining_client_dob !== undefined ? formState.retaining_client_dob : (data?.retaining_client_dob ? data.retaining_client_dob.split('T')[0] : (data?.client?.date_of_birth ? data.client.date_of_birth.split('T')[0] : ''))}
                  onChange={e => setFormState(s => ({ ...s, retaining_client_dob: e.target.value }))}
                />
              </Field>
            </div>
            <div className="mb-3">
              <Field label="Client Address">
                <Input
                  name="retaining_client_address"
                  value={formState.retaining_client_address !== undefined ? formState.retaining_client_address : (data?.retaining_client_address || data?.client?.home_address || '')}
                  onChange={e => setFormState(s => ({ ...s, retaining_client_address: e.target.value }))}
                />
              </Field>
            </div>
            <div>
              <input type="hidden" name="retaining_client_gov_id" value={formState.retaining_client_gov_id !== undefined ? formState.retaining_client_gov_id : (data?.retaining_client_gov_id || data?.client?.government_id || '')} />
              <ConfidentialIdFields
                value={formState.retaining_client_gov_id !== undefined ? formState.retaining_client_gov_id : (data?.retaining_client_gov_id || data?.client?.government_id || '')}
                onChange={val => setFormState(s => ({ ...s, retaining_client_gov_id: val }))}
              />
            </div>
          </AdaptiveSection>
      </div>

      <div className={activeTab === 'parties' ? 'space-y-4 animate-fade-in' : 'hidden'}>
          {/* Parties Section */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">Associated Legal Parties</h5>
              <button
                type="button"
                onClick={() => setShowAddParty(!showAddParty)}
                className="btn btn-secondary btn-xs"
              >
                {showAddParty ? 'Cancel' : '+ Add Party'}
              </button>
            </div>

            {showAddParty && (
              <div className="p-3 bg-white/5 rounded-xl space-y-3 border border-white/5">
                <div className="p-2.5 rounded-xl bg-[#0057c7]/10 border border-[#0057c7]/20 space-y-2 relative">
                  <label className="text-[10px] font-900 text-[#38bdf8] uppercase tracking-widest flex items-center gap-1.5">
                    <span>🔍 Select Existing Contact from Master</span>
                  </label>
                  <input
                    type="text"
                    value={contactSearchQuery}
                    onChange={e => {
                      setContactSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        api.contacts.search(e.target.value).then(res => {
                          setContactSearchResults(Array.isArray(res.data) ? res.data : []);
                        }).catch(() => {});
                      } else {
                        setContactSearchResults([]);
                      }
                    }}
                    placeholder="Search by Name, Email, Phone, or Company..."
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                  {contactSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 rounded-xl bg-[#121826] border border-[#38bdf8]/40 max-h-40 overflow-y-auto custom-scrollbar shadow-2xl p-1.5 space-y-1 z-50">
                      {contactSearchResults.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setNewParty({
                              full_name: c.full_name,
                              party_role: newParty.party_role || 'Witness',
                              email: c.email || '',
                              phone: c.phone || ''
                            });
                            setContactSearchQuery('');
                            setContactSearchResults([]);
                            toast(`Linked to "${c.full_name}"`, 'success');
                          }}
                          className="p-2 rounded-lg hover:bg-[#0057c7]/30 border border-white/5 hover:border-[#38bdf8]/50 cursor-pointer transition-all flex items-center justify-between text-xs text-white"
                        >
                          <div>
                            <div className="font-bold">{c.full_name}</div>
                            <div className="text-[9px] text-slate-400">{c.email || 'No Email'} · {c.phone || 'No Phone'}</div>
                          </div>
                          <span className="text-[9px] text-[#38bdf8] font-bold">Select</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full Name">
                    <Input
                      value={newParty.full_name}
                      onChange={e => setNewParty(p => ({ ...p, full_name: e.target.value }))}
                      placeholder="Party Full Name"
                    />
                  </Field>
                  <Field label="Role">
                    <Select
                      value={newParty.party_role}
                      onChange={e => setNewParty(p => ({ ...p, party_role: e.target.value }))}
                    >
                      <option value="Witness">Witness</option>
                      <option value="Driver">Driver</option>
                      <option value="Passenger">Passenger</option>
                      <option value="Defendant">Defendant</option>
                      <option value="Insurance Adjuster">Insurance Adjuster</option>
                      <option value="Medical Provider">Medical Provider</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email">
                    <Input
                      type="email"
                      value={newParty.email}
                      onChange={e => setNewParty(p => ({ ...p, email: e.target.value }))}
                      placeholder="party@email.com"
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      value={newParty.phone}
                      onChange={e => setNewParty(p => ({ ...p, phone: formatUSPhone(e.target.value) }))}
                      placeholder="Phone"
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={handleAddParty}
                  className="btn btn-primary btn-xs w-full"
                >
                  Save Party to List
                </button>
              </div>
            )}

            <div className="space-y-2">
              {partiesList.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No associated parties.</p>
              ) : (
                partiesList.map((p, idx) => (
                  <div key={p.id || idx} className="flex items-center justify-between p-2 bg-white/[0.01] rounded-xl border border-white/5">
                    <div>
                      <p className="text-xs font-bold text-white">{p.full_name} <span className="text-[10px] text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded-full font-normal ml-2">{p.party_role}</span></p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{p.email || 'No Email'} • {p.phone || 'No Phone'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveParty(p.id)}
                      className="text-red-500 hover:text-red-400 text-xs font-bold px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
            <input type="hidden" name="parties_data" value={JSON.stringify(partiesList)} />
          </div>

          {/* Vehicles Section */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">Involved Vehicles</h5>
              <button
                type="button"
                onClick={() => setShowAddVehicle(!showAddVehicle)}
                className="btn btn-secondary btn-xs"
              >
                {showAddVehicle ? 'Cancel' : '+ Add Vehicle'}
              </button>
            </div>

            {showAddVehicle && (
              <div className="p-3 bg-white/5 rounded-xl space-y-3 border border-white/5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Make">
                    <Input
                      value={newVehicle.make}
                      onChange={e => setNewVehicle(v => ({ ...v, make: e.target.value }))}
                      placeholder="Toyota"
                    />
                  </Field>
                  <Field label="Model">
                    <Input
                      value={newVehicle.model}
                      onChange={e => setNewVehicle(v => ({ ...v, model: e.target.value }))}
                      placeholder="Camry"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Year">
                    <Input
                      type="number"
                      value={newVehicle.year}
                      onChange={e => setNewVehicle(v => ({ ...v, year: e.target.value }))}
                      placeholder="2022"
                    />
                  </Field>
                  <Field label="License Plate">
                    <Input
                      value={newVehicle.license_plate}
                      onChange={e => setNewVehicle(v => ({ ...v, license_plate: e.target.value }))}
                      placeholder="Plate #"
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={handleAddVehicle}
                  className="btn btn-primary btn-xs w-full"
                >
                  Save Vehicle to List
                </button>
              </div>
            )}

            <div className="space-y-2">
              {vehiclesList.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No vehicles attached.</p>
              ) : (
                vehiclesList.map((v, idx) => (
                  <div key={v.vehicle_id || idx} className="flex items-center justify-between p-2 bg-white/[0.01] rounded-xl border border-white/5">
                    <div>
                      <p className="text-xs font-bold text-white">{v.year} {v.make} {v.model}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Plate: {v.license_plate || '—'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVehicle(v.vehicle_id)}
                      className="text-red-500 hover:text-red-400 text-xs font-bold px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
            <input type="hidden" name="vehicles_data" value={JSON.stringify(vehiclesList)} />
          </div>
        </div>
      </div>
  );
}

// ─────────────────────────────────────────────────────────
//  MODAL → API (default submit when page does not pass onSave)
// ─────────────────────────────────────────────────────────
async function defaultModalSubmit(type, modalData, values, { role, user, toast, navigate }, selectedFiles = []) {
  const uid = user?.id;
  const dispatchRefresh = () => window.dispatchEvent(new CustomEvent('vktori:entities-changed'));

  if (values) {
    if (values.phone) values.phone = formatUSPhone(values.phone);
    if (values.retaining_client_phone) values.retaining_client_phone = formatUSPhone(values.retaining_client_phone);
    if (values.emergency_contact_phone) values.emergency_contact_phone = formatUSPhone(values.emergency_contact_phone);
    if (values.adjuster_phone) values.adjuster_phone = formatUSPhone(values.adjuster_phone);
    if (values.employer_phone) values.employer_phone = formatUSPhone(values.employer_phone);
  }

  switch (type) {
    case 'add-lead': {
      if (!uid) throw new Error('Not signed in.');
      const full_name = [values.firstName, values.middleName, values.lastName].filter(Boolean).map(s => s.trim()).join(' ');
      let practice = values.matterType || 'General';
      if (practice === 'other') {
        practice = (values.custom_matter_type || '').trim();
      }
      await api.leads.create({
        full_name,
        email: values.email,
        phone: values.phone || null,
        source: values.source || 'Direct',
        matter_type: practice,
        practice_area: practice,
        message: values.message || null,
        notes: values.notes || null,
        created_by_user_id: uid,
        status: 'new',
      });
      toast('Lead added successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'add-client': {
      if (!uid) throw new Error('Not signed in.');
      const party_type = values.party_type || 'Individual';
      const party_role = values.party_role === 'Other'
        ? (values.custom_party_role || '').trim()
        : (values.party_role || 'Client');
      const full_name = party_type === 'Organization' 
        ? values.organization_name?.trim() 
        : [values.firstName, values.middleName, values.lastName].filter(Boolean).map(s => s.trim()).join(' ');
        
      const address_line_1 = values.address_line_1 || null;
      const address_line_2 = values.address_line_2 || null;
      const city = values.city || null;
      const state = values.state || null;
      const postal_code = values.postal_code || null;
      const country = values.country || 'United States';
      
      const computedAddress = address_line_1
        ? `${address_line_1}${address_line_2 ? ', ' + address_line_2 : ''}, ${city || ''}, ${state || ''} ${postal_code || ''}${country && country !== 'United States' ? ', ' + country : ''}`.trim().replace(/,\s*,/g, ',').replace(/,\s*$/, '')
        : null;

      await api.clients.create({
        full_name,
        middle_name: values.middleName || null,
        email: values.email,
        phone: values.phone || null,
        notes: values.notes || null,
        party_type,
        party_role,
        organization_name: values.organization_name || null,
        contact_first_name: values.contact_first_name || null,
        contact_middle_name: values.contact_middle_name || null,
        contact_last_name: values.contact_last_name || null,
        business_address: party_type === 'Organization' ? computedAddress : null,
        home_address: party_type !== 'Organization' ? computedAddress : null,
        address_line_1,
        address_line_2,
        city,
        state,
        postal_code,
        opposing_party_name: values.opposing_party_name || null,
        opposing_law_firm: values.opposing_law_firm || null,
        opposing_counsel_name: values.opposing_counsel_name || null,
        date_of_birth: values.date_of_birth ? new Date(values.date_of_birth).toISOString() : null,
        government_id: values.government_id || null,
        insurance_number: values.insurance_number || null,
        status: values.status || 'active',
        is_portal_enabled: (values.status || 'active') === 'active',
        referral_source: values.referral_source || null,
        referral_detail: values.referral_detail || null,
      });
      toast('Client added successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'edit-client': {
      const id = modalData?.id ?? modalData?.raw?.id;
      if (!id) throw new Error('Missing client.');
      const party_type = values.party_type || 'Individual';
      const party_role = values.party_role === 'Other'
        ? (values.custom_party_role || '').trim()
        : (values.party_role || 'Client');
      const full_name = party_type === 'Organization' 
        ? values.organization_name?.trim() 
        : [values.firstName, values.middleName, values.lastName].filter(Boolean).map(s => s.trim()).join(' ');
      const st = (values.status || 'active').toLowerCase();
      const is_portal_enabled = st === 'active';
      const address_line_1 = values.address_line_1 || null;
      const address_line_2 = values.address_line_2 || null;
      const city = values.city || null;
      const state = values.state || null;
      const postal_code = values.postal_code || null;
      const country = values.country || 'United States';
      
      const computedAddress = address_line_1
        ? `${address_line_1}${address_line_2 ? ', ' + address_line_2 : ''}, ${city || ''}, ${state || ''} ${postal_code || ''}${country && country !== 'United States' ? ', ' + country : ''}`.trim().replace(/,\s*,/g, ',').replace(/,\s*$/, '')
        : null;

       await api.clients.update(id, {
        full_name,
        middle_name: values.middleName || null,
        contact_middle_name: values.contact_middle_name || null,
        email: values.email,
        phone: values.phone || null,
        notes: values.notes || null,
        is_portal_enabled,
        party_type,
        party_role,
        organization_name: values.organization_name || null,
        contact_first_name: values.contact_first_name || null,
        contact_last_name: values.contact_last_name || null,
        business_address: party_type === 'Organization' ? computedAddress : null,
        home_address: party_type !== 'Organization' ? computedAddress : null,
        address_line_1,
        address_line_2,
        city,
        state,
        postal_code,
        opposing_party_name: values.opposing_party_name || null,
        opposing_law_firm: values.opposing_law_firm || null,
        opposing_counsel_name: values.opposing_counsel_name || null,
        date_of_birth: values.date_of_birth ? new Date(values.date_of_birth).toISOString() : null,
        government_id: values.government_id || null,
        insurance_number: values.insurance_number || null,
        status: st,
        referral_source: values.referral_source || null,
        referral_detail: values.referral_detail || null,
      });
      toast('Client updated successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'add-case': {
      if (!uid) throw new Error('Not signed in.');
      let clientIds = values.clientIds || [];
      if (typeof clientIds === 'string' || typeof clientIds === 'number') {
        clientIds = [clientIds];
      }
      if (values.existing_client_select || values.selected_client_id) {
        const selId = parseInt(String(values.existing_client_select || values.selected_client_id), 10);
        if (Number.isFinite(selId) && !clientIds.includes(selId)) {
          clientIds = [selId, ...clientIds];
        }
      }
      const inlineParties = values.inlineParties || [];
      const partiesData = values.parties_data || [];
      const hasParties = 
        (Array.isArray(clientIds) && clientIds.length > 0) ||
        (Array.isArray(inlineParties) && inlineParties.length > 0) ||
        (Array.isArray(partiesData) && partiesData.length > 0) ||
        Boolean((values.retaining_client_name || '').trim() || (values.retaining_client_email || '').trim());

      if (!hasParties) {
        throw new Error('Select at least one existing party or add a new party.');
      }
      let assigned_lawyer_id = values.lawyerId || values.assigned_lawyer_id ? parseInt(values.lawyerId || values.assigned_lawyer_id, 10) : null;
      if (role === 'lawyer' && (!assigned_lawyer_id || assigned_lawyer_id !== uid)) {
        throw new Error('Lawyer can only create matters assigned to self');
      }
      if (!Number.isFinite(assigned_lawyer_id)) assigned_lawyer_id = null;
      let practice = values.practice_area || values.matterType || values.type || 'General';
      if (practice === 'other') {
        practice = (values.custom_matter_type || '').trim();
      }
      const filed = values.filed || values.openedAt || values.initial_filing_date;
      await api.matters.create({
        title: values.title || 'Untitled Matter',
        client_id: clientIds[0] || (values.existing_client_select ? parseInt(values.existing_client_select, 10) : null),
        clientIds: clientIds,
        inlineParties: inlineParties,
        parties_data: values.parties_data || [],
        vehicles_data: values.vehicles_data || [],
        intake_answers: values.intake_answers || null,
        retaining_client_name: values.retaining_client_name || null,
        retaining_client_email: values.retaining_client_email || null,
        retaining_client_phone: values.retaining_client_phone || null,
        retaining_client_address: values.retaining_client_address || null,
        retaining_client_dob: values.retaining_client_dob || null,
        retaining_client_gov_id: values.retaining_client_gov_id || null,
        fee_type: values.fee_type || values.billing_type || null,
        hourly_rate: values.hourly_rate || null,
        contingency_rate: values.contingency_rate || null,
        retainer_amount: values.retainer_amount || null,
        lead_source: values.lead_source || null,
        assigned_lawyer_id,
        practice_area: practice,
        matter_type: practice,
        opposing_party_name: values.opposingParty === 'Other' ? values.custom_opposing_party : (values.opposingParty || null),
        description: values.description || null,
        opened_at: filed ? new Date(filed).toISOString() : null,
        status: values.status || 'pending',
        priority: values.priority || 'medium',
        initial_filing_date: values.initial_filing_date || null,
        date_of_loss: values.date_of_loss || null,
        sol_term: values.sol_term || '2_years',
        sol_date: values.sol_term === 'custom' ? (values.sol_date || null) : null,
        tracking_type: values.tracking_type || 'court',
        trial_date: values.trial_date || null,
        case_number: values.case_number || null,
        judge_name: values.judge_name || null,
        court_name: values.court_name || null,
        court_address: values.court_address || null,
        court_county: values.court_county || null,
        court_type: values.court_type || 'state',
        federal_court: values.federal_court || null,
        court_department: values.court_department || null,
        hearing_time: values.hearing_time || null,
        case_value: values.case_value ? parseFloat(values.case_value) : null,
        created_by_user_id: uid,
        custom_fields: Object.keys(values).filter(k => k.startsWith('cf_')).map(k => ({
          field_id: k.replace('cf_', ''),
          value: values[k]
        }))
      });
      toast('Matter created!', 'success');
      dispatchRefresh();
      if (role === 'admin') navigate('/admin/matters');
      else if (role === 'lawyer') navigate('/lawyer/matters');
      break;
    }
    case 'create-invoice': {
      if (!uid) throw new Error('Not signed in.');
      const matter_id = parseInt(String(values.matterId || modalData?.matterId || ''), 10);
      if (!Number.isFinite(matter_id)) throw new Error('Select a matter.');
      const parsedAmount = parseFloat(values.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Please enter a valid positive invoice amount greater than $0.00.');
      }
      const invNum = (values.invoice_number && values.invoice_number.trim()) || `INV-${Date.now()}`;
      let description = values.description || null;
      if (values.memo && values.memo.trim()) {
        description = description ? `${description}\n\n[Payment Terms & Memo]: ${values.memo.trim()}` : values.memo.trim();
      }
      await api.billing.createInvoice({
        matter_id,
        invoice_number: invNum,
        description,
        amount: Math.abs(parsedAmount),
        due_date: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        status: values.status || 'due',
        created_by_user_id: uid,
      });
      toast('Invoice created successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'add-expense': {
      if (!uid) throw new Error('Not signed in.');
      const vendor = (values.vendor || '').trim();
      if (!vendor) throw new Error('Enter vendor or payee name.');
      const amount = parseFloat(values.amount);
      if (isNaN(amount) || amount <= 0) throw new Error('Enter a valid positive amount.');

      await api.expenses.create({
        vendor,
        matter_id: values.matter_id ? parseInt(values.matter_id, 10) : null,
        category: values.category || 'General',
        amount,
        date: values.date ? new Date(values.date).toISOString() : new Date().toISOString(),
        status: values.status || 'approved',
        description: values.description || null,
      });

      toast('Expense recorded successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'trust-deposit': {
      if (!uid) throw new Error('Not signed in.');
      await api.billing.depositTrust({
        client_id: values.client_id,
        matter_id: values.matter_id || null,
        amount: values.amount,
        reference: values.reference,
        notes: values.notes,
      });
      toast('Trust deposit recorded!', 'success');
      dispatchRefresh();
      break;
    }
    case 'apply-trust': {
      if (!uid) throw new Error('Not signed in.');
      await api.billing.applyTrustToInvoice({
        trust_account_id: values.trust_account_id,
        invoice_id: values.invoice_id,
        amount: values.amount,
      });
      toast('Funds applied successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'add-document': {
      if (!uid) throw new Error('Not signed in.');
      const matter_id = parseInt(String(values.matterId || modalData?.matterId || ''), 10);
      if (!Number.isFinite(matter_id)) throw new Error('Select a matter.');
      
      const fileInput = document.querySelector('input[name="file"]');
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        throw new Error('Please select files to upload.');
      }
      
      const form = new FormData();
      const metadataList = [];
      const category = values.docCategory === 'other'
        ? (values.custom_doc_category || '').trim()
        : (values.docCategory || 'General');
      const visibility = role === 'lawyer' ? 'client_shared' : role === 'client' ? 'client_visible' : 'internal';
      
      for (let i = 0; i < fileInput.files.length; i++) {
        const file = fileInput.files[i];
        form.append('files', file);
        
        let folder_path = null;
        if (file.webkitRelativePath) {
          const parts = file.webkitRelativePath.split('/');
          if (parts.length > 1) {
            folder_path = parts.slice(0, -1).join('/');
          }
        }
        
        metadataList.push({
          matter_id,
          category,
          visibility,
          folder_path,
          uploaded_by_user_id: String(uid),
        });
      }
      
      form.append('metadata', JSON.stringify(metadataList));
      const res = await api.documents.createBulk(form);
      
      const results = res.data;
      const successes = results.filter(r => r.status === 'success').length;
      const failures = results.length - successes;
      
      if (failures > 0) {
        toast(`Uploaded ${successes} files, ${failures} failed.`, 'warning');
      } else {
        toast(`Successfully uploaded ${successes} files!`, 'success');
      }
      
      dispatchRefresh();
      break;
    }
    case 'edit-case': {
      if (!uid) throw new Error('Not signed in.');
      const matterId = modalData?.numericId ?? modalData?.matterId ?? modalData?.id;
      const idInt = parseInt(String(matterId), 10);
      if (!Number.isFinite(idInt)) throw new Error('Missing matter.');
      let apiStatus = (values.status || 'active').toLowerCase();
      if (apiStatus === 'closed') apiStatus = 'completed';
      let practice = values.practice_area || values.type || modalData?.practice_area || modalData?.type || 'General';
      if (practice === 'other') {
        practice = (values.custom_matter_type || '').trim();
      }
      let matterTypeVal = values.matter_type !== undefined ? values.matter_type : (modalData?.matter_type || practice);
      const mergedIntake = {
        ...(typeof modalData?.intake_answers === 'object' && modalData?.intake_answers ? modalData.intake_answers : {}),
        ...(typeof values.intake_answers === 'object' && values.intake_answers ? values.intake_answers : {})
      };

      await api.matters.update(idInt, {
        title: values.title,
        parties_data: typeof values.parties_data === 'string' ? JSON.parse(values.parties_data) : (values.parties_data || undefined),
        vehicles_data: typeof values.vehicles_data === 'string' ? JSON.parse(values.vehicles_data) : (values.vehicles_data || undefined),
        intake_answers: Object.keys(mergedIntake).length > 0 ? mergedIntake : undefined,
        opposing_party_name: values.opposingParty === 'Other' ? values.custom_opposing_party : (values.opposingParty || values.opposing_party_name || null),
        assigned_lawyer_id: values.assigned_lawyer_id ? parseInt(values.assigned_lawyer_id, 10) : undefined,
        status: apiStatus,
        matter_type: matterTypeVal || practice,
        practice_area: practice,
        priority: values.priority || 'medium',
        next_hearing: values.nextHearing || null,
        initial_filing_date: values.initial_filing_date || null,
        date_of_loss: values.date_of_loss || null,
        sol_term: values.sol_term || undefined,
        sol_date: values.sol_term === 'custom' ? (values.sol_date || null) : null,
        tracking_type: values.tracking_type || undefined,
        trial_date: values.trial_date || null,
        case_number: values.case_number || null,
        judge_name: values.judge_name || null,
        court_name: values.court_name || null,
        court_address: values.court_address || null,
        court_county: values.court_county || null,
        court_type: values.court_type || 'state',
        federal_court: values.federal_court || null,
        court_department: values.court_department || null,
        hearing_time: values.hearing_time || null,
        case_value: values.case_value ? parseFloat(values.case_value) : null,
        updated_by_user_id: uid,
        retaining_client_name: values.retaining_client_name,
        retaining_client_email: values.retaining_client_email,
        retaining_client_phone: values.retaining_client_phone,
        retaining_client_address: values.retaining_client_address,
        retaining_client_dob: values.retaining_client_dob ? values.retaining_client_dob : null,
        retaining_client_gov_id: values.retaining_client_gov_id,
        custom_fields: Object.keys(values).filter(k => k.startsWith('cf_')).map(k => ({
          field_id: k.replace('cf_', ''),
          value: values[k]
        }))
      });
      toast('Matter updated successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'compose-email': {
      if (!uid) throw new Error('Not signed in.');
      const mid = values.matterId || modalData?.matterId;
      if (!mid) throw new Error('Select a related matter, or open a matter and use Send Email from that workspace.');
      const visibility = values.visibility === 'Shared' || values.visibility === 'client_shared' ? 'client_shared' : 'internal';
      
      let messageBody = `To: ${values.to || ''}\n`;
      if (values.cc) messageBody += `Cc: ${values.cc}\n`;
      if (values.bcc) messageBody += `Bcc: ${values.bcc}\n`;
      messageBody += `Subject: ${values.subject || ''}\n\n${values.message || ''}`;

      if (selectedFiles && selectedFiles.length > 0) {
        const form = new FormData();
        const metadataList = [];
        for (const file of selectedFiles) {
          form.append('files', file);
          metadataList.push({
            matter_id: parseInt(String(mid), 10),
            category: 'Email Attachment',
            visibility: visibility,
            uploaded_by_user_id: String(uid),
          });
        }
        form.append('metadata', JSON.stringify(metadataList));
        
        try {
          const res = await api.documents.createBulk(form);
          const results = res.data || [];
          const successes = results.filter(r => r.status === 'success');
          
          if (successes.length > 0) {
            messageBody += '\n\nAttachments:';
            for (const doc of successes) {
              messageBody += `\n[attachment:${doc.document?.id}:${doc.document?.original_name || doc.document?.file_name}]`;
            }
          }
          
          const failures = results.length - successes.length;
          if (failures > 0) {
            toast(`Uploaded ${successes.length} attachments, ${failures} failed.`, 'warning');
          }
        } catch (uploadErr) {
          console.error('Attachment upload failed:', uploadErr);
          toast('Failed to upload some attachments, but email logging will proceed.', 'warning');
        }
      }

      await api.communications.create({
        matter_id: String(mid).startsWith('act_') ? null : parseInt(String(mid), 10),
        activity_id: String(mid).startsWith('act_') ? parseInt(String(mid).replace('act_', ''), 10) : null,
        communication_type: 'email_log',
        visibility,
        message_body: messageBody,
        to: values.to ? values.to.split(',').map(s => s.trim()).filter(Boolean) : [],
        cc: values.cc ? values.cc.split(',').map(s => s.trim()).filter(Boolean) : [],
        bcc: values.bcc ? values.bcc.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      toast('Email record logged on matter.', 'success');
      dispatchRefresh();
      break;
    }
    case 'add-note': {
      if (!uid) throw new Error('Not signed in.');
      const mid = values.matterId || modalData?.matterId;
      if (!mid) throw new Error('Open a matter to add notes.');
      const visibility = values.visibility === 'Shared' || values.visibility === 'client_shared' ? 'client_shared' : 'internal';
      await api.communications.create({
        matter_id: String(mid).startsWith('act_') ? null : parseInt(String(mid), 10),
        activity_id: String(mid).startsWith('act_') ? parseInt(String(mid).replace('act_', ''), 10) : null,
        communication_type: 'note',
        visibility,
        message_body: `${values.title || 'Note'}\n\n${values.content || ''}`,
      });
      toast('Matter note added successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'log-call': {
      if (!uid) throw new Error('Not signed in.');
      const mid = values.matterId || modalData?.matterId;
      if (!mid) throw new Error('Open a matter to log a call.');
      const map = { Call: 'call_log', Meeting: 'meeting_log', Video: 'call_log' };
      const communication_type = map[values.type] || 'call_log';
      const visibility = values.visibility === 'Shared' || values.visibility === 'client_shared' ? 'client_shared' : 'internal';
      await api.communications.create({
        matter_id: String(mid).startsWith('act_') ? null : parseInt(String(mid), 10),
        activity_id: String(mid).startsWith('act_') ? parseInt(String(mid).replace('act_', ''), 10) : null,
        communication_type,
        visibility,
        message_body: `[${values.direction || ''}] ${values.subject || ''}\n\n${values.notes || ''}`,
      });
      toast('Communication logged successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'add-event': {
      if (!uid) throw new Error('Not signed in.');
      
      let reminderDate = null;
      if (values.reminderOffset) {
        const evDateStr = values.date || getPacificToday().dateStr;
        const evTimeStr = values.time || '09:00';
        const eventUtc = pacificToUTC(evDateStr, evTimeStr);
        const offsetMap = {
          '1_hour': 60 * 60 * 1000,
          '1_day': 24 * 60 * 60 * 1000,
          '3_days': 3 * 24 * 60 * 60 * 1000,
          '7_days': 7 * 24 * 60 * 60 * 1000
        };
        if (values.reminderOffset === 'same_day') {
          reminderDate = pacificToUTC(evDateStr, '09:00:00');
        } else if (offsetMap[values.reminderOffset] && eventUtc) {
          reminderDate = new Date(eventUtc.getTime() - offsetMap[values.reminderOffset]);
        } else if (values.reminderOffset === 'custom' && values.customReminderDate) {
          reminderDate = new Date(values.customReminderDate);
        }
      }

      const eventPayload = {
        title: values.title || 'Event',
        date: values.date || getPacificToday().dateStr,
        time: values.time || null,
        timezone: PACIFIC_TIMEZONE,
        matter_id: values.matterId && !String(values.matterId).startsWith('act_') ? values.matterId : null,
        activity_id: values.matterId && String(values.matterId).startsWith('act_') ? parseInt(String(values.matterId).replace('act_', ''), 10) : null,
        type: values.eventType === 'other'
          ? (values.custom_event_type || '').toLowerCase().replace(/ /g, '_')
          : (values.eventType || 'meeting').toLowerCase().replace(/ /g, '_'),
        description: values.notes || null,
        reminder_date: reminderDate ? reminderDate.toISOString() : null,
        create_task: values.createTask === 'on' || values.createTask === true,
        court_name: values.court_name || null,
        court_room: values.court_room || null,
        judge_name: values.judge_name || null,
        appearance_type: values.appearance_type === 'other'
          ? (values.custom_appearance_type || '').trim()
          : (values.appearance_type || null),
        is_court_event: values.is_court_event === 'on' || values.is_court_event === true,
        attendees: [
          ...(Array.isArray(values.internalAttendees) ? values.internalAttendees : [values.internalAttendees]).filter(Boolean).map(id => ({ user_id: id })),
          ...(values.externalAttendees || '').split(',').map(e => e.trim()).filter(Boolean).map(email => ({ email }))
        ]
      };

      const targetId = data?.raw_id || data?.id;
      if (targetId) {
        await api.calendar.update(targetId, eventPayload);
        toast('Event updated successfully!', 'success');
      } else {
        await api.calendar.create(eventPayload);
        toast('Event added to calendar!', 'success');
      }
      dispatchRefresh();
      break;
    }
    case 'add-folder': {
      if (!uid) throw new Error('Not signed in.');
      await api.folders.create({
        name: values.name,
        matterId: values.matterId || null,
        accessLevel: values.accessLevel || 'Public'
      });
      toast('Folder created successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'add-user': {
      if (!uid) throw new Error('Not signed in.');
      const fullName = [values.firstName, values.middleName, values.lastName].filter(Boolean).map(s => s.trim()).join(' ');
      const role = String(values.roleLabel || '').toLowerCase();

      if (role === 'client') {
        // Create Party (this backend service already creates a User with 'client' role)
        await api.clients.create({
          full_name: fullName,
          email: values.email,
          phone: values.phone || null,
          password: values.password || undefined,
        });
        toast(`Party account created for ${fullName}`, 'success');
      } else {
        // Create Staff User (Admin/Lawyer)
        const specialtyVal = values.specialty === 'other'
          ? (values.custom_specialty || '').trim()
          : (values.specialty || null);

        await api.users.create({
          full_name: fullName,
          email: values.email,
          role: role,
          password: values.password || '1234',
          practice_focus: specialtyVal,
        });
        toast(`${values.roleLabel} account created for ${fullName}`, 'success');
      }
      dispatchRefresh();
      break;
    }
    case 'reset-password': {
      if (!uid) throw new Error('Not signed in.');
      const id = modalData?.id || modalData?.raw?.id;
      if (!id) throw new Error('Missing user ID.');
      if (!values.newPassword) throw new Error('Password cannot be empty.');
      await api.users.resetPassword(id, { newPassword: values.newPassword });
      toast('Password reset successfully!', 'success');
      break;
    }
    case 'add-task': {
      const taskTypeVal = values.task_type === 'other'
        ? (values.custom_task_type || '').trim()
        : (values.task_type || 'general');
      const mid = values.matterId || modalData?.matterId;
      await api.tasks.create({
        matter_id: mid && !String(mid).startsWith('act_') ? mid : null,
        activity_id: mid && String(mid).startsWith('act_') ? parseInt(String(mid).replace('act_', ''), 10) : null,
        title: values.title,
        description: values.description,
        priority: values.priority || 'medium',
        task_type: taskTypeVal,
        due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
        assigned_user_id: values.assigned_user_id || null,
      });
      toast('Task created successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'add-template': {
      if (!uid) throw new Error('Not signed in.');
      const catVal = values.category === 'other'
        ? (values.custom_category || '').trim()
        : (values.category || 'court_form');
      const paVal = values.practice_area === 'other'
        ? (values.custom_practice_area || '').trim()
        : (values.practice_area || null);
      await api.templates.create({
        title: values.title,
        content: values.content,
        category: catVal,
        practice_area: paVal,
        matter_type: paVal,
        description: values.description || null,
        is_active: values.is_active !== 'inactive',
      });
      toast('Template created successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'edit-template': {
      if (!uid) throw new Error('Not signed in.');
      const catVal = values.category === 'other'
        ? (values.custom_category || '').trim()
        : (values.category || 'court_form');
      const paVal = values.practice_area === 'other'
        ? (values.custom_practice_area || '').trim()
        : (values.practice_area || null);
      
      const templateId = modalData?.id;
      if (!templateId) throw new Error('Missing template ID.');

      await api.templates.update(templateId, {
        title: values.title,
        content: values.content,
        category: catVal,
        practice_area: paVal,
        matter_type: paVal,
        description: values.description || null,
        is_active: values.is_active !== 'inactive',
      });
      toast('Template updated successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'use-template': {
      if (!uid) throw new Error('Not signed in.');
      const templateId = modalData?.id;
      if (!templateId) throw new Error('Missing template.');

      // Use targetMatterId if provided (from the matter detail page)
      const targetMatterId = modalData.targetMatterId;
      if (!targetMatterId) throw new Error('Missing target matter.');

      await api.templates.cloneToMatter({
        template_id: templateId,
        matter_id: Number(targetMatterId)
      });

      toast('New draft created from template!', 'success');
      dispatchRefresh();
      break;
    }
    case 'edit-draft': {
      if (!uid) throw new Error('Not signed in.');
      const draftId = modalData?.id || modalData?.raw?.id;
      if (!draftId) throw new Error('Missing draft.');
      
      const catVal = values.category === 'other'
        ? (values.custom_category || '').trim()
        : (values.category || 'General');

      let contentToSave = values.content || '';
      const isLetter = (catVal || '').toLowerCase() === 'letter' || (catVal || '').toLowerCase().includes('letter') || (catVal || '').toLowerCase() === 'demand letter';

      if (isLetter && values.delivery_method) {
        const meta = {
          delivery_method: values.delivery_method,
          delivery_email: values.delivery_email || '',
          recipient_name: values.recipient_name || '',
          recipient_address: values.recipient_address || '',
        };
        const stripped = contentToSave.replace(/<!--\s*LETTER_META:[\s\S]*?-->\s*/gi, '').trim();
        contentToSave = `<!--LETTER_META:${JSON.stringify(meta)}-->\n${stripped}`;
      }

      await api.drafts.update(draftId, {
        title: values.title,
        category: catVal,
        content: contentToSave,
      });

      toast('Draft updated successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'conflict-check': {
      if (!uid) throw new Error('Not signed in.');
      const res = await api.conflicts.check({
        prospective_client_name: values.prospectiveClient,
        opposing_party_name: values.opposingParty,
      });
      if (res.data?.conflict) {
        toast(`⚠️ Conflict found! ${res.data.matches.length} potential matches detected.`, 'error');
      } else {
        toast('✅ No conflict found. Safe to proceed.', 'success');
      }
      break;
    }
    case 'add-practice-area': {
      await api.practiceAreas.create({
        name: values.name,
        is_active: values.status !== 'inactive'
      });
      toast('Practice Area created successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'edit-practice-area': {
      const id = modalData?.id;
      if (!id) throw new Error('Missing ID');
      await api.practiceAreas.update(id, {
        name: values.name,
        is_active: values.status !== 'inactive'
      });
      toast('Practice Area updated!', 'success');
      dispatchRefresh();
      break;
    }
    case 'add-custom-field': {
      await api.customFields.create({
        name: values.name,
        type: values.type,
        options: values.options ? values.options.split(',').map(s => s.trim()) : null,
        is_active: values.status !== 'inactive'
      });
      toast('Custom Field created successfully!', 'success');
      dispatchRefresh();
      break;
    }
    case 'edit-custom-field': {
      const id = modalData?.id;
      if (!id) throw new Error('Missing ID');
      await api.customFields.update(id, {
        name: values.name,
        type: values.type,
        options: values.options ? values.options.split(',').map(s => s.trim()) : null,
        is_active: values.status !== 'inactive'
      });
      toast('Custom Field updated!', 'success');
      dispatchRefresh();
      break;
    }
    case 'browse-templates': {
      // This is a selection modal, handled by onSave in AdminPages if needed, 
      // but here we just need it to be a valid case for the switch.
      break;
    }
    case 'view-event': {
      const eventId = modalData?.raw_id || modalData?.id;
      if (eventId) {
        await api.calendar.acknowledge(eventId);
        toast('Calendar Event acknowledged.', 'success');
        dispatchRefresh();
      } else {
        toast('This event is not linked to a database record.', 'info');
      }
      break;
    }
    case 'view-invoice':
      break;
    case 'pay-invoice': {
      const dbId = modalData?.dbId;
      if (dbId) {
        await api.billing.payInvoice(dbId, {
          payment_method: 'manual',
          payment_reference: values.payment_reference || 'internal-manual',
        });
        toast('Payment marked as paid.', 'success');
        dispatchRefresh();
      } else {
        toast('This invoice is not linked to a database record.', 'info');
      }
      break;
    }
    default:
      toast('This action is not wired to the API yet.', 'info');
  }
}

function ViewInvoicePdfEmbed({ dbId, toast }) {
  const [src, setSrc] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const urlRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!dbId) {
      setSrc(null);
      setLoadErr(null);
      return undefined;
    }
    let cancelled = false;
    setSrc(null);
    setLoadErr(null);
    (async () => {
      try {
        const { blob } = await api.billing.downloadInvoicePdf(dbId);
        if (cancelled) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const u = URL.createObjectURL(blob);
        urlRef.current = u;
        setSrc(u);
      } catch (e) {
        if (!cancelled) {
          const msg = e.message || 'Failed to load PDF';
          setLoadErr(msg);
          toast(msg, 'error');
        }
      }
    })();
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbId]);

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  const handleDownload = async () => {
    try {
      const { blob, filename } = await api.billing.downloadInvoicePdf(dbId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast('Failed to download invoice', 'error');
    }
  };

  if (!dbId) return null;
  if (loadErr) return <p className="text-[12px] text-red-600 mt-3">{loadErr}</p>;
  if (!src) return <p className="text-[12px] text-slate-500 mt-3">Loading PDF…</p>;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[13px] font-700 text-slate-900">Live Preview</h4>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[12px] font-600 hover:bg-slate-50 transition-all shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>
            Print
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-[12px] font-600 hover:bg-primary-700 transition-all shadow-sm shadow-primary-500/20">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Download
          </button>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xl shadow-slate-200/50 bg-slate-100 p-2 sm:p-4 flex flex-col">
        <div className="sm:hidden mb-2 flex items-center justify-between bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[12px]">
          <span>Invoice PDF Ready</span>
          <a href={src} target="_blank" rel="noopener noreferrer" className="font-600 text-primary-400 underline">👁️ Open PDF</a>
        </div>
        <object data={`${src}#toolbar=1`} type="application/pdf" className="w-full h-[min(540px,65vh)] bg-white rounded-lg shadow-inner ring-1 ring-slate-900/5">
          <iframe ref={iframeRef} title="Invoice PDF" src={src} className="w-full h-full border-none" />
        </object>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  MODAL FORM SKELETON
// ─────────────────────────────────────────────────────────
function ModalFormSkeleton({ wide = true }) {
  return (
    <div className="space-y-4 animate-pulse p-2">
      <div className="h-6 bg-white/10 rounded-xl w-1/3 mb-4" />
      <div className={`grid ${wide ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
        <div className="space-y-2">
          <div className="h-3 bg-white/10 rounded-lg w-1/4" />
          <div className="h-10 bg-white/5 rounded-xl border border-white/10" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-white/10 rounded-lg w-1/4" />
          <div className="h-10 bg-white/5 rounded-xl border border-white/10" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-white/10 rounded-lg w-1/3" />
          <div className="h-10 bg-white/5 rounded-xl border border-white/10" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-white/10 rounded-lg w-1/3" />
          <div className="h-10 bg-white/5 rounded-xl border border-white/10" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 bg-white/10 rounded-lg w-1/5" />
        <div className="h-24 bg-white/5 rounded-xl border border-white/10" />
      </div>
      <div className="flex items-center justify-center gap-2 pt-4 text-xs text-[#8a94a6]">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#38bdf8]" />
        <span>Loading form configuration...</span>
      </div>
    </div>
  );
}

function AdaptiveSection({ 
  id,
  title, 
  icon = '📋', 
  badge, 
  ruleConfig, 
  formValues = {}, 
  practiceArea,
  matterType,
  visible,
  children, 
  description,
  className = ''
}) {
  const currentPracticeArea = practiceArea || formValues.practice_area || formValues.type;
  const currentMatterType = matterType || formValues.matter_type;
  
  // Practice area + Matter type driven visibility evaluation
  const isPracticeAreaVisible = id && currentPracticeArea 
    ? isSectionVisibleForMatter(id, currentPracticeArea, currentMatterType)
    : true;

  const { isVisible, isRequired, isDisabled } = evaluateSectionRules(ruleConfig, formValues);
  const finalVisible = (visible !== undefined ? visible : isVisible) && isPracticeAreaVisible;

  if (!finalVisible) return null;

  return (
    <div className={`p-5 rounded-xl border border-white/10 bg-white/[0.03] space-y-4 transition-all animate-fade-in ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-2">
            <span>{icon} {title}</span>
          </h4>
          {badge && (
            <span className="text-[10px] bg-[#0057c7]/20 text-[#38bdf8] border border-[#0057c7]/40 px-2 py-0.5 rounded-full font-bold uppercase">
              {badge}
            </span>
          )}
          {isRequired && (
            <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
              REQUIRED
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {currentPracticeArea && (
            <span className="text-[9px] text-[#38bdf8] bg-[#0057c7]/10 border border-[#0057c7]/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {currentPracticeArea}
            </span>
          )}
          {currentMatterType && (
            <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {currentMatterType}
            </span>
          )}
        </div>
      </div>

      {description && (
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      )}

      {isDisabled ? (
        <fieldset disabled className="space-y-4 pt-1 border-none p-0 m-0">
          {children}
        </fieldset>
      ) : (
        <div className="space-y-4 pt-1 border-none p-0 m-0">
          {children}
        </div>
      )}
    </div>
  );
}

const CORE_SCREENING_MAP = {
  vehicle: {
    stateKey: 'vehiclesInvolved',
    title: 'Vehicles Involved?',
    description: 'Vehicle Management module'
  },
  passenger: {
    stateKey: 'passengersInvolved',
    title: 'Passengers Present?',
    description: 'Passenger Management module'
  },
  medical: {
    stateKey: 'injured',
    title: 'Physical Injury?',
    description: 'Medical & Treatment module'
  },
  insurance: {
    stateKey: 'insuranceInvolved',
    title: 'Insurance Active?',
    description: 'Insurance Adjuster module'
  },
  witness: {
    stateKey: 'witnessInvolved',
    title: 'Witness Present?',
    description: 'Witness Management module'
  },
  employer: {
    stateKey: 'commercialVehicle',
    title: 'Commercial Vehicle?',
    description: 'Employer & Carrier module'
  },
  property_damage: {
    stateKey: 'propertyDamage',
    title: 'Property Damage?',
    description: 'Property Details module'
  },
  police: {
    stateKey: 'policeReportAvailable',
    title: 'Police Report Available?',
    description: 'Police & Investigation module'
  }
};

const DEFAULT_CORE_MODULES = [
  { key: 'vehicle', title: 'Vehicle Information', is_core: true },
  { key: 'passenger', title: 'Passenger & Seating Info', is_core: true },
  { key: 'medical', title: 'Medical & Treatment', is_core: true },
  { key: 'insurance', title: 'Insurance Adjuster & Policy', is_core: true },
  { key: 'witness', title: 'Eyewitness Management', is_core: true },
  { key: 'employer', title: 'Employer & Lost Wage', is_core: true },
  { key: 'property_damage', title: 'Property Damage', is_core: true },
  { key: 'police', title: 'Police & Investigation', is_core: true }
];

// ─────────────────────────────────────────────────────────
//  VIEW EVENT MODAL BODY (TITAN CALENDAR COMPACT STYLE)
// ─────────────────────────────────────────────────────────
function ViewEventModalBody({ data }) {
  const [guestsExpanded, setGuestsExpanded] = useState(true);

  let guests = [];
  if (Array.isArray(data?.attendees) && data.attendees.length > 0) {
    guests = data.attendees.map(a => ({
      email: a.email || a.user?.email || (typeof a === 'string' ? a : ''),
      name: a.name || a.user?.full_name || (a.email ? a.email.split('@')[0] : 'Guest'),
      status: a.status || 'needs-action',
      isOrganizer: Boolean(a.isOrganizer || (a.is_optional === false && a.status === 'accepted') || (a.email && a.email.toLowerCase().includes('casemanager')))
    })).filter(g => g.email);
  }

  const going = guests.filter(g => g.status === 'accepted' || g.isOrganizer).length;
  const awaiting = Math.max(0, guests.length - going);

  return (
    <div className="space-y-3.5">
      {/* 1. Date & Time */}
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-[#8a94a6] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-white leading-tight">
            {formatPSTDate(data?.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-[12.5px] font-medium text-[#8a94a6] mt-0.5">
            {data?.is_all_day ? 'All Day' : (() => {
              const st = formatPSTTime(data?.date, { hour: 'numeric', minute: '2-digit' });
              const et = data?.end_date ? formatPSTTime(data?.end_date, { hour: 'numeric', minute: '2-digit' }) : null;
              return et ? `${st} - ${et}` : st;
            })()}
          </p>
        </div>
      </div>

      {/* 2. Guests / Attendees (Only shown if event actually has attendees in Titan Calendar) */}
      {guests.length > 0 && (
        <div className="space-y-2">
          <div 
            onClick={() => setGuestsExpanded(prev => !prev)}
            className="flex items-center justify-between cursor-pointer select-none group py-0.5 -mx-1 px-1 rounded-lg hover:bg-white/[0.04] transition-colors"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-3 min-w-0">
              <svg className="w-5 h-5 text-[#8a94a6] shrink-0 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div>
                <p className="text-[14px] font-semibold text-white leading-tight">
                  {guests.length} Guests
                </p>
                <p className="text-[12px] font-medium text-[#8a94a6] mt-0.5">
                  {going} going{awaiting > 0 ? `, ${awaiting} awaiting response` : ''}
                </p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={(e) => {
                e.stopPropagation();
                setGuestsExpanded(prev => !prev);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8a94a6] group-hover:text-white hover:bg-white/10 transition-colors"
              title={guestsExpanded ? "Collapse guests" : "Expand guests"}
            >
              <span className="text-[11px] font-bold">
                {guestsExpanded ? '▲' : '▼'}
              </span>
            </button>
          </div>

          {guestsExpanded && (
            <div className="pl-8 space-y-1.5 animate-fade-in">
              {guests.map((g, idx) => {
                const initial = (g.name || g.email || 'G').charAt(0).toUpperCase();
                const isAccepted = g.status === 'accepted' || g.isOrganizer;
                const avatarBg = g.isOrganizer ? 'bg-[#7c3aed]' : (idx % 2 === 0 ? 'bg-[#0057c7]' : 'bg-[#0284c7]');

                return (
                  <div key={idx} className="flex items-center gap-2.5 py-0.5">
                    <div className="relative shrink-0">
                      <div className={`w-6 h-6 rounded-full ${avatarBg} text-white flex items-center justify-center font-bold text-[11px] shadow-sm`}>
                        {initial}
                      </div>
                      {isAccepted && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border border-[#1a2233] flex items-center justify-center text-[7px] text-white font-black">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white/90 truncate">
                        {g.email}
                      </p>
                      {g.isOrganizer && (
                        <p className="text-[11px] font-normal text-[#8a94a6] leading-none mt-0.5">
                          Organizer
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Description / Notes (with Titan Calendar icon) */}
      {data?.description && (
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-[#8a94a6] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <div 
              className="text-[13px] text-[#cbd5e1] font-normal leading-relaxed whitespace-pre-wrap break-words"
              style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: linkifyContent(data.description) }}
            />
          </div>
        </div>
      )}

      {/* 4. Calendar info & Assigned Lawyer */}
      <div className="flex items-start gap-3 pt-0.5">
        <svg className="w-5 h-5 text-[#8a94a6] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-white/90 leading-tight">
            {data?.lawyer_name ? `Assigned Lawyer: ${data.lawyer_name}` : 'Calendar Event'}
          </p>
          <p className="text-[12px] text-[#8a94a6] mt-0.5">
            {data?.is_mine ? 'Your personal schedule event' : (data?.lawyer_name ? `Part of ${data.lawyer_name}'s calendar` : 'Firm schedule')}
          </p>
        </div>
      </div>

      {/* 5. Location (if present) */}
      {data?.location && (
        <div className="flex items-start gap-3">
          <span className="text-[15px] shrink-0 mt-0.5">📍</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-800 text-[#8a94a6] uppercase tracking-[0.15em] mb-0.5">Location</p>
            <p className="text-[13px] font-medium text-white leading-relaxed">{data.location}</p>
          </div>
        </div>
      )}

      {/* 6. Matter link (if linked) */}
      {data?.matter_number && (
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <span className="text-[10px] font-900 text-[#38bdf8] bg-[#0057c7]/10 border border-[#0057c7]/20 px-2.5 py-0.5 rounded-lg uppercase tracking-[0.15em]">
            Matter: {data.matter_number}
          </span>
          {data.matter_title && (
            <span className="text-[11px] text-[#8a94a6] font-medium tracking-tight opacity-80 truncate">— {data.matter_title}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  MODAL SYSTEM
// ─────────────────────────────────────────────────────────
function AppModal({ type, data, onClose, toast, onSave, navigate, role, user, lookups, openModal }) {
  const [isValid, setIsValid] = useState(true);
  const maskGovId = (val) => {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (trimmed.length <= 4) return `••••${trimmed}`;
    const visible = trimmed.slice(-4);
    return `••••-••••-${visible}`;
  };
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState({});
  const formRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const [inlineParties, setInlineParties] = useState([]);
  const [showAddPartyForm, setShowAddPartyForm] = useState(false);
  const [selectedPartyDropdownId, setSelectedPartyDropdownId] = useState('');
  const [selectedExistingParties, setSelectedExistingParties] = useState([]);
  const [newPartyState, setNewPartyState] = useState({
    full_name: '',
    email: '',
    phone: '',
    home_address: '',
    date_of_birth: '',
    government_id: '',
    insurance_number: '',
    notes: '',
    party_type: 'Individual',
    party_role: 'Client'
  });

  const [wizardStep, setWizardStep] = useState(1);
  const [partiesList, setPartiesList] = useState([]);
  const [partySearchTerm, setPartySearchTerm] = useState('');
  const [partyRoleFilter, setPartyRoleFilter] = useState('All');
  const [partySort, setPartySort] = useState('name');
  const [selectedPartyIds, setSelectedPartyIds] = useState([]);
  const [partyGroupExpanded, setPartyGroupExpanded] = useState({
    witnesses: true,
    drivers: true,
    insurance: true,
    medical: true,
    organizations: true,
    other: true
  });
  const [vehiclesList, setVehiclesList] = useState([]);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [driversList, setDriversList] = useState([]);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [tempDriver, setTempDriver] = useState({
    full_name: '', license_number: '', license_state: '', license_class: '', license_expiry: '',
    employer: '', years_experience: '', is_commercial_driver: false, cdl_number: '',
    assigned_vehicle_id: '', seatbelt_used: 'Unknown', alcohol_test: 'Not Tested',
    drug_test: 'Not Tested', citation_issued: false, citation_number: '',
    injury_status: 'Uninjured', hospital: '', medical_notes: '', notes: '',
  });


  const [enabledModules, setEnabledModules] = useState([]);

  const loadEnabledModules = async () => {
    try {
      const res = await api.settings.intakeModules.listEnabled();
      if (res && res.data && Array.isArray(res.data)) {
        setEnabledModules(res.data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadEnabledModules();
    const handleChanged = () => loadEnabledModules();
    window.addEventListener('vktori:entities-changed', handleChanged);
    return () => window.removeEventListener('vktori:entities-changed', handleChanged);
  }, []);

  const [adaptiveQuestions, setAdaptiveQuestions] = useState({
    injured: false,
    vehiclesInvolved: true,
    passengersInvolved: false,
    insuranceInvolved: false,
    spouseInvolved: false,
    childrenInvolved: false,
    reliefSought: 'Green Card / Permanent Residency',
    immigrationRole: 'Applicant'
  });
  const [expandedSections, setExpandedSections] = useState({
    general_details: true,
    retaining_client: true,
    court_info: false,
    timeline_dates: false,
    description_notes: false,
    edit_general: true,
    edit_court: false,
    edit_timeline: false,
    edit_desc: false
  });

  const [editingPartyId, setEditingPartyId] = useState(null);
  const [duplicateData, setDuplicateData] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const handleUseExistingContact = (contact) => {
    setShowDuplicateModal(false);
    setDuplicateData(null);

    if (type === 'add-case') {
      const cId = contact.id;
      const cName = contact.name || contact.full_name || '';
      const cEmail = contact.email && !contact.email.includes('@vktori.internal') ? contact.email : '';
      const cPhone = contact.phone || '';
      const cGovId = contact.government_id || '';

      setFormState(prev => ({
        ...prev,
        existing_client_select: cId,
        selected_client_id: cId,
        client_id: cId,
        clientId: cId,
        retaining_client_name: cName,
        retaining_client_email: cEmail,
        retaining_client_phone: cPhone,
        retaining_client_gov_id: cGovId,
      }));
      toast(`Attached existing contact "${cName}"`, 'success');
    } else {
      toast(`Using existing contact "${contact.name || contact.full_name}"`, 'success');
      onClose();
    }
  };


  const [tempParty, setTempParty] = useState({
    full_name: '',
    company_name: '',
    contact_person: '',
    website: '',
    email: '',
    phone: '',
    party_role: 'Witness',
    party_roles: ['Witness'],
    primary_party_role: 'Witness',
    secondary_party_roles: [],
    party_type: 'Person',
    address: '',
    date_of_birth: '',
    government_id: '',
    country_of_birth: '',
    relief_sought: '',
    insurance_number: '',
    notes: '',
    // Driver Module Fields
    license_number: '',
    license_state: '',
    license_class: '',
    license_expiry: '',
    employer: '',
    years_experience: '',
    is_commercial_driver: false,
    cdl_number: '',
    assigned_vehicle_id: '',
    seatbelt_used: 'Unknown',
    alcohol_test: 'Not Tested',
    drug_test: 'Not Tested',
    citation_issued: false,
    citation_number: '',
    injury_status: 'Uninjured',
    hospital: '',
    medical_notes: ''
  });

  const [tempVehicle, setTempVehicle] = useState({
    vehicle_type: 'Car',
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    color: '',
    vin: '',
    license_plate: '',
    license_state: '',
    registration_number: '',
    insurance_company: '',
    policy_number: '',
    claim_number: '',
    owner_party_id: '',
    driver_party_id: '',
    insurance_party_id: '',
    damage_description: '',
    tow_information: '',
    storage_location: '',
    repair_shop: '',
    status: 'active',
    notes: '',
  });
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [vehicleSort, setVehicleSort] = useState('year_desc');

  // ─── Dynamic Custom Module State ───────────────────────────────────
  const [customModuleRecords, setCustomModuleRecords] = useState({}); // { [moduleKey]: [ { id, ...fieldValues } ] }
  const [showCustomModuleModal, setShowCustomModuleModal] = useState(false);
  const [activeCustomModule, setActiveCustomModule] = useState(null); // the module definition
  const [customModuleFormData, setCustomModuleFormData] = useState({});
  const [editingCustomModuleRecordId, setEditingCustomModuleRecordId] = useState(null);
  const [deleteCustomModuleConfirm, setDeleteCustomModuleConfirm] = useState(null); // { moduleKey, recordId, title }

  const openPartyModalWithRole = (role) => {
    setEditingPartyId(null);
    setTempParty({
      full_name: '',
      company_name: '',
      contact_person: '',
      website: '',
      email: '',
      phone: '',
      party_role: role,
      party_roles: [role],
      primary_party_role: role,
      secondary_party_roles: [],
      party_type: 'Person',
      address: '',
      date_of_birth: '',
      government_id: '',
      country_of_birth: '',
      relief_sought: '',
      insurance_number: '',
      notes: '',
      // Driver Module Fields
      license_number: '',
      license_state: '',
      license_class: '',
      license_expiry: '',
      employer: '',
      years_experience: '',
      is_commercial_driver: false,
      cdl_number: '',
      assigned_vehicle_id: '',
      seatbelt_used: 'Unknown',
      alcohol_test: 'Not Tested',
      drug_test: 'Not Tested',
      driver_citation_issued: false,
      driver_citation_number: '',
      injury_status: 'Uninjured',
      hospital: '',
      medical_notes: '',
      // Insurance Module Fields
      insurance_type: 'Liability',
      policy_number: '',
      claim_number: '',
      adjuster_name: '',
      adjuster_phone: '',
      adjuster_email: '',
      coverage_limit: '',
      deductible: '',
      claim_status: 'Open',
      claim_date: '',
      claim_amount: '',
      settlement_offer: '',
      payment_received: 'No',
      payment_date: '',
      policy_holder: '',
      insurance_notes: '',
      // Medical Provider Module Fields
      provider_name: '',
      provider_type: 'Doctor',
      facility_name: '',
      specialization: '',
      city: '',
      state: '',
      zip_code: '',
      patient_name: '',
      patient_party_id: '',
      assigned_driver_party_id: '',
      assigned_passenger_party_id: '',
      date_of_first_visit: '',
      date_of_last_visit: '',
      diagnosis: '',
      treatment_status: 'Active',
      follow_up_required: 'No',
      follow_up_date: '',
      estimated_medical_cost: '',
      paid_amount: '',
      balance_amount: '',
      insurance_claim_number: '',
      // Employer Module Fields
      employer_name: '',
      employer_type: 'Corporation',
      occupation: '',
      employment_status: 'Full Time',
      employer_phone: '',
      employer_email: '',
      employer_address: '',
      supervisor_name: '',
      date_hired: '',
      last_working_date: '',
      currently_working: 'Yes',
      work_restrictions: 'No',
      return_to_work_date: '',
      lost_wages: '',
      lost_wage_notes: '',
      employer_notes: '',
      // Property Damage Module Fields
      property_type: 'Vehicle',
      owner_name: '',
      owner_contact: '',
      damage_description: '',
      damage_severity: 'Minor',
      repair_status: 'Not Started',
      repair_shop: '',
      estimated_repair_cost: '',
      actual_repair_cost: '',
      assigned_insurance_party_id: '',
      property_notes: '',
      // Police Module Fields
      report_number: '',
      case_number: '',
      report_date: '',
      reporting_agency: '',
      officer_name: '',
      badge_number: '',
      department: '',
      officer_phone: '',
      investigation_status: 'Open',
      police_citation_issued: 'No',
      police_citation_number: '',
      assigned_witness_party_id: '',
      photos_available: 'No',
      body_camera: 'No',
      dash_camera: 'No',
      evidence_collected: '',
      police_notes: ''
    });
    setShowPartyModal(true);
  };

  // ── Reusable Edit handler for ALL modules (Step 2 & Step 3) ───────────────
  const handleEditParty = (p) => {
    setEditingPartyId(p.id || p);
    const rolesList = (Array.isArray(p.party_roles) && p.party_roles.length > 0) ? p.party_roles : [p.party_role || 'Witness'];
    const dp  = p.role_data?.Driver         || p.driver_profile        || {};
    const pp  = p.role_data?.Passenger      || p.passenger_profile     || {};
    const wp  = p.role_data?.Witness        || p.witness_profile       || {};
    const ip  = p.role_data?.Insurance      || p.insurance_profile     || {};
    const mp  = p.role_data?.Medical        || p.medical_profile       || {};
    const emp = p.role_data?.Employer       || p.employer_profile      || {};
    const pd  = p.role_data?.PropertyDamage || p.property_damage_profile || {};
    const pol = p.role_data?.Police         || p.police_profile        || {};
    setTempParty({
      full_name:              p.full_name || p.company_name || '',
      company_name:           p.company_name || p.full_name || '',
      contact_person:         p.contact_person || '',
      website:                p.website || '',
      email:                  p.email || '',
      phone:                  p.phone || '',
      party_role:             rolesList[0],
      party_roles:            rolesList,
      primary_party_role:     p.primary_party_role || rolesList[0],
      secondary_party_roles:  rolesList.filter(r => r !== (p.primary_party_role || rolesList[0])),
      party_type:             p.party_type === 'Organization' ? 'Organization' : 'Person',
      address:                p.address || '',
      date_of_birth:          p.date_of_birth || '',
      government_id:          p.government_id || '',
      country_of_birth:       p.country_of_birth || '',
      relief_sought:          p.relief_sought || '',
      insurance_number:       p.insurance_number || '',
      notes:                  p.notes || '',
      // Driver
      license_number:         dp.license_number || p.license_number || '',
      license_state:          dp.license_state || p.license_state || '',
      license_class:          dp.license_class || p.license_class || '',
      license_expiry:         dp.license_expiry || p.license_expiry || '',
      employer:               dp.employer || p.employer || '',
      years_experience:       dp.years_experience || p.years_experience || '',
      is_commercial_driver:   Boolean(dp.is_commercial_driver || p.is_commercial_driver),
      cdl_number:             dp.cdl_number || p.cdl_number || '',
      assigned_vehicle_id:    dp.assigned_vehicle_id || pp.assigned_vehicle_id || p.assigned_vehicle_id || '',
      seatbelt_used:          dp.seatbelt_used || pp.seatbelt_used || p.seatbelt_used || 'Unknown',
      alcohol_test:           dp.alcohol_test || p.alcohol_test || 'Not Tested',
      drug_test:              dp.drug_test || p.drug_test || 'Not Tested',
      driver_citation_issued: Boolean(dp.citation_issued || dp.driver_citation_issued || p.driver_citation_issued),
      driver_citation_number: dp.citation_number || dp.driver_citation_number || p.driver_citation_number || '',
      injury_status:          dp.injury_status || pp.injury_status || p.injury_status || 'None',
      hospital:               dp.hospital || pp.hospital || p.hospital || '',
      medical_notes:          dp.medical_notes || pp.medical_notes || p.medical_notes || '',
      // Passenger
      seat_position:              pp.seat_position || p.seat_position || 'Front Right',
      airbag_deployed:            pp.airbag_deployed || p.airbag_deployed || 'Unknown',
      transported_by:             pp.transported_by || p.transported_by || 'Unknown',
      hospital_address:           pp.hospital_address || p.hospital_address || '',
      claim_number:               pp.claim_number || ip.claim_number || p.claim_number || '',
      insurance_company:          pp.insurance_company || p.insurance_company || '',
      policy_number:              pp.policy_number || ip.policy_number || p.policy_number || '',
      emergency_contact_name:     pp.emergency_contact_name || p.emergency_contact_name || '',
      emergency_contact_phone:    pp.emergency_contact_phone || p.emergency_contact_phone || '',
      relationship:               pp.relationship || wp.relationship || p.relationship || '',
      passenger_notes:            pp.passenger_notes || p.passenger_notes || '',
      assigned_driver_party_id:   pp.assigned_driver_party_id || p.assigned_driver_party_id || '',
      // Witness
      witness_type:       wp.witness_type || p.witness_type || 'Independent',
      statement_given:    wp.statement_given || p.statement_given || 'No',
      statement_date:     wp.statement_date || p.statement_date || '',
      witness_notes:      wp.witness_notes || p.witness_notes || '',
      // Insurance
      insurance_type:     ip.insurance_type || p.insurance_type || 'Liability',
      adjuster_name:      ip.adjuster_name || p.adjuster_name || '',
      adjuster_phone:     ip.adjuster_phone || p.adjuster_phone || '',
      adjuster_email:     ip.adjuster_email || p.adjuster_email || '',
      coverage_limit:     ip.coverage_limit || p.coverage_limit || '',
      deductible:         ip.deductible || p.deductible || '',
      claim_status:       ip.claim_status || p.claim_status || 'Open',
      claim_date:         ip.claim_date || p.claim_date || '',
      claim_amount:       ip.claim_amount || p.claim_amount || '',
      settlement_offer:   ip.settlement_offer || p.settlement_offer || '',
      payment_received:   ip.payment_received || p.payment_received || 'No',
      payment_date:       ip.payment_date || p.payment_date || '',
      policy_holder:      ip.policy_holder || p.policy_holder || '',
      insurance_notes:    ip.insurance_notes || p.insurance_notes || '',
      // Medical Provider
      provider_name:              mp.provider_name || p.provider_name || '',
      provider_type:              mp.provider_type || p.provider_type || 'Doctor',
      facility_name:              mp.facility_name || p.facility_name || '',
      specialization:             mp.specialization || p.specialization || '',
      city:                       mp.city || p.city || '',
      state:                      mp.state || p.state || '',
      zip_code:                   mp.zip_code || p.zip_code || '',
      patient_name:               mp.patient_name || p.patient_name || '',
      patient_party_id:           mp.patient_party_id || p.patient_party_id || '',
      assigned_passenger_party_id: mp.assigned_passenger_party_id || p.assigned_passenger_party_id || '',
      date_of_first_visit:        mp.date_of_first_visit || p.date_of_first_visit || '',
      date_of_last_visit:         mp.date_of_last_visit || p.date_of_last_visit || '',
      diagnosis:                  mp.diagnosis || p.diagnosis || '',
      treatment_status:           mp.treatment_status || p.treatment_status || 'Active',
      follow_up_required:         mp.follow_up_required || p.follow_up_required || 'No',
      follow_up_date:             mp.follow_up_date || p.follow_up_date || '',
      estimated_medical_cost:     mp.estimated_medical_cost || p.estimated_medical_cost || '',
      paid_amount:                mp.paid_amount || p.paid_amount || '',
      balance_amount:             mp.balance_amount || p.balance_amount || '',
      insurance_claim_number:     mp.insurance_claim_number || p.insurance_claim_number || '',
      // Employer
      employer_name:      emp.employer_name || p.employer_name || '',
      employer_type:      emp.employer_type || p.employer_type || 'Corporation',
      occupation:         emp.occupation || p.occupation || '',
      employment_status:  emp.employment_status || p.employment_status || 'Full Time',
      employer_phone:     emp.employer_phone || p.employer_phone || '',
      employer_email:     emp.employer_email || p.employer_email || '',
      employer_address:   emp.employer_address || p.employer_address || '',
      supervisor_name:    emp.supervisor_name || p.supervisor_name || '',
      date_hired:         emp.date_hired || p.date_hired || '',
      last_working_date:  emp.last_working_date || p.last_working_date || '',
      currently_working:  emp.currently_working || p.currently_working || 'Yes',
      work_restrictions:  emp.work_restrictions || p.work_restrictions || 'No',
      return_to_work_date: emp.return_to_work_date || p.return_to_work_date || '',
      lost_wages:         emp.lost_wages || p.lost_wages || '',
      lost_wage_notes:    emp.lost_wage_notes || p.lost_wage_notes || '',
      employer_notes:     emp.employer_notes || p.employer_notes || '',
      // Property Damage
      property_type:              pd.property_type || p.property_type || 'Vehicle',
      owner_name:                 pd.owner_name || p.owner_name || '',
      owner_contact:              pd.owner_contact || p.owner_contact || '',
      damage_description:         pd.damage_description || p.damage_description || '',
      damage_severity:            pd.damage_severity || p.damage_severity || 'Minor',
      repair_status:              pd.repair_status || p.repair_status || 'Not Started',
      repair_shop:                pd.repair_shop || p.repair_shop || '',
      estimated_repair_cost:      pd.estimated_repair_cost || p.estimated_repair_cost || '',
      actual_repair_cost:         pd.actual_repair_cost || p.actual_repair_cost || '',
      assigned_insurance_party_id: pd.assigned_insurance_party_id || p.assigned_insurance_party_id || '',
      property_notes:             pd.property_notes || p.property_notes || '',
      // Police
      report_number:          pol.report_number || p.report_number || '',
      case_number:            pol.case_number || p.case_number || '',
      report_date:            pol.report_date || p.report_date || '',
      reporting_agency:       pol.reporting_agency || p.reporting_agency || '',
      officer_name:           pol.officer_name || p.officer_name || '',
      badge_number:           pol.badge_number || p.badge_number || '',
      department:             pol.department || p.department || '',
      officer_phone:          pol.officer_phone || p.officer_phone || '',
      investigation_status:   pol.investigation_status || p.investigation_status || 'Open',
      police_citation_issued: pol.citation_issued || pol.police_citation_issued || p.police_citation_issued || 'No',
      police_citation_number: pol.citation_number || pol.police_citation_number || p.police_citation_number || '',
      assigned_witness_party_id: pol.assigned_witness_party_id || p.assigned_witness_party_id || '',
      photos_available:       pol.photos_available || p.photos_available || 'No',
      body_camera:            pol.body_camera || p.body_camera || 'No',
      dash_camera:            pol.dash_camera || p.dash_camera || 'No',
      evidence_collected:     pol.evidence_collected || p.evidence_collected || '',
      police_notes:           pol.police_notes || p.police_notes || '',
    });
    setShowPartyModal(true);
  };

  // ── Reusable Delete handler for ALL modules (Step 2 & Step 3) ────────────
  const handleDeleteParty = (p) => {
    if (p.is_retaining_client || p.party_role === 'Retaining Client') {
      toast('Retaining Client cannot be deleted.', 'error');
      return;
    }
    if (window.confirm(`Remove party "${p.full_name || p.company_name}"?`)) {
      setPartiesList(prev => prev.filter(item => item !== p && item.id !== p.id));
      toast('Party removed from matter.', 'info');
    }
  };

  useEffect(() => {
    if (data?.parties_data && Array.isArray(data.parties_data)) {
      setPartiesList(data.parties_data);
    } else {
      setPartiesList([]);
    }
    if (data?.vehicles_data && Array.isArray(data.vehicles_data)) {
      setVehiclesList(data.vehicles_data);
    } else {
      setVehiclesList([]);
    }
    if (data?.intake_answers && typeof data.intake_answers === 'object') {
      setAdaptiveQuestions(data.intake_answers);
    } else {
      setAdaptiveQuestions({
        injured: false,
        vehiclesInvolved: true,
        passengersInvolved: false,
        insuranceInvolved: false,
        spouseInvolved: false,
        childrenInvolved: false,
        reliefSought: 'Green Card / Permanent Residency',
        immigrationRole: 'Applicant'
      });
    }
    setWizardStep(1);
  }, [type, data]);

  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploadingQueue, setIsUploadingQueue] = useState(false);
  const abortControllersRef = useRef({});

  const filesInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const parseDroppedItems = async (dataTransfer) => {
    const files = [];
    const entries = [];
    
    if (dataTransfer.items) {
      for (let i = 0; i < dataTransfer.items.length; i++) {
        const item = dataTransfer.items[i];
        if (item.kind === 'file') {
          const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
          if (entry) {
            entries.push(entry);
          }
        }
      }
    } else if (dataTransfer.files) {
      return Array.from(dataTransfer.files);
    }

    const traverseEntry = async (entry, relativePath = "") => {
      if (entry.isFile) {
        const file = await new Promise((resolve, reject) => {
          entry.file(resolve, reject);
        });
        const pathValue = relativePath ? `${relativePath}/${file.name}` : file.name;
        Object.defineProperty(file, 'webkitRelativePath', {
          value: pathValue,
          configurable: true,
          writable: true
        });
        files.push(file);
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readAllEntries = async () => {
          let allEntries = [];
          const readBatch = async () => {
            const results = await new Promise((resolve, reject) => {
              reader.readEntries(resolve, reject);
            });
            if (results.length > 0) {
              allEntries = allEntries.concat(results);
              await readBatch();
            }
          };
          await readBatch();
          return allEntries;
        };
        const childEntries = await readAllEntries();
        const currentPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        for (const child of childEntries) {
          await traverseEntry(child, currentPath);
        }
      }
    };

    for (const entry of entries) {
      await traverseEntry(entry);
    }
    return files;
  };

  const handleFilesSelection = (files) => {
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const uploadSingleFile = async (item, matterId, category, visibility, uid) => {
    const controller = new AbortController();
    abortControllersRef.current[item.id] = controller;
    
    const form = new FormData();
    form.append('file', item.file);
    form.append('matter_id', String(matterId));
    form.append('category', category);
    form.append('visibility', visibility);
    form.append('uploaded_by_user_id', String(uid));
    
    let folder_path = null;
    if (item.relativePath) {
      const parts = item.relativePath.split('/');
      if (parts.length > 1) {
        folder_path = parts.slice(0, -1).join('/');
      }
    }
    if (folder_path) {
      form.append('folder_path', folder_path);
    }
    
    try {
      await api.documents.create(form, {
        signal: controller.signal,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: percentCompleted } : q));
        }
      });
      
      setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed', progress: 100 } : q));
    } catch (err) {
      if (controller.signal.aborted) {
        setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: 'Upload cancelled.' } : q));
      } else {
        setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: err.response?.data?.message || err.message } : q));
      }
      throw err;
    } finally {
      delete abortControllersRef.current[item.id];
    }
  };

  const startQueueUpload = async (filesList, matterId, category, visibility, uid) => {
    const initialQueue = filesList.map((file, idx) => ({
      id: `${Date.now()}_${idx}_${file.name}`,
      file,
      name: file.name,
      relativePath: file.webkitRelativePath || file.name,
      size: file.size,
      progress: 0,
      status: 'pending',
      error: null
    }));
    
    setUploadQueue(initialQueue);
    
    const pending = [...initialQueue];
    const active = [];
    const maxConcurrency = 3;
    
    const runNext = async () => {
      if (pending.length === 0 && active.length === 0) {
        return;
      }
      
      while (pending.length > 0 && active.length < maxConcurrency) {
        const item = pending.shift();
        active.push(item);
        
        setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading' } : q));
        
        uploadSingleFile(item, matterId, category, visibility, uid)
          .then(() => {
            active.splice(active.indexOf(item), 1);
            runNext();
          })
          .catch(() => {
            active.splice(active.indexOf(item), 1);
            runNext();
          });
      }
    };
    
    runNext();
  };

  const cancelAllQueue = () => {
    Object.values(abortControllersRef.current).forEach(c => c.abort());
    setUploadQueue(prev => prev.map(q => 
      q.status === 'pending' || q.status === 'uploading' 
        ? { ...q, status: 'failed', error: 'Cancelled' } 
        : q
    ));
  };

  const retryFailedItem = (item, matterId, category, visibility, uid) => {
    setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'pending', progress: 0, error: null } : q));
    uploadSingleFile(item, matterId, category, visibility, uid).catch(() => {});
  };

  const [showDeleteEventConfirm, setShowDeleteEventConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  useEffect(() => {
    if (formRef.current) setIsValid(formRef.current.checkValidity());
  }, [type, data]);

  const handleChange = (e) => {
    if (formRef.current) {
      setIsValid(formRef.current.checkValidity());
      const fd = new FormData(formRef.current);
      const entries = Object.fromEntries(fd.entries());
      setFormState(prev => ({ ...prev, ...entries }));
    }
  };

  const handleStepChange = (stepNum) => {
    if (formRef.current) {
      const fd = new FormData(formRef.current);
      const entries = Object.fromEntries(fd.entries());
      setFormState(prev => ({ ...prev, ...entries }));
    }
    setWizardStep(stepNum);
  };

  const [practiceAreas, setPracticeAreas] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [documentCategories, setDocumentCategories] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  
  const [loadingLookups, setLoadingLookups] = useState(true);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    setSelectedFiles([]);
    setInlineParties([]);
    setSelectedExistingParties([]);
    setSelectedPartyDropdownId('');
    if (type === 'edit-case' && data) {
      setWizardStep(1);

      let rawP = data.parties_data || [];
      if (typeof rawP === 'string') { try { rawP = JSON.parse(rawP); } catch { rawP = []; } }
      setPartiesList(Array.isArray(rawP) ? rawP : []);

      let rawV = data.vehicles_data || [];
      if (typeof rawV === 'string') { try { rawV = JSON.parse(rawV); } catch { rawV = []; } }
      setVehiclesList(Array.isArray(rawV) ? rawV : []);

      let rawAnswers = data.intake_answers || {};
      if (typeof rawAnswers === 'string') { try { rawAnswers = JSON.parse(rawAnswers); } catch { rawAnswers = {}; } }
      setAdaptiveQuestions(typeof rawAnswers === 'object' && rawAnswers !== null ? rawAnswers : {});

      const clientObj = data.client || data.retaining_client || {};

      const formatDateStr = (val) => {
        if (!val) return '';
        if (typeof val === 'string') {
          return val.includes('T') ? val.split('T')[0] : val.substring(0, 10);
        }
        try {
          return new Date(val).toISOString().split('T')[0];
        } catch (e) {
          return '';
        }
      };

      setFormState({
        ...rawAnswers,
        title: data.title || '',
        assigned_lawyer_id: data.assigned_lawyer_id || '',
        status: data.status || 'active',
        priority: data.priority || 'medium',
        type: data.practice_area || data.type || data.matter_type || 'Personal Injury',
        practice_area: data.practice_area || data.type || data.matter_type || 'Personal Injury',
        matter_type: data.matter_type || data.practice_area || '',
        case_number: data.case_number || '',
        case_value: data.case_value !== undefined && data.case_value !== null ? data.case_value : '',
        initial_filing_date: formatDateStr(data.initial_filing_date),
        date_of_loss: formatDateStr(data.date_of_loss) || formatDateStr(data.incident_date),
        sol_term: data.sol_term || rawAnswers.sol_term || '',
        sol_date: formatDateStr(data.sol_date),
        tracking_type: data.tracking_type || rawAnswers.tracking_type || '',
        trial_date: formatDateStr(data.trial_date),
        nextHearing: formatDateStr(data.next_hearing) || (data.nextHearing && data.nextHearing !== '—' ? formatDateStr(data.nextHearing) : ''),
        court_name: data.court_name || '',
        judge_name: data.judge_name || '',
        court_address: data.court_address || '',
        court_county: data.court_county || '',
        court_department: data.court_department || '',
        hearing_time: data.hearing_time || '',
        opposingParty: data.opposing_party_name || data.opposingParty || '',
        retaining_client_name: clientObj.full_name || clientObj.name || data.retaining_client_name || data.client_name || '',
        retaining_client_email: clientObj.email || data.retaining_client_email || data.client_email || '',
        retaining_client_phone: clientObj.phone || data.retaining_client_phone || data.client_phone || '',
        retaining_client_address: clientObj.home_address || clientObj.address || clientObj.address_line_1 || data.retaining_client_address || data.client_address || '',
        retaining_client_dob: formatDateStr(clientObj.date_of_birth) || formatDateStr(data.retaining_client_dob) || formatDateStr(rawAnswers.retaining_client_dob),
        retaining_client_gov_id: clientObj.government_id || clientObj.gov_id || data.retaining_client_gov_id || rawAnswers.retaining_client_gov_id || '',
        selected_client_id: data.client_id || clientObj.id || '',
        existing_client_select: data.client_id || clientObj.id || '',
        fee_type: data.fee_type || rawAnswers.fee_type || '',
        referral_source: data.referral_source || rawAnswers.referral_source || ''
      });
    } else if (type === 'add-case') {
      setWizardStep(1);
      setPartiesList([]);
      setVehiclesList([]);
      setAdaptiveQuestions({});
      setFormState({});
    } else if (type === 'create-invoice') {
      const initDueDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
      const initialMatterId = data?.matterId ? String(data.matterId) : '';
      let initialAmt = '';
      if (initialMatterId && Array.isArray(lookups?.invoices)) {
        const mInvs = lookups.invoices.filter(i => String(i.matter_id || i.matter?.id) === String(initialMatterId));
        let curOut = 0;
        let curBill = 0;
        for (const inv of mInvs) {
          if (inv.status === 'void') continue;
          const a = Number(inv.amount) || 0;
          const p = Number(inv.paid_amount) || 0;
          const d = Number(inv.due_amount !== undefined ? inv.due_amount : Math.max(0, a - p)) || 0;
          curBill += a;
          curOut += d;
        }
        const mObj = Array.isArray(lookups?.matters) ? lookups.matters.find(m => String(m.id) === String(initialMatterId)) : null;
        const cv = Number(mObj?.case_value) || 0;
        const sugg = curOut > 0 ? curOut : (curBill > 0 ? curBill : (cv > 0 ? cv : 0));
        if (sugg > 0) initialAmt = String(sugg);
      }
      setFormState({
        matterId: initialMatterId,
        amount: initialAmt,
        dueDate: initDueDate,
        status: 'due',
        invoice_number: `INV-${new Date().getFullYear()}-${initialMatterId ? String(initialMatterId).padStart(4, '0') : String(Math.floor(1000 + Math.random() * 9000))}`,
        paymentTerms: 'Net 14',
      });
      if (initialMatterId) {
        api.matters.get(initialMatterId).then(res => {
          if (res?.data) {
            const mData = res.data;
            const invs = mData.invoices || [];
            let cOut = 0;
            let cBill = 0;
            for (const inv of invs) {
              if (inv.status === 'void') continue;
              const a = Number(inv.amount) || 0;
              const p = Number(inv.paid_amount) || 0;
              const d = Number(inv.due_amount !== undefined ? inv.due_amount : Math.max(0, a - p)) || 0;
              cBill += a;
              cOut += d;
            }
            const val = Number(mData.case_value) || 0;
            const freshSugg = cOut > 0 ? cOut : (cBill > 0 ? cBill : (val > 0 ? val : 0));
            if (freshSugg > 0) {
              setFormState(prev => ({ ...prev, amount: String(freshSugg) }));
            }
          }
        }).catch(() => {});
      }
    } else {
      setFormState({});
    }
    const promises = [];
    if (type === 'add-case' || type === 'edit-case' || type === 'add-lead') {
      promises.push(
        api.practiceAreas.list({ active: 'true' })
          .then(res => setPracticeAreas(res.data || []))
          .catch(() => {})
      );
    }
    if (type === 'add-case' || type === 'edit-case' || type === 'create-invoice') {
      promises.push(
        api.customFields.list({ active: 'true' })
          .then(res => setCustomFields(res.data || []))
          .catch(() => {}),
        api.clients.list({ limit: 500 })
          .then(res => setClientsList(res.data || []))
          .catch(() => {})
      );
    }
    if (type === 'add-document' || type === 'edit-document') {
      promises.push(
        api.documentCategories.list({ active: 'true' })
          .then(res => setDocumentCategories(res.data || []))
          .catch(() => {})
      );
    }

    if (promises.length > 0) {
      setLoadingLookups(true);
      Promise.all(promises).finally(() => {
        setLoadingLookups(false);
      });
    } else {
      setLoadingLookups(false);
    }
  }, [type]);

  const clientRows = clientsList.length > 0 ? clientsList : (lookups?.clients?.length ? lookups.clients : []);
  const matterRows = lookups?.matters?.length ? lookups.matters : [];
  const lawyerRows = (lookups?.lawyers?.length ? lookups.lawyers : (lookups?.users?.length ? lookups.users.filter(u => u.role !== 'client') : []));

  if (!type) return null;

  const recordOptions = (
    <>
      <option disabled className="font-700 text-white/50 bg-[#05080f]">── Legal Matters ──</option>
      {matterRows.map((m) => <option key={m.id} value={m.id}>{m.matter_number} — {m.title}</option>)}
      
      {lookups?.activities?.length > 0 && (
        <>
          <option disabled className="font-700 text-white/50 bg-[#05080f] mt-2">── Activities ──</option>
          {lookups.activities.map((a) => <option key={`act_${a.id}`} value={`act_${a.id}`}>{a.type} — {a.title}</option>)}
        </>
      )}
    </>
  );

  const modals = {
    'add-task': {
      title: 'Add New Task', wide: false,
      body: <>
        <div className="mb-3"><Field label="Task Title" required><Input name="title" placeholder="E.g., Prepare evidence summary" required /></Field></div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Priority" required><Select name="priority" required><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></Select></Field>
          <Field label="Task Type"><Select name="task_type"><option value="general">General</option><option value="filing_deadline">Filing Deadline</option><option value="trial_preparation">Trial Preparation</option><option value="court_appearance">Court Appearance</option><option value="other">Other...</option></Select></Field>
        </div>
        {formState.task_type === 'other' && (
          <div className="mb-3">
            <Field label="Custom Task Type" required>
              <Input name="custom_task_type" placeholder="E.g., Party meeting" required />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Related Record"><Select name="matterId" defaultValue={data?.matterId || ''}><option value="">None</option>{recordOptions}</Select></Field>
          <Field label="Due Date" required><Input name="due_date" type="date" required /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Assigned To" required>
            <Select name="assigned_user_id" required>
              <option value="">Select lawyer...</option>
              {lawyerRows.map((u) => <option key={u.id} value={u.user_id || u.id}>{u.full_name || u.display_name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Description"><Textarea name="description" rows={3} placeholder="Describe the task details..." /></Field>
      </>,
    },
    'add-lead': {
      title: 'Add New Lead', wide: false,
      body: <>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Field label="First Name" required><Input name="firstName" placeholder="John" required /></Field>
          <Field label="Middle Name"><Input name="middleName" placeholder="M." /></Field>
          <Field label="Last Name" required><Input name="lastName" placeholder="Doe" required /></Field>
        </div>
        <div className="mb-3">
          <Field label="Email Address" required><Input name="email" type="email" placeholder="john@example.com" required /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Phone">
            <Input
              name="phone"
              value={formState.phone !== undefined ? formState.phone : ''}
              onChange={e => setFormState(s => ({ ...s, phone: formatUSPhone(e.target.value) }))}
              placeholder="+1 (555) 000-0000"
            />
          </Field>
          <Field label="Lead Source"><Input name="source" placeholder="Referral, Website, etc." /></Field>
        </div>
        <div className="mb-3">
          <Field label="Matter Type">
            <Select name="matterType">
              {practiceAreas.length > 0 ? practiceAreas.map(pa => (
                <option key={pa.id} value={pa.name}>{pa.name}</option>
              )) : (
                <><option>Civil Litigation</option><option>Family Law</option><option>Corporate</option><option>Real Estate</option><option>Employment</option><option>Intellectual Property</option></>
              )}
              <option value="other">Other...</option>
            </Select>
          </Field>
        </div>
        {formState.matterType === 'other' && (
          <div className="mb-3">
            <Field label="Custom Matter Type" required>
              <Input name="custom_matter_type" placeholder="E.g., Immigration Law" required />
            </Field>
          </div>
        )}
        <div className="mb-3">
          <Field label="Message / Inquiry"><Textarea name="message" rows={3} placeholder="Prospect's initial message or inquiry..." /></Field>
        </div>
        <Field label="Internal Notes"><Textarea name="notes" rows={2} placeholder="Internal screening notes..." /></Field>
      </>,
      onSave: () => toast('Lead added successfully!', 'success'),
    },
    'add-client': {
      title: 'Add New Client', wide: true,
      body: <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Field label="Client Type" required>
            <Select name="party_type" required defaultValue="Individual">
              <option value="Individual">Individual</option>
              <option value="Organization">Organization</option>
            </Select>
          </Field>
          <Field label="Client Role" required>
            <Select name="party_role" required defaultValue="Client">
              <option value="Client">Client</option>
              <option value="Plaintiff">Plaintiff</option>
              <option value="Defendant">Defendant</option>
              <option value="Petitioner">Petitioner</option>
              <option value="Respondent">Respondent</option>
              <option value="Claimant">Claimant</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
        </div>

        {formState.party_role === 'Other' && (
          <div className="mb-3">
            <Field label="Custom Client Role" required>
              <Input name="custom_party_role" placeholder="Enter custom role..." required />
            </Field>
          </div>
        )}

        {formState.party_type === 'Organization' ? (
          <>
            <div className="mb-3"><Field label="Organization Name" required><Input name="organization_name" placeholder="Acme Corp" required /></Field></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <Field label="Contact First Name"><Input name="contact_first_name" placeholder="John" /></Field>
              <Field label="Contact Middle Name"><Input name="contact_middle_name" placeholder="E." /></Field>
              <Field label="Contact Last Name"><Input name="contact_last_name" placeholder="Doe" /></Field>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <Field label="First Name" required><Input name="firstName" placeholder="John" required /></Field>
            <Field label="Middle Name"><Input name="middleName" placeholder="Edward" /></Field>
            <Field label="Last Name" required><Input name="lastName" placeholder="Doe" required /></Field>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Field label="Email Address" required><Input name="email" type="email" placeholder="john@example.com" required /></Field>
          <Field label="Phone">
            <Input
              name="phone"
              value={formState.phone !== undefined ? formState.phone : ''}
              onChange={e => setFormState(s => ({ ...s, phone: formatUSPhone(e.target.value) }))}
              placeholder="+1 (555) 000-0000"
            />
          </Field>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Field label="Address Line 1"><Input name="address_line_1" placeholder="123 Main St" /></Field>
          <Field label="Address Line 2"><Input name="address_line_2" placeholder="Apt, Suite, Unit" /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Field label="City"><Input name="city" placeholder="Los Angeles" /></Field>
          <Field label="State / Province"><Input name="state" placeholder="CA" /></Field>
          <Field label="Postal / ZIP Code"><Input name="postal_code" placeholder="90001" /></Field>
          <Field label="Country">
            <Select name="country" defaultValue="United States">
              {WORLD_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <Field label="Date of Birth"><Input name="date_of_birth" type="date" /></Field>
          <Field label="Client Status">
            <Select name="status" defaultValue="active">
              <option value="active">Active</option>
              <option value="prospective">Prospective</option>
              <option value="past">Past</option>
            </Select>
          </Field>
          <Field label="Insurance Number"><Input name="insurance_number" placeholder="Policy or claim number" /></Field>
        </div>
        <div className="mb-3">
          <input type="hidden" name="government_id" value={formState.government_id || ''} />
          <ConfidentialIdFields
            value={formState.government_id || ''}
            onChange={val => setFormState(s => ({ ...s, government_id: val }))}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Field label="Opposing Party Name"><Input name="opposing_party_name" placeholder="Opposing Party Name" /></Field>
          <Field label="Opposing Law Firm & Contacts"><Input name="opposing_law_firm" placeholder="Firm Name / Phone / Email" /></Field>
          <Field label="Opposing Counsel"><Input name="opposing_counsel_name" placeholder="Attorney Name, Esq." /></Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 items-end">
          <Field label="How did you hear about us?">
            <Select name="referral_source">
              <option value="">Select source...</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="Friend">Friend</option>
              <option value="Family member">Family member</option>
              <option value="Acquaintance">Acquaintance</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
          <Field label="Referred By / Detail"><Input name="referral_detail" placeholder="Enter name or details..." /></Field>
        </div>

        <Field label="Notes"><Textarea name="notes" rows={3} placeholder="Initial notes..." /></Field>
      </>,
      onSave: () => toast('Client added successfully!', 'success'),
    },
    'edit-client': {
      title: data ? `Edit Client: ${data.full_name || data.name || ''}` : 'Edit Client', wide: true,
      body: (() => {
        const predefinedRoles = ['Client', 'Plaintiff', 'Defendant', 'Petitioner', 'Respondent', 'Claimant'];
        const isCustomRole = data?.party_role && !predefinedRoles.includes(data.party_role);
        const defaultRoleValue = isCustomRole ? 'Other' : (data?.party_role || 'Client');
        const showCustomRole = (formState.party_role || defaultRoleValue) === 'Other';

        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 items-end">
              <Field label="Client Type" required>
                <Select name="party_type" required defaultValue={data?.party_type || 'Individual'}>
                  <option value="Individual">Individual</option>
                  <option value="Organization">Organization</option>
                </Select>
              </Field>
              <Field label="Client Role" required>
                <Select name="party_role" required defaultValue={defaultRoleValue}>
                  <option value="Client">Client</option>
                  <option value="Plaintiff">Plaintiff</option>
                  <option value="Defendant">Defendant</option>
                  <option value="Petitioner">Petitioner</option>
                  <option value="Respondent">Respondent</option>
                  <option value="Claimant">Claimant</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>
            </div>

            {showCustomRole && (
              <div className="mb-3">
                <Field label="Custom Client Role" required>
                  <Input name="custom_party_role" defaultValue={data?.party_role || ''} placeholder="Enter custom role..." required />
                </Field>
              </div>
            )}

            {(formState.party_type || data?.party_type) === 'Organization' ? (
              <>
                <div className="mb-3"><Field label="Organization Name" required><Input name="organization_name" defaultValue={data?.organization_name || data?.full_name || ''} required /></Field></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 items-end">
                  <Field label="Contact First Name"><Input name="contact_first_name" defaultValue={data?.contact_first_name || ''} /></Field>
                  <Field label="Contact Middle Name"><Input name="contact_middle_name" defaultValue={data?.contact_middle_name || ''} /></Field>
                  <Field label="Contact Last Name"><Input name="contact_last_name" defaultValue={data?.contact_last_name || ''} /></Field>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 items-end">
                <Field label="First Name" required><Input name="firstName" defaultValue={data?.first_name || (data?.full_name ? data.full_name.split(' ')[0] : '')} required /></Field>
                <Field label="Middle Name"><Input name="middleName" defaultValue={data?.middle_name || (data?.full_name && data.full_name.split(' ').length > 2 ? data.full_name.split(' ').slice(1, -1).join(' ') : '')} /></Field>
                <Field label="Last Name" required><Input name="lastName" defaultValue={data?.last_name || (data?.full_name && data.full_name.split(' ').length > 1 ? data.full_name.split(' ').slice(-1).join(' ') : '')} /></Field>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 items-end">
              <Field label="Email Address"><Input name="email" defaultValue={data ? data.email : ''} placeholder="client@example.com" /></Field>
              <Field label="Phone">
                <Input
                  name="phone"
                  value={formState.phone !== undefined ? formState.phone : (data?.phone || '')}
                  onChange={e => setFormState(s => ({ ...s, phone: formatUSPhone(e.target.value) }))}
                />
              </Field>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 items-end">
              <Field label="Address Line 1"><Input name="address_line_1" defaultValue={data?.address_line_1 || ''} placeholder="123 Main St" /></Field>
              <Field label="Address Line 2"><Input name="address_line_2" defaultValue={data?.address_line_2 || ''} placeholder="Apt, Suite, Unit" /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Field label="City"><Input name="city" defaultValue={data?.city || ''} placeholder="Los Angeles" /></Field>
              <Field label="State / Province"><Input name="state" defaultValue={data?.state || ''} placeholder="CA" /></Field>
              <Field label="Postal / ZIP Code"><Input name="postal_code" defaultValue={data?.postal_code || ''} placeholder="90001" /></Field>
              <Field label="Country">
                <Select name="country" defaultValue={data?.country || 'United States'}>
                  {WORLD_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 items-end">
              <Field label="Date of Birth"><Input name="date_of_birth" type="date" defaultValue={data?.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : ''} /></Field>
              <Field label="Status">
                <Select name="status" defaultValue={data ? data.status || (data.is_portal_enabled === false ? 'past' : 'active') : 'active'}>
                  <option value="active">Active</option>
                  <option value="prospective">Prospective</option>
                  <option value="past">Past</option>
                </Select>
              </Field>
              <Field label="Insurance Number"><Input name="insurance_number" defaultValue={data?.insurance_number || ''} placeholder="Policy or claim number" /></Field>
            </div>
            <div className="mb-3">
              <input type="hidden" name="government_id" value={formState.government_id !== undefined ? formState.government_id : (data?.government_id || '')} />
              <ConfidentialIdFields
                value={formState.government_id !== undefined ? formState.government_id : (data?.government_id || '')}
                onChange={val => setFormState(s => ({ ...s, government_id: val }))}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <Field label="Opposing Party Name"><Input name="opposing_party_name" defaultValue={data?.opposing_party_name || ''} placeholder="Opposing Party Name" /></Field>
              <Field label="Opposing Law Firm & Contacts"><Input name="opposing_law_firm" defaultValue={data?.opposing_law_firm || ''} placeholder="Firm Name / Phone / Email" /></Field>
              <Field label="Opposing Counsel"><Input name="opposing_counsel_name" defaultValue={data?.opposing_counsel_name || ''} placeholder="Attorney Name, Esq." /></Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 items-end">
              <Field label="How did you hear about us?">
                <Select name="referral_source" defaultValue={data?.referral_source || ''}>
                  <option value="">Select source...</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Friend">Friend</option>
                  <option value="Family member">Family member</option>
                  <option value="Acquaintance">Acquaintance</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>
              <Field label="Referred By / Detail"><Input name="referral_detail" defaultValue={data?.referral_detail || ''} placeholder="Enter name or details..." /></Field>
            </div>

            <Field label="Notes"><Textarea name="notes" rows={3} defaultValue={data?.notes || ''} /></Field>
          </>
        );
      })(),
      onSave: () => toast('Client updated successfully!', 'success'),
    },
    'add-case': {
      title: 'Adaptive Matter Intake Wizard', wide: true,
      body: (
        <div className="space-y-6">
          {/* Progress Stepper Bar */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-3">
            {/* Desktop Stepper */}
            <div className="hidden sm:flex items-center justify-between gap-2">
              {[
                { num: 1, label: 'Matter & Client' },
                { num: 2, label: 'Adaptive Details' },
                { num: 3, label: 'Parties & Roles' },
                { num: 4, label: 'Review & Confirm' }
              ].map((s, idx, arr) => (
                <Fragment key={s.num}>
                  <button
                    type="button"
                    onClick={() => handleStepChange(s.num)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      wizardStep === s.num
                        ? 'bg-[#0057c7] text-white ring-4 ring-[#0057c7]/20 border border-[#38bdf8]/40 shadow-lg shadow-[#0057c7]/30'
                        : wizardStep > s.num
                        ? 'bg-[#38bdf8] text-slate-950 font-bold'
                        : 'bg-white/[0.05] text-slate-400 border border-white/10 hover:text-white'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      wizardStep === s.num
                        ? 'bg-white text-[#0057c7]'
                        : wizardStep > s.num
                        ? 'bg-slate-950 text-[#38bdf8]'
                        : 'bg-white/10 text-slate-400'
                    }`}>
                      {wizardStep > s.num ? '✓' : s.num}
                    </span>
                    <span className="whitespace-nowrap">{s.label}</span>
                  </button>
                  {idx < arr.length - 1 && (
                    <div className={`h-[2px] flex-1 min-w-[12px] transition-colors ${wizardStep > s.num ? 'bg-[#0057c7]' : 'bg-white/10'}`} />
                  )}
                </Fragment>
              ))}
            </div>

            {/* Mobile Stepper Indicator */}
            <div className="sm:hidden flex items-center justify-between">
              <span className="text-xs font-bold text-white">Step {wizardStep} of 4</span>
              <span className="text-[11px] font-semibold text-[#38bdf8] bg-[#0057c7]/20 border border-[#0057c7]/30 px-2.5 py-0.5 rounded-full">
                {[
                  '1. Matter & Client',
                  '2. Adaptive Details',
                  '3. Parties & Roles',
                  '4. Review & Confirm'
                ][wizardStep - 1]}
              </span>
            </div>
          </div>

          {/* Step 1: Retaining Client & Case Setup */}
          {wizardStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0057c7]/15 text-[#38bdf8] text-xl">
                  ⚖️
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Step 1: Matter & Primary Retaining Client</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Define the legal matter context and the single Primary Retaining Client. Additional parties are added in Step 3.</p>
                </div>
              </div>

              {/* Section A: Matter Information */}
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.03] space-y-4">
                <h4 className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider">Section A: Matter Details</h4>
                <div className="space-y-4">
                  <Field label="Matter Title" required>
                    <Input
                      name="title"
                      value={formState.title !== undefined ? formState.title : ''}
                      onChange={e => setFormState(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="E.g., Jane Doe vs. State Farm / Smith Family Visa Application"
                      required
                    />
                  </Field>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Practice Area" required>
                      <Select name="practice_area" value={formState.practice_area || 'Personal Injury'} onChange={handleChange} required>
                        {practiceAreas.length > 0 ? practiceAreas.map(pa => (
                          <option key={pa.id} value={pa.name}>{pa.name}</option>
                        )) : (
                          <>
                            <option value="Personal Injury">Personal Injury</option>
                            <option value="Immigration">Immigration</option>
                            <option value="Civil Litigation">Civil Litigation</option>
                            <option value="Family Law">Family Law</option>
                            <option value="Corporate Law">Corporate Law</option>
                            <option value="Criminal Defense">Criminal Defense</option>
                            <option value="Employment">Employment</option>
                          </>
                        )}
                      </Select>
                    </Field>

                    <Field label="Matter Type">
                      <Select name="matter_type" value={formState.matter_type || ''} onChange={handleChange}>
                        <option value="">Select Matter Type...</option>
                        {getPracticeAreaConfig(formState.practice_area || 'Personal Injury').supportedMatterTypes.map(mt => (
                          <option key={mt} value={mt}>{mt}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Priority Level" required>
                      <Select name="priority" value={formState.priority || 'medium'} onChange={handleChange} required>
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                      </Select>
                    </Field>

                    <Field label="Assigned Lawyer / Attorney">
                      <Select
                        name="assigned_lawyer_id"
                        value={formState.assigned_lawyer_id !== undefined ? formState.assigned_lawyer_id : (data?.assigned_lawyer_id || '')}
                        onChange={handleChange}
                      >
                        <option value="">-- Unassigned / Select Lawyer --</option>
                        {lawyerRows.map(l => {
                          const lName = l.full_name || l.name || l.user?.full_name || `${l.first_name || ''} ${l.last_name || ''}`.trim() || `Lawyer #${l.id}`;
                          const lEmail = l.email || l.user?.email ? ` (${l.email || l.user?.email})` : '';
                          return (
                            <option key={l.id} value={l.id}>
                              {lName} {lEmail}
                            </option>
                          );
                        })}
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Case / Docket Number">
                      <Input name="case_number" defaultValue={formState.case_number || ''} placeholder="E.g., CIV-2026-9874" />
                    </Field>

                    <Field label="Case Value ($)">
                      <Input name="case_value" type="number" step="0.01" defaultValue={formState.case_value || ''} placeholder="E.g., 50000.00" />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Section A2: Court & Docket Information */}
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.03] space-y-4">
                <h4 className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider">Section A2: Court &amp; Docket Information <span className="text-slate-500 font-normal normal-case">(Optional)</span></h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Court Name">
                    <Input name="court_name" defaultValue={formState.court_name || ''} placeholder="E.g., Los Angeles Superior Court" />
                  </Field>
                  <Field label="Judge Name">
                    <Input name="judge_name" defaultValue={formState.judge_name || ''} placeholder="E.g., Honorable Jane Doe" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Court Address">
                    <Input name="court_address" defaultValue={formState.court_address || ''} placeholder="E.g., 111 N Hill St, Los Angeles" />
                  </Field>
                  <Field label="Court Type">
                    <Select name="court_type" value={formState.court_type || 'state'} onChange={handleChange}>
                      <option value="state">State Court</option>
                      <option value="federal">Federal Court</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(!formState.court_type || formState.court_type === 'state') ? (
                    <Field label="Court County">
                      <Select name="court_county" defaultValue={formState.court_county || ''} onChange={handleChange}>
                        <option value="">-- None / Out of State --</option>
                        {CALIFORNIA_COUNTIES.map(county => (
                          <option key={county} value={county}>{county}</option>
                        ))}
                      </Select>
                    </Field>
                  ) : (
                    <Field label="Federal Court">
                      <Select name="federal_court" defaultValue={formState.federal_court || ''} onChange={handleChange}>
                        <option value="">-- Select Federal Court --</option>
                        {FEDERAL_COURTS.map(fc => (
                          <option key={fc} value={fc}>{fc}</option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  <Field label="Department Number">
                    <Input name="court_department" defaultValue={formState.court_department || ''} placeholder="E.g., Dept 12" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Hearing / Trial Time">
                    <Input name="hearing_time" defaultValue={formState.hearing_time || ''} placeholder="E.g., 09:30 AM" />
                  </Field>
                </div>
              </div>

              {/* Section B: Primary Retaining Client Card */}
              <div className="p-5 rounded-xl border border-[#0057c7]/30 bg-[#0057c7]/5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Section B: Retaining Client</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Select an existing client from your firm or enter a new client below.</p>
                  </div>
                  <span className="text-[10px] text-white bg-[#0057c7] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                    RETAINING CLIENT
                  </span>
                </div>

                {/* Existing Client Selector */}
                <input type="hidden" name="client_id" value={formState.client_id || formState.selected_client_id || ''} />
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <Field label="Select Existing Client (Optional)">
                    <Select
                      name="existing_client_select"
                      value={formState.existing_client_select || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (!selectedId) {
                          setFormState(prev => ({
                            ...prev,
                            existing_client_select: '',
                            selected_client_id: '',
                            client_id: '',
                            clientId: '',
                            retaining_client_name: '',
                            retaining_client_email: '',
                            retaining_client_phone: '',
                            retaining_client_address: '',
                            retaining_client_dob: '',
                            retaining_client_gov_id: '',
                          }));
                          return;
                        }
                        const client = clientRows.find(c => String(c.id) === String(selectedId));
                        if (client) {
                          const clientName = client.full_name || client.name || client.organization_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.user?.full_name || `Client #${client.id}`;
                          const clientEmail = client.email || client.user?.email || '';
                          const clientPhone = client.phone || client.mobile || client.user?.phone || '';
                          const clientAddress = client.home_address || client.address || client.business_address || '';
                          const clientDob = client.date_of_birth ? new Date(client.date_of_birth).toISOString().split('T')[0] : (client.dob || '');
                          const clientGovId = client.government_id || client.gov_id || client.ssn || '';

                          setFormState(prev => ({
                            ...prev,
                            existing_client_select: selectedId,
                            selected_client_id: selectedId,
                            client_id: selectedId,
                            clientId: selectedId,
                            retaining_client_name: clientName,
                            retaining_client_email: clientEmail,
                            retaining_client_phone: clientPhone,
                            retaining_client_address: clientAddress,
                            retaining_client_dob: clientDob,
                            retaining_client_gov_id: clientGovId,
                          }));
                        }
                      }}
                    >
                      <option value="">-- Create New Client / Custom Input --</option>
                      {clientRows.map(c => {
                        const name = c.full_name || c.name || c.organization_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.user?.full_name || `Client #${c.id}`;
                        const emailStr = c.email || c.user?.email || '';
                        const phoneStr = c.phone || c.mobile || '';
                        return (
                          <option key={c.id} value={c.id}>
                            {name} {emailStr ? `(${emailStr})` : ''} {phoneStr ? `· ${phoneStr}` : ''}
                          </option>
                        );
                      })}
                    </Select>
                  </Field>
                  {formState.existing_client_select && (
                    <div className="flex items-center justify-between text-[11px] text-emerald-400 bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-500/30">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-300 font-bold">✓</span>
                        <span>Selected Existing Client: <strong className="text-white">{formState.retaining_client_name}</strong> {formState.retaining_client_email && `(${formState.retaining_client_email})`}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormState(prev => ({
                            ...prev,
                            existing_client_select: '',
                            selected_client_id: '',
                            client_id: '',
                            clientId: '',
                            retaining_client_name: '',
                            retaining_client_email: '',
                            retaining_client_phone: '',
                            retaining_client_address: '',
                            retaining_client_dob: '',
                            retaining_client_gov_id: '',
                          }));
                        }}
                        className="text-xs text-rose-300 hover:text-rose-200 font-bold hover:underline ml-2"
                      >
                        ✕ Clear Selection
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Retaining Client Full Name" required>
                    <Input
                      name="retaining_client_name"
                      value={formState.retaining_client_name !== undefined ? formState.retaining_client_name : ''}
                      onChange={e => setFormState(prev => ({ ...prev, retaining_client_name: e.target.value }))}
                      placeholder="John Doe"
                      required
                    />
                  </Field>
                  <Field label="Email Address" required>
                    <Input
                      name="retaining_client_email"
                      type="email"
                      value={formState.retaining_client_email !== undefined ? formState.retaining_client_email : ''}
                      onChange={e => setFormState(prev => ({ ...prev, retaining_client_email: e.target.value }))}
                      placeholder="john@example.com"
                      required
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Phone Number">
                    <Input
                      name="retaining_client_phone"
                      value={formState.retaining_client_phone !== undefined ? formState.retaining_client_phone : ''}
                      onChange={e => setFormState(prev => ({ ...prev, retaining_client_phone: formatUSPhone(e.target.value) }))}
                      placeholder="+1 (555) 000-0000"
                    />
                  </Field>
                  <Field label="Date of Birth">
                    <Input
                      name="retaining_client_dob"
                      type="date"
                      value={formState.retaining_client_dob !== undefined ? formState.retaining_client_dob : ''}
                      onChange={e => setFormState(prev => ({ ...prev, retaining_client_dob: e.target.value }))}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Home / Business Address">
                    <Input
                      name="retaining_client_address"
                      value={formState.retaining_client_address !== undefined ? formState.retaining_client_address : ''}
                      onChange={e => setFormState(prev => ({ ...prev, retaining_client_address: e.target.value }))}
                      placeholder="123 Main Street, Suite 100"
                    />
                  </Field>
                  <div>
                    <input type="hidden" name="retaining_client_gov_id" value={formState.retaining_client_gov_id !== undefined ? formState.retaining_client_gov_id : ''} />
                    <ConfidentialIdFields
                      value={formState.retaining_client_gov_id !== undefined ? formState.retaining_client_gov_id : ''}
                      onChange={val => setFormState(prev => ({ ...prev, retaining_client_gov_id: val }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => handleStepChange(2)} className="btn btn-primary px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-[#0057c7]/30">
                  Continue to Adaptive Details →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Adaptive Practice Triggers */}
          {wizardStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0057c7]/15 text-[#38bdf8] text-xl">
                  ⚡
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Step 2: Adaptive Practice Screening</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Select the circumstances relevant to this matter. Additional fields and sections will appear only when needed.</p>
                </div>
              </div>

              <AdaptiveSection
                id="vehicle_hub"
                title="Personal Injury Screening"
                icon="🚗"
                badge="PERSONAL INJURY"
                practiceArea={formState.practice_area || 'Personal Injury'}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(enabledModules.length > 0 ? enabledModules : DEFAULT_CORE_MODULES).map(mod => {
                    const coreCfg = CORE_SCREENING_MAP[mod.key];
                    if (mod.is_core || coreCfg) {
                      if (!coreCfg) return null;
                      const isChecked = Boolean(adaptiveQuestions[coreCfg.stateKey]);
                      return (
                        <label key={mod.key || mod.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${isChecked ? 'bg-[#0057c7]/10 border-[#0057c7]/40 ring-1 ring-[#0057c7]/30' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => setAdaptiveQuestions(prev => ({ ...prev, [coreCfg.stateKey]: e.target.checked }))}
                            className="mt-1 rounded bg-white/10 border-white/20 text-[#0057c7] focus:ring-0"
                          />
                          <div>
                            <span className="text-xs font-bold text-white block">{coreCfg.title}</span>
                            <span className="text-[11px] text-slate-400 mt-0.5 block">{coreCfg.description}</span>
                          </div>
                        </label>
                      );
                    }

                    // Custom Non-Core Module
                    const isChecked = Boolean(adaptiveQuestions[mod.key]);
                    return (
                      <label key={mod.id || mod.key} className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${isChecked ? 'bg-[#0057c7]/10 border-[#0057c7]/40 ring-1 ring-[#0057c7]/30' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => setAdaptiveQuestions(prev => ({ ...prev, [mod.key]: e.target.checked }))}
                          className="mt-1 rounded bg-white/10 border-white/20 text-[#0057c7] focus:ring-0"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">{mod.icon || '📋'} {mod.title}</span>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">{mod.description || `${mod.title} module`}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Dynamic Module Sections (reflecting Settings order & enabled status) */}
                {(enabledModules.length > 0 ? enabledModules : DEFAULT_CORE_MODULES).map(mod => {
                  if (mod.key === 'vehicle' && adaptiveQuestions.vehiclesInvolved) {
                    return (
                      <React.Fragment key="mod_sec_vehicle">
                        {/* ─── MODULE 1: Vehicle Management ───────────────────────────────────── */}
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-fade-in">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-start gap-3.5">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0057c7]/15 text-[#38bdf8] text-xl">
                                🚘
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-white">Vehicle Management Module</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Record all vehicles involved in this incident or legal matter.</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setEditingVehicleId(null); setShowVehicleModal(true); }}
                              className="bg-[#0057c7] hover:bg-[#004aa8] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#0057c7]/30 transition-all"
                            >
                              <span>+ Add Vehicle</span>
                            </button>
                          </div>

                          {/* Enterprise Vehicle Controls */}
                          {vehiclesList.length > 0 && (() => {
                            const VTYPES = ['Car','SUV','Truck','Motorcycle','Van','Bus','Commercial Vehicle','Trailer','Bicycle','Scooter','Other'];
                            return (
                              <div className="space-y-3 bg-white/[0.02] p-3.5 rounded-2xl border border-white/10">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/10 text-white border border-white/10">Vehicles ({vehiclesList.length})</span>
                                    {VTYPES.map(t => {
                                      const cnt = vehiclesList.filter(v => v.vehicle_type === t).length;
                                      if (!cnt) return null;
                                      return <span key={t} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#0057c7]/10 text-[#38bdf8] border border-[#38bdf8]/20">{t} ({cnt})</span>;
                                    })}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const headers = ['Type','Year','Make','Model','Color','VIN','Plate','State','Insurance','Policy#','Claim#','Status','Notes'];
                                      const rows = vehiclesList.map(v => [v.vehicle_type||'',v.year||'',v.make||'',v.model||'',v.color||'',v.vin||'',v.license_plate||'',v.license_state||'',v.insurance_company||'',v.policy_number||'',v.claim_number||'',v.status||'',v.notes||''].map(c => `"${String(c).replace(/"/g,'""')}"`));
                                      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','),...rows.map(r=>r.join(','))].join('\n');
                                      const a = document.createElement('a'); a.href = encodeURI(csv); a.download = `vehicles_${Date.now()}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                      toast('Vehicles exported to CSV!', 'success');
                                    }}
                                    className="btn btn-secondary px-2.5 py-1 rounded-lg text-[10px] font-bold"
                                  >Export CSV</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    value={vehicleSearchTerm}
                                    onChange={e => setVehicleSearchTerm(e.target.value)}
                                    placeholder="Search VIN, Plate, Make, Model..."
                                    className="sm:col-span-1 w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                                  />
                                  <select value={vehicleTypeFilter} onChange={e => setVehicleTypeFilter(e.target.value)} className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]">
                                    <option value="All">All Types</option>
                                    {['Car','SUV','Truck','Motorcycle','Van','Bus','Commercial Vehicle','Trailer','Bicycle','Scooter','Other'].map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                  <select value={vehicleSort} onChange={e => setVehicleSort(e.target.value)} className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]">
                                    <option value="year_desc">Sort: Newest Year</option>
                                    <option value="year_asc">Sort: Oldest Year</option>
                                    <option value="make">Sort: Make A-Z</option>
                                    <option value="model">Sort: Model A-Z</option>
                                    <option value="recent">Sort: Recently Added</option>
                                  </select>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Vehicle Cards */}
                          {(() => {
                            let filtered = [...vehiclesList];

                            if (vehicleSearchTerm.trim()) {
                              const t = vehicleSearchTerm.trim().toLowerCase();
                              filtered = filtered.filter(v =>
                                (v.make||'').toLowerCase().includes(t) || (v.model||'').toLowerCase().includes(t) ||
                                (v.vin||'').toLowerCase().includes(t) || (v.license_plate||'').toLowerCase().includes(t) ||
                                (v.insurance_company||'').toLowerCase().includes(t) || (v.color||'').toLowerCase().includes(t) ||
                                `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(t)
                              );
                            }
                            if (vehicleTypeFilter !== 'All') filtered = filtered.filter(v => v.vehicle_type === vehicleTypeFilter);
                            if (vehicleSort === 'year_desc') filtered.sort((a,b) => (Number(b.year)||0)-(Number(a.year)||0));
                            else if (vehicleSort === 'year_asc') filtered.sort((a,b) => (Number(a.year)||0)-(Number(b.year)||0));
                            else if (vehicleSort === 'make') filtered.sort((a,b) => (a.make||'').localeCompare(b.make||''));
                            else if (vehicleSort === 'model') filtered.sort((a,b) => (a.model||'').localeCompare(b.model||''));
                            else if (vehicleSort === 'recent') filtered.reverse();

                            if (filtered.length === 0) {
                              return (
                                <div className="p-6 rounded-xl border border-dashed border-white/10 text-center space-y-2 bg-white/[0.01]">
                                  <p className="text-xs text-slate-400">{vehicleSearchTerm ? `No vehicles match "${vehicleSearchTerm}".` : 'No vehicles recorded yet.'}</p>
                                  <button type="button" onClick={() => { setEditingVehicleId(null); setShowVehicleModal(true); }} className="btn btn-secondary px-3.5 py-1.5 rounded-xl text-xs font-semibold mt-1">+ Add First Vehicle</button>
                                </div>
                              );
                            }

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                                {filtered.map((v, idx) => {
                                  const vid = v.vehicle_id || v.id || idx;
                                  const vtype = v.vehicle_type || 'Car';
                                  return (
                                    <div key={vid} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#38bdf8]/30 transition-all">
                                      <div className="flex justify-between items-start">
                                        <div className="space-y-1 flex-1 pr-2">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-white">{v.year || ''} {v.make} {v.model}</span>
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#0057c7]/20 text-[#38bdf8] border border-[#38bdf8]/30 uppercase">{vtype}</span>
                                          </div>
                                          {v.license_plate && <p className="text-xs font-mono text-[#38bdf8]">Plate: {v.license_plate}{v.license_state ? ` (${v.license_state})` : ''}</p>}
                                          {v.vin && <p className="text-xs font-mono text-slate-400">VIN: •••••••••••{v.vin.slice(-5)}</p>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button type="button" onClick={() => { setEditingVehicleId(vid); setTempVehicle({ ...v }); setShowVehicleModal(true); }} className="text-xs text-slate-400 hover:text-[#38bdf8] font-bold">Edit</button>
                                          <button type="button" onClick={() => { if (window.confirm('Remove vehicle?')) setVehiclesList(prev => prev.filter(item => (item.vehicle_id || item.id) !== vid)); }} className="text-xs text-slate-500 hover:text-rose-400 font-bold ml-1">✕</button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>

                        {/* ─── MODULE 2: Driver Module ────────────────────────────────────────── */}
                        {(adaptiveQuestions.vehiclesInvolved || adaptiveQuestions.driverInvolved) && (
                          <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                              <div className="flex items-start gap-3.5">
                                <div>
                                  <h4 className="text-sm font-semibold text-white">Driver Management Module</h4>
                                  <p className="text-xs text-slate-400 mt-0.5">Manage drivers, license verification, CDL compliance & vehicle assignments.</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => openPartyModalWithRole('Driver')}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all"
                              >
                                <span>+ Add Driver</span>
                              </button>
                            </div>

                            {(() => {
                              const drivers = partiesList.filter(p => (p.party_roles || [p.party_role]).includes('Driver'));
                              if (drivers.length === 0) {
                                return (
                                  <div className="p-6 rounded-xl border border-dashed border-purple-500/20 text-center bg-purple-500/[0.02]">
                                    <p className="text-xs text-slate-400">No driver profiles recorded yet.</p>
                                    <button type="button" onClick={() => openPartyModalWithRole('Driver')} className="mt-2 text-xs text-purple-300 font-bold hover:underline">+ Add First Driver</button>
                                  </div>
                                );
                              }
                              return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {drivers.map(d => {
                                    const dp = d.role_data?.Driver || d.driver_profile || {};
                                    const linkedVeh = vehiclesList.find(v => (v.vehicle_id || v.id) === dp.assigned_vehicle_id || v.driver_party_id === d.id);
                                    return (
                                      <div key={d.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-purple-500/30 flex justify-between items-start">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-white">{d.full_name || d.company_name}</span>
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">DRIVER</span>
                                            {dp.is_commercial_driver && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">CDL</span>}
                                          </div>
                                          {dp.license_number && <p className="text-xs font-mono text-purple-300">DL: {dp.license_number} ({dp.license_state || 'N/A'})</p>}
                                          {linkedVeh && <p className="text-xs text-[#38bdf8]">Assigned: {linkedVeh.year} {linkedVeh.make} {linkedVeh.model}</p>}
                                          {dp.employer && <p className="text-xs text-slate-400">Employer: {dp.employer}</p>}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <button type="button" onClick={() => handleEditParty(d)} className="text-xs text-purple-300 hover:text-white font-bold">Edit</button>
                                          <button type="button" onClick={() => handleDeleteParty(d)} className="text-xs text-slate-500 hover:text-rose-400 font-bold">✕ Delete</button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  }

                  if (mod.key === 'passenger' && adaptiveQuestions.passengersInvolved) {
                    return (
                      <React.Fragment key="mod_sec_passenger">
                        {/* ─── MODULE 3: Passenger Module ─────────────────────────────────────── */}
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-fade-in">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-start gap-3.5">
                              <div>
                                <h4 className="text-sm font-semibold text-white">Passenger Management Module</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Track seating, restraints, injuries, medical treatment & emergency contacts for all passengers.</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openPartyModalWithRole('Passenger')}
                              className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-sky-600/30 transition-all"
                            >
                              <span>+ Add Passenger</span>
                            </button>
                          </div>

                          {(() => {
                            const passengers = partiesList.filter(p => (p.party_roles || [p.party_role]).includes('Passenger'));
                            if (passengers.length === 0) {
                              return (
                                <div className="p-6 rounded-xl border border-dashed border-sky-500/20 text-center bg-sky-500/[0.02]">
                                  <p className="text-xs text-slate-400">No passenger profiles recorded yet.</p>
                                  <button type="button" onClick={() => openPartyModalWithRole('Passenger')} className="mt-2 text-xs text-sky-300 font-bold hover:underline">+ Add First Passenger</button>
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {passengers.map(p => {
                                  const pp = p.role_data?.Passenger || p.passenger_profile || {};
                                  const linkedVeh = vehiclesList.find(v => (v.vehicle_id || v.id) === pp.assigned_vehicle_id || (Array.isArray(v.passenger_party_ids) && v.passenger_party_ids.includes(p.id)));
                                  const linkedDrv = partiesList.find(dp => (dp.id === pp.assigned_driver_party_id) && (dp.party_roles || [dp.party_role]).includes('Driver'));
                                  return (
                                    <div key={p.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-sky-500/30 flex justify-between items-start">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-white">{p.full_name || p.company_name}</span>
                                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">PASSENGER</span>
                                        </div>
                                        <p className="text-xs text-sky-300">Seat: {pp.seat_position || 'Front Right'}</p>
                                        {linkedVeh && <p className="text-xs text-[#38bdf8]">Vehicle: {linkedVeh.year} {linkedVeh.make} {linkedVeh.model}</p>}
                                        {linkedDrv && <p className="text-xs text-purple-300">Driver: {linkedDrv.full_name}</p>}
                                        {pp.hospital && <p className="text-xs text-rose-300">Hospital: {pp.hospital}</p>}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button type="button" onClick={() => handleEditParty(p)} className="text-xs text-sky-300 hover:text-white font-bold">Edit</button>
                                        <button type="button" onClick={() => handleDeleteParty(p)} className="text-xs text-slate-500 hover:text-rose-400 font-bold">✕ Delete</button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </React.Fragment>
                    );
                  }

                  if (mod.key === 'witness' && adaptiveQuestions.witnessInvolved) {
                    return (
                      <React.Fragment key="mod_sec_witness">
                        {/* ─── MODULE 4: Witness Module ───────────────────────────────────────── */}
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-fade-in">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-start gap-3.5">
                              <div>
                                <h4 className="text-sm font-semibold text-white">Witness Management Module</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Record eyewitness statements, contact information & testimony details.</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openPartyModalWithRole('Witness')}
                              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-600/30 transition-all"
                            >
                              <span>+ Add Witness</span>
                            </button>
                          </div>

                          {(() => {
                            const witnesses = partiesList.filter(p => (p.party_roles || [p.party_role]).includes('Witness'));
                            if (witnesses.length === 0) {
                              return (
                                <div className="p-6 rounded-xl border border-dashed border-amber-500/20 text-center bg-amber-500/[0.02]">
                                  <p className="text-xs text-slate-400">No witnesses recorded yet.</p>
                                  <button type="button" onClick={() => openPartyModalWithRole('Witness')} className="mt-2 text-xs text-amber-300 font-bold hover:underline">+ Add First Witness</button>
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {witnesses.map(w => (
                                  <div key={w.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-amber-500/30 flex justify-between items-start">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-white">{w.full_name}</span>
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">WITNESS</span>
                                      </div>
                                      {w.phone && <p className="text-xs text-slate-400">Phone: {w.phone}</p>}
                                      {w.notes && <p className="text-xs text-slate-300 italic">"{w.notes}"</p>}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button type="button" onClick={() => handleEditParty(w)} className="text-xs text-amber-300 hover:text-white font-bold">Edit</button>
                                      <button type="button" onClick={() => handleDeleteParty(w)} className="text-xs text-slate-500 hover:text-rose-400 font-bold">✕ Delete</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </React.Fragment>
                    );
                  }

                  if (mod.key === 'insurance' && adaptiveQuestions.insuranceInvolved) {
                    return (
                      <React.Fragment key="mod_sec_insurance">
                        {/* ─── MODULE 5: Insurance Module ─────────────────────────────────────── */}
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-fade-in">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-start gap-3.5">
                              <div>
                                <h4 className="text-sm font-semibold text-white">Insurance Adjuster & Policy Module</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Record insurance adjusters, claims representatives, policy limits & claim numbers.</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openPartyModalWithRole('Insurance Adjuster')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
                            >
                              <span>+ Add Insurance Adjuster</span>
                            </button>
                          </div>

                          {(() => {
                            const insParties = partiesList.filter(p => (p.party_roles || [p.party_role]).some(r => ['Insurance Company', 'Insurance Adjuster'].includes(r)));
                            if (insParties.length === 0) {
                              return (
                                <div className="p-6 rounded-xl border border-dashed border-emerald-500/20 text-center bg-emerald-500/[0.02]">
                                  <p className="text-xs text-slate-400">No insurance adjusters or carriers recorded yet.</p>
                                  <button type="button" onClick={() => openPartyModalWithRole('Insurance Adjuster')} className="mt-2 text-xs text-emerald-300 font-bold hover:underline">+ Add First Insurance Representative</button>
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {insParties.map(ins => {
                                  const insData = ins.role_data?.Insurance || ins.insurance_profile || {};
                                  return (
                                    <div key={ins.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-emerald-500/30 flex justify-between items-start">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-white">{insData.company_name || ins.company_name || ins.full_name}</span>
                                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">INSURANCE</span>
                                        </div>
                                        {insData.policy_number && <p className="text-xs text-emerald-300">Policy #: {insData.policy_number}</p>}
                                        {insData.claim_status && <p className="text-xs text-slate-400">Status: {insData.claim_status}</p>}
                                        {insData.adjuster_name && <p className="text-xs text-slate-400">Adjuster: {insData.adjuster_name}</p>}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button type="button" onClick={() => handleEditParty(ins)} className="text-xs text-emerald-300 hover:text-white font-bold">Edit</button>
                                        <button type="button" onClick={() => handleDeleteParty(ins)} className="text-xs text-slate-500 hover:text-rose-400 font-bold">✕ Delete</button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </React.Fragment>
                    );
                  }

                  if (mod.key === 'medical' && adaptiveQuestions.injured) {
                    return (
                      <React.Fragment key="mod_sec_medical">
                        {/* ─── MODULE 6: Medical & Injury Module ──────────────────────────────── */}
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-fade-in">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-start gap-3.5">
                              <div>
                                <h4 className="text-sm font-semibold text-white">Medical Provider & Treatment Module</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Track hospitals, physicians, medical treatment, bill amounts & medical records.</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openPartyModalWithRole('Medical Provider')}
                              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all"
                            >
                              <span>+ Add Medical Provider</span>
                            </button>
                          </div>

                          {(() => {
                            const medParties = partiesList.filter(p => (p.party_roles || [p.party_role]).includes('Medical Provider'));
                            if (medParties.length === 0) {
                              return (
                                <div className="p-6 rounded-xl border border-dashed border-rose-500/20 text-center bg-rose-500/[0.02]">
                                  <p className="text-xs text-slate-400">No medical providers recorded yet.</p>
                                  <button type="button" onClick={() => openPartyModalWithRole('Medical Provider')} className="mt-2 text-xs text-rose-300 font-bold hover:underline">+ Add First Medical Provider</button>
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {medParties.map(med => {
                                  const mp = med.role_data?.MedicalProvider || med.medical_provider_profile || {};
                                  return (
                                    <div key={med.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-rose-500/30 flex justify-between items-start">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-white">{mp.provider_name || med.full_name || med.company_name}</span>
                                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">MEDICAL PROVIDER</span>
                                        </div>
                                        {mp.facility_name && <p className="text-xs text-rose-300">Facility: {mp.facility_name}</p>}
                                        {mp.diagnosis && <p className="text-xs text-slate-300">Diagnosis: {mp.diagnosis}</p>}
                                        {mp.treatment_status && <p className="text-xs text-slate-400">Status: {mp.treatment_status}</p>}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button type="button" onClick={() => handleEditParty(med)} className="text-xs text-rose-300 hover:text-white font-bold">Edit</button>
                                        <button type="button" onClick={() => handleDeleteParty(med)} className="text-xs text-slate-500 hover:text-rose-400 font-bold">✕ Delete</button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </React.Fragment>
                    );
                  }

                  if (mod.key === 'employer' && (adaptiveQuestions.commercialVehicle || adaptiveQuestions.employmentImpact)) {
                    return (
                      <React.Fragment key="mod_sec_employer">
                        {/* ─── MODULE 7: Employer Module ─────────────────────────────────────── */}
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-fade-in">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-start gap-3.5">
                              <div>
                                <h4 className="text-sm font-semibold text-white">Employer & Employment Module</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Track employment details, wage verification, supervisors & lost earnings.</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openPartyModalWithRole('Employer')}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all"
                            >
                              <span>+ Add Employer</span>
                            </button>
                          </div>

                          {(() => {
                            const empParties = partiesList.filter(p => (p.party_roles || [p.party_role]).includes('Employer'));
                            if (empParties.length === 0) {
                              return (
                                <div className="p-6 rounded-xl border border-dashed border-blue-500/20 text-center bg-blue-500/[0.02]">
                                  <p className="text-xs text-slate-400">No employer records recorded yet.</p>
                                  <button type="button" onClick={() => openPartyModalWithRole('Employer')} className="mt-2 text-xs text-blue-300 font-bold hover:underline">+ Add First Employer</button>
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {empParties.map(emp => {
                                  const ep = emp.role_data?.Employer || emp.employer_profile || {};
                                  return (
                                    <div key={emp.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-blue-500/30 flex justify-between items-start">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-white">{ep.employer_name || emp.company_name || emp.full_name}</span>
                                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">EMPLOYER</span>
                                        </div>
                                        {ep.occupation && <p className="text-xs text-blue-300">Occupation: {ep.occupation}</p>}
                                        {ep.employment_status && <p className="text-xs text-slate-400">Status: {ep.employment_status}</p>}
                                        {ep.lost_wages && <p className="text-xs text-emerald-300">Lost Wages: ${ep.lost_wages}</p>}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button type="button" onClick={() => handleEditParty(emp)} className="text-xs text-blue-300 hover:text-white font-bold">Edit</button>
                                        <button type="button" onClick={() => handleDeleteParty(emp)} className="text-xs text-slate-500 hover:text-rose-400 font-bold">✕ Delete</button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </React.Fragment>
                    );
                  }

                  if (mod.key === 'property_damage' && adaptiveQuestions.propertyDamage) {
                    return (
                      <React.Fragment key="mod_sec_property">
                        {/* ─── MODULE 8: Property Damage Module ───────────────────────────── */}
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-fade-in">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-start gap-3.5">
                              <div>
                                <h4 className="text-sm font-semibold text-white">Property Damage Module</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Track damaged property, repair estimates, shop assignments & damage severity.</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openPartyModalWithRole('Property Damage')}
                              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-600/30 transition-all"
                            >
                              <span>+ Add Damaged Property</span>
                            </button>
                          </div>

                          {(() => {
                            const pdParties = partiesList.filter(p => (p.party_roles || [p.party_role]).some(r => ['Property Damage', 'Property Owner'].includes(r)));
                            if (pdParties.length === 0) {
                              return (
                                <div className="p-6 rounded-xl border border-dashed border-orange-500/20 text-center bg-orange-500/[0.02]">
                                  <p className="text-xs text-slate-400">No damaged property records recorded yet.</p>
                                  <button type="button" onClick={() => openPartyModalWithRole('Property Damage')} className="mt-2 text-xs text-orange-300 font-bold hover:underline">+ Add First Damaged Property</button>
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {pdParties.map(pd => {
                                  const pdData = pd.role_data?.PropertyDamage || pd.property_damage_profile || {};
                                  return (
                                    <div key={pd.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-orange-500/30 flex justify-between items-start">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-white">{pdData.owner_name || pd.full_name || pd.company_name}</span>
                                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">PROPERTY DAMAGE</span>
                                        </div>
                                        {pdData.property_type && <p className="text-xs text-orange-300">Type: {pdData.property_type}</p>}
                                        {pdData.damage_severity && <p className="text-xs text-slate-400">Severity: {pdData.damage_severity}</p>}
                                        {pdData.repair_status && <p className="text-xs text-slate-400">Status: {pdData.repair_status}</p>}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button type="button" onClick={() => handleEditParty(pd)} className="text-xs text-orange-300 hover:text-white font-bold">Edit</button>
                                        <button type="button" onClick={() => handleDeleteParty(pd)} className="text-xs text-slate-500 hover:text-rose-400 font-bold">✕ Delete</button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </React.Fragment>
                    );
                  }

                  if (mod.key === 'police' && adaptiveQuestions.policeReportAvailable) {
                    return (
                      <React.Fragment key="mod_sec_police">
                        {/* ─── MODULE 9: Police & Investigation Module ────────────────────── */}
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-fade-in">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-start gap-3.5">
                              <div>
                                <h4 className="text-sm font-semibold text-white">Police & Investigation Module</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Track police reports, officers, badge numbers, citations, evidence & investigations.</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openPartyModalWithRole('Police')}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all"
                            >
                              <span>+ Add Police Report</span>
                            </button>
                          </div>

                          {(() => {
                            const polParties = partiesList.filter(p => (p.party_roles || [p.party_role]).some(r => ['Police', 'Police Officer', 'Investigating Agency'].includes(r)));
                            if (polParties.length === 0) {
                              return (
                                <div className="p-6 rounded-xl border border-dashed border-indigo-500/20 text-center bg-indigo-500/[0.02]">
                                  <p className="text-xs text-slate-400">No police reports or investigating officers recorded yet.</p>
                                  <button type="button" onClick={() => openPartyModalWithRole('Police')} className="mt-2 text-xs text-indigo-300 font-bold hover:underline">+ Add First Police Record</button>
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {polParties.map(pol => {
                                  const polData = pol.role_data?.Police || pol.police_profile || {};
                                  return (
                                    <div key={pol.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-indigo-500/30 flex justify-between items-start">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-white">{polData.officer_name || pol.full_name || 'Officer'}</span>
                                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">POLICE</span>
                                        </div>
                                        {polData.reporting_agency && <p className="text-xs text-indigo-300">Agency: {polData.reporting_agency}</p>}
                                        {polData.report_number && <p className="text-xs text-slate-400">Report #: {polData.report_number}</p>}
                                        {polData.investigation_status && <p className="text-xs text-slate-400">Status: {polData.investigation_status}</p>}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button type="button" onClick={() => handleEditParty(pol)} className="text-xs text-indigo-300 hover:text-white font-bold">Edit</button>
                                        <button type="button" onClick={() => handleDeleteParty(pol)} className="text-xs text-slate-500 hover:text-rose-400 font-bold">✕ Delete</button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </React.Fragment>
                    );
                  }

                  if (!mod.is_core && !CORE_SCREENING_MAP[mod.key] && adaptiveQuestions[mod.key]) {
                    const records = customModuleRecords[mod.key] || [];
                    return (
                      <React.Fragment key={`mod_sec_custom_${mod.id || mod.key}`}>
                        {/* ─── DYNAMIC CUSTOM MODULES ────────────────────────────────────── */}
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-fade-in">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-start gap-3.5">
                              <div>
                                <h4 className="text-sm font-semibold text-white">{mod.title} Module</h4>
                                <p className="text-xs text-slate-400 mt-0.5">{mod.description || 'Custom dynamic module'}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCustomModule(mod);
                                setCustomModuleFormData({});
                                setEditingCustomModuleRecordId(null);
                                setShowCustomModuleModal(true);
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all"
                            >
                              <span>+ Add {mod.title}</span>
                            </button>
                          </div>

                          {records.length === 0 ? (
                            <div className="p-6 rounded-xl border border-dashed border-purple-500/20 text-center bg-purple-500/[0.02]">
                              <p className="text-xs text-slate-400">No {mod.title.toLowerCase()} records yet.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveCustomModule(mod);
                                  setCustomModuleFormData({});
                                  setEditingCustomModuleRecordId(null);
                                  setShowCustomModuleModal(true);
                                }}
                                className="mt-2 text-xs text-purple-300 font-bold hover:underline"
                              >+ Add First {mod.title}</button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                              {records.map((rec) => {
                                const fields = mod.fields || [];
                                const firstField = fields[0];
                                const secondField = fields[1];
                                const displayTitle = firstField ? (rec[firstField.field_key] || '') : `Record`;
                                const displaySub = secondField ? (rec[secondField.field_key] || '') : '';
                                return (
                                  <div key={rec.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-purple-400/30 transition-all">
                                    <div className="flex justify-between items-start">
                                      <div className="space-y-1 flex-1 pr-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs font-bold text-white">{displayTitle || mod.title}</span>
                                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">{mod.title}</span>
                                        </div>
                                        {displaySub && <p className="text-xs text-purple-300">{secondField.field_label}: {displaySub}</p>}
                                        {fields.slice(2, 4).map(f => rec[f.field_key] ? (
                                          <p key={f.field_key} className="text-xs text-slate-400">{f.field_label}: {String(rec[f.field_key])}</p>
                                        ) : null)}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => {
                                          setActiveCustomModule(mod);
                                          setCustomModuleFormData({ ...rec });
                                          setEditingCustomModuleRecordId(rec.id);
                                          setShowCustomModuleModal(true);
                                        }} className="text-xs text-slate-400 hover:text-purple-300 font-bold">✏️ Edit</button>
                                        <button type="button" onClick={() => {
                                          setDeleteCustomModuleConfirm({ moduleKey: mod.key, recordId: rec.id, title: mod.title });
                                        }} className="text-xs text-slate-500 hover:text-rose-400 font-bold ml-1">✕</button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  }

                  return null;
                })}
              </AdaptiveSection>

              {/* Immigration Screening Grid */}
              <AdaptiveSection
                id="immigration_details"
                title="Immigration Filing Details"
                icon="🌐"
                badge="IMMIGRATION"
                practiceArea={formState.practice_area || 'Personal Injury'}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Primary Relief Sought" required>
                    <Select name="relief_sought" value={adaptiveQuestions.reliefSought} onChange={e => setAdaptiveQuestions(prev => ({ ...prev, reliefSought: e.target.value }))}>
                      <option value="Asylum / Refugee">Asylum / Refugee</option>
                      <option value="Green Card / Permanent Residency">Green Card / Permanent Residency</option>
                      <option value="H1B / Work Visa">H1B / Work Visa</option>
                      <option value="Family Sponsorship (I-130)">Family Sponsorship (I-130)</option>
                      <option value="Adjustment of Status (I-485)">Adjustment of Status (I-485)</option>
                      <option value="Naturalization / Citizenship">Naturalization / Citizenship</option>
                      <option value="Deportation Defense">Deportation Defense</option>
                    </Select>
                  </Field>

                  <Field label="Client Case Role" required>
                    <Select name="immigration_role" value={adaptiveQuestions.immigrationRole} onChange={e => setAdaptiveQuestions(prev => ({ ...prev, immigrationRole: e.target.value }))}>
                      <option value="Applicant">Applicant</option>
                      <option value="Beneficiary">Beneficiary</option>
                      <option value="Petitioner">Petitioner</option>
                      <option value="Respondent">Respondent</option>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Employer Name">
                    <Input name="employer_name" defaultValue={formState.employer_name || ''} placeholder="E.g., Acme Corporation" />
                  </Field>
                  <Field label="Job Title / Position">
                    <Input name="job_title" defaultValue={formState.job_title || ''} placeholder="Senior Analyst" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Date of Hire">
                    <Input name="hire_date" type="date" defaultValue={formState.hire_date || ''} />
                  </Field>
                  <Field label="Termination / Incident Date">
                    <Input name="termination_date" type="date" defaultValue={formState.termination_date || ''} />
                  </Field>
                </div>
              </AdaptiveSection>

              {/* Dates & Case Numbers Card */}
              <AdaptiveSection
                id="timeline_dates"
                title="Filing Dates & Legal Identifiers"
                icon="📅"
                practiceArea={formState.practice_area || 'Personal Injury'}
              >
                <div className="mb-4">
                  <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">
                    Case Stage / Tracking Type
                  </label>
                  <div className="flex gap-4 mt-2">
                    {[
                      { value: 'court', label: 'Court Case' },
                      { value: 'claim', label: 'Pre-Litigation / Claim' }
                    ].map(opt => {
                      const currentType = formState.tracking_type || 'court';
                      return (
                        <label key={opt.value} className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                          <input
                            type="radio"
                            name="tracking_type"
                            value={opt.value}
                            checked={currentType === opt.value}
                            onChange={e => setFormState(s => ({ ...s, tracking_type: e.target.value }))}
                            className="accent-[#38bdf8]"
                          />
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label={(formState.tracking_type || 'court') === 'claim' ? 'Claim Opening Date' : 'Initial Filing Date'}><Input name="initial_filing_date" type="date" defaultValue={formState.initial_filing_date || ''} /></Field>
                  <Field label="Date of Loss / Incident"><Input name="date_of_loss" type="date" defaultValue={formState.date_of_loss || ''} /></Field>
                  <Field label={(formState.tracking_type || 'court') === 'claim' ? 'Expected Resolution Date' : 'Trial / Hearing Date'}><Input name="trial_date" type="date" defaultValue={formState.trial_date || ''} /></Field>
                </div>

                <div className="mb-3 mt-3">
                  <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">
                    Statute of Limitations
                  </label>
                  <div className="flex gap-4 mt-2">
                    {[
                      { value: '1_year', label: '1 Year' },
                      { value: '2_years', label: '2 Years' },
                      { value: 'custom', label: 'Custom' }
                    ].map(opt => {
                      const currentTerm = formState.sol_term !== undefined ? formState.sol_term : '2_years';
                      return (
                        <label key={opt.value} className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                          <input
                            type="radio"
                            name="sol_term"
                            value={opt.value}
                            checked={currentTerm === opt.value}
                            onChange={e => setFormState(s => ({ ...s, sol_term: e.target.value }))}
                            className="accent-[#38bdf8]"
                          />
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {(formState.sol_term !== undefined ? formState.sol_term : '2_years') === 'custom' && (
                  <div className="mb-3">
                    <Field label="Custom SOL Expiration Date">
                      <Input
                        name="sol_date"
                        type="date"
                        defaultValue={formState.sol_date || ''}
                      />
                    </Field>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label={(formState.tracking_type || 'court') === 'claim' ? 'Insurance Claim #' : 'Court / Docket #'}><Input name="case_number" defaultValue={formState.case_number || ''} placeholder={(formState.tracking_type || 'court') === 'claim' ? 'Enter Claim #' : 'Case / Docket #'} /></Field>
                  <Field label={(formState.tracking_type || 'court') === 'claim' ? 'Adjuster / Agent Name' : 'Judge / Officer Name'}><Input name="judge_name" defaultValue={formState.judge_name || ''} placeholder={(formState.tracking_type || 'court') === 'claim' ? 'Adjuster Name' : 'Honorable Judge...'} /></Field>
                </div>
              </AdaptiveSection>

              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => handleStepChange(1)} className="btn btn-secondary px-5 py-2.5 rounded-xl font-bold text-xs">
                  ← Back to Step 1
                </button>
                <button type="button" onClick={() => handleStepChange(3)} className="btn btn-primary px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-[#0057c7]/30">
                  Continue to Parties & Roles →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Matter Parties Review Workspace */}
          {wizardStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0057c7]/15 text-[#38bdf8] text-xl">
                    👥
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Step 3: Parties & Roles Review Workspace</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Review, search, filter, and edit legal parties and participants.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openPartyModalWithRole('Plaintiff')}
                  className="bg-[#0057c7] hover:bg-[#004aa8] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#0057c7]/30 transition-all"
                >
                  <span>+ Add Legal Party</span>
                </button>
              </div>

              {/* Enterprise Party Counters & Action Bar */}
              {(() => {
                const addParties = partiesList.filter(p => !p.is_retaining_client && p.party_role !== 'Retaining Client');
                const witnessCount = addParties.filter(p => (p.party_roles || [p.party_role]).includes('Witness')).length;
                const driverCount = addParties.filter(p => (p.party_roles || [p.party_role]).includes('Driver')).length;
                const passengerCount = addParties.filter(p => (p.party_roles || [p.party_role]).includes('Passenger')).length;
                const insCount = addParties.filter(p => (p.party_roles || [p.party_role]).some(r => ['Insurance Company', 'Insurance Adjuster'].includes(r))).length;
                const medCount = addParties.filter(p => (p.party_roles || [p.party_role]).includes('Medical Provider')).length;
                const orgCount = addParties.filter(p => p.party_type === 'Organization' || (p.party_roles || [p.party_role]).includes('Employer')).length;

                const injuredPassengers = addParties.filter(p => {
                  if (!(p.party_roles || [p.party_role]).includes('Passenger')) return false;
                  const pp = p.role_data?.Passenger || p.passenger_profile || {};
                  return pp.injury_status && pp.injury_status !== 'None' && pp.injury_status !== 'Uninjured';
                }).length;
                const hospitalizedPassengers = addParties.filter(p => {
                  if (!(p.party_roles || [p.party_role]).includes('Passenger')) return false;
                  const pp = p.role_data?.Passenger || p.passenger_profile || {};
                  return Boolean(pp.hospital);
                }).length;
                const seatbeltCount = addParties.filter(p => {
                  if (!(p.party_roles || [p.party_role]).includes('Passenger')) return false;
                  const pp = p.role_data?.Passenger || p.passenger_profile || {};
                  return pp.seatbelt_used === 'Yes';
                }).length;
                const withoutVehCount = addParties.filter(p => {
                  if (!(p.party_roles || [p.party_role]).includes('Passenger')) return false;
                  const pp = p.role_data?.Passenger || p.passenger_profile || {};
                  return !pp.assigned_vehicle_id;
                }).length;
                const withoutDrvCount = addParties.filter(p => {
                  if (!(p.party_roles || [p.party_role]).includes('Passenger')) return false;
                  const pp = p.role_data?.Passenger || p.passenger_profile || {};
                  return !pp.assigned_driver_party_id;
                }).length;

                return (
                  <div className="space-y-3 bg-white/[0.02] p-3.5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/10 text-white border border-white/10">
                          Parties ({partiesList.length})
                        </span>
                        {witnessCount > 0 && <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">Witnesses ({witnessCount})</span>}
                        {driverCount > 0 && <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">Drivers ({driverCount})</span>}
                        {passengerCount > 0 && <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/20">Passengers ({passengerCount})</span>}
                        {insCount > 0 && <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Insurance ({insCount})</span>}
                        {medCount > 0 && <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20">Medical ({medCount})</span>}
                        {orgCount > 0 && <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Orgs ({orgCount})</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (partiesList.length === 0) {
                              toast('No parties to export.', 'error');
                              return;
                            }
                            const headers = ['ID', 'Full Name', 'Company Name', 'Primary Role', 'Roles', 'Party Type', 'Email', 'Phone', 'Address', 'Notes'];
                            const rows = partiesList.map(p => [
                              `"${p.id || ''}"`,
                              `"${(p.full_name || '').replace(/"/g, '""')}"`,
                              `"${(p.company_name || '').replace(/"/g, '""')}"`,
                              `"${(p.primary_party_role || p.party_role || '').replace(/"/g, '""')}"`,
                              `"${((p.party_roles || [p.party_role]).join('; ')).replace(/"/g, '""')}"`,
                              `"${(p.party_type || 'Person').replace(/"/g, '""')}"`,
                              `"${(p.email || '').replace(/"/g, '""')}"`,
                              `"${(p.phone || '').replace(/"/g, '""')}"`,
                              `"${(p.address || '').replace(/"/g, '""')}"`,
                              `"${(p.notes || '').replace(/"/g, '""')}"`
                            ]);
                            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement('a');
                            link.setAttribute('href', encodedUri);
                            link.setAttribute('download', `matter_parties_export_${Date.now()}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            toast('Parties exported to CSV!', 'success');
                          }}
                          className="btn btn-secondary px-2.5 py-1 rounded-lg text-[10px] font-bold"
                          title="Export Parties to CSV"
                        >
                          📥 Export CSV
                        </button>
                      </div>
                    </div>

                    {passengerCount > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-white/10">
                        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-2 text-center">
                          <p className="text-[9px] font-bold text-sky-400 uppercase">Total Passengers</p>
                          <p className="text-sm font-extrabold text-sky-200">{passengerCount}</p>
                        </div>
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2 text-center">
                          <p className="text-[9px] font-bold text-rose-400 uppercase">Injured</p>
                          <p className="text-sm font-extrabold text-rose-200">{injuredPassengers}</p>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-center">
                          <p className="text-[9px] font-bold text-amber-400 uppercase">Hospitalized</p>
                          <p className="text-sm font-extrabold text-amber-200">{hospitalizedPassengers}</p>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-center">
                          <p className="text-[9px] font-bold text-emerald-400 uppercase">Seatbelt Used</p>
                          <p className="text-sm font-extrabold text-emerald-200">{seatbeltCount}</p>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-2 text-center">
                          <p className="text-[9px] font-bold text-purple-400 uppercase">No Vehicle</p>
                          <p className="text-sm font-extrabold text-purple-200">{withoutVehCount}</p>
                        </div>
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2 text-center">
                          <p className="text-[9px] font-bold text-indigo-400 uppercase">No Driver</p>
                          <p className="text-sm font-extrabold text-indigo-200">{withoutDrvCount}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={partySearchTerm}
                          onChange={e => setPartySearchTerm(e.target.value)}
                          placeholder="🔍 Live Search by Name, Email, Phone, Role, DL #..."
                          className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                        />
                      </div>
                      <div>
                        <select
                          value={partySort}
                          onChange={e => setPartySort(e.target.value)}
                          className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                        >
                          <option value="name">Sort: Name (A-Z)</option>
                          <option value="recent">Sort: Recently Added</option>
                          <option value="primary_role">Sort: Primary Role</option>
                          <option value="role_count">Sort: Role Count</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Always Display Retaining Client Card (Read-Only) */}
              <div className="p-4 rounded-xl bg-[#0057c7]/10 border border-[#0057c7]/30 flex justify-between items-start">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">
                      {formState.retaining_client_name || formState.client_name || 'Retaining Client'}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40">
                      ⭐ PRIMARY: Retaining Client
                    </span>
                  </div>
                  {formState.retaining_client_email && <p className="text-xs text-slate-300">✉️ {formState.retaining_client_email}</p>}
                  {formState.retaining_client_phone && <p className="text-xs text-slate-300">📞 {formState.retaining_client_phone}</p>}
                  {formState.retaining_client_address && <p className="text-xs text-slate-400">🏠 {formState.retaining_client_address}</p>}
                </div>
                <span className="text-[10px] text-slate-400 font-semibold italic bg-white/5 px-2 py-1 rounded">Read-only (Primary Client)</span>
              </div>

              {/* Display Additional Parties List with Search & Filtering */}
              {(() => {
                let filtered = partiesList.filter(p => !p.is_retaining_client && p.party_role !== 'Retaining Client');

                if (partySearchTerm.trim()) {
                  const term = partySearchTerm.trim().toLowerCase();
                  filtered = filtered.filter(p =>
                    (p.full_name || p.company_name || '').toLowerCase().includes(term) ||
                    (p.email || '').toLowerCase().includes(term) ||
                    (p.phone || '').toLowerCase().includes(term) ||
                    (p.government_id || '').toLowerCase().includes(term) ||
                    (p.insurance_number || '').toLowerCase().includes(term) ||
                    (p.party_roles || [p.party_role]).some(r => r?.toLowerCase().includes(term))
                  );
                }

                if (partySort === 'name') {
                  filtered.sort((a, b) => (a.full_name || a.company_name || '').localeCompare(b.full_name || b.company_name || ''));
                } else if (partySort === 'primary_role') {
                  filtered.sort((a, b) => (a.primary_party_role || a.party_role || '').localeCompare(b.primary_party_role || b.party_role || ''));
                } else if (partySort === 'role_count') {
                  filtered.sort((a, b) => (b.party_roles?.length || 1) - (a.party_roles?.length || 1));
                } else if (partySort === 'recent') {
                  filtered.reverse();
                }

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 rounded-xl border border-dashed border-white/10 text-center space-y-3 bg-white/[0.01]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-xl mx-auto text-slate-400">
                        👥
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-white">No Matching Matter Parties</h5>
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                          {partySearchTerm ? `No parties found matching "${partySearchTerm}".` : 'Add plaintiffs, defendants, applicants, respondents, attorneys, or legal parties.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openPartyModalWithRole('Plaintiff')}
                        className="btn btn-secondary px-3.5 py-1.5 rounded-xl text-xs font-semibold mt-1"
                      >
                        + Add Legal Party
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar p-1">
                    {filtered.map((p, idx) => (
                      <div key={p.id || idx} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#38bdf8]/30 transition-all flex justify-between items-start group">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white">{p.full_name || p.company_name}</span>
                            {(() => {
                              const primary = p.primary_party_role || p.party_role || 'Party';
                              const rolesList = (Array.isArray(p.party_roles) && p.party_roles.length > 0)
                                ? p.party_roles
                                : [primary];

                              return rolesList.map(r => {
                                const isPrimary = r === primary;
                                const roleBadgeClass = isPrimary
                                  ? 'bg-[#0057c7]/30 text-[#38bdf8] border border-[#38bdf8]/50 shadow-sm shadow-[#0057c7]/20 font-bold'
                                  : ['Witness', 'Passenger'].includes(r) ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20' :
                                    ['Insurance Adjuster', 'Insurance Company'].includes(r) ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                                    ['Spouse', 'Child', 'Dependent', 'Petitioner', 'Beneficiary', 'Applicant'].includes(r) ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                                    ['Defendant', 'Respondent'].includes(r) ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' :
                                    ['Driver', 'Vehicle Owner'].includes(r) ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' :
                                    'bg-white/10 text-white/80 border border-white/10';

                                return (
                                  <span key={r} className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${roleBadgeClass}`}>
                                    {isPrimary ? `⭐ PRIMARY: ${r}` : r}
                                  </span>
                                );
                              });
                            })()}
                          </div>
                          {p.email && <p className="text-xs text-slate-400">✉️ {p.email}</p>}
                          {p.phone && <p className="text-xs text-slate-400">📞 {p.phone}</p>}
                          {p.government_id && <p className="text-xs text-amber-400 font-mono">Govt ID: {maskGovId(p.government_id)}</p>}
                          {p.country_of_birth && <p className="text-xs text-[#38bdf8]">Origin: {p.country_of_birth} {p.date_of_birth ? `(DOB: ${p.date_of_birth})` : ''}</p>}
                          {p.relief_sought && <p className="text-xs text-amber-400">Relief: {p.relief_sought}</p>}
                          {p.insurance_number && <p className="text-xs text-emerald-400 font-mono">Ins #: {p.insurance_number}</p>}

                          {/* Driver Specific Card Summary */}
                          {(() => {
                            const isDriver = (Array.isArray(p.party_roles) ? p.party_roles : [p.party_role]).includes('Driver');
                            if (!isDriver) return null;
                            const dp = p.role_data?.Driver || p.driver_profile || p;
                            const linkedVeh = vehiclesList.find(v => (v.vehicle_id || v.id) === (dp.assigned_vehicle_id || p.assigned_vehicle_id) || v.driver_party_id === p.id);
                            return (
                              <div className="space-y-0.5 pt-1 border-t border-purple-500/20 mt-1">
                                {dp.license_number && <p className="text-xs font-mono text-purple-300">🪪 License: {dp.license_number}{dp.license_state ? ` (${dp.license_state})` : ''}</p>}
                                {linkedVeh && <p className="text-xs text-[#38bdf8]">🚘 Assigned: {linkedVeh.year} {linkedVeh.make} {linkedVeh.model}</p>}
                                {dp.employer && <p className="text-xs text-slate-400">💼 Employer: {dp.employer}</p>}
                                {dp.injury_status && dp.injury_status !== 'Uninjured' && <p className="text-xs text-rose-400">🩹 Injury: {dp.injury_status}</p>}
                              </div>
                            );
                          })()}

                          {/* Passenger Specific Card Summary */}
                          {(() => {
                            const isPassenger = (Array.isArray(p.party_roles) ? p.party_roles : [p.party_role]).includes('Passenger');
                            if (!isPassenger) return null;
                            const pp = p.role_data?.Passenger || p.passenger_profile || p;
                            const linkedVeh = vehiclesList.find(v => (v.vehicle_id || v.id) === (pp.assigned_vehicle_id || p.assigned_vehicle_id) || (Array.isArray(v.passenger_party_ids) && v.passenger_party_ids.includes(p.id)));
                            const linkedDrv = partiesList.find(dp => (dp.id === (pp.assigned_driver_party_id || p.assigned_driver_party_id)) && (dp.party_roles || [dp.party_role]).includes('Driver'));

                            return (
                              <div className="space-y-0.5 pt-1 border-t border-sky-500/20 mt-1">
                                <p className="text-xs font-semibold text-sky-300">🧍 Seat: {pp.seat_position || 'Front Right'}</p>
                                {linkedVeh && <p className="text-xs text-[#38bdf8]">🚘 Vehicle: {linkedVeh.year} {linkedVeh.make} {linkedVeh.model}</p>}
                                {linkedDrv && <p className="text-xs text-purple-300">🏎️ Driver: {linkedDrv.full_name}</p>}
                                {pp.injury_status && pp.injury_status !== 'None' && pp.injury_status !== 'Uninjured' && (
                                  <p className="text-xs text-rose-400">🩹 Injury: {pp.injury_status} {pp.hospital ? `(${pp.hospital})` : ''}</p>
                                )}
                              </div>
                            );
                          })()}

                          {p.notes && <p className="text-xs text-slate-400 italic">"{p.notes}"</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditParty(p)}
                            className="text-slate-400 hover:text-[#38bdf8] font-bold px-2 py-1 rounded-lg hover:bg-white/5 text-xs transition-colors"
                            title="Edit party"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteParty(p)}
                            className="text-slate-500 hover:text-rose-400 font-bold px-2 py-1 rounded-lg hover:bg-white/5 text-xs transition-colors"
                            title="Remove party"
                          >
                            ✕ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setWizardStep(2)} className="btn btn-secondary px-5 py-2.5 rounded-xl font-bold text-xs">
                  ← Back to Step 2
                </button>
                <button type="button" onClick={() => setWizardStep(4)} className="btn btn-primary px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-[#0057c7]/30">
                  Continue to Review & Confirm →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {wizardStep === 4 && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Banner */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xl">
                  ✅
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-400">Step 4: Final Comprehensive Intake Review</h4>
                  <p className="text-xs text-slate-300 mt-0.5">Please review all matter details, client spotlight, dynamic practice area data, legal parties, and vehicle/asset records before saving.</p>
                </div>
              </div>

              {/* Grid: Step 1 (Matter Overview & Billing) */}
              <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <h5 className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-2">
                    <span>📋</span> 1. Matter & Client Intake Summary (Step 1)
                  </h5>
                  <button type="button" onClick={() => setWizardStep(1)} className="text-[11px] text-[#38bdf8] hover:underline font-semibold">✏️ Edit Step 1</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Matter Title</span>
                    <span className="font-bold text-white mt-0.5 block">{formState.title || 'Untitled Matter'}</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Practice Area</span>
                    <span className="font-bold text-[#38bdf8] mt-0.5 block">{formState.practice_area || 'Personal Injury'}</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Priority</span>
                    <span className="font-bold text-amber-400 uppercase mt-0.5 block">{formState.priority || 'Medium'}</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Status</span>
                    <span className="font-bold text-emerald-400 uppercase mt-0.5 block">{formState.status || 'Active'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Assigned Attorney</span>
                    <span className="text-[#38bdf8] mt-0.5 block font-bold">
                      {(() => {
                        const lObj = lawyerRows.find(l => String(l.id) === String(formState.assigned_lawyer_id));
                        return lObj ? (lObj.full_name || lObj.name || lObj.user?.full_name || `Lawyer #${lObj.id}`) : 'Unassigned';
                      })()}
                    </span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Lead Source</span>
                    <span className="text-white mt-0.5 block font-semibold">{formState.lead_source || 'Direct Intake'}</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Fee / Billing Structure</span>
                    <span className="text-emerald-400 mt-0.5 block font-bold">
                      {formState.billing_type || formState.fee_type || 'Contingency Fee'}
                      {formState.hourly_rate ? ` ($${formState.hourly_rate}/hr)` : ''}
                      {formState.contingency_rate ? ` (${formState.contingency_rate}%)` : ''}
                      {formState.retainer_amount ? ` (Retainer: $${formState.retainer_amount})` : ''}
                    </span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Intake Date</span>
                    <span className="text-white mt-0.5 block font-mono">{formState.intake_date || new Date().toISOString().split('T')[0]}</span>
                  </div>
                </div>

                {formState.description && (
                  <div className="bg-white/[0.02] p-3.5 rounded-xl border border-white/5 space-y-1 text-xs">
                    <span className="text-slate-400 block text-[11px] font-medium">Matter Description & Case Notes</span>
                    <p className="text-white/90 leading-relaxed italic">{formState.description}</p>
                  </div>
                )}
              </div>

              {/* Primary Retaining Client Spotlight */}
              <div className="p-5 rounded-2xl border border-[#0057c7]/30 bg-[#0057c7]/10 space-y-3">
                <div className="flex items-center justify-between border-b border-[#0057c7]/30 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⭐</span>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">Primary Retaining Client Spotlight</h5>
                  </div>
                  <span className="text-[10px] text-white bg-[#0057c7] px-3 py-1 rounded-full font-bold uppercase tracking-wider">PRIMARY CLIENT</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Client Name</span>
                    <span className="font-extrabold text-white mt-0.5 block text-sm">{formState.retaining_client_name || formState.client_name || 'Primary Retaining Client'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email Address</span>
                    <span className="text-white mt-0.5 block font-semibold">{formState.retaining_client_email || formState.client_email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Phone Number</span>
                    <span className="text-white mt-0.5 block font-semibold">{formState.retaining_client_phone || formState.client_phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Address / Company</span>
                    <span className="text-slate-300 mt-0.5 block">{formState.retaining_client_address || formState.retaining_client_company || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Grid: Step 2 (Adaptive Case Details) */}
              <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <h5 className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-2">
                    <span>⚙️</span> 2. Adaptive Details & Case Metadata (Step 2)
                  </h5>
                  <button type="button" onClick={() => setWizardStep(2)} className="text-[11px] text-[#38bdf8] hover:underline font-semibold">✏️ Edit Step 2</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Date of Incident / Loss</span>
                    <span className="text-amber-300 font-bold mt-0.5 block font-mono">{formState.date_of_loss || formState.incident_date || '—'}</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Incident Location</span>
                    <span className="text-white font-semibold mt-0.5 block">{formState.incident_location || '—'}</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Initial Filing Date</span>
                    <span className="text-white font-mono mt-0.5 block">{formState.initial_filing_date || '—'}</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Trial / Hearing Date</span>
                    <span className="text-white font-mono mt-0.5 block">{formState.trial_date || '—'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Court / Docket #</span>
                    <span className="text-sky-300 font-mono font-bold mt-0.5 block">{formState.case_number || '—'}</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Judge / Presiding Officer</span>
                    <span className="text-white font-semibold mt-0.5 block">{formState.judge_name || '—'}</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px] font-medium">Estimated Case Value</span>
                    <span className="text-emerald-400 font-extrabold mt-0.5 block">{formState.case_value ? `$${formState.case_value}` : '—'}</span>
                  </div>
                </div>

                {(formState.insurance_company || formState.claim_number || formState.policy_number || formState.adjuster_name) && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px] block">🛡️ Insurance & Claim Details</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-white/90">
                      <div><span className="text-slate-400 block text-[10px]">Insurance Co:</span> <span className="font-semibold">{formState.insurance_company || '—'}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">Claim #:</span> <span className="font-mono">{formState.claim_number || '—'}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">Policy #:</span> <span className="font-mono">{formState.policy_number || '—'}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">Adjuster:</span> <span>{formState.adjuster_name || '—'} {formState.adjuster_phone ? `(${formState.adjuster_phone})` : ''}</span></div>
                    </div>
                  </div>
                )}

                {(formState.employer_name || formState.job_title || formState.medical_provider || formState.treatment_facility) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {(formState.employer_name || formState.job_title) && (
                      <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
                        <span className="text-indigo-300 font-bold uppercase text-[10px] block">💼 Employment Info</span>
                        <p className="text-white font-semibold">{formState.employer_name} {formState.job_title ? `· ${formState.job_title}` : ''}</p>
                        {formState.wage_loss_amount && <p className="text-amber-300">Wage Loss: ${formState.wage_loss_amount}</p>}
                      </div>
                    )}
                    {(formState.medical_provider || formState.treatment_facility) && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                        <span className="text-rose-300 font-bold uppercase text-[10px] block">🏥 Medical Provider / Facility</span>
                        <p className="text-white font-semibold">{formState.medical_provider || formState.treatment_facility}</p>
                        {formState.total_medical_bills && <p className="text-rose-300 font-bold">Medical Bills: ${formState.total_medical_bills}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3 Review: Parties & Roles Review */}
              <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <h5 className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-2">
                    <span>👥</span> 3. Attached Matter Parties ({partiesList.length}) (Step 3)
                  </h5>
                  <button type="button" onClick={() => setWizardStep(3)} className="text-[11px] text-[#38bdf8] hover:underline font-semibold">✏️ Edit Step 3</button>
                </div>

                {partiesList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No additional legal parties attached to this matter.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {partiesList.map((p, idx) => {
                      const roles = p.party_roles || [p.party_role || 'Party'];
                      const primaryRole = p.primary_party_role || p.party_role || roles[0];
                      return (
                        <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-1.5">
                            <span className="text-xs font-bold text-white">{p.full_name || p.company_name}</span>
                            <div className="flex flex-wrap gap-1">
                              {roles.map(r => (
                                <span key={r} className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold ${r === primaryRole ? 'bg-[#0057c7] text-white' : 'bg-white/10 text-slate-300'}`}>
                                  {r === primaryRole ? `⭐ ${r}` : r}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                            {p.email && <div><span className="text-slate-500">Email:</span> {p.email}</div>}
                            {p.phone && <div><span className="text-slate-500">Phone:</span> {p.phone}</div>}
                            {p.government_id && <div><span className="text-slate-500">Govt ID:</span> <span className="font-mono text-amber-300">{p.government_id}</span></div>}
                            {p.license_number && <div><span className="text-slate-500">DL #:</span> <span className="font-mono text-purple-300">{p.license_number}</span></div>}
                          </div>
                          {p.notes && <p className="text-[11px] text-slate-400 italic">"{p.notes}"</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 4 Review: Vehicles & Asset Register */}
              <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <h5 className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-2">
                    <span>🚗</span> 4. Vehicles & Assets ({vehiclesList.length}) (Step 3)
                  </h5>
                  <button type="button" onClick={() => setWizardStep(3)} className="text-[11px] text-[#38bdf8] hover:underline font-semibold">✏️ Edit Step 3</button>
                </div>

                {vehiclesList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No vehicles attached to this matter.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {vehiclesList.map((v, idx) => {
                      const typeEmoji = { Car:'🚗', SUV:'🚙', Truck:'🚛', Motorcycle:'🏍️', Van:'🚐', Bus:'🚌', 'Commercial Vehicle':'🚚', Trailer:'🚜', Bicycle:'🚲', Scooter:'🛵', Other:'🚘' }[v.vehicle_type || 'Car'] || '🚘';
                      return (
                        <div key={v.vehicle_id || v.id || idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{typeEmoji}</span>
                            <div>
                              <h6 className="text-xs font-bold text-white">{v.year} {v.make} {v.model} {v.color ? `· ${v.color}` : ''}</h6>
                              <span className="text-[10px] text-slate-400 font-mono">VIN: {v.vin || '—'}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                            {v.license_plate && <div><span className="text-slate-500">Plate:</span> <span className="font-mono text-[#38bdf8]">{v.license_plate} ({v.license_state || 'CA'})</span></div>}
                            {v.insurance_company && <div><span className="text-slate-500">Insurance:</span> <span className="text-emerald-400">{v.insurance_company}</span></div>}
                            {v.estimated_damage && <div><span className="text-slate-500">Est. Damage:</span> <span className="text-amber-300 font-bold">${v.estimated_damage}</span></div>}
                            {v.status && <div><span className="text-slate-500">Status:</span> <span className="uppercase text-sky-300">{v.status}</span></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 5: Fee Structure (Section 9) & Referral Source (Section 12) */}
              <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <h5 className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-2">
                    <span>💵</span> 5. Fee Structure (Section 9) & Referral Source (Section 12)
                  </h5>
                  <span className="text-[10px] bg-[#0057c7]/20 border border-[#0057c7]/30 text-[#38bdf8] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    STAGE: INTAKE PRE-ASSIGNED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Referral Source (Section 12)">
                    <Select name="lead_source" value={formState.lead_source || 'Direct Intake'} onChange={handleChange}>
                      <option value="Direct Intake">Direct Intake / Walk-in</option>
                      <option value="Referring Counsel">Referring Counsel (25% Fee Split)</option>
                      <option value="Client Referral">Existing Client Referral</option>
                      <option value="Legal Clinic">Legal Clinic / Org</option>
                      <option value="Digital Marketing">Digital Marketing / Web</option>
                    </Select>
                  </Field>

                  <Field label="Fee / Billing Structure (Section 9)">
                    <Select name="fee_type" value={formState.fee_type || 'Contingency Fee'} onChange={handleChange}>
                      <option value="Contingency Fee">Contingency Fee (33.3% Pre-suit / 40% Filing)</option>
                      <option value="Hourly Rate">Hourly Rate ($/hr)</option>
                      <option value="Flat Fee">Flat Fee ($)</option>
                      <option value="Pro Bono">Pro Bono</option>
                    </Select>
                  </Field>
                </div>

                {/* Section 12 Detailed Referral Agreement & Fee Terms */}
                {formState.lead_source && formState.lead_source !== 'Direct Intake' && (
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">📜 Referral Terms & Agreement (Points 18, 19, 20)</span>
                      <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold uppercase">CRPC 1.5.1</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Agreement On File</label>
                        <select
                          name="referral_agreement_on_file"
                          value={formState.referral_agreement_on_file || 'Yes'}
                          onChange={handleChange}
                          className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                        >
                          <option value="Yes">Yes (Executed Agreement)</option>
                          <option value="No">No / Pending</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Fee Terms Structure</label>
                        <select
                          name="referral_fee_type"
                          value={formState.referral_fee_type || 'percentage'}
                          onChange={handleChange}
                          className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                        >
                          <option value="percentage">Percentage of Fee (%)</option>
                          <option value="flat">Flat per Appearance ($)</option>
                          <option value="comped">Comped / No Fee Split</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Split Value (% or $)</label>
                        <input
                          type="number"
                          name="referral_fee_value"
                          value={formState.referral_fee_value !== undefined ? formState.referral_fee_value : 25}
                          onChange={handleChange}
                          placeholder="e.g. 25 for 25%"
                          className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-1">Agreement Document URL / Link</label>
                      <input
                        type="text"
                        name="referral_agreement_doc_url"
                        value={formState.referral_agreement_doc_url || ''}
                        onChange={handleChange}
                        placeholder="https://... / signed_referral_agreement.pdf"
                        className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                      />
                    </div>

                    {/* California Rule of Professional Conduct 1.5.1 Box */}
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">⚖️ California Rule of Professional Conduct (CRPC) 1.5.1 Compliance</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            name="crpc_151_consent_obtained"
                            checked={!!formState.crpc_151_consent_obtained}
                            onChange={e => handleChange({ target: { name: 'crpc_151_consent_obtained', value: e.target.checked } })}
                            className="accent-amber-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-amber-200 font-bold">Client Consent Obtained</span>
                        </label>
                      </div>
                      <p className="text-[11px] text-amber-200/80 leading-relaxed">
                        Rule 1.5.1 requires lawyers dividing fees on a matter to enter into a written agreement and obtain full written consent from the client disclosing the fee division and confirmation that the total fee is not increased.
                      </p>
                      {formState.crpc_151_consent_obtained && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="text-[9px] font-bold text-amber-200 uppercase tracking-wider block mb-1">Consent Date</label>
                            <input
                              type="date"
                              name="crpc_151_consent_date"
                              value={formState.crpc_151_consent_date || new Date().toISOString().split('T')[0]}
                              onChange={handleChange}
                              className="w-full bg-[#090d16] border border-amber-500/30 rounded px-2 py-1 text-xs text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-amber-200 uppercase tracking-wider block mb-1">Client Signed Consent Doc URL</label>
                            <input
                              type="text"
                              name="crpc_151_doc_url"
                              value={formState.crpc_151_doc_url || ''}
                              onChange={handleChange}
                              placeholder="Doc link..."
                              className="w-full bg-[#090d16] border border-amber-500/30 rounded px-2 py-1 text-xs text-white outline-none font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Back & Navigation buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                <button type="button" onClick={() => setWizardStep(3)} className="btn btn-secondary px-5 py-2.5 rounded-xl font-bold text-xs">
                  ← Back to Step 3 (Parties & Roles)
                </button>
                <button type="submit" className="btn btn-primary px-6 py-2.5 rounded-xl font-extrabold text-xs shadow-lg shadow-[#0057c7]/30 flex items-center gap-2">
                  <span>🚀</span> Open Matter & Create File (&lt; 3 Mins)
                </button>
              </div>
            </div>
          )}
        </div>
      ),
      onSave: () => toast('Matter created successfully!', 'success'),
    },
    'compose-email': {
      title: 'Compose Email', wide: false,
      body: <>
        {(matterRows.length > 0 || data?.matterId) && (
          <div className="mb-3">
            {matterRows.length > 0 ? (
              <Field label="Related record" required>
                <Select name="matterId" required defaultValue={data?.matterId || ''}>
                  <option value="">Select record...</option>
                  {recordOptions}
                </Select>
              </Field>
            ) : (
              <input type="hidden" name="matterId" value={data.matterId} />
            )}
          </div>
        )}
        <div className="mb-3"><Field label="To" required><Input name="to" type="email" placeholder="recipient@example.com" required /></Field></div>
        <div className="mb-3"><Field label="Cc"><Input name="cc" placeholder="cc1@example.com, cc2@example.com" /></Field></div>
        <div className="mb-3"><Field label="Bcc"><Input name="bcc" placeholder="bcc1@example.com, bcc2@example.com" /></Field></div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Subject" required><Input name="subject" placeholder="Email subject..." required /></Field>
          <Field label="Visibility" required>
            <Select name="visibility" defaultValue="Shared" required>
              <option value="Shared">Shared (Party & Firm)</option>
              <option value="Internal">Internal (Firm Only)</option>
            </Select>
          </Field>
        </div>
        <Field label="Message" required><Textarea name="message" rows={5} placeholder="Write your message..." required /></Field>
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setSelectedFiles(prev => [...prev, ...files]);
            }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-xs">📎 Attach</button>
            <span className="text-[11px] text-slate-400">Max 25MB per file</span>
          </div>
          {selectedFiles.length > 0 && (
            <div className="flex flex-col gap-1 mt-1 p-2 rounded-xl bg-white/[0.03] border border-white/5 max-h-[120px] overflow-y-auto custom-scrollbar">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex justify-between items-center text-[12px] text-white/80">
                  <span className="truncate max-w-[200px]">📄 {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-[11px] ml-2">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </>,
      onSave: () => toast('Email sent!', 'success'),
    },
    'preview-document': {
      title: data?.title || 'Attachment Preview', wide: true,
      body: <>
        <div className="flex flex-col items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto p-4 bg-white/[0.02] border border-white/5 rounded-3xl">
          {data?.mime_type?.includes('image') ? (
            <img src={data?.url} alt={data?.title} className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl border border-white/10" />
          ) : data?.mime_type?.includes('pdf') ? (
            <div className="w-full flex flex-col">
              <div className="sm:hidden mb-2 flex items-center justify-between bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[12px]">
                <span>Document PDF Ready</span>
                <a href={data?.url} target="_blank" rel="noopener noreferrer" className="font-600 text-primary-400 underline">👁️ Open PDF</a>
              </div>
              <object data={`${data?.url}#toolbar=1`} type="application/pdf" className="w-full h-[65vh] bg-white rounded-2xl shadow-2xl">
                <iframe src={data?.url} title={data?.title} className="w-full h-full border-none rounded-2xl" />
              </object>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-[#8a94a6]">
              <span className="text-5xl mb-4">📄</span>
              <h4 className="text-[14px] font-900 text-white mb-2">Preview Not Available</h4>
              <p className="text-[12px] opacity-60 max-w-xs mx-auto mb-6">This document type ({data?.mime_type || 'unknown'}) cannot be previewed inline.</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { blob, filename } = await api.documents.download(data.id);
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename || data.title || 'document.bin';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (e) {
                    toast('Download failed', 'error');
                  }
                }}
                className="btn btn-primary h-10 px-6 text-[11px] font-900 uppercase tracking-widest"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </>
    },
    'create-invoice': {
      title: 'Create Professional Invoice', wide: true,
      body: (() => {
        if (type !== 'create-invoice') return null;
        const selectedMatterId = formState.matterId !== undefined ? formState.matterId : (data?.matterId || '');
        const selectedMatter = matterRows.find(m => String(m.id) === String(selectedMatterId));
        
        const lookupClient = selectedMatter
          ? clientRows.find(c => String(c.id) === String(selectedMatter.client_id || selectedMatter.client?.id))
          : null;
        const matterClient = selectedMatter?.client || selectedMatter?.retaining_client;
        const partyClient = Array.isArray(selectedMatter?.parties_data)
          ? selectedMatter.parties_data.find(p => p.is_retaining_client || p.party_role === 'Client' || p.party_role === 'Retaining Client')
          : null;

        const selectedClient = (lookupClient || matterClient || partyClient)
          ? {
              ...(partyClient || {}),
              ...(matterClient || {}),
              ...(lookupClient || {}),
            }
          : null;

        const defaultDueDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
        const todayDate = new Date().toISOString().split('T')[0];
        const net14Date = defaultDueDate;
        const net30Date = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
        const net60Date = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];

        const clientAddress = selectedClient
          ? [
              selectedClient.address_line_1,
              selectedClient.address_line_2,
              [selectedClient.city, selectedClient.state].filter(Boolean).join(', '),
              selectedClient.postal_code,
              selectedClient.country && selectedClient.country !== 'United States' ? selectedClient.country : null
            ].filter(Boolean).join(', ') || selectedClient.home_address || selectedClient.business_address || selectedClient.address || 'No billing address on file'
          : '—';

        const clientEmail = selectedClient?.email || 'No email on file';
        const clientPhone = selectedClient?.phone || 'No phone on file';
        const clientRole = selectedClient?.party_role || 'Primary Client';
        const clientType = selectedClient?.party_type || 'Individual';
        const clientCode = selectedClient?.id 
          ? `CL-${String(selectedClient.id).padStart(4, '0')}` 
          : (selectedMatter?.client_id ? `CL-${String(selectedMatter.client_id).padStart(4, '0')}` : '—');
        const clientName = selectedClient?.full_name || selectedClient?.name || 'Valued Client';
        const clientOrg = selectedClient?.organization_name || null;
        const isPortalActive = Boolean(selectedClient?.is_portal_enabled);

        const defaultInvoiceNum = selectedMatter 
          ? `INV-${new Date().getFullYear()}-${String(selectedMatter.id).padStart(4, '0')}`
          : `INV-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

        // Matter Financial Calculations
        const matterInvoices = (lookups?.invoices || []).filter(
          inv => String(inv.matter_id || inv.matter?.id) === String(selectedMatterId)
        );
        let mTotalBilled = 0;
        let mPaid = 0;
        let mOutstanding = 0;
        for (const inv of matterInvoices) {
          if (inv.status === 'void') continue;
          const a = Number(inv.amount) || 0;
          const p = Number(inv.paid_amount) || (inv.payments || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
          const d = Number(inv.due_amount !== undefined ? inv.due_amount : Math.max(0, a - p)) || 0;
          mTotalBilled += a;
          mPaid += p;
          mOutstanding += d;
        }
        const mCaseValue = Number(selectedMatter?.case_value) || 0;
        const autoDetectedAmount = mOutstanding > 0 
          ? mOutstanding 
          : (mTotalBilled > 0 ? mTotalBilled : (mCaseValue > 0 ? mCaseValue : 0));

        const feePresetTemplates = [
          { label: 'Flat Fee Representation', desc: 'Flat fee agreement for comprehensive legal representation, case filings, and attorney proceedings.' },
          { label: 'Hourly Services', desc: 'Hourly legal services rendered, pleadings drafting, evidentiary review, and client conferences.' },
          { label: 'Retainer Replenishment', desc: 'Trust retainer replenishment pursuant to the attorney-client legal services agreement.' },
          { label: 'Court Filing Reimbursement', desc: 'Disbursement reimbursement for court filing fees, process service, and official docket charges.' },
        ];

        return (
          <div className="space-y-6">
            {/* Top Grid: Matter Selector & Invoice Status */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-8">
                <Field label="Matter / Case File" required>
                  <Select
                    name="matterId"
                    required
                    value={selectedMatterId}
                    onChange={(e) => {
                      const newMatterId = e.target.value;
                      const mInvs = (lookups?.invoices || []).filter(
                        inv => String(inv.matter_id || inv.matter?.id) === String(newMatterId)
                      );
                      let nTotalBilled = 0;
                      let nOutstanding = 0;
                      for (const inv of mInvs) {
                        if (inv.status === 'void') continue;
                        const a = Number(inv.amount) || 0;
                        const p = Number(inv.paid_amount) || (inv.payments || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
                        const d = Number(inv.due_amount !== undefined ? inv.due_amount : Math.max(0, a - p)) || 0;
                        nTotalBilled += a;
                        nOutstanding += d;
                      }
                      const mObj = matterRows.find(m => String(m.id) === String(newMatterId));
                      const nCaseVal = Number(mObj?.case_value) || 0;
                      const suggestedVal = nOutstanding > 0 ? nOutstanding : (nTotalBilled > 0 ? nTotalBilled : (nCaseVal > 0 ? nCaseVal : 0));

                      setFormState(prev => ({
                        ...prev,
                        matterId: newMatterId,
                        amount: suggestedVal > 0 ? String(suggestedVal) : (prev.amount || ''),
                        invoice_number: mObj ? `INV-${new Date().getFullYear()}-${String(mObj.id).padStart(4, '0')}` : prev.invoice_number,
                      }));

                      if (newMatterId) {
                        api.matters.get(newMatterId).then(res => {
                          if (res?.data) {
                            const mData = res.data;
                            const invs = mData.invoices || [];
                            let curOutstanding = 0;
                            let curBilled = 0;
                            for (const inv of invs) {
                              if (inv.status === 'void') continue;
                              const a = Number(inv.amount) || 0;
                              const p = Number(inv.paid_amount) || (inv.payments || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
                              const d = Number(inv.due_amount !== undefined ? inv.due_amount : Math.max(0, a - p)) || 0;
                              curBilled += a;
                              curOutstanding += d;
                            }
                            const val = Number(mData.case_value) || 0;
                            const freshSuggested = curOutstanding > 0 ? curOutstanding : (curBilled > 0 ? curBilled : (val > 0 ? val : 0));
                            if (freshSuggested > 0) {
                              setFormState(prev => ({
                                ...prev,
                                amount: String(freshSuggested),
                              }));
                            }
                          }
                        }).catch(() => {});
                      }
                    }}
                  >
                    <option value="">Select matter / case file...</option>
                    {matterRows.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.matter_number} — {m.title} {m.client?.full_name ? `(${m.client.full_name})` : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="Invoice Visibility / Status" required>
                  <Select
                    name="status"
                    value={formState.status || 'due'}
                    onChange={e => setFormState(s => ({ ...s, status: e.target.value }))}
                    required
                  >
                    <option value="due">Issued &amp; Awaiting Payment (Live on Portal)</option>
                    <option value="draft">Internal Draft (Firm Only - Hidden from Client)</option>
                  </Select>
                </Field>
              </div>
            </div>

            {/* Dynamic Auto-Populated Client Information Card */}
            {selectedMatter && selectedClient ? (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0057c7]/15 via-white/[0.04] to-white/[0.01] border border-[#0057c7]/40 shadow-2xl space-y-4 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#0057c7]/10 blur-3xl pointer-events-none" />

                {/* Card Header */}
                <div className="flex items-center justify-between flex-wrap gap-3 border-b border-white/10 pb-3 relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#0057c7]/20 border border-[#0057c7]/40 text-[#38bdf8] flex items-center justify-center font-bold text-lg shadow-inner">
                      {clientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'CL'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-900 text-[#38bdf8] uppercase tracking-[0.2em]">Billed To Entity (Auto-Populated)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#0057c7]/20 text-[#7dd3fc] border border-[#0057c7]/40 font-bold">
                          {clientCode}
                        </span>
                      </div>
                      <h4 className="text-[17px] font-900 text-white tracking-tight flex items-center gap-2 mt-0.5">
                        {clientName}
                        {clientOrg && (
                          <span className="text-xs px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-semibold">
                            🏢 {clientOrg}
                          </span>
                        )}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-800 px-3 py-1 rounded-xl uppercase tracking-wider border shadow-sm flex items-center gap-1.5 ${
                      isPortalActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isPortalActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {isPortalActive ? 'Portal Access Active · Instant Delivery' : 'Offline Client · PDF Only'}
                    </span>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-xl bg-white/5 text-slate-300 border border-white/10">
                      Role: <strong className="text-white">{clientRole}</strong>
                    </span>
                  </div>
                </div>

                {/* Client Contact & Billing Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs relative z-10">
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-1 hover:border-[#0057c7]/30 transition-colors">
                    <p className="text-[10px] font-800 text-[#8a94a6] uppercase tracking-wider flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      Email Identity
                    </p>
                    <p className="text-white font-medium truncate" title={clientEmail}>{clientEmail}</p>
                    <span className="text-[9px] text-[#38bdf8]/80 font-semibold block">Verified Contact</span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-1 hover:border-[#0057c7]/30 transition-colors">
                    <p className="text-[10px] font-800 text-[#8a94a6] uppercase tracking-wider flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                      Phone Channel
                    </p>
                    <p className="text-white font-medium truncate">{clientPhone}</p>
                    <span className="text-[9px] text-slate-400 font-semibold block">Direct Telephone</span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-1 hover:border-[#0057c7]/30 transition-colors">
                    <p className="text-[10px] font-800 text-[#8a94a6] uppercase tracking-wider flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      Legal Billing Address
                    </p>
                    <p className="text-white font-medium truncate" title={clientAddress}>{clientAddress}</p>
                    <span className="text-[9px] text-slate-400 font-semibold block">Official Location</span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-1 hover:border-[#0057c7]/30 transition-colors">
                    <p className="text-[10px] font-800 text-[#8a94a6] uppercase tracking-wider flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      Matter Billing Total
                    </p>
                    <p className="text-emerald-400 font-bold truncate">
                      ${autoDetectedAmount > 0 ? autoDetectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (mCaseValue > 0 ? mCaseValue.toLocaleString('en-US') : '0.00')}
                    </p>
                    <span className="text-[9px] text-slate-400 font-semibold block truncate">
                      {mOutstanding > 0 ? 'Outstanding Arrears' : (mTotalBilled > 0 ? 'Total Prior Invoices' : 'Case Value')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-1 hover:border-[#0057c7]/30 transition-colors">
                    <p className="text-[10px] font-800 text-[#8a94a6] uppercase tracking-wider flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      Case / Matter Link
                    </p>
                    <p className="text-white font-bold truncate">{selectedMatter.matter_number}</p>
                    <span className="text-[9px] text-[#38bdf8] font-bold block truncate">{selectedMatter.practice_area || 'General Legal Practice'}</span>
                  </div>
                </div>

                {/* Bottom Bar: Docket & Attorney Info */}
                <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-[#8a94a6] pt-2 px-1 border-t border-white/10 relative z-10">
                  <div className="flex items-center gap-3">
                    <span>Title: <strong className="text-white font-medium">{selectedMatter.title}</strong></span>
                    {(selectedMatter.case_number || selectedMatter.claim_number) && (
                      <span>· Docket / Claim: <strong className="text-sky-300 font-mono">{selectedMatter.case_number || selectedMatter.claim_number}</strong></span>
                    )}
                  </div>
                  <span className="text-slate-400">
                    Lead Counsel: <strong className="text-slate-200">{selectedMatter.assigned_lawyer?.full_name || 'Victoria Tulsidas, Esq.'}</strong>
                  </span>
                </div>
              </div>
            ) : selectedMatter ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-3 animate-fade-in">
                <span className="text-xl">⚠️</span>
                <div>
                  <strong className="block text-amber-200">Matter Selected: {selectedMatter.matter_number} — {selectedMatter.title}</strong>
                  <span>No primary retaining client profile was resolved directly. The invoice will be recorded under this case file.</span>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-gradient-to-b from-white/[0.03] to-white/[0.01] border-2 border-dashed border-white/10 text-center space-y-2 animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-[#38bdf8] flex items-center justify-center mx-auto text-xl shadow-inner">
                  ⚖️
                </div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Select a Matter to Auto-Populate Client Information</h4>
                <p className="text-xs text-[#8a94a6] max-w-md mx-auto">
                  Once a matter or case file is selected above, complete client records (Name, Organization, Email, Phone, Verified Billing Address, and Portal Status) will load here automatically.
                </p>
              </div>
            )}

            {/* Auto-populated Amount Assist Strip */}
            {selectedMatter && autoDetectedAmount > 0 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0057c7]/20 via-[#0057c7]/10 to-white/[0.02] border border-[#0057c7]/40 flex items-center justify-between flex-wrap gap-3 animate-fade-in text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0057c7]/20 border border-[#0057c7]/40 text-[#38bdf8] flex items-center justify-center font-bold text-sm">
                    💵
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#38bdf8] font-900 uppercase tracking-wider">Auto-Calculated Matter Billing Total</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        mOutstanding > 0 
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/25' 
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                      }`}>
                        {mOutstanding > 0 ? '● Outstanding Arrears' : '● Total Matter Invoicing'}
                      </span>
                    </div>
                    <span className="font-extrabold text-white text-base font-mono">
                      ${autoDetectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormState(s => ({ ...s, amount: String(Math.max(0, autoDetectedAmount)) }))}
                    className="text-[11px] font-bold text-white bg-[#0057c7] hover:bg-[#004bb1] px-3.5 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                  >
                    <span>Auto-Fill Total (${autoDetectedAmount.toLocaleString('en-US')})</span>
                  </button>
                  {mCaseValue > 0 && mCaseValue !== autoDetectedAmount && (
                    <button
                      type="button"
                      onClick={() => setFormState(s => ({ ...s, amount: String(Math.max(0, mCaseValue)) }))}
                      className="text-[11px] font-semibold text-slate-300 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-all"
                    >
                      Case Value (${mCaseValue.toLocaleString('en-US')})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Invoice Configuration Row: Invoice Number, Statement Date, Payment Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Invoice Number / Serial #" required>
                <Input
                  name="invoice_number"
                  value={formState.invoice_number !== undefined ? formState.invoice_number : defaultInvoiceNum}
                  onChange={e => setFormState(s => ({ ...s, invoice_number: e.target.value }))}
                  placeholder="INV-2026-0001"
                  required
                />
              </Field>

              <Field label="Statement / Issue Date" required>
                <Input
                  name="issuedDate"
                  type="date"
                  defaultValue={todayDate}
                  required
                />
              </Field>

              <Field label="Payment Terms Preset">
                <Select
                  value={formState.paymentTerms || 'Net 14'}
                  onChange={e => {
                    const term = e.target.value;
                    let targetDate = defaultDueDate;
                    if (term === 'Due Upon Receipt') targetDate = todayDate;
                    else if (term === 'Net 14') targetDate = net14Date;
                    else if (term === 'Net 30') targetDate = net30Date;
                    else if (term === 'Net 60') targetDate = net60Date;
                    setFormState(s => ({ ...s, paymentTerms: term, dueDate: targetDate }));
                  }}
                >
                  <option value="Due Upon Receipt">Due Upon Receipt (Immediate)</option>
                  <option value="Net 14">Net 14 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                  <option value="Custom">Custom Date</option>
                </Select>
              </Field>
            </div>

            {/* Financial Valuation & Due Date with Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Total Invoice Amount ($)" required>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base pointer-events-none">$</span>
                  <Input
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="pl-8 text-base font-bold text-white tracking-wide"
                    value={formState.amount !== undefined ? formState.amount : ''}
                    onKeyDown={e => {
                      const isMinus = (
                        e.key === '-' ||
                        e.key === 'Subtract' ||
                        e.key === 'Minus' ||
                        e.code === 'Minus' ||
                        e.code === 'NumpadSubtract' ||
                        e.keyCode === 189 ||
                        e.keyCode === 109 ||
                        e.which === 189 ||
                        e.which === 109
                      );
                      const isExponentOrPlus = (
                        e.key === '+' ||
                        e.key === 'Add' ||
                        e.code === 'NumpadAdd' ||
                        e.code === 'Equal' ||
                        e.keyCode === 107 ||
                        e.keyCode === 187 ||
                        e.key === 'e' ||
                        e.key === 'E'
                      );
                      if (isMinus || isExponentOrPlus) {
                        e.preventDefault();
                        return;
                      }
                      if (e.key === 'ArrowDown') {
                        const cur = parseFloat(formState.amount || '0');
                        if (isNaN(cur) || cur <= 0) {
                          e.preventDefault();
                          return;
                        }
                      }
                    }}
                    onPaste={e => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text') || '';
                      let cleaned = pasted.replace(/[^0-9.]/g, '');
                      const parts = cleaned.split('.');
                      if (parts.length > 2) {
                        cleaned = parts[0] + '.' + parts.slice(1).join('');
                      }
                      setFormState(s => ({ ...s, amount: cleaned }));
                    }}
                    onDrop={e => {
                      e.preventDefault();
                    }}
                    onChange={e => {
                      let raw = e.target.value;
                      let cleaned = raw.replace(/[^0-9.]/g, '');
                      const parts = cleaned.split('.');
                      if (parts.length > 2) {
                        cleaned = parts[0] + '.' + parts.slice(1).join('');
                      }
                      setFormState(s => ({ ...s, amount: cleaned }));
                    }}
                    required
                  />
                </div>
              </Field>

              <Field label="Payment Due Date" required>
                <Input
                  name="dueDate"
                  type="date"
                  value={formState.dueDate !== undefined ? formState.dueDate : defaultDueDate}
                  onChange={e => setFormState(s => ({ ...s, dueDate: e.target.value, paymentTerms: 'Custom' }))}
                  required
                />
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-[#8a94a6] uppercase font-bold tracking-wider">Quick Select:</span>
                  <button
                    type="button"
                    onClick={() => setFormState(s => ({ ...s, dueDate: todayDate, paymentTerms: 'Due Upon Receipt' }))}
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border ${
                      formState.dueDate === todayDate
                        ? 'bg-[#0057c7] text-white border-[#0057c7]'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormState(s => ({ ...s, dueDate: net14Date, paymentTerms: 'Net 14' }))}
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border ${
                      formState.dueDate === net14Date
                        ? 'bg-[#0057c7] text-white border-[#0057c7]'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    Net 14
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormState(s => ({ ...s, dueDate: net30Date, paymentTerms: 'Net 30' }))}
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border ${
                      formState.dueDate === net30Date
                        ? 'bg-[#0057c7] text-white border-[#0057c7]'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    Net 30
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormState(s => ({ ...s, dueDate: net60Date, paymentTerms: 'Net 60' }))}
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border ${
                      formState.dueDate === net60Date
                        ? 'bg-[#0057c7] text-white border-[#0057c7]'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    Net 60
                  </button>
                </div>
              </Field>
            </div>

            {/* Quick Fee Classification Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-800 text-[#8a94a6] uppercase tracking-wider">Fee Classification & Narrative Presets</span>
              <div className="flex flex-wrap gap-2">
                {feePresetTemplates.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormState(s => ({
                        ...s,
                        description: s.description ? `${s.description}\n${preset.desc}` : preset.desc
                      }));
                    }}
                    className="text-[11px] px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-[#0057c7]/20 hover:text-[#38bdf8] hover:border-[#0057c7]/40 text-slate-300 font-medium transition-all border border-white/10 flex items-center gap-1.5"
                  >
                    <span>+</span> {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Services Description Narrative */}
            <Field label="Services Narrative & Itemization" required>
              <Textarea
                name="description"
                rows={3}
                value={formState.description !== undefined ? formState.description : ''}
                onChange={e => setFormState(s => ({ ...s, description: e.target.value }))}
                placeholder="Comprehensive description of legal services rendered, case filings, discovery review, or retainer fee..."
                required
              />
            </Field>

            {/* Payment Remittance Memo & Client Instructions */}
            <Field label="Payment Terms & Remittance Instructions">
              <Input
                name="memo"
                defaultValue="Payment is due upon agreed terms. Remit online via the secure client portal or by check payable to VkTori Law Firm Trust Account."
                placeholder="E.g., Payment due upon receipt. Remit via secure portal or check payable to firm."
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                These instructions will appear on the client billing statement and PDF statement header.
              </span>
            </Field>

            {/* Executive Live Summary Bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0057c7]/15 via-white/[0.02] to-white/[0.01] border border-white/10 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Client Recipient</span>
                  <span className="text-white font-bold">{clientName}</span>
                </div>
                <div className="h-6 w-px bg-white/10 hidden sm:block" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Matter File</span>
                  <span className="text-sky-300 font-mono font-bold">{selectedMatter ? selectedMatter.matter_number : 'None'}</span>
                </div>
                <div className="h-6 w-px bg-white/10 hidden sm:block" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Due Date</span>
                  <span className="text-slate-200 font-semibold">{formState.dueDate || defaultDueDate}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Statement Total</span>
                <span className="text-xl font-900 text-emerald-400 tracking-tight">
                  ${Number(formState.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        );
      })(),
      onSave: null,
    },
    'add-expense': {
      title: 'Record Firm Expense', wide: false,
      body: <>
        <div className="mb-3">
          <Field label="Vendor / Payee Brief" required>
            <Input name="vendor" placeholder="E.g., Superior Court Filing, Expert Witness, Westlaw" required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Matter Reference">
            <Select name="matter_id" defaultValue={data?.matterId || ''}>
              <option value="">General Firm Expense</option>
              {matterRows.map(m => <option key={m.id} value={m.id}>{m.matter_number} — {m.title}</option>)}
            </Select>
          </Field>
          <Field label="Classification" required>
            <Select name="category" defaultValue="General" required>
              <option value="Court Filing Fees">Court Filing Fees</option>
              <option value="Expert Witness">Expert Witness</option>
              <option value="Travel & Lodging">Travel & Lodging</option>
              <option value="Legal Research">Legal Research</option>
              <option value="Process Server">Process Server</option>
              <option value="Document Copying">Document Copying</option>
              <option value="Supplies">Supplies</option>
              <option value="General">General Expense</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Fiscal Value ($)" required>
            <Input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required />
          </Field>
          <Field label="Execution Date" required>
            <Input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
          </Field>
        </div>
        <div className="mb-3">
          <Field label="Expense Status" required>
            <Select name="status" defaultValue="approved" required>
              <option value="approved">Approved</option>
              <option value="pending">Pending Review</option>
              <option value="reimbursed">Reimbursed</option>
              <option value="billed">Billed to Client</option>
            </Select>
          </Field>
        </div>
        <Field label="Description & Notes">
          <Textarea name="description" rows={2} placeholder="Itemized expense notes, invoice #, receipt details..." />
        </Field>
      </>,
      onSave: () => toast('Expense record saved successfully!', 'success'),
    },
    'trust-deposit': {
      title: 'Institutional Trust Deposit', wide: false,
      body: <>
        <div className="bg-[#10b981]/5 p-6 rounded-3xl border border-[#10b981]/10 mb-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#10b981]/10 blur-3xl pointer-events-none group-hover:bg-[#10b981]/20 transition-all duration-700" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center text-[#10b981]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3 1.343 3 3-1.343 3-3 3m0-12c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3m0-4v2m0 16v2" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-900 text-[#10b981] uppercase tracking-[0.2em] mb-1">Escrow Protocol</p>
              <h4 className="text-[15px] font-900 text-white tracking-tighter">Verified Trust Inbound</h4>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Target Party Entity" required>
            <Select name="client_id" required>
              <option value="">Select institutional entity...</option>
              {clientRows.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </Field>
          <Field label="Associated Matter (Optional)">
            <Select name="matter_id">
              <option value="">Independent Escrow</option>
              {matterRows.map(m => <option key={m.id} value={m.id}>{m.matter_number} — {m.title}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Inbound Valuation ($)" required>
              <Input name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
            </Field>
            <Field label="Execution Date">
              <Input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </Field>
          </div>
          <Field label="Verification Reference">
            <Input name="reference" placeholder="Check #, Wire ID, etc." />
          </Field>
          <Field label="Institutional Notes">
            <Textarea name="notes" rows={2} placeholder="Additional compliance details..." />
          </Field>
        </div>
      </>,
      onSave: () => toast('Trust deposit reconciled successfully!', 'success'),
    },
    'apply-trust': {
      title: 'Institutional Trust Liquidation', wide: false,
      body: <>
        <div className="bg-[#38bdf8]/5 p-6 rounded-3xl border border-[#38bdf8]/10 mb-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#38bdf8]/10 blur-3xl pointer-events-none group-hover:bg-[#38bdf8]/20 transition-all duration-700" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-900 text-[#38bdf8] uppercase tracking-[0.2em] mb-1">Available Liquid Assets</p>
              <p className="text-[28px] font-900 text-white tracking-tighter">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(data?.balance) || 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
          </div>
        </div>
        <input type="hidden" name="trust_account_id" value={data?.id} />
        <div className="space-y-4">
          <Field label="Target Unpaid Statement" required>
            <Select name="invoice_id" required>
              <option value="">Select outstanding invoice...</option>
              {lookups?.invoices?.filter(inv => (inv.status !== 'paid' && inv.status !== 'void') && (inv.due_amount > 0)).map(inv => (
                <option key={inv.id} value={inv.id}>{inv.invoice_number} — {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(inv.due_amount))} (Remaining Balance)</option>
              ))}
            </Select>
          </Field>
          <Field label="Liquidation Amount ($)" required>
            <Input name="amount" type="number" step="0.01" min="0.01" max={Number(data?.balance)} placeholder="0.00" required />
          </Field>
          <div className="p-4 rounded-2xl bg-[#f59e0b]/5 border border-[#f59e0b]/10 flex items-center gap-3">
            <svg className="w-4 h-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <p className="text-[10px] text-[#f59e0b] font-900 uppercase tracking-widest opacity-80">Execution will reduce trust balance and update invoice status.</p>
          </div>
        </div>
      </>,
      onSave: () => toast('Funds successfully liquidated to statement!', 'success'),
    },
    'trust-ledger': {
      title: data ? `Trust Ledger: ${data.client?.full_name}` : 'Trust Ledger', wide: true,
      body: <TrustLedgerView accountId={data?.id} formatUsd={billFormatUsd} />,
      onSave: () => { },
    },
    'add-document': {
      title: 'Upload Document(s)', wide: false,
      body: isUploadingQueue ? (
        <div className="space-y-4 text-white">
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[13px] font-800">Upload Queue Progress</span>
              <span className="text-[12px] font-700 text-[#38bdf8]">
                {uploadQueue.filter(q => q.status === 'completed').length} / {uploadQueue.length} files
              </span>
            </div>
            
            {(() => {
              const total = uploadQueue.length || 1;
              const done = uploadQueue.filter(q => q.status === 'completed').length;
              const failed = uploadQueue.filter(q => q.status === 'failed').length;
              const percent = Math.round((done / total) * 100);
              return (
                <div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#0057c7] h-full transition-all duration-300" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest mt-2">
                    <span>Overall: {percent}%</span>
                    {failed > 0 && <span className="text-red-400 font-bold">{failed} Failed</span>}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex gap-2">
            {uploadQueue.some(q => q.status === 'pending' || q.status === 'uploading') && (
              <button
                type="button"
                onClick={cancelAllQueue}
                className="btn btn-secondary border-red-500/10 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-[11px] px-3 h-8 uppercase tracking-wider"
              >
                Cancel Remaining
              </button>
            )}
            {uploadQueue.some(q => q.status === 'failed') && (
              <button
                type="button"
                onClick={() => {
                  if (formRef.current) {
                    const fd = new FormData(formRef.current);
                    const values = Object.fromEntries(fd.entries());
                    const category = values.docCategory === 'other' ? (values.custom_doc_category || '').trim() : (values.docCategory || 'General');
                    const visibility = role === 'lawyer' ? 'client_shared' : role === 'client' ? 'client_visible' : 'internal';
                    const failedItems = uploadQueue.filter(q => q.status === 'failed');
                    failedItems.forEach(item => {
                      retryFailedItem(item, values.matterId || data?.matterId, category, visibility, user.id);
                    });
                  }
                }}
                className="btn btn-primary text-[11px] px-3 h-8 uppercase tracking-wider"
              >
                Retry All Failed
              </button>
            )}
          </div>

          <div className="max-h-[220px] overflow-y-auto border border-white/5 bg-white/[0.01] rounded-2xl p-3 space-y-2 custom-scrollbar">
            {uploadQueue.map(item => (
              <div key={item.id} className="flex justify-between items-center text-[12px] bg-white/[0.01] border border-white/5 p-2.5 rounded-xl">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-[12px] font-700 text-white truncate" title={item.relativePath}>{item.relativePath}</p>
                  {item.status === 'uploading' && (
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-[#38bdf8] h-full transition-all" style={{ width: `${item.progress}%` }} />
                    </div>
                  )}
                  {item.error && (
                    <p className="text-[10px] text-red-400 mt-0.5 truncate">{item.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className={`text-[10px] font-900 uppercase tracking-wider ${
                    item.status === 'completed' ? 'text-emerald-400' :
                    item.status === 'failed' ? 'text-red-400' :
                    item.status === 'uploading' ? 'text-[#38bdf8] animate-pulse' : 'text-[#8a94a6]'
                  }`}>
                    {item.status}
                  </span>
                  {item.status === 'failed' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (formRef.current) {
                          const fd = new FormData(formRef.current);
                          const values = Object.fromEntries(fd.entries());
                          const category = values.docCategory === 'other' ? (values.custom_doc_category || '').trim() : (values.docCategory || 'General');
                          const visibility = role === 'lawyer' ? 'client_shared' : role === 'client' ? 'client_visible' : 'internal';
                          retryFailedItem(item, values.matterId || data?.matterId, category, visibility, user.id);
                        }
                      }}
                      className="text-[#38bdf8] hover:underline text-[10px] font-extrabold uppercase tracking-wider"
                    >
                      Retry
                    </button>
                  )}
                  {(item.status === 'pending' || item.status === 'uploading') && (
                    <button
                      type="button"
                      onClick={() => abortControllersRef.current[item.id]?.abort()}
                      className="text-red-400 hover:underline text-[10px] font-extrabold uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <p className="text-[12px] text-slate-500 mb-3">Select files or a folder to upload. Folder structures will be preserved.</p>
          
          <div 
            className="p-8 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer group mb-4"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              const files = await parseDroppedItems(e.dataTransfer);
              if (files.length > 0) {
                handleFilesSelection(files);
              }
            }}
          >
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#8a94a6] group-hover:text-[#38bdf8] group-hover:scale-110 transition-all">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </div>
            <div>
              <p className="text-[13px] text-white font-800">Drag & drop files or folders here</p>
              <p className="text-[11px] text-[#8a94a6] mt-1">or select from your computer</p>
            </div>
            <div className="flex gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => filesInputRef.current?.click()}
                className="btn btn-secondary text-[11px] px-3.5 h-8 font-800 uppercase tracking-wider"
              >
                Upload Files
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="btn btn-secondary text-[11px] px-3.5 h-8 font-800 uppercase tracking-wider"
              >
                Upload Folder
              </button>
            </div>
            <input
              ref={filesInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleFilesSelection(Array.from(e.target.files));
                }
              }}
            />
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleFilesSelection(Array.from(e.target.files));
                }
              }}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="mb-4 max-h-[140px] overflow-y-auto border border-white/5 bg-white/[0.01] rounded-2xl p-3 space-y-1.5 custom-scrollbar">
              <p className="text-[10px] text-[#8a94a6] font-900 uppercase tracking-widest mb-1.5">Selected Items ({selectedFiles.length})</p>
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex justify-between items-center text-[12px] text-white/80 bg-white/[0.01] border border-white/5 px-2.5 py-1.5 rounded-xl">
                  <span className="truncate max-w-[300px]">
                    📎 {file.webkitRelativePath || file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-300 ml-2 font-bold text-[11px] uppercase tracking-wider"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Related Matter" required><Select name="matterId" required defaultValue={data?.matterId || ''}><option value="">Select matter...</option>{matterRows.map((m) => <option key={m.id} value={m.id}>{m.matter_number}</option>)}</Select></Field>
            <Field label="Document Category">
              {(() => {
                const rawFolders = [
                  'General',
                  'Complaint',
                  'Evidence',
                  'Contract',
                  'Court order',
                  data?.docCategory,
                  ...(data?.remoteFolders || []).map(f => typeof f === 'string' ? f : (f?.name || f?.category_name)),
                  ...(data?.existingDocCategories || []).map(c => typeof c === 'string' ? c : (c?.name || c?.category))
                ].filter(Boolean);

                const availableFolders = Array.from(new Set(rawFolders));

                return (
                  <Select name="docCategory" defaultValue={data?.docCategory || 'General'}>
                    {availableFolders.map(folder => (
                      <option key={folder} value={folder}>{folder}</option>
                    ))}
                    <option value="other">Other...</option>
                  </Select>
                );
              })()}
            </Field>
          </div>
          {formState.docCategory === 'other' && (
            <div className="mb-3">
              <Field label="Custom Document Category" required>
                <Input name="custom_doc_category" placeholder="E.g., Affidavits" required />
              </Field>
            </div>
          )}
        </>
      ),
      onSave: null,
    },
    'add-folder': {
      title: 'Create New Folder', wide: false,
      body: <>
        <div className="mb-3"><Field label="Folder Name" required><Input name="name" placeholder="E.g., Financial Records" required /></Field></div>
        <Field label="Related Matter"><Select name="matterId"><option value="">None</option>{matterRows.map((m) => <option key={m.id} value={m.id}>{m.matter_number}</option>)}</Select></Field>
        <div className="mt-3"><Field label="Access Level"><Select name="accessLevel"><option value="Public">Public (All team)</option><option value="Private">Private (Only you)</option></Select></Field></div>
      </>,
      onSave: () => toast('Folder created successfully!', 'success'),
    },
    'add-event': {
      title: 'Add Calendar Event', wide: false,
      body: <>
        <div className="mb-3"><Field label="Event Title"><Input name="title" placeholder="Hearing, Meeting, Deadline..." /></Field></div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Date"><Input name="date" type="date" /></Field>
          <Field label="Time"><Input name="time" type="time" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Event Type">
            <Select name="eventType">
              <option>Court Date</option>
              <option>Filing Deadline</option>
              <option>Hearing</option>
              <option>Trial Date</option>
              <option>Consultation</option>
              <option>Meeting</option>
              <option>General Event</option>
              <option value="other">Other...</option>
            </Select>
          </Field>
          <Field label="Related Record"><Select name="matterId" defaultValue={data?.matterId || ''}><option value="">None</option>{recordOptions}</Select></Field>
        </div>
        {formState.eventType === 'other' && (
          <div className="mb-3">
            <Field label="Custom Event Type" required>
              <Input name="custom_event_type" placeholder="E.g., Deposition" required />
            </Field>
          </div>
        )}
        
        {['court date', 'filing deadline', 'hearing', 'trial date'].includes((formState.eventType || 'court date').toLowerCase()) && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Court Name"><Input name="court_name" placeholder="Supreme Court" /></Field>
              <Field label="Court Room"><Input name="court_room" placeholder="Room 101" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Judge Name"><Input name="judge_name" placeholder="Judge..." /></Field>
              <Field label="Appearance Type">
                <Select name="appearance_type">
                  <option value="">Select type...</option>
                  <option value="hearing">Hearing</option>
                  <option value="trial">Trial</option>
                  <option value="motion">Motion</option>
                  <option value="mediation">Mediation</option>
                  <option value="conference">Conference</option>
                  <option value="other">Other...</option>
                </Select>
              </Field>
            </div>
            {formState.appearance_type === 'other' && (
              <div className="mb-3 col-span-2">
                <Field label="Custom Appearance Type" required>
                  <Input name="custom_appearance_type" placeholder="E.g., Arbitration" required />
                </Field>
              </div>
            )}
            <div className="mb-3 flex items-center gap-2">
              <input type="checkbox" name="is_court_event" id="is_court_event" defaultChecked className="w-4 h-4 rounded border-white/10 bg-black/20 text-[#38bdf8] focus:ring-[#38bdf8]/50" />
              <label htmlFor="is_court_event" className="text-[12px] font-500 text-white cursor-pointer">Is Court Event</label>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 gap-3 mb-3">
          <Field label="Internal Attendees">
            <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto bg-black/20 border border-white/10 rounded-xl p-3 custom-scrollbar">
              {lookups.users?.map((u) => (
                <label key={u.id} className="flex items-center gap-3 text-[13px] text-white/90 font-500 cursor-pointer group hover:bg-white/[0.05] p-1.5 rounded-lg transition-colors">
                  <input type="checkbox" name="internalAttendees" value={u.id} className="w-4 h-4 rounded border-white/20 bg-black/20 text-[#38bdf8] focus:ring-[#38bdf8]/50" />
                  <span className="truncate">{u.full_name} <span className="text-[#8a94a6] text-[11px]">({u.email})</span></span>
                </label>
              ))}
              {(!lookups.users || lookups.users.length === 0) && (
                <p className="text-[12px] text-slate-500 italic p-2">No internal users available.</p>
              )}
            </div>
          </Field>
          <Field label="External Attendees (comma separated emails)">
            <Input name="externalAttendees" placeholder="client1@example.com, client2@example.com" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Reminder">
            <Select name="reminderOffset" defaultValue="">
              <option value="">No Reminder</option>
              <option value="1_hour">1 Hour Before</option>
              <option value="same_day">Same Day</option>
              <option value="1_day">1 Day Before</option>
              <option value="3_days">3 Days Before</option>
              <option value="7_days">7 Days Before</option>
              <option value="custom">Custom Reminder</option>
            </Select>
          </Field>
          {formState.reminderOffset === 'custom' && (
            <Field label="Custom Reminder Time"><Input name="customReminderDate" type="datetime-local" /></Field>
          )}
        </div>
        {['court date', 'filing deadline', 'hearing', 'trial date'].includes((formState.eventType || 'court date').toLowerCase()) && (
          <div className="mb-3 flex items-center gap-2">
            <input type="checkbox" name="createTask" id="createTask" defaultChecked className="w-4 h-4 rounded border-white/10 bg-black/20 text-[#38bdf8] focus:ring-[#38bdf8]/50" />
            <label htmlFor="createTask" className="text-[12px] font-500 text-white cursor-pointer">Auto Create High Priority Tasks</label>
          </div>
        )}
        <Field label="Notes"><Textarea name="notes" rows={2} placeholder="Additional details..." /></Field>
      </>,
      onSave: () => toast('Event added to calendar!', 'success'),
    },
    'add-user': {
      title: 'Add New User', wide: false,
      body: <>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Field label="First Name" required><Input name="firstName" placeholder="Jane" required /></Field>
          <Field label="Middle Name"><Input name="middleName" placeholder="M." /></Field>
          <Field label="Last Name" required><Input name="lastName" placeholder="Smith" required /></Field>
        </div>
        <div className="mb-3"><Field label="Email Address" required><Input name="email" type="email" placeholder="jane@victoriatulsidaslaw.com" required /></Field></div>
        <div className="mb-3">
          <label className="block text-[11px] font-900 text-white/80 uppercase tracking-[0.2em] mb-2 ml-1">Assigned Roles</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-[13px] text-white/90 font-600 cursor-pointer">
              <input type="checkbox" name="role_admin" value="admin" className="w-4 h-4 rounded bg-black/20 text-[#0057c7] border-white/10 focus:ring-[#0057c7]/50" />
              Admin
            </label>
            <label className="flex items-center gap-2 text-[13px] text-white/90 font-600 cursor-pointer">
              <input type="checkbox" name="role_lawyer" value="lawyer" className="w-4 h-4 rounded bg-black/20 text-[#0057c7] border-white/10 focus:ring-[#0057c7]/50" />
              Lawyer
            </label>
            <label className="flex items-center gap-2 text-[13px] text-white/90 font-600 cursor-pointer">
              <input type="checkbox" name="role_client" value="client" className="w-4 h-4 rounded bg-black/20 text-[#0057c7] border-white/10 focus:ring-[#0057c7]/50" />
              Party
            </label>
          </div>
        </div>
        <div className="mb-3">
          <Field label="Specialty (if Lawyer)">
            <Select name="specialty" defaultValue="">
              <option value="">None</option>
              <option value="Civil Litigation">Civil Litigation</option>
              <option value="Family Law">Family Law</option>
              <option value="Corporate">Corporate</option>
              <option value="Real Estate">Real Estate</option>
              <option value="other">Other...</option>
            </Select>
          </Field>
        </div>
        {formState.specialty === 'other' && (
          <div className="mb-3">
            <Field label="Custom Specialty" required>
              <Input name="custom_specialty" placeholder="E.g., Criminal Law" required />
            </Field>
          </div>
        )}
        <Field label="Set Password" required><Input name="password" type="password" placeholder="••••••••" required /></Field>
      </>,
      onSave: () => toast('User account created!', 'success'),
    },
    'edit-user': {
      title: data ? `Edit User: ${data.name}` : 'Edit User', wide: false,
      body: (() => {
        if (type !== 'edit-user') return null;
        const predefinedSpecialties = ['Civil Litigation', 'Family Law', 'Corporate', 'Real Estate'];
        const isCustomSpecialty = typeof data?.practice_focus === 'string' && !predefinedSpecialties.includes(data.practice_focus);
        const defaultSelectValue = isCustomSpecialty ? 'other' : (data?.practice_focus || '');
        const showCustomField = (formState.specialty || defaultSelectValue) === 'other';

        return (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="First Name" required><Input name="firstName" defaultValue={data?.name ? data.name.split(' ')[0] : ''} required /></Field>
              <Field label="Last Name" required><Input name="lastName" defaultValue={data?.name ? data.name.split(' ').slice(1).join(' ') : ''} required /></Field>
            </div>
            <div className="mb-3"><Field label="Email Address" required><Input name="email" type="email" defaultValue={data ? data.email : ''} required /></Field></div>
            <div className="mb-3">
              <label className="block text-[11px] font-900 text-white/80 uppercase tracking-[0.2em] mb-2 ml-1">Assigned Roles</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-[13px] text-white/90 font-600 cursor-pointer">
                  <input type="checkbox" name="role_admin" value="admin" defaultChecked={data?.roles?.includes('admin')} className="w-4 h-4 rounded bg-black/20 text-[#0057c7] border-white/10 focus:ring-[#0057c7]/50" />
                  Admin
                </label>
                <label className="flex items-center gap-2 text-[13px] text-white/90 font-600 cursor-pointer">
                  <input type="checkbox" name="role_lawyer" value="lawyer" defaultChecked={data?.roles?.includes('lawyer')} className="w-4 h-4 rounded bg-black/20 text-[#0057c7] border-white/10 focus:ring-[#0057c7]/50" />
                  Lawyer
                </label>
                <label className="flex items-center gap-2 text-[13px] text-white/90 font-600 cursor-pointer">
                  <input type="checkbox" name="role_client" value="client" defaultChecked={data?.roles?.includes('client')} className="w-4 h-4 rounded bg-black/20 text-[#0057c7] border-white/10 focus:ring-[#0057c7]/50" />
                  Party
                </label>
              </div>
            </div>
            <div className="mb-3">
              <Field label="Specialty (if Lawyer)">
                <Select name="specialty" defaultValue={defaultSelectValue}>
                  <option value="">None</option>
                  <option value="Civil Litigation">Civil Litigation</option>
                  <option value="Family Law">Family Law</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="other">Other...</option>
                </Select>
              </Field>
            </div>
            {showCustomField && (
              <div className="mb-3">
                <Field label="Custom Specialty" required>
                  <Input name="custom_specialty" defaultValue={data?.practice_focus || ''} placeholder="E.g., Criminal Law" required />
                </Field>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Status">
                <Select name="status" defaultValue={data ? data.status : 'active'}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
            </div>
          </>
        );
      })(),
      onSave: () => toast('User updated successfully!', 'success'),
    },
    'reset-password': {
      title: data ? `Reset Password: ${data.name}` : 'Reset Password', wide: false,
      body: <>
        <div className="p-4 rounded-xl bg-[#0057c7]/10 border border-[#0057c7]/20 mb-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-[11px] text-[#38bdf8] font-700 uppercase tracking-widest opacity-80">This will immediately overwrite the user's current password.</p>
        </div>
        <Field label="New Password" required>
          <Input name="newPassword" type="password" placeholder="Enter new password" required minLength={4} />
        </Field>
      </>,
      onSave: () => {},
    },
    'edit-case': {
      title: data ? (data.matter_number ? `Adaptive Matter Intake Wizard · ${data.matter_number}` : (data.matterNumber ? `Adaptive Matter Intake Wizard · ${data.matterNumber}` : `Adaptive Matter Intake Wizard`)) : 'Adaptive Matter Intake Wizard', wide: true,
      body: null,
      onSave: () => toast('Matter updated successfully!', 'success'),
    },
    'pay-invoice': {
      title: data ? `Authorize Settlement: ${data.id}` : 'Pay Invoice', wide: false,
      body: <>
        <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5 mb-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#10b981]/5 blur-3xl" />
          <div className="relative z-10 flex justify-between items-center mb-3">
            <span className="text-[11px] font-900 text-[#8a94a6] uppercase tracking-[0.2em]">Total Outstanding</span>
            <span className="text-2xl font-900 text-[#10b981] tracking-tighter">{data?.amount || '$0.00'}</span>
          </div>
          <p className="text-[11px] text-[#8a94a6] font-500 italic opacity-60">Verified transaction record. Awaiting institutional authorization.</p>
        </div>
        <div className="space-y-4">
          <Field label="Institutional Method">
            <Input value="Institutional Wire / Manual" disabled className="!bg-white/[0.01] !border-white/5 !text-[#8a94a6]" />
          </Field>
          <Field label="Transaction Reference">
            <Input name="payment_reference" defaultValue={`SETTLE-${Date.now().toString().slice(-6)}`} placeholder="Enter bank reference number" />
          </Field>
        </div>
      </>,
    },
    'use-template': {
      title: 'Apply Document Template', wide: false,
      body: <>
        <p className="text-[12px] text-slate-500 mb-4">You are creating a new draft based on: <strong className="text-slate-900">{data?.title}</strong></p>
        <Field label="New Document Title" required>
          <Input name="title" defaultValue={`Copy of ${data?.title}`} required />
        </Field>
      </>,
      onSave: () => { },
    },
    'apply-template': {
      title: 'Apply Case Template', wide: false,
      body: <>
        <p className="text-[12px] text-slate-500 mb-4">Select a practice area template to auto-generate folder structures and task lists.</p>
        <div className="space-y-2">
          {[
            { id: 'pi', label: 'Personal Injury', desc: 'Medical Records, Insurance, Litigation flow' },
            { id: 'im', label: 'Immigration', desc: 'Identity Docs, USCIS Filings, Evidence' },
            { id: 'gl', label: 'General Litigation', desc: 'Pleadings, Discovery, Trial Prep' }
          ].map(t => (
            <label key={t.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-primary-400 cursor-pointer transition-all group">
              <input type="radio" name="template" value={t.id} className="mt-1" defaultChecked={t.id === 'pi'} />
              <div>
                <p className="text-[13px] font-700 text-slate-900 group-hover:text-primary-600">{t.label}</p>
                <p className="text-[11px] text-slate-400">{t.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </>,
      onSave: () => {
        toast('Matter folders and matter registry generated.', 'success');
        navigate('/admin/matters');
      },
    },
    'conflict-check': {
      title: 'Conflict of Interest Check', wide: false,
      body: <>
        <div className="mb-3"><Field label="Prospective Party Name" required><Input name="prospectiveClient" placeholder="Full name or Company" required /></Field></div>
        <div className="mb-3"><Field label="Opposing Party Name" required><Input name="opposingParty" placeholder="Opponent or Adverse Entity" required /></Field></div>
        <div className="bg-[#0057c7]/10 p-4 rounded-2xl border border-[#0057c7]/20 text-[13px] text-[#38bdf8] italic leading-relaxed">
          System will scan all matters, contacts, and closed files for potential hits.
        </div>
      </>,
      onSave: () => toast('Conflict check initiated. Standby...', 'info'),
    },
    'view-invoice': {
      title: data ? `Verified Financial Record: ${data.id}` : 'Invoice Preview', wide: false,
      body: <>
        {/* Executive Fintech Header */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0b1f3a] via-[#0057c7] to-[#003d8c] p-8 text-white shadow-2xl border border-white/10 mb-8 group">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#38bdf8]/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981] animate-pulse" />
                <span className="text-[10px] font-900 uppercase tracking-[0.3em] text-white/70">Authenticated Statement</span>
              </div>
              <h2 className="text-[32px] font-900 tracking-tighter leading-tight mb-1 text-white">Victoria Tulsidas</h2>
              <p className="text-[12px] font-800 text-white/50 uppercase tracking-[0.2em]">Institutional Legal Counsel</p>
            </div>
            <div className="text-right">
              <div className="inline-flex px-4 py-1.5 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-[10px] font-900 uppercase tracking-[0.2em] mb-6">
                {data?.status || 'Processing'}
              </div>
              <p className="text-[11px] font-900 text-white/40 uppercase tracking-widest mb-1">Total Valuation</p>
              <p className="text-[42px] font-900 tracking-tighter text-white drop-shadow-2xl">{data?.amount}</p>
            </div>
          </div>
        </div>

        {/* Global Action Hub */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={async () => {
              try {
                const invoiceId = data.dbId || data.id;
                const { blob, filename } = await api.billing.downloadInvoicePdf(invoiceId);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = filename;
                document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
              } catch (e) { toast('Download failed', 'error'); }
            }}
            className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-white text-[13px] font-800 hover:bg-white/10 hover:border-[#38bdf8]/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <svg className="w-4 h-4 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5 5-5M12 15V3" /></svg>
            Export Archive
          </button>
          <button
            onClick={async () => {
              try {
                const invoiceId = data.dbId || data.id;
                const { blob } = await api.billing.downloadInvoicePdf(invoiceId);
                const url = window.URL.createObjectURL(blob);
                onClose();
                setTimeout(() => {
                  openModal('preview-document', {
                    url,
                    mime_type: 'application/pdf',
                    title: `Invoice ${data.id || ''}`
                  });
                }, 100);
              } catch (e) {
                toast('Failed to open invoice PDF', 'error');
              }
            }}
            className="py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center active:scale-[0.98]"
          >
            <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          </button>
        </div>

        {/* Intelligence Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05] hover:border-white/10 group cursor-default relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#38bdf8]/5 blur-2xl" />
            <p className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] mb-2 opacity-60">Party Entity</p>
            <p className="text-[18px] font-900 text-white tracking-tighter group-hover:text-[#38bdf8] transition-colors">{data?.client}</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              <span className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest opacity-40">Identity Verified</span>
            </div>
          </div>
          <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05] hover:border-white/10 group cursor-default relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#f59e0b]/5 blur-2xl" />
            <p className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] mb-2 opacity-60">Settlement window</p>
            <p className="text-[18px] font-900 text-white tracking-tighter group-hover:text-[#f59e0b] transition-colors">{data?.due}</p>
            <p className="text-[10px] font-900 text-[#f59e0b] mt-4 uppercase tracking-[0.2em] opacity-80">Institutional Term</p>
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-5 px-4">
            <h4 className="text-[15px] font-900 text-white tracking-tighter flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0057c7]" />
              Statement breakdown
            </h4>
            <span className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.3em] opacity-40">{data?.id}</span>
          </div>

          <div className="space-y-3">
            {data?.items && data.items.length > 0 ? (
              data.items.map((item) => (
                <div key={item.id} className="rounded-[2.5rem] bg-white/[0.02] border border-white/5 p-2 transition-all hover:bg-white/[0.04] hover:border-white/10 group">
                  <div className="px-6 py-5 rounded-[2rem] bg-white/[0.02] flex justify-between items-center">
                    <div className="space-y-1.5">
                      <p className="text-[15px] font-900 text-white tracking-tight group-hover:text-[#38bdf8] transition-colors">{item.description}</p>
                      <div className="flex gap-3 text-[10px] font-900 uppercase tracking-[0.2em] opacity-40">
                        <span className="text-[#38bdf8] opacity-100">Verified Service</span>
                        <span>•</span>
                        <span>{formatPSTDate(item.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-900 text-white tracking-tighter">${Number(item.amount).toFixed(2)}</p>
                      <p className="text-[9px] font-900 text-[#8a94a6] uppercase tracking-widest opacity-40">Institutional Rate</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[2.5rem] bg-white/[0.02] border border-white/5 p-2 transition-all hover:bg-white/[0.04] group">
                <div className="px-8 py-7 rounded-[2rem] bg-white/[0.02] flex justify-between items-center group transition-all">
                  <div className="space-y-2">
                    <p className="text-[17px] font-900 text-white tracking-tight group-hover:text-[#38bdf8] transition-colors">{data?.desc || 'Institutional Legal Services'}</p>
                    <div className="flex gap-3 text-[10px] font-900 uppercase tracking-[0.2em] opacity-40">
                      <span className="text-[#10b981] opacity-100">Verified Service</span>
                      <span>•</span>
                      <span>Operational Ledger</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[22px] font-900 text-white tracking-tighter">{data?.amount}</p>
                    <p className="text-[9px] font-900 text-[#8a94a6] uppercase tracking-widest opacity-40">Consolidated Valuation</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </>,
      onSave: () => { },
    },
    'add-note': {
      title: 'Add Matter Note', wide: false,
      body: <>
        {data?.matterId ? <input type="hidden" name="matterId" value={data.matterId} /> : null}
        <div className="mb-3">
          <Field label="Note Title" required><Input name="title" placeholder="Summary of discussion/action" required /></Field>
        </div>
        <div className="mb-3">
          <Field label="Visibility" required>
            <Select name="visibility" required>
              <option value="Internal">Internal (Firm Only)</option>
              <option value="Shared">Shared (Party & Firm)</option>
            </Select>
          </Field>
        </div>
        <Field label="Note Content" required>
          <Textarea name="content" rows={5} placeholder="Type the detailed note here..." required />
        </Field>
      </>,
      onSave: () => toast('Matter note added successfully!', 'success'),
    },
    'log-call': {
      title: 'Log Communication / Call', wide: false,
      body: <>
        {data?.matterId ? <input type="hidden" name="matterId" value={data.matterId} /> : null}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Type" required>
            <Select name="type" required>
              <option value="Call">Phone Call</option>
              <option value="Meeting">Meeting</option>
              <option value="Video">Video Call</option>
            </Select>
          </Field>
          <Field label="Direction" required>
            <Select name="direction" required>
              <option value="Inbound">Inbound</option>
              <option value="Outbound">Outbound</option>
            </Select>
          </Field>
        </div>
        <div className="mb-3">
          <Field label="Subject" required><Input name="subject" placeholder="Purpose of the call" required /></Field>
          <Field label="Visibility" required>
            <Select name="visibility" required>
              <option value="Internal">Internal (Firm Only)</option>
              <option value="Shared">Shared (Party & Firm)</option>
            </Select>
          </Field>
        </div>
        <Field label="Notes / Outcome" required>
          <Textarea name="notes" rows={4} placeholder="Key takeaways and next steps..." required />
        </Field>
      </>,
      onSave: () => toast('Communication logged successfully!', 'success'),
    },
    'view-report': {
      title: data?.title || 'Report Overview', wide: true,
      body: data?.content || <p>No content available.</p>,
      onSave: () => { },
    },
    'view-event': {
      title: data?.title || 'Event Details', wide: 'titan',
      body: <ViewEventModalBody data={data} />,
      onSave: () => { },
    },
    'add-template': {
      title: 'Create New Template', wide: true,
      body: <>
        <div className="mb-3"><Field label="Template Title" required><Input name="title" placeholder="E.g., Initial Pleading Form" required /></Field></div>
        <div className="mb-3"><Field label="Description"><Input name="description" placeholder="E.g., Initial Pleading template for Civil Litigation cases." /></Field></div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Field label="Category" required>
            <Select name="category" required defaultValue="agreement">
              <option value="agreement">Agreement</option>
              <option value="court_form">Court Form</option>
              <option value="letter">Letter</option>
              <option value="contract">Contract</option>
              <option value="motion">Motion</option>
              <option value="pleading">Pleading</option>
              <option value="affidavit">Affidavit</option>
              <option value="notice">Notice</option>
              <option value="demand_letter">Demand Letter</option>
              <option value="legal_disclaimer">Legal Disclaimer</option>
              <option value="other">Other...</option>
            </Select>
          </Field>
          <Field label="Practice Area">
            <Select name="practice_area">
              <option value="">General</option>
              <option value="Civil Litigation">Civil Litigation</option>
              <option value="Family Law">Family Law</option>
              <option value="Corporate">Corporate</option>
              <option value="other">Other...</option>
            </Select>
          </Field>
          <Field label="Status" required>
            <Select name="is_active" defaultValue="active" required>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
        {formState.category === 'other' && (
          <div className="mb-3">
            <Field label="Custom Category" required>
              <Input name="custom_category" placeholder="E.g., Deposition Script" required />
            </Field>
          </div>
        )}
        {formState.practice_area === 'other' && (
          <div className="mb-3">
            <Field label="Custom Practice Area" required>
              <Input name="custom_practice_area" placeholder="E.g., Immigration" required />
            </Field>
          </div>
        )}
        <div className="p-4 rounded-xl bg-[#0057c7]/10 border border-[#0057c7]/20 mb-3 text-[11px] text-[#38bdf8] font-600">
          Available placeholders: {"{{FirmName}}"}, {"{{AttorneyName}}"}, {"{{MatterNumber}}"}, {"{{MatterTitle}}"}, {"{{PartyName}}"}, {"{{RecipientName}}"}, {"{{RecipientAddress}}"}, {"{{TodayDate}}"}, {"{{CaseNumber}}"}, {"{{CourtName}}"}
        </div>
        <Field label="Template Content" required><Textarea name="content" rows={10} placeholder="Enter template text with placeholders..." required /></Field>
      </>,
      onSave: () => toast('Template created successfully!', 'success'),
    },
    'edit-template': {
      title: data ? `Edit Template: ${data.title}` : 'Edit Template', wide: true,
      body: (() => {
        if (type !== 'edit-template') return null;
        const predefinedCats = ['agreement', 'court_form', 'letter', 'contract', 'motion', 'pleading', 'affidavit', 'notice', 'demand_letter', 'legal_disclaimer'];
        const isCustomCat = typeof data?.category === 'string' && !predefinedCats.includes(data.category.toLowerCase());
        const defaultCatVal = isCustomCat ? 'other' : (data?.category || 'agreement');
        const showCustomCat = (formState.category || defaultCatVal) === 'other';

        const predefinedPAs = ['Civil Litigation', 'Family Law', 'Corporate'];
        const isCustomPA = typeof data?.practice_area === 'string' && !predefinedPAs.includes(data.practice_area);
        const defaultPAVal = isCustomPA ? 'other' : (data?.practice_area || '');
        const showCustomPA = (formState.practice_area || defaultPAVal) === 'other';

        return (
          <>
            <div className="mb-3"><Field label="Template Title" required><Input name="title" defaultValue={data?.title} required /></Field></div>
            <div className="mb-3"><Field label="Description"><Input name="description" defaultValue={data?.description || ''} placeholder="E.g., Initial Pleading template for Civil Litigation cases." /></Field></div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Field label="Category" required>
                <Select name="category" defaultValue={defaultCatVal} required>
                  <option value="agreement">Agreement</option>
                  <option value="court_form">Court Form</option>
                  <option value="letter">Letter</option>
                  <option value="contract">Contract</option>
                  <option value="motion">Motion</option>
                  <option value="pleading">Pleading</option>
                  <option value="affidavit">Affidavit</option>
                  <option value="notice">Notice</option>
                  <option value="demand_letter">Demand Letter</option>
                  <option value="legal_disclaimer">Legal Disclaimer</option>
                  <option value="other">Other...</option>
                </Select>
              </Field>
              <Field label="Practice Area">
                <Select name="practice_area" defaultValue={defaultPAVal}>
                  <option value="">General</option>
                  <option value="Civil Litigation">Civil Litigation</option>
                  <option value="Family Law">Family Law</option>
                  <option value="Corporate">Corporate</option>
                  <option value="other">Other...</option>
                </Select>
              </Field>
              <Field label="Status" required>
                <Select name="is_active" defaultValue={data?.is_active === false ? 'inactive' : 'active'} required>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
            </div>
            {showCustomCat && (
              <div className="mb-3">
                <Field label="Custom Category" required>
                  <Input name="custom_category" defaultValue={isCustomCat ? data.category : ''} placeholder="E.g., Deposition Script" required />
                </Field>
              </div>
            )}
            {showCustomPA && (
              <div className="mb-3">
                <Field label="Custom Practice Area" required>
                  <Input name="custom_practice_area" defaultValue={isCustomPA ? data.practice_area : ''} placeholder="E.g., Immigration" required />
                </Field>
              </div>
            )}
            <div className="p-4 rounded-xl bg-[#0057c7]/10 border border-[#0057c7]/20 mb-3 text-[11px] text-[#38bdf8] font-600">
              Available placeholders: {"{{FirmName}}"}, {"{{AttorneyName}}"}, {"{{MatterNumber}}"}, {"{{MatterTitle}}"}, {"{{PartyName}}"}, {"{{RecipientName}}"}, {"{{RecipientAddress}}"}, {"{{TodayDate}}"}, {"{{CaseNumber}}"}, {"{{CourtName}}"}
            </div>
            <Field label="Template Content" required><Textarea name="content" rows={10} defaultValue={data?.content || ''} required /></Field>
          </>
        );
      })(),
      onSave: () => toast('Template updated successfully!', 'success'),
    },
    'edit-draft': {
      title: data ? `Edit Draft: ${data.title}` : 'Edit Draft', wide: true,
      body: (() => {
        if (type !== 'edit-draft') return null;
        const predefinedDraftCats = ['Agreement','Engagement','Intake','Litigation','Resolution','General','court_form','letter','contract','motion','pleading','affidavit','notice','demand_letter','legal_disclaimer'];
        const isCustomDraftCat = typeof data?.category === 'string' && !predefinedDraftCats.includes(data.category);
        const defaultDraftCatVal = isCustomDraftCat ? 'other' : (data?.category || 'General');
        const showCustomDraftCat = (formState.category || defaultDraftCatVal) === 'other';

        const draftContentStr = typeof data?.content === 'string' ? data.content : '';
        const metaMatch = draftContentStr.match(/<!--\s*LETTER_META:\s*({[\s\S]*?})\s*-->/i);
        let existingMeta = {};
        if (metaMatch) {
          try { existingMeta = JSON.parse(metaMatch[1]); } catch (e) {}
        }
        const cleanContent = draftContentStr.replace(/<!--\s*LETTER_META:[\s\S]*?-->\s*/gi, '').trim();
        const currentCategory = (formState.category || defaultDraftCatVal || '').toLowerCase();
        const isLetter = currentCategory === 'letter' || currentCategory === 'demand_letter' || currentCategory === 'demand letter' || currentCategory.includes('letter');

        return (
          <>
            <div className="mb-3"><Field label="Draft Title" required><Input name="title" defaultValue={data?.title} required /></Field></div>
            <div className="mb-3">
              <Field label="Category" required>
                <Select name="category" defaultValue={defaultDraftCatVal} required>
                  <option value="Agreement">Agreement</option>
                  <option value="Engagement">Engagement</option>
                  <option value="Intake">Intake</option>
                  <option value="Litigation">Litigation</option>
                  <option value="Resolution">Resolution</option>
                  <option value="General">General</option>
                  <option value="court_form">Court Form</option>
                  <option value="letter">Letter</option>
                  <option value="contract">Contract</option>
                  <option value="motion">Motion</option>
                  <option value="pleading">Pleading</option>
                  <option value="affidavit">Affidavit</option>
                  <option value="notice">Notice</option>
                  <option value="demand_letter">Demand Letter</option>
                  <option value="legal_disclaimer">Legal Disclaimer</option>
                  <option value="other">Other...</option>
                </Select>
              </Field>
            </div>
            {showCustomDraftCat && (
              <div className="mb-3">
                <Field label="Custom Category" required>
                  <Input name="custom_category" defaultValue={isCustomDraftCat ? data.category : ''} placeholder="E.g., Settlement Agreement" required />
                </Field>
              </div>
            )}

            {isLetter && (
              <div className="space-y-3 mb-4 p-4 rounded-2xl border border-[#0057c7]/30 bg-[#0057c7]/[0.04]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-[12px] font-800 text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
                    <span>📬</span> Transmission / Delivery Method (Top Indicator)
                  </label>
                  <span className="text-[10px] font-800 px-2.5 py-0.5 rounded-lg bg-black/60 text-amber-300 border border-amber-400/20 uppercase tracking-widest font-mono">
                    ✓ Top Header Indicator
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Delivery Method">
                    <Select name="delivery_method" defaultValue={existingMeta.delivery_method || 'email'}>
                      <option value="email">Via Email Correspondence</option>
                      <option value="us_mail">Via U.S. Mail</option>
                      <option value="certified_mail">Via Certified Mail (RRR)</option>
                      <option value="courier">Via Overnight Courier</option>
                    </Select>
                  </Field>
                  <Field label="Transmission Email (if email)">
                    <Input name="delivery_email" defaultValue={existingMeta.delivery_email || ''} placeholder="recipient@example.com" />
                  </Field>
                  <Field label="Recipient Full Name">
                    <Input name="recipient_name" defaultValue={existingMeta.recipient_name || ''} placeholder="e.g. John Doe" />
                  </Field>
                  <Field label="Recipient Address (City, State, Zip)">
                    <Input name="recipient_address" defaultValue={existingMeta.recipient_address || ''} placeholder="123 Ocean Blvd, Santa Monica, CA 90401" />
                  </Field>
                </div>
              </div>
            )}

            <Field label="Draft Content" required><Textarea name="content" rows={12} defaultValue={cleanContent || data?.content} required /></Field>
          </>
        );
      })(),
      onSave: () => toast('Draft updated successfully!', 'success'),
    },
    'browse-templates': {
      title: 'Document Template Library', wide: true,
      body: <TemplateLibrary targetMatterId={data?.targetMatterId} toast={toast} />,
    },
    'add-practice-area': {
      title: 'Add Practice Area', wide: false,
      body: <>
        <div className="mb-3"><Field label="Name" required><Input name="name" placeholder="e.g. Civil Litigation" required /></Field></div>
        <div className="mb-3"><Field label="Status"><Select name="status" defaultValue="active"><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field></div>
      </>
    },
    'edit-practice-area': {
      title: 'Edit Practice Area', wide: false,
      body: <>
        <div className="mb-3"><Field label="Name" required><Input name="name" defaultValue={data?.name} required /></Field></div>
        <div className="mb-3"><Field label="Status"><Select name="status" defaultValue={data?.is_active ? 'active' : 'inactive'}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field></div>
      </>
    },
    'add-custom-field': {
      title: 'Add Custom Field', wide: false,
      body: <>
        <div className="mb-3"><Field label="Field Name" required><Input name="name" placeholder="e.g. Settlement Goal" required /></Field></div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Field Type" required>
            <Select name="type" defaultValue="text" required>
              <option value="text">Text (Single Line)</option>
              <option value="number">Number</option>
              <option value="currency">Currency</option>
              <option value="date">Date</option>
              <option value="dropdown">Dropdown Options</option>
              <option value="yes_no">Yes / No</option>
              <option value="checkbox">Checkbox</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="active"><option value="active">Active</option><option value="inactive">Inactive</option></Select>
          </Field>
        </div>
        <Field label="Dropdown Options (Comma separated)"><Input name="options" placeholder="Option A, Option B" /></Field>
        <p className="text-[#8a94a6] text-[10px] mt-1 italic">Only required if Field Type is Dropdown Options</p>
      </>
    },
    'edit-custom-field': {
      title: 'Edit Custom Field', wide: false,
      body: <>
        <div className="mb-3"><Field label="Field Name" required><Input name="name" defaultValue={data?.name} required /></Field></div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Field Type" required>
            <Select name="type" defaultValue={data?.type} required>
              <option value="text">Text (Single Line)</option>
              <option value="number">Number</option>
              <option value="currency">Currency</option>
              <option value="date">Date</option>
              <option value="dropdown">Dropdown Options</option>
              <option value="yes_no">Yes / No</option>
              <option value="checkbox">Checkbox</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={data?.is_active ? 'active' : 'inactive'}><option value="active">Active</option><option value="inactive">Inactive</option></Select>
          </Field>
        </div>
        <Field label="Dropdown Options (Comma separated)"><Input name="options" defaultValue={Array.isArray(data?.options) ? data.options.join(', ') : ''} placeholder="Option A, Option B" /></Field>
      </>
    },
  };

  if (modals['edit-case'] && modals['add-case']) {
    modals['edit-case'].body = modals['add-case'].body;
  }

  const m = modals[type];
  if (!m) return null;

  const isQueueFinished = isUploadingQueue && uploadQueue.length > 0 && uploadQueue.every(q => q.status === 'completed' || q.status === 'failed');
  const primaryLabel =
    type === 'compose-email' ? 'Send Email'
      : type === 'add-document' ? (isUploadingQueue ? 'Done' : 'Upload')
        : type === 'view-invoice' ? 'Acknowledge'
          : type === 'view-report' ? 'Close'
            : type === 'view-event' ? 'Acknowledge'
              : type === 'browse-templates' ? 'Close'
                : 'Save';
  const handlePrimary = async () => {
    if (type === 'view-invoice' || type === 'view-report') {
      onClose();
      return;
    }
    if (type === 'add-document') {
      if (isUploadingQueue) {
        onClose();
        window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
        return;
      }
      if (formRef.current && !formRef.current.checkValidity()) {
        formRef.current.reportValidity?.();
        return;
      }
      const fd = new FormData(formRef.current);
      const values = Object.fromEntries(fd.entries());
      const category = values.docCategory === 'other'
        ? (values.custom_doc_category || '').trim()
        : (values.docCategory || 'General');
      const visibility = role === 'lawyer' ? 'client_shared' : role === 'client' ? 'client_visible' : 'internal';
      const matterId = parseInt(String(values.matterId || data?.matterId || ''), 10);
      
      if (!Number.isFinite(matterId)) {
        toast('Select a matter.', 'error');
        return;
      }
      if (selectedFiles.length === 0) {
        toast('Please select files or a folder to upload.', 'error');
        return;
      }
      
      setIsUploadingQueue(true);
      startQueueUpload(selectedFiles, matterId, category, visibility, user.id);
      return;
    }
    const skipValidity = ['apply-template', 'conflict-check', 'edit-case', 'add-case', 'edit-client', 'add-client'].includes(type);
    if (!skipValidity && formRef.current && !formRef.current.checkValidity()) {
      formRef.current.reportValidity?.();
      return;
    }
    setSaving(true);
    try {
      let values = {};
      if (formRef.current) {
        const fd = new FormData(formRef.current);
        values = { ...formState, ...Object.fromEntries(fd.entries()) };
        if (type === 'add-case' || type === 'edit-case') {
          values.clientIds = fd.getAll('clientIds');
          if (formState.existing_client_select || formState.selected_client_id) {
            const selId = parseInt(String(formState.existing_client_select || formState.selected_client_id), 10);
            if (Number.isFinite(selId) && !values.clientIds.includes(selId)) {
              values.clientIds = [selId, ...values.clientIds];
            }
          }
          values.inlineParties = inlineParties;
          values.parties_data = partiesList;
          values.vehicles_data = vehiclesList;
          values.intake_answers = adaptiveQuestions;
        }
        if (type === 'add-event') {
          values.internalAttendees = fd.getAll('internalAttendees');
        }
      }
      if (onSave) {
        await Promise.resolve(onSave(values));
      } else {
        await defaultModalSubmit(type, data, values, { role, user, toast, navigate }, selectedFiles);
      }
      onClose();
    } catch (e) {
      if (e && (e.duplicate || e.is_duplicate)) {
        toast(e.message || 'Duplicate contact found', 'error');
        setDuplicateData(e);
        setShowDuplicateModal(true);
      } else {
        toast(e.message || 'Action failed', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const primaryDisabled = 
    type === 'view-invoice' ? saving 
      : type === 'add-document' ? (isUploadingQueue ? !isQueueFinished : selectedFiles.length === 0 || saving)
        : (type === 'edit-case' || type === 'add-case' ? saving : (!isValid || saving));

  return (
    <>
      <Modal title={m.title} onClose={onClose} wide={m.wide}
        footer={
          type === 'view-event' ? (
            <div className="flex items-center justify-between w-full">
              {role !== 'client' ? (
                <button
                  type="button"
                  onClick={async () => {
                    const eventId = data?.raw_id || data?.id;
                    if (!eventId) {
                      toast('This event cannot be deleted.', 'info');
                      return;
                    }
                    if (window.confirm('Are you sure you want to delete this event? This action is permanent and cannot be undone.')) {
                      try {
                        await api.calendar.remove(eventId);
                        toast('Calendar Event deleted successfully.', 'success');
                        onClose();
                        window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
                      } catch (e) {
                        toast(e.message || 'Delete failed', 'error');
                      }
                    }
                  }}
                  className="text-red-400 hover:text-red-300 font-bold text-[13px] px-3 py-2 transition-colors rounded-lg hover:bg-red-500/10"
                >
                  Delete
                </button>
              ) : <div />}
              <div className="flex items-center gap-2.5">
                {role !== 'client' && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openModal('add-event', data, onSave);
                    }}
                    className="border border-[#38bdf8]/60 text-[#38bdf8] hover:bg-[#38bdf8]/10 font-semibold px-4 py-1.5 text-[13px] rounded-lg transition-all"
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#0057c7] hover:bg-[#004bb0] text-white font-semibold px-4 py-1.5 rounded-lg flex items-center gap-2 text-[13px] shadow-sm transition-all"
                >
                  <span>RSVP</span>
                  <span className="text-[9px]">▼</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving || (type === 'add-document' && isUploadingQueue && !isQueueFinished)}>
                {type === 'preview-document' ? 'Close' : 'Cancel'}
              </button>
              {type !== 'preview-document' && (
                <button
                  type="button"
                  onClick={handlePrimary}
                  disabled={primaryDisabled}
                  className={`btn btn-primary transition-all ${primaryDisabled ? 'opacity-50 cursor-not-allowed hover:translate-y-0 shadow-none' : ''}`}
                >
                  {saving && type !== 'view-invoice' ? 'Saving…' : primaryLabel}
                </button>
              )}
            </>
          )
        }>
        <form ref={formRef} className="[&_.grid-cols-2]:grid-cols-1 sm:[&_.grid-cols-2]:grid-cols-2" onChange={handleChange} onSubmit={e => e.preventDefault()}>
          {loadingLookups ? <ModalFormSkeleton wide={m.wide !== false} /> : m.body}
        </form>
      </Modal>

      {/* Production Add & Edit Party Modal Popup */}
      {showPartyModal && (() => {
        const ADAPTIVE_MODULE_CONFIG = {
          'Driver': { title: 'Driver Record', icon: '🏎️', subtitle: 'Manage driver license details, CDL compliance & vehicle assignment.', saveLabel: 'Save Driver' },
          'Passenger': { title: 'Passenger Record', icon: '👥', subtitle: 'Track seating position, restraints, injuries & emergency contacts.', saveLabel: 'Save Passenger' },
          'Witness': { title: 'Witness Record', icon: '👁️', subtitle: 'Record eyewitness statement, contact information & testimony.', saveLabel: 'Save Witness' },
          'Insurance Adjuster': { title: 'Insurance Adjuster & Policy Record', icon: '🛡️', subtitle: 'Record policy limits, claim numbers, adjuster contacts & coverage.', saveLabel: 'Save Insurance Record' },
          'Insurance Company': { title: 'Insurance Adjuster & Policy Record', icon: '🛡️', subtitle: 'Record policy limits, claim numbers, adjuster contacts & coverage.', saveLabel: 'Save Insurance Record' },
          'Medical Provider': { title: 'Medical Provider & Treatment Record', icon: '🩹', subtitle: 'Record physician details, facility info, diagnosis & medical costs.', saveLabel: 'Save Medical Provider' },
          'Employer': { title: 'Employer & Lost Wage Record', icon: '🏢', subtitle: 'Track employment details, wage verification & supervisor contacts.', saveLabel: 'Save Employer Record' },
          'Property Damage': { title: 'Property Damage Record', icon: '🏠', subtitle: 'Record damaged property, repair estimates & shop assignments.', saveLabel: 'Save Property Damage' },
          'Police': { title: 'Police & Investigation Record', icon: '👮', subtitle: 'Track police reports, officer badge numbers, citations & evidence.', saveLabel: 'Save Police Report' },
          'Police Officer': { title: 'Police & Investigation Record', icon: '👮', subtitle: 'Track police reports, officer badge numbers, citations & evidence.', saveLabel: 'Save Police Report' },
        };

        const activeRole = tempParty.party_role || 'Witness';
        const adaptiveConfig = ADAPTIVE_MODULE_CONFIG[activeRole];
        const isAdaptiveModule = Boolean(adaptiveConfig);

        const legalPartyRoles = [
          'Client', 'Plaintiff', 'Defendant', 'Applicant', 'Petitioner',
          'Respondent', 'Beneficiary', 'Guardian', 'Attorney', 'Law Firm',
          'Judge', 'Court', 'Government Agency', 'Insurance Company', 'Business',
          'Organization', 'Employer Representative', 'Medical Representative',
          'Interpreter', 'Translator', 'Other Legal Party'
        ];

        return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => { setShowPartyModal(false); setEditingPartyId(null); }}>
          <div
            className="bg-[#1a2233] border border-white/10 rounded-[2rem] p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 text-white max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setShowPartyModal(false);
                setEditingPartyId(null);
              }
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              {isAdaptiveModule ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{adaptiveConfig.icon}</span>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>{editingPartyId ? `Edit ${adaptiveConfig.title}` : `Add ${adaptiveConfig.title}`}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{adaptiveConfig.subtitle}</p>
                  </div>
                </div>
              ) : (
                <h3 className="text-base font-900 text-white uppercase tracking-wider flex items-center gap-2">
                  <span>👤 {editingPartyId ? 'Edit Party in Matter' : 'Add Party to Matter'}</span>
                </h3>
              )}
              <button type="button" onClick={() => { setShowPartyModal(false); setEditingPartyId(null); }} className="text-slate-400 hover:text-white font-bold text-lg px-2">✕</button>
            </div>

            <div className="space-y-3">
              {/* Select Existing Contact Master Picker */}
              <div className="p-3 rounded-2xl bg-[#0057c7]/10 border border-[#0057c7]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-900 text-[#38bdf8] uppercase tracking-widest flex items-center gap-1.5">
                    <span>🔍 Select Existing Contact from Master</span>
                  </label>
                  {tempParty.client_id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        ✓ Linked (ID #{tempParty.client_id})
                      </span>
                      <button
                        type="button"
                        onClick={() => setTempParty(p => ({ ...p, client_id: null, contact_id: null }))}
                        className="text-[9px] text-slate-400 hover:text-white underline"
                      >
                        Unlink
                      </button>
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-400">Search to reuse existing contact</span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={contactSearchQuery}
                    onChange={e => {
                      setContactSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        api.contacts.search(e.target.value).then(res => {
                          setContactSearchResults(Array.isArray(res.data) ? res.data : []);
                        }).catch(() => {});
                      } else {
                        setContactSearchResults([]);
                      }
                    }}
                    placeholder="Type Name, Email, Phone, or Company to reuse an existing contact..."
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                  
                  {contactSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 rounded-xl bg-[#121826] border border-[#38bdf8]/40 max-h-48 overflow-y-auto custom-scrollbar shadow-2xl p-1.5 space-y-1 z-50">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 flex justify-between items-center">
                        <span>Matching Master Contacts ({contactSearchResults.length}):</span>
                        <button type="button" onClick={() => setContactSearchResults([])} className="text-slate-400 hover:text-white text-[10px]">Close ✕</button>
                      </div>
                      {contactSearchResults.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setTempParty(p => ({
                              ...p,
                              client_id: c.id,
                              contact_id: c.id,
                              full_name: c.full_name,
                              email: c.email || p.email,
                              phone: c.phone || p.phone,
                              party_type: c.party_type || p.party_type,
                              company_name: c.organization_name || (c.party_type === 'Organization' ? c.full_name : p.company_name),
                              address: c.address_line_1 || p.address
                            }));
                            setContactSearchQuery('');
                            setContactSearchResults([]);
                            toast(`Linked to existing contact "${c.full_name}" (Matter roles stay independent)`, 'success');
                          }}
                          className="p-2 rounded-lg hover:bg-[#0057c7]/30 border border-white/5 hover:border-[#38bdf8]/50 cursor-pointer transition-all flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{c.full_name}</span>
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-white/10 text-slate-300">{c.party_type || 'Person'}</span>
                              <span className="text-[9px] font-bold text-[#38bdf8]">⚖️ {c.linked_matters_count || 0} Matter(s)</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {c.email && <span>📧 {c.email} </span>}
                              {c.phone && <span>📞 {c.phone} </span>}
                              {c.organization_name && <span>🏢 {c.organization_name}</span>}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-white bg-[#0057c7] px-2 py-1 rounded-lg shadow-md">
                            Select & Link
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Show Multi-Role Tag Selector ONLY for standard Legal Parties (Step 3) */}
              {!isAdaptiveModule && (
                <div>
                  <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">
                    Legal Roles (Multi-Role Support) *
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#05080f] border border-white/10 max-h-32 overflow-y-auto custom-scrollbar">
                    {(() => {
                      const selectedRoles = Array.isArray(tempParty.party_roles) && tempParty.party_roles.length > 0
                        ? tempParty.party_roles
                        : [tempParty.party_role || 'Plaintiff'];

                      return legalPartyRoles.map(r => {
                        const isSelected = selectedRoles.includes(r);
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              let updated;
                              if (isSelected) {
                                if (selectedRoles.length === 1) {
                                  toast('At least one Party Role is required.', 'error');
                                  return;
                                }
                                updated = selectedRoles.filter(role => role !== r);
                              } else {
                                updated = [...selectedRoles, r];
                              }

                              const currentPrimary = tempParty.primary_party_role || tempParty.party_role;
                              let newPrimary = (currentPrimary && updated.includes(currentPrimary))
                                ? currentPrimary
                                : updated[0];

                              setTempParty(p => ({
                                ...p,
                                party_roles: updated,
                                primary_party_role: newPrimary,
                                party_role: newPrimary,
                                secondary_party_roles: updated.filter(role => role !== newPrimary)
                              }));
                            }}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                              isSelected
                                ? 'bg-[#0057c7] text-white shadow-md shadow-[#0057c7]/30 border border-[#38bdf8]/50'
                                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5 hover:border-white/20'
                            }`}
                          >
                            <span>{isSelected ? '✓' : '+'}</span>
                            <span>{r}</span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              <div className={isAdaptiveModule ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}>
                {!isAdaptiveModule && (
                  <div>
                    <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Primary Role (Override)</label>
                    <select
                      value={tempParty.primary_party_role || tempParty.party_role}
                      onChange={e => {
                        const newPrimary = e.target.value;
                        const roles = Array.isArray(tempParty.party_roles) && tempParty.party_roles.length > 0
                          ? tempParty.party_roles
                          : [newPrimary];
                        const updatedRoles = Array.from(new Set([newPrimary, ...roles]));
                        setTempParty(p => ({
                          ...p,
                          primary_party_role: newPrimary,
                          party_role: newPrimary,
                          party_roles: updatedRoles,
                          secondary_party_roles: updatedRoles.filter(r => r !== newPrimary)
                        }));
                      }}
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                    >
                      {(Array.isArray(tempParty.party_roles) ? tempParty.party_roles : [tempParty.party_role || 'Plaintiff']).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Party Type *</label>
                  <select
                    value={tempParty.party_type}
                    onChange={e => setTempParty(p => ({ ...p, party_type: e.target.value }))}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  >
                    <option value="Person">Person (Individual)</option>
                    <option value="Organization">Organization (Company / Corp)</option>
                  </select>
                </div>
              </div>

              {tempParty.party_type === 'Organization' ? (
                <>
                  <div>
                    <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Company / Organization Name *</label>
                    <input
                      type="text"
                      value={tempParty.company_name || tempParty.full_name}
                      onChange={e => setTempParty(p => ({ ...p, company_name: e.target.value, full_name: e.target.value }))}
                      placeholder="E.g., Acme Corporation / State Farm Insurance"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Primary Contact Person</label>
                    <input
                      type="text"
                      value={tempParty.contact_person}
                      onChange={e => setTempParty(p => ({ ...p, contact_person: e.target.value }))}
                      placeholder="E.g., Sarah Manager"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={tempParty.full_name}
                    onChange={e => setTempParty(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="E.g., John Doe"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={tempParty.email}
                    onChange={e => setTempParty(p => ({ ...p, email: e.target.value }))}
                    placeholder="name@example.com"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={tempParty.phone}
                    onChange={e => setTempParty(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Physical / Mailing Address</label>
                <input
                  type="text"
                  value={tempParty.address}
                  onChange={e => setTempParty(p => ({ ...p, address: e.target.value }))}
                  placeholder="Street, City, State, ZIP"
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>

              {tempParty.party_type === 'Organization' && (
                <div>
                  <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Company Website URL</label>
                  <input
                    type="url"
                    value={tempParty.website}
                    onChange={e => setTempParty(p => ({ ...p, website: e.target.value }))}
                    placeholder="https://example.com"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                  />
                </div>
              )}

              {/* Dedicated Role-Specific Form Configuration rendering */}
              {(() => {
                const roleConfig = getPartyRoleFormConfig(tempParty.party_role);
                if (!roleConfig || !roleConfig.fields) return null;
                return (
                  <div className={`p-3.5 rounded-xl space-y-3.5 border ${roleConfig.badgeClass || 'bg-white/[0.02] border-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-900 uppercase tracking-wider">{roleConfig.title || `${tempParty.party_role} Details`}</p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-white/10">{tempParty.party_role}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {roleConfig.fields.map(f => (
                        <div key={f.name} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
                          <label className="text-[9px] font-bold text-[#8a94a6] block mb-1">{f.label}</label>
                          {f.type === 'textarea' ? (
                            <textarea
                              rows={2}
                              value={tempParty[f.name] || ''}
                              onChange={e => setTempParty(p => ({ ...p, [f.name]: e.target.value }))}
                              placeholder={f.placeholder || ''}
                              className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                            />
                          ) : f.type === 'select' ? (
                            <select
                              value={tempParty[f.name] || ''}
                              onChange={e => setTempParty(p => ({ ...p, [f.name]: e.target.value }))}
                              className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                            >
                              <option value="">Select option...</option>
                              {f.options && f.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'}
                              value={tempParty[f.name] || ''}
                              onChange={e => setTempParty(p => ({ ...p, [f.name]: e.target.value }))}
                              placeholder={f.placeholder || ''}
                              className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#38bdf8]"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Modular Role Form Engine (RoleRenderer) */}
              <RoleRenderer
                roles={tempParty.party_roles || [tempParty.party_role]}
                tempParty={tempParty}
                setTempParty={setTempParty}
                vehiclesList={vehiclesList}
                adaptiveQuestions={adaptiveQuestions}
              />

              <div>
                <label className="text-[10px] font-900 text-[#8a94a6] uppercase tracking-widest block mb-1">Notes / Statement</label>
                <textarea
                  rows={2}
                  value={tempParty.notes}
                  onChange={e => setTempParty(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Statement or role notes..."
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowPartyModal(false); setEditingPartyId(null); }}
                className="flex-1 btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetName = tempParty.party_type === 'Organization'
                    ? (tempParty.company_name || tempParty.full_name || '').trim()
                    : (tempParty.full_name || '').trim();

                  if (!targetName) {
                    toast(tempParty.party_type === 'Organization' ? 'Please enter Company Name.' : 'Please enter Full Name for the party.', 'error');
                    return;
                  }
                  if (!tempParty.party_role) {
                    toast('Please select a Party Role.', 'error');
                    return;
                  }
                  if (!tempParty.party_type) {
                    toast('Please select a Party Type.', 'error');
                    return;
                  }

                  if (tempParty.email?.trim()) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(tempParty.email.trim())) {
                      toast('Please enter a valid Email Address.', 'error');
                      return;
                    }
                  }

                  if (tempParty.phone?.trim()) {
                    const phoneRegex = /^[0-9+\-\s()]{7,20}$/;
                    if (!phoneRegex.test(tempParty.phone.trim())) {
                      toast('Please enter a valid Phone Number.', 'error');
                      return;
                    }
                  }

                  const activeRoles = Array.isArray(tempParty.party_roles) ? tempParty.party_roles : [tempParty.party_role];
                  const isDriver = activeRoles.includes('Driver');
                  const isPassenger = activeRoles.includes('Passenger');

                  if (isDriver) {
                    if (!tempParty.license_number?.trim()) {
                      toast('License Number is required for Driver role.', 'error');
                      return;
                    }
                    if (tempParty.is_commercial_driver && !tempParty.cdl_number?.trim()) {
                      toast('CDL Number is required for Commercial Drivers.', 'error');
                      return;
                    }
                    const dupLic = partiesList.some(
                      p => (p.id !== editingPartyId && p !== editingPartyId) &&
                           (Array.isArray(p.party_roles) ? p.party_roles : [p.party_role]).includes('Driver') &&
                           (p.role_data?.Driver?.license_number || p.driver_profile?.license_number || '').trim().toUpperCase() === tempParty.license_number.trim().toUpperCase()
                    );
                    if (dupLic) {
                      toast('Duplicate License Number: A driver with this license number already exists in this matter.', 'error');
                      return;
                    }
                  }

                  if (isPassenger && tempParty.assigned_driver_party_id) {
                    const targetDrv = partiesList.find(p => (p.id === tempParty.assigned_driver_party_id || p.id === String(tempParty.assigned_driver_party_id)));
                    if (!targetDrv) {
                      toast('Assigned Driver party not found in matter.', 'error');
                      return;
                    }
                    const isDrvRole = (Array.isArray(targetDrv.party_roles) ? targetDrv.party_roles : [targetDrv.party_role]).includes('Driver');
                    if (!isDrvRole) {
                      toast(`Party "${targetDrv.full_name || targetDrv.company_name}" does not have the Driver role. Passengers can only be assigned to valid Drivers.`, 'error');
                      return;
                    }
                  }

                  const isDuplicate = partiesList.some(
                    p => (p.id !== editingPartyId && p !== editingPartyId) &&
                         p.full_name?.trim().toLowerCase() === targetName.toLowerCase() &&
                         p.party_role?.trim().toLowerCase() === tempParty.party_role.trim().toLowerCase()
                  );

                  if (isDuplicate) {
                    toast('A party with this exact name and role already exists.', 'error');
                    return;
                  }

                  const partyId = editingPartyId || `party_${Date.now()}`;

                  // Driver role removal handling for existing party
                  if (editingPartyId) {
                    const oldParty = partiesList.find(p => p.id === editingPartyId || p === editingPartyId);
                    const wasDriver = oldParty && (Array.isArray(oldParty.party_roles) ? oldParty.party_roles : [oldParty.party_role]).includes('Driver');
                    if (wasDriver && !isDriver) {
                      setVehiclesList(prev => prev.map(v => v.driver_party_id === editingPartyId ? { ...v, driver_party_id: null } : v));
                      toast('Driver role removed — vehicle assignment cleared while preserving driver profile history.', 'info');
                    }
                  }

                  let driverProfile = null;
                  if (isDriver) {
                    driverProfile = {
                      license_number: (tempParty.license_number || '').trim().toUpperCase(),
                      license_state: tempParty.license_state || '',
                      license_class: tempParty.license_class || '',
                      license_expiry: tempParty.license_expiry || '',
                      employer: (tempParty.employer || '').trim(),
                      years_experience: tempParty.years_experience || '',
                      is_commercial_driver: Boolean(tempParty.is_commercial_driver),
                      cdl_number: (tempParty.cdl_number || '').trim().toUpperCase(),
                      assigned_vehicle_id: tempParty.assigned_vehicle_id || null,
                      seatbelt_used: tempParty.seatbelt_used || 'Unknown',
                      alcohol_test: tempParty.alcohol_test || 'Not Tested',
                      drug_test: tempParty.drug_test || 'Not Tested',
                      citation_issued: Boolean(tempParty.citation_issued),
                      citation_number: (tempParty.citation_number || '').trim(),
                      injury_status: tempParty.injury_status || 'Uninjured',
                      hospital: (tempParty.hospital || '').trim(),
                      medical_notes: (tempParty.medical_notes || '').trim()
                    };
                  }

                  let passengerProfile = null;
                  if (isPassenger) {
                    passengerProfile = {
                      seat_position: tempParty.seat_position || 'Front Right',
                      seatbelt_used: tempParty.seatbelt_used || 'Unknown',
                      airbag_deployed: tempParty.airbag_deployed || 'Unknown',
                      injury_status: tempParty.injury_status || 'None',
                      transported_by: tempParty.transported_by || 'Unknown',
                      hospital: (tempParty.hospital || '').trim(),
                      hospital_address: (tempParty.hospital_address || '').trim(),
                      medical_notes: (tempParty.medical_notes || '').trim(),
                      claim_number: (tempParty.claim_number || '').trim(),
                      insurance_company: (tempParty.insurance_company || '').trim(),
                      policy_number: (tempParty.policy_number || '').trim(),
                      emergency_contact_name: (tempParty.emergency_contact_name || '').trim(),
                      emergency_contact_phone: (tempParty.emergency_contact_phone || '').trim(),
                      relationship: (tempParty.relationship || '').trim(),
                      passenger_notes: (tempParty.passenger_notes || '').trim(),
                      assigned_vehicle_id: tempParty.assigned_vehicle_id || null,
                      assigned_driver_party_id: tempParty.assigned_driver_party_id || null
                    };
                  }

                  // SINGLE SOURCE OF TRUTH: role_data.Driver & role_data.Passenger
                  const cleanParty = {
                    ...tempParty,
                    id: partyId,
                    full_name: targetName,
                    company_name: tempParty.party_type === 'Organization' ? targetName : (tempParty.company_name || ''),
                    email: (tempParty.email || '').trim(),
                    phone: (tempParty.phone || '').trim(),
                    address: (tempParty.address || '').trim(),
                    contact_person: (tempParty.contact_person || '').trim(),
                    website: (tempParty.website || '').trim(),
                    notes: (tempParty.notes || '').trim(),
                    role_data: {
                      ...(tempParty.role_data || {}),
                      ...(isDriver ? { Driver: driverProfile } : {}),
                      ...(isPassenger ? { Passenger: passengerProfile } : {})
                    },
                    driver_profile: isDriver ? driverProfile : (tempParty.driver_profile || tempParty.role_data?.Driver || null),
                    passenger_profile: isPassenger ? passengerProfile : (tempParty.passenger_profile || tempParty.role_data?.Passenger || null)
                  };

                  // Vehicle driver assignment synchronization
                  if (isDriver && driverProfile?.assigned_vehicle_id) {
                    const targetVehId = driverProfile.assigned_vehicle_id;
                    setVehiclesList(prevVehs => prevVehs.map(v => {
                      const vid = v.vehicle_id || v.id;
                      if (vid === targetVehId) {
                        return { ...v, driver_party_id: partyId };
                      }
                      if (v.driver_party_id === partyId && vid !== targetVehId) {
                        return { ...v, driver_party_id: null };
                      }
                      return v;
                    }));
                  }

                  // Vehicle passenger list synchronization
                  if (isPassenger && passengerProfile?.assigned_vehicle_id) {
                    const targetVehId = passengerProfile.assigned_vehicle_id;
                    setVehiclesList(prevVehs => prevVehs.map(v => {
                      const vid = v.vehicle_id || v.id;
                      let passList = Array.isArray(v.passenger_party_ids) ? [...v.passenger_party_ids] : [];
                      if (vid === targetVehId) {
                        if (!passList.includes(partyId)) passList.push(partyId);
                      } else {
                        passList = passList.filter(id => id !== partyId);
                      }
                      return { ...v, passenger_party_ids: passList };
                    }));
                  }

                  if (editingPartyId) {
                    setPartiesList(prev => prev.map(p => (p.id === editingPartyId || p === editingPartyId ? cleanParty : p)));
                    toast('Party updated successfully!', 'success');
                  } else {
                    setPartiesList(prev => [...prev, cleanParty]);
                    toast('Party added to matter!', 'success');
                  }

                  setTempParty({
                    full_name: '', company_name: '', contact_person: '', website: '', email: '', phone: '',
                    party_role: 'Witness', party_roles: ['Witness'], primary_party_role: 'Witness', secondary_party_roles: [],
                    party_type: 'Person', address: '', date_of_birth: '', government_id: '', country_of_birth: '',
                    relief_sought: '', insurance_number: '', notes: '',
                    license_number: '', license_state: '', license_class: '', license_expiry: '', employer: '',
                    years_experience: '', is_commercial_driver: false, cdl_number: '', assigned_vehicle_id: '',
                    seatbelt_used: 'Unknown', alcohol_test: 'Not Tested', drug_test: 'Not Tested',
                    citation_issued: false, citation_number: '', injury_status: 'Uninjured', hospital: '', medical_notes: ''
                  });
                  setShowPartyModal(false);
                  setEditingPartyId(null);
                }}
                className="flex-1 btn btn-primary text-xs"
              >
                {editingPartyId
                  ? (isAdaptiveModule ? `Update ${adaptiveConfig.title}` : 'Update Party')
                  : (isAdaptiveModule ? adaptiveConfig.saveLabel : 'Add Party to Matter')
                }
              </button>
            </div>
          </div>
        </div>,
        document.body
        );
      })()}

      {/* Dynamic Reusable Vehicle Creation Modal Popup */}
      {showVehicleModal && (() => {
        const VTYPES = ['Car','SUV','Truck','Motorcycle','Van','Bus','Commercial Vehicle','Trailer','Bicycle','Scooter','Other'];
        const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
        const driverParties = partiesList.filter(p => (p.party_roles || [p.party_role]).some(r => r === 'Driver') && !p.is_retaining_client);
        const allParties = partiesList.filter(p => !p.is_retaining_client);
        const isEditing = !!editingVehicleId;

        const resetVehicle = () => setTempVehicle({
          vehicle_type: 'Car', make: '', model: '', year: new Date().getFullYear().toString(),
          color: '', vin: '', license_plate: '', license_state: '', registration_number: '',
          insurance_company: '', policy_number: '', claim_number: '', owner_party_id: '',
          driver_party_id: '', insurance_party_id: '', damage_description: '', tow_information: '',
          storage_location: '', repair_shop: '', status: 'active', notes: '',
        });

        const handleSave = () => {
          if (!tempVehicle.make.trim()) { toast('Vehicle Make is required.', 'error'); return; }
          if (!tempVehicle.model.trim()) { toast('Vehicle Model is required.', 'error'); return; }

          // VIN duplicate check
          if (tempVehicle.vin && tempVehicle.vin.trim()) {
            const dupVin = vehiclesList.find(v => {
              if (isEditing && (v.vehicle_id || v.id) === editingVehicleId) return false;
              return v.vin && v.vin.trim().toUpperCase() === tempVehicle.vin.trim().toUpperCase();
            });
            if (dupVin) { toast(`Duplicate VIN: "${tempVehicle.vin}" is already used by ${dupVin.year} ${dupVin.make} ${dupVin.model}.`, 'error'); return; }
          }

          if (isEditing) {
            setVehiclesList(prev => prev.map(v =>
              (v.vehicle_id || v.id) === editingVehicleId
                ? { ...v, ...tempVehicle, vehicle_id: editingVehicleId, updated_at: new Date().toISOString() }
                : v
            ));
            toast('Vehicle updated!', 'success');
          } else {
            setVehiclesList(prev => [...prev, { ...tempVehicle, vehicle_id: `veh_${Date.now()}`, created_at: new Date().toISOString(), passengers: [] }]);
            toast('Vehicle added to matter!', 'success');
          }

          resetVehicle();
          setEditingVehicleId(null);
          setShowVehicleModal(false);
        };

        const lbl = 'text-[10px] font-bold text-[#8a94a6] uppercase tracking-widest block mb-1';
        const inp = 'w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38bdf8] transition-colors';
        const sel = inp;

        return createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => { resetVehicle(); setEditingVehicleId(null); setShowVehicleModal(false); }}>
            <div className="bg-[#1a2233] border border-white/10 rounded-[2rem] p-0 w-full max-w-2xl shadow-2xl flex flex-col text-white max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚘</span>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>{isEditing ? 'Edit Vehicle Record' : 'Add Vehicle to Matter'}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Manage matter vehicle specs, license, insurance & driver links.</p>
                  </div>
                </div>
                <button type="button" onClick={() => { resetVehicle(); setEditingVehicleId(null); setShowVehicleModal(false); }} className="text-slate-400 hover:text-white font-bold text-lg px-2">✕</button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">

                {/* Section 1: Vehicle Core Specs */}
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest flex items-center gap-2">
                    <span>🚗 Core Vehicle Info</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={lbl}>Vehicle Type</label>
                      <select value={tempVehicle.vehicle_type} onChange={e => setTempVehicle(v => ({ ...v, vehicle_type: e.target.value }))} className={sel}>
                        {VTYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Make *</label>
                      <input type="text" value={tempVehicle.make} onChange={e => setTempVehicle(v => ({ ...v, make: e.target.value }))} placeholder="Toyota, Ford, etc." className={inp} required />
                    </div>
                    <div>
                      <label className={lbl}>Model *</label>
                      <input type="text" value={tempVehicle.model} onChange={e => setTempVehicle(v => ({ ...v, model: e.target.value }))} placeholder="Camry, F-150, etc." className={inp} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={lbl}>Year</label>
                      <input type="text" value={tempVehicle.year} onChange={e => setTempVehicle(v => ({ ...v, year: e.target.value }))} placeholder="2022" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Color</label>
                      <input type="text" value={tempVehicle.color} onChange={e => setTempVehicle(v => ({ ...v, color: e.target.value }))} placeholder="Black, Silver..." className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Status</label>
                      <select value={tempVehicle.status} onChange={e => setTempVehicle(v => ({ ...v, status: e.target.value }))} className={sel}>
                        <option value="active">Active</option>
                        <option value="totaled">Totaled</option>
                        <option value="repaired">Repaired</option>
                        <option value="impounded">Impounded</option>
                        <option value="sold">Sold/Transferred</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Identification & License */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest flex items-center gap-2">
                    <span>🔑 VIN & Registration</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>VIN (17-Character Serial)</label>
                      <input type="text" maxLength={17} value={tempVehicle.vin} onChange={e => setTempVehicle(v => ({ ...v, vin: e.target.value.toUpperCase() }))} placeholder="1HGCR2F83HA000000" className={`${inp} uppercase tracking-wider font-mono`} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={lbl}>License Plate</label>
                        <input type="text" value={tempVehicle.license_plate} onChange={e => setTempVehicle(v => ({ ...v, license_plate: e.target.value.toUpperCase() }))} placeholder="7ABC123" className={`${inp} uppercase font-mono`} />
                      </div>
                      <div>
                        <label className={lbl}>State</label>
                        <select value={tempVehicle.license_state} onChange={e => setTempVehicle(v => ({ ...v, license_state: e.target.value }))} className={sel}>
                          <option value="">State</option>
                          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Party Linkings (Owner & Driver) */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest flex items-center gap-2">
                    <span>👤 Linked Parties (Owner & Driver)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Vehicle Owner (Party)</label>
                      <select value={tempVehicle.owner_party_id} onChange={e => setTempVehicle(v => ({ ...v, owner_party_id: e.target.value }))} className={sel}>
                        <option value="">Unassigned / Unknown</option>
                        {allParties.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name} ({p.party_roles ? p.party_roles.join(', ') : p.party_role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Primary Driver (Party)</label>
                      <select value={tempVehicle.driver_party_id} onChange={e => setTempVehicle(v => ({ ...v, driver_party_id: e.target.value }))} className={sel}>
                        <option value="">Unassigned / Unknown</option>
                        {allParties.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name} ({p.party_roles ? p.party_roles.join(', ') : p.party_role})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 4: Insurance Details */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest flex items-center gap-2">
                    <span>🛡️ Vehicle Insurance Coverage</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={lbl}>Insurance Carrier</label>
                      <input type="text" value={tempVehicle.insurance_company} onChange={e => setTempVehicle(v => ({ ...v, insurance_company: e.target.value }))} placeholder="Geico, State Farm..." className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Policy Number</label>
                      <input type="text" value={tempVehicle.policy_number} onChange={e => setTempVehicle(v => ({ ...v, policy_number: e.target.value }))} placeholder="POL-99481" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Claim Number</label>
                      <input type="text" value={tempVehicle.claim_number} onChange={e => setTempVehicle(v => ({ ...v, claim_number: e.target.value }))} placeholder="CLM-789012" className={`${inp} font-mono`} />
                    </div>
                  </div>

                  {/* Insurance Party Link */}
                  {allParties.some(p => (p.party_roles || [p.party_role]).some(r => ['Insurance Company', 'Insurance Adjuster'].includes(r))) && (
                    <div>
                      <label className={lbl}>Link Insurance Party</label>
                      <select value={tempVehicle.insurance_party_id} onChange={e => setTempVehicle(v => ({ ...v, insurance_party_id: e.target.value }))} className={sel}>
                        <option value="">None (manual entry above)</option>
                        {allParties.filter(p => (p.party_roles || [p.party_role]).some(r => ['Insurance Company', 'Insurance Adjuster'].includes(r))).map(p => (
                          <option key={p.id || p.company_name} value={p.id}>{p.full_name || p.company_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>



                {/* Section 5: Damage & Logistics */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-widest border-b border-white/10 pb-1">⚠️ Damage & Logistics</h4>
                  <div>
                    <label className={lbl}>Damage Description</label>
                    <textarea rows={2} value={tempVehicle.damage_description} onChange={e => setTempVehicle(v => ({ ...v, damage_description: e.target.value }))} placeholder="Front bumper impact, passenger airbag deployed, frame damage..." className={inp} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className={lbl}>Tow Info</label>
                      <input type="text" value={tempVehicle.tow_information} onChange={e => setTempVehicle(v => ({ ...v, tow_information: e.target.value }))} placeholder="ABC Tow 555-1234" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Storage Location</label>
                      <input type="text" value={tempVehicle.storage_location} onChange={e => setTempVehicle(v => ({ ...v, storage_location: e.target.value }))} placeholder="City Auto Storage" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Repair Shop</label>
                      <input type="text" value={tempVehicle.repair_shop} onChange={e => setTempVehicle(v => ({ ...v, repair_shop: e.target.value }))} placeholder="Main St Auto" className={inp} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Additional Notes</label>
                    <textarea rows={2} value={tempVehicle.notes} onChange={e => setTempVehicle(v => ({ ...v, notes: e.target.value }))} placeholder="Any other relevant vehicle details..." className={inp} />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3 px-6 py-4 border-t border-white/10 shrink-0 bg-[#1a2233]">
                <button type="button" onClick={() => { resetVehicle(); setEditingVehicleId(null); setShowVehicleModal(false); }} className="flex-1 btn btn-secondary text-xs py-2.5 rounded-xl font-bold">Cancel</button>
                <button type="button" onClick={handleSave} className="flex-1 btn btn-primary text-xs py-2.5 rounded-xl font-bold shadow-lg shadow-[#0057c7]/30">
                  {isEditing ? '✓ Update Vehicle' : '+ Save Vehicle Record'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ─── Dynamic Custom Module Modal ────────────────────────────────── */}
      {showCustomModuleModal && activeCustomModule && (() => {
        const mod = activeCustomModule;
        const fields = mod.fields || [];
        const isEditing = !!editingCustomModuleRecordId;

        const handleClose = () => {
          setShowCustomModuleModal(false);
          setActiveCustomModule(null);
          setCustomModuleFormData({});
          setEditingCustomModuleRecordId(null);
        };

        const handleSaveCustomRecord = () => {
          // Validate required fields
          for (const field of fields) {
            if (field.is_required) {
              const val = customModuleFormData[field.field_key];
              if (!val || (typeof val === 'string' && !val.trim())) {
                toast(`${field.field_label} is required.`, 'error');
                return;
              }
            }
          }

          if (isEditing) {
            setCustomModuleRecords(prev => ({
              ...prev,
              [mod.key]: (prev[mod.key] || []).map(r =>
                r.id === editingCustomModuleRecordId
                  ? { ...r, ...customModuleFormData, updated_at: new Date().toISOString() }
                  : r
              )
            }));
            toast(`${mod.title} record updated!`, 'success');
          } else {
            const newRecord = {
              ...customModuleFormData,
              id: `cm_${mod.key}_${Date.now()}`,
              created_at: new Date().toISOString()
            };
            setCustomModuleRecords(prev => ({
              ...prev,
              [mod.key]: [...(prev[mod.key] || []), newRecord]
            }));
            toast(`${mod.title} record added!`, 'success');
          }
          handleClose();
        };

        const lbl = 'text-[10px] font-bold text-[#8a94a6] uppercase tracking-widest block mb-1';
        const inp = 'w-full bg-[#05080f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-400 transition-colors';

        return createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={handleClose}>
            <div className="bg-[#1a2233] border border-white/10 rounded-[2rem] p-0 w-full max-w-2xl shadow-2xl flex flex-col text-white max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{mod.icon || '🧩'}</span>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>{isEditing ? `Edit ${mod.title} Record` : `Add ${mod.title} Record`}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{mod.description || `Custom records for ${mod.title}`}</p>
                  </div>
                </div>
                <button type="button" onClick={handleClose} className="text-slate-400 hover:text-white font-bold text-lg px-2">✕</button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                {fields.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No custom fields defined for this module.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {fields.map(field => {
                        const val = customModuleFormData[field.field_key] ?? field.default_value ?? '';
                        if (field.field_type === 'textarea') {
                          return (
                            <div key={field.id} className="sm:col-span-2">
                              <label className={lbl}>{field.field_label} {field.is_required && '*'}</label>
                              <textarea
                                rows={3}
                                value={val}
                                onChange={e => setCustomModuleFormData(prev => ({ ...prev, [field.field_key]: e.target.value }))}
                                placeholder={field.placeholder || ''}
                                className={inp}
                              />
                            </div>
                          );
                        }
                        if (field.field_type === 'select') {
                          const opts = field.options || [];
                          return (
                            <div key={field.id}>
                              <label className={lbl}>{field.field_label} {field.is_required && '*'}</label>
                              <select
                                value={val}
                                onChange={e => setCustomModuleFormData(prev => ({ ...prev, [field.field_key]: e.target.value }))}
                                className={inp}
                              >
                                <option value="">-- Select --</option>
                                {opts.map(o => (
                                  <option key={o} value={o}>{o}</option>
                                ))}
                              </select>
                            </div>
                          );
                        }

                        if (field.field_type === 'checkbox') {
                          return (
                            <div key={fIdx} className="flex items-center gap-2 pt-5">
                              <input
                                type="checkbox"
                                checked={Boolean(val)}
                                onChange={e => setCustomModuleFormData(prev => ({ ...prev, [field.field_key]: e.target.checked }))}
                                className="rounded bg-white/10 border-white/20 text-purple-500"
                              />
                              <label className="text-xs text-white font-bold">{field.field_label}</label>
                            </div>
                          );
                        }

                        return (
                          <div key={fIdx}>
                            <label className={lbl}>{field.field_label}{field.is_required ? ' *' : ''}</label>
                            <input
                              type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                              value={val}
                              onChange={e => setCustomModuleFormData(prev => ({ ...prev, [field.field_key]: e.target.value }))}
                              placeholder={field.placeholder || ''}
                              className={inp}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-white/10 shrink-0 bg-[#1a2233]">
                <button type="button" onClick={handleClose} className="flex-1 btn btn-secondary text-xs py-2.5 rounded-xl font-bold">Cancel</button>
                <button type="button" onClick={handleSaveCustomRecord} className="flex-1 btn btn-primary text-xs py-2.5 rounded-xl font-bold shadow-lg shadow-purple-600/30" style={{ background: '#7c3aed' }}>
                  {isEditing ? `✓ Update ${mod.title}` : `+ Save ${mod.title} Record`}
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Custom Delete Event Confirmation Modal */}
      {showDeleteEventConfirm && createPortal(
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 w-full max-w-[400px] shadow-2xl flex flex-col gap-4 text-center text-white">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-[16px] font-800">Delete Event?</h3>
            <p className="text-[13px] text-slate-400 leading-relaxed">
              Are you sure you want to delete this event? This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteEventConfirm(false);
                  setEventToDelete(null);
                }}
                className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-[12px] font-bold text-white/80 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (eventToDelete) {
                    try {
                      await api.calendar.remove(eventToDelete);
                      toast('Calendar Event deleted successfully.', 'success');
                      onClose();
                      window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
                    } catch (e) {
                      toast(e.message || 'Delete failed', 'error');
                    }
                  }
                  setShowDeleteEventConfirm(false);
                  setEventToDelete(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-[12px] font-bold text-white transition-all active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Module Record Delete Confirmation Modal */}
      {deleteCustomModuleConfirm && createPortal(
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#121826] border border-white/10 rounded-3xl p-6 w-full max-w-[400px] shadow-2xl flex flex-col gap-4 text-center text-white">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-[16px] font-800">Delete {deleteCustomModuleConfirm.title} Record?</h3>
            <p className="text-[13px] text-slate-400 leading-relaxed">
              Are you sure you want to remove this {deleteCustomModuleConfirm.title.toLowerCase()} record? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setDeleteCustomModuleConfirm(null)}
                className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-[12px] font-bold text-white/80 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const { moduleKey, recordId } = deleteCustomModuleConfirm;
                  setCustomModuleRecords(prev => ({
                    ...prev,
                    [moduleKey]: (prev[moduleKey] || []).filter(r => r.id !== recordId)
                  }));
                  toast(`${deleteCustomModuleConfirm.title} record deleted.`, 'success');
                  setDeleteCustomModuleConfirm(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-[12px] font-bold text-white transition-all active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────
//  APP LAYOUT (Sidebar + Topbar + Outlet)
// ─────────────────────────────────────────────────────────
function AppLayout({ role, user, onLogout, onSwitchRole, toast, modal, setModal, modalLookups }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [sidebarBadges, setSidebarBadges] = useState({});
  const routerNavigate = useNavigate();

  // Outlook Composer States
  const [outlookComposerOpen, setOutlookComposerOpen] = useState(false);
  const [outlookComposerData, setOutlookComposerData] = useState(null);
  const [outlookComposerOnSave, setOutlookComposerOnSave] = useState(null);

  // Email Compose States
  const [emailComposeOpen, setEmailComposeOpen] = useState(false);
  const [emailComposeData, setEmailComposeData] = useState(null);
  const [emailComposeOnSave, setEmailComposeOnSave] = useState(null);

  const customOpenModal = (type, data = null, onSave = null) => {
    if (type === 'add-event') {
      setOutlookComposerData(data);
      setOutlookComposerOnSave(() => onSave);
      setOutlookComposerOpen(true);
      return;
    }
    if (type === 'compose-email') {
      setEmailComposeData(data);
      setEmailComposeOnSave(() => onSave);
      setEmailComposeOpen(true);
      return;
    }
    setModal({ type, data, onSave });
  };

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!user?.id || !role) {
      setSidebarBadges({});
      return undefined;
    }
    let cancelled = false;
    const loadBadges = async () => {
      const r = String(role).toLowerCase();
      try {
        if (r === 'admin') {
          const [lr, mr, cr] = await Promise.all([
            api.leads.list({ limit: 500 }),
            api.matters.list({ limit: 500 }),
            api.communications.list({ limit: 500 }),
          ]);
          if (cancelled) return;
          const leads = Array.isArray(lr?.data) ? lr.data : [];
          const matters = Array.isArray(mr?.data) ? mr.data : [];
          const comms = Array.isArray(cr?.data) ? cr.data : [];
          setSidebarBadges({
            leads: leads.filter((l) => l.status === 'new').length,
            cases: matters.filter((m) => m.status !== 'completed').length,
            email: comms.filter((c) => c.sender_user_id !== user.id && c.sender_role === 'client' && !c.is_read).length,
          });
        } else if (r === 'lawyer') {
          const [mr, cr] = await Promise.all([
            api.matters.list({ limit: 500 }),
            api.communications.list({ limit: 500 }),
          ]);
          if (cancelled) return;
          const matters = Array.isArray(mr?.data) ? mr.data : [];
          const comms = Array.isArray(cr?.data) ? cr.data : [];
          setSidebarBadges({
            'l-cases': matters.filter((m) => m.status !== 'completed').length,
            email: comms.filter((c) => c.sender_user_id !== user.id && c.sender_role === 'client' && !c.is_read).length,
          });
        } else if (r === 'client') {
          const [ir, cr] = await Promise.all([
            api.billing.listInvoices({ limit: 500 }),
            api.communications.list({ limit: 500 }),
          ]);
          if (cancelled) return;
          const invoices = Array.isArray(ir?.data) ? ir.data : [];
          const comms = Array.isArray(cr?.data) ? cr.data : [];
          setSidebarBadges({
            'c-billing': invoices.filter((i) => i.status !== 'paid' && i.status !== 'void').length,
            'c-messages': comms.filter((c) => c.sender_user_id !== user.id && c.sender_role !== 'client' && c.sender_role !== 'system' && !c.is_read).length,
          });
        } else {
          setSidebarBadges({});
        }
      } catch {
        if (!cancelled) setSidebarBadges({});
      }
    };
    loadBadges();
    const onRefresh = () => loadBadges();
    window.addEventListener('vktori:entities-changed', onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener('vktori:entities-changed', onRefresh);
    };
  }, [user?.id, role]);

  const navigate = (path) => {
    routerNavigate(path);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#111520] overflow-hidden selection:bg-[#0057c7] selection:text-white">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} role={role} user={user} onToggle={() => setSidebarOpen(o => !o)} onLogout={onLogout}
        badges={sidebarBadges}
        onItemClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Topbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(o => !o)}
          role={role} user={user} onLogout={onLogout} onSwitchRole={onSwitchRole} toast={toast} navigate={navigate} />

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#111520]">
          <div className="w-full px-0 sm:px-6 lg:px-10 py-4 lg:py-8">
            <Outlet context={{ role, user, navigate, toast, openModal: customOpenModal }} />
          </div>
        </main>
      </div>

      {modal && (
        <AppModal
          type={modal.type || modal}
          data={modal.data}
          onSave={modal.onSave}
          onClose={() => setModal(null)}
          toast={toast}
          navigate={navigate}
          role={role}
          user={user}
          lookups={modalLookups}
          openModal={customOpenModal}
        />
      )}

      <OutlookEventComposer 
        isOpen={outlookComposerOpen} 
        eventData={outlookComposerData}
        onClose={() => { setOutlookComposerOpen(false); setOutlookComposerData(null); }}
        onSave={() => {
          if (outlookComposerOnSave) {
            try { outlookComposerOnSave(); } catch (e) { console.error(e); }
          }
          window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
        }}
        toast={toast}
        lookups={modalLookups}
      />

      <EmailComposeModal
        isOpen={emailComposeOpen}
        onClose={() => { setEmailComposeOpen(false); setEmailComposeData(null); }}
        onSave={() => {
          if (emailComposeOnSave) {
            emailComposeOnSave();
          } else {
            window.dispatchEvent(new CustomEvent('vktori:entities-changed'));
          }
        }}
        data={emailComposeData}
        user={user}
        lookups={modalLookups}
        toast={toast}
      />

      <VyniusAI role={role} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  PAGE WRAPPERS (read context from Outlet)
// ─────────────────────────────────────────────────────────
import { useOutletContext } from 'react-router-dom';

function AdminDashboardPage() { const ctx = useOutletContext(); return <AdminDashboard   {...ctx} />; }
function LeadsPage() { const ctx = useOutletContext(); return <LeadDashboard     {...ctx} />; }
function LeadDetailWrapper() { const ctx = useOutletContext(); const { id } = useParams(); return <LeadDetailPage {...ctx} leadId={id} />; }
function ConflictPage() { const ctx = useOutletContext(); return <ConflictCheckPage {...ctx} />; }
function AdminClientsPage() { const ctx = useOutletContext(); return <ClientsPage       {...ctx} />; }
function AdminContactsPage() { const ctx = useOutletContext(); return <ContactsPage      {...ctx} />; }
function AdminClientDetailPage() { const ctx = useOutletContext(); const { id } = useParams(); return <ClientDetailPage  {...ctx} clientId={id || "C001"} />; }
function AdminMattersPage() { const ctx = useOutletContext(); return <CasesPage         {...ctx} />; }
function AdminMatterDetailPage() { const ctx = useOutletContext(); const { id } = useParams(); return <CaseDetailPage    {...ctx} caseId={id || "CASE-2045"} />; }
function AdminCalendarPage() { const ctx = useOutletContext(); return <CalendarPage      {...ctx} role="admin" />; }
function AdminDocumentsPage() { const ctx = useOutletContext(); return <DocumentsPage     {...ctx} />; }
function AdminBillingPage() { const ctx = useOutletContext(); return <BillingPage       {...ctx} />; }
function AdminEmailPage() { const ctx = useOutletContext(); return <EmailPage         {...ctx} />; }
function AdminAIPage() { const ctx = useOutletContext(); return <AIPage            {...ctx} />; }
function AdminMarketingPage() { const ctx = useOutletContext(); return <MarketingDashboard {...ctx} />; }
function AdminReportsPage() { const ctx = useOutletContext(); return <ReportsDashboard  {...ctx} />; }
function AdminUsersPage() { const ctx = useOutletContext(); return <UsersPage         {...ctx} />; }
function AdminIntegrationsPage() { const ctx = useOutletContext(); return <IntegrationsPage  {...ctx} />; }
function AdminSettingsPage() { const ctx = useOutletContext(); return <SettingsPage      {...ctx} />; }
function AdminCourtFormsPage() { const ctx = useOutletContext(); return <CourtFormsPage {...ctx} role="admin" />; }

function LawyerDashboardPage() { const ctx = useOutletContext(); return <LawyerDashboard  {...ctx} />; }
function LawyerClientsWrapper() { const ctx = useOutletContext(); return <LawyerClientsPage {...ctx} />; }
function LawyerClientDetailWrapper() { const ctx = useOutletContext(); const { id } = useParams(); return <ClientDetailPage  {...ctx} clientId={id} />; }
function LawyerMattersPage() { const ctx = useOutletContext(); return <LawyerCasesPage   {...ctx} />; }
function LawyerMatterDetailWrapper() { const ctx = useOutletContext(); const { id } = useParams(); return <CaseDetailPage    {...ctx} caseId={id} />; }
function LawyerCalendarPage() { const ctx = useOutletContext(); return <CalendarPage      {...ctx} role="lawyer" />; }
function LawyerDocumentsPage() { const ctx = useOutletContext(); return <DocumentsPage     {...ctx} />; }
function LawyerBillingPage() { const ctx = useOutletContext(); return <BillingPage       {...ctx} />; }
function LawyerEmailPage() { const ctx = useOutletContext(); return <EmailPage         {...ctx} />; }
function LawyerAIPage() { const ctx = useOutletContext(); return <AIPage            {...ctx} />; }
function LawyerIntegrationsPage() { const ctx = useOutletContext(); return <IntegrationsPage  {...ctx} />; }
function LawyerSettingsPage() { const ctx = useOutletContext(); return <LawyerProfilePage {...ctx} />; }
function LawyerProfileWrapper() { const ctx = useOutletContext(); return <LawyerProfilePage {...ctx} />; }
function LawyerCourtFormsPage() { const ctx = useOutletContext(); return <CourtFormsPage {...ctx} role="lawyer" />; }

function ClientDashboardPage() { const ctx = useOutletContext(); return <ClientDashboard      {...ctx} />; }
function ClientMattersPage() { const ctx = useOutletContext(); return <ClientCasesPage       {...ctx} />; }
function ClientMatterDetailWrapper() { const ctx = useOutletContext(); const { id } = useParams(); return <ClientMatterDetailPage {...ctx} matterId={id} />; }
function ClientDocsPage() { const ctx = useOutletContext(); return <ClientDocumentsPage   {...ctx} />; }
function ClientBillingWrapper() { const ctx = useOutletContext(); return <ClientBillingPage     {...ctx} />; }
function ClientMessagesWrapper() { const ctx = useOutletContext(); return <ClientMessagesPage    {...ctx} />; }
function ClientProfileWrapper() { const ctx = useOutletContext(); return <ClientProfilePage     {...ctx} />; }

import WebsiteLayout from './website/WebsiteLayout.jsx';
import { HomePage, ClientPortalLandingPage } from './website/pages/WebsitePages.jsx';

// ─────────────────────────────────────────────────────────
//  ROOT APP
// ─────────────────────────────────────────────────────────
const HOME_ROUTE = { admin: '/admin/dashboard', lawyer: '/lawyer/dashboard', client: '/client/dashboard' };

const billFormatUsd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

function TrustLedgerView({ accountId, formatUsd }) {
  
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    if (!accountId) return;
    api.billing.getTrustTransactions(accountId)
      .then(res => setTxs(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#0057c7] border-t-transparent rounded-full animate-spin" />
        <p className="text-[12px] text-[#8a94a6] font-900 uppercase tracking-widest opacity-60">Syncing Trust Assets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-white/[0.03] border-b border-white/5">
            <tr>
              <th className="px-6 py-4 text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] opacity-60">Execution Date</th>
              <th className="px-6 py-4 text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] opacity-60">Transaction Type</th>
              <th className="px-6 py-4 text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] opacity-60">Matter reference</th>
              <th className="px-6 py-4 text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] opacity-60">Verification ref</th>
              <th className="px-6 py-4 text-[10px] font-900 text-[#8a94a6] uppercase tracking-[0.2em] opacity-60 text-right">Valuation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {txs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-24 text-center text-[#8a94a6] text-[13px] font-500 italic opacity-40">
                  No verified trust transactions synchronized.
                </td>
              </tr>
            ) : (
              txs.map(tx => {
                const isDeposit = tx.transaction_type === 'deposit';
                return (
                  <tr key={tx.id} className="hover:bg-white/[0.03] transition-all group">
                    <td className="px-6 py-5 text-[13px] text-[#8a94a6] font-800 tracking-tighter whitespace-nowrap opacity-60 group-hover:opacity-100">{formatPSTDate(tx.created_at)}</td>
                    <td className="px-6 py-5">
                      <div className={`inline-flex px-3 py-1 rounded-lg border text-[10px] font-900 uppercase tracking-widest ${isDeposit ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-[#0057c7]/10 text-[#38bdf8] border-[#0057c7]/20'}`}>
                        {tx.transaction_type.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[13px] font-900 text-white tracking-tighter">{tx.matter?.matter_number || '—'}</p>
                      <p className="text-[10px] text-[#8a94a6] font-800 uppercase tracking-widest opacity-40">System Reference</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[12px] text-[#8a94a6] font-700 max-w-[200px] truncate opacity-40 group-hover:opacity-100 transition-opacity">{tx.reference || tx.notes || '—'}</p>
                    </td>
                    <td className={`px-6 py-5 text-right font-900 text-[16px] tracking-tighter ${isDeposit ? 'text-emerald-400' : 'text-white'}`}>
                      {isDeposit ? '+' : '-'}{formatUsd(tx.amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Institutional Note */}
      <div className="px-6 py-4 rounded-2xl bg-[#0057c7]/5 border border-[#0057c7]/10 flex items-center gap-3">
        <svg className="w-5 h-5 text-[#38bdf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="text-[11px] text-[#38bdf8] font-700 uppercase tracking-widest opacity-80">This ledger represents verified trust account movements and is immutable upon reconciliation.</p>
      </div>

      <DuplicateContactModal
        isOpen={showDuplicateModal}
        duplicateData={duplicateData}
        onUseExisting={handleUseExistingContact}
        onCancel={() => {
          setShowDuplicateModal(false);
          setDuplicateData(null);
        }}
      />
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [modal, setModal] = useState(null);
  const [modalLookups, setModalLookups] = useState({ clients: [], matters: [], lawyers: [], users: [], folders: [], activities: [] });
  const { toasts, toast } = useToast();
  const routerNavigate = useNavigate();
  const location = useLocation();

  const refreshModalLookups = useCallback(async () => {
    if (!isLoggedIn || !user) return;
    try {
      const [clRes, mtRes, usRes, flRes, invRes, actRes] = await Promise.all([
        api.clients.list({ limit: 500 }),
        api.matters.list({ limit: 500 }),
        (role === 'admin' || role === 'lawyer') ? api.users.list() : Promise.resolve({ data: [] }),
        api.folders.list(),
        api.billing.listInvoices({ limit: 500 }),
        api.activities.list({ limit: 500 })
      ]);
      const clients = Array.isArray(clRes?.data) ? clRes.data : [];
      const matters = Array.isArray(mtRes?.data) ? mtRes.data : [];
      const users = Array.isArray(usRes?.data) ? usRes.data : [];
      const folders = Array.isArray(flRes?.data) ? flRes.data : [];
      const invoices = Array.isArray(invRes?.data) ? invRes.data : [];
      const activities = Array.isArray(actRes?.data) ? actRes.data : Array.isArray(actRes) ? actRes : [];
      const lawyers = (role === 'admin' || role === 'lawyer')
        ? users.filter((u) => u.roles?.includes('lawyer') || u.role === 'lawyer')
        : [];
      setModalLookups({ clients, matters, lawyers, users, folders, invoices, activities });
    } catch (e) {
      console.error(e);
    }
  }, [isLoggedIn, user, role]);

  useEffect(() => {
    refreshModalLookups();
  }, [refreshModalLookups]);

  useEffect(() => {
    if (!isLoggedIn) return;
    window.addEventListener('vktori:entities-changed', refreshModalLookups);

    // Global modal opener for cross-component triggers
    const openHandler = (e) => {
      const { type, data, onSave } = e.detail || {};
      if (type) setModal({ type, data, onSave });
    };
    window.addEventListener('vktori:open-modal', openHandler);

    return () => {
      window.removeEventListener('vktori:entities-changed', refreshModalLookups);
      window.removeEventListener('vktori:open-modal', openHandler);
    };
  }, [isLoggedIn, refreshModalLookups]);

  // Session verification on mount
  useEffect(() => {
    const initSession = async () => {
      const token = localStorage.getItem('vktori_token');
      if (!token) {
        setIsLoggedIn(false);
        setUser(null);
        setRole(null);
        localStorage.removeItem('vktori_token');
        localStorage.removeItem('vktori_user');
        localStorage.removeItem('vktori_role');
        setIsInitializing(false);
        return;
      }

      try {
        const response = await api.auth.getMe();
        const me = response?.data;
        
        if (!me?.id || !me?.roles || me.roles.length === 0) {
          throw new Error('Invalid session payload from server');
        }

        let activeRole = localStorage.getItem('vktori_role');
        if (!activeRole || !me.roles.includes(activeRole)) {
          activeRole = me.roles.includes('admin') ? 'admin' : me.roles[0];
        }

        if (!HOME_ROUTE[activeRole]) {
          throw new Error('No valid home route for active role');
        }

        localStorage.setItem('vktori_user', JSON.stringify(me));
        localStorage.setItem('vktori_role', activeRole);
        setUser(me);
        setRole(activeRole);
        setIsLoggedIn(true);
      } catch (err) {
        console.error("Session verification failed. Invalid or expired token:", err?.message || err);
        // Strict Security Enforcement: Clear stale storage and force login
        setIsLoggedIn(false);
        setUser(null);
        setRole(null);
        localStorage.removeItem('vktori_token');
        localStorage.removeItem('vktori_user');
        localStorage.removeItem('vktori_role');
        localStorage.removeItem('vktori_screen');
      } finally {
        setIsInitializing(false);
      }
    };
    initSession();
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (isLoggedIn && role) {
      localStorage.setItem('vktori_screen', 'app');
      localStorage.setItem('vktori_role', role);
    }
  }, [isLoggedIn, role]);

  // Section 13 Point 24: Automatic 15-Minute Session Inactivity Timeout
  useEffect(() => {
    if (!isLoggedIn) return;

    let lastActivityTime = Date.now();

    const resetActivity = () => {
      lastActivityTime = Date.now();
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetActivity));

    const checkInactivityInterval = setInterval(() => {
      const inactiveMs = Date.now() - lastActivityTime;
      const isClientUser = role === 'client';
      const timeoutLimitMs = isClientUser ? (2 * 60 * 60 * 1000) : (15 * 60 * 1000); // 2 hours for clients, 15 minutes for staff
      const label = isClientUser ? '2 hours' : '15 minutes';

      if (inactiveMs >= timeoutLimitMs) {
        toast(`Session expired due to ${label} of inactivity for security compliance.`, 'info');
        handleLogout();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      events.forEach(e => window.removeEventListener(e, resetActivity));
      clearInterval(checkInactivityInterval);
    };
  }, [isLoggedIn, role]);

  const handleLogin = (userData, token) => {
    if (!userData?.roles || userData.roles.length === 0) {
      toast(`User has no assigned roles. Contact support.`, 'error');
      return;
    }

    let activeRole = localStorage.getItem('vktori_role');
    if (!activeRole || !userData.roles.includes(activeRole)) {
      activeRole = userData.roles.includes('admin') ? 'admin' : userData.roles[0];
    }

    const home = HOME_ROUTE[activeRole];
    if (!home) {
      toast(`Unknown account role: ${activeRole}. Contact support.`, 'error');
      return;
    }
    
    localStorage.setItem('vktori_token', token);
    localStorage.setItem('vktori_user', JSON.stringify(userData));
    localStorage.setItem('vktori_role', activeRole);
    setUser(userData);
    setRole(activeRole);
    setIsLoggedIn(true);
    routerNavigate(home, { replace: true });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setRole(null);
    localStorage.clear();
    routerNavigate('/login');
  };

  const handleSwitchRole = (newRole) => {
    if (!HOME_ROUTE[newRole]) return;
    localStorage.setItem('vktori_role', newRole);
    setRole(newRole);
    routerNavigate(HOME_ROUTE[newRole], { replace: true });
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Internal layout element
  const appLayoutEl = (
    <AppLayout
      role={role}
      user={user}
      onLogout={handleLogout}
      onSwitchRole={handleSwitchRole}
      toast={toast}
      modal={modal}
      setModal={setModal}
      modalLookups={modalLookups}
    />
  );

  return (
    <>
      <Routes>
        {/* PUBLIC WEBSITE ROUTES */}
        <Route path="/public-intake" element={<PublicIntakePage />} />
        <Route path="/intake" element={<PublicIntakePage />} />
        <Route element={<WebsiteLayout toast={toast} />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<Navigate to="/#our-firm" replace />} />
          <Route path="/practice-areas" element={<Navigate to="/#practice-areas" replace />} />
          <Route path="/contact" element={<Navigate to="/#contact-us" replace />} />
          <Route path="/book-consultation" element={<Navigate to="/#book-consultation" replace />} />
          <Route path="/client-portal" element={<ClientPortalLandingPage />} />
        </Route>

        {/* E-SIGN ROUTE */}
        <Route path="/sign/:token" element={<SignDocument />} />

        {/* AUTH ROUTES */}
        <Route path="/login" element={<LoginScreen onLogin={handleLogin} />} />
        <Route path="/login/verify" element={<MagicLinkVerifier onLogin={handleLogin} toast={toast} />} />
        <Route path="/portal-invite" element={<InviteVerifier onLogin={handleLogin} toast={toast} />} />

        {/* PROTECTED APP ROUTES (Guarded) */}
        {/* ADMIN ROUTES */}
        <Route path="/admin" element={isLoggedIn && user?.roles?.includes('admin') ? appLayoutEl : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="intake-leads" element={<LeadsPage />} />
          <Route path="intake-leads/:id" element={<LeadDetailWrapper />} />
          <Route path="conflict-check" element={<ConflictPage />} />
          <Route path="clients" element={<AdminClientsPage />} />
          <Route path="contacts" element={<AdminContactsPage />} />
          <Route path="clients/:id" element={<AdminClientDetailPage />} />
          <Route path="matters" element={<AdminMattersPage />} />
          <Route path="matters/:id" element={<AdminMatterDetailPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="calendar" element={<AdminCalendarPage />} />
          <Route path="documents" element={<AdminDocumentsPage />} />
          <Route path="court-forms" element={<AdminCourtFormsPage />} />
          <Route path="billing" element={<AdminBillingPage />} />
          <Route path="communications" element={<AdminEmailPage />} />
          <Route path="titan-email" element={<TitanEmailModule />} />
          <Route path="vynius" element={<AdminAIPage />} />
          <Route path="marketing" element={<AdminMarketingPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="integrations" element={<AdminIntegrationsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        {/* LAWYER ROUTES */}
        <Route path="/lawyer" element={isLoggedIn && user?.roles?.includes('lawyer') ? appLayoutEl : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/lawyer/dashboard" replace />} />
          <Route path="dashboard" element={<LawyerDashboardPage />} />
          <Route path="clients" element={<LawyerClientsWrapper />} />
          <Route path="contacts" element={<AdminContactsPage />} />
          <Route path="clients/:id" element={<LawyerClientDetailWrapper />} />
          <Route path="matters" element={<LawyerMattersPage />} />
          <Route path="matters/:id" element={<LawyerMatterDetailWrapper />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="calendar" element={<LawyerCalendarPage />} />
          <Route path="documents" element={<LawyerDocumentsPage />} />
          <Route path="court-forms" element={<LawyerCourtFormsPage />} />
          <Route path="billing" element={<LawyerBillingPage />} />
          <Route path="email" element={<LawyerEmailPage />} />
          <Route path="titan-email" element={<TitanEmailModule />} />
          <Route path="vynius" element={<LawyerAIPage />} />
          <Route path="integrations" element={<LawyerIntegrationsPage />} />
          <Route path="profile" element={<LawyerProfileWrapper />} />
          <Route path="settings" element={<LawyerSettingsPage />} />
        </Route>

        {/* CLIENT ROUTES */}
        <Route path="/client" element={isLoggedIn && user?.roles?.includes('client') ? appLayoutEl : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/client/dashboard" replace />} />
          <Route path="dashboard" element={<ClientDashboardPage />} />
          <Route path="matters" element={<ClientMattersPage />} />
          <Route path="matters/:id" element={<ClientMatterDetailWrapper />} />
          <Route path="documents" element={<ClientDocsPage />} />
          <Route path="billing" element={<ClientBillingWrapper />} />
          <Route path="messages" element={<ClientMessagesWrapper />} />
          <Route path="profile" element={<ClientProfileWrapper />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={isLoggedIn && HOME_ROUTE[role] ? <Navigate to={HOME_ROUTE[role]} replace /> : <Navigate to="/" replace />} />
      </Routes>
      <ToastContainer toasts={toasts} />
    </>
  );
}
