import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore, type Ticket } from '@/store';
import { STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';
import { formatRelativeTime, formatTicketNumber } from '@/utils/format';

interface Props {
  ticket: Ticket;
  onPress: () => void;
}

export function TicketCard({ ticket, onPress }: Props) {
  const { colors } = useTheme();
  const members = useAppStore((state) => state.members);
  const assignee = members.find((m) => m.id === ticket.assignedTo);
  const category = CATEGORIES.find((c) => c.id === ticket.category);
  const statusColor = STATUS_COLORS[ticket.status];
  const priorityColor = PRIORITY_COLORS[ticket.priority];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
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

        {/* Category */}
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
          </View>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Footer */}
        <View style={styles.footer}>
          {/* Status dot */}
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />

          {/* Priority */}
          {ticket.priority !== 'low' && (
            <View style={[styles.priorityChip, { borderColor: `${priorityColor}50` }]}>
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {PRIORITY_LABELS[ticket.priority]}
              </Text>
            </View>
          )}

          {/* Assignee */}
          <View style={styles.assigneeRow}>
            <Text style={[styles.assigneeEmoji]}>{assignee?.emoji ?? '?'}</Text>
            <Text style={[styles.assigneeName, { color: colors.textSecondary }]}>
              {assignee?.name ?? 'Unknown'}
            </Text>
          </View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Time */}
          <Text style={[styles.time, { color: colors.textTertiary }]}>
            {formatRelativeTime(ticket.createdAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 5,
    overflow: 'hidden',
  },
  stripe: {
    width: 4,
    minHeight: '100%',
  },
  body: {
    flex: 1,
    padding: 14,
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
    marginVertical: 2,
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  priorityChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  assigneeEmoji: {
    fontSize: 11,
  },
  assigneeName: {
    fontSize: 12,
    fontWeight: '500',
  },
  time: {
    fontSize: 11,
  },
});
