import { createStore } from './createStore';
import { makeLog, type LogLine } from '../factories/log.factory';

export const logStore = createStore<LogLine>(500);
logStore.seed(() => makeLog(), 250);

// Helper function to push a log and maintain the store size
export function pushLog(line: LogLine) {
  logStore.push(line);
}

// Create a log stream that emits logs at regular intervals
export function createLogStream(tenant?: string) {
  return {
    subscribe(callback: (l: LogLine) => void) {
      const id = setInterval(() => {
        const log = makeLog({ tenant_id: tenant || 'tenant-1' });
        pushLog(log);
        callback(log);
      }, 2500);
      return () => clearInterval(id);
    }
  };
}