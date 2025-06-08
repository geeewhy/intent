import { v4 as uuid } from 'uuid';

export interface LogLine {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  category: 'event' | 'projection' | 'saga' | 'policy' | 'snapshot';
  tenant_id: string;
}

const LEVELS = ['info', 'success', 'warning', 'error'] as const;
const CATEGORIES = ['event', 'projection', 'saga', 'policy', 'snapshot'] as const;
const MESSAGES = [
  'System initialized successfully',
  'User authentication failed',
  'Database connection established',
  'API request processed',
  'Payment transaction completed',
  'Order status updated',
  'Inventory levels checked',
  'Email notification sent',
  'Data backup completed',
  'Security audit performed'
];

export function makeLog(overrides?: Partial<LogLine>): LogLine {
  const now = new Date();
  const defaultLog: LogLine = {
    id: uuid(),
    timestamp: now.toISOString(),
    level: LEVELS[Math.floor(Math.random() * LEVELS.length)],
    category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
    message: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
    tenant_id: overrides?.tenant_id || (Math.random() > 0.5 ? 'tenant-1' : 'tenant-2')
  };

  return { ...defaultLog, ...overrides };
}