import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { westernLent, type FastingSeason } from '@total-fast/engine';

const STORAGE_KEY = 'total-fast/reminders';
const CHANNEL_ID = 'fasting-calendar';

/** Local reminders work on iOS and Android only; the web build hides the switches. */
export const REMINDERS_SUPPORTED = Platform.OS !== 'web';

if (REMINDERS_SUPPORTED) {
  // Show a reminder even when it arrives while the app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** Stable key for one season on one calendar, e.g. "orthodox-julian:great-lent:2027-03-15". */
export function seasonKey(calendar: string, season: FastingSeason): string {
  const s = season.start;
  return `${calendar}:${season.id}:${s.getFullYear()}-${s.getMonth() + 1}-${s.getDate()}`;
}

type Saved = Record<string, string[]>;

async function load(): Promise<Saved> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Keys of the seasons that have reminders scheduled. */
export async function scheduledSeasonKeys(): Promise<Set<string>> {
  return new Set(Object.keys(await load()));
}

/** Asks for notification permission if needed. Returns false if the user says no. */
async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

interface Reminder {
  date: Date;
  title: string;
  body: string;
}

const at = (day: Date, hour: number, offsetDays = 0) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate() + offsetDays, hour);

/** What to remind the user of for a season: the evening before it starts, plus Lent's days of abstinence. */
function remindersFor(season: FastingSeason, tradition: string): Reminder[] {
  const out: Reminder[] = [
    {
      date: at(season.start, 18, -1),
      title: `${capitalize(season.name)} begins tomorrow`,
      body: `${tradition}: ${capitalize(season.name)} starts tomorrow. Total Fast will check foods against its rules each day.`,
    },
  ];
  if (season.id === 'lent') {
    for (let d = new Date(season.start); d <= season.end; d = at(d, 12, 1)) {
      const days = westernLent(d);
      const name = days.includes('ash-wednesday')
        ? 'Ash Wednesday'
        : days.includes('good-friday')
          ? 'Good Friday'
          : days.includes('lent-friday')
            ? 'A Friday of Lent'
            : undefined;
      if (!name) continue;
      const fasting = name === 'Ash Wednesday' || name === 'Good Friday';
      out.push({
        date: at(d, 8),
        title: name,
        body: fasting ? 'A day of fasting and abstinence from meat.' : 'A day of abstinence from meat.',
      });
    }
  }
  return out.filter((r) => r.date.getTime() > Date.now());
}

/**
 * Schedules the reminders for a season. Returns false if notifications are
 * not allowed, so the switch can stay off.
 */
export async function scheduleSeason(key: string, season: FastingSeason, tradition: string): Promise<boolean> {
  if (!REMINDERS_SUPPORTED || !(await ensurePermission())) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Fasting calendar',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const ids: string[] = [];
  for (const r of remindersFor(season, tradition)) {
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: CHANNEL_ID },
      }),
    );
  }
  const saved = await load();
  // Replace any earlier schedule for this season so reminders never double up.
  await Promise.all((saved[key] ?? []).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  saved[key] = ids;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  return true;
}

export async function cancelSeason(key: string): Promise<void> {
  const saved = await load();
  await Promise.all((saved[key] ?? []).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  delete saved[key];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
