//devex-ui/src/config/apiMode.ts
// Determine API mode with cascade:
// 1. URL param: ?apiMode=mock|real
// 2. localStorage: api_mode
// 3. Environment: VITE_API_MODE
// 4. Default: 'mock'

// Default from environment or fallback to 'mock'
const envDefault = import.meta.env.VITE_API_MODE || 'mock';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Variables to store URL and localStorage values
let urlMode = null;
let storageMode = null;

// Only access browser-specific APIs if in browser environment
if (isBrowser) {
  // Check URL param
  const urlParams = new URLSearchParams(window.location.search);
  urlMode = urlParams.get('apiMode');

  // Check localStorage
  storageMode = localStorage.getItem('api_mode');

  // If URL param is set, update localStorage for persistence
  if (urlMode) {
    localStorage.setItem('api_mode', urlMode);
  }
}

// Determine mode with cascade
export const apiMode = urlMode || storageMode || envDefault;

// Convenience boolean for conditionals
export const isMock = apiMode === 'mock';
