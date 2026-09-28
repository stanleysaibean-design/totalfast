import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { DEFAULT_DIET_ID, findDiet, type DietInfo } from '@/lib/engine';

const STORAGE_KEY = 'total-fast/active-diet';

interface DietState {
  diet: DietInfo;
  setDiet: (id: string) => void;
  /** False until the saved choice has been read from storage. */
  ready: boolean;
}

const DietContext = createContext<DietState | null>(null);

/** Holds the active diet and remembers it between launches. */
export function DietProvider({ children }: PropsWithChildren) {
  const [dietId, setDietId] = useState(DEFAULT_DIET_ID);
  const [ready, setReady] = useState(false);

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

  const value = useMemo(() => ({ diet: findDiet(dietId)!, setDiet, ready }), [dietId, setDiet, ready]);
  return <DietContext value={value}>{children}</DietContext>;
}

export function useDiet(): DietState {
  const ctx = use(DietContext);
  if (!ctx) throw new Error('useDiet must be used inside DietProvider');
  return ctx;
}
