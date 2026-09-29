import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { DEFAULT_DIET_ID, findDiet, type DietInfo } from '@/lib/engine';

const STORAGE_KEY = 'total-fast/active-diet';

interface DietState {
  diet: DietInfo;
  setDiet: (id: string) => void;
  /**
   * The current local day. It changes at midnight and when the app returns to
   * the foreground on a new day, so date-dependent rules (Lent Fridays)
   * recompute instead of showing yesterday's verdict.
   */
  today: Date;
  /** False until the saved choice has been read from storage. */
  ready: boolean;
}

const DietContext = createContext<DietState | null>(null);

/** Holds the active diet and the current day, and remembers the diet between launches. */
export function DietProvider({ children }: PropsWithChildren) {
  const [dietId, setDietId] = useState(DEFAULT_DIET_ID);
  const [ready, setReady] = useState(false);
  const today = useToday();

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!cancelled && findDiet(saved)) setDietId(saved!);
      })
      .catch(() => {
        // Storage can fail (private browsing on web); the default diet still works.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setDiet = useCallback((id: string) => {
    if (!findDiet(id)) return;
    setDietId(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, []);

  const value = useMemo(() => ({ diet: findDiet(dietId)!, setDiet, today, ready }), [dietId, setDiet, today, ready]);
  return <DietContext value={value}>{children}</DietContext>;
}

export function useDiet(): DietState {
  const ctx = use(DietContext);
  if (!ctx) throw new Error('useDiet must be used inside DietProvider');
  return ctx;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** A Date that is replaced only when the local calendar day changes. */
function useToday(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => setToday((prev) => (dayKey(prev) === dayKey(new Date()) ? prev : new Date()));
    const scheduleMidnight = () => {
      clearTimeout(timer);
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, next.getTime() - now.getTime());
    };
    scheduleMidnight();
    // Timers don't fire while the app is suspended, so also check on resume.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
        scheduleMidnight();
      }
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return today;
}
