//devex-ui/src/setupMocks.ts

import { isMock } from '@/config/apiMode';

export async function setupMocks() {
  if (!isMock) return;

  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });

  // Load default scenario
  const { loadDefault } = await import('./mocks/scenarios/default');
  loadDefault();

  console.log('Mock service worker started with default scenario');
}
