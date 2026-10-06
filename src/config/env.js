function normalizeBaseUrl(url) {
  if (!url) return '';
  return String(url).replace(/\/+$/, '');
}

// export const API_BASE_URL = normalizeBaseUrl(
//   import.meta.env.VITE_API_BASE_URL || 
//   (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
//     ? `http://${window.location.hostname}:5000/api` 
//     : '')
// );

export const API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL
);

