//devex-ui/src/config/apiMode.ts
// Determine API mode with cascade:
// 1. URL param: ?apiMode=mock|real
// 2. localStorage: api_mode
// 3. Environment: VITE_API_MODE
// 4. Default: 'mock'

// Default from environment or fallback to 'mock'
const envDefault = import.meta.env.VITE_API_MODE || 'mock';

// Check URL param
const urlParams = new URLSearchParams(window.location.search);
const urlMode = urlParams.get('apiMode');

// Check localStorage
const storageMode = localStorage.getItem('api_mode');

// Determine mode with cascade
export const apiMode = urlMode || storageMode || envDefault;

// Convenience boolean for conditionals
export const isMock = apiMode === 'mock';

// If URL param is set, update localStorage for persistence
if (urlMode) {
  localStorage.setItem('api_mode', urlMode);
}