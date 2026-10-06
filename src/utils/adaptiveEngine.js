import { formatUSPhone as sharedFormatUSPhone } from './phoneUtils';

/**
 * Declarative Dynamic Adaptive Form Engine
 * Evaluates showWhen, hideWhen, requiredWhen, disabledWhen rules against live form state.
 */

export function evaluateConditionRule(rule, values = {}) {
  if (!rule) return true;
  if (typeof rule === 'function') return Boolean(rule(values));

  if (rule.operator === 'AND' && Array.isArray(rule.conditions)) {
    return rule.conditions.every(c => evaluateConditionRule(c, values));
  }
  if (rule.operator === 'OR' && Array.isArray(rule.conditions)) {
    return rule.conditions.some(c => evaluateConditionRule(c, values));
  }

  const fieldValue = values[rule.field];

  switch (rule.operator) {
    case 'equals':
      return fieldValue === rule.value;
    case 'not_equals':
      return fieldValue !== rule.value;
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(fieldValue);
    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(rule.value || '').toLowerCase());
    case 'truthy':
      return Boolean(fieldValue);
    case 'falsy':
      return !fieldValue;
    default:
      return true;
  }
}

export function evaluateSectionRules(sectionConfig, formValues = {}) {
  if (!sectionConfig) return { isVisible: true, isRequired: false, isDisabled: false };

  const isHidden = sectionConfig.hideWhen ? evaluateConditionRule(sectionConfig.hideWhen, formValues) : false;
  const isVisible = sectionConfig.showWhen ? evaluateConditionRule(sectionConfig.showWhen, formValues) : true;
  const finalVisible = isVisible && !isHidden;

  const isRequired = sectionConfig.requiredWhen ? evaluateConditionRule(sectionConfig.requiredWhen, formValues) : false;
  const isDisabled = sectionConfig.disabledWhen ? evaluateConditionRule(sectionConfig.disabledWhen, formValues) : false;

  return {
    isVisible: finalVisible,
    isRequired,
    isDisabled
  };
}

/**
 * Complete Master Practice Area Configuration Engine (Production Ready)
 */
