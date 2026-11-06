import { Pressable, StyleSheet, View } from 'react-native';

import { capitalize } from '@/components/diet-chip';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { calendarChoices, calendarNote, DIETS } from '@/lib/engine';
import { useDiet } from '@/state/diet';

/** Pick which fast every check and scan is judged against. */
export default function DietScreen() {
  const theme = useTheme();
  const { diet: active, setDiet, calendarFor, setCalendar, today } = useDiet();
  const choices = calendarChoices(active.ruleSet);
  const activeCalendar = calendarFor(active.ruleSet.id);

  return (
    <Screen title="Your fast">
      <ThemedText type="small" themeColor="textSecondary">
        Every check and scan uses the fast you pick here.
      </ThemedText>

      <View style={styles.list} accessibilityRole="radiogroup">
        {DIETS.map(({ ruleSet, tagline }) => {
          const selected = ruleSet.id === active.ruleSet.id;
          const note = calendarNote(ruleSet, today, calendarFor(ruleSet.id));
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

      {choices.length > 0 && (
        <View style={styles.list}>
          <ThemedText type="smallBold" accessibilityRole="header" nativeID="calendar-label">
            Church calendar
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Pascha is the same on both. Christmas and the fixed fasts fall 13 days later on the Old Calendar. Ask your
            parish if you aren&apos;t sure which one it keeps.
          </ThemedText>
          <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabelledBy="calendar-label">
            {choices.map((choice) => {
              const selected = choice.calendar === activeCalendar;
              return (
                <Pressable
                  key={choice.calendar}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setCalendar(active.ruleSet.id, choice.calendar)}>
                  {({ pressed }) => (
                    <ThemedView
                      type={selected ? 'backgroundSelected' : 'backgroundElement'}
                      style={[
                        styles.option,
                        { borderColor: selected ? theme.tint : 'transparent' },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="smallBold">{choice.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {choice.description}
                      </ThemedText>
                    </ThemedView>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

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
