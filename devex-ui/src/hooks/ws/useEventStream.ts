import { useEffect, useRef } from 'react';
import { API_CONFIG } from '@/data/api';

export function useEventStream<T>(tenant: string, onMsg: (evt: T) => void) {
  const tries = useRef(0);
  const wsRef = useRef<WebSocket>();

  useEffect(() => {
    const url = `${API_CONFIG.wsUrl}?tenant=${tenant}`;

    const connect = () => {
      wsRef.current = new WebSocket(url);
      wsRef.current.onmessage = (e) => onMsg(JSON.parse(e.data));
      wsRef.current.onclose   = () => {
        if (tries.current < 5) {
          tries.current += 1;
          setTimeout(connect, 1_000 * 2 ** (tries.current - 1));
        }
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, [tenant, onMsg]);
}