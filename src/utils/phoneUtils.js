/**
 * Enterprise USA Phone Number Formatting Utility
 * Standardizes phone numbers to USA formats:
 * - Standard: (123) 456-7890
 * - With US Country Code: +1 (123) 456-7890
 */

export function formatUSPhone(value) {
  if (!value) return '';

  const strVal = String(value).trim();
  const hasPlusOne = strVal.startsWith('+1') || strVal.startsWith('+ 1');
  
  // Extract all numeric digits
  let digits = strVal.replace(/\D/g, '');

  // Handle leading '1' if country code is present (11 digits starting with 1)
  let prefix = '';
  if (hasPlusOne && digits.startsWith('1')) {
    prefix = '+1 ';
    digits = digits.slice(1);
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // Optional: Keep standard format or add +1
    prefix = '+1 ';
    digits = digits.slice(1);
  }

  // Cap at 10 digits for standard US numbers (plus optional extension if longer)
  const coreDigits = digits.slice(0, 10);
  const extDigits = digits.slice(10);

  let formatted = '';
  if (coreDigits.length === 0) {
    return prefix.trim();
  } else if (coreDigits.length <= 3) {
    formatted = `(${coreDigits}`;
  } else if (coreDigits.length <= 6) {
    formatted = `(${coreDigits.slice(0, 3)}) ${coreDigits.slice(3)}`;
  } else {
    formatted = `(${coreDigits.slice(0, 3)}) ${coreDigits.slice(3, 6)}-${coreDigits.slice(6, 10)}`;
  }

  if (extDigits) {
    formatted += ` x${extDigits}`;
  }

  return `${prefix}${formatted}`.trim();
}

/**
 * Live input handler for phone number fields
 */
export function handlePhoneInputChange(e, onChangeCallback) {
  const rawValue = e.target.value;
  const formattedValue = formatUSPhone(rawValue);
  
  e.target.value = formattedValue;
  if (typeof onChangeCallback === 'function') {
    onChangeCallback(e);
  }
  return formattedValue;
}
