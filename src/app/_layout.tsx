import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';

import { LaunchAnimation } from '@/components/logo';
import { C } from '@/lib/ui';

// Keep the phone's built-in splash (black + fork) up until the fonts are ready,
// then the animated logo takes over from exactly the same spot.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [launching, setLaunching] = useState(true);

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Light status bar icons (time, battery) so they show up on black. */}
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
      {launching ? (
        <LaunchAnimation onShown={() => SplashScreen.hideAsync().catch(() => {})} onDone={() => setLaunching(false)} />
      ) : null}
    </View>
  );
}
