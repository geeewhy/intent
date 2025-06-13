type LogLine = {
  timestamp: string;
  level: 'info' | 'error' | 'warning' | 'success';
  message: string;
  category: string;
  tenant_id: string;
};

type Subscriber = (log: LogLine) => void;

const subscribers = new Set<Subscriber>();

export function subscribeToLogs(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function broadcastLog(log: LogLine) {
  for (const fn of subscribers) fn(log);
}