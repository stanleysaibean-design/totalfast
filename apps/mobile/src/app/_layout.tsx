import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { DietProvider, useDiet } from '@/state/diet';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DietProvider>
        <HideSplashWhenReady>
          <AppTabs />
        </HideSplashWhenReady>
      </DietProvider>
    </ThemeProvider>
  );
}

/** Keeps the splash screen up until the saved diet has loaded, so no check runs against the wrong fast. */
function HideSplashWhenReady({ children }: PropsWithChildren) {
  const { ready } = useDiet();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  return children;
}
