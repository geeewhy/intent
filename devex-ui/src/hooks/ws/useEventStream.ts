import { useEffect } from 'react';
import { isMock } from '@/config/apiMode';
import { createEventStream } from '@/mocks/stores/event.store';
import { API_CONFIG } from '@/data/api';

export function useEventStream<T>(tenant: string, onMsg: (evt: T) => void) {
  useEffect(() => {
    if (isMock) {
      const stream = createEventStream(tenant);
      const unsub = stream.subscribe((evt) => onMsg(evt as T));
      return () => unsub();
    }

    const url = `${API_CONFIG.baseUrl}/api/events/stream?tenant_id=${tenant}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMsg(data);
      } catch {}
    };

    es.onerror = () => es.close();

    return () => es.close();
  }, [tenant, onMsg]);
}