export const practiceAreaConfigs = {
  'Personal Injury': {
    id: 'personal_injury',
    name: 'Personal Injury',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'vehicle_hub', 'passenger_info', 'insurance_claim', 'timeline_dates'],
    hiddenSections: ['immigration_details', 'employment_info'],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'high', status: 'active' },
    defaultPartyRoles: ['Plaintiff', 'Defendant', 'Witness', 'Driver', 'Passenger', 'Insurance Company'],
    supportedMatterTypes: ['Motor Vehicle Accident', 'Slip and Fall', 'Medical Malpractice', 'Premises Liability', 'Product Liability', 'Wrongful Death'],
    enabledModules: ['Vehicle', 'Driver', 'Passenger', 'Insurance', 'Medical']
  },
  'Immigration': {
    id: 'immigration',
    name: 'Immigration',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'immigration_details', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'passenger_info', 'insurance_claim', 'employment_info'],
    requiredFields: ['retaining_client_name', 'retaining_client_email', 'relief_sought'],
    defaultValues: { priority: 'medium', status: 'active' },
    defaultPartyRoles: ['Applicant', 'Beneficiary', 'Petitioner', 'Respondent', 'Sponsor'],
    supportedMatterTypes: ['Asylum / Refugee', 'Green Card / Permanent Residency', 'H1B / Work Visa', 'Family Sponsorship (I-130)', 'Adjustment of Status (I-485)', 'Naturalization / Citizenship', 'Deportation Defense'],
    enabledModules: ['Applicants', 'Beneficiaries', 'Petitions', 'Family Members']
  },
  'Employment': {
    id: 'employment',
    name: 'Employment',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'employment_info', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'passenger_info', 'immigration_details'],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'medium', status: 'active' },
    defaultPartyRoles: ['Plaintiff', 'Defendant', 'Employer', 'Employee', 'Witness'],
    supportedMatterTypes: ['Wrongful Termination', 'Discrimination / Harassment', 'Wage and Hour Dispute', 'Severance Negotiation', 'Non-Compete Agreement'],
    enabledModules: ['Employer', 'Compensation', 'Termination']
  },
  'Civil Litigation': {
    id: 'civil_litigation',
    name: 'Civil Litigation',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'court_info', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'passenger_info', 'immigration_details', 'employment_info'],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'high', status: 'active' },
    defaultPartyRoles: ['Plaintiff', 'Defendant', 'Witness', 'Opposing Party', 'Organization'],
    supportedMatterTypes: ['Breach of Contract', 'Business Dispute', 'Property Dispute', 'Debt Collection', 'Torts'],
    enabledModules: ['Court', 'Hearings', 'Evidence', 'Deadlines']
  },
  'Family Law': {
    id: 'family_law',
    name: 'Family Law',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'court_info', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'immigration_details', 'employment_info'],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'medium', status: 'active' },
    defaultPartyRoles: ['Petitioner', 'Respondent', 'Spouse', 'Child / Dependent', 'Witness'],
    supportedMatterTypes: ['Divorce / Dissolution', 'Child Custody', 'Child Support', 'Adoption', 'Prenuptial Agreement'],
    enabledModules: ['Court', 'Custody', 'Financials']
  },
  'Corporate Law': {
    id: 'corporate_law',
    name: 'Corporate Law',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'passenger_info', 'immigration_details', 'court_info'],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'medium', status: 'active' },
    defaultPartyRoles: ['Organization', 'Shareholder', 'Director', 'Investor', 'Employer'],
    supportedMatterTypes: ['Entity Formation', 'Mergers & Acquisitions', 'Corporate Governance', 'Contract Drafting', 'Venture Capital'],
    enabledModules: ['Entities', 'Contracts', 'Compliance']
  },
  'Criminal Defense': {
    id: 'criminal_defense',
    name: 'Criminal Defense',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'court_info', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'immigration_details', 'employment_info'],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'high', status: 'active' },
    defaultPartyRoles: ['Defendant', 'Witness', 'Prosecutor', 'Bail Agent'],
    supportedMatterTypes: ['DUI / DWI', 'Felony Charge', 'Misdemeanor Charge', 'Traffic Violation', 'White Collar Crime'],
    enabledModules: ['Court', 'Evidence', 'Bail']
  },
  'Estate Planning': {
    id: 'estate_planning',
    name: 'Estate Planning',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'immigration_details'],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'low', status: 'active' },
    defaultPartyRoles: ['Grantor', 'Beneficiary', 'Executor', 'Trustee'],
    supportedMatterTypes: ['Wills & Trusts', 'Power of Attorney', 'Living Trust', 'Asset Protection'],
    enabledModules: ['Trusts', 'Assets', 'Beneficiaries']
  },
  'Probate': {
    id: 'probate',
    name: 'Probate',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'court_info', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'immigration_details'],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'medium', status: 'active' },
    defaultPartyRoles: ['Executor', 'Beneficiary', 'Heir', 'Claimant'],
    supportedMatterTypes: ['Formal Probate', 'Informal Probate', 'Estate Administration', 'Will Contest'],
    enabledModules: ['Court', 'Estate', 'Claims']
  },
  'Real Estate': {
    id: 'real_estate',
    name: 'Real Estate',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'immigration_details'],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'medium', status: 'active' },
    defaultPartyRoles: ['Buyer', 'Seller', 'Landlord', 'Tenant', 'Lender', 'Broker'],
    supportedMatterTypes: ['Property Purchase / Sale', 'Commercial Lease', 'Title Dispute', 'Zoning & Land Use', 'Eviction Proceedings'],
    enabledModules: ['Properties', 'Leases', 'Transactions']
  },
  'Bankruptcy': {
    id: 'bankruptcy',
    name: 'Bankruptcy',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'court_info', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'immigration_details'],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'high', status: 'active' },
    defaultPartyRoles: ['Debtor', 'Creditor', 'Trustee', 'Judge'],
    supportedMatterTypes: ['Chapter 7 Liquidation', 'Chapter 11 Reorganization', 'Chapter 13 Individual Repayment'],
    enabledModules: ['Court', 'Debts', 'Assets']
  },
  'default': {
    id: 'default',
    name: 'General Law',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'court_info', 'timeline_dates'],
    hiddenSections: [],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'medium', status: 'active' },
    defaultPartyRoles: ['Client', 'Plaintiff', 'Defendant', 'Witness', 'Opposing Party', 'Organization', 'Other'],
    supportedMatterTypes: ['General Practice', 'Consultation', 'Other Legal Matter'],
    enabledModules: ['Court', 'Documents', 'Timeline']
  }
};

/**
 * Master Matter Type Workflow Registry (Extends Practice Area Controller)
 */
