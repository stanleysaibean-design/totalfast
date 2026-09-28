import { Pressable, StyleSheet, View } from 'react-native';

import { capitalize } from '@/components/diet-chip';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { calendarNote, DIETS } from '@/lib/engine';
import { useDiet } from '@/state/diet';

/** Pick which fast every check and scan is judged against. */
export default function DietScreen() {
  const theme = useTheme();
  const { diet: active, setDiet } = useDiet();

  return (
    <Screen title="Your fast">
      <ThemedText type="small" themeColor="textSecondary">
        Every check and scan uses the fast you pick here.
      </ThemedText>

      <View style={styles.list} accessibilityRole="radiogroup">
        {DIETS.map(({ ruleSet, tagline }) => {
          const selected = ruleSet.id === active.ruleSet.id;
          const note = calendarNote(ruleSet);
          return (
            <Pressable
              key={ruleSet.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setDiet(ruleSet.id)}>
              {({ pressed }) => (
                <ThemedView
                  type={selected ? 'backgroundSelected' : 'backgroundElement'}
                  style={[
                    styles.option,
                    { borderColor: selected ? theme.tint : 'transparent' },
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.optionHeader}>
                    <ThemedText type="smallBold" style={styles.optionTitle}>
                      {capitalize(ruleSet.name)}
                    </ThemedText>
                    {ruleSet.review.status === 'draft' && (
                      <ThemedText type="small" themeColor="uncertain">
                        Draft rules
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText type="small">{tagline}</ThemedText>
                  {note ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {note}
                    </ThemedText>
                  ) : null}
                </ThemedView>
              )}
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Total Fast checks ingredients against each fast&apos;s published rules. It isn&apos;t medical or religious
        advice. Your pastor, priest, or program may set different rules.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  option: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 2,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  optionTitle: {
    flex: 1,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.8,
  },
});
