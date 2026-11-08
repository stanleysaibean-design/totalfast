import type { ProductMatch } from '@total-fast/engine';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Linking, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VERDICT_LABEL, VerdictCard } from '@/components/verdict-card';
import { Spacing } from '@/constants/theme';
import { checkItem } from '@/lib/engine';
import { searchProducts, type SearchResult } from '@/lib/product-lookup';
import { useDiet } from '@/state/diet';

type Status = { kind: 'idle' } | { kind: 'loading' } | SearchResult;

/**
 * Offered when the Check tab gets one name it doesn't know, such as a brand
 * ("doritos"). A brand is many products with different recipes, so this
 * finds the products and checks the one the user picks against its own label.
 */
export function ProductSearch({ query }: { query: string }) {
  const { diet, today, calendar } = useDiet();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [picked, setPicked] = useState<ProductMatch | null>(null);

  const result = useMemo(
    () => (picked?.item ? checkItem(picked.item, diet.ruleSet, today, calendar) : null),
    [picked, diet, today, calendar],
  );

  useEffect(() => {
    if (result && picked) AccessibilityInfo.announceForAccessibility(`${picked.name}. ${VERDICT_LABEL[result.verdict]}. ${result.summary}`);
  }, [result, picked]);

  const search = async () => {
    setPicked(null);
    setStatus({ kind: 'loading' });
    const res = await searchProducts(query);
    setStatus(res);
    AccessibilityInfo.announceForAccessibility(
      res.kind === 'found' ? `${res.products.length} products found` : res.kind === 'none' ? 'No products found' : res.message,
    );
  };

  if (picked) {
    return (
      <View style={styles.stack}>
        {result ? (
          <VerdictCard result={result} ruleSet={diet.ruleSet} title={picked.name} />
        ) : (
          <Panel title={`No ingredient list for ${picked.name}`}>
            The product database has this product but not its ingredients, so we can&apos;t check it. Type the
            ingredients from the label instead.
          </Panel>
        )}
        <Button label="Back to products" variant="secondary" onPress={() => setPicked(null)} />
        <Attribution />
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {status.kind === 'idle' && (
        <Panel title={`Is “${query}” a product or brand?`}>
          Brand foods are checked by their label, and each flavor has its own. Search the product database and
          pick the one you have.
        </Panel>
      )}
      {status.kind !== 'found' && (
        <Button
          label={status.kind === 'idle' ? `Search products for “${query}”` : 'Search again'}
          variant="secondary"
          busy={status.kind === 'loading'}
          onPress={() => void search()}
        />
      )}
      {status.kind === 'none' && (
        <Panel title="No products found">
          Nothing in the product database matches “{status.query}”. Check the spelling, or type the ingredients from
          the label.
        </Panel>
      )}
      {status.kind === 'error' && <Panel title="Search failed">{status.message}</Panel>}
      {status.kind === 'found' && (
        <View style={styles.stack} accessibilityLiveRegion="polite">
          <ThemedText type="small" themeColor="textSecondary">
            Pick the product you have. Recipes differ by flavor and country.
          </ThemedText>
          {status.products.map((p) => (
            <Pressable
              key={p.barcode}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}${p.quantity ? `, ${p.quantity}` : ''}${p.item ? '' : ', no ingredient list'}`}
              onPress={() => setPicked(p)}>
              {({ pressed }) => (
                <ThemedView type="backgroundElement" style={[styles.row, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">{p.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {[p.quantity, p.item ? null : 'No ingredient list', `Barcode ${p.barcode}`].filter(Boolean).join(' · ')}
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          ))}
        </View>
      )}
      {status.kind !== 'idle' && <Attribution />}
    </View>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.panel} accessibilityLiveRegion="polite">
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small">{children}</ThemedText>
    </ThemedView>
  );
}

function Attribution() {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      Products come from{' '}
      <ThemedText
        type="small"
        themeColor="tint"
        accessibilityRole="link"
        onPress={() => void Linking.openURL('https://world.openfoodfacts.org')}>
        Open Food Facts
      </ThemedText>
      , available under the Open Database License. Anyone can edit it, so if the label in your hand differs, trust
      the label.
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.two,
  },
  panel: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  row: {
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
