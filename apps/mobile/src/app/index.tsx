import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { DietChip } from '@/components/diet-chip';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerdictCard } from '@/components/verdict-card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { checkItem } from '@/lib/engine';
import { useDiet } from '@/state/diet';

const EXAMPLES = [
  { label: 'Honey', text: 'Honey' },
  { label: 'Ghee', text: 'Ghee' },
  {
    label: 'Sandwich bread',
    text: 'Enriched wheat flour (wheat flour, niacin, reduced iron, thiamine mononitrate, riboflavin, folic acid), water, sugar, yeast, soybean oil, contains 2% or less of: salt, calcium propionate (to preserve freshness), soy lecithin. Contains: wheat, soy.',
  },
];

/** Type one ingredient or paste a whole label, and get a verdict for the active diet. */
export default function CheckScreen() {
  const theme = useTheme();
  const { diet } = useDiet();
  const [text, setText] = useState('');
  const [checked, setChecked] = useState<string | null>(null);

  // Re-run when the diet changes so the verdict never shows stale rules.
  const result = useMemo(
    () => (checked ? checkItem({ name: 'Your check', ingredientsText: checked }, diet.ruleSet) : null),
    [checked, diet],
  );

  const run = (value = text) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setText(value);
    setChecked(trimmed);
  };

  return (
    <Screen title="Can I eat this?">
      <DietChip />

      <View style={styles.form}>
        <ThemedText type="small" themeColor="textSecondary" nativeID="ingredients-label">
          Type an ingredient, or paste the ingredient list from a label.
        </ThemedText>
        <TextInput
          accessibilityLabelledBy="ingredients-label"
          accessibilityLabel="Ingredients"
          value={text}
          onChangeText={(value) => {
            setText(value);
            // An edited list no longer matches the verdict on screen.
            setChecked(null);
          }}
          placeholder="e.g. honey, or oats, dates, almonds"
          placeholderTextColor={theme.textSecondary}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        />
        <Button label="Check" onPress={() => run()} disabled={!text.trim()} />
      </View>

      {result ? (
        <VerdictCard result={result} ruleSet={diet.ruleSet} />
      ) : (
        <View style={styles.examples}>
          <ThemedText type="small" themeColor="textSecondary">
            Or try one:
          </ThemedText>
          <View style={styles.exampleRow}>
            {EXAMPLES.map((ex) => (
              <Pressable
                key={ex.label}
                accessibilityRole="button"
                accessibilityLabel={`Try ${ex.label}`}
                onPress={() => run(ex.text)}>
                {({ pressed }) => (
                  <ThemedView type="backgroundElement" style={[styles.example, pressed && styles.pressed]}>
                    <ThemedText type="small">{ex.label}</ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  examples: {
    gap: Spacing.two,
  },
  exampleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  example: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
