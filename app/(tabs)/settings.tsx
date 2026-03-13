import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { UserSettings } from '@/types';
import { getUserSettings, updateUserSettings, resetUserSettings } from '@/services/api';
import { DEVICE_ID, setDeviceId, API_BASE_URL } from '@/config/api';
import * as Device from 'expo-device';
import { router } from 'expo-router';

type SettingItemProps = {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  iconColor?: string;
};

function SettingItem({ icon, title, subtitle, onPress, rightElement, iconColor }: SettingItemProps) {
  return (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconColor || Colors.primary }]}>
        <Ionicons name={icon as any} size={20} color={Colors.white} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (
        onPress && <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deviceId, setLocalDeviceId] = useState('');

  useEffect(() => {
    initializeDevice();
  }, []);

  const initializeDevice = async () => {
    try {
      // Generate unique device ID
      let id = DEVICE_ID;
      if (!id) {
        if (Device.isDevice) {
          id = `${Device.brand}_${Device.modelName}_${Date.now()}`;
        } else {
          id = `simulator_${Date.now()}`;
        }
        setDeviceId(id);
      }
      setLocalDeviceId(id);
      
      // Load settings
      const userSettings = await getUserSettings(id);
      setSettings(userSettings);
    } catch (error) {
      console.log('Error initializing device:', error);
      // Use default settings
      setSettings({
        language: 'kz',
        speech_rate: 1.0,
        speech_pitch: 1.0,
        speech_voice: 'default',
        theme: 'light',
        notifications_enabled: true,
        auto_speak: true,
        camera_quality: 'high',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (!settings || !deviceId) return;
    
    try {
      setIsSaving(true);
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await updateUserSettings(deviceId, { [key]: value });
    } catch (error) {
      console.log('Error updating setting:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanguageChange = () => {
    Alert.alert(
      'Tildi tańdańyz',
      '',
      [
        { text: 'Qazaqsha', onPress: () => updateSetting('language', 'kz') },
        { text: 'Russkiı', onPress: () => updateSetting('language', 'ru') },
        { text: 'English', onPress: () => updateSetting('language', 'en') },
        { text: 'Boldyrmau', style: 'cancel' },
      ]
    );
  };

  const handleThemeChange = () => {
    Alert.alert(
      'Tema tańdańyz',
      '',
      [
        { text: 'Jaryq', onPress: () => updateSetting('theme', 'light') },
        { text: 'Qarańǵy', onPress: () => updateSetting('theme', 'dark') },
        { text: 'Júıe', onPress: () => updateSetting('theme', 'system') },
        { text: 'Boldyrmau', style: 'cancel' },
      ]
    );
  };

  const handleCameraQuality = () => {
    Alert.alert(
      'Kamera sapasy',
      '',
      [
        { text: 'Tomen (480p)', onPress: () => updateSetting('camera_quality', 'low') },
        { text: 'Ortasha (720p)', onPress: () => updateSetting('camera_quality', 'medium') },
        { text: 'Joǵary (1080p)', onPress: () => updateSetting('camera_quality', 'high') },
        { text: 'Boldyrmau', style: 'cancel' },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Baptaulardy qalpyna keltiru',
      'Barlyq baptaular bastapqy kúıge qaıtarylady. Jalǵastyryńyz ba?',
      [
        { text: 'Boldyrmau', style: 'cancel' },
        { 
          text: 'Qalpyna keltiru', 
          style: 'destructive',
          onPress: async () => {
            if (deviceId) {
              await resetUserSettings(deviceId);
              await initializeDevice();
              Alert.alert('Daıyn', 'Baptaular qalpyna keltirildi');
            }
          },
        },
      ]
    );
  };

  const handleSupport = () => {
    Linking.openURL('mailto:support@signlanguageapp.kz');
  };

  const handlePrivacy = () => {
    Alert.alert('Qupıalylyq saıasaty', 'Qupıalylyq saıasaty betine ótu...');
  };

  const handleAbout = () => {
    Alert.alert(
      'Qosymsha turaly',
      `Sign Language App\nNusqa: 1.0.0\n\nDevice ID: ${deviceId}\nAPI: ${API_BASE_URL}\n\nBul qosymsha esitu qabileti shekteuli adamdarǵa komektasu úshin jasaldy.\n\n© 2024 Sign Language App`,
    );
  };

  const getLanguageName = (lang: string) => {
    switch (lang) {
      case 'kz': return 'Qazaqsha';
      case 'ru': return 'Russkiı';
      case 'en': return 'English';
      default: return 'Qazaqsha';
    }
  };

  const getThemeName = (theme: string) => {
    switch (theme) {
      case 'light': return 'Jaryq';
      case 'dark': return 'Qarańǵy';
      case 'system': return 'Júıe';
      default: return 'Jaryq';
    }
  };

  const getQualityName = (quality: string) => {
    switch (quality) {
      case 'low': return 'Tomen (480p)';
      case 'medium': return 'Ortasha (720p)';
      case 'high': return 'Joǵary (1080p)';
      default: return 'Joǵary (1080p)';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Baptaulardy júktep jatyrmyz...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Baptaular</Text>
        <Text style={styles.headerSubtitle}>Qosymshany baptau</Text>
        {isSaving && (
          <ActivityIndicator size="small" color={Colors.white} style={styles.savingIndicator} />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jalpy</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="language"
              title="Til"
              subtitle={getLanguageName(settings?.language || 'kz')}
              onPress={handleLanguageChange}
              iconColor={Colors.secondary}
            />
            <SettingItem
              icon="color-palette"
              title="Tema"
              subtitle={getThemeName(settings?.theme || 'light')}
              onPress={handleThemeChange}
              iconColor="#6C5CE7"
            />
            <SettingItem
              icon="camera"
              title="Kamera sapasy"
              subtitle={getQualityName(settings?.camera_quality || 'high')}
              onPress={handleCameraQuality}
              iconColor="#45B7D1"
            />
          </View>
        </View>



        {/* Speech Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soıleu</Text>
          <View style={styles.sectionContent}>
            <View style={styles.sliderItem}>
              <View style={styles.sliderHeader}>
                <View style={[styles.settingIcon, { backgroundColor: '#96CEB4' }]}>
                  <Ionicons name="speedometer" size={20} color={Colors.white} />
                </View>
                <Text style={styles.settingTitle}>Soıleu jyldamdyǵy</Text>
                <Text style={styles.sliderValue}>{(settings?.speech_rate || 1.0).toFixed(1)}x</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.1}
                value={settings?.speech_rate || 1.0}
                onSlidingComplete={(value) => updateSetting('speech_rate', value)}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor={Colors.gray300}
                thumbTintColor={Colors.primary}
              />
            </View>
            <View style={styles.sliderItem}>
              <View style={styles.sliderHeader}>
                <View style={[styles.settingIcon, { backgroundColor: '#DDA0DD' }]}>
                  <Ionicons name="musical-notes" size={20} color={Colors.white} />
                </View>
                <Text style={styles.settingTitle}>Daýys biiktigi</Text>
                <Text style={styles.sliderValue}>{(settings?.speech_pitch || 1.0).toFixed(1)}</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.1}
                value={settings?.speech_pitch || 1.0}
                onSlidingComplete={(value) => updateSetting('speech_pitch', value)}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor={Colors.gray300}
                thumbTintColor={Colors.primary}
              />
            </View>
            <SettingItem
              icon="volume-high"
              title="Avtomatty soıleu"
              iconColor={Colors.accent}
              rightElement={
                <Switch
                  value={settings?.auto_speak ?? true}
                  onValueChange={(value) => updateSetting('auto_speak', value)}
                  trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
                  thumbColor={settings?.auto_speak ? Colors.primary : Colors.white}
                />
              }
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habarlandyrular</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="notifications"
              title="Habarlandyrular"
              iconColor={Colors.accent}
              rightElement={
                <Switch
                  value={settings?.notifications_enabled ?? true}
                  onValueChange={(value) => updateSetting('notifications_enabled', value)}
                  trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
                  thumbColor={settings?.notifications_enabled ? Colors.primary : Colors.white}
                />
              }
            />
          </View>
        </View>

        {/* Data & Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Derekter</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="refresh"
              title="Baptaulardy qalpyna keltiru"
              subtitle="Barlyq baptaulardy bastapqy kúıge qaıtaru"
              onPress={handleResetSettings}
              iconColor={Colors.error}
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aqparat</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="help-circle"
              title="Komek"
              onPress={handleSupport}
              iconColor="#45B7D1"
            />
            <SettingItem
              icon="shield-checkmark"
              title="Qupıalylyq saıasaty"
              onPress={handlePrivacy}
              iconColor="#96CEB4"
            />
            <SettingItem
              icon="information-circle"
              title="Qosymsha turaly"
              subtitle="Nusqa 1.0.0"
              onPress={handleAbout}
              iconColor={Colors.primary}
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Sign Language App</Text>
          <Text style={styles.appVersion}>Nusqa 1.0.0</Text>
          <Text style={styles.deviceId}>Device: {deviceId.substring(0, 20)}...</Text>
          <Text style={styles.appCopyright}>© 2024 Sign Language App</Text>
        </View>

                {/* Admin Button */}
<View style={{ paddingHorizontal: 16, marginBottom: 40 }}>
  <TouchableOpacity
    style={{
      backgroundColor: Colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    }}
    onPress={() => router.push('/admin')} // admin экранына бағыттау
  >
    <Text style={{ color: Colors.white, fontWeight: '700', fontSize: Typography.fontSizes.md }}>
      Admin панелге кіру
    </Text>
  </TouchableOpacity>
</View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.md,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.gray300,
    marginTop: Spacing.xs,
  },
  savingIndicator: {
    position: 'absolute',
    right: Spacing.lg,
    top: Platform.OS === 'ios' ? 70 : 50,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    textTransform: 'uppercase',
  },
  sectionContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  settingTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sliderItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sliderValue: {
    marginLeft: 'auto',
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
    marginLeft: Spacing.md + 36,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  appName: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
  },
  appVersion: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  deviceId: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.gray400,
    marginTop: Spacing.xs,
  },
  appCopyright: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.gray400,
    marginTop: Spacing.sm,
  },
  bottomPadding: {
    height: 120,
  },
});