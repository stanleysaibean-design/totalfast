import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Linking, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { DietChip } from '@/components/diet-chip';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VERDICT_LABEL, VerdictCard } from '@/components/verdict-card';
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
  const { diet, today } = useDiet();
  const focused = useIsFocused();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [status, setStatus] = useState<Status>({ kind: 'scanning' });
  const [manual, setManual] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  // The camera reports the same code many times a second; handle only the first.
  const handling = useRef(false);

  // Permission can change in system settings while the app is in the background.
  useEffect(() => {
    if (focused) getPermission().catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') getPermission().catch(() => {});
    });
    return () => sub.remove();
  }, [focused, getPermission]);

  const lookup = useCallback(async (barcode: string) => {
    if (handling.current) return;
    handling.current = true;
    setStatus({ kind: 'loading', barcode });
    setStatus(await lookupBarcode(barcode));
  }, []);

  const onScanned = useCallback(
    (scan: BarcodeScanningResult) => {
      const barcode = normalizeBarcode(scan.data);
      if (barcode) void lookup(barcode);
    },
    [lookup],
  );

  const submitManual = () => {
    const barcode = normalizeBarcode(manual);
    if (!barcode) {
      setManualError("That number doesn't look like a complete barcode. Check it against the label.");
      return;
    }
    setManualError(null);
    void lookup(barcode);
  };

  const reset = () => {
    handling.current = false;
    setManual('');
    setManualError(null);
    setStatus({ kind: 'scanning' });
  };

  const result = useMemo(
    () => (status.kind === 'found' ? checkItem(status.item, diet.ruleSet, today) : null),
    [status, diet, today],
  );

  const announcement = useMemo(() => {
    switch (status.kind) {
      case 'loading':
        return `Looking up barcode ${status.barcode}`;
      case 'found':
        return result ? `${status.item.name}. ${VERDICT_LABEL[result.verdict]}. ${result.summary}` : undefined;
      case 'not-found':
        return "We don't have this product yet.";
      case 'no-ingredients':
        return 'No ingredient list for this product.';
      case 'error':
        return status.message;
      default:
        return undefined;
    }
  }, [status, result]);

  useEffect(() => {
    if (announcement) AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement]);

  const scanning = status.kind === 'scanning';
  const permissionBlocked =
    Platform.OS === 'web' ? permission?.status === 'denied' : permission?.canAskAgain === false;

  return (
    <Screen title="Scan a product">
      <DietChip />

      {scanning && (
        <CameraArea
          granted={!!permission?.granted}
          blocked={permissionBlocked}
          loaded={permission !== null}
          onRequest={requestPermission}>
          {/* Mount the camera only while this tab is on screen. `active` is
              iOS-only, and tabs stay mounted, so on Android and web an
              unmounted view is the only way to release the camera. */}
          {focused ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
              onBarcodeScanned={onScanned}
              accessibilityLabel="Camera viewfinder. Point it at a product barcode."
            />
          ) : null}
        </CameraArea>
      )}

      {scanning && permission?.granted && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Point the camera at the barcode on the package.
        </ThemedText>
      )}

      {status.kind === 'loading' && (
        <ThemedView type="backgroundElement" style={styles.panel} accessibilityLiveRegion="polite">
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
          The product database has this product but not its ingredients, so we can&apos;t check it. Type the
          ingredients from the label on the Check tab instead.
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
              onChangeText={(value) => {
                setManual(value);
                setManualError(null);
              }}
              placeholder="e.g. 012345678905"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              returnKeyType="search"
              onSubmitEditing={submitManual}
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
            />
            <Button
              label="Look up"
              variant="secondary"
              disabled={manual.replace(/\D/g, '').length < 8}
              onPress={submitManual}
            />
          </View>
          {manualError ? (
            <ThemedText type="small" themeColor="notCompliant" accessibilityLiveRegion="polite">
              {manualError}
            </ThemedText>
          ) : null}
        </View>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        Product information comes from{' '}
        <ThemedText
          type="small"
          themeColor="tint"
          accessibilityRole="link"
          onPress={() => void Linking.openURL('https://world.openfoodfacts.org')}>
          Open Food Facts
        </ThemedText>
        , available under the{' '}
        <ThemedText
          type="small"
          themeColor="tint"
          accessibilityRole="link"
          onPress={() => void Linking.openURL('https://opendatacommons.org/licenses/odbl/1-0/')}>
          Open Database License
        </ThemedText>
        . Anyone can edit it, so if the label in your hand differs from what we show, trust the label.
      </ThemedText>
    </Screen>
  );
}

function CameraArea({
  granted,
  blocked,
  loaded,
  onRequest,
  children,
}: {
  granted: boolean;
  blocked: boolean;
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
      {!blocked ? (
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
    <ThemedView type="backgroundElement" style={styles.panel} accessibilityLiveRegion="polite">
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
