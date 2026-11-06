import { fastingSeasons, RULE_SETS, type FastingSeason } from '@total-fast/engine';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { orthodoxNote, westernLentNote } from '@/lib/engine';
import { cancelSeason, REMINDERS_SUPPORTED, scheduledSeasonKeys, scheduleSeason, seasonKey } from '@/lib/reminders';
import { useDiet } from '@/state/diet';

const DAY = 86_400_000;

interface Row {
  key: string;
  season: FastingSeason;
  tradition: string;
}

const formatDate = (d: Date, withYear = false) =>
  d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });

function when(season: FastingSeason, today: Date): string {
  const days = Math.round((season.start.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime()) / DAY);
  if (days <= 0) return 'In progress';
  if (days === 1) return 'Starts tomorrow';
  return `Starts in ${days} days`;
}

/**
 * Lent and the Orthodox fasting seasons, with reminders. Free for everyone,
 * whichever fast is active, so Lent is a calendar here rather than a diet.
 */
export default function CalendarScreen() {
  const theme = useTheme();
  const { today, calendarFor } = useDiet();
  const orthodox = RULE_SETS['orthodox'];
  const orthodoxCalendar = calendarFor(orthodox.id) ?? orthodox.calendar!;
  const calendarName = orthodox.calendarChoices?.find((c) => c.calendar === orthodoxCalendar)?.name ?? '';

  const rows = useMemo<Row[]>(() => {
    const horizon = today.getTime() + 366 * DAY;
    const list: Row[] = [
      ...fastingSeasons('western-lent', today).map((season) => ({
        key: seasonKey('western-lent', season),
        season,
        tradition: 'Western (Catholic and Protestant)',
      })),
      ...fastingSeasons(orthodoxCalendar, today).map((season) => ({
        key: seasonKey(orthodoxCalendar, season),
        season,
        tradition: `Orthodox, ${calendarName}`,
      })),
    ];
    return list.filter((r) => r.season.start.getTime() <= horizon).sort((a, b) => a.season.start.getTime() - b.season.start.getTime());
  }, [today, orthodoxCalendar, calendarName]);

  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    if (!REMINDERS_SUPPORTED) return;
    scheduledSeasonKeys().then(setEnabled).catch(() => {});
  }, []);

  const toggle = async (row: Row, on: boolean) => {
    setBusy(row.key);
    try {
      if (on) {
        const ok = await scheduleSeason(row.key, row.season, row.tradition);
        if (!ok) {
          Alert.alert('Notifications are off', 'Turn on notifications for Total Fast in Settings to get fasting reminders.');
          return;
        }
      } else {
        await cancelSeason(row.key);
      }
      setEnabled((prev) => {
        const next = new Set(prev);
        if (on) next.add(row.key);
        else next.delete(row.key);
        return next;
      });
    } catch {
      Alert.alert("Couldn't change the reminder", 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen title="Calendar">
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Today, {formatDate(today)}</ThemedText>
        <View style={styles.todayRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Western Lent
          </ThemedText>
          <ThemedText type="small">{westernLentNote(today)}</ThemedText>
        </View>
        <View style={styles.todayRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Orthodox, {calendarName}
          </ThemedText>
          <ThemedText type="small">{orthodoxNote(today, orthodoxCalendar)}</ThemedText>
        </View>
      </ThemedView>

      <ThemedText type="smallBold" accessibilityRole="header">
        Coming up
      </ThemedText>
      <View style={styles.list}>
        {rows.map((row) => {
          const { season } = row;
          const sameDay = season.start.getTime() === season.end.getTime();
          const range = sameDay
            ? formatDate(season.start, true)
            : `${formatDate(season.start, season.start.getFullYear() !== season.end.getFullYear())} to ${formatDate(season.end, true)}`;
          const on = enabled.has(row.key);
          return (
            <ThemedView key={row.key} type="backgroundElement" style={[styles.card, styles.row]}>
              <View style={styles.rowText}>
                <ThemedText type="smallBold" style={styles.seasonName}>
                  {capitalize(season.name)}
                </ThemedText>
                <ThemedText type="small">{range}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {row.tradition} · {when(season, today)}
                </ThemedText>
              </View>
              {REMINDERS_SUPPORTED && (
                <Switch
                  accessibilityLabel={`Remind me about ${season.name}, ${row.tradition}`}
                  value={on}
                  disabled={busy === row.key}
                  onValueChange={(value) => toggle(row, value)}
                  trackColor={{ true: theme.tint }}
                />
              )}
            </ThemedView>
          );
        })}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {REMINDERS_SUPPORTED
          ? 'Turn on a reminder to hear the evening before a season begins. For Lent you also get a reminder on Ash Wednesday, each Friday and Good Friday.'
          : 'Reminders are available in the iOS and Android apps.'}{' '}
        The Orthodox dates follow the church calendar chosen under My fast.
      </ThemedText>
    </Screen>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  todayRow: {
    gap: Spacing.half,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  seasonName: {
    fontSize: 16,
  },
});
