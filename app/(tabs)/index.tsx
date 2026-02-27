import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore, type Status } from '@/store';
import { TicketCard } from '@/components/TicketCard';
import { EmptyState } from '@/components/EmptyState';
import { STATUS_COLORS, STATUS_LABELS } from '@/constants/theme';

const FILTERS: { key: Status | 'open'; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'pending', label: 'Pending' },
  { key: 'complete', label: 'Complete' },
];

export default function TicketsScreen() {
  const { colors } = useTheme();
  const tickets = useAppStore((state) => state.tickets);
  const members = useAppStore((state) => state.members);
  const currentMemberId = useAppStore((state) => state.currentMemberId);
  const unreadNotifications = useAppStore((state) => state.unreadNotifications);

  const [activeFilter, setActiveFilter] = useState<Status | 'open'>('open');
  const [mineOnly, setMineOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = tickets;
    if (activeFilter === 'open') {
      list = list.filter((t) => t.status !== 'complete');
    } else {
      list = list.filter((t) => t.status === activeFilter);
    }
    if (mineOnly) {
      list = list.filter((t) => t.assignedTo === currentMemberId);
    }
    return list;
  }, [tickets, activeFilter, mineOnly, currentMemberId]);

  const openCount = useMemo(
    () => tickets.filter((t) => t.status !== 'complete').length,
    [tickets],
  );

  const currentMember = members.find((m) => m.id === currentMemberId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.wordmark}>
          <Text style={[styles.wordmarkText, { color: colors.text }]}>ticket</Text>
          {openCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.countText}>{openCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={[styles.bellBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.textSecondary} />
            {unreadNotifications > 0 && (
              <View style={[styles.bellBadge, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.bellBadgeText}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMineOnly((v) => !v)}
            style={[
              styles.mineToggle,
              {
                backgroundColor: mineOnly ? `${colors.accent}20` : colors.surface,
                borderColor: mineOnly ? `${colors.accent}60` : colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.mineEmoji}>{currentMember?.emoji ?? '🏠'}</Text>
            <Text style={[styles.mineLabel, { color: mineOnly ? colors.accent : colors.textSecondary }]}>
              Mine
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScroll}
      >
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          const chipColor = f.key !== 'open' ? STATUS_COLORS[f.key as Status] : colors.accent;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.7}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? `${chipColor}20` : colors.surface,
                  borderColor: active ? `${chipColor}60` : colors.border,
                },
              ]}
            >
              {f.key !== 'open' && active && (
                <View style={[styles.chipDot, { backgroundColor: chipColor }]} />
              )}
              <Text style={[styles.chipText, { color: active ? chipColor : colors.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TicketCard ticket={item} onPress={() => router.push(`/ticket/${item.id}`)} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="ticket-outline"
            title={activeFilter === 'open' ? 'All caught up!' : `No ${STATUS_LABELS[activeFilter as Status] ?? ''} tickets`}
            subtitle={
              activeFilter === 'open'
                ? 'No open tickets — tap + to create one'
                : 'Nothing here — try a different filter'
            }
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
        onPress={() => router.push('/create')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmarkText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  countBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  mineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  mineEmoji: {
    fontSize: 14,
  },
  mineLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 24 : 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
