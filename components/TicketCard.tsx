import { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore, type Ticket } from '@/store';
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';
import { formatRelativeTime, formatTicketNumber, formatShortDate } from '@/utils/format';

interface Props {
  ticket: Ticket;
  onPress: () => void;
}

export function TicketCard({ ticket, onPress }: Props) {
  const { colors } = useTheme();
  const { members, deleteTicket } = useAppStore();
  const swipeableRef = useRef<SwipeableMethods>(null);

  const assignees = members.filter((m) => ticket.assignedTo.includes(m.id));
  const category = CATEGORIES.find((c) => c.id === ticket.category);
  const statusColor = STATUS_COLORS[ticket.status];
  const priorityColor = PRIORITY_COLORS[ticket.priority];
  const isOverdue =
    ticket.deadline != null &&
    ticket.status !== 'complete' &&
    new Date(ticket.deadline) < new Date();

  const handleDelete = () => {
    swipeableRef.current?.close();
    setTimeout(() => {
      Alert.alert(
        'Delete Ticket',
        `Delete "${ticket.title}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              deleteTicket(ticket.id);
            },
          },
        ],
      );
    }, 250);
  };

  const renderRightActions = () => (
    <Pressable style={styles.rightAction} onPress={handleDelete}>
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text style={styles.actionText}>Delete</Text>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={60}
      friction={1.8}
      containerStyle={styles.swipeContainer}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        {/* Left status stripe */}
        <View style={[styles.stripe, { backgroundColor: statusColor }]} />

        <View style={styles.body}>
          {/* Top row: title + ticket number */}
          <View style={styles.topRow}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {ticket.title}
            </Text>
            <Text style={[styles.ticketNum, { color: colors.textTertiary }]}>
              {formatTicketNumber(ticket.ticketNumber)}
            </Text>
          </View>

          {/* Category + deadline */}
          {category && (
            <View style={styles.categoryRow}>
              <Ionicons
                name={category.icon as keyof typeof Ionicons.glyphMap}
                size={12}
                color={colors.textTertiary}
              />
              <Text style={[styles.categoryText, { color: colors.textTertiary }]}>
                {category.label}
              </Text>
              {ticket.deadline && (
                <>
                  <Text style={[styles.categoryText, { color: colors.textTertiary }]}>·</Text>
                  <Ionicons name="calendar-outline" size={11} color={isOverdue ? '#EF4444' : colors.textTertiary} />
                  <Text style={[styles.categoryText, { color: isOverdue ? '#EF4444' : colors.textTertiary }]}>
                    {formatShortDate(ticket.deadline)}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Footer */}
          <View style={styles.footer}>
            {/* Status chip */}
            <View style={[styles.statusChip, { backgroundColor: `${statusColor}18` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[ticket.status]}
              </Text>
            </View>

            {/* Priority (non-low only) */}
            {ticket.priority !== 'low' && (
              <View style={[styles.priorityChip, { borderColor: `${priorityColor}50` }]}>
                <Text style={[styles.priorityText, { color: priorityColor }]}>
                  {PRIORITY_LABELS[ticket.priority]}
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }} />

            {/* Assignees + overdue badge */}
            {isOverdue && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueText}>Overdue</Text>
              </View>
            )}
            {assignees.length > 0 ? (
              <View style={styles.assigneeRow}>
                <Text style={styles.assigneeEmoji}>{assignees[0].emoji}</Text>
                <Text style={[styles.assigneeName, { color: colors.textSecondary }]}>
                  {assignees[0].name.split(' ')[0]}
                </Text>
                {assignees.length > 1 && (
                  <Text style={[styles.assigneeExtra, { color: colors.textTertiary }]}>
                    +{assignees.length - 1}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.assigneeEmoji}>?</Text>
            )}
            <Text style={[styles.time, { color: colors.textTertiary }]}>
              {formatRelativeTime(ticket.createdAt)}
            </Text>
          </View>
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 14,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stripe: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  ticketNum: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priorityChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  assigneeEmoji: {
    fontSize: 13,
  },
  assigneeName: {
    fontSize: 12,
    fontWeight: '500',
  },
  assigneeExtra: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  overdueBadge: {
    backgroundColor: '#EF444420',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  overdueText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
  },
  rightAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    gap: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
