const STORAGE_KEY = 'vktori_persistent_matters';
const HISTORY_KEY = 'vktori_status_history';

/**
 * Gets all matters, merging localStorage updates with default data
 */
export const getPersistentCases = () => {
  try {
    const localData = localStorage.getItem(STORAGE_KEY);
    const overrides = localData ? JSON.parse(localData) : {};
    return Object.values(overrides || {});
  } catch (e) {
    console.error('Error loading cases from storage:', e);
    return [];
  }
};

/**
 * Gets a specific matter by ID
 */
export const getPersistentCase = (caseId) => {
  const cases = getPersistentCases();
  return cases.find(c => c.id === caseId) || null;
};

/**
 * Saves updates for a specific matter
 */
export const savePersistentCase = (caseId, updates) => {
  try {
    const localData = localStorage.getItem(STORAGE_KEY);
    const overrides = localData ? JSON.parse(localData) : {};
    
    overrides[caseId] = {
      ...(overrides[caseId] || {}),
      ...updates
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    // Notify same-tab listeners (storage event only fires across tabs)
    window.dispatchEvent(new CustomEvent('vktori-matter-updated', { detail: { caseId, updates } }));
  } catch (e) {
    console.error('Error saving case to storage:', e);
  }
};

/**
 * Gets status history for a matter
 */
export const getStatusHistory = (caseId) => {
  try {
    const localData = localStorage.getItem(`${HISTORY_KEY}_${caseId}`);
    return localData ? JSON.parse(localData) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Saves status history for a matter
 */
export const saveStatusHistory = (caseId, history) => {
  try {
    localStorage.setItem(`${HISTORY_KEY}_${caseId}`, JSON.stringify(history));
  } catch (e) {
    console.error('Error saving history to storage:', e);
  }
};
