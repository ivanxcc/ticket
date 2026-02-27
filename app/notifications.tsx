import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore, type AppNotification } from '@/store';
import { formatRelativeTime } from '@/utils/format';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore();

  const openNotification = (notification: AppNotification) => {
    if (!notification.isRead) {
      markNotificationRead(notification.id);
    }
    if (notification.ticketId) {
      router.push(`/ticket/${notification.ticketId}`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <TouchableOpacity onPress={markAllNotificationsRead} style={styles.headerBtn}>
          <Ionicons name="checkmark-done-outline" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={notifications.length ? styles.listContent : styles.emptyContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openNotification(item)}
            activeOpacity={0.75}
            style={[
              styles.item,
              {
                backgroundColor: item.isRead ? colors.surface : `${colors.accent}12`,
                borderColor: item.isRead ? colors.border : `${colors.accent}40`,
              },
            ]}
          >
            <View style={styles.row}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.time, { color: colors.textTertiary }]}>
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={28} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No notifications yet</Text>
          </View>
        }
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  item: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
});
