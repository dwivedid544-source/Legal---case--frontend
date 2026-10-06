export const PRACTICE_AREA_TEMPLATES = {
  'PI — Auto / property damage': {
    name: 'PI — Auto / property damage',
    defaultRoles: ['Client', 'Opposing Driver', 'Insurance Company', 'Medical Provider', 'Witness'],
    defaultVariables: ['Incident', 'Vehicle', 'Injury', 'Insurance claim', 'Evidence'],
    stages: ['Intake', 'Investigation', 'Treatment', 'Demand', 'Negotiation', 'Litigation', 'Resolution']
  },
  'Catastrophic / product liability': {
    name: 'Catastrophic / product liability',
    defaultRoles: ['Client', 'Manufacturer Org', 'Insurance Carrier', 'Medical Provider', 'Witness', 'Expert Witness'],
    defaultVariables: ['Incident', 'Injury', 'Insurance claim', 'Evidence / photos'],
    stages: ['Intake', 'Investigation & preservation', 'Treatment', 'Demand', 'Litigation', 'Discovery/Experts', 'Resolution']
  },
  'Habitability / premises': {
    name: 'Habitability / premises',
    defaultRoles: ['Client Tenant', 'Landlord Org', 'Property Manager', 'Witness'],
    defaultVariables: ['Property / premises', 'Injury', 'Evidence / photos', 'Incident'],
    stages: ['Intake', 'Inspection & evidence', 'Notices', 'Demand', 'Mediation', 'Litigation', 'Resolution']
  },
  'Employment': {
    name: 'Employment',
    defaultRoles: ['Client', 'Employer Org', 'HR Contact', 'Opposing Counsel', 'Witness', 'Co-Counsel'],
    defaultVariables: ['Employment claim', 'Evidence / photos'],
    stages: ['Intake', 'Investigation', 'Admin charge (CRD/EEOC)', 'Demand', 'Litigation', 'Discovery', 'Resolution']
  },
  'Civil rights / discrimination': {
    name: 'Civil rights / discrimination',
    defaultRoles: ['Client', 'Opposing Org', 'Counsel', 'Witness'],
    defaultVariables: ['Incident', 'Evidence / photos', 'Injury'],
    stages: ['Intake', 'Investigation', 'Demand/Complaint', 'Litigation', 'Discovery', 'Trial', 'Resolution']
  },
  'Medical Malpractice': {
    name: 'Medical Malpractice',
    defaultRoles: ['Client', 'Doctor / Provider', 'Hospital / Clinic', 'Insurance Carrier', 'Expert Witness'],
    defaultVariables: ['Medical Record', 'Treatment Log', 'Expert Opinion', 'Damage Summary'],
    stages: ['Intake', 'Investigation', 'Treatment', 'Demand', 'Negotiation', 'Litigation', 'Resolution']
  },
  'Immigration': {
    name: 'Immigration',
    defaultRoles: ['Petitioner', 'Beneficiary', 'Applicant', 'Derivative', 'Referring Counsel', 'Agency Office'],
    defaultVariables: ['Immigration application', 'Evidence / photos'],
    stages: ['Intake', 'Preparation', 'Filed', 'RFE/Biometrics', 'Interview/Hearing', 'Decision']
  }
};

export const getTemplateForPracticeArea = (areaStr) => {
  if (!areaStr) return PRACTICE_AREA_TEMPLATES['PI — Auto / property damage'];
  const clean = areaStr.toLowerCase();
  if (clean.includes('medical') || clean.includes('malpractice')) {
    return PRACTICE_AREA_TEMPLATES['Medical Malpractice'];
  }
  if (clean.includes('personal injury') || clean.includes('auto') || clean === 'pi') {
    return PRACTICE_AREA_TEMPLATES['PI — Auto / property damage'];
  }
  const key = Object.keys(PRACTICE_AREA_TEMPLATES).find(
    k => k.toLowerCase().includes(clean) || clean.includes(k.toLowerCase())
  );
  return PRACTICE_AREA_TEMPLATES[key] || PRACTICE_AREA_TEMPLATES['PI — Auto / property damage'];
};
