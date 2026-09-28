import type { CheckResult, IngredientFinding, RuleSet, Verdict } from '@total-fast/engine';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const VERDICT_STYLE: Record<
  Verdict,
  { label: string; color: ThemeColor; background: ThemeColor; icon: SymbolViewProps['name'] }
> = {
  compliant: {
    label: 'Compliant',
    color: 'compliant',
    background: 'compliantBackground',
    icon: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  },
  not_compliant: {
    label: 'Not compliant',
    color: 'notCompliant',
    background: 'notCompliantBackground',
    icon: { ios: 'xmark.octagon.fill', android: 'cancel', web: 'cancel' },
  },
  uncertain: {
    label: 'Check this one',
    color: 'uncertain',
    background: 'uncertainBackground',
    icon: { ios: 'questionmark.circle.fill', android: 'help', web: 'help' },
  },
};

interface Props {
  result: CheckResult;
  ruleSet: RuleSet;
  /** Product or recipe name, when known. */
  title?: string;
}

/**
 * Shows a verdict, the ingredients that decided it and why, and every other
 * ingredient on request. The triggering ingredient is always visible: a
 * verdict without its reason is what makes people distrust compliance apps.
 */
export function VerdictCard({ result, ruleSet, title }: Props) {
  const theme = useTheme();
  const [showAll, setShowAll] = useState(false);
  const v = VERDICT_STYLE[result.verdict];
  const triggers = uniqueByIngredient(result.triggers);
  const others = result.findings.filter((f) => !result.triggers.includes(f));

  return (
    <View style={styles.card} accessibilityRole="summary">
      <ThemedView type={v.background} style={styles.header}>
        <SymbolView name={v.icon} size={28} tintColor={theme[v.color]} />
        <View style={styles.headerText}>
          {title ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {title}
            </ThemedText>
          ) : null}
          <ThemedText type="smallBold" themeColor={v.color} style={styles.verdictLabel}>
            {v.label}
          </ThemedText>
          <ThemedText type="small">{result.summary}</ThemedText>
        </View>
      </ThemedView>

      {triggers.length > 0 && (
        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">Why</ThemedText>
          {triggers.map((f, i) => (
            <FindingRow key={`${f.label}-${i}`} finding={f} />
          ))}
        </ThemedView>
      )}

      {others.length > 0 && (
        <ThemedView type="backgroundElement" style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showAll }}
            onPress={() => setShowAll((s) => !s)}
            style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
            <ThemedText type="smallBold">
              {showAll ? 'Hide' : 'Show'} the other {others.length} ingredient{others.length === 1 ? '' : 's'}
            </ThemedText>
            <SymbolView
              name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
              size={14}
              tintColor={theme.text}
              style={{ transform: [{ rotate: showAll ? '180deg' : '0deg' }] }}
            />
          </Pressable>
          {showAll && others.map((f, i) => <FindingRow key={`${f.label}-${i}`} finding={f} />)}
        </ThemedView>
      )}

      <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
        {ruleSet.review.status === 'draft' ? 'These rules are a draft and have not been reviewed yet. ' : ''}
        {ruleSet.disclaimer ?? ''}
      </ThemedText>
    </View>
  );
}

/** "Enriched wheat flour (wheat flour, ...)" names one flour twice; show it once. */
function uniqueByIngredient(findings: IngredientFinding[]): IngredientFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = f.ingredient?.id ?? f.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function FindingRow({ finding }: { finding: IngredientFinding }) {
  const v = VERDICT_STYLE[finding.verdict];
  return (
    <View style={styles.row}>
      <ThemedText type="smallBold" themeColor={v.color} style={styles.rowMark} accessibilityLabel={v.label}>
        {finding.verdict === 'compliant' ? '✓' : finding.verdict === 'not_compliant' ? '✕' : '?'}
      </ThemedText>
      <View style={styles.rowText}>
        <ThemedText type="small">{finding.label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {finding.reason}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  verdictLabel: {
    fontSize: 20,
    lineHeight: 26,
  },
  section: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rowMark: {
    width: 16,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
  },
  footnote: {
    paddingHorizontal: Spacing.one,
  },
});
