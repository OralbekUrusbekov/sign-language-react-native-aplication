import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Admin Theme Colors
const AdminColors = {
  background: '#0a0a0a',
  surface: '#141414',
  surfaceHover: '#1a1a1a',
  border: '#262626',
  primary: '#4ECDC4',
  primaryDark: '#3EBDB4',
  secondary: '#1E3A5F',
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

export default function AdminSettings() {
  const [apiUrl, setApiUrl] = useState('http://192.168.0.13:8000');
  const [aiModelUrl, setAiModelUrl] = useState('http://localhost:5000');
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [enableAnalytics, setEnableAnalytics] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

  const handleSave = () => {
    Alert.alert('Сәтті', 'Баптаулар сақталды');
  };

  const handleTestConnection = async () => {
    try {
      const response = await fetch(`${apiUrl}/`);
      if (response.ok) {
        Alert.alert('Сәтті', 'API байланысы орнатылды');
      } else {
        Alert.alert('Қате', 'API жауап бермеді');
      }
    } catch (error) {
      Alert.alert('Қате', 'API байланысы орнатылмады');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Кэшті тазалау',
      'Барлық кэш деректерін жоюға сенімдісіз бе?',
      [
        { text: 'Болдырмау', style: 'cancel' },
        {
          text: 'Тазалау',
          style: 'destructive',
          onPress: () => Alert.alert('Сәтті', 'Кэш тазаланды'),
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert('Экспорт', 'Деректер экспортталуда...');
  };

  const handleImportData = () => {
    Alert.alert('Импорт', 'Файлды таңдау үшін құрылғыға кіріңіз');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Settings</Text>
            <Text style={styles.pageSubtitle}>Баптаулар - Жүйе конфигурациясы</Text>
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Ionicons name="checkmark" size={18} color={AdminColors.background} />
            <Text style={styles.saveButtonText}>Сақтау</Text>
          </TouchableOpacity>
        </View>

        {/* API Configuration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="server-outline" size={20} color={AdminColors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>API конфигурациясы</Text>
              <Text style={styles.sectionSubtitle}>Backend байланыс параметрлері</Text>
            </View>
          </View>

          <View style={styles.sectionContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>FastAPI Backend URL</Text>
              <View style={styles.inputWithButton}>
                <TextInput
                  style={[styles.formInput, styles.inputFlex]}
                  placeholder="http://192.168.0.13:8000"
                  placeholderTextColor={AdminColors.textMuted}
                  value={apiUrl}
                  onChangeText={setApiUrl}
                />
                <TouchableOpacity style={styles.testButton} onPress={handleTestConnection}>
                  <Ionicons name="flash-outline" size={18} color={AdminColors.warning} />
                  <Text style={styles.testButtonText}>Тексеру</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.formHint}>Негізгі API серверінің мекенжайы</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>AI Model URL (Flask)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="http://localhost:5000"
                placeholderTextColor={AdminColors.textMuted}
                value={aiModelUrl}
                onChangeText={setAiModelUrl}
              />
              <Text style={styles.formHint}>Sign language recognition моделі</Text>
            </View>
          </View>
        </View>

        {/* General Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="settings-outline" size={20} color={AdminColors.info} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Жалпы баптаулар</Text>
              <Text style={styles.sectionSubtitle}>Негізгі параметрлер</Text>
            </View>
          </View>

          <View style={styles.sectionContent}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Хабарландырулар</Text>
                <Text style={styles.toggleDescription}>Push хабарландыруларды қосу</Text>
              </View>
              <Switch
                value={enableNotifications}
                onValueChange={setEnableNotifications}
                trackColor={{ false: AdminColors.border, true: AdminColors.primary }}
                thumbColor={AdminColors.text}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Аналитика</Text>
                <Text style={styles.toggleDescription}>Қолдану статистикасын жинау</Text>
              </View>
              <Switch
                value={enableAnalytics}
                onValueChange={setEnableAnalytics}
                trackColor={{ false: AdminColors.border, true: AdminColors.primary }}
                thumbColor={AdminColors.text}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Қараңғы тема</Text>
                <Text style={styles.toggleDescription}>Интерфейс түсін өзгерту</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: AdminColors.border, true: AdminColors.primary }}
                thumbColor={AdminColors.text}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Автоматты сақтау</Text>
                <Text style={styles.toggleDescription}>Деректерді автоматты түрде сақтау</Text>
              </View>
              <Switch
                value={autoBackup}
                onValueChange={setAutoBackup}
                trackColor={{ false: AdminColors.border, true: AdminColors.primary }}
                thumbColor={AdminColors.text}
              />
            </View>
          </View>
        </View>

        {/* Performance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="speedometer-outline" size={20} color={AdminColors.success} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Өнімділік</Text>
              <Text style={styles.sectionSubtitle}>Кэш және оңтайландыру</Text>
            </View>
          </View>

          <View style={styles.sectionContent}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Кэш</Text>
                <Text style={styles.toggleDescription}>Деректерді кэштеу</Text>
              </View>
              <Switch
                value={cacheEnabled}
                onValueChange={setCacheEnabled}
                trackColor={{ false: AdminColors.border, true: AdminColors.primary }}
                thumbColor={AdminColors.text}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Debug режимі</Text>
                <Text style={styles.toggleDescription}>Әзірлеу режимін қосу</Text>
              </View>
              <Switch
                value={debugMode}
                onValueChange={setDebugMode}
                trackColor={{ false: AdminColors.border, true: AdminColors.primary }}
                thumbColor={AdminColors.text}
              />
            </View>

            <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
              <Ionicons name="trash-outline" size={20} color={AdminColors.error} />
              <View style={styles.actionButtonInfo}>
                <Text style={styles.actionButtonLabel}>Кэшті тазалау</Text>
                <Text style={styles.actionButtonDescription}>Барлық кэш деректерін жою</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={AdminColors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="folder-outline" size={20} color={AdminColors.warning} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Деректерді басқару</Text>
              <Text style={styles.sectionSubtitle}>Импорт және экспорт</Text>
            </View>
          </View>

          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
              <Ionicons name="download-outline" size={20} color={AdminColors.primary} />
              <View style={styles.actionButtonInfo}>
                <Text style={styles.actionButtonLabel}>Деректерді экспорттау</Text>
                <Text style={styles.actionButtonDescription}>JSON форматында жүктеу</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={AdminColors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleImportData}>
              <Ionicons name="cloud-upload-outline" size={20} color={AdminColors.info} />
              <View style={styles.actionButtonInfo}>
                <Text style={styles.actionButtonLabel}>Деректерді импорттау</Text>
                <Text style={styles.actionButtonDescription}>JSON файлын жүктеу</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={AdminColors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* System Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="information-circle-outline" size={20} color={AdminColors.textMuted} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Жүйе ақпараты</Text>
              <Text style={styles.sectionSubtitle}>Нұсқа және қосылым</Text>
            </View>
          </View>

          <View style={styles.sectionContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Қолданба нұсқасы</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>API нұсқасы</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Платформа</Text>
              <Text style={styles.infoValue}>{Platform.OS === 'web' ? 'Web' : Platform.OS}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Соңғы жаңарту</Text>
              <Text style={styles.infoValue}>{new Date().toLocaleDateString('kk-KZ')}</Text>
            </View>
          </View>
        </View>

  
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminColors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: AdminColors.text,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: AdminColors.textMuted,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AdminColors.primary,
    borderRadius: 10,
    gap: 8,
  },
  saveButtonText: {
    color: AdminColors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: AdminColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AdminColors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dangerSection: {
    borderColor: `${AdminColors.error}30`,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    gap: 14,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${AdminColors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AdminColors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  sectionContent: {
    padding: 20,
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: AdminColors.textSecondary,
  },
  formInput: {
    backgroundColor: AdminColors.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: AdminColors.text,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  inputWithButton: {
    flexDirection: 'row',
    gap: 10,
  },
  inputFlex: {
    flex: 1,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: `${AdminColors.warning}15`,
    borderRadius: 10,
    gap: 8,
  },
  testButtonText: {
    fontSize: 14,
    color: AdminColors.warning,
    fontWeight: '500',
  },
  formHint: {
    fontSize: 12,
    color: AdminColors.textMuted,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: AdminColors.text,
  },
  toggleDescription: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: AdminColors.surfaceHover,
    borderRadius: 12,
    gap: 14,
  },
  dangerButton: {
    backgroundColor: `${AdminColors.error}08`,
  },
  actionButtonInfo: {
    flex: 1,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: AdminColors.text,
  },
  actionButtonDescription: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: AdminColors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: AdminColors.text,
  },
});
