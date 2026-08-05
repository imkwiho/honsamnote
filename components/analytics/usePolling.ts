'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface PollingState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * 지정한 간격으로 fetcher를 반복 호출한다. 브라우저 탭이 숨김 상태면 폴링을
 * 멈추고, 다시 보이면 즉시 한 번 갱신 후 폴링을 재개한다(스펙 요구사항).
 * 하나의 통계 카드가 실패해도 다른 카드에 영향을 주지 않도록 훅 단위로 독립.
 */
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number): PollingState<T> & { refetch: () => void } {
  const [state, setState] = useState<PollingState<T>>({ data: null, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    try {
      const data = await fetcherRef.current();
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState(prev => ({ data: prev.data, loading: false, error: e instanceof Error ? e.message : '통계를 불러오지 못했습니다.' }));
    }
  }, []);

  useEffect(() => {
    let intervalId: number | null = null;

    function start() {
      if (intervalId !== null) return;
      run();
      intervalId = window.setInterval(run, intervalMs);
    }
    function stop() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    }
    function handleVisibility() {
      if (document.visibilityState === 'visible') start();
      else stop();
    }

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [run, intervalMs]);

  return { ...state, refetch: run };
}