export const matterTypeConfigs = {
  // Personal Injury Matter Types
  'Motor Vehicle Accident': {
    id: 'mva',
    name: 'Motor Vehicle Accident',
    practiceArea: 'Personal Injury',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'vehicle_hub', 'passenger_info', 'insurance_claim', 'timeline_dates'],
    hiddenSections: ['immigration_details', 'employment_info'],
    requiredFields: ['retaining_client_name', 'retaining_client_email', 'date_of_loss'],
    defaultValues: { priority: 'high', status: 'active' },
    enabledModules: ['Vehicle', 'Driver', 'Passenger', 'Insurance', 'Medical'],
    workflowSteps: ['General Details', 'Retaining Client', 'Vehicles & Drivers', 'Insurance Claim', 'Medical Providers', 'Documents'],
    customFieldGroups: ['Vehicle Details', 'Insurance Claims', 'Medical Providers']
  },
  'Slip and Fall': {
    id: 'slip_fall',
    name: 'Slip and Fall',
    practiceArea: 'Personal Injury',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'insurance_claim', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'passenger_info', 'immigration_details', 'employment_info'],
    requiredFields: ['retaining_client_name', 'retaining_client_email', 'date_of_loss'],
    defaultValues: { priority: 'high', status: 'active' },
    enabledModules: ['Insurance', 'Medical', 'PropertyOwner'],
    workflowSteps: ['General Details', 'Incident Location', 'Property Owner', 'Medical Treatment', 'Documents'],
    customFieldGroups: ['Property Details', 'Medical Records']
  },
  'Medical Malpractice': {
    id: 'med_mal',
    name: 'Medical Malpractice',
    practiceArea: 'Personal Injury',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'passenger_info', 'immigration_details', 'employment_info'],
    requiredFields: ['retaining_client_name', 'retaining_client_email', 'date_of_loss'],
    defaultValues: { priority: 'high', status: 'active' },
    enabledModules: ['Medical', 'ExpertWitness', 'Insurance'],
    workflowSteps: ['General Details', 'Provider Info', 'Medical Expert Review', 'Damages', 'Documents'],
    customFieldGroups: ['Medical Records', 'Expert Review']
  },
  'Wrongful Death': {
    id: 'wrongful_death',
    name: 'Wrongful Death',
    practiceArea: 'Personal Injury',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'timeline_dates', 'court_info'],
    hiddenSections: ['vehicle_hub', 'immigration_details', 'employment_info'],
    requiredFields: ['retaining_client_name', 'retaining_client_email', 'date_of_loss'],
    defaultValues: { priority: 'high', status: 'active' },
    enabledModules: ['Estate', 'Beneficiaries', 'Insurance'],
    workflowSteps: ['General Details', 'Estate Representative', 'Beneficiaries', 'Incident Summary', 'Documents'],
    customFieldGroups: ['Estate Info', 'Damages']
  },

  // Immigration Matter Types
  'Green Card / Permanent Residency': {
    id: 'green_card',
    name: 'Green Card / Permanent Residency',
    practiceArea: 'Immigration',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'immigration_details', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'passenger_info', 'insurance_claim', 'employment_info'],
    requiredFields: ['retaining_client_name', 'retaining_client_email', 'relief_sought'],
    defaultValues: { priority: 'medium', status: 'active' },
    enabledModules: ['Applicants', 'Beneficiaries', 'Petitions', 'Family Members'],
    workflowSteps: ['General Info', 'Applicant Profile', 'Petitioner Info', 'I-485 Petition', 'Supporting Documents'],
    customFieldGroups: ['Immigration History', 'Travel History']
  },
  'Asylum / Refugee': {
    id: 'asylum',
    name: 'Asylum / Refugee',
    practiceArea: 'Immigration',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'immigration_details', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'passenger_info', 'insurance_claim', 'employment_info'],
    requiredFields: ['retaining_client_name', 'retaining_client_email', 'relief_sought'],
    defaultValues: { priority: 'high', status: 'active' },
    enabledModules: ['Applicants', 'Evidence', 'CountryConditions'],
    workflowSteps: ['General Info', 'Applicant Profile', 'Persecution Narrative', 'Country Conditions Evidence', 'Submission'],
    customFieldGroups: ['Persecution History', 'Biometrics']
  },
  'H1B / Work Visa': {
    id: 'h1b_visa',
    name: 'H1B / Work Visa',
    practiceArea: 'Immigration',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'immigration_details', 'employment_info', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'passenger_info', 'insurance_claim'],
    requiredFields: ['retaining_client_name', 'retaining_client_email', 'relief_sought'],
    defaultValues: { priority: 'medium', status: 'active' },
    enabledModules: ['Employer', 'Petitions', 'LCA'],
    workflowSteps: ['General Info', 'Employer Sponsor', 'Position Details', 'LCA Filing', 'USCIS Submission'],
    customFieldGroups: ['Employment Position', 'Salary Breakdown']
  },
  'Deportation Defense': {
    id: 'deportation_defense',
    name: 'Deportation Defense',
    practiceArea: 'Immigration',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'immigration_details', 'court_info', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'passenger_info', 'insurance_claim'],
    requiredFields: ['retaining_client_name', 'retaining_client_email', 'relief_sought'],
    defaultValues: { priority: 'high', status: 'active' },
    enabledModules: ['ImmigrationCourt', 'Bonds', 'ReliefApplications'],
    workflowSteps: ['General Info', 'Detention & Notice to Appear', 'Master Calendar Hearing', 'Individual Hearing', 'Relief Filings'],
    customFieldGroups: ['Court Proceedings', 'Relief Grounds']
  },

  // Employment Matter Types
  'Wrongful Termination': {
    id: 'wrongful_termination',
    name: 'Wrongful Termination',
    practiceArea: 'Employment',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'employment_info', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'passenger_info', 'immigration_details'],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'high', status: 'active' },
    enabledModules: ['Employer', 'Compensation', 'Termination'],
    workflowSteps: ['General Details', 'Employer Details', 'Employment History', 'Termination Incident', 'EEOC Filing'],
    customFieldGroups: ['Workplace Details', 'Damages']
  },
  'Discrimination / Harassment': {
    id: 'discrimination',
    name: 'Discrimination / Harassment',
    practiceArea: 'Employment',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'employment_info', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'passenger_info', 'immigration_details'],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'high', status: 'active' },
    enabledModules: ['Employer', 'ProtectedClasses', 'Evidence'],
    workflowSteps: ['General Details', 'Employer Details', 'Protected Class Basis', 'Incident Log', 'EEOC / DFEH Charge'],
    customFieldGroups: ['Harassment Logs', 'Witnesses']
  },

  // Civil Litigation Matter Types
  'Breach of Contract': {
    id: 'breach_contract',
    name: 'Breach of Contract',
    practiceArea: 'Civil Litigation',
    visibleSections: ['general_details', 'retaining_client', 'matter_parties', 'court_info', 'timeline_dates'],
    hiddenSections: ['vehicle_hub', 'passenger_info', 'immigration_details', 'employment_info'],
    requiredFields: ['retaining_client_name', 'retaining_client_email'],
    defaultValues: { priority: 'medium', status: 'active' },
    enabledModules: ['Court', 'Hearings', 'Evidence', 'Deadlines', 'Contracts'],
    workflowSteps: ['General Details', 'Parties', 'Contract Terms', 'Breach Incidents', 'Court Complaint'],
    customFieldGroups: ['Contract Specs', 'Damages Calculation']
  }
};

