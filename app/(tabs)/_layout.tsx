import React from 'react';
import { router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, TouchableOpacity, View, Text} from 'react-native';

const Colors = {
  primary: '#4ECDC4',
  gray400: '#9CA3AF',
  gray100: '#F3F4F6',
  white: '#FFFFFF',
};

const Shadows = {
  lg: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};

type IconName = keyof typeof Ionicons.glyphMap;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
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
          title: 'Сөйлеу',
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
          title: 'Тыңдау',
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
          title: 'Кітапхана',
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
          title: 'Баптау',
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
      <Ionicons name={name} size={24} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 25 : 15,
    left: 15,
    right: 15,
    height: 70,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    paddingBottom: 0,
    paddingTop: 10,
    ...Shadows.lg,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  tabBarItem: {
    paddingTop: 5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: Colors.gray100,
  },
  adminButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});