/**
 * Central Date & Time formatting utility for PST (Pacific Standard Time / America/Los_Angeles).
 * Ensures all timestamps across the application strictly render in PST timezone
 * with 12-hour AM/PM format, independent of user's device/browser timezone.
 */

const PST_TIMEZONE = 'America/Los_Angeles';

/**
 * Format a date string or Date object into PST date (e.g. "Aug 5, 2026")
 */
export function formatPSTDate(dateInput, options = {}) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      timeZone: PST_TIMEZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...options,
    });
  } catch (err) {
    return '—';
  }
}

/**
 * Format a date string or Date object into PST time with 12-hour AM/PM format (e.g. "02:30 PM")
 */
export function formatPSTTime(dateInput, options = {}) {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
      timeZone: PST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...options,
    });
  } catch (err) {
    return '';
  }
}

/**
 * Format a date string or Date object into PST date and time combined (e.g. "Aug 5, 2026 02:30 PM PST")
 */
export function formatPSTDateTime(dateInput, includeTimezoneSuffix = false) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    const dateStr = formatPSTDate(d);
    const timeStr = formatPSTTime(d);
    if (!timeStr) return dateStr;
    return `${dateStr} ${timeStr}${includeTimezoneSuffix ? ' PST' : ''}`;
  } catch (err) {
    return '—';
  }
}
