import { useEffect, useRef } from 'react';
import { isMock } from '@/config/apiMode';
import { API_CONFIG } from '@/data/api';
import { createEventStream } from '@/mocks/stores/event.store';
import type { Event } from '@/data/types';

export function useEventStream<T>(tenant: string, onMsg: (evt: T) => void) {
  const tries = useRef(0);
  const wsRef = useRef<WebSocket>();

  useEffect(() => {
    if (isMock) {
      const stream = createEventStream(tenant);
      const unsubscribe = stream.subscribe((evt: Event) => {
        onMsg(evt as T);
      });
      return () => unsubscribe(); // clean up
    }

    const url = `${API_CONFIG.wsUrl}?tenant=${tenant}`;

    const connect = () => {
      wsRef.current = new WebSocket(url);
      wsRef.current.onopen = () => {
        tries.current = 0;
      };
      wsRef.current.onmessage = (e) => {
        onMsg(JSON.parse(e.data));
      };
      wsRef.current.onclose = () => {
        if (tries.current < 5) {
          tries.current += 1;
          setTimeout(connect, 2 ** tries.current * 1000);
        }
      };
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [tenant, onMsg]);
}