export function getPracticeAreaConfig(practiceAreaName) {
  if (!practiceAreaName) return practiceAreaConfigs['default'];
  return practiceAreaConfigs[practiceAreaName] || practiceAreaConfigs['default'];
}

export function getMatterTypeConfig(matterTypeName) {
  if (!matterTypeName) return null;
  return matterTypeConfigs[matterTypeName] || null;
}

export function getCombinedMatterConfig(practiceAreaName, matterTypeName) {
  const paConfig = getPracticeAreaConfig(practiceAreaName);
  const mtConfig = getMatterTypeConfig(matterTypeName);

  if (!mtConfig) return paConfig;

  // Merge Practice Area + Matter Type config (Matter Type extends Practice Area)
  const visibleSections = Array.from(new Set([...(paConfig.visibleSections || []), ...(mtConfig.visibleSections || [])]));
  const hiddenSections = (mtConfig.hiddenSections || []).filter(s => !(mtConfig.visibleSections || []).includes(s));
  const requiredFields = Array.from(new Set([...(paConfig.requiredFields || []), ...(mtConfig.requiredFields || [])]));
  const defaultValues = { ...paConfig.defaultValues, ...mtConfig.defaultValues };
  const enabledModules = Array.from(new Set([...(paConfig.enabledModules || []), ...(mtConfig.enabledModules || [])]));

  return {
    ...paConfig,
    ...mtConfig,
    visibleSections,
    hiddenSections,
    requiredFields,
    defaultValues,
    enabledModules,
    workflowSteps: mtConfig.workflowSteps || ['General Details', 'Parties', 'Timeline', 'Documents']
  };
}

export function isSectionVisibleForPracticeArea(sectionId, practiceAreaName, matterTypeName) {
  const combined = getCombinedMatterConfig(practiceAreaName, matterTypeName);
  
  if (combined.hiddenSections && combined.hiddenSections.includes(sectionId)) {
    return false;
  }
  if (combined.visibleSections && combined.visibleSections.includes(sectionId)) {
    return true;
  }
  return true;
}

export function isSectionVisibleForMatter(sectionId, practiceAreaName, matterTypeName) {
  return isSectionVisibleForPracticeArea(sectionId, practiceAreaName, matterTypeName);
}

/**
 * Registry of Matter Form Sections with rule-driven visibility logic
 */
