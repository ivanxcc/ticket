import { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { APP_VERSION, CHANGELOG } from '@/constants/version';

export default function ChangelogScreen() {
  const { colors } = useTheme();

  // Mark this version as seen whenever the changelog is opened
  useEffect(() => {
    AsyncStorage.setItem('lastSeenVersion', APP_VERSION);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>What's New</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={CHANGELOG}
        keyExtractor={(item) => item.version}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.versionCard,
              {
                backgroundColor: colors.surface,
                borderColor: index === 0 ? `${colors.accent}60` : colors.border,
                borderWidth: index === 0 ? 1.5 : 1,
              },
            ]}
          >
            <View style={styles.versionHeader}>
              <View style={styles.versionLeft}>
                <Text style={[styles.versionNum, { color: colors.text }]}>v{item.version}</Text>
                {index === 0 && (
                  <View style={[styles.latestBadge, { backgroundColor: `${colors.accent}20` }]}>
                    <Text style={[styles.latestText, { color: colors.accent }]}>Latest</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.versionDate, { color: colors.textSecondary }]}>{item.date}</Text>
            </View>

            <View style={styles.changesList}>
              {item.changes.map((change, i) => (
                <View key={i} style={styles.changeRow}>
                  <View style={[styles.changeDot, { backgroundColor: colors.accent }]} />
                  <Text style={[styles.changeText, { color: colors.text }]}>{change}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    padding: 20,
    gap: 14,
    paddingBottom: 48,
  },
  versionCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  versionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionNum: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  latestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  latestText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  versionDate: {
    fontSize: 13,
  },
  changesList: {
    gap: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  changeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  changeText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});
