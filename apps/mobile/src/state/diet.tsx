import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { DEFAULT_DIET_ID, findDiet, resolveCalendar, type DietInfo } from '@/lib/engine';

const STORAGE_KEY = 'total-fast/active-diet';
const CALENDARS_KEY = 'total-fast/calendar-choices';

interface DietState {
  diet: DietInfo;
  setDiet: (id: string) => void;
  /** Calendar the active diet uses (e.g. Old or New Calendar for Orthodox fasting). */
  calendar: string | undefined;
  /** The calendar a given diet uses, whether or not it is active. */
  calendarFor: (dietId: string) => string | undefined;
  /** Choose the calendar for a diet that offers a choice. */
  setCalendar: (dietId: string, calendar: string) => void;
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
  const [calendars, setCalendars] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const today = useToday();

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.multiGet([STORAGE_KEY, CALENDARS_KEY])
      .then(([[, saved], [, savedCalendars]]) => {
        if (cancelled) return;
        if (findDiet(saved)) setDietId(saved!);
        const parsed = savedCalendars ? JSON.parse(savedCalendars) : null;
        if (parsed && typeof parsed === 'object') setCalendars(parsed);
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

  const setCalendar = useCallback((id: string, calendar: string) => {
    const diet = findDiet(id);
    if (!diet || resolveCalendar(diet.ruleSet, calendar) !== calendar) return;
    setCalendars((prev) => {
      const next = { ...prev, [id]: calendar };
      AsyncStorage.setItem(CALENDARS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const calendarFor = useCallback(
    (id: string) => {
      const diet = findDiet(id);
      return diet ? resolveCalendar(diet.ruleSet, calendars[id]) : undefined;
    },
    [calendars],
  );

  const value = useMemo(
    () => ({ diet: findDiet(dietId)!, setDiet, calendar: calendarFor(dietId), calendarFor, setCalendar, today, ready }),
    [dietId, setDiet, calendarFor, setCalendar, today, ready],
  );
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
