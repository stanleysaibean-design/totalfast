import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { calendarNote } from '@/lib/engine';
import { useDiet } from '@/state/diet';

/** The active diet, shown above every check. Tapping it opens the diet picker. */
export function DietChip() {
  const { diet, today } = useDiet();
  const note = calendarNote(diet.ruleSet, today);
  return (
    <Link href="/diet" asChild>
      <Pressable accessibilityRole="button" accessibilityHint="Opens the diet picker">
        {({ pressed }) => (
          <ThemedView type="backgroundElement" style={[styles.chip, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              Checking against
            </ThemedText>
            <ThemedText type="smallBold">{capitalize(diet.ruleSet.name)} · Change</ThemedText>
            {note ? (
              <ThemedText type="small" themeColor="textSecondary">
                {note}
              </ThemedText>
            ) : null}
          </ThemedView>
        )}
      </Pressable>
    </Link>
  );
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
