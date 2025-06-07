export async function setupMocks() {
  if (import.meta.env.VITE_API_MODE === 'mock') {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
}