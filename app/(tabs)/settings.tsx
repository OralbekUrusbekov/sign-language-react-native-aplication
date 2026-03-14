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
import { useSettings } from '@/context/SettingsContext';
import { useSettingsTranslation } from '@/i18n/settings';

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
  const { t } = useSettingsTranslation();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deviceId, setLocalDeviceId] = useState('');

  const {
    appLanguage,
    speechLanguage,
    speechRate,
    speechPitch,
  
    setAppLanguage,
    setSpeechLanguage,
    setSpeechRate,
    setSpeechPitch
  } = useSettings();

  useEffect(() => {
    initializeDevice();
  }, []);

  const initializeDevice = async () => {
    try {
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
      setSpeechRate(userSettings.speech_rate);
      setSpeechPitch(userSettings.speech_pitch);
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

      // CONTEXT UPDATE
      if (key === 'language') setAppLanguage(value as any);
      if (key === 'speech_rate') setSpeechRate(value as number);
      if (key === 'speech_pitch') setSpeechPitch(value as number);

    } catch (error) {
      console.log('Error updating setting:', error);
      Alert.alert(t('error'), t('errorSaving'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanguageChange = () => {
    Alert.alert(
      t('appLanguageTitle'),
      '',
      [
        { text: t('languages.kz'), onPress: () => setAppLanguage('kz') },
        { text: t('languages.ru'), onPress: () => setAppLanguage('ru') },
        { text: t('languages.en'), onPress: () => setAppLanguage('en') },
        { text: t('cancel'), style: 'cancel' },
      ]
    );
  };

  const handleSpeechLanguageChange = () => {
    Alert.alert(
      t('speechLanguageTitle'),
      '',
      [
        { text: t('languages.kz'), onPress: () => setSpeechLanguage('kz') },
        { text: t('languages.ru'), onPress: () => setSpeechLanguage('ru') },
        { text: t('languages.en'), onPress: () => setSpeechLanguage('en') },
        { text: t('cancel'), style: 'cancel' },
      ]
    );
  };

  const handleThemeChange = () => {
    Alert.alert(
      t('themeTitle'),
      '',
      [
        { text: t('themes.light'), onPress: () => updateSetting('theme', 'light') },
        { text: t('themes.dark'), onPress: () => updateSetting('theme', 'dark') },
        { text: t('themes.system'), onPress: () => updateSetting('theme', 'system') },
        { text: t('cancel'), style: 'cancel' },
      ]
    );
  };

  const handleCameraQuality = () => {
    Alert.alert(
      t('qualityTitle'),
      '',
      [
        { text: t('qualities.low'), onPress: () => updateSetting('camera_quality', 'low') },
        { text: t('qualities.medium'), onPress: () => updateSetting('camera_quality', 'medium') },
        { text: t('qualities.high'), onPress: () => updateSetting('camera_quality', 'high') },
        { text: t('cancel'), style: 'cancel' },
      ]
    );
  };

  const getLanguageName = (lang: string) => {
    switch (lang) {
      case 'kz': return t('languages.kz');
      case 'ru': return t('languages.ru');
      case 'en': return t('languages.en');
      default: return t('languages.kz');
    }
  };

  const getThemeName = (theme: string) => {
    switch (theme) {
      case 'light': return t('themes.light');
      case 'dark': return t('themes.dark');
      case 'system': return t('themes.system');
      default: return t('themes.light');
    }
  };

  const getQualityName = (quality: string) => {
    switch (quality) {
      case 'low': return t('qualities.low');
      case 'medium': return t('qualities.medium');
      case 'high': return t('qualities.high');
      default: return t('qualities.high');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('title')}</Text>
        <Text style={styles.headerSubtitle}>{t('subtitle')}</Text>
        {isSaving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={Colors.white} />
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('general')}</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="language"
              title={t('language')}
              subtitle={getLanguageName(appLanguage)}
              onPress={handleLanguageChange}
              iconColor={Colors.secondary}
            />
            <SettingItem
              icon="color-palette"
              title={t('theme')}
              subtitle={getThemeName(settings?.theme || 'light')}
              onPress={handleThemeChange}
              iconColor="#6C5CE7"
            />
            <SettingItem
              icon="camera"
              title={t('cameraQuality')}
              subtitle={getQualityName(settings?.camera_quality || 'high')}
              onPress={handleCameraQuality}
              iconColor="#45B7D1"
            />
          </View>
        </View>

        {/* Speech Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('speech')}</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="mic"
              title={t('speechLanguage')}
              subtitle={getLanguageName(speechLanguage)}
              onPress={handleSpeechLanguageChange}
              iconColor="#FF8C42"
            />
            
            <View style={styles.sliderItem}>
              <View style={styles.sliderHeader}>
                <View style={[styles.settingIcon, { backgroundColor: '#96CEB4' }]}>
                  <Ionicons name="speedometer" size={20} color={Colors.white} />
                </View>
                <Text style={styles.settingTitle}>{t('speechRate')}</Text>
                <Text style={styles.sliderValue}>{speechRate.toFixed(1)}x</Text>
              </View>

              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.1}
                value={speechRate}
                onValueChange={setSpeechRate} 
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
                <Text style={styles.settingTitle}>{t('speechPitch')}</Text>
                <Text style={styles.sliderValue}>{speechPitch.toFixed(1)}</Text>
              </View>
              
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.1}
                value={speechPitch}
                onValueChange={setSpeechPitch}
                onSlidingComplete={(value) => updateSetting('speech_pitch', value)}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor={Colors.gray300}
                thumbTintColor={Colors.primary}
              />
            </View>

            <SettingItem
              icon="volume-high"
              title={t('autoSpeak')}
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

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about')}</Text>
          <View style={styles.sectionContent}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t('appName')}</Text>
              <Text style={styles.infoValue}>Sign Language App</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t('appVersion')}</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t('deviceId')}</Text>
              <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
                {deviceId || 'N/A'}
              </Text>
            </View>
          </View>
         
        </View>

        {/* Admin Button */}
        <View style={styles.adminButtonContainer}>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/admin')}
          >
            <Ionicons name="shield-outline" size={20} color={Colors.white} />
            <Text style={styles.adminButtonText}>{t('adminPanel')}</Text>
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
    position: 'relative',
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
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  infoLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
    maxWidth: '60%',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  appCopyright: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.gray400,
    marginTop: Spacing.xs,
  },
  adminButtonContainer: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  adminButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  adminButtonText: {
    color: Colors.white,
    fontWeight: Typography.fontWeights.bold,
    fontSize: Typography.fontSizes.md,
  },
  bottomPadding: {
    height: 40,
  },
});