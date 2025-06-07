//devex-ui/src/data/mockLogs.ts
import { faker } from '@faker-js/faker';

export interface LogLine {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  category: 'event' | 'projection' | 'saga' | 'policy' | 'snapshot';
  tenant_id: string;
}

// Re-export LogLine so consumers don't import the file directly
export type { LogLine };

const LEVELS = ['info','success','warning','error'] as const;
const CATS   = ['event','projection','saga','policy','snapshot'] as const;

export function makeLog(tenant = 'tenant-1'): LogLine {
  return {
    id: faker.string.uuid(),
    timestamp: faker.date.recent().toISOString(),
    level: faker.helpers.arrayElement(LEVELS),
    category: faker.helpers.arrayElement(CATS),
    message: faker.hacker.phrase(),
    tenant_id: tenant
  };
}

// In-memory ring-buffer so handlers can paginate
export const logStore: LogLine[] = Array.from({ length: 250 }, () => makeLog());

export function pushLog(line: LogLine) {
  logStore.unshift(line);
  if (logStore.length > 500) logStore.pop();
}

export function createLogStream(tenant?: string) {
  return {
    subscribe(cb: (l: LogLine) => void) {
      const id = setInterval(() => {
        const l = makeLog(tenant || 'tenant-1');
        pushLog(l);
        cb(l);
      }, 2500);
      return () => clearInterval(id);
    }
  };
}
