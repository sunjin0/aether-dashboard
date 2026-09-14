import { useEffect, useRef, useState } from 'react';
import { getLocale } from '@umijs/max';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export default function useLiveInstance(
  id: string | undefined,
  status: string | undefined,
  active: boolean,
  refresh: () => void,
  refreshHistory: () => void,
) {
  const [connection, setConnection] = useState('connecting');
  const callbacks = useRef({ refresh, refreshHistory });
  callbacks.current = { refresh, refreshHistory };
  useEffect(() => {
    if (
      !active ||
      !id ||
      !status ||
      ['COMPLETED', 'FAILED', 'TERMINATED', 'TIMED_OUT'].includes(status)
    )
      return;
    const controller = new AbortController();
    setConnection('connecting');
    const token = localStorage.getItem('token');
    void fetchEventSource(`/api/agent/workflow/instances/${encodeURIComponent(id)}/events`, {
      headers: {
        'Accept-Language': getLocale(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
      onopen: async (response) => {
        if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream'))
          throw new Error('SSE unavailable');
        setConnection('connected');
      },
      onmessage: () => callbacks.current.refresh(),
      onclose: () => {
        setConnection('reconnecting');
        throw new Error('SSE closed');
      },
      onerror: () => {
        setConnection('reconnecting');
        return 3000;
      },
    }).catch(() => {
      if (!controller.signal.aborted) setConnection('reconnecting');
    });
    // Includes WAITING_USER, WAITING_EVENT, WAITING_SUBFLOW and WAITING_DELAY.
    const timer = window.setInterval(() => {
      callbacks.current.refresh();
      callbacks.current.refreshHistory();
    }, 3000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [id, status, active]);
  return connection;
}
