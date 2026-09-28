import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { DietChip } from '@/components/diet-chip';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerdictCard } from '@/components/verdict-card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { checkItem } from '@/lib/engine';
import { lookupBarcode, normalizeBarcode, type LookupResult } from '@/lib/product-lookup';
import { useDiet } from '@/state/diet';

type Status = { kind: 'scanning' } | { kind: 'loading'; barcode: string } | LookupResult;

/** Grocery barcodes only: UPC and EAN. */
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/** Scan a product barcode, look up its label, and check it against the active diet. */
export default function ScanScreen() {
  const theme = useTheme();
  const { diet } = useDiet();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<Status>({ kind: 'scanning' });
  const [manual, setManual] = useState('');
  // The camera reports the same code many times a second; handle only the first.
  const handling = useRef(false);

  const lookup = useCallback(async (raw: string) => {
    const barcode = normalizeBarcode(raw);
    if (!barcode || handling.current) return;
    handling.current = true;
    setStatus({ kind: 'loading', barcode });
    setStatus(await lookupBarcode(barcode));
  }, []);

  const onScanned = useCallback((scan: BarcodeScanningResult) => void lookup(scan.data), [lookup]);

  const reset = () => {
    handling.current = false;
    setManual('');
    setStatus({ kind: 'scanning' });
  };

  const result = useMemo(
    () => (status.kind === 'found' ? checkItem(status.item, diet.ruleSet) : null),
    [status, diet],
  );

  const scanning = status.kind === 'scanning';

  return (
    <Screen title="Scan a product">
      <DietChip />

      {scanning && (
        <CameraArea
          granted={!!permission?.granted}
          canAskAgain={permission?.canAskAgain ?? true}
          loaded={permission !== null}
          onRequest={requestPermission}>
          <CameraView
            style={styles.camera}
            facing="back"
            active={focused}
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={focused ? onScanned : undefined}
          />
        </CameraArea>
      )}

      {status.kind === 'loading' && (
        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedText type="smallBold">Looking up {status.barcode}…</ThemedText>
        </ThemedView>
      )}

      {status.kind === 'found' && result && (
        <VerdictCard result={result} ruleSet={diet.ruleSet} title={status.item.name} />
      )}

      {status.kind === 'not-found' && (
        <Message title="We don't have this product yet">
          No product with barcode {status.barcode} is in the product database. You can still type its ingredients
          on the Check tab.
        </Message>
      )}

      {status.kind === 'no-ingredients' && (
        <Message title={`No ingredient list for ${status.name ?? `barcode ${status.barcode}`}`}>
          The product database has this product but not its ingredients, so we can&apos;t check it. Type the ingredients
          from the label on the Check tab instead.
        </Message>
      )}

      {status.kind === 'error' && <Message title="Lookup failed">{status.message}</Message>}

      {!scanning && status.kind !== 'loading' && <Button label="Scan another" onPress={reset} />}

      {scanning && (
        <View style={styles.manual}>
          <ThemedText type="small" themeColor="textSecondary" nativeID="barcode-label">
            Camera not working? Type the numbers under the barcode.
          </ThemedText>
          <View style={styles.manualRow}>
            <TextInput
              accessibilityLabelledBy="barcode-label"
              accessibilityLabel="Barcode number"
              value={manual}
              onChangeText={setManual}
              placeholder="e.g. 012345678905"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              returnKeyType="search"
              onSubmitEditing={() => void lookup(manual)}
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
            />
            <Button
              label="Look up"
              variant="secondary"
              disabled={!normalizeBarcode(manual)}
              onPress={() => void lookup(manual)}
            />
          </View>
        </View>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        Product data comes from Open Food Facts, a free database anyone can edit. If a label in your hand differs
        from what we show, trust the label.
      </ThemedText>
    </Screen>
  );
}

function CameraArea({
  granted,
  canAskAgain,
  loaded,
  onRequest,
  children,
}: {
  granted: boolean;
  canAskAgain: boolean;
  loaded: boolean;
  onRequest: () => void;
  children: React.ReactNode;
}) {
  if (granted) return <View style={styles.cameraFrame}>{children}</View>;
  if (!loaded) return <ThemedView type="backgroundElement" style={styles.cameraFrame} />;
  return (
    <ThemedView type="backgroundElement" style={[styles.cameraFrame, styles.permission]}>
      <ThemedText type="small" style={styles.center}>
        Total Fast uses the camera only to read barcodes.
      </ThemedText>
      {canAskAgain ? (
        <Button label="Allow camera" onPress={onRequest} />
      ) : Platform.OS === 'web' ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Camera access is blocked for this site. Allow it in your browser settings, or type the barcode below.
        </ThemedText>
      ) : (
        <Button label="Open settings" onPress={() => void Linking.openSettings()} />
      )}
    </ThemedView>
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.panel}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small">{children}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  cameraFrame: {
    height: 280,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  permission: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  center: {
    textAlign: 'center',
  },
  panel: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  manual: {
    gap: Spacing.two,
  },
  manualRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
});