export const defaultMatterFormSections = [
  {
    id: 'general_details',
    title: 'General Matter Information',
    icon: '⚖️',
    showWhen: null
  },
  {
    id: 'retaining_client',
    title: 'Retaining Client',
    icon: '👤',
    badge: 'RETAINING CLIENT',
    showWhen: null
  },
  {
    id: 'court_info',
    title: 'Court & Docket Information',
    icon: '🏛️',
    showWhen: {
      operator: 'OR',
      conditions: [
        { field: 'has_court_filing', operator: 'equals', value: true },
        { field: 'litigation_stage', operator: 'in', value: ['filed', 'litigation', 'trial', 'hearing'] },
        { field: 'practice_area', operator: 'in', value: ['Civil Litigation', 'Criminal Defense', 'Family Law'] }
      ]
    }
  },
  {
    id: 'timeline_dates',
    title: 'Filing Dates & Key Timeline',
    icon: '📅',
    showWhen: {
      field: 'track_dates', operator: 'equals', value: true
    }
  },
  {
    id: 'vehicle_hub',
    title: 'Vehicles Involved (Vehicle Module Ready)',
    icon: '🚘',
    badge: 'VEHICLE MODULE',
    showWhen: { field: 'vehiclesInvolved', operator: 'equals', value: true }
  },
  {
    id: 'passenger_info',
    title: 'Passenger Details (Passenger Module Ready)',
    icon: '👥',
    badge: 'PASSENGER MODULE',
    showWhen: { field: 'passengersInvolved', operator: 'equals', value: true }
  },
  {
    id: 'insurance_claim',
    title: 'Insurance Claim Details',
    icon: '🛡️',
    badge: 'INSURANCE MODULE',
    showWhen: { field: 'insuranceInvolved', operator: 'equals', value: true }
  },
  {
    id: 'immigration_details',
    title: 'Immigration Relief Details',
    icon: '🌐',
    badge: 'IMMIGRATION MODULE',
    showWhen: { field: 'practice_area', operator: 'equals', value: 'Immigration' }
  }
];

/**
 * Master Dynamic Custom Field Registry & Engine
 */
export const customFieldRegistry = [
  // Immigration Field Group
  {
    id: 'cf_country_of_birth',
    name: 'cf_country_of_birth',
    label: 'Country of Birth',
    type: 'country',
    placeholder: 'Select Country of Birth...',
    group: 'Immigration Details',
    practiceArea: 'Immigration',
    showWhen: { field: 'practice_area', operator: 'equals', value: 'Immigration' },
    required: true
  },
  {
    id: 'cf_alien_number',
    name: 'cf_alien_number',
    label: 'Alien Registration Number (A-Number)',
    type: 'text',
    placeholder: 'A-123456789',
    group: 'Immigration Details',
    practiceArea: 'Immigration',
    showWhen: { field: 'practice_area', operator: 'equals', value: 'Immigration' }
  },
  {
    id: 'cf_passport_number',
    name: 'cf_passport_number',
    label: 'Passport Number',
    type: 'text',
    placeholder: 'Enter Passport #',
    group: 'Immigration Details',
    practiceArea: 'Immigration',
    showWhen: { field: 'practice_area', operator: 'equals', value: 'Immigration' }
  },

  // Vehicle Details Field Group
  {
    id: 'cf_vehicle_make',
    name: 'cf_vehicle_make',
    label: 'Vehicle Make',
    type: 'text',
    placeholder: 'E.g., Toyota',
    group: 'Vehicle Details',
    practiceArea: 'Personal Injury',
    showWhen: { field: 'vehiclesInvolved', operator: 'equals', value: true }
  },
  {
    id: 'cf_vehicle_model',
    name: 'cf_vehicle_model',
    label: 'Vehicle Model',
    type: 'text',
    placeholder: 'E.g., Camry',
    group: 'Vehicle Details',
    practiceArea: 'Personal Injury',
    showWhen: { field: 'vehiclesInvolved', operator: 'equals', value: true }
  },
  {
    id: 'cf_vin_number',
    name: 'cf_vin_number',
    label: 'VIN (Vehicle Identification Number)',
    type: 'text',
    placeholder: '17-digit VIN',
    group: 'Vehicle Details',
    practiceArea: 'Personal Injury',
    showWhen: { field: 'vehiclesInvolved', operator: 'equals', value: true }
  },
  {
    id: 'cf_license_plate',
    name: 'cf_license_plate',
    label: 'License Plate #',
    type: 'text',
    placeholder: 'State & Plate Number',
    group: 'Vehicle Details',
    practiceArea: 'Personal Injury',
    showWhen: { field: 'vehiclesInvolved', operator: 'equals', value: true }
  },

  // Insurance Field Group
  {
    id: 'cf_insurance_company',
    name: 'cf_insurance_company',
    label: 'Insurance Provider Name',
    type: 'text',
    placeholder: 'E.g., State Farm / Geico',
    group: 'Insurance Details',
    practiceArea: 'Personal Injury',
    showWhen: { field: 'insuranceInvolved', operator: 'equals', value: true }
  },
  {
    id: 'cf_policy_number',
    name: 'cf_policy_number',
    label: 'Policy / Claim Number',
    type: 'text',
    placeholder: 'Policy or Claim #',
    group: 'Insurance Details',
    practiceArea: 'Personal Injury',
    showWhen: { field: 'insuranceInvolved', operator: 'equals', value: true }
  },

  // Employment Field Group
  {
    id: 'cf_employer_name',
    name: 'cf_employer_name',
    label: 'Employer Organization Name',
    type: 'text',
    placeholder: 'E.g., Acme Corp',
    group: 'Employment Information',
    practiceArea: 'Employment',
    showWhen: { field: 'practice_area', operator: 'equals', value: 'Employment' }
  },
  {
    id: 'cf_job_position',
    name: 'cf_job_position',
    label: 'Position / Job Title',
    type: 'text',
    placeholder: 'Job Title',
    group: 'Employment Information',
    practiceArea: 'Employment',
    showWhen: { field: 'practice_area', operator: 'equals', value: 'Employment' }
  },
  {
    id: 'cf_salary_amount',
    name: 'cf_salary_amount',
    label: 'Annual Salary / Wage Rate',
    type: 'currency',
    placeholder: '$0.00',
    group: 'Employment Information',
    practiceArea: 'Employment',
    showWhen: { field: 'practice_area', operator: 'equals', value: 'Employment' }
  },
  {
    id: 'cf_eeoc_charge_number',
    name: 'cf_eeoc_charge_number',
    label: 'EEOC Charge / DFEH Case Number',
    type: 'text',
    placeholder: 'Charge / Case #',
    group: 'Employment Information',
    practiceArea: 'Employment',
    showWhen: { field: 'practice_area', operator: 'equals', value: 'Employment' }
  },

  // Party Type Specific Custom Fields
  {
    id: 'cf_party_driver_license',
    name: 'cf_party_driver_license',
    label: 'Driver License Number',
    type: 'text',
    placeholder: 'Driver License #',
    group: 'Party Information',
    partyType: 'Driver'
  },
  {
    id: 'cf_party_witness_statement',
    name: 'cf_party_witness_statement',
    label: 'Witness Initial Statement Summary',
    type: 'textarea',
    placeholder: 'Enter witness account of incident...',
    group: 'Party Information',
    partyType: 'Witness'
  }
];

