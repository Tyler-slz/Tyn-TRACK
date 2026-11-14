'use client';

import { useEffect, useState } from 'react';
import { getCurrentTimeFormatted } from './time';

/**
 * Isolated minute-precision local clock hook.
 * Ticks only once per minute (aligned to minute rollover) and on tab/phone wake
 * so parent providers and views never re-render every second.
 */
export function useMinuteClock(): string {
  const [timeStr, setTimeStr] = useState<string>(() => getCurrentTimeFormatted(new Date()));

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    const syncAndSchedule = () => {
      const now = new Date();
      const next = getCurrentTimeFormatted(now);
      setTimeStr((prev) => (prev === next ? prev : next));

      const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50;
      timerId = setTimeout(syncAndSchedule, Math.max(500, msUntilNextMinute));
    };

    syncAndSchedule();

    const handleWake = () => {
      clearTimeout(timerId);
      syncAndSchedule();
    };

    window.addEventListener('visibilitychange', handleWake);
    window.addEventListener('focus', handleWake);

    return () => {
      clearTimeout(timerId);
      window.removeEventListener('visibilitychange', handleWake);
      window.removeEventListener('focus', handleWake);
    };
  }, []);

  return timeStr;
}
