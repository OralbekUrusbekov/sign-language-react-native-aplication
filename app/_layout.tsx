// app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform, SafeAreaView } from 'react-native';
import { SettingsProvider } from '@/context/SettingsContext';
import { scaleHeight, isSmallDevice, isTablet } from '@/constants/responsive';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // Add custom fonts here if needed
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SettingsProvider>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar 
          style="auto" 
          backgroundColor="transparent"
          translucent={true}
        />
        <SafeAreaView style={styles.safeArea}>
          <Stack screenOptions={{ 
            headerShown: false,
            contentStyle: styles.stackContent,
            animation: Platform.OS === 'ios' ? 'default' : 'fade',
          }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ 
              headerShown: false,
              presentation: Platform.OS === 'ios' ? 'modal' : 'card',
            }} />
          </Stack>
        </SafeAreaView>
      </GestureHandlerRootView>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8', // TYNDAU background color
  },
  safeArea: {
    flex: 1,
    // Safe area үшін қосымша padding (Android үшін)
    paddingTop: Platform.OS === 'android' ? 0 : 0,
  },
  stackContent: {
    backgroundColor: '#F0F4F8',
    // Кішкентай экрандар үшін қосымша реттеулер
    ...(isSmallDevice && {
      paddingBottom: 0,
    }),
    // Планшеттер үшін қосымша реттеулер
    ...(isTablet && {
      maxWidth: 768,
      alignSelf: 'center',
      width: '100%',
    }),
  },
});