export function getCustomFieldsForMatter(practiceArea, matterType, currentFormState = {}) {
  const currentPA = practiceArea || currentFormState.practice_area || currentFormState.type;
  return customFieldRegistry.filter(field => {
    if (field.practiceArea && field.practiceArea !== currentPA) return false;
    if (field.matterType && field.matterType !== matterType) return false;
    const rules = evaluateSectionRules({ showWhen: field.showWhen, hideWhen: field.hideWhen }, currentFormState);
    return rules.isVisible;
  });
}

export function getCustomFieldsForParty(partyRole, partyType, currentFormState = {}) {
  return customFieldRegistry.filter(field => {
    if (field.partyType && field.partyType !== partyRole && field.partyType !== partyType) return false;
    const rules = evaluateSectionRules({ showWhen: field.showWhen, hideWhen: field.hideWhen }, currentFormState);
    return rules.isVisible;
  });
}

/**
 * Master Party Role Dedicated Form Configuration Registry
 */
export const partyRoleFormConfigs = {
  'Witness': {
    role: 'Witness',
    title: 'Witness Information & Account',
    badgeClass: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    fields: [
      { name: 'statement_summary', label: 'Statement Summary', type: 'textarea', placeholder: 'Enter witness account of incident...' },
      { name: 'witness_location', label: 'Witness Location at Time of Incident', type: 'text', placeholder: 'E.g., North-West corner of main intersection' },
      { name: 'witness_type', label: 'Witness Type', type: 'select', options: ['Eye Witness', 'Expert Witness', 'Character Witness', 'Corroborating Witness'] },
      { name: 'availability', label: 'Trial / Deposition Availability', type: 'text', placeholder: 'E.g., Available weekdays / Remote only' },
      { name: 'relationship_to_case', label: 'Relationship to Parties', type: 'text', placeholder: 'E.g., Bystander / Co-worker / Neighbor' }
    ]
  },
  'Driver': {
    role: 'Driver',
    title: 'Driver License & Vehicle Details',
    badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    fields: [
      { name: 'government_id', label: 'Driver License Number', type: 'text', placeholder: 'License #' },
      { name: 'license_state', label: 'License State / Jurisdiction', type: 'text', placeholder: 'E.g., CA / NY' },
      { name: 'license_expiry', label: 'License Expiration Date', type: 'date' },
      { name: 'insurance_company', label: 'Auto Insurance Company', type: 'text', placeholder: 'E.g., Geico / State Farm' },
      { name: 'insurance_number', label: 'Policy / Claim Number', type: 'text', placeholder: 'Policy or Claim #' },
      { name: 'vehicle_assignment', label: 'Assigned Vehicle (Make / Model)', type: 'text', placeholder: 'E.g., 2022 Honda Civic' }
    ]
  },
  'Passenger': {
    role: 'Passenger',
    title: 'Passenger Position & Injury Details',
    badgeClass: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    fields: [
      { name: 'vehicle_assignment', label: 'Assigned Vehicle', type: 'text', placeholder: 'Vehicle occupied during incident' },
      { name: 'seat_position', label: 'Seat Position', type: 'select', options: ['Front Passenger', 'Rear Left', 'Rear Right', 'Rear Center', 'Third Row'] },
      { name: 'injury_status', label: 'Injury Status', type: 'select', options: ['No Injury', 'Minor Injuries', 'Severe / Hospitalized', 'Fatal'] },
      { name: 'medical_transport', label: 'Ambulance / ER Transport?', type: 'select', options: ['No', 'Yes - Ambulance', 'Yes - Self Transport', 'Air Ambulance'] }
    ]
  },
  'Employer': {
    role: 'Employer',
    title: 'Employer & Workplace Information',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    fields: [
      { name: 'company_name', label: 'Company / Organization Name', type: 'text', placeholder: 'E.g., Acme Corp' },
      { name: 'job_title', label: 'Employee Position / Job Title', type: 'text', placeholder: 'Job Title' },
      { name: 'department', label: 'Department / Unit', type: 'text', placeholder: 'E.g., Engineering / HR' },
      { name: 'supervisor', label: 'Direct Supervisor Name', type: 'text', placeholder: 'Supervisor Name' },
      { name: 'work_phone', label: 'Work Phone Number', type: 'tel', placeholder: '+1 (555) 000-0000' }
    ]
  },
  'Insurance Company': {
    role: 'Insurance Company',
    title: 'Insurance Policy & Adjuster Details',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    fields: [
      { name: 'company_name', label: 'Insurance Provider Name', type: 'text', placeholder: 'E.g., State Farm Insurance' },
      { name: 'insurance_number', label: 'Policy / Claim Number', type: 'text', placeholder: 'Policy or Claim #' },
      { name: 'adjuster_name', label: 'Assigned Adjuster Name', type: 'text', placeholder: 'Adjuster Full Name' },
      { name: 'adjuster_phone', label: 'Adjuster Phone Number', type: 'tel', placeholder: '+1 (555) 000-0000' },
      { name: 'adjuster_email', label: 'Adjuster Email Address', type: 'email', placeholder: 'adjuster@insurance.com' }
    ]
  },
  'Applicant': {
    role: 'Applicant',
    title: 'Applicant Immigration & Identity Profile',
    badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    fields: [
      { name: 'country_of_birth', label: 'Country of Birth', type: 'country', placeholder: 'Select Country' },
      { name: 'citizenship', label: 'Country of Citizenship', type: 'text', placeholder: 'Citizenship Country' },
      { name: 'passport_number', label: 'Passport Number', type: 'text', placeholder: 'Passport #' },
      { name: 'alien_number', label: 'Alien Registration Number (A-Number)', type: 'text', placeholder: 'A-123456789' }
    ]
  },
  'Beneficiary': {
    role: 'Beneficiary',
    title: 'Beneficiary Relationship & Eligibility',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    fields: [
      { name: 'relationship', label: 'Relationship to Principal', type: 'text', placeholder: 'E.g., Spouse / Child / Parent' },
      { name: 'eligibility', label: 'Eligibility Category', type: 'text', placeholder: 'E.g., Immediate Relative (IR-1)' },
      { name: 'country_of_birth', label: 'Country of Birth', type: 'country', placeholder: 'Country of Birth' }
    ]
  },
  'Petitioner': {
    role: 'Petitioner',
    title: 'Petitioner Filing Details',
    badgeClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    fields: [
      { name: 'petition_type', label: 'Petition Type / Form', type: 'text', placeholder: 'E.g., I-130 / I-140 / I-360' },
      { name: 'petition_number', label: 'USCIS Receipt / Petition Number', type: 'text', placeholder: 'Receipt #' }
    ]
  },
  'Respondent': {
    role: 'Respondent',
    title: 'Respondent Legal & Case Position',
    badgeClass: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    fields: [
      { name: 'case_position', label: 'Case Position / Defense Grounds', type: 'text', placeholder: 'E.g., Contested / Motion to Dismiss' },
      { name: 'representation_status', label: 'Legal Representation Status', type: 'select', options: ['Represented by Counsel', 'Pro Se', 'Seeking Counsel'] }
    ]
  },
  'Spouse': {
    role: 'Spouse',
    title: 'Spouse Personal & Marriage Information',
    badgeClass: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
    fields: [
      { name: 'date_of_birth', label: 'Date of Birth', type: 'date' },
      { name: 'marriage_date', label: 'Date of Marriage', type: 'date' },
      { name: 'country_of_birth', label: 'Country of Birth', type: 'country', placeholder: 'Country of Birth' },
      { name: 'passport_number', label: 'Passport Number', type: 'text', placeholder: 'Passport #' },
      { name: 'relationship_status', label: 'Current Status', type: 'select', options: ['Married', 'Legally Separated', 'Divorce Pending'] }
    ]
  },
  'Child / Dependent': {
    role: 'Child / Dependent',
    title: 'Child & Dependent Details',
    badgeClass: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    fields: [
      { name: 'date_of_birth', label: 'Date of Birth', type: 'date' },
      { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
      { name: 'school_name', label: 'Current School / Institution', type: 'text', placeholder: 'School Name' },
      { name: 'relationship', label: 'Relationship', type: 'select', options: ['Biological Child', 'Step-Child', 'Adopted Child', 'Legal Ward'] },
      { name: 'guardian_name', label: 'Primary Custodial Guardian', type: 'text', placeholder: 'Guardian Full Name' }
    ]
  }
};

export function getPartyRoleFormConfig(roleName) {
  if (!roleName) return null;
  return partyRoleFormConfigs[roleName] || null;
}

export function formatUSPhone(value) {
  return sharedFormatUSPhone(value);
}

export function serializeId(ssn, type, number, state, country, issue, expiry) {
  const parts = [];
  if (ssn && ssn.trim()) {
    parts.push(`SSN: ${ssn.trim()}`);
  }
  if (type && type !== 'none' && number && number.trim()) {
    let typeLabel = type === 'drivers_license' ? 'DL' : type === 'state_id' ? 'ID' : 'Passport';
    let detail = number.trim();
    if (type === 'passport') {
      const countryStr = country ? `Country: ${country}` : '';
      const issueStr = issue ? `Issued: ${issue}` : '';
      const expiryStr = expiry ? `Expires: ${expiry}` : '';
      const subparts = [countryStr, issueStr, expiryStr].filter(Boolean);
      detail = `${detail} (${subparts.join(', ')})`;
    } else {
      const stateStr = state ? ` (${state})` : '';
      detail = `${detail}${stateStr}`;
    }
    parts.push(`${typeLabel}: ${detail}`);
  }
  return parts.join(' | ');
}

export function deserializeId(str) {
  const result = {
    ssn: '',
    id_type: 'none',
    id_number: '',
    id_state: '',
    id_country: '',
    id_issue_date: '',
    id_expiry_date: '',
  };
  if (!str) return result;
  
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      return { ...result, ...parsed };
    } catch (e) {}
  }
  
  const parts = str.split(' | ');
  parts.forEach(part => {
    if (part.startsWith('SSN: ')) {
      result.ssn = part.substring(5).trim();
    } else if (part.startsWith('DL: ') || part.startsWith('ID: ')) {
      result.id_type = part.startsWith('DL: ') ? 'drivers_license' : 'state_id';
      const detail = part.substring(4).trim();
      const match = detail.match(/(.*?)(?:\s*\((.*?)\))?$/);
      if (match) {
        result.id_number = match[1].trim();
        result.id_state = match[2] ? match[2].trim() : '';
      }
    } else if (part.startsWith('Passport: ')) {
      result.id_type = 'passport';
      const detail = part.substring(10).trim();
      const match = detail.match(/(.*?)(?:\s*\((.*?)\))?$/);
      if (match) {
        result.id_number = match[1].trim();
        const meta = match[2] || '';
        const metaParts = meta.split(', ');
        metaParts.forEach(mp => {
          if (mp.startsWith('Country: ')) result.id_country = mp.substring(9).trim();
          else if (mp.startsWith('Issued: ')) result.id_issue_date = mp.substring(8).trim();
          else if (mp.startsWith('Expires: ')) result.id_expiry_date = mp.substring(9).trim();
        });
      }
    }
  });
  
  if (!result.ssn && !result.id_number && str.trim()) {
    if (str.toLowerCase().includes('ssn') || str.replace(/[^\d]/g, '').length === 9) {
      result.ssn = str.trim();
    } else {
      result.id_type = 'drivers_license';
      result.id_number = str.trim();
    }
  }
  
  return result;
}


