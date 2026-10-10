import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

const statusBadge = (s) => ({
  draft:     { bg: 'rgba(234,179,8,0.15)',    color: '#fde047', border: 'rgba(234,179,8,0.3)' },
  completed: { bg: 'rgba(34,197,94,0.15)',    color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  filed:     { bg: 'rgba(59,130,246,0.15)',   color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
}[s] || { bg: 'rgba(234,179,8,0.15)', color: '#fde047', border: 'rgba(234,179,8,0.3)' });

const SYSTEM_FIELDS = [
  { key: 'case_title',            label: 'Case Title' },
  { key: 'case_number',           label: 'Case Number' },
  { key: 'matter_number',         label: 'Matter Number' },
  { key: 'plaintiff',             label: 'Plaintiff / Petitioner' },
  { key: 'defendant',             label: 'Defendant / Respondent' },
  { key: 'filing_date',           label: 'Filing Date',   type: 'date' },
  { key: 'hearing_date',          label: 'Hearing Date',  type: 'date' },
  { key: 'hearing_time',          label: 'Hearing Time' },
  { key: 'court_name',            label: 'Court Name' },
  { key: 'court_county',          label: 'Court County' },
  { key: 'court_department',      label: 'Court Department' },
  { key: 'court_address',         label: 'Court Address' },
  { key: 'judge_name',            label: 'Judge Name' },
  { key: 'attorney_name',         label: 'Attorney Name' },
  { key: 'bar_number',            label: 'State Bar No' },
  { key: 'attorney_for',          label: 'Attorney For' },
  { key: 'attorney_email',        label: 'Attorney Email' },
  { key: 'firm_name',             label: 'Firm Name' },
  { key: 'firm_address',          label: 'Firm Address' },
  { key: 'firm_zip',              label: 'Firm Zip Code' },
  { key: 'firm_phone',            label: 'Firm Phone' },
  { key: 'client_name',           label: 'Client Name' },
  { key: 'party_role',            label: 'Client Role' },
  { key: 'client_address',        label: 'Client Address' },
  { key: 'client_city_state_zip', label: 'Client City, State, Zip' },
  { key: 'client_phone',          label: 'Client Phone' },
  { key: 'client_email',          label: 'Client Email' },
];

const toDateValue = (v) => {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return v;
  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return '';
};

// ─── Custom Matter Dropdown ───────────────────────────────────
function MatterDropdown({ matters, value, onChange }) {
  const [open, setOpen]   = useState(false);
  const [q, setQ]         = useState('');
  const ref               = useRef(null);
  const inputRef          = useRef(null);
  const selected          = matters.find(m => String(m.id) === String(value));
  const filtered          = matters.filter(m =>
    !q || m.title.toLowerCase().includes(q.toLowerCase()) ||
    (m.case_number || '').toLowerCase().includes(q.toLowerCase())
  );

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => { setOpen(v => !v); setQ(''); setTimeout(() => inputRef.current?.focus(), 40); }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, padding: '11px 14px', cursor: 'pointer', transition: 'border-color .2s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,87,199,0.6)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = open ? 'rgba(0,87,199,0.7)' : 'rgba(255,255,255,0.12)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(0,87,199,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg>
          </div>
          {selected ? (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.title}</div>
              {selected.case_number && <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 1 }}>{selected.case_number}</div>}
            </div>
          ) : (
            <span style={{ fontSize: 13, color: '#8a94a6' }}>— Choose a Matter —</span>
          )}
        </div>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8a94a6" strokeWidth={2}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
          <path d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div style={{ position: 'absolute', zIndex: 999, top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#0d1f3c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#8a94a6" strokeWidth={2}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search matters..."
                style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, flex: 1 }}/>
            </div>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '20px', textAlign: 'center', color: '#8a94a6', fontSize: 13 }}>No matters found</div>
              : filtered.map(m => (
                <button key={m.id} type="button" onClick={() => { onChange(String(m.id)); setOpen(false); setQ(''); }}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    background: String(m.id) === String(value) ? 'rgba(0,87,199,0.2)' : 'transparent', border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => { if (String(m.id) !== String(value)) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = String(m.id) === String(value) ? 'rgba(0,87,199,0.2)' : 'transparent'; }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                    {m.case_number && <div style={{ fontSize: 11, color: '#8a94a6', marginTop: 2 }}>{m.case_number}</div>}
                  </div>
                  {String(m.id) === String(value) && (
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={2.5}><path d="M5 13l4 4L19 7"/></svg>
                  )}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
// ─── Custom Practice Area Dropdown ────────────────────────────
function PracticeAreaDropdown({ practiceAreas, value, onChange }) {
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', width: '220px' }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, padding: '10px 14px', cursor: 'pointer', transition: 'border-color .2s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,87,199,0.6)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = open ? 'rgba(0,87,199,0.7)' : 'rgba(255,255,255,0.12)'}
      >
        <span style={{ fontSize: 13, color: value ? '#fff' : '#8a94a6', textTransform: 'capitalize', truncate: true }}>
          {value || 'All Practice Areas'}
        </span>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8a94a6" strokeWidth={2}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
          <path d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div style={{ position: 'absolute', zIndex: 999, top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#0d1f3c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                background: !value ? 'rgba(0,87,199,0.2)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#fff', fontSize: 13 }}>
              All Practice Areas
            </button>
            {practiceAreas.map(pa => (
              <button key={pa} type="button" onClick={() => { onChange(pa); setOpen(false); }}
                style={{ width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  background: value === pa ? 'rgba(0,87,199,0.2)' : 'transparent', border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#fff', fontSize: 13 }}
                onMouseEnter={e => { if (value !== pa) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = value === pa ? 'rgba(0,87,199,0.2)' : 'transparent'; }}>
                {pa}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
const cleanPdfFieldName = (name) => {
  if (!name) return '';
  // Split by real dots (not escaped ones)
  const parts = name.split('.');
  // Find best meaningful segment (skip single chars, 'b', 'd', etc.)
  let bestPart = '';
  for (let i = parts.length - 1; i >= 0; i--) {
    let seg = parts[i].replace(/\[\d+\]/g, '');
    seg = seg.replace(/^doesdoesnot\d*$/, '');
    seg = seg.replace(/^hashasno\w*$/, '');
    seg = seg.replace(/^plantifforpet\w*$/, '');
    seg = seg.replace(/^relationship\d*$/, '');
    seg = seg.replace(/^iam\d*$/, '');
    if (seg.length > 2) { bestPart = seg; break; }
  }
  if (!bestPart) bestPart = parts[parts.length - 1].replace(/\[\d+\]/g, '');
  
  let clean = bestPart;
  clean = clean.replace(/_(ft|cb|rt|ft_)$/g, '');
  clean = clean.replace(/([A-Z])/g, ' $1').trim();
  // Known overrides
  if (clean.toLowerCase().includes('galname') || clean.toLowerCase().includes('gal info')) return 'GAL Info';
  if (clean.toLowerCase().includes('gdn')) return 'Guardian Name';
  if (clean.toLowerCase().includes('minorname')) return 'Minor Name';
  if (clean.toLowerCase().includes('minordob')) return 'Minor DOB';
  if (clean.toLowerCase().includes('appl')) return 'Applicant Name';
  if (clean.toLowerCase().includes('explainInadeq') || clean.toLowerCase().includes('explain inadeq')) return 'Explain Inadequacy';
  if (clean.toLowerCase().includes('gdncnsrvtr')) return 'Guardian/Conservator Info';
  if (clean.toLowerCase().includes('conflic')) return 'Conflict Description';
  if (clean.toLowerCase().includes('specifyfam')) return 'Specify Family Relationship';
  if (clean.toLowerCase().includes('specifynonfam')) return 'Specify Non-Family Relationship';
  if (clean.toLowerCase().includes('att4') || clean.toLowerCase().includes('att6') || clean.toLowerCase().includes('att9')) return 'Attachment';
  return clean || name;
};

export default function CourtFormsPage({ toast, role = 'admin' }) {
  const [tab,            setTab]            = useState('library');
  const [templates,      setTemplates]      = useState([]);
  const [drafts,         setDrafts]         = useState([]);
  const [matters,        setMatters]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [practiceFilter, setPracticeFilter] = useState('');
  const [wizard,         setWizard]         = useState(null);
  const [wizardStep,     setWizardStep]     = useState(1);
  const [prefillData,    setPrefillData]    = useState({});
  const [formValues,     setFormValues]     = useState({});
  const [generating,     setGenerating]     = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [pdfPreview,     setPdfPreview]     = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('court_form_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showOnlyFavs, setShowOnlyFavs] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [packages, setPackages] = useState([]);
  const [packageModal, setPackageModal] = useState(null);
  const [selectedMatterForPkg, setSelectedMatterForPkg] = useState('');
  const [generatingPkg, setGeneratingPkg] = useState(false);
  const [uploadingFormNum, setUploadingFormNum] = useState(null);
  const [selectedFormsForPkg, setSelectedFormsForPkg] = useState([]);

  const handleUploadFormPdf = async (formNum, file) => {
    if (!file) return;
    setUploadingFormNum(formNum);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('form_number', formNum);

      await api.courtForms.uploadTemplate(formData);
      toast?.(`PDF template uploaded successfully for ${formNum}!`, 'success');

      // Refresh packages & templates data
      const pR = await api.courtForms.listPackages();
      const updatedPkgs = Array.isArray(pR.data) ? pR.data : [];
      setPackages(updatedPkgs);

      // Update active modal package data
      if (packageModal) {
        const match = updatedPkgs.find(p => p.id === packageModal.id);
        if (match) setPackageModal(match);
      }
      fetchAll(false);
    } catch (e) {
      toast?.(e.message || `Failed to upload PDF for ${formNum}`, 'error');
    } finally {
      setUploadingFormNum(null);
    }
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('court_form_favorites', JSON.stringify(next));
      return next;
    });
  };

  const fetchAll = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Fetch matters & packages asynchronously in background
      api.matters.list({ limit: 200 }).then(mR => {
        setMatters(Array.isArray(mR.data) ? mR.data : []);
      }).catch(e => console.error('Failed to load matters', e));

      api.courtForms.listPackages().then(pR => {
        setPackages(Array.isArray(pR.data) ? pR.data : []);
      }).catch(e => console.error('Failed to load packages', e));

      const [tR, dR] = await Promise.all([
        api.courtForms.listTemplates(),
        api.courtForms.listDrafts(),
      ]);
      setTemplates(Array.isArray(tR.data) ? tR.data : []);
      setDrafts(Array.isArray(dR.data) ? dR.data : []);
    } catch { toast?.('Failed to load data', 'error'); }
    finally { if (showLoading) setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(true); }, [fetchAll]);

  const filteredTemplates = templates.filter(t => {
    const q = search.toLowerCase();
    const matchesSearch = !q || t.form_number.toLowerCase().includes(q) || t.title.toLowerCase().includes(q);
    const matchesPractice = !practiceFilter || t.practice_area === practiceFilter;
    const matchesFav = !showOnlyFavs || favorites.includes(t.id);
    return matchesSearch && matchesPractice && matchesFav;
  });
  const practiceAreas = [...new Set(templates.map(t => t.practice_area).filter(Boolean))];

  const openWizard = async (template, draft = null) => {
    // Open modal instantly without waiting for network
    const initialMatterId = draft?.matter?.id || '';
    setWizard({ template, matter_id: initialMatterId, draft_id: draft?.id || null });
    setPrefillData({});
    setFormValues(draft?.form_data || {});
    setWizardStep(draft ? 2 : 1);
    
    // Fetch full template in background and update state silently
    try {
      const res = await api.courtForms.getTemplate(template.id);
      if (res && res.data) {
        setWizard(prev => prev ? { ...prev, template: res.data } : null);
      }
    } catch (e) {
      console.error('Failed to fetch full template detail:', e);
    }
    
    if (initialMatterId) {
      try {
        const r = await api.courtForms.prefill(initialMatterId);
        const data = r.data || {};
        setPrefillData(data);
        setFormValues(prev => ({ ...data, ...(draft?.form_data || prev || {}) }));
      } catch (err) {
        console.error('Failed to prefill draft matter:', err);
      }
    }
  };

  const handleMatterSelect = async id => {
    setWizard(p => ({ ...p, matter_id: id }));
    if (!id) return;
    try {
      const r = await api.courtForms.prefill(id);
      const data = r.data || {};
      setPrefillData(data);
      setFormValues(data);
    } catch (err) {
      console.error('Failed to prefill matter:', err);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      if (wizard.draft_id) {
        await api.courtForms.updateDraft(wizard.draft_id, { form_data: formValues });
      } else {
        const r = await api.courtForms.createDraft({ template_id: wizard.template.id, matter_id: wizard.matter_id, form_data: formValues });
        setWizard(p => ({ ...p, draft_id: r.data?.id }));
      }
      toast?.('Draft saved', 'success'); fetchAll(false);
    } catch { toast?.('Failed to save draft', 'error'); }
    finally { setSaving(false); }
  };

  const doGenerate = async draftId => {
    setGenerating(true);
    try {
      const r = await api.courtForms.generatePdf(draftId, { form_data: formValues });
      const blob = r.data;
      const url = URL.createObjectURL(blob);
      const filename = `${wizard?.template?.form_number || 'court'}_form.pdf`;

      setPdfPreview({
        url,
        blob,
        filename,
        title: wizard?.template?.title || 'Court Form',
        formNumber: wizard?.template?.form_number || 'Form'
      });

      setWizard(null);
      toast?.('PDF generated successfully!', 'success');
      fetchAll(false);
    } catch (err) {
      console.error('[FRONTEND_DOWNLOAD_ERROR]', err);
      toast?.('PDF generation failed', 'error');
    }
    finally { setGenerating(false); }
  };

  const handleGeneratePdf = async () => {
    if (!wizard.draft_id) {
      setSaving(true);
      try {
        const r = await api.courtForms.createDraft({ template_id: wizard.template.id, matter_id: wizard.matter_id, form_data: formValues });
        setWizard(p => ({ ...p, draft_id: r.data?.id }));
        await doGenerate(r.data?.id);
      } catch { toast?.('Save failed', 'error'); }
      finally { setSaving(false); }
      return;
    }
    await api.courtForms.updateDraft(wizard.draft_id, { form_data: formValues });
    await doGenerate(wizard.draft_id);
  };

  const sx = { // shared styles shorthand
    page:    { minHeight: '100vh', background: '#020b18', color: '#fff', padding: 'clamp(16px, 4vw, 32px)' },
    card:    { background: '#0a1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 },
    tabBar:  { display: 'flex', flexWrap: 'wrap', gap: 4, padding: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 12, maxWidth: '100%', marginBottom: 28 },
    chip:    (active) => ({ padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .2s',
      background: active ? '#0057c7' : 'transparent', color: active ? '#fff' : '#8a94a6' }),
    input:   { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none' },
    btn:     (variant) => ({
      primary: { padding: '10px 22px', background: '#0057c7', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 },
      ghost:   { padding: '10px 22px', background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
      danger:  { padding: '7px 14px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
      success: { padding: '7px 14px', background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
      edit:    { padding: '7px 14px', background: 'rgba(0,87,199,0.2)', color: '#38bdf8', border: '1px solid rgba(0,87,199,0.3)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
    }[variant]),
  };

  return (
    <div style={sx.page}>
      <style>{`
        /* Responsive Breakpoints & Flex Layout Fixes */
        .court-forms-tabs-container {
          overflow-x: auto;
          white-space: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          max-width: 100%;
        }
        .court-forms-pkg-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 16px;
        }
        .court-forms-pkg-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          transition: all 0.2s;
        }
        .court-forms-pkg-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .court-forms-pkg-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .court-forms-pkg-actions {
            width: 100% !important;
            justify-content: flex-start !important;
            flex-wrap: wrap !important;
          }
          .court-forms-modal-footer {
            flex-direction: column-reverse !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .court-forms-modal-footer button {
            width: 100% !important;
            justify-content: center !important;
            white-space: normal !important;
          }
          .court-forms-preview-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .court-forms-preview-actions {
            width: 100% !important;
            justify-content: space-between !important;
            flex-wrap: wrap !important;
          }
        }

        @media (max-width: 480px) {
          .court-forms-pkg-actions button,
          .court-forms-pkg-actions label,
          .court-forms-pkg-actions a {
            flex: 1 1 auto !important;
            justify-content: center !important;
            text-align: center !important;
          }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,87,199,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={1.5}>
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>Library</h1>
            <p style={{ fontSize: 13, color: '#8a94a6', margin: 0 }}>California Judicial Council Forms — Auto-Prefill &amp; PDF Generator</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="court-forms-tabs-container" style={sx.tabBar}>
        {[
          { id: 'library', label: 'Forms Library' },
          { id: 'packages', label: '⚡ Form Packages (Bundles)' },
          { id: 'drafts',  label: `My Forms${drafts.length ? ` (${drafts.length})` : ''}` },
          ...(role === 'admin' || role === 'lawyer' ? [{ id: 'mapping', label: 'Field Mapping' }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={sx.chip(tab === t.id)}>{t.label}</button>
        ))}
      </div>

      <>
        {/* ── LIBRARY ── */}
        {tab === 'library' && (
          <div>
            {/* Search + Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 200, display: 'flex', alignItems: 'center', gap: 10, ...sx.card, padding: '10px 16px' }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8a94a6" strokeWidth={2}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by form number or title…"
                  style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, flex: 1 }}/>
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#8a94a6', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>}
              </div>
              
              <PracticeAreaDropdown practiceAreas={practiceAreas} value={practiceFilter} onChange={setPracticeFilter} />
              
              {/* Favorites filter toggle */}
              <button type="button" onClick={() => setShowOnlyFavs(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: showOnlyFavs ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${showOnlyFavs ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.12)'}`,
                  color: showOnlyFavs ? '#fde047' : '#8a94a6', transition: 'all 0.2s' }}>
                <svg width="14" height="14" fill={showOnlyFavs ? '#fde047' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.97-2.883a1 1 0 00-1.176 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.783-.57-.38-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z"/>
                </svg>
                Favorites
              </button>
            </div>

            {/* Results count */}
            {(search || showOnlyFavs || practiceFilter) && (
              <p style={{ fontSize: 13, color: '#8a94a6', marginBottom: 16 }}>
                {filteredTemplates.length} form{filteredTemplates.length !== 1 ? 's' : ''} found
              </p>
            )}

            {/* Cards Grid */}
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(0,87,199,0.3)', borderTopColor: '#0057c7', animation: 'spin 0.8s linear infinite' }}/>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#8a94a6' }}>
                <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }}>
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/>
                </svg>
                <p style={{ fontWeight: 600, fontSize: 15 }}>No forms found</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Try a different search term or clear the filters</p>
              </div>
            ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {filteredTemplates.map(t => {
                    const isFav = favorites.includes(t.id);
                    return (
                      <div key={t.id} style={{ ...sx.card, display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', transition: 'border-color .2s', flexWrap: 'wrap' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,87,199,0.4)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                        
                        {/* Favorite Star Button */}
                        <button type="button" onClick={() => toggleFavorite(t.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isFav ? '#fde047' : 'rgba(255,255,255,0.2)' }}
                          title={isFav ? 'Remove from favorites' : 'Add to favorites'}>
                          <svg width="18" height="18" fill={isFav ? '#fde047' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.97-2.883a1 1 0 00-1.176 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.783-.57-.38-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z"/>
                          </svg>
                        </button>

                        {/* Icon */}
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0,87,199,0.15)', border: '1px solid rgba(0,87,199,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={1.5}>
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                            <rect x="9" y="3" width="6" height="4" rx="1"/>
                            <path d="M9 12h6M9 16h4"/>
                          </svg>
                        </div>
                        {/* Info */}
                        <div style={{ flex: '1 1 200px', minWidth: 200 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{t.form_number}</span>
                            {t.practice_area && (
                              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 20, background: 'rgba(0,87,199,0.2)', color: '#38bdf8', border: '1px solid rgba(0,87,199,0.25)' }}>
                                {t.practice_area}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: 0 }}>{t.title}</p>
                        </div>
                        {/* Right Buttons */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteModal({ type: 'template', item: t }); }}
                            style={{ ...sx.btn('ghost'), padding: '10px 14px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                            title="Delete Template">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                          {/* Generate Button */}
                          <button onClick={() => openWizard(t)}
                            style={{ ...sx.btn('primary'), flexShrink: 0, whiteSpace: 'nowrap' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#0066e0'}
                            onMouseLeave={e => e.currentTarget.style.background = '#0057c7'}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 4v16m8-8H4"/></svg>
                            Generate
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}


          {/* ── FORM PACKAGES (BUNDLES) ── */}
          {tab === 'packages' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {packages.map(pkg => (
                <div key={pkg.id} style={{ ...sx.card, padding: 20, display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', border: '1px solid rgba(56,189,248,0.15)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: pkg.category === 'Immigration' ? 'rgba(168,85,247,0.15)' : 'rgba(56,189,248,0.15)', color: pkg.category === 'Immigration' ? '#c084fc' : '#38bdf8', border: `1px solid ${pkg.category === 'Immigration' ? 'rgba(168,85,247,0.3)' : 'rgba(56,189,248,0.3)'}` }}>
                        {pkg.category}
                      </span>
                      <span style={{ fontSize: 11, color: '#8a94a6', fontWeight: 600 }}>{pkg.forms.length} Forms</span>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>{pkg.title}</h3>
                    <p style={{ fontSize: 12, color: '#8a94a6', margin: '0 0 14px 0', lineHeight: 1.5 }}>{pkg.description}</p>
                    
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Included Forms:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {pkg.forms.map(f => (
                          <span key={f} style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#e2e8f0', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setPackageModal(pkg); setSelectedMatterForPkg(''); setSelectedFormsForPkg(pkg.forms); }}
                    style={{ ...sx.btn('primary'), width: '100%', justifyContent: 'center', marginTop: 12 }}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    View &amp; Generate Package Forms
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── MY FORMS ── */}
          {tab === 'drafts' && (
            <div>
              {drafts.length === 0 ? (
                <div style={{ ...sx.card, textAlign: 'center', padding: '80px 40px' }}>
                  <svg width="52" height="52" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ margin: '0 auto 16px', display: 'block', color: '#1e3a5f' }}>
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/>
                  </svg>
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>No saved forms yet</p>
                  <p style={{ fontSize: 13, color: '#8a94a6' }}>Generate your first form from the <strong style={{ color: '#38bdf8' }}>Forms Library</strong> tab</p>
                </div>
              ) : (
                <div style={{ ...sx.card, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {['Form', 'Matter', 'Status', 'Generated By', 'Last Modified', 'Actions'].map((h, i) => (
                          <th key={h} style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a94a6', textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {drafts.map((d, idx) => {
                        const st = statusBadge(d.status);
                        return (
                          <tr key={d.id} style={{ borderBottom: idx < drafts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background .15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '16px 20px' }}>
                              <p style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#38bdf8', margin: 0 }}>{d.template?.form_number}</p>
                              <p style={{ fontSize: 12, color: '#8a94a6', marginTop: 3 }}>{d.template?.title}</p>
                            </td>
                            <td style={{ padding: '16px 20px' }}>
                              <p style={{ fontSize: 13, fontWeight: 500, color: '#fff', margin: 0 }}>{d.matter?.title || '—'}</p>
                              {d.matter?.case_number && <p style={{ fontSize: 11, color: '#8a94a6', marginTop: 3 }}>{d.matter.case_number}</p>}
                            </td>
                            <td style={{ padding: '16px 20px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, textTransform: 'capitalize', background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{d.status}</span>
                            </td>
                            <td style={{ padding: '16px 20px', fontSize: 13, color: '#8a94a6' }}>{d.creator?.full_name || '—'}</td>
                            <td style={{ padding: '16px 20px', fontSize: 13, color: '#8a94a6' }}>{new Date(d.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td style={{ padding: '16px 20px' }}>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <button onClick={() => openWizard(d.template, d)} style={sx.btn('edit')}>Edit</button>
                                {d.status !== 'filed' && <button onClick={() => { api.courtForms.updateDraft(d.id, { status: 'filed' }).then(() => { toast?.('Marked as filed', 'success'); fetchAll(false); }).catch(() => toast?.('Failed', 'error')); }} style={sx.btn('success')}>Mark Filed</button>}
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteModal({ type: 'draft', item: d }); }} style={sx.btn('danger')}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── MAPPING ── */}
          {tab === 'mapping' && <MappingTab templates={templates} toast={toast} onRefreshTemplates={() => fetchAll(false)} />}
        </>

      {/* ── WIZARD MODAL ── */}
      {wizard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0d1f3c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, width: '100%', maxWidth: 740, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '22px 26px', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, background: '#0d1f3c', zIndex: 10, borderRadius: '18px 18px 0 0' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: 6 }}>{wizard.template?.form_number}</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{wizard.template?.title}</h2>
              </div>
              <button onClick={() => setWizard(null)}
                style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a94a6', flexShrink: 0 }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Step Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 26px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
              {['Select Matter', 'Fill Details', 'Generate PDF'].map((label, i) => {
                const done    = wizardStep > i + 1;
                const active  = wizardStep === i + 1;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                        background: done ? '#22c55e' : active ? '#0057c7' : 'rgba(255,255,255,0.06)',
                        border: `2px solid ${done ? '#22c55e' : active ? '#0057c7' : 'rgba(255,255,255,0.12)'}`,
                        color: (done || active) ? '#fff' : '#8a94a6' }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: active ? '#fff' : done ? '#4ade80' : '#8a94a6' }}>{label}</span>
                    </div>
                    {i < 2 && <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.08)' }}/>}
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '26px' }}>
              {/* Step 1 */}
              {wizardStep === 1 && (
                <div>
                  <p style={{ color: '#8a94a6', fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>
                    Select the case / matter to pre-populate this form with client, attorney, and court information.
                  </p>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Select Matter <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <MatterDropdown matters={matters} value={wizard.matter_id} onChange={handleMatterSelect}/>
                  {!wizard.matter_id ? (
                    <p style={{ fontSize: 12, color: '#8a94a6', marginTop: 10 }}>
                      💡 {matters.length} matter{matters.length !== 1 ? 's' : ''} available
                    </p>
                  ) : (
                    <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16 }}>⚡</span>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', margin: 0 }}>
                            Auto-Populated from Case: {matters.find(m => String(m.id) === String(wizard.matter_id))?.title || 'Selected Matter'}
                          </p>
                          <p style={{ fontSize: 11, color: '#8a94a6', margin: '2px 0 0 0' }}>
                            Client: <strong style={{ color: '#fff' }}>{prefillData.client_name || 'Loading...'}</strong> · Court: <strong style={{ color: '#fff' }}>{prefillData.court_name || 'Loading...'}</strong>
                          </p>
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#38bdf8', color: '#000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        READY TO FILL
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
                    <button onClick={() => { if (!wizard.matter_id) { toast?.('Please select a matter first', 'error'); return; } setWizardStep(2); }}
                      style={{ ...sx.btn('primary') }}
                      onMouseEnter={e => e.currentTarget.style.background = '#0066e0'}
                      onMouseLeave={e => e.currentTarget.style.background = '#0057c7'}>
                      Next: Fill Details →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {wizardStep === 2 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 16px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 10 }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={2}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <p style={{ fontSize: 12, color: '#38bdf8', margin: 0 }}>Fields tagged <strong>AUTO</strong> were automatically pulled from the client, case, and court records. You can review or edit any value before generating the final PDF.</p>
                  </div>
                  {/* Form divided into sections to avoid overlap and look clean */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Section 1: Matter Details */}
                    <div>
                      <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                        ⚖️ Matter &amp; Case Identification
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                        {[
                          { key: 'case_title', label: 'Case Title' },
                          { key: 'case_number', label: 'Case Number' },
                          { key: 'matter_number', label: 'Matter Number' },
                          { key: 'filing_date', label: 'Filing Date', type: 'date' },
                        ].map(({ key, label, type }) => (
                          <div key={key}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</label>
                            <div style={{ position: 'relative' }}>
                              <input type={type || 'text'} value={type === 'date' ? toDateValue(formValues[key]) : (formValues[key] || '')}
                                onChange={e => setFormValues(p => ({ ...p, [key]: e.target.value }))}
                                style={{ ...sx.input, paddingRight: prefillData[key] ? 50 : 14, borderColor: prefillData[key] ? 'rgba(0,87,199,0.5)' : 'rgba(255,255,255,0.1)' }}/>
                              {prefillData[key] && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 800, color: '#38bdf8', background: 'rgba(0,87,199,0.15)', padding: '2px 6px', borderRadius: 4 }}>AUTO</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 2: Parties & Case Roles */}
                    <div>
                      <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                        👥 Case Parties
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                        {[
                          { key: 'plaintiff', label: 'Plaintiff / Petitioner' },
                          { key: 'defendant', label: 'Defendant / Respondent' },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</label>
                            <div style={{ position: 'relative' }}>
                              <input type="text" value={formValues[key] || ''}
                                onChange={e => setFormValues(p => ({ ...p, [key]: e.target.value }))}
                                style={{ ...sx.input, paddingRight: prefillData[key] ? 50 : 14, borderColor: prefillData[key] ? 'rgba(0,87,199,0.5)' : 'rgba(255,255,255,0.1)' }}/>
                              {prefillData[key] && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 800, color: '#38bdf8', background: 'rgba(0,87,199,0.15)', padding: '2px 6px', borderRadius: 4 }}>AUTO</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 3: Client Details */}
                    <div>
                      <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                        👤 Client Information (Auto-Populated)
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                        {[
                          { key: 'client_name', label: 'Client Full Name' },
                          { key: 'party_role', label: 'Client Role (Plaintiff/Respondent)' },
                          { key: 'client_email', label: 'Client Email' },
                          { key: 'client_phone', label: 'Client Phone' },
                          { key: 'client_address', label: 'Client Street Address', fullSpan: true },
                          { key: 'client_city_state_zip', label: 'Client City, State, Zip' },
                        ].map(({ key, label, fullSpan }) => (
                          <div key={key} style={{ gridColumn: fullSpan ? 'span 2' : 'auto' }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</label>
                            <div style={{ position: 'relative' }}>
                              <input type="text" value={formValues[key] || ''}
                                onChange={e => setFormValues(p => ({ ...p, [key]: e.target.value }))}
                                style={{ ...sx.input, paddingRight: prefillData[key] ? 50 : 14, borderColor: prefillData[key] ? 'rgba(0,87,199,0.5)' : 'rgba(255,255,255,0.1)' }}/>
                              {prefillData[key] && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 800, color: '#38bdf8', background: 'rgba(0,87,199,0.15)', padding: '2px 6px', borderRadius: 4 }}>AUTO</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 4: Attorney & Firm Details */}
                    <div>
                      <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                        🏢 Attorney &amp; Firm Information (Front Header)
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                        {[
                          { key: 'attorney_name', label: 'Attorney Name' },
                          { key: 'bar_number', label: 'State Bar No (SBN)' },
                          { key: 'attorney_for', label: 'Attorney For (Party)' },
                          { key: 'attorney_email', label: 'Attorney Email' },
                          { key: 'firm_name', label: 'Firm Name' },
                          { key: 'firm_phone', label: 'Firm Phone' },
                          { key: 'firm_address', label: 'Firm Street Address', fullSpan: true },
                          { key: 'firm_city', label: 'Firm City' },
                          { key: 'firm_state', label: 'Firm State' },
                          { key: 'firm_zip', label: 'Firm Zip Code' },
                        ].map(({ key, label, fullSpan }) => (
                          <div key={key} style={{ gridColumn: fullSpan ? 'span 2' : 'auto' }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</label>
                            <div style={{ position: 'relative' }}>
                              <input type="text" value={formValues[key] || ''}
                                onChange={e => setFormValues(p => ({ ...p, [key]: e.target.value }))}
                                style={{ ...sx.input, paddingRight: prefillData[key] ? 50 : 14, borderColor: prefillData[key] ? 'rgba(0,87,199,0.5)' : 'rgba(255,255,255,0.1)' }}/>
                              {prefillData[key] && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 800, color: '#38bdf8', background: 'rgba(0,87,199,0.15)', padding: '2px 6px', borderRadius: 4 }}>AUTO</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 5: Court details */}
                    <div>
                      <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                        🏛️ Court &amp; Hearing Details (Auto-Populated)
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                        {[
                          { key: 'court_name', label: 'Court Name' },
                          { key: 'court_county', label: 'Court County' },
                          { key: 'court_department', label: 'Court Department / Room' },
                          { key: 'judge_name', label: 'Presiding Judge' },
                          { key: 'court_address', label: 'Court Street Address' },
                          { key: 'court_city_zip', label: 'Court City & Zip' },
                          { key: 'hearing_date', label: 'Hearing Date', type: 'date' },
                          { key: 'hearing_time', label: 'Hearing Time' },
                        ].map(({ key, label, type, fullSpan }) => (
                          <div key={key} style={{ gridColumn: fullSpan ? 'span 2' : 'auto' }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</label>
                            <div style={{ position: 'relative' }}>
                              <input type={type || 'text'} value={type === 'date' ? toDateValue(formValues[key]) : (formValues[key] || '')}
                                onChange={e => setFormValues(p => ({ ...p, [key]: e.target.value }))}
                                style={{ ...sx.input, paddingRight: prefillData[key] ? 50 : 14, borderColor: prefillData[key] ? 'rgba(0,87,199,0.5)' : 'rgba(255,255,255,0.1)' }}/>
                              {prefillData[key] && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 800, color: '#38bdf8', background: 'rgba(0,87,199,0.15)', padding: '2px 6px', borderRadius: 4 }}>AUTO</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Section 6: Form Specific Details (Custom Fields) */}
                    {(() => {
                      const STANDARD_KEYS = [
                        'case_title', 'case_number', 'plaintiff', 'defendant', 'court_name', 'court_county', 'court_department', 'court_dept', 'dept', 'department', 'judge_name',
                        'attorney_name', 'bar_number', 'Atty Bar No', 'bar_no', 'attorney_for', 'firm_name', 'client_name', 'client_address', 'client_street', 'client_city', 'client_state', 'client_zip', 'client_city_state_zip', 'client_phone', 'client_email', 'party_role',
                        'filing_date', 'hearing_date', 'hearing_time', 'firm_address', 'firm_street', 'firm_city', 'firm_state', 'firm_phone', 'firm_zip', 'firm_city_state_zip', 'court_address', 'court_street', 'court_city_zip', 'matter_number',
                        'attorney_email', 'petitioner', 'respondent'
                      ];
                      const mappings = wizard?.template?.mappings || [];
                      const customFieldMappings = mappings.filter(
                        m => m.system_field_path && !STANDARD_KEYS.includes(m.system_field_path)
                      );
                      const uniqueCustomFields = [...new Set(customFieldMappings.map(m => m.system_field_path))];

                      if (uniqueCustomFields.length === 0) return null;

                      return (
                        <div style={{ marginTop: '12px' }}>
                          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                            📝 Form Specific Details (Custom Fields)
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                            {uniqueCustomFields.map(cfName => {
                              const mapping = customFieldMappings.find(m => m.system_field_path === cfName);
                              const isCheckbox = mapping?.pdf_field_name?.toLowerCase()?.includes('_cb');

                              if (isCheckbox) {
                                return (
                                  <div key={cfName} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                                    <input type="checkbox" checked={!!formValues[cfName]} id={cfName}
                                      onChange={e => setFormValues(p => ({ ...p, [cfName]: e.target.checked }))}
                                      style={{ width: 18, height: 18, accentColor: '#10b981', cursor: 'pointer' }}/>
                                    <label htmlFor={cfName} style={{ fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>{cfName}</label>
                                  </div>
                                );
                              }

                              return (
                                <div key={cfName}>
                                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{cfName}</label>
                                  <div style={{ position: 'relative' }}>
                                    <input type="text" value={formValues[cfName] || ''}
                                      onChange={e => setFormValues(p => ({ ...p, [cfName]: e.target.value }))}
                                      style={{ ...sx.input, paddingRight: prefillData[cfName] ? 50 : 14, borderColor: prefillData[cfName] ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)' }}/>
                                    {prefillData[cfName] && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: 4 }}>AUTO</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <button onClick={() => setWizardStep(1)} style={{ background: 'none', border: 'none', color: '#8a94a6', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      ← Back
                    </button>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={handleSaveDraft} disabled={saving} style={{ ...sx.btn('ghost'), opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'Saving…' : 'Save Draft'}
                      </button>
                      <button onClick={handleGeneratePdf} disabled={generating || saving}
                        style={{ ...sx.btn('primary'), opacity: (generating || saving) ? 0.6 : 1 }}
                        onMouseEnter={e => { if (!generating && !saving) e.currentTarget.style.background = '#0066e0'; }}
                        onMouseLeave={e => e.currentTarget.style.background = '#0057c7'}>
                        {generating
                          ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }}/> Generating…</>
                          : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> Generate PDF</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PDF PREVIEW & ACTION MODAL POPUP ── */}
      {pdfPreview && (() => {
        const activeForm = (pdfPreview.formsList && pdfPreview.formsList.length > 0)
          ? pdfPreview.formsList[pdfPreview.activeIndex || 0]
          : pdfPreview;

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, width: '100%', maxWidth: 1060, height: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 60px rgba(0,0,0,0.8)', overflow: 'hidden' }}>

              {/* Modal Navigation Header */}
              <div className="court-forms-preview-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#0d1f3c', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.15)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(56,189,248,0.3)' }}>
                    {activeForm.formNumber}
                  </span>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{activeForm.title}</h3>
                    <span style={{ fontSize: 11, color: '#8a94a6' }}>Generated Form Preview — Interactive &amp; Fillable</span>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="court-forms-preview-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Header Print & Download Buttons (Commented out to avoid duplication with action bar) */}
                  {/*
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeForm?.url) return;
                      const printIframe = document.createElement('iframe');
                      printIframe.style.position = 'fixed';
                      printIframe.style.right = '0';
                      printIframe.style.bottom = '0';
                      printIframe.style.width = '0';
                      printIframe.style.height = '0';
                      printIframe.style.border = '0';
                      printIframe.src = activeForm.url;
                      document.body.appendChild(printIframe);
                      printIframe.onload = () => {
                        setTimeout(() => {
                          try {
                            printIframe.contentWindow.focus();
                            printIframe.contentWindow.print();
                          } catch (e) {
                            window.open(activeForm.url, '_blank');
                          }
                          setTimeout(() => {
                            try { document.body.removeChild(printIframe); } catch (_) {}
                          }, 60000);
                        }, 500);
                      };
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  >
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                    </svg>
                    Print
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!activeForm?.url) return;
                      const a = document.createElement('a');
                      a.href = activeForm.url;
                      a.download = activeForm.filename || `${activeForm.formNumber || 'court'}_form.pdf`;
                      a.click();
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: '#0057c7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0066e0'}
                    onMouseLeave={e => e.currentTarget.style.background = '#0057c7'}
                  >
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    Download PDF
                  </button>
                  */}

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (pdfPreview.formsList) {
                        pdfPreview.formsList.forEach(fItem => { if (fItem.url) URL.revokeObjectURL(fItem.url); });
                      } else if (pdfPreview.url) {
                        URL.revokeObjectURL(pdfPreview.url);
                      }
                      setPdfPreview(null);
                    }}
                    style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#8a94a6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

              {/* Multi-Form Preview Tab Switcher Bar */}
              {pdfPreview.formsList && pdfPreview.formsList.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', background: '#061120', borderBottom: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4, flexShrink: 0 }}>
                    ⚡ Generated Package Previews ({pdfPreview.formsList.length}):
                  </span>
                  {pdfPreview.formsList.map((fItem, idx) => {
                    const isActive = (pdfPreview.activeIndex || 0) === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setPdfPreview(prev => ({ ...prev, activeIndex: idx }))}
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '7px 14px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: isActive ? '#0057c7' : 'rgba(255,255,255,0.05)',
                          color: isActive ? '#fff' : '#94a3b8',
                          border: isActive ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        <span>📄 {fItem.formNumber}</span>
                        <span style={{ fontSize: 10, color: isActive ? '#fff' : '#4ade80' }}>✓</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Embedded PDF Viewer Object/Iframe or Animated Loading Overlay */}
              <div style={{ flex: 1, background: '#1e293b', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {!activeForm.url ? (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a1628', gap: 16 }}>
                    <div style={{ width: 42, height: 42, border: '4px solid rgba(56,189,248,0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#38bdf8' }}>
                      ⚡ Auto-filling &amp; Generating Interactive PDF for {activeForm.formNumber || 'Form'}...
                    </span>
                    <span style={{ fontSize: 12, color: '#8a94a6' }}>Assembling Matter &amp; Client details into fillable fields...</span>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Mobile & Quick Open Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#07152b', borderBottom: '1px solid rgba(56,189,248,0.2)', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 600 }}>📄 {activeForm.formNumber} PDF Ready</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/*
                        <button
                          type="button"
                          onClick={() => {
                            if (!activeForm?.url) return;
                            const printIframe = document.createElement('iframe');
                            printIframe.style.position = 'fixed';
                            printIframe.style.right = '0';
                            printIframe.style.bottom = '0';
                            printIframe.style.width = '0';
                            printIframe.style.height = '0';
                            printIframe.style.border = '0';
                            printIframe.src = activeForm.url;
                            document.body.appendChild(printIframe);
                            printIframe.onload = () => {
                              setTimeout(() => {
                                try {
                                  printIframe.contentWindow.focus();
                                  printIframe.contentWindow.print();
                                } catch (e) {
                                  window.open(activeForm.url, '_blank');
                                }
                                setTimeout(() => {
                                  try { document.body.removeChild(printIframe); } catch (_) {}
                                }, 60000);
                              }, 500);
                            };
                          }}
                          style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          🖨️ Print
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!activeForm?.url) return;
                            const a = document.createElement('a');
                            a.href = activeForm.url;
                            a.download = activeForm.filename || `${activeForm.formNumber || 'court'}_form.pdf`;
                            a.click();
                          }}
                          style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#0057c7', border: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          💾 Save / Download
                        </button>
                        */}
                        <a
                          href={activeForm.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#0284c7', padding: '6px 14px', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          👁️ Open Full PDF
                        </a>
                      </div>
                    </div>

                    <object
                      key={activeForm.url}
                      data={`${activeForm.url}#toolbar=1&navpanes=0`}
                      type="application/pdf"
                      style={{ width: '100%', flex: 1, border: 'none', display: 'block' }}
                    >
                      <iframe
                        id="pdf-preview-iframe"
                        src={activeForm.url}
                        title={activeForm.title}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                      >
                        <div style={{ padding: 30, textAlign: 'center', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Generated PDF is Ready!</p>
                          <a
                            href={activeForm.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ padding: '10px 20px', background: '#0057c7', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}
                          >
                            👁️ Open PDF in Mobile Viewer
                          </a>
                        </div>
                      </iframe>
                    </object>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── PACKAGE GENERATION & FORM UPLOAD MODAL ── */}
      {packageModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0a1424', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 20, width: '100%', maxWidth: 740, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 30px 60px rgba(0,0,0,0.8)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: packageModal.category === 'Immigration' ? 'rgba(168,85,247,0.15)' : 'rgba(56,189,248,0.15)', color: packageModal.category === 'Immigration' ? '#c084fc' : '#38bdf8', border: `1px solid ${packageModal.category === 'Immigration' ? 'rgba(168,85,247,0.3)' : 'rgba(56,189,248,0.3)'}` }}>
                    {packageModal.category}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                    {packageModal.pdf_ready_count || 0} / {packageModal.total_forms_count || packageModal.forms.length} PDFs Ready
                  </span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '4px 0 0 0' }}>{packageModal.title}</h2>
                <p style={{ fontSize: 12, color: '#8a94a6', margin: '4px 0 0 0' }}>{packageModal.description}</p>
              </div>
              <button onClick={() => setPackageModal(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#8a94a6', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            {/* Target Matter Selection at Top for Quick Individual / Package Generation */}
            <div style={{ marginBottom: 20, background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 14, border: '1px solid rgba(56,189,248,0.2)' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                1. Select Matter for Form Prefilling
              </label>
              <MatterDropdown matters={matters} value={selectedMatterForPkg} onChange={setSelectedMatterForPkg} />
            </div>

            {/* Included Forms Checklist & Actions */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                  2. Select &amp; Generate Forms ({selectedFormsForPkg.length} / {packageModal.enriched_forms?.length || packageModal.forms.length} selected)
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const allForms = (packageModal.enriched_forms || packageModal.forms).map(x => typeof x === 'string' ? x : x.form_number);
                      if (selectedFormsForPkg.length === allForms.length) {
                        setSelectedFormsForPkg([]);
                      } else {
                        setSelectedFormsForPkg(allForms);
                      }
                    }}
                    style={{ fontSize: 11, fontWeight: 600, color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {selectedFormsForPkg.length === (packageModal.enriched_forms?.length || packageModal.forms.length) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
                {(packageModal.enriched_forms || packageModal.forms.map(f => ({ form_number: f, title: f, has_pdf: false }))).map((f) => {
                  const isFormSelected = selectedFormsForPkg.includes(f.form_number);
                  return (
                    <div key={f.form_number} className="court-forms-pkg-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', background: isFormSelected ? 'rgba(0,87,199,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isFormSelected ? 'rgba(0,87,199,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, transition: 'all 0.2s' }}>
                      
                      {/* Checkbox & Details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={isFormSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFormsForPkg(prev => Array.from(new Set([...prev, f.form_number])));
                            } else {
                              setSelectedFormsForPkg(prev => prev.filter(fn => fn !== f.form_number));
                            }
                          }}
                          style={{ width: 18, height: 18, accentColor: '#0057c7', cursor: 'pointer', flexShrink: 0 }}
                        />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (f.has_pdf && f.template_id) {
                                    toast?.(`Downloading ${f.form_number} PDF template...`, 'info');
                                    try {
                                      const res = await api.courtForms.downloadTemplateOriginal(f.template_id);
                                      const blob = res.data;
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `${f.form_number}_template.pdf`;
                                      a.click();
                                      URL.revokeObjectURL(url);
                                    } catch {
                                      if (f.source_url) window.open(f.source_url, '_blank');
                                    }
                                  } else if (f.source_url) {
                                    toast?.(`Downloading official ${f.form_number} form...`, 'info');
                                    window.open(f.source_url, '_blank');
                                  }
                                }}
                                style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', padding: '2px 8px', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                title={`Click to auto-download ${f.form_number} PDF`}
                              >
                                📥 {f.form_number}
                              </button>

                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: f.has_pdf ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: f.has_pdf ? '#4ade80' : '#fbbf24', border: `1px solid ${f.has_pdf ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                                {f.has_pdf ? '🟢 PDF Ready' : '🟡 Upload Needed'}
                              </span>
                            </div>

                            <p
                              onClick={async () => {
                                if (f.has_pdf && f.template_id) {
                                  toast?.(`Downloading ${f.form_number} PDF...`, 'info');
                                  try {
                                    const res = await api.courtForms.downloadTemplateOriginal(f.template_id);
                                    const blob = res.data;
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${f.form_number}_template.pdf`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  } catch {
                                    if (f.source_url) window.open(f.source_url, '_blank');
                                  }
                                } else if (f.source_url) {
                                  window.open(f.source_url, '_blank');
                                }
                              }}
                              style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                              title={`Click to auto-download ${f.form_number}`}
                            >
                              {f.title}
                            </p>
                          </div>
                      </div>

                      {/* Action Buttons: Official Site | Upload PDF | Generate Form */}
                      <div className="court-forms-pkg-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {f.source_url && (
                          <a
                            href={f.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 11, fontWeight: 600, color: '#38bdf8', textDecoration: 'none', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', padding: '5px 9px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}
                            title="Download official blank form PDF from agency site"
                          >
                            🔗 Official Site
                          </a>
                        )}

                        <label style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: uploadingFormNum === f.form_number ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '5px 10px', borderRadius: 8, cursor: uploadingFormNum ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {uploadingFormNum === f.form_number ? 'Uploading...' : f.has_pdf ? '🔄 Replace PDF' : '📤 Upload PDF'}
                          <input
                            type="file"
                            accept=".pdf"
                            style={{ display: 'none' }}
                            disabled={!!uploadingFormNum}
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleUploadFormPdf(f.form_number, e.target.files[0]);
                              }
                            }}
                          />
                        </label>

                        {/* Individual Form Generation Button */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedMatterForPkg) {
                              toast?.('Please select a target Matter at the top first!', 'error');
                              return;
                            }
                            // 1. INSTANT POPUP IN 0ms!
                            const formNum = f.form_number;
                            const formTitle = f.title || formNum;
                            setPackageModal(null);
                            setPdfPreview({
                              loading: true,
                              formNumber: formNum,
                              title: formTitle,
                              formsList: [{ formNumber: formNum, title: formTitle, loading: true }],
                              activeIndex: 0
                            });

                            try {
                              const res = await api.courtForms.generatePackage(packageModal.id, selectedMatterForPkg, [formNum]);
                              const pkgResult = res.data?.data || res.data || res;
                              const createdDraft = pkgResult?.drafts?.[0];

                              if (createdDraft) {
                                try {
                                  const pdfRes = await api.courtForms.generatePdf(createdDraft.id, { form_data: createdDraft.form_data || {} });
                                  const blob = pdfRes.data;
                                  const url = URL.createObjectURL(blob);
                                  const filename = `${formNum}_form.pdf`;

                                  setPdfPreview({
                                    formsList: [{ id: createdDraft.id, formNumber: formNum, title: formTitle, url, blob, filename }],
                                    activeIndex: 0,
                                    formNumber: formNum,
                                    title: formTitle,
                                    url,
                                    blob,
                                    filename
                                  });
                                  toast?.(`Generated prefilled form PDF for ${formNum}!`, 'success');
                                } catch (pdfErr) {
                                  toast?.(pdfErr.message || 'Draft created! View in My Forms.', 'warning');
                                  setPdfPreview(null);
                                  setTab('drafts');
                                }
                              } else {
                                setPdfPreview(null);
                                setTab('drafts');
                              }
                              fetchAll(false);
                            } catch (e) {
                              setPdfPreview(null);
                              toast?.(e.message || `Failed to generate ${formNum}`, 'error');
                            }
                          }}
                          style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#0057c7', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          title={`Generate & Preview prefilled PDF for ${f.form_number}`}
                        >
                          ⚡ Generate Form
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="court-forms-modal-footer" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => setPackageModal(null)} style={sx.btn('ghost')}>Close</button>
              <button
                disabled={!selectedMatterForPkg || selectedFormsForPkg.length === 0 || generatingPkg}
                onClick={async () => {
                  if (!selectedMatterForPkg) {
                    toast?.('Please select a target Matter at the top first!', 'error');
                    return;
                  }
                  if (!selectedFormsForPkg.length) {
                    toast?.('Please select at least one form to generate!', 'error');
                    return;
                  }

                  // 1. INSTANT POPUP IN 0ms!
                  const initialFormsList = selectedFormsForPkg.map(fn => {
                    const match = packageModal.enriched_forms?.find(ef => ef.form_number === fn);
                    return { formNumber: fn, title: match?.title || fn, loading: true };
                  });

                  setPackageModal(null);
                  setPdfPreview({
                    loading: true,
                    formsList: initialFormsList,
                    activeIndex: 0,
                    formNumber: initialFormsList[0].formNumber,
                    title: initialFormsList[0].title
                  });

                  try {
                    const res = await api.courtForms.generatePackage(packageModal.id, selectedMatterForPkg, selectedFormsForPkg);
                    const pkgResult = res.data?.data || res.data || res;
                    const createdDrafts = pkgResult?.drafts || [];
                    const count = pkgResult?.drafts_created || createdDrafts.length || selectedFormsForPkg.length;

                    fetchAll(false);

                    // Build PDF previews for ALL created drafts concurrently with Promise.all for instant loading
                    const readyDrafts = createdDrafts.filter(d => d.template?.pdf_path);
                    const pdfPromises = readyDrafts.map(async (d) => {
                      const formNum = d.template?.form_number || 'Form';
                      const formTitle = d.template?.title || formNum;
                      try {
                        const pdfRes = await api.courtForms.generatePdf(d.id, { form_data: d.form_data || {} });
                        const blob = pdfRes.data;
                        const url = URL.createObjectURL(blob);
                        return {
                          id: d.id,
                          formNumber: formNum,
                          title: formTitle,
                          url,
                          blob,
                          filename: `${formNum}_form.pdf`
                        };
                      } catch (pdfErr) {
                        console.error(`Failed to generate PDF for ${formNum}:`, pdfErr);
                        return null;
                      }
                    });

                    const previewFormsList = (await Promise.all(pdfPromises)).filter(Boolean);

                    if (previewFormsList.length > 0) {
                      setPdfPreview({
                        formsList: previewFormsList,
                        activeIndex: 0,
                        formNumber: previewFormsList[0].formNumber,
                        title: previewFormsList[0].title,
                        url: previewFormsList[0].url,
                        blob: previewFormsList[0].blob,
                        filename: previewFormsList[0].filename
                      });
                      toast?.(`Successfully generated ${count} prefilled form drafts! Switch between preview tabs above.`, 'success');
                    } else {
                      setPdfPreview(null);
                      setTab('drafts');
                      toast?.(`Successfully generated ${count} prefilled form drafts (${selectedFormsForPkg.join(', ')})! Listed below in My Forms.`, 'success');
                    }
                  } catch (e) {
                    console.error('Failed to generate package forms:', e);
                    setPdfPreview(null);
                    toast?.(e.message || 'Failed to generate package', 'error');
                  }
                }}
                style={{ ...sx.btn('primary'), opacity: !selectedMatterForPkg || selectedFormsForPkg.length === 0 || generatingPkg ? 0.5 : 1 }}
              >
                {generatingPkg ? 'Generating Selected Forms...' : `⚡ Generate Selected Forms Package (${selectedFormsForPkg.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0d1f3c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 25px 50px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ef4444' }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>Confirm Deletion</h3>
              <p style={{ fontSize: 14, color: '#8a94a6', margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to delete this {deleteModal.type}? This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, padding: '16px 24px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={() => setDeleteModal(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => {
                const action = deleteModal.type === 'template' ? api.courtForms.deleteTemplate(deleteModal.item.id) : api.courtForms.deleteDraft(deleteModal.item.id);
                action.then(() => { toast?.(`${deleteModal.type === 'template' ? 'Template' : 'Form'} deleted`, 'success'); fetchAll(false); }).catch(() => toast?.('Failed to delete', 'error')).finally(() => setDeleteModal(null));
              }} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Custom Template Dropdown ─────────────────────────────────
function TemplateDropdown({ templates, value, onChange }) {
  const [open, setOpen]   = useState(false);
  const [q, setQ]         = useState('');
  const ref               = useRef(null);
  const inputRef          = useRef(null);
  const selected          = templates.find(t => String(t.id) === String(value));
  const filtered          = templates.filter(t =>
    !q || t.title.toLowerCase().includes(q.toLowerCase()) ||
    t.form_number.toLowerCase().includes(q.toLowerCase())
  );

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
      <button type="button" onClick={() => { setOpen(v => !v); setQ(''); setTimeout(() => inputRef.current?.focus(), 40); }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, padding: '11px 14px', cursor: 'pointer', transition: 'border-color .2s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,87,199,0.6)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = open ? 'rgba(0,87,199,0.7)' : 'rgba(255,255,255,0.12)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(0,87,199,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg>
          </div>
          {selected ? (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.title}</div>
              <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 1 }}>{selected.form_number}</div>
            </div>
          ) : (
            <span style={{ fontSize: 13, color: '#8a94a6' }}>— Choose a template —</span>
          )}
        </div>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8a94a6" strokeWidth={2}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
          <path d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div style={{ position: 'absolute', zIndex: 999, top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#0d1f3c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#8a94a6" strokeWidth={2}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search templates..."
                style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, flex: 1 }}/>
            </div>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '20px', textAlign: 'center', color: '#8a94a6', fontSize: 13 }}>No templates found</div>
              : filtered.map(t => (
                <button key={t.id} type="button" onClick={() => { onChange(String(t.id)); setOpen(false); setQ(''); }}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    background: String(t.id) === String(value) ? 'rgba(0,87,199,0.2)' : 'transparent', border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => { if (String(t.id) !== String(value)) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = String(t.id) === String(value) ? 'rgba(0,87,199,0.2)' : 'transparent'; }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: '#8a94a6', marginTop: 2 }}>{t.form_number}</div>
                  </div>
                  {String(t.id) === String(value) && (
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={2.5}><path d="M5 13l4 4L19 7"/></svg>
                  )}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mapping Tab ──────────────────────────────────────────────
function MappingTab({ templates, toast, onRefreshTemplates }) {
  const [sel,     setSel]     = useState('');
  const [detail,  setDetail]  = useState(null);
  const [maps,    setMaps]    = useState([]);
  const [saving,  setSaving]  = useState(false);

  // Upload state variables
  const [uploadNum, setUploadNum] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadPracticeArea, setUploadPracticeArea] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!sel) return;
    api.courtForms.getTemplate(sel).then(r => { setDetail(r.data); setMaps(r.data?.mappings || []); });
  }, [sel]);

  const [customFields, setCustomFields] = useState([]);

  useEffect(() => {
    api.customFields.list().then(res => {
      if (res && res.data) setCustomFields(res.data);
    }).catch(err => console.error('Failed to load custom fields:', err));
  }, [templates]);



  const SYSTEM_FIELDS_MAP = [
    { key: 'case_title', label: 'Case Title' }, { key: 'case_number', label: 'Case Number' },
    { key: 'plaintiff', label: 'Plaintiff' }, { key: 'defendant', label: 'Defendant' },
    { key: 'court_name', label: 'Court Name' }, { key: 'judge_name', label: 'Judge Name' },
    { key: 'attorney_name', label: 'Attorney Name' }, { key: 'firm_name', label: 'Firm Name' },
    { key: 'client_name', label: 'Client Name' }, { key: 'client_address', label: 'Client Address' },
    { key: 'client_phone', label: 'Client Phone' }, { key: 'client_email', label: 'Client Email' },
    { key: 'filing_date', label: 'Filing Date' }, { key: 'hearing_date', label: 'Hearing Date' },
    { key: 'firm_address', label: 'Firm Address' }, { key: 'firm_phone', label: 'Firm Phone' },
    { key: 'firm_zip', label: 'Firm Zip Code' }, { key: 'court_address', label: 'Court Address' }, 
    { key: 'matter_number', label: 'Matter Number' },
    { key: 'attorney_email', label: 'Attorney Email' },
    ...customFields.map(cf => ({ key: cf.name, label: `${cf.name} (Custom Field)` }))
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);

    // Parse file name (strip extension)
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");

    // Try to split by dash/separator (e.g. "CIV-010 - Request for Dismissal")
    const parts = nameWithoutExt.split(/[-_–—]/);
    let detectedNum = '';
    let detectedTitle = '';

    if (parts.length > 1) {
      detectedNum = parts[0].trim();
      detectedTitle = parts.slice(1).join('-').trim();
    } else {
      // Just one part
      detectedNum = nameWithoutExt.trim();
    }

    // Standardize Form Number (e.g., "civ010" -> "CIV-010" or "CIV110" -> "CIV-110")
    const numRegex = /^([a-zA-Z]{2,4})[-_]?(\d{3})$/;
    const match = detectedNum.replace(/\s+/g, '').match(numRegex);
    if (match) {
      detectedNum = `${match[1].toUpperCase()}-${match[2]}`;
    }

    // Clean up title
    if (detectedTitle.toUpperCase() === detectedNum) {
      detectedTitle = '';
    } else {
      detectedTitle = detectedTitle.replace(/\s+/g, ' ');
    }

    // Smart prefill for standard California Judicial Council forms if filename is just the code
    const JC_FORM_TITLES = {
      'CIV-010': 'Application for Complex Case Designation',
      'CIV-110': 'Request for Dismissal',
      'CIV-120': 'Notice of Entry of Dismissal',
      'CM-010': 'Civil Case Cover Sheet',
      'CM-110': 'Case Management Statement',
      'POS-010': 'Proof of Service of Summons',
      'POS-030': 'Proof of Service by First-Class Mail',
      'MC-025': 'Attachment',
      'SUBP-010': 'Civil Subpoena Duces Tecum',
      'FW-001': 'Request to Waive Court Fees'
    };

    const JC_PRACTICE_AREAS = {
      'CIV-010': 'Civil Litigation',
      'CIV-110': 'Civil Litigation',
      'CIV-120': 'Civil Litigation',
      'CM-010': 'Civil Litigation',
      'CM-110': 'Civil Litigation',
      'POS-010': 'Civil Litigation',
      'POS-030': 'Civil Litigation',
      'MC-025': 'General Practice',
      'SUBP-010': 'Civil Litigation',
      'FW-001': 'General Practice'
    };

    if (!detectedTitle && JC_FORM_TITLES[detectedNum]) {
      detectedTitle = JC_FORM_TITLES[detectedNum];
    }

    const detectedPA = JC_PRACTICE_AREAS[detectedNum] || 'Civil Litigation';

    if (detectedNum) setUploadNum(detectedNum);
    if (detectedTitle) setUploadTitle(detectedTitle);
    if (detectedPA) setUploadPracticeArea(detectedPA);
  };

  const handleDeleteTemplate = async () => {
    if (!sel) return;
    if (!window.confirm(`Are you sure you want to delete form template ${detail?.form_number}? This will delete all its mappings and saved drafts.`)) {
      return;
    }
    try {
      await api.courtForms.deleteTemplate(sel);
      toast?.('Template deleted successfully!', 'success');
      setSel('');
      setDetail(null);
      setMaps([]);
      if (onRefreshTemplates) await onRefreshTemplates();
    } catch (err) {
      toast?.(err.message || 'Error deleting template', 'error');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadNum.trim() || !uploadTitle.trim() || !uploadFile) {
      toast?.('Please enter Form Number, Title, and select a PDF file', 'error');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('form_number', uploadNum.trim());
      fd.append('title', uploadTitle.trim());
      fd.append('practice_area', uploadPracticeArea.trim());
      fd.append('file', uploadFile);

      const res = await api.courtForms.uploadTemplate(fd);
      if (res && res.data) {
        toast?.('Form uploaded and interactive fields parsed successfully!', 'success');
        setUploadNum('');
        setUploadTitle('');
        setUploadPracticeArea('');
        setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (onRefreshTemplates) await onRefreshTemplates();
        setSel(String(res.data.id));
      } else {
        toast?.(res?.error || 'Failed to upload template', 'error');
      }
    } catch (err) {
      toast?.(err.message || 'Error uploading file', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      
      {/* ─── UPLOAD DYNAMIC PDF SECTION ─── */}
      <div style={{ background: 'rgba(56,189,248,0.02)', border: '1px solid rgba(56,189,248,0.12)', borderRadius: 16, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={2}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Upload & Auto-Parse Master PDF</h3>
        </div>
        <p style={{ color: '#8a94a6', fontSize: 12.5, margin: '0 0 18px 0', lineHeight: 1.5 }}>
          Upload a fillable Judicial Council PDF form. The system will read it using `pdf-lib`, extract all input box/checkbox keys, and let you map them.
        </p>

        <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {/* 1. File Input (Top Full Width) */}
          <div style={{ gridColumn: 'span 3' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Select Fillable PDF *</label>
            <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '7px 10px', fontSize: 12, color: '#8a94a6', outline: 'none' }}/>
          </div>

          {/* 2. Form Number */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Form Number *</label>
            <input type="text" placeholder="E.g., CIV-010" value={uploadNum} onChange={e => setUploadNum(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none' }}/>
          </div>

          {/* 3. Form Title */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Form Title *</label>
            <input type="text" placeholder="E.g., Application for Complex Case Designation" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none' }}/>
          </div>

          {/* 4. Practice Area */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Practice Area</label>
            <input type="text" placeholder="E.g., Civil Litigation" value={uploadPracticeArea} onChange={e => setUploadPracticeArea(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none' }}/>
          </div>

          {/* 5. Upload Button */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: '1 / -1' }}>
            <button type="submit" disabled={uploading}
              style={{ width: '100%', height: '40px', background: '#0057c7', color: '#fff', border: 'none', borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1, transition: 'background .2s' }}
              onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = '#0066e0'; }}
              onMouseLeave={e => { if (!uploading) e.currentTarget.style.background = '#0057c7'; }}>
              {uploading ? 'Processing...' : 'Upload & Map'}
            </button>
          </div>
        </form>
      </div>

      {/* ─── SELECT & MAP FIELDS SECTION ─── */}
      <div>
        <p style={{ color: '#8a94a6', fontSize: 13, marginBottom: 24 }}>
          Choose any uploaded form template to configure database bindings. Form fields mapped to system fields will pre-fill automatically for lawyers.
        </p>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Select Template</label>
          <TemplateDropdown templates={templates} value={sel} onChange={setSel} />
        </div>

        {sel && (
          <div style={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <p style={{ fontWeight: 700, color: '#fff', margin: 0, fontSize: 14 }}>Field Mappings</p>
                <p style={{ fontSize: 12, color: '#8a94a6', margin: 0, marginTop: 2 }}>{detail?.form_number} — {maps.length} mapping{maps.length !== 1 ? 's' : ''} configured</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleDeleteTemplate}
                  style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}>
                  Delete Template
                </button>
                <button onClick={() => setMaps(p => [...p, { pdf_field_name: '', system_field_path: '' }])}
                  style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', background: 'rgba(0,87,199,0.2)', color: '#38bdf8', border: '1px solid rgba(0,87,199,0.3)', borderRadius: 8, cursor: 'pointer' }}>
                  + Add Mapping
                </button>
              </div>
            </div>

            {maps.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#8a94a6', fontSize: 13 }}>
                No mappings yet. Click "Add Mapping" to define field connections.
              </div>
            ) : (
              <div>
                {maps.map((m, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ overflow: 'hidden', minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {cleanPdfFieldName(m.pdf_field_name)}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#8a94a6', fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: 2 }} title={m.pdf_field_name}>
                        {m.pdf_field_name}
                      </div>
                    </div>
                    <span style={{ color: '#8a94a6', fontSize: 18, flexShrink: 0 }}>→</span>
                    <select value={m.system_field_path}
                      onChange={e => setMaps(p => p.map((x, j) => j === i ? { ...x, system_field_path: e.target.value } : x))}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none', cursor: 'pointer' }}>
                      <option value="" style={{ color: '#000' }}>— System Field —</option>
                      {SYSTEM_FIELDS_MAP.map(f => <option key={f.key} value={f.key} style={{ color: '#000' }}>{f.label}</option>)}
                    </select>
                    <button onClick={() => setMaps(p => p.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a94a6', padding: 4, flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                      onMouseLeave={e => e.currentTarget.style.color = '#8a94a6'}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={async () => {
                setSaving(true);
                try { await api.courtForms.saveMappings(sel, maps.filter(m => m.pdf_field_name && m.system_field_path)); toast?.('Mappings saved', 'success'); }
                catch { toast?.('Failed to save', 'error'); } finally { setSaving(false); }
              }} disabled={saving}
                style={{ padding: '10px 22px', background: '#0057c7', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save Mappings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
