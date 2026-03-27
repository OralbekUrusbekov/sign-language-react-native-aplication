// app/_layout.tsx (жаңартылған)
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View, Dimensions } from 'react-native';
import { scaleWidth, scaleHeight, scaleFont, spacing, borderRadius, getTabBarStyle } from '@/constants/responsive';

// TYNDAU Theme Colors (өзгеріссіз)
const TyndauColors = {
  primary: '#1E3A5F',
  secondary: '#4ECDC4',
  gray400: '#94A3B8',
  gray100: '#F0F4F8',
  white: '#FFFFFF',
};

const Shadows = {
  lg: {
    shadowColor: '#1E3A5F',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: scaleWidth(16),
    elevation: 12,
  },
};

type IconName = keyof typeof Ionicons.glyphMap;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TyndauColors.secondary,
        tabBarInactiveTintColor: TyndauColors.gray400,
        tabBarStyle: getTabBarStyle(),
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      {/* ... tabs content remains same ... */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sign',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'hand-left' : 'hand-left-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="text-to-speech"
        options={{
          title: 'Soileu',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'volume-high' : 'volume-high-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="speech-to-text"
        options={{
          title: 'Tyndau',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'mic' : 'mic-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Kitaphana',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'library' : 'library-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Baptau',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'settings' : 'settings-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color, focused }: { name: IconName; color: string; focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Ionicons name={name} size={scaleWidth(24)} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: scaleFont(10),
    fontWeight: '600',
    marginTop: scaleHeight(4),
    letterSpacing: 0.3,
  },
  tabBarItem: {
    paddingTop: scaleHeight(6),
  },
  iconContainer: {
    width: scaleWidth(42),
    height: scaleWidth(42),
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(78, 205, 196, 0.12)',
  },
});